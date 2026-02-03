import React, { useRef } from 'react';
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
}

export const RevisionChart: React.FC<RevisionChartProps> = ({ series }) => {
  const chartRef = useRef<any>(null);

  const data = {
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
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
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
            const x = items?.[0]?.parsed?.x;
            return x ? new Date(x).toLocaleString() : 'Revision';
          },
        }
      },
      zoom: {
        pan: {
          enabled: true,
          modifierKey: 'shift',
          mode: 'x',
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
        },
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
        },
        ticks: {
          maxTicksLimit: 8,
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
  };

  const handleResetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  return (
    <div className="flex flex-col h-full space-y-2">
      <div className="flex justify-end">
        <button
          onClick={handleResetZoom}
          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border transition-colors"
        >
          Reset Zoom
        </button>
      </div>
      <div className="flex-grow">
        <Line ref={chartRef} options={options} data={data} />
      </div>
    </div>
  );
};
