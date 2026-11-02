import type { ReactNode } from "react";

import { cn } from "cn";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

interface PageHeaderProps {
  title: ReactNode;
  children: ReactNode;
}

interface PageSectionProps {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  width?: "form" | "full";
  className?: string;
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-8 px-4 py-8 sm:gap-10 sm:py-10 md:px-6",
        className,
      )}
    >
      {children}
    </main>
  );
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <header className="mx-auto flex w-full max-w-5xl flex-col items-center gap-3 text-center">
      <h1 className="text-balance text-5xl font-bold tracking-tight text-primary sm:text-4xl">
        {title}
      </h1>

      <p className="mx-auto max-w-4xl text-pretty text-base leading-7 text-muted-foreground">
        {children}
      </p>
    </header>
  );
}

export function PageSection({
  id,
  title,
  description,
  children,
  width = "form",
  className,
}: PageSectionProps) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "mx-auto flex w-full min-w-0 flex-col gap-5 sm:gap-6",
        width === "full" ? "max-w-7xl" : "max-w-2xl",
        className,
      )}
    >
      <header
        className={cn("w-full space-y-1.5", width === "full" && "mx-auto")}
      >
        <h2
          id={id}
          className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
        >
          {title}
        </h2>

        {description && (
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </header>

      <div className="w-full min-w-0">{children}</div>
    </section>
  );
}
