export default function SongLoading() {
  return (
    <div className="min-h-screen">
      {/* Hero skeleton */}
      <div className="relative overflow-hidden bg-zinc-900 text-white">
        <div className="mx-auto max-w-page px-6 py-20">
          <div className="mb-8 h-4 w-28 rounded bg-zinc-800" />
          <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-end">
            <div className="h-48 w-48 animate-pulse rounded-2xl bg-zinc-800" />
            <div className="flex-1 space-y-3">
              <div className="h-3 w-20 rounded bg-zinc-800" />
              <div className="h-10 w-64 animate-pulse rounded bg-zinc-800" />
              <div className="h-6 w-40 rounded bg-zinc-800" />
              <div className="h-4 w-80 rounded bg-zinc-800/60" />
              <div className="flex gap-3 pt-1">
                <div className="h-6 w-16 rounded-full bg-zinc-800" />
                <div className="h-6 w-20 rounded-full bg-zinc-800" />
                <div className="h-6 w-20 rounded-full bg-zinc-800" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Story skeleton */}
      <div className="mx-auto max-w-6xl px-6 py-16 space-y-32">
        {[0, 1, 2].map((i) => (
          <section key={i} className="space-y-6">
            <div className="space-y-2">
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((j) => (
                  <div key={j} className={`h-1.5 rounded-full bg-zinc-800 ${j === i ? "w-6" : "w-1.5"}`} />
                ))}
              </div>
              <div className="h-3 w-24 rounded bg-zinc-800" />
              <div className="h-7 w-48 rounded bg-zinc-800" />
            </div>
            <div className="h-[400px] animate-pulse rounded-2xl border border-zinc-800 bg-surface" />
          </section>
        ))}
      </div>
    </div>
  );
}
