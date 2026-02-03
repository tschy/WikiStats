import React from 'react';
import { ArticlePreviewData } from '../lib/types';

interface ArticlePreviewProps {
  preview: ArticlePreviewData | null;
}

export const ArticlePreview: React.FC<ArticlePreviewProps> = ({ preview }) => {
  if (!preview || (!preview.extract && !preview.thumbnailUrl && !preview.pageUrl)) {
    return null;
  }

  return (
    <div className="mt-4 p-4 border rounded-lg bg-white shadow-sm">
      <div className="flex gap-4">
        {preview.thumbnailUrl ? (
          <img
            src={preview.thumbnailUrl}
            alt="thumbnail"
            className="w-28 h-28 object-cover rounded-md"
          />
        ) : null}

        <div className="flex-1">
          <h2 className="text-xl font-semibold mb-1">
            {preview.pageUrl ? (
              <a
                href={preview.pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:underline"
              >
                {preview.title || 'Open on Wikipedia'}
              </a>
            ) : (
              preview.title || ''
            )}
          </h2>
          {preview.description ? (
            <div className="text-sm text-gray-600 mb-2">{preview.description}</div>
          ) : null}
          {preview.extract ? (
            <div className="text-sm text-gray-800">
              {preview.extract.length > 340
                ? `${preview.extract.slice(0, 340)}…`
                : preview.extract}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
