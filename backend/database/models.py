import enum
from typing import Optional

from sqlalchemy import (
    Enum,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, declarative_base, mapped_column, relationship

Base = declarative_base()


class ConceptSource(enum.Enum):
    COHORT = "cohort"
    CDM = "cdm"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)


class Cohort(Base):
    __tablename__ = "cohorts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    participants: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    control_participants: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    prodromal_participants: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    pd_participants: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    longitudinal_participants: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    follow_up_interval: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    doi: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    link: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    color: Mapped[str] = mapped_column(String, nullable=False)

    concepts: Mapped[list["Concept"]] = relationship(
        back_populates="cohort", cascade="all, delete-orphan", passive_deletes=True
    )
    longitudinal_measurements: Mapped[list["LongitudinalMeasurement"]] = relationship(
        back_populates="cohort", cascade="all, delete-orphan", passive_deletes=True
    )
    biomarker_measurements: Mapped[list["BiomarkerMeasurement"]] = relationship(
        back_populates="cohort", cascade="all, delete-orphan", passive_deletes=True
    )


class Concept(Base):
    __tablename__ = "concepts"
    __table_args__ = UniqueConstraint("variable", "source_type", "cohort_id", name="uq_variable_source_cohort")

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    variable: Mapped[str] = mapped_column(String, nullable=False)
    modality: Mapped[str] = mapped_column(String, nullable=False)
    source_type: Mapped[ConceptSource] = mapped_column(
        Enum(ConceptSource), nullable=False, default=ConceptSource.COHORT
    )
    cohort_id: Mapped[Optional[int]] = mapped_column(ForeignKey("cohort.id", ondelete="CASCADE"), nullable=True)

    mappings_as_source: Mapped[list["Mapping"]] = relationship(
        foreign_keys="Mapping.source_id", back_populates="source", cascade="all, delete-orphan", passive_deletes=True
    )
    mappings_as_target: Mapped[list["Mapping"]] = relationship(
        foreign_keys="Mapping.target_id", back_populates="target", cascade="all, delete-orphan", passive_deletes=True
    )
    cohort: Mapped[Optional["Cohort"]] = relationship(back_populates="concepts")


class Mapping(Base):
    __tablename__ = "mappings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False)
    target_id: Mapped[int] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False)

    source: Mapped["Concept"] = relationship(back_populates="mappings_as_source", foreign_keys=[source_id])
    target: Mapped["Concept"] = relationship(back_populates="mappings_as_target", foreign_keys=[target_id])


class LongitudinalMeasurement(Base):
    __tablename__ = "longitudinal_measurements"
    __table_args__ = UniqueConstraint("variable", "months", "cohort_id", name="uq_variable_months_cohort")

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    variable: Mapped[str] = mapped_column(String, nullable=False)
    months: Mapped[int] = mapped_column(Integer, nullable=False)
    cohort_id: Mapped[int] = mapped_column(ForeignKey("cohort.id", ondelete="CASCADE"), nullable=False)
    patient_count: Mapped[int] = mapped_column(Integer, nullable=False)
    total_patient_count: Mapped[int] = mapped_column(Integer, nullable=False)

    cohort: Mapped["Cohort"] = relationship(back_populates="longitudinal_measurements")


class BiomarkerMeasurement(Base):
    __tablename__ = "biomarker_measurements"
    __table_args__ = UniqueConstraint("paticipant_id", "cohort_id", name="uq_participant_cohort")

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    variable: Mapped[str] = mapped_column(String, nullable=False)
    participant_id: Mapped[int] = mapped_column(Integer, nullable=False)
    cohort_id: Mapped[int] = mapped_column(ForeignKey("cohort.id", ondelete="CASCADE"), nullable=False)
    measurement: Mapped[int] = mapped_column(Integer, nullable=False)
    diagnosis: Mapped[str] = mapped_column(String, nullable=False)

    cohort: Mapped["Cohort"] = relationship(back_populates="biomarker_measurements")
