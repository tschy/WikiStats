import { useCallback, useEffect, useState } from 'preact/hooks';
import {
  applyRange,
  computeTotalEdits,
  fetchJson
} from '../lib/wikistats';
import type { FormState, PreviewData, StatBucket, StatusState } from '../types/wikistats';

export function useWikiStatsData(queryState: FormState, fmt: Intl.NumberFormat) {
  const [status, setStatus] = useState<StatusState>({ message: 'Loading…', error: false });
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [visibleStats, setVisibleStats] = useState<StatBucket[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setStatus({ message: 'Loading…', error: false });

    try {
      const { article, interval, range } = queryState;

      const [previewData, loadedStats] = await Promise.all([
        fetchJson<PreviewData>(`/data/${article}-preview.json`).catch((err) => {
          console.warn('Preview failed:', err);
          return null;
        }),
        fetchJson<StatBucket[]>(`/data/${article}-${interval}.json`)
      ]);

      const ranged = applyRange(loadedStats, range);
      const totalEdits = computeTotalEdits(loadedStats);

      setPreview(previewData);
      setVisibleStats(ranged);
      setStatus({
        message: `Geladen: ${article} (${interval}), sichtbar ${ranged.length}/${loadedStats.length} Intervalle, ${fmt.format(totalEdits)} Edits.`,
        error: false
      });
    } catch (err) {
      setStatus({ message: `Fehler beim Laden/Rendern: ${String(err)}`, error: true });
    } finally {
      setLoading(false);
    }
  }, [fmt, queryState]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return {
    status,
    loading,
    preview,
    visibleStats
  };
}
