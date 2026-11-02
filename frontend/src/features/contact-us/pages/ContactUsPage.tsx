import { PageHeader, PageLayout } from "@/components/layout/page";

import { TeamMemberCard } from "../components/TeamMemberCard";
import { teamMembers } from "../data";

export function ContactUsPage() {
  return (
    <PageLayout>
      <PageHeader title="Meet the Team">
        Meet the researchers and developers behind PDataViewer at Fraunhofer
        SCAI. Explore their backgrounds and find ways to get in touch.
      </PageHeader>

      <section aria-label="PDataViewer team" className="w-full min-w-0">
        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
          {teamMembers.map((member) => (
            <TeamMemberCard key={member.name} member={member} />
          ))}
        </div>
      </section>
    </PageLayout>
  );
}
