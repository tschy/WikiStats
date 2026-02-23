import { useEffect } from 'preact/hooks';
import Chart from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';
import { buildDatasets } from '../lib/wikistats';
import type { StatBucket } from '../types/wikistats';

Chart.register(zoomPlugin);

type UseChartsParams = {
  chartCanvasRef: { current: HTMLCanvasElement | null };
  deltaCanvasRef: { current: HTMLCanvasElement | null };
  visibleStats: StatBucket[];
  topN: number;
};

export function useCharts({ chartCanvasRef, deltaCanvasRef, visibleStats, topN }: UseChartsParams) {
  useEffect(() => {
    const chartCanvas = chartCanvasRef.current;
    const deltaCanvas = deltaCanvasRef.current;

    if (!chartCanvas || !deltaCanvas) return;

    const labels = visibleStats.map((bucket) => new Date(bucket.intervalStart).toLocaleDateString());
    const editDatasets = buildDatasets(visibleStats, topN, (u) => u.count || 0, 'edits', 'Total Edits');
    const deltaDatasets = buildDatasets(visibleStats, topN, (u) => u.delta || 0, 'delta', 'Total Delta');

    const editsChart = new Chart(chartCanvas, {
      type: 'line',
      data: { labels, datasets: editDatasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true },
          zoom: {
            limits: { x: { min: 0, max: labels.length - 1 } },
            zoom: {
              drag: { enabled: true },
              mode: 'x'
            }
          }
        },
        scales: {
          x: { type: 'category', stacked: true },
          y: {
            type: 'linear',
            stacked: true,
            title: { display: true, text: 'Edits pro Intervall' }
          }
        }
      }
    });

    const handleEditsReset = () => editsChart.resetZoom();
    chartCanvas.addEventListener('dblclick', handleEditsReset);

    const deltasChart = new Chart(deltaCanvas, {
      type: 'line',
      data: { labels, datasets: deltaDatasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true },
          zoom: {
            limits: { x: { min: 0, max: labels.length - 1 } },
            zoom: {
              drag: { enabled: true },
              mode: 'x'
            }
          }
        },
        scales: {
          x: { type: 'category', stacked: true },
          y: {
            type: 'linear',
            stacked: true,
            title: { display: true, text: 'Delta pro Intervall' }
          }
        }
      }
    });

    const handleDeltasReset = () => deltasChart.resetZoom();
    deltaCanvas.addEventListener('dblclick', handleDeltasReset);

    return () => {
      chartCanvas.removeEventListener('dblclick', handleEditsReset);
      deltaCanvas.removeEventListener('dblclick', handleDeltasReset);
      editsChart.destroy();
      deltasChart.destroy();
    };
  }, [chartCanvasRef, deltaCanvasRef, topN, visibleStats]);
}
