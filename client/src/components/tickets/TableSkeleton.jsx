import Skeleton from '../common/Skeleton';

// Placeholder rows shown on the very first load.
export default function TableSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-line" aria-busy="true" aria-label="Loading tickets">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-6 w-14" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-4 w-24 sm:block" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="hidden h-8 w-8 rounded-full md:block" />
        </div>
      ))}
    </div>
  );
}
