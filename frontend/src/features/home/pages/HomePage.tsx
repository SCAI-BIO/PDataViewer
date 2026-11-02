import { AboutSection } from "../components/AboutSection";
import { FeatureSection } from "../components/FeatureSection";
import { StatisticsSection } from "../components/StatisticsSection";
import { featureSections } from "../data";

export function HomePage() {
  return (
    <div className="flex w-full flex-col">
      <AboutSection />

      <StatisticsSection />

      {featureSections.map((feature) => (
        <FeatureSection key={feature.path} feature={feature} />
      ))}
    </div>
  );
}
