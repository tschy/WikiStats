import React, { useState } from 'react';

interface SearchFormProps {
  onSearch: (title: string, limit: number, from?: string, to?: string) => void;
  disabled?: boolean;
}

export const SearchForm: React.FC<SearchFormProps> = ({ onSearch, disabled }) => {
  const [title, setTitle] = useState('Earth');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [limit, setLimit] = useState(300);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(title, limit, from || undefined, to || undefined);
  };

  const setLastDays = (days: number) => {
    if (days === 0) {
      setFrom('');
      setTo('');
      return;
    }
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - days);
    
    const toIso = (d: Date) => d.toISOString().split('T')[0];
    setFrom(toIso(start));
    setTo(toIso(today));
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
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={disabled}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
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

        <button
          type="submit"
          disabled={disabled}
          className="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
        >
          {disabled ? 'Loading...' : 'Load'}
        </button>
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
