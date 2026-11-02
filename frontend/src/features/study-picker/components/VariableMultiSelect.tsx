import { MultiSelectCombobox } from "@/components/forms/MultiSelectCombobox";

interface VariableMultiSelectProps {
  variables: string[];
  selectedVariables: string[];
  onSelectionChange: (variables: string[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function VariableMultiSelect({
  variables,
  selectedVariables,
  onSelectionChange,
  isLoading = false,
  disabled = false,
}: VariableMultiSelectProps) {
  return (
    <MultiSelectCombobox
      id="study-picker-variables"
      label="Variables of interest"
      hideLabel
      items={variables}
      value={selectedVariables}
      onValueChange={onSelectionChange}
      isLoading={isLoading}
      disabled={disabled}
      placeholder="Search variables..."
      emptyMessage="No matching variables found."
    />
  );
}
