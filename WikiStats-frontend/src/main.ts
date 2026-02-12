import Chart, { type ChartDataset } from 'chart.js/auto';
import './style.css';

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

const getEl = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: ${id}`);
  return el as T;
};

const statusEl = getEl<HTMLDivElement>('status');
const previewEl = getEl<HTMLDivElement>('preview');
const previewImg = getEl<HTMLImageElement>('previewImg');
const previewTitle = getEl<HTMLHeadingElement>('previewTitle');
const previewMeta = getEl<HTMLDivElement>('previewMeta');
const previewExtract = getEl<HTMLDivElement>('previewExtract');
const dataList = getEl<HTMLUListElement>('dataList');
const canvas = getEl<HTMLCanvasElement>('chart');
const deltaCanvas = getEl<HTMLCanvasElement>('chartDelta');

const articleEl = getEl<HTMLSelectElement>('article');
const intervalEl = getEl<HTMLSelectElement>('interval');
const topNEl = getEl<HTMLSelectElement>('topN');
const rangeEl = getEl<HTMLSelectElement>('range');
const loadBtn = getEl<HTMLButtonElement>('loadBtn');
const formEl = getEl<HTMLFormElement>('form');
const fmt = new Intl.NumberFormat(undefined);

let chart: Chart | null = null;
let deltaChart: Chart | null = null;

function setStatusOk(msg: string): void {
  statusEl.classList.remove('err');
  statusEl.classList.add('ok');
  statusEl.textContent = msg;
}

function setStatusErr(msg: string): void {
  statusEl.classList.remove('ok');
  statusEl.classList.add('err');
  statusEl.textContent = msg;
}

function saveFormState(): void {
  const state: FormState = {
    article: articleEl.value as Article,
    interval: intervalEl.value as Interval,
    topN: topNEl.value,
    range: rangeEl.value
  };
  localStorage.setItem('wikistats.form', JSON.stringify(state));
}

function restoreFormState(): boolean {
  try {
    const raw = localStorage.getItem('wikistats.form');
    if (!raw) return false;

    const s = JSON.parse(raw) as Partial<FormState>;
    if (typeof s.article === 'string') articleEl.value = s.article;
    if (typeof s.interval === 'string') intervalEl.value = s.interval;
    if (typeof s.topN === 'string') topNEl.value = s.topN;
    if (typeof s.range === 'string') rangeEl.value = s.range;
    return true;
  } catch {
    return false;
  }
}

[articleEl, intervalEl, topNEl, rangeEl].forEach((el) => {
  el.addEventListener('change', saveFormState);
});

function applyRange(stats: StatBucket[]): StatBucket[] {
  if (rangeEl.value === 'all') return stats;
  const n = Number(rangeEl.value);
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

function renderPreview(p: PreviewData | null): void {
  if (!p || (!p.extract && !p.thumbnailUrl && !p.pageUrl)) {
    previewEl.style.display = 'none';
    return;
  }

  previewEl.style.display = 'block';

  if (p.thumbnailUrl) {
    previewImg.src = p.thumbnailUrl;
    previewImg.style.display = 'block';
  } else {
    previewImg.removeAttribute('src');
    previewImg.style.display = 'none';
  }

  previewMeta.textContent = p.description ?? '';
  const extract = p.extract ?? '';
  previewExtract.textContent = `${extract.slice(0, 340)}${extract.length > 340 ? '…' : ''}`;

  previewTitle.innerHTML = '';
  if (p.pageUrl) {
    const a = document.createElement('a');
    a.href = p.pageUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = p.title ?? 'Open on Wikipedia';
    previewTitle.appendChild(a);
  } else {
    previewTitle.textContent = p.title ?? '';
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return String(iso);
  }
}

function renderList(stats: StatBucket[]): void {
  dataList.innerHTML = '';

  if (!stats.length) {
    const li = document.createElement('li');
    li.textContent = 'Keine Daten gefunden.';
    dataList.appendChild(li);
    return;
  }

  for (const bucket of stats) {
    const li = document.createElement('li');

    const header = document.createElement('div');
    header.className = 'interval';
    header.textContent = `Intervall: ${formatDate(bucket.intervalStart)}`;
    li.appendChild(header);

    const users = (bucket.userStats ?? []).slice(0, 10);
    const userLine = document.createElement('div');
    userLine.className = 'users';

    if (!users.length) {
      userLine.textContent = 'Keine Benutzer in diesem Intervall.';
    } else {
      userLine.textContent = users
        .map((u) => `${u.user}: ${fmt.format(u.count)} (${u.delta >= 0 ? '+' : ''}${fmt.format(u.delta)})`)
        .join(' · ');
    }

    li.appendChild(userLine);
    dataList.appendChild(li);
  }
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
    .slice(0, Number(topNEl.value) || 6)
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

function buildChart(stats: StatBucket[]): Chart {
  const labels = stats.map((b) => new Date(b.intervalStart).toLocaleDateString());
  const datasets = buildDatasets(stats, (u) => u.count || 0, 'edits', 'Total Edits');

  return new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true }
      },
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
}

function buildDeltaChart(stats: StatBucket[]): Chart {
  const labels = stats.map((b) => new Date(b.intervalStart).toLocaleDateString());
  const datasets = buildDatasets(stats, (u) => u.delta || 0, 'delta', 'Total Delta');

  return new Chart(deltaCanvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true }
      },
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
}

function updateChart(stats: StatBucket[]): void {
  if (chart) chart.destroy();
  if (deltaChart) deltaChart.destroy();

  chart = buildChart(stats);
  deltaChart = buildDeltaChart(stats);
}

async function loadWithUiState(): Promise<void> {
  saveFormState();

  loadBtn.disabled = true;
  setStatusOk('Loading…');

  try {
    const slug = articleEl.value;
    const interval = intervalEl.value;

    const [preview, stats] = await Promise.all([
      fetchJson<PreviewData>(`/data/${slug}-preview.json`).catch((err) => {
        previewEl.style.display = 'none';
        console.warn('Preview failed:', err);
        return null;
      }),
      fetchJson<StatBucket[]>(`/data/${slug}-${interval}.json`)
    ]);

    const visibleStats = applyRange(stats);

    renderPreview(preview);
    renderList(visibleStats);
    updateChart(visibleStats);

    const totalEdits = stats.reduce(
      (sum, bucket) => sum + (bucket.userStats ?? []).reduce((s, u) => s + (u.count || 0), 0),
      0
    );

    setStatusOk(
      `Geladen: ${slug} (${interval}), sichtbar ${visibleStats.length}/${stats.length} Intervalle, ${fmt.format(totalEdits)} Edits.`
    );
  } catch (err) {
    setStatusErr(`Fehler beim Laden/Rendern: ${String(err)}`);
  } finally {
    loadBtn.disabled = false;
  }
}

formEl.addEventListener('submit', (e) => {
  e.preventDefault();
  void loadWithUiState();
});

topNEl.addEventListener('change', () => {
  void loadWithUiState();
});

rangeEl.addEventListener('change', () => {
  void loadWithUiState();
});

restoreFormState();
void loadWithUiState();
