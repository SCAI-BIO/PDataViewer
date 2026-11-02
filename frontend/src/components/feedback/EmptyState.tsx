import type { ReactNode } from "react";
import { cn } from "cn";

interface EmptyStateProps {
  message: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  message,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col items-center justify-center gap-3",
        "rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-foreground wrap-anywhere">
        {message}
      </p>

      {description && (
        <p className="max-w-lg text-sm leading-6 text-muted-foreground wrap-anywhere">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div>
      )}
    </div>
  );
}
