// Placeholder block shown while data loads.
export default function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-surface-2 ${className}`} aria-hidden="true" />;
}
