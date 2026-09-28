export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-chip ${className}`} />;
}

export function PostCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden shadow-float">
      <div className="flex items-center gap-2 px-4 py-3">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="w-full aspect-square rounded-none" />
      <div className="px-4 py-3 space-y-2">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-paper">
      <div className="md:mr-64 max-w-5xl mx-auto px-4 py-4 space-y-4">
        <div className="flex gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="w-16 h-16 rounded-full shrink-0" />
          ))}
        </div>
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
