import React, { useEffect } from 'react';
import { SearchForm } from './components/SearchForm';
import { RevisionChart } from './components/RevisionChart';
import { ArticlePreview } from './components/ArticlePreview';
import { StatusBar } from './components/StatusBar';
import { useWikipediaData } from './hooks/useWikipediaData';

const App: React.FC = () => {
  const { loading, error, series, preview, fetchData } = useWikipediaData();

  useEffect(() => {
    // initial load mirrors the current index.html behavior
    fetchData('Earth', 300);
  }, [fetchData]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">WikiStats</h1>

      <SearchForm
        disabled={loading}
        onSearch={(title, limit, from, to) => fetchData(title, limit, from, to)}
      />

      <div className="min-h-[24px]">
        <StatusBar
          loading={loading}
          error={error}
          seriesLength={series?.points?.length}
          title={series?.title}
        />
      </div>

      <ArticlePreview preview={preview} />

      <div className="h-[380px]">
        {series ? (
          <RevisionChart series={series} />
        ) : (
          <div className="text-sm text-gray-600">No data yet. Use the form to load revisions.</div>
        )}
      </div>
    </div>
  );
};

export default App;
