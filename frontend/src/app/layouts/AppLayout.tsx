import { Outlet } from "react-router";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import {
  AnalyticsConsentProvider,
  AnalyticsPageTracker,
} from "@/components/privacy/AnalyticsConsent";

export function AppLayout() {
  return (
    <AnalyticsConsentProvider>
      <AnalyticsPageTracker />

      <div className="flex min-h-dvh flex-col">
        <Header />

        <div className="flex-1">
          <Outlet />
        </div>

        <Footer />
      </div>
    </AnalyticsConsentProvider>
  );
}
