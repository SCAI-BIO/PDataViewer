import { LoaderCircle } from "lucide-react";
import { cn } from "cn";

interface LoadingStateProps {
  message: string;
  className?: string;
}

export function LoadingState({ message, className }: LoadingStateProps) {
  return (
    <output
      className={cn(
        "flex items-center justify-center gap-3 py-10 text-sm text-muted-foreground",
        className,
      )}
    >
      <LoaderCircle
        className="size-5 shrink-0 animate-spin"
        aria-hidden="true"
      />
      <span>{message}</span>
    </output>
  );
}
