import ChartSpotifyStreams, { StreamsDataPoint } from "@/components/ChartSpotifyStreams";
import ChartGenreBubble, { BubbleDataPoint } from "@/components/ChartGenreBubble";
import { createSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// ---------- Genre classification ----------
// The dataset has fine-grained genre strings like "dance pop, edm, electropop, pop".
// We bucket them into broad categories for the bubble chart.
const GENRE_RULES: [RegExp, string][] = [
  [/\bhip\s?hop\b|\brap\b|\btrap\b/i,      "Hip Hop/Rap"],
  [/\blatin\b|\breggaeton\b|\btropical\b/i, "Latin"],
  [/\br&b\b|\bsoul\b|\brhythm\b/i,          "R&B"],
  [/\brock\b|\bmetal\b|\bpunk\b|\bindie\b/i, "Rock"],
  [/\bedm\b|\bhouse\b|\bdance\b|\btechno\b|\btrance\b|\bdubstep\b/i, "EDM/Dance"],
  [/\bcountry\b/i,                           "Country"],
  [/\bpop\b/i,                               "Pop"],
];

function classifyGenre(raw: string | null): string {
  if (!raw) return "Other";
  for (const [re, label] of GENRE_RULES) {
    if (re.test(raw)) return label;
  }
  return "Other";
}

// ---------- Data fetching (paginated, same pattern as billboard page.tsx) ----------

type SpotifyRow = {
  week: string;
  rank: number;
  streams: number | null;
  artist_genres: string | null;
  duration: number | null;
};

async function fetchSpotifyRows(): Promise<SpotifyRow[]> {
  const supabase = createSupabaseClient();
  const PAGE_SIZE = 1000;
  const MAX_ROWS = 100_000;

  let rows: SpotifyRow[] = [];
  let offset = 0;

  while (rows.length < MAX_ROWS) {
    const { data: page, error } = await supabase
      .from("spotify_top200")
      .select("week, rank, streams, artist_genres, duration")
      .order("week", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    if (!page?.length) break;

    rows = rows.concat(page as SpotifyRow[]);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

// ---------- Aggregation: streams line chart ----------

function aggregateStreams(rows: SpotifyRow[]): StreamsDataPoint[] {
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

// ---------- Aggregation: genre bubble chart ----------

function aggregateBubbles(rows: SpotifyRow[]): BubbleDataPoint[] {
  type Acc = { ranks: number[]; streams: number[]; durations: number[] };
  const buckets: Record<string, Acc> = {};

  for (const row of rows) {
    if (row.streams == null || row.duration == null) continue;
    const year = parseInt(row.week.slice(0, 4), 10);
    const genre = classifyGenre(row.artist_genres);
    const key = `${genre}|${year}`;
    if (!buckets[key]) buckets[key] = { ranks: [], streams: [], durations: [] };
    buckets[key].ranks.push(row.rank);
    buckets[key].streams.push(row.streams);
    buckets[key].durations.push(row.duration);
  }

  return Object.entries(buckets)
    .map(([key, acc]) => {
      const [genre, yearStr] = key.split("|");
      const n = acc.ranks.length;
      return {
        genre,
        year: parseInt(yearStr, 10),
        avgRank: acc.ranks.reduce((a, b) => a + b, 0) / n,
        avgStreams: acc.streams.reduce((a, b) => a + b, 0) / n,
        avgDuration: acc.durations.reduce((a, b) => a + b, 0) / n,
        count: n,
      };
    })
    .filter((d) => d.count >= 10); // drop noise
}

// ---------- Page ----------

export default async function SpotifyPage() {
  let streamsData: StreamsDataPoint[] = [];
  let bubbleData: BubbleDataPoint[] = [];
  let totalEntries = 0;
  let error: string | null = null;

  try {
    const rows = await fetchSpotifyRows();
    totalEntries = rows.length;
    streamsData = aggregateStreams(rows);
    bubbleData = aggregateBubbles(rows);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load Spotify data";
  }

  if (error || totalEntries === 0) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="mb-6 text-2xl font-bold">Spotify Top 200 Explorer</h1>
        <div className="rounded-lg border border-amber-800 bg-amber-950 p-6 text-amber-200">
          <p className="font-medium">Could not load Spotify data</p>
          <p className="mt-2 text-sm">{error ?? "No data returned — the spotify_top200 table may be empty."}</p>
          <p className="mt-4 text-sm">
            Run the migration in{" "}
            <code className="rounded bg-amber-900 px-1">supabase/migrations/003_create_spotify_top200.sql</code>{" "}
            then seed with{" "}
            <code className="rounded bg-amber-900 px-1">python scripts/seed_spotify.py</code>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Spotify Top 200 Explorer</h1>
      <p className="mb-14 text-zinc-400">
        Weekly global Spotify chart data, 2017–2021 · {totalEntries.toLocaleString()} chart entries
      </p>

      {/* Chart 1: Streams over time */}
      <section className="mb-16">
        <h2 className="mb-1 text-xl font-semibold">
          Do the Top 10 songs pull further ahead of the rest of the chart over time?
        </h2>
        <p className="mb-4 max-w-2xl text-sm text-zinc-400">
          <strong>Axes:</strong> X = year. Y = average weekly streams per chart entry.
          Orange = rank 1–10, Indigo = rank 11–200.
        </p>
        <p className="mb-6 max-w-2xl text-sm text-zinc-400">
          <strong>The story:</strong> As streaming grew, did the top-tier songs capture a
          widening share of plays, or did streams rise proportionally across the board?
          A widening gap between the two lines signals increasing winner-takes-all concentration.
        </p>
        <ChartSpotifyStreams data={streamsData} />
      </section>

      {/* Chart 2: Genre bubble chart */}
      <section>
        <h2 className="mb-1 text-xl font-semibold">
          How do different genres perform on Spotify, and does song duration matter?
        </h2>
        <p className="mb-4 max-w-2xl text-sm text-zinc-400">
          <strong>Axes:</strong> X = average chart rank (lower = better). Y = average streams.
          Color = genre. Bubble size = average song duration. Use the year selector to compare across time.
        </p>
        <p className="mb-6 max-w-2xl text-sm text-zinc-400">
          <strong>The story:</strong> Genres that cluster in the top-left (low rank, high streams) dominate the chart.
          If shorter-duration genres (smaller bubbles) trend higher, it may reflect playlist-era incentives
          for shorter songs that accumulate more per-stream royalties.
        </p>
        <ChartGenreBubble data={bubbleData} />
      </section>
    </main>
  );
}
