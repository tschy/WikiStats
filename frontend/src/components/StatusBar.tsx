import React from 'react';

interface StatusBarProps {
  loading: boolean;
  error: string | null;
  cooldownSeconds?: number | null;
  seriesLength?: number;
  title?: string;
  backgroundLoading?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ 
  loading, 
  error, 
  cooldownSeconds,
  seriesLength, 
  title,
  backgroundLoading 
}) => {
  if (error) {
    return (
      <div className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
        <div className="flex items-center gap-2 whitespace-pre-wrap">
          <span className="font-bold">Error:</span> {error}
        </div>
        {cooldownSeconds != null && cooldownSeconds > 0 && (
          <div className="flex items-center gap-2 font-mono font-bold bg-red-100 px-2 py-0.5 rounded animate-pulse">
            {cooldownSeconds}s
          </div>
        )}
      </div>
    );
  }

  if (loading && !backgroundLoading) {
    return (
      <div className="flex items-center gap-2 text-blue-700 animate-pulse">
        <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
        <span>Fetching data...</span>
      </div>
    );
  }

  if (seriesLength != null && title) {
    return (
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">"{title}"</span>
          <span>• {seriesLength.toLocaleString()} revisions loaded</span>
          {backgroundLoading && (
            <div className="flex items-center gap-1.5 ml-2 text-blue-600">
              <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">Fetching more...</span>
            </div>
          )}
        </div>
        <span className="hidden sm:inline italic">Scroll/drag to explore history</span>
      </div>
    );
  }

  return <div className="text-sm text-gray-400 italic">Enter a Wikipedia title to begin</div>;
};
