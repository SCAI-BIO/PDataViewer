import { cn } from "cn";
import {
  Ban,
  ChartNoAxesCombined,
  CircleHelp,
  ExternalLink,
  Users,
} from "lucide-react";
import { Link } from "react-router";

import { buttonVariants } from "@/components/ui/button";
import { safeExternalUrl } from "@/lib/url";

import { getLongitudinalHref, type RankingRow } from "../utils/ranking";

interface RankingActionProps {
  row: RankingRow;
}

export function LongitudinalAction({ row }: RankingActionProps) {
  if (row.longitudinalDataAvailable !== true) {
    const unavailable = row.longitudinalDataAvailable === false;

    return (
      <span
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground"
        title={
          unavailable
            ? "Longitudinal data are not available in PDataViewer"
            : "Longitudinal data availability could not be determined."
        }
      >
        {unavailable ? (
          <Ban className="size-4" aria-hidden="true" />
        ) : (
          <CircleHelp className="size-4" aria-hidden="true" />
        )}
        {unavailable ? "Data unavailable" : "Unknown"}
      </span>
    );
  }

  const href = getLongitudinalHref(row);

  if (!href) {
    return (
      <span
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground"
        title="No longitudinal data match the selected variables."
      >
        <Ban className="size-4" aria-hidden="true" />
        Not available
      </span>
    );
  }

  return (
    <Link
      to={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View longitudinal measurement availability for ${row.cohort} (opens in a new tab)`}
      title="Opens in a new tab"
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "gap-1.5",
      )}
    >
      <ChartNoAxesCombined data-icon="inline-start" aria-hidden="true" />
      View availability
    </Link>
  );
}

export function DataAccessAction({ row }: RankingActionProps) {
  if (row.accessLink === "Shared by consortium") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
        <Users className="size-4" aria-hidden="true" />
        Consortium access
      </span>
    );
  }

  const url = safeExternalUrl(row.accessLink);

  if (!url) {
    return <span className="text-sm text-muted-foreground">Not available</span>;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Apply for access to ${row.cohort} (opens in a new tab)`}
      className={cn(
        buttonVariants({ variant: "default", size: "sm" }),
        "gap-1.5",
      )}
    >
      <ExternalLink data-icon="inline-start" aria-hidden="true" />
      Apply for access
    </a>
  );
}
