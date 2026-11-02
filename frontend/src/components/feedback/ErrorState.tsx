import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message: string;
  children?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  variant?: "default" | "inverse";
  announcement?: "assertive" | "polite";
  className?: string;
}

export function ErrorState({
  message,
  children,
  onRetry,
  retryLabel = "Retry",
  variant = "default",
  announcement = "assertive",
  className,
}: ErrorStateProps) {
  const inverse = variant === "inverse";

  return (
    <div
      role={announcement === "assertive" ? "alert" : undefined}
      aria-live={announcement === "polite" ? "polite" : undefined}
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4",
        inverse ? "border-white/30 bg-white/10" : "border-destructive/30",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <p
          className={cn(
            "text-sm leading-6 wrap-anywhere",
            inverse ? "text-white" : "text-destructive",
          )}
        >
          {message}
        </p>

        {children && (
          <div
            className={cn(
              "text-sm leading-6",
              inverse ? "text-white/85" : "text-muted-foreground",
            )}
          >
            {children}
          </div>
        )}
      </div>

      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className={cn(
            inverse &&
              "border-white/40 bg-transparent text-white hover:bg-white/15 hover:text-white",
          )}
        >
          <RefreshCw data-icon="inline-start" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
