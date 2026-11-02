import { Link } from "react-router";

import { useAnalyticsConsent } from "@/components/privacy/analytics-consent-context";

const currentYear = new Date().getFullYear();

const linkClasses =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-sm " +
  "text-sm leading-6 text-white/85 transition-colors " +
  "hover:text-white hover:underline underline-offset-4 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-white";

const headingClasses =
  "text-xs font-semibold uppercase tracking-wider text-white/75";

export function Footer() {
  const { analyticsAvailable, openPreferences } = useAnalyticsConsent();

  return (
    <footer className="w-full bg-linear-to-br from-brand to-brand-accent text-white">
      <div className="mx-auto w-full max-w-225 px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid grid-cols-1 gap-6 text-center sm:grid-cols-2 sm:gap-8 md:grid-cols-3">
          {/* Legal */}
          <section className="flex flex-col items-center gap-3">
            <h2 className={headingClasses}>Legal &amp; Privacy</h2>

            <nav aria-label="Legal links">
              <ul className="flex flex-col items-center gap-1">
                <li>
                  <a
                    href="https://www.scai.fraunhofer.de/en/data_protection.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClasses}
                  >
                    Data Protection
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>

                <li>
                  <a
                    href="https://www.scai.fraunhofer.de/en/publishing-notes.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClasses}
                  >
                    Publishing Notes
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
                {analyticsAvailable && (
                  <li>
                    <button
                      type="button"
                      onClick={openPreferences}
                      className={linkClasses}
                    >
                      Analytics Preferences
                    </button>
                  </li>
                )}
              </ul>
            </nav>
          </section>

          {/* About */}
          <section className="flex flex-col items-center gap-3">
            <h2 className={headingClasses}>About</h2>

            <nav aria-label="About links">
              <ul className="flex flex-col items-center gap-1">
                <li>
                  <a
                    href="https://github.com/SCAI-BIO/PDataViewer/wiki"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClasses}
                  >
                    Documentation
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>

                <li>
                  <Link to="/contact-us" className={linkClasses}>
                    Contact Us
                  </Link>
                </li>
              </ul>
            </nav>
          </section>

          {/* Source Code */}
          <section className="flex flex-col items-center gap-3 sm:col-span-2 md:col-span-1">
            <h2 className={headingClasses}>Source Code</h2>

            <nav aria-label="Social links">
              <ul className="flex flex-col items-center gap-1">
                <li>
                  <a
                    href="https://github.com/SCAI-BIO/PDataViewer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClasses}
                  >
                    <img
                      src="/social-media/github-mark-white.svg"
                      alt=""
                      aria-hidden="true"
                      className="size-4.5"
                    />
                    GitHub
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              </ul>
            </nav>
          </section>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-white/20 px-4 py-4 sm:px-6">
        <p className="text-center text-xs leading-5 tracking-wide text-white/75">
          Copyright &copy; {currentYear}. Fraunhofer SCAI
        </p>
      </div>
    </footer>
  );
}
