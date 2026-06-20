export type CodingSkillId =
  | 'code-review-assistant'
  | 'ts-react-patterns'
  | 'python-best-practices'
  | 'python-automation'
  | 'distributed-systems'
  | 'algorithm-advisor'
  | 'security-patterns'
  | 'api-patterns';

export interface CodingSkill {
  id: CodingSkillId;
  name: string;
  description: string;
  category: 'code-quality' | 'frontend' | 'backend' | 'architecture' | 'security' | 'algorithms';
  books: string[];
  defaultQuery: string;
  config: Record<string, unknown>;
}

export const CODING_SKILLS: CodingSkill[] = [
  {
    id: 'code-review-assistant',
    name: 'Code Review Assistant',
    description: 'Code review best practices, testing strategies, and quality patterns from Software Engineering at Google.',
    category: 'code-quality',
    books: ['Software Engineering at Google'],
    defaultQuery: 'code review checklist testing best practices',
    config: { maxResults: 5, category: 'Computers' },
  },
  {
    id: 'ts-react-patterns',
    name: 'TypeScript & React Patterns',
    description: 'TypeScript types, React components, hooks, Next.js patterns, and full-stack architecture from The Complete Developer.',
    category: 'frontend',
    books: ['The Complete Developer (TS, React, Next.js)'],
    defaultQuery: 'TypeScript types React components Next.js hooks patterns',
    config: { maxResults: 5, category: 'Computers' },
  },
  {
    id: 'python-best-practices',
    name: 'Python Best Practices',
    description: 'Clean code, module organization, testing, performance optimization, and OOP patterns from Serious Python and Beyond Basic Stuff.',
    category: 'code-quality',
    books: ['Serious Python', 'Beyond Basic Stuff with Python'],
    defaultQuery: 'Python modules testing performance clean code best practices',
    config: { maxResults: 5, category: 'Computers' },
  },
  {
    id: 'python-automation',
    name: 'Python Automation',
    description: 'File I/O, web scraping, data processing, scheduling, and GUI automation from Automate the Boring Stuff.',
    category: 'backend',
    books: ['Automate the Boring Stuff'],
    defaultQuery: 'Python automate file web scraping data processing scheduling',
    config: { maxResults: 5, category: 'Computers' },
  },
  {
    id: 'distributed-systems',
    name: 'Distributed Systems Architect',
    description: 'Replication, partitioning, consensus, consistency models, and fault tolerance from DDIA and Think Distributed Systems.',
    category: 'architecture',
    books: ['Designing Data-Intensive Applications', 'Think Distributed Systems'],
    defaultQuery: 'distributed systems replication partitioning consensus consistency',
    config: { maxResults: 5, category: 'Computers' },
  },
  {
    id: 'algorithm-advisor',
    name: 'Algorithm Advisor',
    description: 'Algorithm selection, sorting, searching, graph algorithms, recursion, and machine learning basics from Dive Into Algorithms.',
    category: 'algorithms',
    books: ['Dive Into Algorithms'],
    defaultQuery: 'sorting searching graph algorithms Python implementation',
    config: { maxResults: 5, category: 'Computers' },
  },
  {
    id: 'security-patterns',
    name: 'Security Patterns',
    description: 'Vulnerability assessment, scanning, encryption, authentication, and network security from CEH Study Guide.',
    category: 'security',
    books: ['CEH Study Guide'],
    defaultQuery: 'security vulnerability authentication encryption scanning',
    config: { maxResults: 5, category: 'Computers' },
  },
  {
    id: 'api-patterns',
    name: 'API Design Patterns',
    description: 'RESTful API design, FastAPI patterns, dependency injection, Pydantic models, and async endpoints.',
    category: 'backend',
    books: ['Building Data Science Apps with FastAPI'],
    defaultQuery: 'FastAPI REST API dependency injection Pydantic async endpoints',
    config: { maxResults: 5, category: 'Computers' },
  },
];

export function getCodingSkill(id: CodingSkillId): CodingSkill | undefined {
  return CODING_SKILLS.find(s => s.id === id);
}

export function getCodingSkillsByCategory(category: CodingSkill['category']): CodingSkill[] {
  return CODING_SKILLS.filter(s => s.category === category);
}
