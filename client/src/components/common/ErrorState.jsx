import { getErrorMessage } from '../../utils/errors';

export default function ErrorState({ error, onRetry, title = 'Could not load data' }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-14 text-center" role="alert">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl font-bold text-red-500">
        !
      </div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">{getErrorMessage(error)}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Retry
        </button>
      )}
    </div>
  );
}
