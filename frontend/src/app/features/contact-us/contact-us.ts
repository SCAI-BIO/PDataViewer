import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

interface SocialLink {
  url: string;
  icon: string;
  label: string;
  isMaterialIcon: boolean;
}

interface TeamMember {
  name: string;
  role: string;
  image: string;
  bio: string;
  links: SocialLink[];
  flipped: boolean;
}

@Component({
  selector: 'app-contact-us',
  imports: [MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './contact-us.html',
  styleUrl: './contact-us.scss',
})
export class ContactUs {
  private domSanitizer = inject(DomSanitizer);
  private matIconRegistry = inject(MatIconRegistry);

  teamMembers: TeamMember[] = [
    {
      name: 'Prof. Dr. Martin Hofmann-Apitius',
      role: 'Head of the Bioinformatics Department',
      image: 'contact/martin.jpg',
      bio: 'Martin is leading the Department of Bioinformatics at the Fraunhofer Institute for Algorithms and Scientific Computing (SCAI) in Sankt Augustin (Germany), a governmental not-for-profit, applied research institute. He is also Professor for Applied Life Science Informatics at Bonn-Aachen International Center for Information Technology (B-IT). He is (co-) author of more than 250 scientific publications.',
      flipped: false,
      links: [
        {
          url: 'https://x.com/apitiushofmann',
          icon: 'x',
          label: 'X (Twitter)',
          isMaterialIcon: false,
        },
        {
          url: 'https://www.linkedin.com/in/hofmannapitius',
          icon: 'linkedin',
          label: 'LinkedIn',
          isMaterialIcon: false,
        },
        {
          url: 'https://scholar.google.de/citations?user=n2XWGsQAAAAJ&hl=en&oi=ao',
          icon: 'google-scholar',
          label: 'Google Scholar',
          isMaterialIcon: false,
        },
        {
          url: 'https://orcid.org/0000-0001-9012-6720',
          icon: 'orcid',
          label: 'ORCID',
          isMaterialIcon: false,
        },
        {
          url: 'mailto:martin.hofmann-apitius@scai.fraunhofer.de',
          icon: 'email',
          label: 'Email',
          isMaterialIcon: true,
        },
      ],
    },
    {
      name: 'Dr. Marc Jacobs',
      role: 'Group Leader, Deputy Head of Business Area Bioinformatics',
      image: 'contact/marc.jpg',
      bio: 'Marc is leading the Software and Scientific Computing Team and also the Deputy Head of Business Area Bioinformatics at the Fraunhofer Institute for Algorithms and Scientific Computing (SCAI) in Sankt Augustin (Germany), a governmental not-for-profit, applied research institute.',
      flipped: false,
      links: [
        {
          url: 'https://www.linkedin.com/in/marc-jacobs-801938242/',
          icon: 'linkedin',
          label: 'LinkedIn',
          isMaterialIcon: false,
        },
        {
          url: 'https://orcid.org/0000-0003-4153-3930',
          icon: 'orcid',
          label: 'ORCID',
          isMaterialIcon: false,
        },
        {
          url: 'https://github.com/MarcZimmermann',
          icon: 'github',
          label: 'GitHub',
          isMaterialIcon: false,
        },
        {
          url: 'mailto:marc.jacobs@scai.fraunhofer.de',
          icon: 'email',
          label: 'Email',
          isMaterialIcon: true,
        },
      ],
    },
    {
      name: 'Mehmet Can Ay',
      role: 'Research Associate',
      image: 'contact/can.jpg',
      bio: 'Mehmet Can Ay joined Fraunhofer SCAI as a student research assistant in March 2023. After successfully completing his Master\'s thesis, "PDataViewer: Investigation of Parkinson\'s Disease Landscape and Enabling Semantic Data Harmonization Through Large Language Models", he joined the Software and Scientific Computing team as a research associate in January 2025.',
      flipped: false,
      links: [
        {
          url: 'https://www.linkedin.com/in/mehmet-can-ay/',
          icon: 'linkedin',
          label: 'LinkedIn',
          isMaterialIcon: false,
        },
        {
          url: 'https://scholar.google.com/citations?user=1NMMi9AAAAAJ&hl=en&oi=ao',
          icon: 'google-scholar',
          label: 'Google Scholar',
          isMaterialIcon: false,
        },
        {
          url: 'https://orcid.org/0000-0002-2977-7695',
          icon: 'orcid',
          label: 'ORCID',
          isMaterialIcon: false,
        },
        {
          url: 'https://github.com/mehmetcanay',
          icon: 'github',
          label: 'GitHub',
          isMaterialIcon: false,
        },
        {
          url: 'mailto:mehmet.ay@scai.fraunhofer.de',
          icon: 'email',
          label: 'Email',
          isMaterialIcon: true,
        },
      ],
    },
    {
      name: 'Dr. Yasamin Salimi',
      role: 'Postdoctoral Researcher',
      image: 'contact/yasamin.png',
      bio: "Yasamin joined Fraunhofer SCAI in 2019, where she completed her master's thesis and PhD studies in biomedical data science. As a postdoctoral researcher, she focuses on data integration, patient stratification, predictive modeling, and federated learning in healthcare. In the EU project CERTAINTY, she develops AI models to support individualized treatment decisions and advance precision medicine.",
      flipped: false,
      links: [
        {
          url: 'https://x.com/SalimiYasamin',
          icon: 'x',
          label: 'X (Twitter)',
          isMaterialIcon: false,
        },
        {
          url: 'https://www.linkedin.com/in/yasamin-salimi-27488662',
          icon: 'linkedin',
          label: 'LinkedIn',
          isMaterialIcon: false,
        },
        {
          url: 'https://scholar.google.com/citations?user=cSR6XQsAAAAJ',
          icon: 'google-scholar',
          label: 'Google Scholar',
          isMaterialIcon: false,
        },
        {
          url: 'https://orcid.org/0000-0002-7773-7786',
          icon: 'orcid',
          label: 'ORCID',
          isMaterialIcon: false,
        },
        {
          url: 'https://github.com/Yasaminsali',
          icon: 'github',
          label: 'GitHub',
          isMaterialIcon: false,
        },
        {
          url: 'mailto:yasamin.salimi@scai.fraunhofer.de',
          icon: 'email',
          label: 'Email',
          isMaterialIcon: true,
        },
      ],
    },
    {
      name: 'Tim Adams',
      role: 'Scientific Software Developer',
      image: 'contact/tim.jpg',
      bio: 'Tim Adams joined Fraunhofer SCAI in late 2017 as a researcher. His main research focus is the development of applications for exploration, evaluation and visualization of data in the biomedical domain.',
      flipped: false,
      links: [
        {
          url: 'https://www.linkedin.com/in/tim-adams-747b821b0/',
          icon: 'linkedin',
          label: 'LinkedIn',
          isMaterialIcon: false,
        },
        {
          url: 'https://scholar.google.de/citations?user=RULeMEYAAAAJ&hl=de&oi=ao',
          icon: 'google-scholar',
          label: 'Google Scholar',
          isMaterialIcon: false,
        },
        {
          url: 'https://orcid.org/0000-0002-2823-0102',
          icon: 'orcid',
          label: 'ORCID',
          isMaterialIcon: false,
        },
        {
          url: 'https://stackoverflow.com/users/6436977/t-a',
          icon: 'stack-overflow',
          label: 'Stack Overflow',
          isMaterialIcon: false,
        },
        {
          url: 'https://github.com/tiadams',
          icon: 'github',
          label: 'GitHub',
          isMaterialIcon: false,
        },
        {
          url: 'mailto:tim.adams@scai.fraunhofer.de',
          icon: 'email',
          label: 'Email',
          isMaterialIcon: true,
        },
      ],
    },
    {
      name: 'Marjan Niazpoor',
      role: '',
      image: 'contact/marjan.jpg',
      bio: 'Marjan joined Fraunhofer SCAI as a student research assistant in March 2024. In 2025, she successfully completed her Master\'s thesis in Life Science Informatics, titled "Bringing Biomedical Artificial Intelligence into Practice: Supporting Experimental Hypothesis Validation through Graph-Based Bioassay Retrieval and Large Language Model Reasoning".',
      flipped: false,
      links: [
        {
          url: 'https://www.linkedin.com/in/marjanniazpoor/',
          icon: 'linkedin',
          label: 'LinkedIn',
          isMaterialIcon: false,
        },
        {
          url: 'https://orcid.org/0009-0000-1455-6569',
          icon: 'orcid',
          label: 'ORCID',
          isMaterialIcon: false,
        },
        {
          url: 'https://github.com/marjanniazpoor',
          icon: 'github',
          label: 'GitHub',
          isMaterialIcon: false,
        },
      ],
    },
  ];

  constructor() {
    const svgIcons: { name: string; path: string }[] = [
      { name: 'x', path: 'social-media/x.svg' },
      { name: 'orcid', path: 'social-media/orcid.svg' },
      { name: 'linkedin', path: 'social-media/linkedin.svg' },
      { name: 'google-scholar', path: 'social-media/google-scholar.svg' },
      { name: 'stack-overflow', path: 'social-media/stack-overflow.svg' },
      { name: 'github', path: 'social-media/github.svg' },
    ];

    svgIcons.forEach(({ name, path }) => {
      this.matIconRegistry.addSvgIcon(name, this.domSanitizer.bypassSecurityTrustResourceUrl(path));
    });
  }
}
