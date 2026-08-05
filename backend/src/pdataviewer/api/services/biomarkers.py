from pdataviewer.database.repositories.biomarkers import BiomarkerRepository

COMPLETE_DIAGNOSIS = "Complete"


class BiomarkerService:
    """Provide application-level biomarker operations."""

    def __init__(self, repository: BiomarkerRepository) -> None:
        self.repository = repository

    async def get_diagnosis_options(self, variable: str) -> list[str]:
        """Build selectable cohort and diagnosis labels."""
        diagnoses_by_cohort = await self.repository.get_diagnoses_by_cohort(variable)

        options: list[str] = []

        for cohort, diagnoses in diagnoses_by_cohort.items():
            options.extend(f"{cohort} ({diagnosis} Group)" for diagnosis in diagnoses)

            if len(diagnoses) > 1:
                options.append(f"{cohort} ({COMPLETE_DIAGNOSIS})")

        return options

    async def get_measurements(self, variable: str, cohort_name: str, diagnosis: str) -> list[float]:
        """Return biomarker measurements matching the filters."""
        diagnosis_filter = None if diagnosis == COMPLETE_DIAGNOSIS else diagnosis

        return await self.repository.get_measurement_values(
            variable=variable, cohort_name=cohort_name, diagnosis=diagnosis_filter
        )
