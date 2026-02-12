import { shouldShowPreview } from '../lib/wikistats';
import type { PreviewData } from '../types/wikistats';

type PreviewCardProps = {
  preview: PreviewData | null;
};

export function PreviewCard({ preview }: PreviewCardProps) {
  if (!preview || !shouldShowPreview(preview)) {
    return null;
  }

  return (
    <div id="preview">
      <div id="previewInner">
        {preview.thumbnailUrl ? <img id="previewImg" src={preview.thumbnailUrl} alt="" /> : <div />}
        <div>
          <h2 id="previewTitle">
            {preview.pageUrl ? (
              <a href={preview.pageUrl} target="_blank" rel="noopener noreferrer">
                {preview.title ?? 'Open on Wikipedia'}
              </a>
            ) : (
              preview.title ?? ''
            )}
          </h2>
          <div id="previewMeta">{preview.description ?? ''}</div>
          <div id="previewExtract">
            {`${(preview.extract ?? '').slice(0, 340)}${(preview.extract ?? '').length > 340 ? '…' : ''}`}
          </div>
        </div>
      </div>
    </div>
  );
}
