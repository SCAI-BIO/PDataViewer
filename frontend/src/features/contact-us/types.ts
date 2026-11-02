export type SocialIcon =
  | "x"
  | "linkedin"
  | "google-scholar"
  | "orcid"
  | "github"
  | "stack-overflow"
  | "email";

export interface SocialLink {
  readonly href: string;
  readonly label: string;
  readonly icon: SocialIcon;
}

export interface TeamMember {
  readonly name: string;
  readonly role: string;
  readonly image: string;
  readonly bio: string;
  readonly links: readonly SocialLink[];
}
