export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Billboard Charts Explorer</h1>
      <p className="mb-14 text-zinc-400">
        Analytical visualizations answering key questions about Hot 100 chart dynamics
      </p>
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-zinc-800 bg-[#181818]">
        <p className="text-zinc-400">Loading chart data…</p>
      </div>
    </main>
  );
}
