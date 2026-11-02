export interface CommonComboboxProps {
  id: string;
  label: string;
  items: string[];
  placeholder?: string;
  emptyMessage?: string;
  description?: string;
  isLoading?: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
}
