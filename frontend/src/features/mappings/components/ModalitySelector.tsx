import { Button } from "@/components/ui/button";

interface ModalitySelectorProps {
  modalities: readonly string[];
  value: string;
  onValueChange: (modality: string) => void;
  disabled?: boolean;
}

export function ModalitySelector({
  modalities,
  value,
  onValueChange,
  disabled = false,
}: ModalitySelectorProps) {
  return (
    <fieldset disabled={disabled} className="w-full min-w-0">
      <legend className="sr-only">Select a mapping modality</legend>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {modalities.map((modality) => {
          const isSelected = value === modality;

          return (
            <Button
              key={modality}
              type="button"
              variant={isSelected ? "default" : "outline"}
              aria-pressed={isSelected}
              onClick={() => {
                if (!isSelected) {
                  onValueChange(modality);
                }
              }}
              className="h-auto min-h-11 w-full whitespace-normal wrap-anywhere px-4 py-3 text-center text-sm leading-5"
            >
              {modality}
            </Button>
          );
        })}
      </div>
    </fieldset>
  );
}
