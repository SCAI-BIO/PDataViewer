import { useId } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { cn } from "cn";

import { buttonVariants } from "@/components/ui/button";

import type { FeatureSectionData } from "../data";

interface FeatureSectionProps {
  feature: FeatureSectionData;
}

export function FeatureSection({ feature }: FeatureSectionProps) {
  const { title, description, image, alt, path, inverted } = feature;

  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "w-full px-4 py-12 sm:px-6 sm:py-16",
        inverted && "bg-linear-to-br from-brand to-brand-accent text-white",
      )}
    >
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12 lg:gap-16">
        {/* Feature description */}
        <div
          className={cn(
            "order-1 flex min-w-0 flex-col items-center gap-6",
            "text-center md:items-start md:text-left",
            inverted && "md:order-2",
          )}
        >
          <div className="space-y-4">
            <h2
              id={headingId}
              className={cn(
                "text-2xl font-semibold tracking-tight sm:text-3xl",
                inverted ? "text-white" : "text-primary",
              )}
            >
              {title}
            </h2>

            <p
              className={cn(
                "max-w-prose text-base leading-7 text-pretty",
                inverted ? "text-white/90" : "text-muted-foreground",
              )}
            >
              {description}
            </p>
          </div>

          <Link
            to={path}
            className={cn(
              buttonVariants({
                variant: inverted ? "outline" : "default",
                size: "lg",
              }),
              "min-h-11 max-w-full gap-2 text-center",
              inverted &&
                "border-white/70 bg-transparent text-white hover:border-white hover:bg-white/10 hover:text-white dark:border-white/70 dark:bg-transparent dark:text-white dark:hover:bg-white/10 dark:hover:text-white",
            )}
          >
            <span>Explore {title}</span>

            <ArrowRight
              data-icon="inline-end"
              className="size-4 shrink-0"
              aria-hidden="true"
            />
          </Link>
        </div>

        {/* Feature screenshot */}
        <div
          className={cn(
            "order-2 flex min-w-0 items-center justify-center",
            inverted && "md:order-1",
          )}
        >
          <img
            src={image}
            alt={alt}
            loading="lazy"
            decoding="async"
            className={cn(
              "h-auto w-full max-w-md rounded-xl object-contain",
              inverted
                ? "border border-white/15 bg-white/10 p-5"
                : "border border-border/50 bg-card shadow-lg",
            )}
          />
        </div>
      </div>
    </section>
  );
}
