import { createSupabaseClient } from "./supabase";

// ---------- Shared types ----------

export type SongTrajectory = {
  track_id: string;
  track_name: string;
  artist_name: string;
  album_img: string | null;
  week: string;
  rank: number;
  streams: number | null;
  track_popularity: number | null;
  release_date: string | null;
};

export type SongSummary = {
  track_id: string;
  track_name: string;
  artist_name: string;
  album_img: string | null;
  weeks_on_chart: number;
  peak_rank: number;
  max_streams: number | null;
  avg_streams: number | null;
  first_week: string;
  last_week: string;
  release_date: string | null;
  artist_genres: string | null;
};

export type WeeklyAttributes = {
  week: string;
  song_count: number;
  avg_duration: number | null;
  avg_danceability: number | null;
  avg_energy: number | null;
  avg_valence: number | null;
  avg_tempo: number | null;
  avg_acousticness: number | null;
  avg_speechiness: number | null;
  avg_loudness: number | null;
  avg_duration_top10: number | null;
  avg_duration_top50: number | null;
};

export type GenreRow = {
  week: string;
  rank: number;
  streams: number | null;
  artist_genres: string | null;
  duration: number | null;
  track_id: string;
  track_name: string;
  artist_name: string;
};

// ---------- Genre classification (shared) ----------

const GENRE_RULES: [RegExp, string][] = [
  [/\bhip\s?hop\b|\brap\b|\btrap\b/i, "Hip Hop/Rap"],
  [/\blatin\b|\breggaeton\b|\btropical\b/i, "Latin"],
  [/\br&b\b|\bsoul\b|\brhythm\b/i, "R&B"],
  [/\brock\b|\bmetal\b|\bpunk\b|\bindie\b/i, "Rock"],
  [/\bedm\b|\bhouse\b|\bdance\b|\btechno\b|\btrance\b|\bdubstep\b/i, "EDM/Dance"],
  [/\bcountry\b/i, "Country"],
  [/\bk-?pop\b/i, "K-Pop"],
  [/\bpop\b/i, "Pop"],
];

export function classifyGenre(raw: string | null): string {
  if (!raw) return "Other";
  for (const [re, label] of GENRE_RULES) {
    if (re.test(raw)) return label;
  }
  return "Other";
}

export const GENRE_COLORS: Record<string, string> = {
  "Pop": "#8B5CF6",
  "Hip Hop/Rap": "#EF4444",
  "Latin": "#F59E0B",
  "R&B": "#10B981",
  "EDM/Dance": "#3B82F6",
  "Rock": "#6366F1",
  "Country": "#D97706",
  "K-Pop": "#EC4899",
  "Other": "#9CA3AF",
};

// ---------- Paginated fetch helper ----------

