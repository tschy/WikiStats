import React, { useEffect, useState } from 'react';

interface SearchFormProps {
  // Search only fetches preview for the given title
  onSearch: (title: string) => void;
  // Load fetches the revision series (and can also refresh preview)
  onLoad: (title: string, limit: number, from?: string, to?: string) => void;
  disabled?: boolean;
}

export const SearchForm: React.FC<SearchFormProps> = ({ onSearch, onLoad, disabled }) => {
  const [title, setTitle] = useState('Earth');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [limit, setLimit] = useState(300);

  const toIso = (d: Date) => d.toISOString().split('T')[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLoad(title, limit, from || undefined, to || undefined);
  };

  const handleDateChange = (type: 'from' | 'to', value: string) => {
    if (type === 'from') {
      setFrom(value);
      if (value && to) onLoad(title, limit, value, to);
    } else {
      setTo(value);
      if (from && value) onLoad(title, limit, from, value);
    }
  };

  const handleSearchClick = () => {
    onSearch(title);
  };

  const setLastDays = (days: number) => {
    if (days === 0) {
      setFrom('');
      setTo('');
      // immediate load for all-time with current title/limit
      onLoad(title, limit, undefined, undefined);
      return;
    }
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - days);

    const f = toIso(start);
    const t = toIso(today);
    setFrom(f);
    setTo(t);
    // also trigger load immediately
    onLoad(title, limit, f, t);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Wikipedia page title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={disabled}
          />
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => handleDateChange('from', e.target.value)}
            className="px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={disabled}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => handleDateChange('to', e.target.value)}
            className="px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={disabled}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Limit</label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            min="1"
            max="5000"
            className="px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 w-24"
            disabled={disabled}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSearchClick}
            disabled={disabled}
            className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md shadow hover:bg-gray-300 disabled:bg-gray-200 transition-colors"
          >
            Search
          </button>
          <button
            type="submit"
            disabled={disabled}
            className="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
          >
            {disabled ? 'Loading...' : 'Load'}
          </button>
        </div>
      </form>

      <div className="flex gap-2 flex-wrap text-sm">
        {[7, 30, 365, 0].map((days) => (
          <button
            key={days}
            onClick={() => setLastDays(days)}
            className="px-3 py-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            disabled={disabled}
          >
            {days === 0 ? 'All time' : `Last ${days}d`}
          </button>
        ))}
      </div>
    </div>
  );
};
