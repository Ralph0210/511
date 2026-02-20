import ChartSpotifyStreams, { StreamsDataPoint } from "@/components/ChartSpotifyStreams";
import { createSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Fetch all rows from spotify_top200 with pagination,
// mirroring the billboard data pattern (PAGE_SIZE chunks, MAX_ROWS cap).
async function getSpotifyData(): Promise<StreamsDataPoint[]> {
  const supabase = createSupabaseClient();
  const PAGE_SIZE = 1000;
  const MAX_ROWS = 100_000;

  type Row = { week: string; rank: number; streams: number | null };
  let rows: Row[] = [];
  let offset = 0;

  while (rows.length < MAX_ROWS) {
    const { data: page, error } = await supabase
      .from("spotify_top200")
      .select("week, rank, streams")
      .order("week", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    if (!page?.length) break;

    rows = rows.concat(page as Row[]);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  if (!rows.length) return [];

  // Aggregate: for each year, separate Top 10 (rank 1–10) from rest (rank 11–200)
  // Only include entries that have a valid streams value.
  const byYear: Record<number, { top10: number[]; rest: number[] }> = {};

  for (const row of rows) {
    if (row.streams == null) continue;
    const year = parseInt(row.week.slice(0, 4), 10);
    if (!byYear[year]) byYear[year] = { top10: [], rest: [] };
    if (row.rank <= 10) {
      byYear[year].top10.push(row.streams);
    } else {
      byYear[year].rest.push(row.streams);
    }
  }

  return Object.entries(byYear)
    .map(([y, { top10, rest }]) => ({
      year: parseInt(y, 10),
      avgStreamsTop10: top10.length ? top10.reduce((a, b) => a + b, 0) / top10.length : 0,
      avgStreamsRest: rest.length ? rest.reduce((a, b) => a + b, 0) / rest.length : 0,
      countTop10: top10.length,
      countRest: rest.length,
    }))
    .sort((a, b) => a.year - b.year);
}

export default async function SpotifyPage() {
  let data: StreamsDataPoint[] = [];
  let error: string | null = null;

  try {
    data = await getSpotifyData();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load Spotify data";
  }

  if (error || !data.length) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <nav className="mb-8 text-sm text-zinc-500">
          <a href="/" className="hover:underline">Billboard Explorer</a>
          <span className="mx-2">/</span>
          <span>Spotify Top 200</span>
        </nav>
        <h1 className="mb-6 text-2xl font-bold">Spotify Top 200 Explorer</h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-medium">Could not load Spotify data</p>
          <p className="mt-2 text-sm">{error ?? "No data returned — the spotify_top200 table may be empty."}</p>
          <p className="mt-4 text-sm">
            Run the migration in{" "}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">supabase/migrations/003_create_spotify_top200.sql</code>{" "}
            then seed with{" "}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">python scripts/seed_spotify.py</code>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <nav className="mb-8 text-sm text-zinc-500">
        <a href="/" className="hover:underline">Billboard Explorer</a>
        <span className="mx-2">/</span>
        <span>Spotify Top 200</span>
      </nav>

      <h1 className="mb-2 text-3xl font-bold tracking-tight">Spotify Top 200 Explorer</h1>
      <p className="mb-14 text-zinc-600 dark:text-zinc-400">
        Weekly global Spotify chart data, 2017–2021 · {data.reduce((s, d) => s + d.countTop10 + d.countRest, 0).toLocaleString()} chart entries
      </p>

      <section>
        <h2 className="mb-1 text-xl font-semibold">
          Do the Top 10 songs pull further ahead of the rest of the chart over time?
        </h2>
        <p className="mb-4 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          <strong>Axes:</strong> X = year. Y = average weekly streams per chart entry.
          Orange = rank 1–10, Indigo = rank 11–200.
        </p>
        <p className="mb-6 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          <strong>The story:</strong> As streaming grew, did the top-tier songs capture a
          widening share of plays, or did streams rise proportionally across the board?
          A widening gap between the two lines signals increasing winner-takes-all concentration.
        </p>
        <ChartSpotifyStreams data={data} />
      </section>
    </main>
  );
}
