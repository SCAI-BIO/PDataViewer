from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from pdataviewer.database.models.base import Base

if TYPE_CHECKING:
    from pdataviewer.database.models.cohort import Cohort
    from pdataviewer.database.models.race import Race


class CohortRace(Base):
    """Aggregated race responses for a cohort."""

    __tablename__ = "cohort_race"

    cohort_id: Mapped[int] = mapped_column(ForeignKey("cohorts.id", ondelete="CASCADE"), primary_key=True)
    race_id: Mapped[int] = mapped_column(ForeignKey("race.id"), primary_key=True)
    selected_count: Mapped[int] = mapped_column(Integer, nullable=False)
    valid_count: Mapped[int] = mapped_column(Integer, nullable=False)
    unknown_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    missing_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    cohort: Mapped[Cohort] = relationship(back_populates="race_counts")
    race: Mapped[Race] = relationship(back_populates="cohort_counts")

    __table_args__ = (
        CheckConstraint(
            "selected_count >= 0 AND valid_count >= selected_count",
            name="ck_cohort_race_valid",
        ),
        CheckConstraint("unknown_count >= 0 AND missing_count >= 0", name="ck_cohort_race_missing"),
    )
