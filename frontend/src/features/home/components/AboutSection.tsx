import { useState } from "react";
import { ArrowRight, Check, Copy, ExternalLink } from "lucide-react";
import { Link } from "react-router";

import { Button, buttonVariants } from "@/components/ui/button";

const PUBLICATION_URL = "https://doi.org/10.1038/s41598-025-06447-2";

const CITATION =
  "Salimi, Y., Adams, T., Ay, M. C., Balabin, H., Jacobs, M., " +
  "& Hofmann-Apitius, M. (2025). Evaluating language model embeddings " +
  "for Parkinson's disease cohort harmonization using a novel manually " +
  "curated variable mapping schema. Scientific Reports, 15(1), 20210. " +
  PUBLICATION_URL;

export function AboutSection() {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  async function copyCitation() {
    try {
      await navigator.clipboard.writeText(CITATION);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <section
      aria-labelledby="about-heading"
      className="w-full px-4 py-12 sm:py-16"
    >
      <div className="mx-auto w-full max-w-5xl text-center">
        {/* Introduction */}
        <p className="mb-3 text-sm font-semibold tracking-wider text-primary uppercase">
          About PDataViewer
        </p>

        <h1
          id="about-heading"
          className="text-3xl font-bold tracking-tight text-primary sm:text-4xl"
        >
          Explore Parkinson&apos;s disease cohort data
        </h1>

        <p className="mx-auto mt-5 max-w-4xl text-lg leading-8 text-foreground">
          Find and compare Parkinson&apos;s disease cohort datasets to identify
          those best suited to your research.
        </p>

        <p className="mx-auto mt-4 max-w-4xl text-sm leading-7 text-muted-foreground sm:text-base">
          PDataViewer provides an overview of curated cohort studies, including
          study characteristics, available variables, and longitudinal
          measurement coverage. Our data-driven approach helps researchers
          assess dataset availability and interoperability before requesting
          access.
        </p>

        {/* Primary actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/study-picker" className={buttonVariants({ size: "lg" })}>
            Find matching cohorts
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>

          <Link
            to="/cohorts"
            className={buttonVariants({
              variant: "outline",
              size: "lg",
            })}
          >
            Browse cohorts
          </Link>
        </div>
      </div>

      {/* Research publication */}
      <div className="mx-auto mt-12 w-full max-w-5xl border-t pt-8 sm:mt-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-primary sm:text-2xl">
              Related publication
            </h2>

            <p className="text-sm leading-6 text-muted-foreground">
              Learn more about our research on language-model-based
              harmonization of Parkinson&apos;s disease cohort data.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void copyCitation()}
            className="shrink-0 self-start"
          >
            {copyStatus === "copied" ? (
              <Check data-icon="inline-start" aria-hidden="true" />
            ) : (
              <Copy data-icon="inline-start" aria-hidden="true" />
            )}

            {copyStatus === "copied" ? "Copied" : "Copy citation"}
          </Button>
        </div>

        <p className="mt-5 text-sm leading-7 text-muted-foreground">
          Salimi, Y., Adams, T., Ay, M. C., Balabin, H., Jacobs, M., &amp;
          Hofmann-Apitius, M. (2025).{" "}
          <span className="font-medium text-foreground">
            Evaluating language model embeddings for Parkinson&apos;s disease
            cohort harmonization using a novel manually curated variable mapping
            schema.
          </span>{" "}
          <em>Scientific Reports</em>, 15(1), 20210.
        </p>

        <a
          href={PUBLICATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Read publication
          <ExternalLink className="size-4" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>

        <p aria-live="polite" className="mt-2 text-xs text-muted-foreground">
          {copyStatus === "copied"
            ? "Citation copied to clipboard."
            : copyStatus === "error"
              ? "Could not copy the citation. Please select and copy it manually."
              : ""}
        </p>
      </div>
    </section>
  );
}
