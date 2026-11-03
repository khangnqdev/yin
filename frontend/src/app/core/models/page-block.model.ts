export type PageKey = 'home' | 'about' | 'projects' | 'blog' | 'contact';

export type BlockType = 
  | 'hero' 
  | 'stats' 
  | 'projects-grid' 
  | 'rich-content' 
  | 'testimonials' 
  | 'cta';

export interface BaseBlock {
  id: string;
  type: BlockType;
  title?: string;
  subtitle?: string;
}

export interface HeroBlock extends BaseBlock {
  type: 'hero';
  badgeText: string;
  headline: string;
  highlightText: string;
  description: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  statsPreview: Array<{ label: string; value: string }>;
}

export interface StatsItem {
  number: string;
  label: string;
  description: string;
}

export interface StatsBlock extends BaseBlock {
  type: 'stats';
  items: StatsItem[];
}

export interface ProjectItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  client: string;
  technologies: string[];
  metrics: string;
  link?: string;
}

export interface ProjectsGridBlock extends BaseBlock {
  type: 'projects-grid';
  showFilter: boolean;
  projects: ProjectItem[];
  badge?: string;
  title?: string;
  subtitle?: string;
}

export interface RichSectionItem {
  heading: string;
  body: string;
}

export interface RichContentBlock extends BaseBlock {
  type: 'rich-content';
  contentHtml: string;
  items?: RichSectionItem[];
}

export interface TestimonialItem {
  quote: string;
  author: string;
  position: string;
  company: string;
  rating: number;
}

export interface TestimonialsBlock extends BaseBlock {
  type: 'testimonials';
  items: TestimonialItem[];
}

export interface CtaBlock extends BaseBlock {
  type: 'cta';
  headline: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  badge: string;
}

export type DynamicBlock = 
  | HeroBlock 
  | StatsBlock 
  | ProjectsGridBlock 
  | RichContentBlock 
  | TestimonialsBlock 
  | CtaBlock;

export interface PageDocument {
  pageKey: PageKey;
  pageTitle: string;
  metaDescription: string;
  blocks: DynamicBlock[];
  updatedAt: string;
}

