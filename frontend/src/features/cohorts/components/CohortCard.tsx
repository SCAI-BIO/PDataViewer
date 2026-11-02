import { ChevronDown, ExternalLink, Users } from "lucide-react";
import { cn } from "cn";

import { buttonVariants } from "@/components/ui/button";
import type { CohortData } from "@/lib/api/cohorts";
import { formatNumber } from "@/lib/formatters";
import { safeExternalUrl } from "@/lib/url";

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

interface CohortCardProps {
  cohort: CohortData;
}

export function CohortCard({ cohort }: CohortCardProps) {
  const doiUrl = safeExternalUrl(cohort.doi);
  const accessUrl = safeExternalUrl(cohort.link);
  const consortiumAccess = cohort.link === "Shared by consortium";

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
      {/* Cohort identity */}
      <div className="flex items-center gap-3 p-4">
        <span
          className="size-3 shrink-0 rounded-full"
          style={{ backgroundColor: cohort.color }}
          aria-hidden="true"
        />

        <h2 className="text-lg font-semibold wrap-break-word">
          {cohort.cohort}
        </h2>
      </div>

      {/* Key information */}
      <div className="grid grid-cols-2 gap-4 border-y bg-muted/30 p-4">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Participants</p>
          <p className="text-2xl font-bold tabular-nums">
            {formatNumber(cohort.participants)}
          </p>
        </div>

        <div className="min-w-0">
          <p className="mb-1 text-xs text-muted-foreground">Location</p>
          <p className="text-sm font-medium wrap-break-word">
            {cohort.location || "Not reported"}
          </p>
        </div>
      </div>

      {/* Expandable study details */}
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-sm px-4 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
          Study details
          <ChevronDown
            className="size-4 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>

        <dl className="divide-y border-t px-4 py-2">
          <Detail
            label="Control participants"
            value={formatNumber(cohort.controlParticipants)}
          />
          <Detail
            label="Prodromal participants"
            value={formatNumber(cohort.prodromalParticipants)}
          />
          <Detail
            label="PD participants"
            value={formatNumber(cohort.pdParticipants)}
          />
          <Detail
            label="Participants with ≥ 2 visits"
            value={formatNumber(cohort.longitudinalParticipants)}
          />
          <Detail
            label="Follow-up interval"
            value={cohort.followUpInterval || "Not reported"}
          />
        </dl>
      </details>

      {/* Actions */}
      <div className="mt-auto flex flex-wrap items-center gap-2 border-t p-4">
        {doiUrl && (
          <a
            href={doiUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Reference for ${cohort.cohort} (opens in a new tab)`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-2",
            )}
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            Reference
          </a>
        )}

        {consortiumAccess ? (
          <span className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            <Users className="size-4" aria-hidden="true" />
            Consortium access
          </span>
        ) : accessUrl ? (
          <a
            href={accessUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Apply for data access to ${cohort.cohort} (opens in a new tab)`}
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "gap-2",
            )}
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            Apply for access
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">
            Data access link not available
          </span>
        )}
      </div>
    </article>
  );
}
