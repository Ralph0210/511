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

// ---------- Data fetchers ----------

export async function fetchSongSummaries(): Promise<SongSummary[]> {
  return paginatedFetch<SongSummary>(
    "song_summary",
    "track_id, track_name, artist_name, album_img, weeks_on_chart, peak_rank, max_streams, avg_streams, first_week, last_week, release_date, artist_genres",
    "peak_rank"
  );
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
  sustained: "#10B981",
  slow_burn: "#2563EB",
  other: "#D1D5DB",
};

export const LONGEVITY_LABELS: Record<LongevityCategory, string> = {
  viral: "Viral Spike",
  sustained: "Sustained Hit",
  slow_burn: "Slow Burn",
  other: "Other",
};
