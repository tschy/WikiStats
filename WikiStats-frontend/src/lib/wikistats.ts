import type { ChartDataset } from 'chart.js/auto';
import type { FormState, PreviewData, StatBucket, UserStat } from '../types/wikistats';
import { DEFAULT_FORM_STATE } from '../types/wikistats';

export function restoreFormState(): FormState {
  try {
    const raw = localStorage.getItem('wikistats.form');
    if (!raw) return DEFAULT_FORM_STATE;

    const state = JSON.parse(raw) as Partial<FormState>;
    return {
      article: typeof state.article === 'string' ? state.article : DEFAULT_FORM_STATE.article,
      interval: typeof state.interval === 'string' ? state.interval : DEFAULT_FORM_STATE.interval,
      topN: typeof state.topN === 'string' ? state.topN : DEFAULT_FORM_STATE.topN,
      range: typeof state.range === 'string' ? state.range : DEFAULT_FORM_STATE.range
    };
  } catch {
    return DEFAULT_FORM_STATE;
  }
}

export function applyRange(stats: StatBucket[], range: string): StatBucket[] {
  if (range === 'all') return stats;

  const n = Number(range);
  if (!Number.isFinite(n) || n <= 0) return stats;

  return stats.slice(-n);
}

export async function fetchJson<T>(path: string): Promise<T> {
  const url = new URL(path, window.location.href);
  const res = await fetch(url.toString());
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}\\n${text}`);
  }

  return JSON.parse(text) as T;
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return String(iso);
  }
}

export function shouldShowPreview(preview: PreviewData | null): boolean {
  if (!preview) return false;
  return Boolean(preview.extract || preview.thumbnailUrl || preview.pageUrl);
}

export function computeTotalEdits(stats: StatBucket[]): number {
  return stats.reduce(
    (sum, bucket) => sum + (bucket.userStats ?? []).reduce((bucketSum, user) => bucketSum + (user.count || 0), 0),
    0
  );
}

function colorForUser(index: number, total: number): { border: string; fill: string } {
  const safeTotal = Math.max(total, 1);
  const hue = Math.round((index * 360) / safeTotal);

  return {
    border: `hsl(${hue} 75% 38%)`,
    fill: `hsl(${hue} 72% 52%)`
  };
}

export function buildDatasets(
  stats: StatBucket[],
  topN: number,
  valueSelector: (userStat: UserStat) => number,
  stackKey: string,
  totalLabel: string
): ChartDataset<'line', number[]>[] {
  const userTotals = new Map<string, number>();

  for (const bucket of stats) {
    for (const userStat of bucket.userStats ?? []) {
      userTotals.set(userStat.user, (userTotals.get(userStat.user) ?? 0) + valueSelector(userStat));
    }
  }

  const topUsers = Array.from(userTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN || 6)
    .map(([user]) => user);

  const topUserSet = new Set(topUsers);

  const datasets = topUsers.map((user, index) => {
    const data = stats.map((bucket) => {
      const found = (bucket.userStats ?? []).find((u) => u.user === user);
      return found ? valueSelector(found) : 0;
    });

    const color = colorForUser(index, topUsers.length);

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
