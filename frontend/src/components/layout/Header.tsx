import { Check, Menu } from "lucide-react";
import { cn } from "cn";
import { Link, NavLink, useLocation } from "react-router";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigation = [
  { path: "/cohorts", label: "Cohorts" },
  { path: "/biomarkers", label: "Biomarkers" },
  { path: "/study-picker", label: "Study Picker" },
  { path: "/longitudinal", label: "Longitudinal" },
  { path: "/mappings", label: "Mappings" },
  { path: "/races", label: "Race" },
  { path: "/contact-us", label: "Contact Us" },
] as const;

const mobileNavigation = [{ path: "/", label: "Home" }, ...navigation] as const;

function isCurrentSection(pathname: string, path: string): boolean {
  return (
    pathname === path ||
    (path === "/study-picker" && pathname === "/plot-longitudinal")
  );
}

export function Header() {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full bg-linear-to-r from-brand to-brand-accent text-white shadow-sm">
      <div
        className={cn(
          "grid h-15 w-full items-center gap-2 px-4 md:h-16 md:px-6",
          "grid-cols-[minmax(0,1fr)_auto]",
          "xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]",
        )}
      >
        {/* Left: Brand */}
        <Link
          to="/"
          aria-label="PDataViewer home"
          className={cn(
            "inline-flex min-w-0 items-center justify-self-start gap-2.5",
            "rounded-md py-1.5",
            "transition-colors hover:opacity-90",
            "focus-visible:outline-2 focus-visible:outline-offset-2",
            "focus-visible:outline-white",
          )}
        >
          <img
            src="/logos/logo_white.svg"
            alt=""
            className="h-8 w-auto shrink-0 md:h-9"
          />

          <span className="text-lg font-semibold tracking-tight whitespace-nowrap md:text-xl">
            PDataViewer
          </span>
        </Link>

        {/* Center: Desktop navigation */}
        <nav
          aria-label="Main navigation"
          className="hidden items-center justify-self-center gap-1 xl:flex"
        >
          {navigation.map(({ path, label }) => {
            return (
              <NavLink
                key={path}
                to={path}
                end
                className={cn(
                  "inline-flex h-10 items-center justify-center",
                  "rounded-md px-3 text-sm font-medium whitespace-nowrap",
                  "transition-colors hover:bg-white/10",
                  "focus-visible:outline-2 focus-visible:outline-offset-2",
                  "focus-visible:outline-white",
                )}
              >
                {label}
              </NavLink>
            );
          })}
        </nav>

        {/* Right: GitHub and mobile menu */}
        <div className="flex shrink-0 items-center justify-self-end gap-1">
          <a
            href="https://github.com/SCAI-BIO/PDataViewer"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View PDataViewer on GitHub (opens in a new tab)"
            title="GitHub repository"
            className={cn(
              "inline-flex size-10 items-center justify-center",
              "rounded-md transition-colors hover:bg-white/10",
              "focus-visible:outline-2 focus-visible:outline-offset-2",
              "focus-visible:outline-white",
            )}
          >
            <img
              src="/social-media/github-mark-white.svg"
              alt=""
              className="size-6"
            />
          </a>

          {/* Mobile / tablet navigation */}
          <div className="xl:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Navigation menu"
                    className={cn(
                      "h-10 gap-2 px-2 sm:px-3",
                      "text-white hover:bg-white/10 hover:text-white",
                      "focus-visible:ring-white/80",
                      "data-popup-open:bg-white/15",
                    )}
                  />
                }
              >
                <Menu className="size-5 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Menu</span>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={8}
                aria-label="Main navigation"
                className={cn(
                  "min-w-56 max-w-[calc(100vw-1rem)]",
                  "max-h-[calc(100dvh-5rem)] overflow-y-auto p-1",
                )}
              >
                {mobileNavigation.map(({ path, label }) => {
                  const isCurrent = isCurrentSection(pathname, path);

                  return (
                    <DropdownMenuItem
                      key={path}
                      render={
                        <NavLink
                          to={path}
                          end
                          aria-current={isCurrent ? "page" : undefined}
                        />
                      }
                      className={cn(
                        "flex min-h-10 cursor-pointer items-center gap-3",
                        "rounded-md px-3 py-2 text-sm",
                        isCurrent &&
                          "bg-accent font-semibold text-accent-foreground",
                      )}
                    >
                      <span className="flex-1">{label}</span>

                      {isCurrent && (
                        <Check
                          className="size-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
