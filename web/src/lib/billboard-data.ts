import { createSupabaseClient } from "./supabase";

export type LifespanByYear = {
  debut_year: number;
  avg_lifespan: number;
  song_count: number;
};

export type BillboardTrajectoryPoint = {
  date: string;
  rank: number;
  weeks_on_board: number;
};

export type LongevityBucket = {
  bucket: string;
  count: number;
};

export type BillboardSongData = {
  trajectory: BillboardTrajectoryPoint[];
  peakRank: number;
  totalWeeks: number;
  longevityPercentile: number;
  longevityDistribution: LongevityBucket[];
};

// ---------- Name normalization for fuzzy matching ----------

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/\(.*?\)/g, "") // remove parenthetical content
    .replace(/\b(feat\.?|ft\.?|featuring)\b/gi, "")
    .replace(/[^a-zA-Z0-9\s]/g, "") // remove punctuation
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Extract the most significant word from an artist name for broad matching */
function primaryArtistWord(artist: string): string {
  const normalized = normalize(artist);
  // Skip common prefixes
  const words = normalized.split(" ").filter((w) => !["the", "a", "an", "dj"].includes(w));
  return words[0] || normalized.split(" ")[0] || normalized;
}

// ---------- Longevity histogram buckets ----------

const BUCKET_RANGES = [
  { label: "1-5", min: 1, max: 5 },
  { label: "6-10", min: 6, max: 10 },
  { label: "11-15", min: 11, max: 15 },
  { label: "16-20", min: 16, max: 20 },
  { label: "21-30", min: 21, max: 30 },
  { label: "31-40", min: 31, max: 40 },
  { label: "41+", min: 41, max: Infinity },
];

function toBucket(weeks: number): string {
  for (const b of BUCKET_RANGES) {
    if (weeks >= b.min && weeks <= b.max) return b.label;
  }
  return "41+";
}

// ---------- Song-level Billboard data ----------

/**
 * Fuzzy-match a song against the Billboard Hot 100 chart_entries table
 * and return trajectory + longevity percentile data.
 * Returns null if no match found.
 */
export async function fetchBillboardForSong(
  trackName: string,
  artistName: string,
): Promise<BillboardSongData | null> {
  const supabase = createSupabaseClient();

  const normTrack = normalize(trackName);
  const artistWord = primaryArtistWord(artistName);

  // Try exact-ish match first, then broader
  const { data: matches } = await supabase
    .from("chart_entries")
    .select("song, artist, date, rank, weeks_on_board")
    .ilike("song", `%${normTrack}%`)
    .ilike("artist", `%${artistWord}%`)
    .order("date", { ascending: true })
    .limit(500);

  if (!matches?.length) return null;

  // Group by song+artist to find the best match (most entries = longest chart run)
  type Row = { song: string; artist: string; date: string; rank: number; weeks_on_board: number };
  const groups = new Map<string, Row[]>();
  for (const row of matches as Row[]) {
    const key = `${row.song}|||${row.artist}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  // Pick the group with the most chart entries
  let bestKey = "";
  let bestCount = 0;
  for (const [key, rows] of groups) {
    if (rows.length > bestCount) {
      bestCount = rows.length;
      bestKey = key;
    }
  }

  const songRows = groups.get(bestKey);
  if (!songRows?.length) return null;

  const trajectory: BillboardTrajectoryPoint[] = songRows.map((r) => ({
    date: r.date,
    rank: r.rank,
    weeks_on_board: r.weeks_on_board,
  }));

  const peakRank = Math.min(...songRows.map((r) => r.rank));
  const totalWeeks = Math.max(...songRows.map((r) => r.weeks_on_board));

  // Fetch longevity distribution from peak_longevity view
  const { data: longevityRows } = await supabase
    .from("peak_longevity")
    .select("weeks_on_board");

  let longevityPercentile = 50;
  let longevityDistribution: LongevityBucket[] = BUCKET_RANGES.map((b) => ({
    bucket: b.label,
    count: 0,
  }));

  if (longevityRows?.length) {
    const allWeeks = (longevityRows as { weeks_on_board: number }[]).map((r) => r.weeks_on_board);
    const totalSongs = allWeeks.length;
    const fewerThan = allWeeks.filter((w) => w < totalWeeks).length;
    longevityPercentile = Math.round((fewerThan / totalSongs) * 100);

    // Build histogram
    const bucketCounts = new Map<string, number>();
    for (const w of allWeeks) {
      const b = toBucket(w);
      bucketCounts.set(b, (bucketCounts.get(b) || 0) + 1);
    }
    longevityDistribution = BUCKET_RANGES.map((b) => ({
      bucket: b.label,
      count: bucketCounts.get(b.label) || 0,
    }));
  }

  return {
    trajectory,
    peakRank,
    totalWeeks,
    longevityPercentile,
    longevityDistribution,
  };
}

/**
 * Fetch average chart lifespan by debut year from the Billboard Hot 100 data.
 * Uses the avg_lifespan_by_year materialized view, falling back to computing
 * from chart_entries directly if the view doesn't exist.
 */
export async function fetchLifespanByYear(): Promise<LifespanByYear[]> {
  const supabase = createSupabaseClient();

  // Try the precomputed view first
  const { data, error } = await supabase
    .from("avg_lifespan_by_year")
    .select("debut_year, avg_lifespan, song_count")
    .lt("debut_year", 2027)
    .order("debut_year", { ascending: true });

  if (!error && data?.length) {
    return data as LifespanByYear[];
  }

  // Fallback: compute from chart_entries directly
  const { data: raw, error: rawError } = await supabase
    .from("chart_entries")
    .select("song, artist, date, weeks_on_board")
    .order("date", { ascending: true });

  if (rawError || !raw?.length) return [];

  // Group by song+artist, get max weeks and first date
  const songMap = new Map<string, { firstYear: number; maxWeeks: number }>();
  for (const row of raw as { song: string; artist: string; date: string; weeks_on_board: number }[]) {
    const key = `${row.song}|||${row.artist}`;
    const year = parseInt(row.date.slice(0, 4));
    const existing = songMap.get(key);
    if (!existing) {
      songMap.set(key, { firstYear: year, maxWeeks: row.weeks_on_board });
    } else {
      existing.maxWeeks = Math.max(existing.maxWeeks, row.weeks_on_board);
    }
  }

  // Aggregate by year
  const yearMap = new Map<number, { total: number; count: number }>();
  for (const { firstYear, maxWeeks } of songMap.values()) {
    const entry = yearMap.get(firstYear) || { total: 0, count: 0 };
    entry.total += maxWeeks;
    entry.count += 1;
    yearMap.set(firstYear, entry);
  }

  return Array.from(yearMap.entries())
    .map(([year, { total, count }]) => ({
      debut_year: year,
      avg_lifespan: Math.round((total / count) * 100) / 100,
      song_count: count,
    }))
    .sort((a, b) => a.debut_year - b.debut_year);
}
