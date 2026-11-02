const MEASUREMENT_ID = "G-RWW9930KEG";
const COOKIE_PREFIX = "pdv";
export const CONSENT_STORAGE_KEY = "pdataviewer:analytics-consent:v1";
export const analyticsConfigured = /^G-[A-Z0-9]+$/.test(MEASUREMENT_ID);
export type AnalyticsConsent = "granted" | "denied" | null;

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

let initialized = false;

const deniedConsent = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
} as const;

const grantedAnalyticsConsent = {
  ...deniedConsent,
  analytics_storage: "granted",
} as const;

export function parseStoredConsent(value: string | null): AnalyticsConsent {
  return value === "granted" || value === "denied" ? value : null;
}

export function readAnalyticsConsent(): AnalyticsConsent {
  try {
    return parseStoredConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveAnalyticsConsent(
  consent: Exclude<AnalyticsConsent, null>,
): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, consent);
  } catch {
    // Consent still applies in memory if storage is unavailable.
  }
}

/**
 * Construct a page URL without query parameters.
 *
 * HashRouter example:
 * /#/plot-longitudinal?cohort=PPMI&variables=Age
 *
 * Tracked as:
 * /#/plot-longitudinal
 */
function getPageLocation(pathname: string): string {
  const url = new URL(window.location.pathname, window.location.origin);
  url.hash = pathname;
  return url.href;
}

function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    "/": "Home",
    "/cohorts": "Cohorts",
    "/biomarkers": "Biomarkers",
    "/study-picker": "Study Picker",
    "/mappings": "Mappings",
    "/longitudinal": "Longitudinal",
    "/plot-longitudinal": "Variable-specific Follow-up",
    "/contact-us": "Contact Us",
  };

  return `${titles[pathname] ?? "PDataViewer"} | PDataViewer`;
}

function getSafeReferrer(): string {
  if (!document.referrer) return "";

  try {
    return new URL(document.referrer).origin;
  } catch {
    return "";
  }
}

/**
 * Load Google Analytics only after explicit consent.
 *
 * The module-level guard also prevents duplicate initialization
 * in React development Strict Mode.
 */
export function enableAnalytics(pathname: string): void {
  if (!analyticsConfigured || initialized) return;

  initialized = true;

  Object.assign(window, {
    [`ga-disable-${MEASUREMENT_ID}`]: false,
  });

  window.dataLayer ??= [];

  window.gtag = (...args: unknown[]) => {
    window.dataLayer?.push(args);
  };

  // Set denied defaults before loading Google's script.
  window.gtag("consent", "default", deniedConsent);

  // Only analytics consent is granted. Advertising remains denied.
  window.gtag("consent", "update", grantedAnalyticsConsent);

  window.gtag("js", new Date());

  window.gtag("config", MEASUREMENT_ID, {
    send_page_view: false,

    // Keep analytics cookies isolated to PDataViewer's hostname.
    cookie_prefix: COOKIE_PREFIX,
    cookie_domain: "none",
    cookie_expires: 30 * 24 * 60 * 60,

    // Disable advertising-related features.
    allow_google_signals: false,
    allow_ad_personalization_signals: false,

    // Avoid including research-selection query parameters.
    page_location: getPageLocation(pathname),
    page_title: getPageTitle(pathname),
    page_referrer: getSafeReferrer(),
  });

  const script = document.createElement("script");
  script.id = "pdataviewer-ga4";
  script.async = true;
  script.src =
    `https://www.googletagmanager.com/gtag/js?id=` +
    encodeURIComponent(MEASUREMENT_ID);

  document.head.appendChild(script);
}

/**
 * Send a manually controlled page view.
 *
 * React Router pathname intentionally excludes search parameters.
 */
export function trackPageView(pathname: string): void {
  if (!analyticsConfigured || !initialized) return;

  const page_location = getPageLocation(pathname);
  const page_title = getPageTitle(pathname);

  window.gtag?.("config", MEASUREMENT_ID, {
    update: true,
    page_location,
    page_title,
  });

  window.gtag?.("event", "page_view", {
    send_to: MEASUREMENT_ID,
    page_title,
    page_location,
  });
}

/**
 * Delete first-party cookies created with our own prefix.
 */
function deleteAnalyticsCookies(): void {
  const cookies = document.cookie.split(";");

  for (const cookie of cookies) {
    const name = cookie.trim().split("=")[0];

    if (!name.startsWith(`${COOKIE_PREFIX}_`)) {
      continue;
    }

    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
  }
}

/**
 * Immediately disable tracking when consent is withdrawn.
 *
 * The caller then reloads the application to unload the
 * previously loaded Google script.
 */
export function disableAnalytics(): void {
  if (!analyticsConfigured) return;

  Object.assign(window, {
    [`ga-disable-${MEASUREMENT_ID}`]: true,
  });

  window.gtag?.("consent", "update", deniedConsent);

  deleteAnalyticsCookies();
}
