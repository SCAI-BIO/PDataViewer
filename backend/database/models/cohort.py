from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.models.base import Base

if TYPE_CHECKING:
    from database.models.concepts import Concept
    from database.models.measurements import BiomarkerMeasurement, LongitudinalMeasurement


class Cohort(Base):
    """A participant cohort and its associated metadata."""

    __tablename__ = "cohorts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    participants: Mapped[int | None] = mapped_column(Integer, nullable=True)
    control_participants: Mapped[int | None] = mapped_column(Integer, nullable=True)
    prodromal_participants: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pd_participants: Mapped[int | None] = mapped_column(Integer, nullable=True)
    longitudinal_participants: Mapped[int | None] = mapped_column(Integer, nullable=True)
    follow_up_interval: Mapped[str | None] = mapped_column(String, nullable=True)
    location: Mapped[str | None] = mapped_column(String, nullable=True)
    doi: Mapped[str | None] = mapped_column(String(255), nullable=True)
    link: Mapped[str | None] = mapped_column(String(255), nullable=True)
    color: Mapped[str] = mapped_column(String, nullable=False)

    concepts: Mapped[list[Concept]] = relationship(
        back_populates="cohort", cascade="all, delete-orphan", passive_deletes=True
    )

    longitudinal_measurements: Mapped[list[LongitudinalMeasurement]] = relationship(
        back_populates="cohort", cascade="all, delete-orphan", passive_deletes=True
    )

    biomarker_measurements: Mapped[list[BiomarkerMeasurement]] = relationship(
        back_populates="cohort", cascade="all, delete-orphan", passive_deletes=True
    )
