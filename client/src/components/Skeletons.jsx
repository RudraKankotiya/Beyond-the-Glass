// Grey placeholder shapes shown while content loads, so the layout doesn't jump when it arrives

export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-sm bg-raised ${className}`} />;
}

// Wraps skeletons so screen readers hear "Loading" once instead of nothing
export function LoadingRegion({ label = 'Loading', className = '', children }) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function ArtifactCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="mt-3 h-5 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/2" />
    </div>
  );
}

export function ArtifactGridSkeleton({ count = 8 }) {
  return (
    <LoadingRegion label="Loading artifacts" className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <ArtifactCardSkeleton key={i} />
      ))}
    </LoadingRegion>
  );
}


