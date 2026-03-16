export default function Loading() {
  return (
    <div className="mx-auto max-w-page px-6 py-12">
      {/* Hero skeleton */}
      <div className="mb-10">
        <div className="h-12 w-72 animate-pulse rounded-lg bg-zinc-800" />
        <div className="mt-2 h-12 w-64 animate-pulse rounded-lg bg-zinc-800" />
        <div className="mt-4 h-5 w-96 animate-pulse rounded bg-zinc-800" />
        <div className="mt-6 h-10 w-80 animate-pulse rounded-xl bg-zinc-800" />
      </div>

      {/* Lens selector skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-9 w-24 animate-pulse rounded-full bg-zinc-800"
          />
        ))}
      </div>

      {/* Chart container skeleton */}
      <div className="mt-3 h-[450px] animate-pulse rounded-2xl bg-zinc-800" />

      {/* Insight panel skeleton */}
      <div className="mt-4 h-14 animate-pulse rounded-xl bg-zinc-800" />
    </div>
  );
}
