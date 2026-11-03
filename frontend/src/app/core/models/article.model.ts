export type ArticleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface TableOfContentItem {
  id: string;
  text: string;
  level: number;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string;
  category: string;
  thumbnailUrl: string;
  contentJson: string; // JSON string of Tiptap document
  contentHtml: string; // Sanitized HTML pre-rendered
  status: ArticleStatus;
  focusKeyword: string;
  seoTitle?: string;
  seoDescription?: string;
  readingTimeMinutes: number;
  wordCount: number;
  viewCount: number;
  authorName: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface SeoAnalysisResult {
  score: number;
  wordCount: number;
  readingTimeMinutes: number;
  keywordDensity: number;
  hasTitleKeyword: boolean;
  hasHeadingKeyword: boolean;
  hasDescriptionKeyword: boolean;
  contentLengthCheck: boolean;
  recommendations: string[];
}

