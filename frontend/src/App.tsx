import React, { useEffect, useMemo, useState } from 'react';
import { SearchForm } from './components/SearchForm';
import { RevisionChart } from './components/RevisionChart';
import { ArticlePreview } from './components/ArticlePreview';
import { StatusBar } from './components/StatusBar';
import { useWikipediaData } from './hooks/useWikipediaData';

const App: React.FC = () => {
  const { loading, error, series, preview, fetchPreview, fetchSeries, fetchData } = useWikipediaData();
  const [title, setTitle] = useState<string>('Earth');
  const [limit, setLimit] = useState<number>(300);
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [to, setTo] = useState<string | undefined>(undefined);

  useEffect(() => {
    // initial load: do a search and load default range
    fetchData(title, limit, from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toIsoDate = (d: Date) => d.toISOString().split('T')[0];

  const handleSearch = (t: string) => {
    setTitle(t);
    // only fetch preview
    fetchPreview(t);
  };

  const handleLoad = (t: string, l: number, f?: string, tt?: string) => {
    setTitle(t);
    setLimit(l);
    setFrom(f);
    setTo(tt);
    fetchSeries(t, l, f, tt);
    // also refresh preview in background
    fetchPreview(t);
  };

  const currentCoverage = useMemo(() => {
    if (!series || !series.points.length) return null as null | { min: number; max: number };
    const min = new Date(series.points[0].timestamp).getTime();
    const max = new Date(series.points[series.points.length - 1].timestamp).getTime();
    return { min, max };
  }, [series]);

  const handleViewRangeChange = (fromDate: Date, toDate: Date) => {
    // Only fetch when user zoomed out beyond current data coverage
    const viewMin = fromDate.getTime();
    const viewMax = toDate.getTime();

    if (!currentCoverage) {
      const f = toIsoDate(fromDate);
      const t = toIsoDate(toDate);
      const initialLimit = Math.max(limit, 1000); // fetch more on the first zoom-out
      setFrom(f);
      setTo(t);
      setLimit(initialLimit);
      console.log(`[DEBUG] Zoom-out (no coverage) fetch: from=${f}, to=${t}, limit=${initialLimit}`);
      fetchSeries(title, initialLimit, f, t, true);
      return;
    }
    const extendsLeft = viewMin < currentCoverage.min - 12 * 60 * 60 * 1000; // tolerance 12h
    const extendsRight = viewMax > currentCoverage.max + 12 * 60 * 60 * 1000;
    const span = viewMax - viewMin;
    const currentSpan = currentCoverage.max - currentCoverage.min;
    const zoomedOut = span > currentSpan * 1.05; // 5% wider than current

    if ((extendsLeft || extendsRight) && zoomedOut && !loading) {
      const today = new Date();
      const clampedToDate = toDate > today ? today : toDate;
      
      const f = toIsoDate(fromDate);
      const t = toIsoDate(clampedToDate);
      
      // scale limit with the new span so we actually get older/newer points
      const scaledLimit = Math.min(5000, Math.max(limit, Math.ceil(limit * (span / currentSpan) * 1.2)));
      setFrom(f);
      setTo(t);
      if (scaledLimit !== limit) setLimit(scaledLimit);
      console.log(`[DEBUG] Zoom-out fetch: from=${f}, to=${t}, limit=${scaledLimit} (prev=${limit})`);
      fetchSeries(title, scaledLimit, f, t, true);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">WikiStats</h1>

      <SearchForm
        disabled={loading}
        onSearch={handleSearch}
        onLoad={handleLoad}
      />

      <div className="min-h-[24px]">
        <StatusBar
          loading={loading}
          error={error}
          seriesLength={series?.points?.length}
          title={series?.title}
        />
      </div>

      <ArticlePreview preview={preview} />

      <div className="h-[380px]">
        {series ? (
          <RevisionChart series={series} onViewRangeChange={handleViewRangeChange} />
        ) : (
          <div className="text-sm text-gray-600">No data yet. Use the form to load revisions.</div>
        )}
      </div>
    </div>
  );
};

export default App;
