from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import (
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.models.base import Base

if TYPE_CHECKING:
    from database.models.cohort import Cohort


class LongitudinalMeasurement(Base):
    """Participant availability for a variable at a visit."""

    __tablename__ = "longitudinal_measurements"
    __table_args__ = (UniqueConstraint("variable", "months", "cohort_id", name="uq_variable_months_cohort"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    variable: Mapped[str] = mapped_column(String, nullable=False)
    months: Mapped[float] = mapped_column(Float, nullable=False)
    cohort_id: Mapped[int] = mapped_column(ForeignKey("cohorts.id", ondelete="CASCADE"), nullable=False)
    patient_count: Mapped[int] = mapped_column(Integer, nullable=False)
    total_patient_count: Mapped[int] = mapped_column(Integer, nullable=False)

    cohort: Mapped[Cohort] = relationship(back_populates="longitudinal_measurements")


class BiomarkerMeasurement(Base):
    """An anonymized participant-level biomarker measurement."""

    __tablename__ = "biomarker_measurements"

    __table_args__ = (
        UniqueConstraint("participant_id", "cohort_id", "variable", name="uq_participant_cohort_variable"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    variable: Mapped[str] = mapped_column(String, nullable=False)
    participant_id: Mapped[int] = mapped_column(Integer, nullable=False)
    cohort_id: Mapped[int] = mapped_column(ForeignKey("cohorts.id", ondelete="CASCADE"), nullable=False)
    measurement: Mapped[float] = mapped_column(Float, nullable=False)
    diagnosis: Mapped[str] = mapped_column(String, nullable=False)

    cohort: Mapped[Cohort] = relationship(back_populates="biomarker_measurements")
