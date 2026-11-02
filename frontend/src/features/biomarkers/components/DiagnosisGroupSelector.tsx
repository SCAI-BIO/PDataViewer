import { MultiSelectCombobox } from "@/components/forms/MultiSelectCombobox";

interface DiagnosisGroupSelectorProps {
  options: string[];
  selectedGroups: string[];
  onSelectionChange: (groups: string[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function DiagnosisGroupSelector({
  options,
  selectedGroups,
  onSelectionChange,
  isLoading = false,
  disabled = false,
}: DiagnosisGroupSelectorProps) {
  return (
    <MultiSelectCombobox
      id="biomarker-diagnosis-groups"
      label="Cohort and diagnosis groups"
      hideLabel
      items={options}
      value={selectedGroups}
      onValueChange={onSelectionChange}
      isLoading={isLoading}
      disabled={disabled}
      placeholder="Search cohorts or diagnosis groups..."
      emptyMessage="No matching groups found."
      description='"Complete" includes all diagnoses within a cohort. Its measurements may overlap with those of individually selected diagnosis groups.'
    />
  );
}
