// Grey placeholder block shown while data loads.
export default function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} aria-hidden="true" />;
}
