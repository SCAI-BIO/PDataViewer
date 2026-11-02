import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
} from "@tanstack/react-table";
import { cn } from "cn";
import { ExternalLink, Users } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { CohortData } from "@/lib/api/cohorts";
import { formatNumber } from "@/lib/formatters";
import { safeExternalUrl } from "@/lib/url";

export const cohortTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
  },
});

const columnHelper = createColumnHelper<
  typeof cohortTableFeatures,
  CohortData
>();

export const cohortColumns = columnHelper.columns([
  columnHelper.accessor("cohort", {
    header: "Cohort",
    sortFn: "alphanumeric",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: row.original.color }}
          aria-hidden="true"
        />
        <span className="font-semibold wrap-break-word">
          {row.original.cohort}
        </span>
      </div>
    ),
  }),

  columnHelper.accessor((row) => row.participants ?? undefined, {
    id: "participants",
    header: "Participants",
    sortFn: "basic",
    sortUndefined: "last",
    cell: ({ row }) => formatNumber(row.original.participants),
  }),

  columnHelper.accessor((row) => row.controlParticipants ?? undefined, {
    id: "controlParticipants",
    header: "Control",
    sortFn: "basic",
    sortUndefined: "last",
    cell: ({ row }) => formatNumber(row.original.controlParticipants),
  }),

  columnHelper.accessor((row) => row.prodromalParticipants ?? undefined, {
    id: "prodromalParticipants",
    header: "Prodromal",
    sortFn: "basic",
    sortUndefined: "last",
    cell: ({ row }) => formatNumber(row.original.prodromalParticipants),
  }),

  columnHelper.accessor((row) => row.pdParticipants ?? undefined, {
    id: "pdParticipants",
    header: "PD",
    sortFn: "basic",
    sortUndefined: "last",
    cell: ({ row }) => formatNumber(row.original.pdParticipants),
  }),

  columnHelper.accessor((row) => row.longitudinalParticipants ?? undefined, {
    id: "longitudinalParticipants",
    header: "≥ 2 Visits",
    sortFn: "basic",
    sortUndefined: "last",
    cell: ({ row }) => formatNumber(row.original.longitudinalParticipants),
  }),

  columnHelper.accessor("followUpInterval", {
    header: "Follow-up",
    enableSorting: false,
    cell: ({ row }) => row.original.followUpInterval || "N/R",
  }),

  columnHelper.accessor((row) => row.location?.trim() || undefined, {
    id: "location",
    header: "Location",
    sortFn: "alphanumeric",
    sortUndefined: "last",
    cell: ({ row }) => row.original.location || "N/R",
  }),

  columnHelper.display({
    id: "doi",
    header: "Reference",
    cell: ({ row }) => {
      const url = safeExternalUrl(row.original.doi);

      if (!url) return <span className="text-muted-foreground">N/R</span>;

      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open reference for ${row.original.cohort}`}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "gap-1.5",
          )}
        >
          <ExternalLink className="size-3.5" aria-hidden="true" />
          DOI
        </a>
      );
    },
  }),
  columnHelper.display({
    id: "link",
    header: "Data Access",
    cell: ({ row }) => {
      const { link, cohort } = row.original;

      if (link === "Shared by consortium") {
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
            <Users className="size-3.5" aria-hidden="true" />
            Consortium
          </span>
        );
      }

      const url = safeExternalUrl(link);

      if (!url) return <span className="text-muted-foreground">—</span>;

      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Apply for data access to ${cohort}`}
          className={cn(
            buttonVariants({ variant: "default", size: "sm" }),
            "gap-1.5",
          )}
        >
          <ExternalLink className="size-3.5" aria-hidden="true" />
          Apply
        </a>
      );
    },
  }),
]);
