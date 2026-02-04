import React, { useEffect, useMemo, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { format } from 'date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';
import { RevisionSeries } from '../lib/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  zoomPlugin
);

interface RevisionChartProps {
  series: RevisionSeries;
  // Called when user completes a zoom/pan and visible X-range expands (zoom-out)
  onViewRangeChange?: (from: Date, to: Date) => void;
  isAtStart?: boolean;
}

export const RevisionChart: React.FC<RevisionChartProps> = ({ 
  series, 
  onViewRangeChange,
  isAtStart
}) => {
  const chartRef = useRef<any>(null);
  const getChartInstance = () => (chartRef.current?.chart ?? chartRef.current) as any | null;
  const prevRangeRef = useRef<{ min: number; max: number } | null>(null);

  const data = useMemo(() => ({
    datasets: [
      {
        label: 'Size (bytes)',
        data: series.points.map(p => ({ x: new Date(p.timestamp).getTime(), y: p.size })),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.15,
        yAxisID: 'ySize',
      },
      {
        label: 'Delta (bytes)',
        data: series.points.map(p => ({ x: new Date(p.timestamp).getTime(), y: p.delta })),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderWidth: 1,
        pointRadius: 0,
        tension: 0.15,
        yAxisID: 'yDelta',
      },
    ],
  }), [series]);

  const lastSpanRef = useRef<number | null>(null);
  const debouncedCallRef = useRef<number | null>(null);

  const emitIfZoomOut = (chart: any) => {
    if (!chart) return;
    const x = chart.scales?.x;
    if (!x) return;
    const min = x.min as number;
    const max = x.max as number;
    if (!Number.isFinite(min) || !Number.isFinite(max)) return;
    const span = max - min;
    
    if (!onViewRangeChange) return;

    // debounce a bit to avoid bursts when dragging
    if (debouncedCallRef.current) window.clearTimeout(debouncedCallRef.current);
    debouncedCallRef.current = window.setTimeout(() => {
      onViewRangeChange(new Date(min), new Date(max));
    }, 150);
  };

  const options: ChartOptions<'line'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeOutCubic' },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          title: (items: any) => {
            const x = items?.[0]?.parsed?.x as number | undefined;
            return x ? new Date(x).toLocaleString() : 'Revision';
          },
        }
      },
      zoom: {
        limits: {
          x: { max: Date.now() },
        },
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          drag: {
            enabled: true,
            borderColor: 'rgba(120,120,120,0.15)',
            borderWidth: 1,
            backgroundColor: 'rgba(120,120,120,0.15)',
          },
          mode: 'x',
          onZoomComplete: ({ chart }) => emitIfZoomOut(chart),
        },
        pan: {
          enabled: true,
          modifierKey: 'shift',
          mode: 'x',
          limits: {
            x: { max: Date.now() },
          },
          onPanComplete: ({ chart }) => emitIfZoomOut(chart),
        },
      },
    },
    scales: {
      x: {
        type: 'time',
        suggestedMax: Date.now(),
        time: {
          // Let the adapter choose an appropriate unit; customize tick labels below
          unit: false as any,
          displayFormats: {
            year: 'yyyy',
            month: 'MMM yyyy',
            week: 'dd MMM yyyy',
            day: 'dd MMM yyyy',
            hour: 'dd MMM yyyy HH:mm',
          },
        },
        ticks: {
          maxTicksLimit: 8,
          callback: (value: any, _index: number, ticks: any) => {
            // value is a timestamp in ms when using time scale
            const chart = getChartInstance();
            const scale = chart?.scales?.x;
            const min = scale?.min as number | undefined;
            const max = scale?.max as number | undefined;
            const v = typeof value === 'number' ? value : Number(value);
            if (!min || !max || !Number.isFinite(v)) return '' + value;
            
            const span = max - min;
            const day = 24 * 60 * 60 * 1000;
            const month = 30 * day;
            const year = 365 * day;

            // Heuristic to check if the same year appears multiple times in the visible ticks
            const yearsInTicks = new Set(ticks.map((t: any) => new Date(t.value).getFullYear()));
            const showMonth = ticks.length > yearsInTicks.size;

            if (span > 2 * year && !showMonth) return format(v, 'yyyy');
            if (span > 2 * month || showMonth) return format(v, 'MMM yyyy');
            return format(v, 'dd MMM yyyy');
          },
        },
      },
      ySize: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Size (bytes)',
        },
      },
      yDelta: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Delta (bytes)',
        },
      },
    },
  }), []);

  useEffect(() => {
    const chart = getChartInstance();
    if (chart && series && series.points.length) {
      try {
        const firstTs = new Date(series.points[0].timestamp).getTime();
        const lastTs = new Date(series.points[series.points.length - 1].timestamp).getTime();
        const now = Date.now();

        // Preserve current viewport (prevents left/right snapping on data append)
        const currentMin = chart.scales?.x?.min as number | undefined;
        const currentMax = chart.scales?.x?.max as number | undefined;

        // Update data
        chart.data.datasets[0].data = series.points.map(p => ({ x: new Date(p.timestamp).getTime(), y: p.size }));
        chart.data.datasets[1].data = series.points.map(p => ({ x: new Date(p.timestamp).getTime(), y: p.delta }));

        // Clamp future only via plugin limits (do not force x.max on the scale)
        if (chart.options?.plugins?.zoom) {
          chart.options.plugins.zoom.limits = chart.options.plugins.zoom.limits || {} as any;
          chart.options.plugins.zoom.limits.x = { ...(chart.options.plugins.zoom.limits.x || {}), max: now } as any;
          if (chart.options.plugins.zoom.pan) {
            chart.options.plugins.zoom.pan.limits = chart.options.plugins.zoom.pan.limits || {} as any;
            chart.options.plugins.zoom.pan.limits.x = { ...(chart.options.plugins.zoom.pan.limits.x || {}), max: now } as any;
          }
        }
        // Do not mutate scales.x.min/max except to restore the user viewport
        if (chart.options?.scales?.x) {
          // suggestedMax is fine to hint the adapter, but avoid hard clamping
          (chart.options.scales.x as any).suggestedMax = now as any;
          if (Number.isFinite(currentMin)) (chart.options.scales.x as any).min = currentMin as any;
          if (Number.isFinite(currentMax)) (chart.options.scales.x as any).max = currentMax as any;
        }

        // Keep user's current view; new data becomes available without jumping
        chart.update();
        prevRangeRef.current = { min: firstTs, max: Math.min(lastTs, now) };
      } catch (e) {
        console.warn('Chart update failed:', e);
      }
    }
  }, [series]);

  const handleResetZoom = () => {
    const chart = getChartInstance();
    if (chart && typeof chart.resetZoom === 'function') {
      chart.resetZoom();
    }
  };

  return (
    <div className="flex flex-col h-full space-y-2">
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500">
          {isAtStart && <span>• Earliest history reached</span>}
        </div>
        <button
          onClick={handleResetZoom}
          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border transition-colors"
        >
          Reset Zoom
        </button>
      </div>
      <div className="flex-grow">
        <Line
          ref={chartRef}
          options={options}
          data={data}
        />
      </div>
    </div>
  );
};
