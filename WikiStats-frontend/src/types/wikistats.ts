export type Interval = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type Article = 'earth' | 'moon' | 'horse';

export type UserStat = {
  user: string;
  count: number;
  delta: number;
};

export type StatBucket = {
  intervalStart: string;
  userStats: UserStat[];
};

export type PreviewData = {
  title?: string;
  description?: string;
  extract?: string;
  thumbnailUrl?: string;
  pageUrl?: string;
};

export type FormState = {
  article: Article;
  interval: Interval;
  topN: string;
  range: string;
};

export type StatusState = {
  message: string;
  error: boolean;
};

export const DEFAULT_FORM_STATE: FormState = {
  article: 'earth',
  interval: 'weekly',
  topN: '6',
  range: 'all'
};
