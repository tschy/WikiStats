import { useState, useCallback } from 'react';
import { RevisionSeries, ArticlePreviewData } from '../lib/types';

export function useWikipediaData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [series, setSeries] = useState<RevisionSeries | null>(null);
  const [preview, setPreview] = useState<ArticlePreviewData | null>(null);

  const fetchData = useCallback(async (title: string, limit: number, from?: string, to?: string) => {
    setLoading(true);
    setError(null);

    try {
      const seriesUrl = new URL('/api/revisions', window.location.origin);
      seriesUrl.searchParams.set('title', title);
      seriesUrl.searchParams.set('limit', String(limit));
      if (from) seriesUrl.searchParams.set('from', from);
      if (to) seriesUrl.searchParams.set('to', to);

      const previewUrl = new URL('/api/preview', window.location.origin);
      previewUrl.searchParams.set('title', title);

      const [previewRes, seriesRes] = await Promise.all([
        fetch(previewUrl.toString()).then(res => res.ok ? res.json() : null).catch(() => null),
        fetch(seriesUrl.toString())
      ]);

      if (!seriesRes.ok) {
        const text = await seriesRes.text();
        throw new Error(`Failed to fetch revisions: ${seriesRes.status} ${text}`);
      }

      const seriesData = await seriesRes.json();
      setSeries(seriesData);
      setPreview(previewRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, series, preview, fetchData };
}
