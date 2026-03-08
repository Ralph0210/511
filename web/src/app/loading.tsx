export default function Loading() {
  return (
    <div className="mx-auto max-w-page px-6 py-12">
      <div className="mb-12">
        <div className="h-12 w-80 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-4 h-6 w-96 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800"
            />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
