import React, { useEffect, useMemo, useState } from 'react';
import { SearchForm } from './components/SearchForm';
import { RevisionChart } from './components/RevisionChart';
import { ArticlePreview } from './components/ArticlePreview';
import { StatusBar } from './components/StatusBar';
import { useWikipediaData } from './hooks/useWikipediaData';
import { getZoomCooldownUntil } from './hooks/useWikipediaData';

const App: React.FC = () => {
  const { 
    loading, 
    error, 
    cooldownSeconds,
    series, 
    preview, 
    fetchPreview, 
    fetchSeries, 
    fetchData 
  } = useWikipediaData();
  const [title, setTitle] = useState<string>('Earth');
  const [limit, setLimit] = useState<number>(300);
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [to, setTo] = useState<string | undefined>(undefined);
  const [isAtStart, setIsAtStart] = useState(false);

  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);

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
    setIsAtStart(false);
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

  const lastZoomFetchRef = React.useRef<number>(0);
  const TOL = 12 * 60 * 60 * 1000; // 12h tolerance
  const MAX_FILL_STEPS = 3; // safety cap
  const handleViewRangeChange = async (fromDate: Date, toDate: Date) => {
    const viewMin = fromDate.getTime();
    const viewMax = toDate.getTime();

    // throttle sequences to 1s
    const nowTs = Date.now();
    if (nowTs - lastZoomFetchRef.current < 1000) return;
    lastZoomFetchRef.current = nowTs;

    // If no data yet, do an initial wider fetch
    if (!currentCoverage) {
      const f = toIsoDate(fromDate);
      const t = toIsoDate(new Date(Math.min(toDate.getTime(), Date.now())));
      const initialLimit = Math.max(limit, 1500);
      setFrom(f); setTo(t); setLimit(initialLimit);
      console.log(`[DEBUG] Zoom-out (no coverage) fetch: from=${f}, to=${t}, limit=${initialLimit}`);
      await fetchSeries(title, initialLimit, f, t, true);
      return;
    }

    // Check if view crosses current coverage edges
    const needsLeft = viewMin < currentCoverage.min - TOL;
    const needsRight = viewMax > currentCoverage.max + TOL;
    if (!needsLeft && !needsRight) return;

    setIsBackgroundLoading(true);
    // Fill-to-view loop: fetch up to MAX_FILL_STEPS chunks
    let steps = 0;
    while (steps < MAX_FILL_STEPS) {
      // Respect rate limit cool-down
      const cd = getZoomCooldownUntil();
      const now = Date.now();
      if (cd > now) break;

      // Recompute coverage each iteration from latest series
      const s = series;
      if (!s || !s.points.length) break;
      const covMin = new Date(s.points[0].timestamp).getTime();
      const covMax = new Date(s.points[s.points.length - 1].timestamp).getTime();

      const needL = viewMin < covMin - TOL;
      const needR = viewMax > covMax + TOL;
      if (!needL && !needR) break; // covered

      const clampedToDate = new Date(Math.min(viewMax, Date.now()));
      const f = toIsoDate(new Date(needL ? viewMin : covMin));
      const t = toIsoDate(clampedToDate);

      const span = viewMax - viewMin;
      const currentSpan = covMax - covMin || 1;
      const scaledLimit = Math.min(5000, Math.max(limit, Math.ceil(limit * (span / currentSpan) * 1.4)));

      setFrom(f); setTo(t);
      if (scaledLimit !== limit) setLimit(scaledLimit);
      console.log(`[DEBUG] Fill-to-view fetch[${steps+1}]: from=${f}, to=${t}, limit=${scaledLimit}`);
      const result = await fetchSeries(title, scaledLimit, f, t, true);
      
      // If we asked for older data (needL) but didn't get any new points, we reached the start
      if (needL && result) {
        const newCovMin = new Date(result.points[0].timestamp).getTime();
        if (newCovMin >= covMin) {
          setIsAtStart(true);
          break; 
        }
      }
      
      steps++;
    }
    setIsBackgroundLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-50 min-h-screen">
      <header className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">WikiStats</h1>
        </div>
        <div className="text-xs text-slate-500 uppercase tracking-widest font-semibold hidden sm:block">
          Wikipedia History Visualizer
        </div>
      </header>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <SearchForm
          disabled={loading}
          onSearch={handleSearch}
          onLoad={handleLoad}
        />
      </div>

      <div className="min-h-[40px]">
        <StatusBar
          loading={loading}
          error={error}
          cooldownSeconds={cooldownSeconds}
          seriesLength={series?.points?.length}
          title={series?.title}
          backgroundLoading={isBackgroundLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
          <h3 className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            Revision Activity
          </h3>
          <div className="flex-grow">
            {series ? (
              <RevisionChart 
                series={series} 
                onViewRangeChange={handleViewRangeChange} 
                isAtStart={isAtStart}
              />
            ) : (
              <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-100 rounded-lg bg-slate-50 text-slate-400">
                <p>No data yet. Use the form to load revisions.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Article Insight
            </h3>
            <ArticlePreview preview={preview} />
            {!preview && (
              <div className="py-8 text-center text-slate-400 italic text-sm">
                Article details will appear here after search
              </div>
            )}
          </div>
          
          <div className="bg-slate-800 text-slate-100 p-6 rounded-xl shadow-lg">
            <h4 className="font-bold mb-2 text-blue-400 text-sm uppercase tracking-wider">Quick Tips</h4>
            <ul className="text-xs space-y-2 text-slate-300">
              <li className="flex gap-2">
                <span className="text-blue-500">•</span>
                <span><b>Zoom:</b> Use mouse wheel or pinch to zoom in/out on the time axis.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500">•</span>
                <span><b>Pan:</b> Hold <b>Shift</b> while dragging the chart horizontally.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500">•</span>
                <span><b>Fetch:</b> Zooming out beyond the current range auto-fetches more history.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500">•</span>
                <span><b>Reset:</b> Use the 'Reset Zoom' button to see the full loaded range.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
