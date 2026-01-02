import { Skeleton } from "@/components/ui/skeleton";

// Media card skeleton for grid views
export function MediaCardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-[2/3] w-full rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

// Grid of media card skeletons
export function MediaGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MediaCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Horizontal carousel skeleton
export function CarouselSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-48" />
      <div className="flex space-x-4 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-32 sm:w-40">
            <MediaCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

// Library button skeleton
export function LibraryButtonSkeleton() {
  return (
    <div className="relative h-32 rounded-lg overflow-hidden">
      <Skeleton className="absolute inset-0" />
      <div className="absolute bottom-4 left-4 right-4">
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

// Grid of library button skeletons
export function LibraryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <LibraryButtonSkeleton key={i} />
      ))}
    </div>
  );
}

// Series details skeleton
export function SeriesDetailsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row gap-6">
        <Skeleton className="w-full md:w-64 aspect-[2/3] rounded-lg" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-20 w-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-24" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Seasons section */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg border">
              <Skeleton className="w-16 h-24 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Episodes section */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-28" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg border">
              <Skeleton className="w-20 h-12 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Recommendations carousel skeleton
export function RecommendationsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="relative">
            <MediaCardSkeleton />
            <Skeleton className="absolute top-2 right-2 w-8 h-6 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Continue watching skeleton
export function ContinueWatchingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-40" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-lg border">
            <Skeleton className="w-20 h-28 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Header loading skeleton
export function HeaderSkeleton() {
  return (
    <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex items-center space-x-4">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
    </header>
  );
}

// Full page loading skeleton for home page
export function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <HeaderSkeleton />
      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Hero section skeleton */}
        <div className="relative rounded-xl overflow-hidden">
          <Skeleton className="h-64 w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-6 left-6 space-y-3">
            <Skeleton className="h-8 w-64 bg-white/20" />
            <Skeleton className="h-4 w-96 bg-white/20" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-24 bg-white/20" />
              <Skeleton className="h-10 w-32 bg-white/20" />
            </div>
          </div>
        </div>

        {/* Continue watching skeleton */}
        <ContinueWatchingSkeleton />

        {/* Libraries skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <LibraryGridSkeleton />
        </div>

        {/* Recommendations skeleton */}
        <RecommendationsSkeleton />
      </main>
    </div>
  );
}