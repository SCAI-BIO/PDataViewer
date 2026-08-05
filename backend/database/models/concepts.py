from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import (
    Enum,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.models.base import Base
from database.models.enums import ConceptSource

if TYPE_CHECKING:
    from database.models.cohort import Cohort


class Concept(Base):
    """A cohort-specific or CDM variable concept."""

    __tablename__ = "concepts"
    __table_args__ = (
        UniqueConstraint(
            "variable",
            "source_type",
            "cohort_id",
            name="uq_variable_source_cohort",
            postgresql_nulls_not_distinct=True,
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    variable: Mapped[str] = mapped_column(String, nullable=False)

    source_type: Mapped[ConceptSource] = mapped_column(
        Enum(ConceptSource), nullable=False, default=ConceptSource.COHORT
    )

    cohort_id: Mapped[int | None] = mapped_column(ForeignKey("cohorts.id", ondelete="CASCADE"), nullable=True)

    mappings_as_source: Mapped[list[Mapping]] = relationship(
        foreign_keys="Mapping.source_id", back_populates="source", cascade="all, delete-orphan", passive_deletes=True
    )

    mappings_as_target: Mapped[list[Mapping]] = relationship(
        foreign_keys="Mapping.target_id", back_populates="target", cascade="all, delete-orphan", passive_deletes=True
    )

    cohort: Mapped[Cohort | None] = relationship(back_populates="concepts")


class Mapping(Base):
    """A mapping from a cohort concept to a target CDM concept."""

    __tablename__ = "mappings"

    __table_args__ = (
        UniqueConstraint("source_id", "target_id", "modality", name="uq_mapping_source_target_modality"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False)
    target_id: Mapped[int] = mapped_column(ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False)
    modality: Mapped[str] = mapped_column(String, nullable=False)

    source: Mapped[Concept] = relationship(back_populates="mappings_as_source", foreign_keys=[source_id])
    target: Mapped[Concept] = relationship(back_populates="mappings_as_target", foreign_keys=[target_id])
