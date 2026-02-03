import React from 'react';

interface StatusBarProps {
  loading: boolean;
  error: string | null;
  seriesLength?: number;
  title?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ loading, error, seriesLength, title }) => {
  if (loading) {
    return <div className="text-gray-700">Loading…</div>;
  }
  if (error) {
    return <div className="text-red-700 whitespace-pre-wrap">{error}</div>;
  }
  if (seriesLength != null && title) {
    return (
      <div className="text-gray-800">
        Loaded {seriesLength} revisions for "{title}". Hover the graph for details.
      </div>
    );
  }
  return null;
};
