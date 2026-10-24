import Skeleton from '../common/Skeleton';

// Placeholder rows shown on the very first load.
export default function TableSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-slate-100" aria-busy="true" aria-label="Loading tickets">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-4 w-20 sm:block" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
