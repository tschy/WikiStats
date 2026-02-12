import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import Chart, { type ChartDataset } from 'chart.js/auto';

type Interval = 'daily' | 'weekly' | 'monthly' | 'yearly';
type Article = 'earth' | 'moon' | 'horse';

type UserStat = {
  user: string;
  count: number;
  delta: number;
};

type StatBucket = {
  intervalStart: string;
  userStats: UserStat[];
};

type PreviewData = {
  title?: string;
  description?: string;
  extract?: string;
  thumbnailUrl?: string;
  pageUrl?: string;
};

type FormState = {
  article: Article;
  interval: Interval;
  topN: string;
  range: string;
};

type StatusState = {
  message: string;
  error: boolean;
};

const DEFAULT_STATE: FormState = {
  article: 'earth',
  interval: 'weekly',
  topN: '6',
  range: 'all'
};

function restoreFormState(): FormState {
  try {
    const raw = localStorage.getItem('wikistats.form');
    if (!raw) return DEFAULT_STATE;

    const s = JSON.parse(raw) as Partial<FormState>;
    return {
      article: typeof s.article === 'string' ? (s.article as Article) : DEFAULT_STATE.article,
      interval: typeof s.interval === 'string' ? (s.interval as Interval) : DEFAULT_STATE.interval,
      topN: typeof s.topN === 'string' ? s.topN : DEFAULT_STATE.topN,
      range: typeof s.range === 'string' ? s.range : DEFAULT_STATE.range
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function applyRange(stats: StatBucket[], range: string): StatBucket[] {
  if (range === 'all') return stats;
  const n = Number(range);
  if (!Number.isFinite(n) || n <= 0) return stats;
  return stats.slice(-n);
}

async function fetchJson<T>(path: string): Promise<T> {
  const url = new URL(path, window.location.href);
  const res = await fetch(url.toString());
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}\n${text}`);
  return JSON.parse(text) as T;
}

function colorForUser(index: number, total: number): { border: string; fill: string } {
  const safeTotal = Math.max(total, 1);
  const hue = Math.round((index * 360) / safeTotal);
  return {
    border: `hsl(${hue} 75% 38%)`,
    fill: `hsl(${hue} 72% 52%)`
  };
}

function buildDatasets(
  stats: StatBucket[],
  topN: number,
  valueSelector: (u: UserStat) => number,
  stackKey: string,
  totalLabel: string
): ChartDataset<'line', number[]>[] {
  const userTotals = new Map<string, number>();

  for (const bucket of stats) {
    for (const u of bucket.userStats ?? []) {
      userTotals.set(u.user, (userTotals.get(u.user) ?? 0) + valueSelector(u));
    }
  }

  const topUsers = Array.from(userTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN || 6)
    .map(([user]) => user);

  const topUserSet = new Set(topUsers);

  const datasets = topUsers.map((user, idx) => {
    const data = stats.map((bucket) => {
      const found = (bucket.userStats ?? []).find((u) => u.user === user);
      return found ? valueSelector(found) : 0;
    });
    const color = colorForUser(idx, topUsers.length);
    return {
      label: user,
      data,
      borderWidth: 1.5,
      borderColor: color.border,
      backgroundColor: color.fill,
      pointRadius: 0,
      tension: 0.15,
      fill: true,
      stack: stackKey
    };
  });

  const hasOtherUsers = Array.from(userTotals.keys()).some((user) => !topUserSet.has(user));

  if (hasOtherUsers) {
    const otherData = stats.map((bucket) =>
      (bucket.userStats ?? [])
        .filter((u) => !topUserSet.has(u.user))
        .reduce((sum, u) => sum + valueSelector(u), 0)
    );
    datasets.push({
      label: 'Other',
      data: otherData,
      borderWidth: 1.5,
      borderColor: '#b3b3b3',
      backgroundColor: 'rgb(211,211,211)',
      pointRadius: 0,
      tension: 0.15,
      fill: true,
      stack: stackKey
    });
  }

  if (!datasets.length) {
    datasets.push({
      label: totalLabel,
      data: stats.map((bucket) => (bucket.userStats ?? []).reduce((sum, u) => sum + valueSelector(u), 0)),
      borderWidth: 1.5,
      borderColor: '#1f77b4',
      backgroundColor: 'rgb(31,119,180)',
      pointRadius: 0,
      tension: 0.15,
      fill: true,
      stack: stackKey
    });
  }

  return datasets;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return String(iso);
  }
}

export function App() {
  const fmt = useMemo(() => new Intl.NumberFormat(undefined), []);
  const [formState, setFormState] = useState<FormState>(restoreFormState);
  const [queryState, setQueryState] = useState<FormState>(restoreFormState);
  const [status, setStatus] = useState<StatusState>({ message: 'Loading…', error: false });
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [visibleStats, setVisibleStats] = useState<StatBucket[]>([]);

  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const deltaCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const deltaChartRef = useRef<Chart | null>(null);

  useEffect(() => {
    localStorage.setItem('wikistats.form', JSON.stringify(formState));
  }, [formState]);

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
      const totalEdits = loadedStats.reduce(
        (sum, bucket) => sum + (bucket.userStats ?? []).reduce((s, u) => s + (u.count || 0), 0),
        0
      );

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

  useEffect(() => {
    const chartCanvas = chartCanvasRef.current;
    const deltaCanvas = deltaCanvasRef.current;
    if (!chartCanvas || !deltaCanvas) return;

    const topN = Number(queryState.topN) || 6;
    const labels = visibleStats.map((b) => new Date(b.intervalStart).toLocaleDateString());

    const editDatasets = buildDatasets(visibleStats, topN, (u) => u.count || 0, 'edits', 'Total Edits');
    const deltaDatasets = buildDatasets(visibleStats, topN, (u) => u.delta || 0, 'delta', 'Total Delta');

    if (chartRef.current) chartRef.current.destroy();
    if (deltaChartRef.current) deltaChartRef.current.destroy();

    chartRef.current = new Chart(chartCanvas, {
      type: 'line',
      data: { labels, datasets: editDatasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: true } },
        scales: {
          x: { type: 'category' },
          y: {
            type: 'linear',
            stacked: true,
            title: { display: true, text: 'Edits pro Intervall' }
          }
        }
      }
    });

    deltaChartRef.current = new Chart(deltaCanvas, {
      type: 'line',
      data: { labels, datasets: deltaDatasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: true } },
        scales: {
          x: { type: 'category' },
          y: {
            type: 'linear',
            stacked: true,
            title: { display: true, text: 'Delta pro Intervall' }
          }
        }
      }
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
      if (deltaChartRef.current) deltaChartRef.current.destroy();
      chartRef.current = null;
      deltaChartRef.current = null;
    };
  }, [queryState.topN, visibleStats]);

  const onSubmit = (e: Event) => {
    e.preventDefault();
    setQueryState(formState);
  };

  return (
    <>
      <h1>WikiStats</h1>

      <form onSubmit={onSubmit}>
        <label>
          Artikel
          <select
            value={formState.article}
            onChange={(e) =>
              setFormState((s) => ({
                ...s,
                article: (e.currentTarget as HTMLSelectElement).value as Article
              }))
            }
          >
            <option value="earth">Earth</option>
            <option value="moon">Moon</option>
            <option value="horse">Horse</option>
          </select>
        </label>

        <label>
          Intervall
          <select
            value={formState.interval}
            onChange={(e) =>
              setFormState((s) => ({
                ...s,
                interval: (e.currentTarget as HTMLSelectElement).value as Interval
              }))
            }
          >
            <option value="daily">Täglich</option>
            <option value="weekly">Wöchentlich</option>
            <option value="monthly">Monatlich</option>
            <option value="yearly">Jährlich</option>
          </select>
        </label>

        <label>
          Top-N Nutzer
          <select
            value={formState.topN}
            onChange={(e) => {
              const value = (e.currentTarget as HTMLSelectElement).value;
              setFormState((s) => ({ ...s, topN: value }));
              setQueryState((s) => ({ ...s, topN: value }));
            }}
          >
            <option value="3">3</option>
            <option value="5">5</option>
            <option value="6">6</option>
            <option value="8">8</option>
            <option value="10">10</option>
          </select>
        </label>

        <label>
          Sichtbare Intervalle
          <select
            value={formState.range}
            onChange={(e) => {
              const value = (e.currentTarget as HTMLSelectElement).value;
              setFormState((s) => ({ ...s, range: value }));
              setQueryState((s) => ({ ...s, range: value }));
            }}
          >
            <option value="all">Alle</option>
            <option value="5">Letzte 5</option>
            <option value="10">Letzte 10</option>
            <option value="20">Letzte 20</option>
            <option value="50">Letzte 50</option>
          </select>
        </label>

        <button type="submit" disabled={loading}>
          Laden
        </button>
      </form>

      <div id="status" class={status.error ? 'err' : 'ok'}>
        {status.message}
      </div>

      <div class="chart-wrap">
        <canvas ref={chartCanvasRef} />
      </div>
      <div class="chart-wrap">
        <canvas ref={deltaCanvasRef} />
      </div>

      {preview && (preview.extract || preview.thumbnailUrl || preview.pageUrl) ? (
        <div id="preview">
          <div id="previewInner">
            {preview.thumbnailUrl ? <img id="previewImg" src={preview.thumbnailUrl} alt="" /> : <div />}
            <div>
              <h2 id="previewTitle">
                {preview.pageUrl ? (
                  <a href={preview.pageUrl} target="_blank" rel="noopener noreferrer">
                    {preview.title ?? 'Open on Wikipedia'}
                  </a>
                ) : (
                  preview.title ?? ''
                )}
              </h2>
              <div id="previewMeta">{preview.description ?? ''}</div>
              <div id="previewExtract">
                {`${(preview.extract ?? '').slice(0, 340)}${(preview.extract ?? '').length > 340 ? '…' : ''}`}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div id="list">
        <ul>
          {visibleStats.length === 0 ? (
            <li>Keine Daten gefunden.</li>
          ) : (
            visibleStats.map((bucket) => {
              const users = (bucket.userStats ?? []).slice(0, 10);
              return (
                <li key={bucket.intervalStart}>
                  <div class="interval">Intervall: {formatDate(bucket.intervalStart)}</div>
                  <div class="users">
                    {users.length === 0
                      ? 'Keine Benutzer in diesem Intervall.'
                      : users
                          .map(
                            (u) =>
                              `${u.user}: ${fmt.format(u.count)} (${u.delta >= 0 ? '+' : ''}${fmt.format(u.delta)})`
                          )
                          .join(' · ')}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </>
  );
}
