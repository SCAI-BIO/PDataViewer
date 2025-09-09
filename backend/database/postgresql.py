import io
import os
from typing import Optional

import pandas as pd
from argon2 import PasswordHasher
from dotenv import load_dotenv
from sqlalchemy import create_engine, select
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

    def add_cohort(
        self,
        name: str,
        participants: Optional[int],
        control_participants: Optional[int],
        prodromal_participants: Optional[int],
        pd_participants: Optional[int],
        longitudinal_participants: Optional[int],
        follow_up_interval: Optional[str],
        location: Optional[str],
        doi: Optional[str],
        link: Optional[str],
        color: str,
    ) -> Cohort:
        """Add a new cohort metadata if it does not exist.

        :param name: Name of the cohort.
        :param participants: Number of participants in the cohort.
        :param control_participants: Number of control participants in the cohort.
        :param prodromal_participants: Number of prodpromal participants in the cohort.
        :param pd_participants: Number of participants with Parkinson's disease in the cohort.
        :param longitudinal_participants: Number of participants that has more than 2 visits in the cohort.
        :param follow_up_interval: Follow-up interval for participants in the cohort.
        :param location: Location of the cohort study conducted.
        :param doi: Publication DOI of the cohort study conducted.
        :param link: Cohort study data application link.
        :param color: Hex code of the color associated with the cohort study.
        :return: The created or existing cohort metadata.
        """
        cohort = self.session.query(Cohort).filter_by(name=name).first()
        if cohort:
            return cohort

        cohort = Cohort(
            name=name,
            participants=participants,
            control_participants=control_participants,
            prodromal_participants=prodromal_participants,
            pd_participants=pd_participants,
            longitudinal_participants=longitudinal_participants,
            follow_up_interval=follow_up_interval,
            location=location,
            doi=doi,
            link=link,
            color=color,
        )
        self.session.add(cohort)
        self.session.commit()
        return cohort

    def delete_cohort(self, name: str):
        """Delete a cohort and its associated concepts, longitudinal measurements, and biomarker measurements.

        :param name: Name of the cohort.
        """
        cohort = self.get_cohort(name)

        # Delete related Concept, LongitudinalMeasurement, and BiomarkerMeasurement objects
        self.session.query(Concept).filter_by(cohort_id=cohort.id).delete()
        self.session.query(LongitudinalMeasurement).filter_by(cohort_id=cohort.id).delete()
        self.session.query(BiomarkerMeasurement).filter_by(cohort_id=cohort.id).delete()

        # Delete cohort metadata
        self.session.delete(cohort)
        self.session.commit()

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

    def get_concept(self, cohort_name: str, variable_name: str) -> Concept:
        """Retrieve a concept by cohort name and variable name.

        :param cohort_name: Name of the cohort the concept belongs to.
        :param variable_name: Name of the variable.
        :raises ValueError: If no concept with the given variable_name exists.
        :return: The corresponding concept.
        """
        cohort = self.get_cohort(cohort_name)
        concept = self.session.query(Concept).filter_by(variable=variable_name, cohort_id=cohort.id).first()
        if concept is None:
            raise ValueError(f"Concept '{variable_name}' in cohort '{cohort_name}' not found.")
        return concept

    def add_concept(
        self, variable_name: str, cohort: Optional[Cohort] = None, source_type: ConceptSource = ConceptSource.COHORT
    ) -> Concept:
        """Add a new concept to the specified vocabulary, if it does not already exist.

        :param variable_name: Name of the variable.
        :param cohort_name: Optional name of the cohort study the concept belongs to, defaults to None.
        :param concept_source: Source of the concept. One of ConceptSource.COHORT or ConceptSource.CDM, defaults to ConceptSource.COHORT.
        :return: The created or existing Concept object.
        """
        query = self.session.query(Concept).filter_by(variable=variable_name, source_type=source_type)
        cohort_db = None
        if cohort:
            cohort_db = self.add_cohort(
                cohort.name,
                cohort.participants,
                cohort.control_participants,
                cohort.prodromal_participants,
                cohort.pd_participants,
                cohort.longitudinal_participants,
                cohort.follow_up_interval,
                cohort.location,
                cohort.doi,
                cohort.link,
                cohort.color,
            )
            query = query.filter_by(cohort_id=cohort_db.id)
        else:
            query = query.filter(Concept.cohort_id.is_(None))

        concept = query.first()
        if concept:
            return concept

        concept = Concept(
            variable=variable_name, source_type=source_type, cohort_id=cohort_db.id if cohort_db else None
        )
        self.session.add(concept)
        self.session.commit()
        return concept

    def delete_concept(self, cohort_name: str, variable_name: str):
        """Delete a concept and its associated mappings.

        :param cohort_name: Name of the cohort the concept belongs to.
        :param variable_name: Variable name of the concept to delete.
        :raises ValueError: If the concept does not exist.
        """
        cohort = self.get_cohort(cohort_name)
        concept = self.session.query(Concept).filter_by(variable=variable_name, cohort_id=cohort.id).first()
        if concept is None:
            raise ValueError(f"Concept '{variable_name}' in cohort '{cohort_name}' not found.")

        # Delete related Mapping entries first
        self.session.query(Mapping).filter_by(source_id=concept.id).delete()
        self.session.query(Mapping).filter_by(target_id=concept.id).delete()

        # Delete the concept itself
        self.session.delete(concept)
        self.session.commit()

    def get_modalities(self) -> list[str]:
        """Retrieve all unique modalities from the mapping table.

        :return: List of unique modality names.
        """
        modalities = list(
            self.session.execute(select(Mapping.modality).distinct().order_by(Mapping.modality)).scalars().all()
        )
        return modalities

    def get_mappings(self, modality: Optional[str]) -> list[Mapping]:
        """Retrieve all mapping entries, optionally filtered by modality name.

        :param modality: The modality name of the mappings.
        :return: List of all mapping entries.
        """
        query = self.session.query(Mapping)
        if modality:
            query = query.filter_by(modality=modality)
        mappings = query.all()
        return mappings

    def add_mapping(self, source: Concept, target: Concept, modality: str) -> Mapping:
        """Add a new mapping between two concepts, if it does not already exist.

        :param source: The source Concept object.
        :param target: The target Concept object.
        :param modality: The modality of the mapping.
        :return: The created or existed Mapping object.
        """
        source_db = self.add_concept(source.variable, source.cohort, source.source_type)
        target_db = self.add_concept(target.variable, target.cohort, target.source_type)

        # Skip if mapping already exists
        mapping = self.session.query(Mapping).filter_by(source_id=source_db.id, target_id=target_db.id).first()
        if mapping:
            return mapping

        mapping = Mapping(source_id=source_db.id, target_id=target_db.id, modality=modality)
        self.session.add(mapping)
        self.session.commit()
        return mapping

    def delete_mapping(self, source_variable: str, source_cohort: str, target_variable: str, target_cohort: str):
        """Delete a specific mapping between two concepts.

        :param source_variable: Source concept variable.
        :param source_cohort: Cohort of the source concept.
        :param target_code: Target concept variable.
        :param target_cohort: Cohort of the target concept..
        :raises ValueError: If the mapping or any referenced entity does not exist.
        """
        source = self.get_concept(source_cohort, source_variable)
        target = self.get_concept(target_cohort, target_variable)

        if not source or not target:
            raise ValueError("One or more referenced entities (concepts) were not found.")

        mapping = self.session.query(Mapping).filter_by(source_id=source.id, target_id=target.id).first()
        if mapping is None:
            raise ValueError("Mapping not found.")

        self.session.delete(mapping)
        self.session.commit()

    def get_cdm(self) -> pd.DataFrame:
        """Reconstruct the CDM table from mappings.

        :return: Reconstructed CDM table as pandas DataFrame.
        """
        cdm_concepts = self.session.query(Concept).filter(Concept.source_type == ConceptSource.CDM).all()

        rows = []
        for cdm in cdm_concepts:
            row = {"Feature": cdm.variable}
            for mapping in cdm.mappings_as_source:
                target = mapping.target
                if target.cohort:
                    row[target.cohort.name] = target.variable
            rows.append(row)

        return pd.DataFrame(rows)

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
        return longitudinal_measurements

    def add_longitudinal_measurement(
        self, variable: str, months: int, cohort_name: str, patient_count: int, total_patient_count: int
    ) -> LongitudinalMeasurement:
        """Add a longitudinal measurement.

        :param variable: Name of the variable measured longitudinally.
        :param months: Month of the measurement.
        :param cohort_name: Name of the associated cohort study.
        :param patient_count: Number of patients on the given month measured for the variable.
        :param total_patient_count: Total number of patients at the start of the study measured for the variable.
        :return: The created or existing LongitudinalMeasurement object.
        """
        cohort = self.get_cohort(cohort_name)

        longitudinal_measurement = (
            self.session.query(LongitudinalMeasurement)
            .filter_by(variable=variable, months=months, cohort_id=cohort.id)
            .first()
        )
        if longitudinal_measurement:
            return longitudinal_measurement

        longitudinal_measurement = LongitudinalMeasurement(
            variable=variable,
            months=months,
            patient_count=patient_count,
            total_patient_count=total_patient_count,
            cohort_id=cohort.id,
        )
        self.session.add(longitudinal_measurement)
        self.session.commit()
        return longitudinal_measurement

    def get_longitduinal_measurement_variables(self) -> list[str]:
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

    def add_biomarker_measurement(
        self, variable: str, participant_id: int, cohort_name: str, measurement: int, diagnosis: str
    ) -> BiomarkerMeasurement:
        """Add a biomarker measurement.

        :param variable: Name of the variable measured longitudinally.
        :param participant_id: ID of the participant.
        :param cohort_name: Name of the associated cohort study.
        :param measurement: The numeric value of the measurement.
        :param diagnosis: The participant's diagnosis in the study for the given measurement.
        :return: The created or existing BiomarkerMeasurement object.
        """
        cohort = self.get_cohort(cohort_name)

        biomarker_measurements = (
            self.session.query(BiomarkerMeasurement)
            .filter_by(participant_id=participant_id, cohort_id=cohort.id)
            .first()
        )
        if biomarker_measurements:
            return biomarker_measurements

        biomarker_measurements = BiomarkerMeasurement(
            participant_id=participant_id,
            variable=variable,
            cohort_id=cohort.id,
            measurement=measurement,
            diagnosis=diagnosis,
        )
        self.session.add(biomarker_measurements)
        self.session.commit()
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

        for _, row in df.iterrows():
            cohort_name = str(row["cohort"]).strip()
            participants = int(row["participants"])
            control_participants = int(row["healthyControls"])
            prodromal_participants = int(row["prodromalPatients"])
            pd_participants = int(row["pdPatients"])
            longitudinal_participants = int(row["longitudinalPatients"])
            follow_up_interval = str(row["followUpInterval"])
            location = str(row["location"])
            doi = str(row["doi"])
            link = str(row["link"])
            color = str(row["color"])

            self.add_cohort(
                name=cohort_name,
                participants=participants,
                control_participants=control_participants,
                prodromal_participants=prodromal_participants,
                pd_participants=pd_participants,
                longitudinal_participants=longitudinal_participants,
                follow_up_interval=follow_up_interval,
                location=location,
                doi=doi,
                link=link,
                color=color,
            )

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

        for _, row in df.iterrows():
            cdm_concept = self.add_concept(variable_name=row["Feature"], cohort=None, source_type=ConceptSource.CDM)

            # Skip metadata columns
            for column in df.columns:
                if column in columns_to_ignore:
                    continue

                cell_value = row[column]
                # Skip empty cells
                if pd.isna(cell_value) or str(cell_value).strip() == "":
                    continue

                # Split by comma if multiple concepts
                values = [v.strip() for v in str(cell_value).split(",") if v.strip()]

                for value in values:
                    cohort = self.get_cohort(column)
                    cohort_concept = self.add_concept(
                        variable_name=str(value), cohort=cohort, source_type=ConceptSource.COHORT
                    )
                    self.add_mapping(cdm_concept, cohort_concept, modality)

    def import_longitudinal_measurements(self, csv_data: bytes, variable_name: str):
        """Import longitudinal measurements from a CSV file.

        :param csv_data: Longitudinal measurements CSV file content in bytes.
        """
        df = pd.read_csv(io.BytesIO(csv_data))

        required_columns = {"months", "cohort", "patientCount", "totalPatientCount"}
        missing = required_columns - set(df.columns)
        if missing:
            raise ValueError(f"Missing required columns: {missing}")

        for _, row in df.iterrows():
            cohort_name = str(row["cohort"]).strip()
            months = float(row["months"])
            patient_count = int(row["patientCount"])
            total_patient_count = int(row["totalPatientCount"])

            self.add_longitudinal_measurement(
                variable=variable_name,
                months=months,
                cohort_name=cohort_name,
                patient_count=patient_count,
                total_patient_count=total_patient_count,
            )

    def import_biomarker_measurements(self, csv_data: bytes, variable_name: str):
        """Import biomarker measurements from a CSV file.

        :param csv_data: Biomarker measurements CSV file content in bytes.
        """
        df = pd.read_csv(io.BytesIO(csv_data))

        required_columns = {"participantNumber", "cohort", "measurement", "diagnosis"}
        missing = required_columns - set(df.columns)
        if missing:
            raise ValueError(f"Missing required columns: {missing}")

        for _, row in df.iterrows():
            cohort_name = str(row["cohort"]).strip()
            participant_id = int(row["participantNumber"])
            measurement = float(row["measurement"])
            diagnosis = str(row["diagnosis"])

            self.add_biomarker_measurement(
                variable=variable_name,
                participant_id=participant_id,
                cohort_name=cohort_name,
                measurement=measurement,
                diagnosis=diagnosis,
            )

    def clear_all(self):
        """
        Clear all database tables: vocabularies, concepts, CDMs, and mappings.
        """
        Base.metadata.drop_all(self.engine)
        Base.metadata.create_all(self.engine)

    def close(self):
        """
        Close the active database session.
        """
        self.session.close()
