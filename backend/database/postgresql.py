import io
import os
from collections import defaultdict
from typing import Optional, cast

import pandas as pd
from argon2 import PasswordHasher
from dotenv import load_dotenv
from sqlalchemy import create_engine, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import sessionmaker

from database.models import (
    Base,
    BiomarkerMeasurement,
    Cohort,
    Concept,
    ConceptSource,
    LongitudinalMeasurement,
    Mapping,
    User,
)
from database.typeddicts import CohortStats

load_dotenv()
USER_NAME = os.getenv("USER_NAME")
PASSWORD = os.getenv("PASSWORD")
ph = PasswordHasher()


class PostgreSQLRepository:
    def __init__(self, connection_string: str, pool_size: int = 10, max_overflow: int = 20, pool_timeout: int = 30):
        """Initialize the PostgreSQL database engine and session.

        :param connection_string: SQLAlchemy-compatible PostgreSQL connection URI.
        :param pool_size: Maximum number of database connections to maintain in the pool, defaults to 10
        :param max_overflow: Maximum overflow connections beyond pool_size, defaults to 20
        :param pool_timeout: Maximum wait time (in seconds) for a connection from the pool, defaults to 30
        """
        self.engine = create_engine(
            connection_string, pool_size=pool_size, max_overflow=max_overflow, pool_timeout=pool_timeout
        )

        Base.metadata.create_all(self.engine)
        Session = sessionmaker(bind=self.engine, autoflush=False)
        self.session = Session()
        if USER_NAME and PASSWORD:
            self.add_user(USER_NAME, PASSWORD)

    def __enter__(self):
        """Enter the runtime context for use in a `with` statement.

        :return: The current repository instance
        """
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        """Exit the runtime context. Rolls back session on error and closes it.

        :param exc_type: Exception type if raised.
        :param exc_value: Exception value if raised.
        :param traceback: Exception traceback if raise.
        """
        if exc_type:
            self.session.rollback()
        self.close()

    def get_cohorts(self) -> list[Cohort]:
        """Retrieve all cohort metadata from the database.

        :return: List of all cohort metadata.
        """
        return self.session.query(Cohort).all()

    def get_cohort(self, name: str) -> Cohort:
        """Retrieve a cohort metadata from the database.

        :param name: Name of the cohort.
        :raises ValueError: If no model with the given name exists.
        :return: The corresponding cohort metadata.
        """

        cohort = self.session.query(Cohort).filter_by(name=name).first()
        if cohort is None:
            raise ValueError(f"Cohort '{name}' not found.")
        return cohort

    def get_concepts(
        self, cohort_name: Optional[str] = None, source_type: Optional[ConceptSource] = None
    ) -> list[Concept]:
        """Retrieve all concepts from the database.

        :param cohort_name: Optional name of a cohort, defaults to None.
        :param source_type: Optional source type of concept, defaults to None.
        :return: List of all concepts.
        """
        query = self.session.query(Concept)
        if cohort_name:
            cohort = self.get_cohort(cohort_name)
            query = query.filter_by(cohort_id=cohort.id)
        if source_type:
            query = query.filter_by(source_type=source_type)
        concepts = query.all()
        return concepts

    def get_modalities(self) -> list[str]:
        """Retrieve all unique modalities from the mapping table.

        :return: List of unique modality names.
        """
        modalities = list(
            self.session.execute(select(Mapping.modality).distinct().order_by(Mapping.modality)).scalars().all()
        )
        return modalities

    def get_longitudinal_measurements(
        self, variable: Optional[str] = None, cohort_name: Optional[str] = None
    ) -> list[LongitudinalMeasurement]:
        """Retrieve all longitudinal measurements

        :param variable: Optional name of a variable, defaults to None.
        :param cohort_name: Optional name of a cohort, defaults to None.
        :return: List of all longitudinal measurements in the database.
        """
        query = self.session.query(LongitudinalMeasurement)
        if variable:
            query = query.filter(LongitudinalMeasurement.variable == variable)
        if cohort_name:
            cohort = self.get_cohort(cohort_name)
            query = query.filter(LongitudinalMeasurement.cohort_id == cohort.id)
        longitudinal_measurements = query.all()
        results = []
        for lm in longitudinal_measurements:
            results.append(
                {
                    "id": lm.id,
                    "months": lm.months,
                    "variable": lm.variable,
                    "patientCount": lm.patient_count,
                    "totalPatientCount": lm.total_patient_count,
                    "cohort": lm.cohort.name if lm.cohort else None,  # relationship
                }
            )
        return results

    def get_longitudinal_measurement_variables(self) -> list[str]:
        """Retrieve all unique longitudinal measurement variables from the LongitudinalMeasurement table.

        :return: List of unique longitudinal measurement varialbes.
        """
        longitudinal_measurement_variables = list(
            self.session.execute(
                select(LongitudinalMeasurement.variable).distinct().order_by(LongitudinalMeasurement.variable)
            )
            .scalars()
            .all()
        )
        return longitudinal_measurement_variables

    def get_biomarker_measurements(
        self, variable: Optional[str] = None, cohort_name: Optional[str] = None, diagnosis: Optional[str] = None
    ) -> list[BiomarkerMeasurement]:
        """Retrieve all biomarker measurements

        :param variable: Optional name of a variable, defaults to None.
        :param cohort_name: Optional name of a cohort, defaults to None.
        :param diagnosis: Optional diagnosis of participants, defaults to None.
        :return: List of all biomarker measurements in the database.
        """
        query = self.session.query(BiomarkerMeasurement)
        if variable:
            query = query.filter(BiomarkerMeasurement.variable == variable)
        if cohort_name:
            cohort = self.get_cohort(cohort_name)
            query = query.filter(BiomarkerMeasurement.cohort_id == cohort.id)
        if diagnosis:
            query = query.filter(BiomarkerMeasurement.diagnosis == diagnosis)
        biomarker_measurements = query.all()
        return biomarker_measurements

    def get_biomarker_variables(self) -> list[str]:
        """Retrieve all unique biomarker variables from the BiomarkerMeasurement table.

        :return: List of unique biomarker names.
        """
        biomarkers = list(
            self.session.execute(
                select(BiomarkerMeasurement.variable).distinct().order_by(BiomarkerMeasurement.variable)
            )
            .scalars()
            .all()
        )
        return biomarkers

    def get_cohorts_for_biomarker(self, variable: str) -> list[str]:
        """Retrieve all unique cohort names for a biomarker from the BiomarkerMeasurement table.

        :param variable: Name of the biomarker variable
        :return: List of unique cohort names.
        """
        cohorts = list(
            self.session.execute(
                select(Cohort.name)
                .join(BiomarkerMeasurement, Cohort.id == BiomarkerMeasurement.cohort_id)
                .where(BiomarkerMeasurement.variable == variable)
                .distinct()
                .order_by(Cohort.name)
            )
            .scalars()
            .all()
        )
        return cohorts

    def get_diagnoses_for_biomarker_in_cohort(self, variable: str, cohort_name: str) -> list[str]:
        """Retrieve all unique diagnoses for a biomarker within a given cohort.

        :param variable: Name of the biomarker variable.
        :param cohort_name: Name of the cohort.
        :return: List of unique diagnoses.
        """
        diagnoses = (
            self.session.execute(
                select(BiomarkerMeasurement.diagnosis)
                .join(Cohort, Cohort.id == BiomarkerMeasurement.cohort_id)
                .where(BiomarkerMeasurement.variable == variable)
                .where(Cohort.name == cohort_name)
                .distinct()
                .order_by(BiomarkerMeasurement.diagnosis)
            )
            .scalars()
            .all()
        )
        return list(diagnoses)

    def get_user(self, user_name: str, password: str) -> User:
        """Retrieve a user from the database.

        :param user_name: Name of the user.
        :param password: Password of the user.
        :raises ValueError: Incorrect user name or password.
        :return: The authenticated user.
        """
        user = self.session.query(User).filter_by(name=user_name).first()
        if user is None or not ph.verify(user.hashed_password, password):
            raise ValueError("Incorrect user_name or password.")
        return user

    def add_user(self, user_name: str, password: str) -> User:
        """Add a user.

        :param user_name: The name of the user.
        :param password: The password of the user.
        """
        # Skip if user already exists
        user = self.session.query(User).filter_by(name=user_name).first()
        if user:
            return user

        hashed_password = ph.hash(password)
        user = User(name=user_name, hashed_password=hashed_password)
        self.session.add(user)
        self.session.commit()
        return user

    def import_metadata(self, csv_data: bytes):
        """Import cohort metadata via a CSV file.

        :param csv_data: Cohort metadata CSV file content in bytes.
        """
        df = pd.read_csv(io.BytesIO(csv_data))

        required_columns = {
            "cohort",
            "participants",
            "healthyControls",
            "prodromalPatients",
            "pdPatients",
            "longitudinalPatients",
            "followUpInterval",
            "location",
            "doi",
            "link",
            "color",
        }
        missing = required_columns - set(df.columns)
        if missing:
            raise ValueError(f"Missing required columns: {missing}")

        cohorts_data = []
        for row in df.itertuples(index=False):
            cohorts_data.append(
                {
                    "name": str(row.cohort).strip(),
                    "participants": cast(int, row.participants) if pd.notna(row.participants) else None,
                    "control_participants": cast(int, row.healthyControls) if pd.notna(row.healthyControls) else None,
                    "prodromal_participants": (
                        cast(int, row.prodromalPatients) if pd.notna(row.prodromalPatients) else None
                    ),
                    "pd_participants": cast(int, row.pdPatients) if pd.notna(row.pdPatients) else None,
                    "longitudinal_participants": (
                        cast(int, row.longitudinalPatients) if pd.notna(row.longitudinalPatients) else None
                    ),
                    "follow_up_interval": (
                        (str(row.followUpInterval).strip() or None) if pd.notna(row.followUpInterval) else None
                    ),
                    "location": (str(row.location).strip() or None) if pd.notna(row.location) else None,
                    "doi": (str(row.doi).strip() or None) if pd.notna(row.doi) else None,
                    "link": (str(row.link).strip() or None) if pd.notna(row.link) else None,
                    "color": str(row.color).strip(),
                }
            )

        if not cohorts_data:
            return

        stmt = pg_insert(Cohort).values(cohorts_data)
        stmt = stmt.on_conflict_do_nothing(index_elements=["name"])

        self.session.execute(stmt)
        self.session.commit()

    def import_cdm(
        self,
        csv_data: bytes,
        modality: str,
        columns_to_ignore: list[str] = [
            "Feature",
            "CURIE",
            "Definition",
            "Synonyms",
            "OMOP",
            "UMLS",
            "UK Biobank",
            "Rank",
        ],
    ):
        """Import a CDM modality mapping file (e.g., Clinical.csv)

        :param csv_data: Modality CSV file content in bytes.
        :param modality: Modality of the mappings.
        """
        df = pd.read_csv(io.BytesIO(csv_data))

        cohort_map = {c.name: c.id for c in self.session.query(Cohort).all()}
        cdm_vars = set(df["Feature"].dropna().astype(str).str.strip())
        cdm_concepts_data = [
            {"variable": var, "source_type": ConceptSource.CDM, "cohort_id": None} for var in cdm_vars if var
        ]

        if cdm_concepts_data:
            stmt = pg_insert(Concept).values(cdm_concepts_data)
            stmt = stmt.on_conflict_do_nothing(constraint="uq_variable_source_cohort")
            self.session.execute(stmt)
            self.session.commit()

        cdm_concept_map = {
            c.variable: c.id
            for c in self.session.query(Concept)
            .filter(Concept.source_type == ConceptSource.CDM, Concept.variable.in_(cdm_vars))
            .all()
        }

        cohort_concepts_to_create = []
        raw_mappings = []
        valid_cohort_columns = [c for c in df.columns if c not in columns_to_ignore and c in cohort_map]
        col_to_idx = {name: i for i, name in enumerate(df.columns)}
        feature_idx = col_to_idx["Feature"]

        for row in df.itertuples(index=False, name=None):
            cdm_var = str(row[feature_idx]).strip()
            if not cdm_var or cdm_var not in cdm_concept_map:
                continue

            for col in valid_cohort_columns:
                cell_value = row[col_to_idx[col]]
                if pd.isna(cell_value) or str(cell_value).strip() == "":
                    continue

                # Split comma-separated variables
                values = [v.strip() for v in str(cell_value).split(",") if v.strip()]

                for val in values:
                    cohort_concepts_to_create.append(
                        {"variable": val, "source_type": ConceptSource.COHORT, "cohort_id": cohort_map[col]}
                    )
                    raw_mappings.append((cdm_var, col, val))

        if cohort_concepts_to_create:
            # Deduplicate dicts (concepts might appear multiple times in CSV)
            # A set of tuples is used for deduplication
            unique_concepts = {(d["variable"], d["cohort_id"]): d for d in cohort_concepts_to_create}.values()

            stmt = pg_insert(Concept).values(list(unique_concepts))
            stmt = stmt.on_conflict_do_nothing(constraint="uq_variable_source_cohort")
            self.session.execute(stmt)
            self.session.commit()

        # Fetch IDs for Cohort Concepts
        cohort_ids_involved = [cohort_map[c] for c in valid_cohort_columns]
        target_concept_map = {}

        target_concepts_db = (
            self.session.query(Concept)
            .filter(Concept.cohort_id.in_(cohort_ids_involved), Concept.source_type == ConceptSource.COHORT)
            .all()
        )

        for c in target_concepts_db:
            target_concept_map[(c.variable, c.cohort_id)] = c.id

        mappings_data = []
        for cdm_var, cohort_name, cohort_var in raw_mappings:
            cdm_id = cdm_concept_map.get(cdm_var)
            cohort_id = cohort_map.get(cohort_name)
            target_id = target_concept_map.get((cohort_var, cohort_id))

            if cdm_id and target_id:
                mappings_data.append({"source_id": cdm_id, "target_id": target_id, "modality": modality})

        if mappings_data:
            # Deduplicate mappings
            unique_mappings = {(m["source_id"], m["target_id"], m["modality"]): m for m in mappings_data}.values()

            stmt = pg_insert(Mapping).values(list(unique_mappings))
            stmt = stmt.on_conflict_do_nothing(constraint="uq_mapping_source_target_modality")
            self.session.execute(stmt)
            self.session.commit()

    def import_longitudinal_measurements(self, csv_data: bytes, variable_name: str):
        """Import longitudinal measurements from a CSV file.

        :param csv_data: Longitudinal measurements CSV file content in bytes.
        """
        df = pd.read_csv(io.BytesIO(csv_data))
        required_columns = {"months", "cohort", "patientCount", "totalPatientCount"}
        if required_columns - set(df.columns):
            raise ValueError(f"Missing columns: {required_columns - set(df.columns)}")

        cohort_map = {c.name: c.id for c in self.session.query(Cohort).all()}
        batch_data = []
        for row in df.itertuples(index=False):
            cohort_name = str(row.cohort).strip()
            if cohort_name not in cohort_map:
                continue

            batch_data.append(
                {
                    "variable": variable_name,
                    "months": cast(float, row.months),
                    "cohort_id": cohort_map[cohort_name],
                    "patient_count": cast(int, row.patientCount),
                    "total_patient_count": cast(int, row.totalPatientCount),
                }
            )

        if not batch_data:
            return

        stmt = pg_insert(LongitudinalMeasurement).values(batch_data)
        stmt = stmt.on_conflict_do_nothing(constraint="uq_variable_months_cohort")
        self.session.execute(stmt)
        self.session.commit()

    def import_biomarker_measurements(self, csv_data: bytes, variable_name: str):
        """Import biomarker measurements from a CSV file.

        :param csv_data: Biomarker measurements CSV file content in bytes.
        """
        df = pd.read_csv(io.BytesIO(csv_data))

        cohort_map = {c.name: c.id for c in self.session.query(Cohort).all()}

        records_to_insert = []
        for _, row in df.iterrows():
            cohort_name = str(row["cohort"]).strip()
            if cohort_name not in cohort_map:
                continue  # Or handle error

            records_to_insert.append(
                {
                    "variable": variable_name,
                    "participant_id": int(row["participantNumber"]),
                    "cohort_id": cohort_map[cohort_name],
                    "measurement": float(row["measurement"]),
                    "diagnosis": str(row["diagnosis"]),
                }
            )

        if not records_to_insert:
            return

        stmt = pg_insert(BiomarkerMeasurement).values(records_to_insert)

        stmt = stmt.on_conflict_do_nothing(constraint="uq_participant_cohort_variable")

        self.session.execute(stmt)
        self.session.commit()

    def get_chord_diagram(self, modality: str) -> dict:
        """Build a chord diagram data based on the current mappings.

        :param modality: The modality of the mappings.
        :return: A dictionary containing the nodes and the links of the chord diagram.
        """
        cdm_concepts = self.session.query(Concept).filter(Concept.source_type == ConceptSource.CDM).all()

        node_seen: set[tuple[str, str]] = set()  # (name, group)
        link_seen: set[tuple[str, str]] = set()  # (min_name, max_name) for undirected
        nodes: list[dict[str, str]] = []
        links: list[dict[str, str]] = []

        def add_node(name: str, group: str) -> None:
            key = (name, group)
            if key not in node_seen:
                node_seen.add(key)
                nodes.append({"name": name, "group": group})

        def add_link(a: str, b: str) -> None:
            s, t = (a, b) if a <= b else (b, a)  # undirected de-dupe
            key = (s, t)
            if s != t and key not in link_seen:
                link_seen.add(key)
                links.append({"source": s, "target": t})

        for cdm in cdm_concepts:
            # collect mapped study variables (label, study_name) for this CDM
            study_vars: list[tuple[str, str]] = []

            for m in cdm.mappings_as_source:
                if modality is not None and m.modality != modality:
                    continue
                tgt = m.target
                if tgt and tgt.cohort:
                    label = (tgt.variable or "").strip()
                    study = tgt.cohort.name
                    if label and study:
                        study_vars.append((label, study))

            for m in cdm.mappings_as_target:
                if modality is not None and m.modality != modality:
                    continue
                src = m.source
                if src and src.cohort:
                    label = (src.variable or "").strip()
                    study = src.cohort.name
                    if label and study:
                        study_vars.append((label, study))

            # de-dupe study vars
            per_cdm_unique = list(dict.fromkeys(study_vars))

            # skip CDM concepts that only map to a single cohort
            unique_cohorts = {study for _, study in per_cdm_unique}
            if len(unique_cohorts) < 2:
                continue

            # add nodes
            for label, study in per_cdm_unique:
                add_node(label, study)

            # link every pair across different studies (via this CDM)
            n = len(per_cdm_unique)
            for i in range(n):
                li, si = per_cdm_unique[i]
                for j in range(i + 1, n):
                    lj, sj = per_cdm_unique[j]
                    if si != sj:
                        add_link(li, lj)

        return {"nodes": nodes, "links": links}

    def rank_cohorts(self, variables: list[str]) -> pd.DataFrame:
        """Rank cohorts based on availability of requested CDM variables.

        :param variables: A list of CDM variable names.
        :return: pd.DataFrame with columns:
            - cohort: cohort name
            - found: "(found_variables)/(total_variables) (percentage%)"
            - missing: comma-separated list of missing variables
        """
        if not variables:
            raise ValueError("The 'variables' list cannot be empty")

        total_variables = len(variables)
        cohort_stats: dict[str, CohortStats] = defaultdict(lambda: CohortStats(found=0, missing=[]))

        for var in variables:
            cdm_concept = (
                self.session.query(Concept)
                .filter(Concept.variable == var, Concept.source_type == ConceptSource.CDM)
                .first()
            )
            if not cdm_concept:
                raise ValueError(f"Requested CDM variable '{var}' does not exist in the database.")

            mapped_cohort_ids = {
                m.target.cohort_id for m in cdm_concept.mappings_as_source if m.target and m.target.cohort_id
            }

            for m in cdm_concept.mappings_as_source:
                if m.target and m.target.cohort:
                    cohort_stats[m.target.cohort.name]["found"] += 1

            for cohort in self.get_cohorts():
                if cohort.id not in mapped_cohort_ids:
                    cohort_stats[cohort.name]["missing"].append(var)

        # Build DataFrame, skip cohorts with 0 found
        rows = []
        for cohort_name, stats in cohort_stats.items():
            found_count: int = stats["found"]  # type: ignore
            if found_count == 0:
                continue  # skip cohorts with 0 availability

            missing_vars = ", ".join(stats["missing"])
            percentage = round((found_count / total_variables) * 100, 2)
            found_str = f"{found_count}/{total_variables} ({percentage}%)"
            rows.append({"cohort": cohort_name, "found": found_str, "missing": missing_vars})

        df = pd.DataFrame(rows)
        df.sort_values(by="found", ascending=False, inplace=True)
        df.reset_index(drop=True, inplace=True)

        return df

    def clear_all(self):
        """
        Clear all database tables: vocabularies, concepts, CDMs, and mappings.
        """
        self.session.close()
        Base.metadata.drop_all(self.engine)
        Base.metadata.create_all(self.engine)

    def close(self):
        """
        Close the active database session.
        """
        self.session.close()
