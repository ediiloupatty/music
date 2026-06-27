// Presentational loading skeletons. Intentionally free of data fetching / auth
// so a route's loading.tsx paints instantly while the slow backend resolves.

function Block({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md ${className}`}
      style={{ background: "var(--bg-card)" }}
    />
  );
}

// Static stand-in for the real (async) Sidebar so the skeleton keeps the same
// two-column shape without waiting on auth/playlist fetches.
function SidebarSkeleton() {
  return (
    <aside
      className="hidden md:flex flex-col w-[220px] py-7 flex-shrink-0 h-full gap-3 px-4"
      style={{ borderRight: "1px solid var(--border-subtle)" }}
    >
      <Block className="h-10 w-10 rounded-full mb-4" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Block key={i} className="h-9 w-full rounded-xl" />
      ))}
      <Block className="h-px w-full my-3" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Block key={i} className="h-7 w-full rounded-lg" />
      ))}
    </aside>
  );
}

function TrackRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-3 py-2.5">
      <Block className="w-4 h-4" />
      <Block className="w-11 h-11 rounded-md" />
      <div className="flex-1 flex flex-col gap-2">
        <Block className="h-3.5 w-1/3" />
        <Block className="h-3 w-1/4" />
      </div>
      <Block className="h-3 w-10" />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Block className="w-full aspect-square rounded-xl" />
      <Block className="h-3.5 w-3/4" />
      <Block className="h-3 w-1/2" />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden gap-2" style={{ background: "var(--bg-primary)" }}>
      <SidebarSkeleton />
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  );
}

// Generic "browse" loading: a back button, a title, then a grid or a track list.
export function BrowseSkeleton({
  title = true,
  variant = "grid",
}: {
  title?: boolean;
  variant?: "grid" | "table";
}) {
  return (
    <Shell>
      <div className="px-5 md:px-8 pt-6 pb-2">
        <Block className="h-10 w-10 rounded-full" />
      </div>
      <div className="flex-1 px-5 md:px-8 pt-2 overflow-hidden">
        {title && <Block className="h-7 w-40 mb-6" />}
        {variant === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {Array.from({ length: 12 }).map((_, i) => (
              <TrackRowSkeleton key={i} />
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}

// Home feed loading: hero (info + cover + quick column) then a track list.
export function HomeSkeleton() {
  return (
    <Shell>
      <div className="flex-1 px-5 md:px-8 pt-10 overflow-hidden">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-8 items-center mb-12">
          <div className="flex flex-col gap-3">
            <Block className="h-3 w-24" />
            <Block className="h-10 w-2/3" />
            <Block className="h-5 w-1/3" />
            <Block className="h-11 w-32 rounded-full mt-4" />
          </div>
          <Block className="w-[240px] sm:w-[280px] lg:w-[320px] aspect-square rounded-2xl mx-auto" />
          <div className="hidden xl:flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Block key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <Block className="h-6 w-32 mb-4" />
        <div className="flex flex-col">
          {Array.from({ length: 6 }).map((_, i) => (
            <TrackRowSkeleton key={i} />
          ))}
        </div>
      </div>
    </Shell>
  );
}

// Artist page loading: round avatar + name block, popular list, album grid.
export function ArtistSkeleton() {
  return (
    <Shell>
      <div className="flex-1 px-5 md:px-14 pt-20 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-x-10 gap-y-8">
          <Block className="w-[210px] h-[210px] rounded-full mx-auto lg:mx-0" />
          <div className="flex flex-col gap-3 justify-center">
            <Block className="h-3 w-20" />
            <Block className="h-12 w-1/2" />
            <Block className="h-4 w-40" />
            <Block className="h-11 w-32 rounded-full mt-2" />
          </div>
          <div className="lg:mt-6 flex flex-col">
            {Array.from({ length: 5 }).map((_, i) => (
              <TrackRowSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 lg:mt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
