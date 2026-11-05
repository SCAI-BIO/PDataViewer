export const featureSections = [
  {
    title: "Cohorts",
    description:
      "Here you can find an overview on the investigated cohorts, references to the study design and links for data access application. Additionally, there are summary statistics on key Parkinson's disease biomarkers displayed.",
    image: "/home/cohorts.svg",
    alt: "Cohort comparison chart showing key demographics across studies",
    path: "/cohorts",
    inverted: false,
  },
  {
    title: "Biomarkers",
    description: "Explore and compare variable distributions across cohorts.",
    image: "/home/biomarkers.svg",
    alt: "Biomarker interface showing the distribution across cohorts",
    path: "/biomarkers",
    inverted: true,
  },
  {
    title: "Study Picker",
    description:
      "The Study Picker assists you in identifying suited PD data resources for your research plans. Rank cohorts based on their available variables and investigate further properties.",
    image: "/home/study-picker.svg",
    alt: "Study Picker interface ranking cohorts by variable availability",
    path: "/study-picker",
    inverted: false,
  },
  {
    title: "Longitudinal Follow-ups",
    description:
      "This section lets you explore interactive visualizations of the longitudinal follow-up and participant drop-out encountered in the included studies. Additionally, you can visualize the longitudinal coverage of individual variables per study.",
    image: "/home/longitudinal.svg",
    alt: "Longitudinal follow-up timeline visualization",
    path: "/longitudinal",
    inverted: true,
  },
  {
    title: "Variable Mappings",
    description:
      "Following the link, you will find semantic mappings between variables of the investigated datasets. Equivalent variables have been connected and highlight semantic interoperability.",
    image: "/home/mappings.svg",
    alt: "Network graph of variable semantic mappings between datasets",
    path: "/mappings",
    inverted: false,
  },
  {
    title: "Race Distribution",
    description:
      "Explore the distribution of reported race categories across Parkinson's disease cohorts.",
    image: "/home/races.svg",
    alt: "Doughnut chart showing the distribution of reported race categories across cohorts",
    path: "/races",
    inverted: true,
  },
] as const;

export type FeatureSectionData = (typeof featureSections)[number];
