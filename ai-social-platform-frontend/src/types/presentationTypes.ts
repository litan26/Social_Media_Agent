export type SlideLayoutType =
  | 'title'
  | 'title_content'
  | 'two_column'
  | 'image_text'
  | 'full_image'
  | 'stats'
  | 'chart'
  | 'table'
  | 'timeline'
  | 'process'
  | 'comparison'
  | 'quote'
  | 'section_divider'
  | 'conclusion'
  | 'thank_you';

export interface KeyMetric {
  label: string;
  value: string;
  trend?: string;
}

export interface TimelineStep {
  step: string;
  title: string;
  description: string;
}

export interface ProcessStep {
  step: number;
  title: string;
  description: string;
}

export interface ComparisonColumn {
  title: string;
  points: string[];
}

export interface CalloutBox {
  title?: string;
  text: string;
  type?: 'info' | 'tip' | 'warning';
}

export interface SlideContent {
  bulletPoints?: string[];
  paragraphs?: string[];
  keyMetrics?: KeyMetric[];
  quoteText?: string;
  quoteAuthor?: string;
  comparisonColumns?: ComparisonColumn[];
  timelineSteps?: TimelineStep[];
  processSteps?: ProcessStep[];
  calloutBox?: CalloutBox;
}

export interface SlideChart {
  type: 'bar' | 'line' | 'pie' | 'area' | 'kpi';
  title: string;
  labels: string[];
  datasets: Array<{ label: string; data: number[] }>;
}

export interface SlideTable {
  headers: string[];
  rows: string[][];
}

export interface SlideImage {
  url?: string;
  alt?: string;
  prompt?: string;
}

export interface SlideVisuals {
  image?: SlideImage;
  chart?: SlideChart;
  table?: SlideTable;
  icon?: string;
}

export interface SlideItem {
  id?: number;
  presentation_id?: number;
  position: number;
  layout: SlideLayoutType;
  title: string;
  subtitle?: string;
  content: SlideContent;
  visuals?: SlideVisuals;
  speaker_notes?: string;
  speakerNotes?: string;
  styling?: Record<string, any>;
}

export interface ColorTheme {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  text: string;
}

export interface Presentation {
  id: number;
  user_id: number;
  title: string;
  topic?: string;
  industry: string;
  style: string;
  color_theme: ColorTheme | string;
  ratio: string;
  audience: string;
  tone: string;
  language: string;
  length_category: 'Short' | 'Informative' | 'Detailed';
  additional_instructions?: string;
  source_type: string;
  source_filename?: string;
  status: string;
  created_at: string;
  updated_at: string;
  slide_count?: number;
}

export interface GenerateParams {
  topic: string;
  lengthCategory: 'Short' | 'Informative' | 'Detailed';
  industry: string;
  style: string;
  colorTheme: ColorTheme;
  ratio: string;
  audience: string;
  tone: string;
  language: string;
  additionalInstructions?: string;
  isLessonPlan?: boolean;
  file?: File;
}