async function paginatedFetch<T>(
  table: string,
  select: string,
  orderBy: string,
  maxRows = 100_000
): Promise<T[]> {
  const supabase = createSupabaseClient();
  const PAGE_SIZE = 1000;
  let rows: T[] = [];
  let offset = 0;

  while (rows.length < maxRows) {
    const { data: page, error } = await supabase
      .from(table)
      .select(select)
      .order(orderBy, { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(`${table}: ${error.message}`);
    if (!page?.length) break;

    rows = rows.concat(page as T[]);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

// ---------- Deduplication ----------

/**
 * Deduplicate songs that share the same (track_name, artist_name) but have
 * different track_ids (e.g. clean vs explicit, single vs album version).
 * Keeps the entry with the most weeks on chart for richer context.
 */
export function deduplicateSummaries<T extends { track_name: string; artist_name: string; weeks_on_chart: number }>(rows: T[]): T[] {
  const best = new Map<string, T>();
  for (const row of rows) {
    const key = `${row.track_name.toLowerCase()}|${row.artist_name.toLowerCase()}`;
    const existing = best.get(key);
    if (!existing || row.weeks_on_chart > existing.weeks_on_chart) {
      best.set(key, row);
    }
  }
  return Array.from(best.values());
}

// ---------- Data fetchers ----------

export async function fetchSongSummaries(): Promise<SongSummary[]> {
  const raw = await paginatedFetch<SongSummary>(
    "song_summary",
    "track_id, track_name, artist_name, album_img, weeks_on_chart, peak_rank, max_streams, avg_streams, first_week, last_week, release_date, artist_genres",
    "peak_rank"
  );
  return deduplicateSummaries(raw);
}

export async function fetchSongTrajectories(trackIds: string[]): Promise<SongTrajectory[]> {
  const supabase = createSupabaseClient();
  const PAGE_SIZE = 1000;
  let rows: SongTrajectory[] = [];
  let offset = 0;

  while (true) {
    const { data: page, error } = await supabase
      .from("song_trajectories")
      .select("track_id, track_name, artist_name, album_img, week, rank, streams")
      .in("track_id", trackIds)
      .order("week", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    if (!page?.length) break;

    rows = rows.concat(page as SongTrajectory[]);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

export async function fetchWeeklyAttributes(): Promise<WeeklyAttributes[]> {
  return paginatedFetch<WeeklyAttributes>(
    "weekly_attribute_trends",
    "*",
    "week"
  );
}

export async function fetchGenreData(): Promise<GenreRow[]> {
  return paginatedFetch<GenreRow>(
    "weekly_genre_data",
    "week, rank, streams, artist_genres, duration, track_id, track_name, artist_name",
    "week"
  );
}

// ---------- Spotify lifespan context for song deep dive ----------

export type SpotifyLifespanBucket = { bucket: string; count: number };

export type SpotifyLifespanContext = {
  /** Distribution of weeks_on_chart for songs in the same year */
  yearDistribution: SpotifyLifespanBucket[];
  /** Average weeks on chart for all songs that year */
  yearAvg: number;
  /** Average weeks on chart for songs in the same genre that year */
  genreAvg: number;
  /** Genre label */
  genreLabel: string;
  /** Total unique songs that charted that year */
  totalSongsInYear: number;
  /** Percentile: % of songs in that year with fewer weeks on chart */
  percentileInYear: number;
};

const SPOTIFY_BUCKET_RANGES = [
  { label: "1-3", min: 1, max: 3 },
  { label: "4-6", min: 4, max: 6 },
  { label: "7-10", min: 7, max: 10 },
  { label: "11-15", min: 11, max: 15 },
  { label: "16-25", min: 16, max: 25 },
  { label: "26-40", min: 26, max: 40 },
  { label: "41+", min: 41, max: Infinity },
];

function toSpotifyBucket(weeks: number): string {
  for (const b of SPOTIFY_BUCKET_RANGES) {
    if (weeks >= b.min && weeks <= b.max) return b.label;
  }
  return "41+";
}

/**
 * Fetch Spotify lifespan context for a song: how its weeks_on_chart
 * compares to other songs in the same year and genre.
 */
export async function fetchSpotifyLifespanContext(
  songWeeks: number,
  firstWeek: string,
  genre: string,
): Promise<SpotifyLifespanContext> {
  const supabase = createSupabaseClient();
  const year = firstWeek.slice(0, 4);

  // Fetch all song summaries that first appeared in the same year
  const { data: rows } = await supabase
    .from("song_summary")
    .select("weeks_on_chart, artist_genres")
    .gte("first_week", `${year}-01-01`)
    .lte("first_week", `${year}-12-31`);

  if (!rows?.length) {
    return {
      yearDistribution: SPOTIFY_BUCKET_RANGES.map((b) => ({ bucket: b.label, count: 0 })),
      yearAvg: 0,
      genreAvg: 0,
      genreLabel: genre,
      totalSongsInYear: 0,
      percentileInYear: 50,
    };
  }

  type Row = { weeks_on_chart: number; artist_genres: string | null };
  const typedRows = rows as Row[];

  // Overall year stats
  const allWeeks = typedRows.map((r) => r.weeks_on_chart);
  const totalSongsInYear = allWeeks.length;
  const yearAvg = allWeeks.reduce((a, b) => a + b, 0) / totalSongsInYear;

  // Percentile within year
  const fewerThan = allWeeks.filter((w) => w < songWeeks).length;
  const percentileInYear = Math.round((fewerThan / totalSongsInYear) * 100);

  // Build histogram
  const bucketCounts = new Map<string, number>();
  for (const w of allWeeks) {
    const b = toSpotifyBucket(w);
    bucketCounts.set(b, (bucketCounts.get(b) || 0) + 1);
  }
  const yearDistribution = SPOTIFY_BUCKET_RANGES.map((b) => ({
    bucket: b.label,
    count: bucketCounts.get(b.label) || 0,
  }));

  // Genre average
  const genreRows = typedRows.filter((r) => classifyGenre(r.artist_genres) === genre);
  const genreAvg = genreRows.length
    ? genreRows.reduce((s, r) => s + r.weeks_on_chart, 0) / genreRows.length
    : yearAvg;

  return {
    yearDistribution,
    yearAvg,
    genreAvg,
    genreLabel: genre,
    totalSongsInYear,
    percentileInYear,
  };
}

// ---------- Q1 Aggregation: Longevity classification ----------

export type LongevityCategory = "viral" | "sustained" | "slow_burn" | "other";

export function classifySongLongevity(summary: SongSummary): LongevityCategory {
  const weeks = summary.weeks_on_chart;
  const peak = summary.peak_rank;

  // Use streams ratio (max / avg) to detect spiky trajectories.
  // A high ratio means the song had a sharp peak relative to its average —
  // characteristic of viral spikes even if the song lingered on chart.
  const maxS = summary.max_streams || 0;
  const avgS = summary.avg_streams || 1;
  const spikeRatio = maxS / avgS;

  // Pure viral: peaked high, disappeared fast
  if (peak <= 20 && weeks <= 8) return "viral";

  // Spiky viral: peaked high with a pronounced spike shape, even if total weeks > 8.
  // The spike ratio threshold (~2.5) catches songs that had an intense burst
  // but also a long low-rank tail (e.g. re-entries, holiday spikes).
  if (peak <= 10 && weeks <= 15 && spikeRatio >= 2.5) return "viral";

  // Slow burn: climbed gradually to a moderate peak — must check BEFORE sustained
  // because a slow burn with 15+ weeks would otherwise be swallowed by sustained.
  // Key signal: many weeks but not a top-5 peak (those are just big sustained hits).
  if (peak <= 50 && peak > 10 && weeks >= 8 && weeks <= 30) return "slow_burn";

  // Sustained: on chart 15+ weeks
  if (weeks >= 15) return "sustained";

  // Remaining slow burns (shorter runs, decent peak)
  if (peak <= 50 && weeks >= 8) return "slow_burn";

  return "other";
}

export const LONGEVITY_COLORS: Record<LongevityCategory, string> = {
  viral: "#EF4444",
  sustained: "#1DB954",
  slow_burn: "#3B82F6",
  other: "#52525b",
};

export const LONGEVITY_LABELS: Record<LongevityCategory, string> = {
  viral: "Viral Spike",
  sustained: "Sustained Hit",
  slow_burn: "Slow Burn",
  other: "Other",
};
