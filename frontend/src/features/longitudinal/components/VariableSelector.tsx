import { SingleSelectCombobox } from "@/components/forms/SingleSelectCombobox";

interface VariableSelectorProps {
  variables: string[];
  value: string;
  onValueChange: (value: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function VariableSelector({
  variables,
  value,
  onValueChange,
  isLoading = false,
  disabled = false,
}: VariableSelectorProps) {
  return (
    <SingleSelectCombobox
      id="longitudinal-variable-selection"
      label="Variable"
      hideLabel
      items={variables}
      value={value}
      onValueChange={onValueChange}
      isLoading={isLoading}
      disabled={disabled}
      placeholder="Search variables..."
      emptyMessage="No matching variables found."
    />
  );
}
