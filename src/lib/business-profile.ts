export interface BusinessProfile {
  name: string;
  description: string;
  website?: string;
  githubOrgs: string[];
  musicProjects: MusicProject[];
  tools: string[];
  goals: string[];
}

export interface MusicProject {
  name: string;
  artist: string;
  platform: string;
  status: 'released' | 'in-progress' | 'planned';
  links?: { label: string; url: string }[];
}

export const NCSOUND_PROFILE: BusinessProfile = {
  name: 'NCSOUND Publishing',
  description: 'Music publishing and software development business. Manages artist catalog, releases across streaming platforms, and builds dev tools for autonomous agent workflows.',
  website: 'https://github.com/ncsound919',
  githubOrgs: ['ncsound919', 'tap919'],
  musicProjects: [
    {
      name: 'Tap919 Catalog',
      artist: 'Tap919',
      platform: 'All streaming platforms',
      status: 'in-progress',
      links: [
        { label: 'GitHub', url: 'https://github.com/tap919' },
      ],
    },
    {
      name: 'Niro Releases',
      artist: 'Niro',
      platform: 'All streaming platforms',
      status: 'in-progress',
    },
  ],
  tools: ['reporank', 'mutly', 'vibeserve', 'aetherdesk', 'subteam', 'jobclaw'],
  goals: [
    'Automate music publishing and distribution workflow',
    'Complete and ship software development projects',
    'Integrate all desktop tools into unified agent pipeline',
    'Market Tap919 and Niro catalogs across streaming platforms',
    'Build autonomous background agents for business operations',
  ],
};

export function getBusinessProfile(): BusinessProfile {
  return { ...NCSOUND_PROFILE };
}
