import { useMemo, useRef } from 'preact/hooks';
import { FilterForm } from './components/FilterForm';
import { StatusBanner } from './components/StatusBanner';
import { PreviewCard } from './components/PreviewCard';
import { StatsList } from './components/StatsList';
import { ChartsPanel } from './components/charts/ChartsPanel';
import { useFormState } from './hooks/useFormState';
import { useWikiStatsData } from './hooks/useWikiStatsData';
import { useCharts } from './hooks/useCharts';
import type { Article, Interval } from './types/wikistats';

export function App() {
  const fmt = useMemo(() => new Intl.NumberFormat(undefined), []);

  const { formState, setFormState, queryState, setQueryState, submitFilters } = useFormState();
  const { status, loading, preview, visibleStats } = useWikiStatsData(queryState, fmt);

  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const deltaCanvasRef = useRef<HTMLCanvasElement>(null);

  useCharts({
    chartCanvasRef,
    deltaCanvasRef,
    visibleStats,
    topN: Number(queryState.topN) || 6
  });

  const handleArticleChange = (article: Article) => {
    setFormState((prev) => ({ ...prev, article }));
  };

  const handleIntervalChange = (interval: Interval) => {
    setFormState((prev) => ({ ...prev, interval }));
  };

  const handleTopNChange = (topN: string) => {
    setFormState((prev) => ({ ...prev, topN }));
    setQueryState((prev) => ({ ...prev, topN }));
  };

  const handleRangeChange = (range: string) => {
    setFormState((prev) => ({ ...prev, range }));
    setQueryState((prev) => ({ ...prev, range }));
  };

  return (
    <>
      <h1>WikiStats</h1>

      <FilterForm
        formState={formState}
        loading={loading}
        onSubmit={submitFilters}
        onArticleChange={handleArticleChange}
        onIntervalChange={handleIntervalChange}
        onTopNChange={handleTopNChange}
        onRangeChange={handleRangeChange}
      />

      <StatusBanner status={status} />

      <ChartsPanel chartCanvasRef={chartCanvasRef} deltaCanvasRef={deltaCanvasRef} />

      <PreviewCard preview={preview} />

      <StatsList stats={visibleStats} fmt={fmt} />
    </>
  );
}
