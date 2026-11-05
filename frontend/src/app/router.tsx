import { lazy, Suspense } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router";

import { AppLayout } from "@/app/layouts/AppLayout";
import { LoadingState } from "@/components/feedback/LoadingState";
import { HomePage } from "@/features/home/pages/HomePage";

const BiomarkersPage = lazy(async () => {
  const module = await import("@/features/biomarkers/pages/BiomarkersPage");

  return { default: module.BiomarkersPage };
});

const CohortLongitudinalPage = lazy(() =>
  import("@/features/longitudinal/pages/CohortLongitudinalPage").then(
    (module) => ({
      default: module.CohortLongitudinalPage,
    }),
  ),
);

const CohortsPage = lazy(() =>
  import("@/features/cohorts/pages/CohortsPage").then((module) => ({
    default: module.CohortsPage,
  })),
);

const ContactUsPage = lazy(() =>
  import("@/features/contact-us/pages/ContactUsPage").then((module) => ({
    default: module.ContactUsPage,
  })),
);

const LongitudinalPage = lazy(() =>
  import("@/features/longitudinal/pages/LongitudinalPage").then((module) => ({
    default: module.LongitudinalPage,
  })),
);

const MappingsPage = lazy(() =>
  import("@/features/mappings/pages/MappingsPage").then((module) => ({
    default: module.MappingsPage,
  })),
);

const RaceDistributionPage = lazy(() =>
  import("@/features/races/pages/RaceDistributionPage").then((module) => ({
    default: module.RaceDistributionPage,
  })),
);

const StudyPickerPage = lazy(() =>
  import("@/features/study-picker/pages/StudyPickerPage").then((module) => ({
    default: module.StudyPickerPage,
  })),
);

function RouteLoading() {
  return <LoadingState message="Loading page..." className="min-h-60" />;
}

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<HomePage />} />

          <Route
            path="biomarkers"
            element={
              <Suspense fallback={<RouteLoading />}>
                <BiomarkersPage />
              </Suspense>
            }
          />

          <Route
            path="cohorts"
            element={
              <Suspense fallback={<RouteLoading />}>
                <CohortsPage />
              </Suspense>
            }
          />

          <Route path="contact-us" element={<ContactUsPage />} />

          <Route
            path="longitudinal"
            element={
              <Suspense fallback={<RouteLoading />}>
                <LongitudinalPage />
              </Suspense>
            }
          />

          <Route
            path="mappings"
            element={
              <Suspense fallback={<RouteLoading />}>
                <MappingsPage />
              </Suspense>
            }
          />

          <Route
            path="plot-longitudinal"
            element={
              <Suspense fallback={<RouteLoading />}>
                <CohortLongitudinalPage />
              </Suspense>
            }
          />

          <Route
            path="study-picker"
            element={
              <Suspense fallback={<RouteLoading />}>
                <StudyPickerPage />
              </Suspense>
            }
          />

          <Route
            path="races"
            element={
              <Suspense fallback={<RouteLoading />}>
                <RaceDistributionPage />
              </Suspense>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
