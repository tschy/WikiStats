import { useState, useCallback, useEffect } from 'react';
import { RevisionSeries, ArticlePreviewData } from '../lib/types';

let zoomCooldownUntil = 0; // ms timestamp to throttle after 429

export function getZoomCooldownUntil() {
  return zoomCooldownUntil;
}

export function useWikipediaData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  const [series, setSeries] = useState<RevisionSeries | null>(null);
  const [preview, setPreview] = useState<ArticlePreviewData | null>(null);

  useEffect(() => {
    let timer: number;
    if (cooldownSeconds !== null && cooldownSeconds > 0) {
      timer = window.setInterval(() => {
        setCooldownSeconds(prev => (prev !== null && prev > 0 ? prev - 1 : null));
      }, 1000);
    } else if (cooldownSeconds === 0) {
      setCooldownSeconds(null);
    }
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const fetchPreview = useCallback(async (title: string) => {
    setLoading(true);
    setError(null);
    try {
      const previewUrl = new URL('/api/preview', window.location.origin);
      previewUrl.searchParams.set('title', title);
      const res = await fetch(previewUrl.toString());
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch preview: ${res.status} ${text}`);
      }
      const data = await res.json();
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSeries = useCallback(async (title: string, limit: number, from?: string, to?: string, append: boolean = false): Promise<RevisionSeries | null> => {
    const now = Date.now();
    if (zoomCooldownUntil > now) {
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const seriesUrl = new URL('/api/revisions', window.location.origin);
      seriesUrl.searchParams.set('title', title);
      seriesUrl.searchParams.set('limit', String(limit));
      if (from) seriesUrl.searchParams.set('from', from);
      if (to) seriesUrl.searchParams.set('to', to);
      const res = await fetch(seriesUrl.toString());
      if (!res.ok) {
        // Handle rate limit gracefully
        if (res.status === 429) {
          const retryAfter = res.headers.get('Retry-After');
          const retrySeconds = retryAfter ? Number(retryAfter) : 2;
          zoomCooldownUntil = Date.now() + (retrySeconds * 1000);
          setCooldownSeconds(retrySeconds);
          setError(`Rate limited by Wikipedia. Cooling down...`);
        } else {
          const text = await res.text();
          throw new Error(`Failed to fetch revisions: ${res.status} ${text}`);
        }
        return null;
      }
      const data: RevisionSeries = await res.json();
      if (append && series) {
        // Merge points and sort by timestamp
        const combinedPoints = [...series.points];
        const existingIds = new Set(series.points.map(p => p.id));
        
        for (const p of data.points) {
          if (!existingIds.has(p.id)) {
            combinedPoints.push(p);
          }
        }
        
        combinedPoints.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        const merged: RevisionSeries = {
          ...data,
          points: combinedPoints
        };
        setSeries(merged);
        return merged;
      } else {
        setSeries(data);
        return data;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, [series]);

  // Backward-compatible combined fetch
  const fetchData = useCallback(async (title: string, limit: number, from?: string, to?: string) => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchPreview(title),
        fetchSeries(title, limit, from, to)
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [fetchPreview, fetchSeries]);

  return { loading, error, cooldownSeconds, series, preview, fetchPreview, fetchSeries, fetchData };
}
