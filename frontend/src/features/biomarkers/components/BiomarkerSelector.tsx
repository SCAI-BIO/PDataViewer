import { SingleSelectCombobox } from "@/components/forms/SingleSelectCombobox";

interface BiomarkerSelectorProps {
  biomarkers: string[];
  value: string;
  onValueChange: (value: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function BiomarkerSelector({
  biomarkers,
  value,
  onValueChange,
  isLoading = false,
  disabled = false,
}: BiomarkerSelectorProps) {
  return (
    <SingleSelectCombobox
      id="biomarker-selection"
      label="Biomarker"
      hideLabel
      items={biomarkers}
      value={value}
      onValueChange={onValueChange}
      isLoading={isLoading}
      disabled={disabled}
      placeholder="Search biomarkers..."
      emptyMessage="No matching biomarkers found."
    />
  );
}
