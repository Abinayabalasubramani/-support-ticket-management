import { TriangleAlert } from 'lucide-react';
import { getErrorMessage, getErrorRef } from '../../utils/errors';

export default function ErrorState({ error, onRetry, title = 'Could not load data' }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-14 text-center" role="alert">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-500">
        <TriangleAlert className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted">{getErrorMessage(error)}</p>
      {getErrorRef(error) && <p className="mt-1 text-xs text-faint">Reference: {getErrorRef(error)}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-primary mt-4">
          Retry
        </button>
      )}
    </div>
  );
}
