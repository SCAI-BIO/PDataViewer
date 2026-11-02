import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

import type { CommonComboboxProps } from "./combobox-types";

interface SingleSelectComboboxProps extends CommonComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function SingleSelectCombobox({
  id,
  label,
  items,
  value,
  onValueChange,
  placeholder = "Search...",
  emptyMessage = "No matching items found.",
  description,
  isLoading = false,
  disabled = false,
  hideLabel = false,
}: SingleSelectComboboxProps) {
  const hasItems = items.length > 0;
  const isDisabled = disabled || !hasItems;

  const descriptionId = description ? `${id}-description` : undefined;

  const inputPlaceholder =
    isLoading && !hasItems
      ? "Loading options..."
      : !hasItems
        ? "No options available"
        : placeholder;

  return (
    <div className="w-full min-w-0 space-y-2">
      {/* Visible label and clear action */}
      {!hideLabel && (
        <div className="flex min-h-9 items-center justify-between gap-3">
          <label htmlFor={id} className="text-sm font-medium">
            {label}
          </label>

          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onValueChange("")}
              className="shrink-0 text-xs"
            >
              Clear selection
            </Button>
          )}
        </div>
      )}

      {/* Searchable single selection */}
      <div className="flex min-w-0 items-center gap-2">
        {hideLabel && (
          <label htmlFor={id} className="sr-only">
            {label}
          </label>
        )}

        <div className="min-w-0 flex-1">
          <Combobox
            items={items}
            value={value || null}
            onValueChange={(selected) => onValueChange(selected ?? "")}
            disabled={isDisabled}
            autoHighlight
          >
            <ComboboxInput
              id={id}
              aria-describedby={descriptionId}
              autoComplete="off"
              className="h-10 w-full min-w-0"
              placeholder={inputPlaceholder}
            />

            <ComboboxContent>
              <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>

              <ComboboxList>
                {(item) => (
                  <ComboboxItem key={item} value={item}>
                    {item}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>

        {/* Compact clear action when label is hidden */}
        {hideLabel && value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            onClick={() => onValueChange("")}
            aria-label={`Clear ${label.toLowerCase()} selection`}
            title="Clear selection"
            className="size-10 shrink-0"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Optional helper text */}
      {description && (
        <p
          id={descriptionId}
          className="text-xs leading-5 text-muted-foreground"
        >
          {description}
        </p>
      )}

      {/* Accessible loading announcement */}
      {isLoading && !hasItems && (
        <output className="sr-only">Loading available options.</output>
      )}
    </div>
  );
}
