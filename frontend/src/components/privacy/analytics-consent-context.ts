import { createContext, useContext } from "react";

import type { AnalyticsConsent } from "@/lib/analytics";

export interface AnalyticsConsentContextValue {
  consent: AnalyticsConsent;
  analyticsAvailable: boolean;
  openPreferences: () => void;
}

export const AnalyticsConsentContext =
  createContext<AnalyticsConsentContextValue | null>(null);

export function useAnalyticsConsent(): AnalyticsConsentContextValue {
  const context = useContext(AnalyticsConsentContext);

  if (!context) {
    throw new Error(
      "useAnalyticsConsent must be used within AnalyticsConsentProvider",
    );
  }

  return context;
}
