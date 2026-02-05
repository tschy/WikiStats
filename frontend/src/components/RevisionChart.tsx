import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  backgroundLoading?: boolean;
  startReason?: 'wikipedia' | 'page' | null;
  earliestLoaded?: string | null;
  olderCursor?: string | null;
  onFetchOlder?: () => void;
  lockViewport?: boolean;
  freezeData?: boolean;
  onUserInteract?: () => void;
  clampToDataMin?: boolean;
  fixedMin?: number;
  fixedMax?: number;
}

export const RevisionChart: React.FC<RevisionChartProps> = ({ 
  series, 
  onViewRangeChange,
  isAtStart,
  backgroundLoading,
  startReason,
  earliestLoaded,
  olderCursor,
  onFetchOlder,
  lockViewport,
  freezeData,
  onUserInteract,
  clampToDataMin,
  fixedMin,
  fixedMax
}) => {
  const chartRef = useRef<any>(null);
  const chartWrapRef = useRef<HTMLDivElement | null>(null);
  const getChartInstance = () => (chartRef.current?.chart ?? chartRef.current) as any | null;
  const [renderSeries, setRenderSeries] = useState<RevisionSeries>(series);

  useEffect(() => {
    // Freeze rendered data while background loading/prefetch to avoid flicker.
    if (!freezeData) {
      setRenderSeries(series);
    }
  }, [series, freezeData]);

  const wikipediaStart = new Date('2001-01-15').getTime();
  const dataMin = renderSeries.points.length > 0
    ? Math.min(...renderSeries.points.map(p => new Date(p.timestamp).getTime()))
    : wikipediaStart;

  // for limits, clamp the min to wikipedia start, but only if there’s data
  const xMinLimit = clampToDataMin ? dataMin : (olderCursor ? wikipediaStart : dataMin);


  const data = useMemo(() => ({
    datasets: [
      {
        label: 'Size (bytes)',
        data: renderSeries.points.map(p => ({ x: new Date(p.timestamp).getTime(), y: p.size })),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.15,
        yAxisID: 'ySize',
      },
      {
        label: 'Delta (bytes)',
        data: renderSeries.points.map(p => ({ x: new Date(p.timestamp).getTime(), y: p.delta })),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderWidth: 1,
        pointRadius: 0,
        tension: 0.15,
        yAxisID: 'yDelta',
      },
    ],
  }), [renderSeries]);

  const debouncedCallRef = useRef<number | null>(null);

  const emitIfZoomOut = (chart: any) => {
    if (!chart) return;
    const x = chart.scales?.x;
    if (!x) return;
    const min = x.min as number;
    const max = x.max as number;
    if (!Number.isFinite(min) || !Number.isFinite(max)) return;
    console.log(`[CHART] view min=${new Date(min).toISOString()} max=${new Date(max).toISOString()} lock=${lockViewport ? '1' : '0'}`);
    if (!onViewRangeChange) return;

    // debounce a bit to avoid bursts when dragging
    if (debouncedCallRef.current) window.clearTimeout(debouncedCallRef.current);
    debouncedCallRef.current = window.setTimeout(() => {
      if (onUserInteract) onUserInteract();
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
            x: { min: xMinLimit, max: Date.now() }
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
           x: { min: xMinLimit, max: Date.now() },
          },
          onPanComplete: ({ chart }) => emitIfZoomOut(chart),
        },
      },
    },
    scales: {
      x: {
        type: 'time',
        min: fixedMin as any,
        max: fixedMax as any,
        suggestedMax: Date.now(),
        suggestedMin: olderCursor ? undefined : dataMin,
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
  }), [dataMin, xMinLimit, fixedMin, fixedMax, olderCursor]);

  const handleResetZoom = () => {
    const chart = getChartInstance();
    if (chart && typeof chart.resetZoom === 'function') {
      chart.resetZoom();
    }
  };

  useEffect(() => {
    const el = chartWrapRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      // Always prevent page scroll when wheel is used over the chart area.
      e.preventDefault();
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => {
      el.removeEventListener('wheel', handler);
    };
  }, [lockViewport]);

  return (
    <div className="flex flex-col h-full space-y-2">
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500">
          {isAtStart && (
            <span>
              • {startReason === 'wikipedia' ? 'Reached Wikipedia start (2001-01-15)' : 'Reached page start'}
            </span>
          )}
          {!isAtStart && backgroundLoading && (
            <span className="inline-flex items-center gap-1.5 text-blue-600">
              <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
              Fetching older history...
            </span>
          )}
          {earliestLoaded && (
            <span>• Earliest loaded: {earliestLoaded}</span>
          )}
          {earliestLoaded && (
            <span>
              • Older revisions:{' '}
              {olderCursor
                ? 'available'
                : (Date.parse(earliestLoaded) > new Date('2001-01-20').getTime() ? 'unknown' : 'none')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onFetchOlder}
            disabled={!olderCursor || backgroundLoading}
            className="text-xs px-2 py-1 bg-white hover:bg-gray-50 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Fetch Older
          </button>
          <button
          onClick={() => {
            if (onUserInteract) onUserInteract();
            handleResetZoom();
          }}
          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border transition-colors"
        >
          Reset Zoom
        </button>
        </div>
      </div>
      <div
        ref={chartWrapRef}
        className="flex-grow"
        onWheelCapture={(e) => {
          e.preventDefault();
        }}
      >
        <Line
          ref={chartRef}
          options={options}
          data={data}
        />
      </div>
    </div>
  );
};
