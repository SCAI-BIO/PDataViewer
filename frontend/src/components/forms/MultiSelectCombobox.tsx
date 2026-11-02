import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@/components/ui/combobox";
import { formatNumber } from "@/lib/formatters";

import type { CommonComboboxProps } from "./combobox-types";

interface MultiSelectComboboxProps extends CommonComboboxProps {
  value: string[];
  onValueChange: (value: string[]) => void;
}

export function MultiSelectCombobox({
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
}: MultiSelectComboboxProps) {
  const hasItems = items.length > 0;
  const hasSelection = value.length > 0;
  const isDisabled = disabled || !hasItems;

  const descriptionId = description ? `${id}-description` : undefined;

  const inputPlaceholder =
    isLoading && !hasItems
      ? "Loading options..."
      : !hasItems
        ? "No options available"
        : hasSelection
          ? "Add another..."
          : placeholder;

  function removeItem(item: string) {
    if (disabled) return;

    onValueChange(value.filter((selected) => selected !== item));
  }

  function clearSelection() {
    if (disabled) return;

    onValueChange([]);
  }

  const clearButton = hasSelection && (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={clearSelection}
      className="shrink-0 text-xs"
    >
      Clear all
    </Button>
  );

  return (
    <div className="w-full min-w-0 space-y-2">
      {/* Label and clear action */}
      {hideLabel ? (
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
      ) : (
        <div className="flex min-h-9 items-center justify-between gap-3">
          <label htmlFor={id} className="min-w-0 text-sm font-medium">
            {label}
          </label>

          {clearButton}
        </div>
      )}

      {/* Searchable multiple selection */}
      <Combobox
        items={items}
        multiple
        value={value}
        onValueChange={onValueChange}
        disabled={isDisabled}
        autoHighlight
        onOpenChange={(open, details) => {
          // Keep the dropdown open while selecting items.
          if (!open && details.reason === "item-press") {
            details.cancel();
          }
        }}
      >
        <ComboboxChips
          aria-label={`${label} selections`}
          className="min-h-10 w-full min-w-0 flex-wrap"
        >
          <ComboboxValue>
            {value.map((item) => (
              <ComboboxChip
                key={item}
                showRemove={false}
                aria-description="Press Backspace or Delete to remove"
                className="max-w-full gap-1"
              >
                <span
                  className="min-w-0 max-w-48 truncate sm:max-w-56"
                  title={item}
                >
                  {item}
                </span>

                <button
                  type="button"
                  aria-label={`Remove ${item}`}
                  disabled={disabled}
                  onClick={() => removeItem(item)}
                  className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </ComboboxChip>
            ))}
          </ComboboxValue>

          <ComboboxChipsInput
            id={id}
            aria-label={label}
            aria-describedby={descriptionId}
            aria-description="Type to search and select multiple options. Use the remove buttons or keyboard to remove selections."
            autoComplete="off"
            className="min-w-24 flex-1"
            placeholder={inputPlaceholder}
          />
        </ComboboxChips>

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

      {/* Selection count and clear action */}
      {hasSelection && (
        <div className="flex min-h-8 items-center justify-between gap-3">
          <output className="text-xs leading-5 text-muted-foreground">
            {formatNumber(value.length)} selected
          </output>

          {hideLabel && clearButton}
        </div>
      )}

      {/* Helper text */}
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
