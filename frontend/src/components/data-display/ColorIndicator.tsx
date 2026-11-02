import { cn } from "cn";

interface ColorIndicatorProps {
  color?: string | null;
  shape?: "circle" | "square";
  className?: string;
}

export function ColorIndicator({
  color,
  shape = "circle",
  className,
}: ColorIndicatorProps) {
  if (!color) return null;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-2.5 shrink-0 border border-foreground/10",
        shape === "circle" ? "rounded-full" : "rounded-sm",
        className,
      )}
      style={{ backgroundColor: color }}
    />
  );
}
