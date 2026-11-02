import { ChevronDown, Mail } from "lucide-react";

import type { TeamMember } from "../types";

interface TeamMemberCardProps {
  member: TeamMember;
}

export function TeamMemberCard({ member }: TeamMemberCardProps) {
  return (
    <article className="flex h-full min-w-0 flex-col gap-5 rounded-xl border border-primary/20 bg-primary/9 p-5 text-card-foreground shadow-sm sm:p-6">
      {/* Profile */}
      <div className="flex flex-1 flex-col items-center gap-3 text-center">
        <img
          src={member.image}
          alt={`Portrait of ${member.name}`}
          width={112}
          height={112}
          loading="lazy"
          decoding="async"
          className="size-28 rounded-full border-4 border-background object-cover shadow-sm ring-1 ring-primary/20"
        />

        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">
            {member.name}
          </h2>

          {member.role && (
            <p className="text-sm leading-6 font-medium text-primary">
              {member.role}
            </p>
          )}
        </div>
      </div>

      {/* Expandable biography */}
      <details className="group rounded-lg border border-primary/15 bg-transparent px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
          Biography
          <ChevronDown
            className="size-4 shrink-0 text-primary/80 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>

        <p className="mt-3 border-t border-primary/15 pt-3 text-sm leading-6 text-muted-foreground">
          {member.bio}
        </p>
      </details>

      {/* Contact and social links */}
      <footer className="mt-auto border-t border-primary/15 pt-4">
        <ul className="flex flex-wrap items-center justify-center gap-2">
          {member.links.map((link) => {
            const isEmail = link.icon === "email";

            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  target={isEmail ? undefined : "_blank"}
                  rel={isEmail ? undefined : "noopener noreferrer"}
                  aria-label={`${link.label} for ${member.name}${isEmail ? "" : " (opens in a new tab)"}`}
                  title={link.label}
                  className="inline-flex size-10 items-center justify-center rounded-lg border border-primary/15 bg-transparent transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {isEmail ? (
                    <Mail className="size-5 text-primary" aria-hidden="true" />
                  ) : (
                    <img
                      src={`/social-media/${link.icon}.svg`}
                      alt=""
                      aria-hidden="true"
                      width={20}
                      height={20}
                      className="size-5 object-contain dark:brightness-0 dark:invert"
                    />
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </footer>
    </article>
  );
}
