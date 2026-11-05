from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from pdataviewer.database.models.base import Base

if TYPE_CHECKING:
    from pdataviewer.database.models.cohort_race import CohortRace


class Race(Base):
    """A participant race."""

    __tablename__ = "race"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    race: Mapped[str] = mapped_column(String, unique=True, nullable=False)

    cohort_counts: Mapped[list[CohortRace]] = relationship(back_populates="race")
