import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router";

import { Button } from "@/components/ui/button";
import {
  CONSENT_STORAGE_KEY,
  analyticsConfigured,
  disableAnalytics,
  enableAnalytics,
  parseStoredConsent,
  readAnalyticsConsent,
  saveAnalyticsConsent,
  trackPageView,
  type AnalyticsConsent,
} from "@/lib/analytics";

import {
  AnalyticsConsentContext,
  useAnalyticsConsent,
} from "./analytics-consent-context";

interface AnalyticsConsentProviderProps {
  children: ReactNode;
}

export function AnalyticsConsentProvider({
  children,
}: AnalyticsConsentProviderProps) {
  const [consent, setConsent] =
    useState<AnalyticsConsent>(readAnalyticsConsent);

  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const isDevelopmentPreview = import.meta.env.DEV && !analyticsConfigured;

  const analyticsAvailable = analyticsConfigured || import.meta.env.DEV;

  const showBanner =
    analyticsAvailable && (consent === null || preferencesOpen);

  function chooseConsent(next: "granted" | "denied") {
    const withdrawing = consent === "granted" && next === "denied";

    if (withdrawing) {
      disableAnalytics();
    }

    saveAnalyticsConsent(next);
    setConsent(next);
    setPreferencesOpen(false);

    if (withdrawing) {
      // Reload to ensure Google's previously loaded script
      // is no longer active in this browser tab.
      window.location.reload();
    }
  }

  // Synchronize choices made in other browser tabs.
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== CONSENT_STORAGE_KEY && event.key !== null) {
        return;
      }

      const next =
        event.key === null
          ? readAnalyticsConsent()
          : parseStoredConsent(event.newValue);

      if (consent === "granted" && next !== "granted") {
        disableAnalytics();
        window.location.reload();
        return;
      }

      setConsent(next);
      setPreferencesOpen(next === null);
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [consent]);

  return (
    <AnalyticsConsentContext.Provider
      value={{
        consent,
        analyticsAvailable,
        openPreferences: () => setPreferencesOpen(true),
      }}
    >
      {children}

      {showBanner && (
        <section
          aria-labelledby="analytics-consent-title"
          aria-describedby="analytics-consent-description"
          className="fixed right-4 bottom-4 left-4 z-60 mx-auto w-auto max-w-2xl rounded-xl border bg-card p-5 text-card-foreground shadow-2xl sm:p-6"
        >
          <div className="space-y-3">
            <h2 id="analytics-consent-title" className="text-lg font-semibold">
              Optional analytics
            </h2>

            {isDevelopmentPreview && (
              <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                Development preview: consent choices are stored locally, but no
                Google Analytics requests will be sent.
              </p>
            )}

            <p
              id="analytics-consent-description"
              className="text-sm leading-6 text-muted-foreground"
            >
              Fraunhofer SCAI uses Google Analytics to understand visits to
              PDataViewer and improve the application. If you allow analytics,
              Google's tracking script will load and analytics cookies may be
              stored. Google may process data outside the European Economic
              Area. You can reject analytics without losing access to any
              feature and change your decision later through the footer.
            </p>

            <a
              href="https://www.scai.fraunhofer.de/en/data_protection.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm font-medium text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Data protection information
              <span className="sr-only"> (opens in a new tab)</span>
            </a>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 flex-1"
                onClick={() => chooseConsent("denied")}
              >
                Reject optional analytics
              </Button>

              <Button
                type="button"
                variant="outline"
                className="min-h-11 flex-1"
                onClick={() => chooseConsent("granted")}
              >
                Allow analytics
              </Button>
            </div>

            {consent !== null && (
              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreferencesOpen(false)}
                >
                  Close preferences
                </Button>
              </div>
            )}
          </div>
        </section>
      )}
    </AnalyticsConsentContext.Provider>
  );
}

/**
 * Track React Router navigation only after analytics consent.
 *
 * The ref prevents duplicate page views during React Strict Mode
 * development effect checks and unrelated rerenders.
 */
export function AnalyticsPageTracker() {
  const { pathname } = useLocation();
  const { consent } = useAnalyticsConsent();

  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (consent !== "granted") {
      lastTrackedPath.current = null;
      return;
    }

    if (lastTrackedPath.current === pathname) {
      return;
    }

    enableAnalytics(pathname);
    trackPageView(pathname);

    lastTrackedPath.current = pathname;
  }, [consent, pathname]);

  return null;
}
