import Skeleton from '../common/Skeleton';

const ACCENTS = {
  slate: 'bg-slate-100 text-slate-600',
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  red: 'bg-red-50 text-red-600',
};

export default function MetricCard({ label, value, hint, accent = 'slate', loading, dimmed }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`h-2.5 w-2.5 rounded-full ${ACCENTS[accent]}`} aria-hidden="true" />
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-9 w-20" />
      ) : (
        <p className={`mt-2 text-3xl font-semibold text-slate-900 transition-opacity ${dimmed ? 'opacity-50' : ''}`}>
          {value ?? '—'}
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
