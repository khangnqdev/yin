export type PageKey = 'home' | 'about' | 'projects' | 'blog' | 'contact';

export type BlockType = 
  | 'hero' 
  | 'stats' 
  | 'projects-grid' 
  | 'rich-content' 
  | 'testimonials' 
  | 'cta'
  | 'text'
  | 'steps'
  | 'options'
  | 'multi-column'
  | 'programs'
  | 'video'
  | 'form'
  | 'section'
  | 'faq';

export interface BlockStyle {
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  layoutDirection?: 'row' | 'column';
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundOverlay?: number; // 0 to 1
  backgroundGradient?: string;
  textColor?: string;
  accentColor?: string;
  paddingY?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  borderStyle?: 'none' | 'subtle' | 'solid';
  fullWidth?: boolean;
  gap?: 'sm' | 'md' | 'lg';
}

export interface BaseBlock {
  id: string;
  type: BlockType;
  title?: string;
  subtitle?: string;
  style?: BlockStyle;
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
  imageUrl?: string;
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
  imageUrl?: string;
}

export interface ProjectsGridBlock extends BaseBlock {
  type: 'projects-grid';
  showFilter: boolean;
  projects: ProjectItem[];
  badge?: string;
}

export interface RichSectionItem {
  heading: string;
  body: string;
}

export interface RichContentBlock extends BaseBlock {
  type: 'rich-content';
  contentHtml: string;
  items?: RichSectionItem[];
  imageUrl?: string;
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
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  badge: string;
  imageUrl?: string;
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  badge?: string;
  headline: string;
  description: string;
  buttonText?: string;
  buttonLink?: string;
  imageUrl?: string;
}

export interface StepItem {
  stepNumber: string;
  title: string;
  description: string;
  icon?: string;
}

export interface StepsBlock extends BaseBlock {
  type: 'steps';
  badge?: string;
  headline: string;
  description?: string;
  steps: StepItem[];
}

export interface OptionPlanItem {
  title: string;
  price?: string;
  description: string;
  features: string[];
  buttonText?: string;
  buttonLink?: string;
  isFeatured?: boolean;
}

export interface OptionsBlock extends BaseBlock {
  type: 'options';
  badge?: string;
  headline: string;
  description?: string;
  options: OptionPlanItem[];
}

export interface MultiColumnItem {
  title: string;
  description: string;
  imageUrl?: string;
  link?: string;
  linkText?: string;
}

export interface MultiColumnBlock extends BaseBlock {
  type: 'multi-column';
  badge?: string;
  headline: string;
  description?: string;
  columnsCount: number;
  columns: MultiColumnItem[];
}

export interface ProgramItem {
  title: string;
  category: string;
  description: string;
  duration?: string;
  badge?: string;
  link?: string;
}

export interface ProgramsBlock extends BaseBlock {
  type: 'programs';
  badge?: string;
  headline: string;
  description?: string;
  programs: ProgramItem[];
}

export interface VideoBlock extends BaseBlock {
  type: 'video';
  badge?: string;
  headline: string;
  description?: string;
  videoUrl: string;
  posterUrl?: string;
  caption?: string;
}

export interface FormFieldItem {
  label: string;
  placeholder: string;
  fieldType: 'text' | 'email' | 'tel' | 'textarea';
  required: boolean;
}

export interface FormBlock extends BaseBlock {
  type: 'form';
  badge?: string;
  headline: string;
  description: string;
  submitButtonText: string;
  successMessage: string;
  fields: FormFieldItem[];
}

export interface SectionBlock extends BaseBlock {
  type: 'section';
  badge?: string;
  headline: string;
  description: string;
  imageUrl?: string;
  imagePosition?: 'left' | 'right' | 'top' | 'bottom';
  buttonText?: string;
  buttonLink?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqBlock extends BaseBlock {
  type: 'faq';
  badge?: string;
  headline: string;
  description?: string;
  items: FaqItem[];
}

export type DynamicBlock = 
  | HeroBlock 
  | StatsBlock 
  | ProjectsGridBlock 
  | RichContentBlock 
  | TestimonialsBlock 
  | CtaBlock
  | TextBlock
  | StepsBlock
  | OptionsBlock
  | MultiColumnBlock
  | ProgramsBlock
  | VideoBlock
  | FormBlock
  | SectionBlock
  | FaqBlock;

export interface PageDocument {
  pageKey: PageKey;
  pageTitle: string;
  metaDescription: string;
  blocks: DynamicBlock[];
  updatedAt: string;
}
