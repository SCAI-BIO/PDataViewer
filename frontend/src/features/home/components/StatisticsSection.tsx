import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { formatNumber } from "@/lib/formatters";

import { useHomeStatistics } from "../hooks/useHomeStatistics";

interface StatisticProps {
  label: string;
  value: number | null;
  isLoading: boolean;
}

function Statistic({ label, value, isLoading }: StatisticProps) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-5 text-center sm:min-h-32 sm:px-5">
      <dt className="order-2 text-xs leading-5 font-medium tracking-wide text-white/85 uppercase">
        {label}
      </dt>

      <dd
        className="order-1 max-w-full text-2xl leading-tight font-bold tracking-tight text-white tabular-nums sm:text-3xl lg:text-4xl"
        aria-label={
          value === null ? (isLoading ? "Loading" : "Unavailable") : undefined
        }
      >
        {value === null ? (
          <span aria-hidden="true">—</span>
        ) : (
          formatNumber(value)
        )}
      </dd>
    </div>
  );
}

export function StatisticsSection() {
  const { statistics, isLoading, error } = useHomeStatistics();

  return (
    <section
      aria-labelledby="home-statistics-heading"
      aria-busy={isLoading}
      className="w-full bg-linear-to-br from-brand to-brand-accent px-4 py-12 text-white sm:px-6 sm:py-14"
    >
      <div className="mx-auto w-full max-w-5xl space-y-7">
        {/* Section heading */}
        <div className="space-y-3 text-center">
          <h2
            id="home-statistics-heading"
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            PDataViewer at a glance
          </h2>

          <p className="mx-auto max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
            A snapshot of the cohort data available to explore in PDataViewer.
          </p>
        </div>

        {/* Loading status */}
        {isLoading && (
          <LoadingState
            message="Loading statistics..."
            className="py-2 text-white/90"
          />
        )}

        {/* Non-blocking error feedback */}
        {error && (
          <ErrorState
            message="Some statistics are temporarily unavailable. Figures that were retrieved are still displayed."
            variant="inverse"
            announcement="polite"
            className="text-left"
          />
        )}

        {/* Statistics */}
        <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {statistics.map(({ label, value }) => (
            <Statistic
              key={label}
              label={label}
              value={value}
              isLoading={isLoading}
            />
          ))}
        </dl>
      </div>
    </section>
  );
}
