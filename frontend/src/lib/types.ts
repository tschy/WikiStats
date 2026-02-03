export interface RevisionPoint {
  id: number;
  timestamp: string;
  size: number;
  delta: number;
  user: string | null;
}

export interface RevisionSeries {
  title: string;
  points: RevisionPoint[];
}

export interface ArticlePreviewData {
  title: string;
  description: string | null;
  extract: string | null;
  thumbnailUrl: string | null;
  pageUrl: string | null;
}
