import { createSupabaseClient } from "./supabase";
import {
  classifySongLongevity,
  classifyGenre,
  deduplicateSummaries,
  type SongSummary,
  type LongevityCategory,
  LONGEVITY_LABELS,
} from "./spotify-data";

// ---------- Types ----------

export type ExemplarSong = {
  track_id: string;
  track_name: string;
  artist_name: string;
  album_img: string | null;
  hook: string;
  category?: string;
};

export type CategorizedExemplars = {
  label: string;
  songs: ExemplarSong[];
};

export type VizExemplars = {
  longevity: ExemplarSong[];
  songAnatomy: ExemplarSong[];
  genrePulse: ExemplarSong[];
};

// Preview chart data types
export type ScatterPoint = {
  track_id: string;
  track_name: string;
  artist_name: string;
  weeks: number;
  peak: number;
  category: LongevityCategory;
};

export type PreviewData = {
  longevityScatter: ScatterPoint[];
  attributeTrend: { year: number; danceability: number; energy: number; valence: number; acousticness: number }[];
  genreShares: { year: number; shares: Record<string, number> }[];
};

// ---------- Helpers ----------

function generateHook(song: SongSummary): string {
  const weeks = song.weeks_on_chart;
  const peak = song.peak_rank;
  const category = classifySongLongevity(song);

  if (category === "viral") return `Peaked at #${peak}, gone in ${weeks} weeks`;
  if (category === "sustained") return `${weeks} weeks on chart, peaking at #${peak}`;
  if (category === "slow_burn") return `Climbed slowly to #${peak} over ${weeks} weeks`;
  return `#${peak} peak, ${weeks} weeks on chart`;
}

function toExemplar(song: SongSummary, hookOverride?: string): ExemplarSong {
  return {
    track_id: song.track_id,
    track_name: song.track_name,
    artist_name: song.artist_name,
    album_img: song.album_img,
    hook: hookOverride ?? generateHook(song),
  };
}

function pickUnique(songs: SongSummary[], count: number, usedIds: Set<string>, hookFn?: (s: SongSummary) => string): ExemplarSong[] {
  const result: ExemplarSong[] = [];
  for (const s of songs) {
    if (result.length >= count) break;
    if (!s.album_img || usedIds.has(s.track_id)) continue;
    usedIds.add(s.track_id);
    result.push(toExemplar(s, hookFn?.(s)));
  }
  return result;
}

// ---------- Shared data fetch ----------

async function fetchAllSongs(): Promise<SongSummary[]> {
  const supabase = createSupabaseClient();
  const PAGE_SIZE = 1000;
  let allSongs: SongSummary[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("song_summary")
      .select("track_id, track_name, artist_name, album_img, weeks_on_chart, peak_rank, max_streams, avg_streams, first_week, last_week, release_date, artist_genres")
      .order("max_streams", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error || !data?.length) break;
    allSongs = allSongs.concat(data as SongSummary[]);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return deduplicateSummaries(allSongs);
}

// ---------- Homepage: 3 exemplars per viz + preview chart data ----------

export async function fetchHomepageData(): Promise<{ exemplars: VizExemplars; preview: PreviewData }> {
  const allSongs = await fetchAllSongs();
  const classified = allSongs.map((s) => ({ ...s, category: classifySongLongevity(s) }));

  // Global dedup: no song appears in more than one viz section
  const usedIds = new Set<string>();

  // --- Longevity exemplars (1 per category) ---
  const longevity: ExemplarSong[] = [];
  for (const { cat, label } of [
    { cat: "viral" as const, label: LONGEVITY_LABELS.viral },
    { cat: "sustained" as const, label: LONGEVITY_LABELS.sustained },
    { cat: "slow_burn" as const, label: LONGEVITY_LABELS.slow_burn },
  ]) {
    const match = classified.find((s) => s.category === cat && s.album_img && !usedIds.has(s.track_id));
    if (match) {
      usedIds.add(match.track_id);
      longevity.push({ ...toExemplar(match), category: label });
    }
  }

  // --- Song Anatomy exemplars (pick by distinct criteria, skip already-used) ---
  const byStreamsDesc = [...allSongs].sort((a, b) => (b.max_streams || 0) - (a.max_streams || 0));
  const byWeeksAsc = [...allSongs]
    .filter((s) => s.weeks_on_chart >= 3 && s.peak_rank <= 20)
    .sort((a, b) => a.weeks_on_chart - b.weeks_on_chart);
  const byAvgStreams = [...allSongs]
    .filter((s) => s.peak_rank <= 10 && s.weeks_on_chart >= 8)
    .sort((a, b) => (b.avg_streams || 0) - (a.avg_streams || 0));

  const songAnatomy: ExemplarSong[] = [];
  const anatomySources = [
    { list: byStreamsDesc, hookFn: (s: SongSummary) => `${s.weeks_on_chart} weeks, peaking at #${s.peak_rank}` },
    { list: byWeeksAsc, hookFn: (s: SongSummary) => `Quick burn — ${s.weeks_on_chart} weeks, #${s.peak_rank} peak` },
    { list: byAvgStreams, hookFn: (s: SongSummary) => `Steady performer — #${s.peak_rank} peak over ${s.weeks_on_chart}w` },
  ];
  for (const { list, hookFn } of anatomySources) {
    const match = list.find((s) => s.album_img && !usedIds.has(s.track_id));
    if (match) {
      usedIds.add(match.track_id);
      songAnatomy.push(toExemplar(match, hookFn(match)));
    }
  }

  // --- Genre Pulse exemplars (1 per genre, skip already-used) ---
  const genresWanted = ["Hip Hop/Rap", "Latin", "Pop"];
  const genrePulse: ExemplarSong[] = [];
  for (const targetGenre of genresWanted) {
    const match = allSongs.find(
      (s) => s.album_img && classifyGenre(s.artist_genres) === targetGenre && !usedIds.has(s.track_id)
    );
    if (match) {
      usedIds.add(match.track_id);
      genrePulse.push({ ...toExemplar(match, `Top ${targetGenre} hit — ${generateHook(match)}`), category: targetGenre });
    }
  }

  // --- Preview chart data ---

  // Longevity scatter: sample ~250 songs across categories
  const scatter: ScatterPoint[] = [];
  const catCounts: Record<string, number> = { viral: 0, sustained: 0, slow_burn: 0, other: 0 };
  const catLimits: Record<string, number> = { viral: 60, sustained: 80, slow_burn: 60, other: 50 };
  for (const s of classified) {
    if (catCounts[s.category] < catLimits[s.category]) {
      scatter.push({
        track_id: s.track_id,
        track_name: s.track_name,
        artist_name: s.artist_name,
        weeks: s.weeks_on_chart,
        peak: s.peak_rank,
        category: s.category,
      });
      catCounts[s.category]++;
    }
  }

  // Attribute trend by year
  const yearBuckets: Record<number, { dance: number[]; energy: number[]; valence: number[]; acoustic: number[] }> = {};
  for (const s of allSongs) {
    const yr = parseInt(s.first_week?.slice(0, 4) || "0");
    if (yr < 2017 || yr > 2021) continue;
    if (!yearBuckets[yr]) yearBuckets[yr] = { dance: [], energy: [], valence: [], acoustic: [] };
    // We don't have per-song audio features in song_summary, so we'll skip this and use weekly_attribute_trends
  }

  // Genre shares by year
  const genreYearCounts: Record<number, Record<string, number>> = {};
  for (const s of allSongs) {
    const yr = parseInt(s.first_week?.slice(0, 4) || "0");
    if (yr < 2017 || yr > 2021) continue;
    if (!genreYearCounts[yr]) genreYearCounts[yr] = {};
    const genre = classifyGenre(s.artist_genres);
    genreYearCounts[yr][genre] = (genreYearCounts[yr][genre] || 0) + 1;
  }

  const genreShares = Object.entries(genreYearCounts)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, counts]) => {
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      const shares: Record<string, number> = {};
      for (const [genre, count] of Object.entries(counts)) {
        shares[genre] = total > 0 ? (count / total) * 100 : 0;
      }
      return { year: Number(year), shares };
    });

  return {
    exemplars: { longevity, songAnatomy, genrePulse },
    preview: {
      longevityScatter: scatter,
      attributeTrend: [], // will be fetched from weekly_attribute_trends separately
      genreShares,
    },
  };
}

// ---------- Explore page: richer categorized exemplars ----------

export async function fetchLongevityExemplars(): Promise<CategorizedExemplars[]> {
  const allSongs = await fetchAllSongs();
  const classified = allSongs.map((s) => ({ ...s, category: classifySongLongevity(s) }));
  const usedIds = new Set<string>();

  const categories: { key: LongevityCategory; label: string; filter: (s: typeof classified[0]) => boolean }[] = [
    { key: "viral", label: "Viral Spikes", filter: (s) => s.category === "viral" },
    { key: "sustained", label: "Sustained Classics", filter: (s) => s.category === "sustained" },
    { key: "slow_burn", label: "Slow Burners", filter: (s) => s.category === "slow_burn" },
  ];

  return categories.map(({ label, filter }) => ({
    label,
    songs: pickUnique(
      classified.filter(filter),
      3,
      usedIds,
      (s) => generateHook(s)
    ),
  }));
}

export async function fetchAnatomyExemplars(): Promise<CategorizedExemplars[]> {
  const allSongs = await fetchAllSongs();
  const usedIds = new Set<string>();

  // Most weeks on chart (long-running)
  const byWeeks = [...allSongs].sort((a, b) => b.weeks_on_chart - a.weeks_on_chart);
  const longRunning = pickUnique(byWeeks, 3, usedIds, (s) => `${s.weeks_on_chart} weeks on chart`);

  // Highest peak (top of chart)
  const byPeak = [...allSongs].sort((a, b) => a.peak_rank - b.peak_rank || (b.max_streams || 0) - (a.max_streams || 0));
  const chartToppers = pickUnique(byPeak, 3, usedIds, (s) => `Peaked at #${s.peak_rank}`);

  // Highest streams (streaming giants)
  const byStreams = [...allSongs].sort((a, b) => (b.max_streams || 0) - (a.max_streams || 0));
  const streamGiants = pickUnique(byStreams, 3, usedIds, (s) => {
    const ms = s.max_streams || 0;
    return ms >= 1_000_000 ? `${(ms / 1_000_000).toFixed(1)}M peak weekly streams` : `${(ms / 1_000).toFixed(0)}K peak weekly streams`;
  });

  return [
    { label: "Long-Running Hits", songs: longRunning },
    { label: "Chart Toppers", songs: chartToppers },
    { label: "Streaming Giants", songs: streamGiants },
  ];
}

export async function fetchGenreExemplars(): Promise<CategorizedExemplars[]> {
  const allSongs = await fetchAllSongs();
  const usedIds = new Set<string>();

  const targetGenres = ["Pop", "Hip Hop/Rap", "Latin", "R&B", "EDM/Dance", "Rock"];

  return targetGenres
    .map((genre) => {
      const genreSongs = allSongs.filter((s) => classifyGenre(s.artist_genres) === genre);
      const songs = pickUnique(genreSongs, 3, usedIds, (s) => `#${s.peak_rank} peak, ${s.weeks_on_chart}w on chart`);
      return { label: genre, songs };
    })
    .filter((cat) => cat.songs.length > 0);
}

// ---------- Bubble explorer data ----------

export type BubbleSong = {
  track_id: string;
  track_name: string;
  artist_name: string;
  album_img: string | null;
  weeks_on_chart: number;
  peak_rank: number;
  max_streams: number;
  genre: string;
  longevity: LongevityCategory;
  // Audio features (optional — loaded separately for "By Sound" lens)
  danceability?: number;
  energy?: number;
  valence?: number;
  acousticness?: number;
};

export async function fetchBubbleData(): Promise<BubbleSong[]> {
  const allSongs = await fetchAllSongs();

  return allSongs.map((s) => ({
    track_id: s.track_id,
    track_name: s.track_name,
    artist_name: s.artist_name,
    album_img: s.album_img,
    weeks_on_chart: s.weeks_on_chart,
    peak_rank: s.peak_rank,
    max_streams: Number(s.max_streams) || 0,
    genre: classifyGenre(s.artist_genres),
    longevity: classifySongLongevity(s),
  }));
}

/**
 * Fetch audio features for bubble songs from spotify_top200.
 * Audio features are track-level (constant across weeks), so we fetch one row per track.
 * Merges features into the provided BubbleSong array in-place and returns it.
 */
export async function fetchBubbleAudioFeatures(songs: BubbleSong[]): Promise<BubbleSong[]> {
  const supabase = createSupabaseClient();
  const trackIds = songs.map((s) => s.track_id);

  type AudioRow = {
    track_id: string;
    danceability: number | null;
    energy: number | null;
    valence: number | null;
    acousticness: number | null;
  };

  // Batch in chunks of 100 track IDs. Each track has many weekly rows,
  // but audio features are constant — we only need one row per track.
  // We fetch with a generous limit and deduplicate client-side.
  const CHUNK = 100;
  const audioMap = new Map<string, AudioRow>();

  for (let i = 0; i < trackIds.length; i += CHUNK) {
    const chunk = trackIds.slice(i, i + CHUNK);
    const { data } = await supabase
      .from("spotify_top200")
      .select("track_id, danceability, energy, valence, acousticness")
      .in("track_id", chunk)
      .eq("pivot", false)
      .limit(5000);

    if (data) {
      for (const row of data as AudioRow[]) {
        if (!audioMap.has(row.track_id)) {
          audioMap.set(row.track_id, row);
        }
      }
    }
  }

  // Merge into songs
  for (const song of songs) {
    const audio = audioMap.get(song.track_id);
    if (audio) {
      song.danceability = audio.danceability != null ? Number(audio.danceability) : undefined;
      song.energy = audio.energy != null ? Number(audio.energy) : undefined;
      song.valence = audio.valence != null ? Number(audio.valence) : undefined;
      song.acousticness = audio.acousticness != null ? Number(audio.acousticness) : undefined;
    }
  }

  return songs;
}

// ---------- Preview attribute trend (fetched separately from weekly_attribute_trends) ----------

export async function fetchAttributePreview(): Promise<PreviewData["attributeTrend"]> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("weekly_attribute_trends")
    .select("week, avg_danceability, avg_energy, avg_valence, avg_acousticness")
    .order("week", { ascending: true });

  if (error || !data?.length) return [];

  // Aggregate by year
  const yearBuckets: Record<number, { d: number[]; e: number[]; v: number[]; a: number[] }> = {};
  for (const row of data) {
    const yr = parseInt(row.week?.slice(0, 4) || "0");
    if (yr < 2017 || yr > 2021) continue;
    if (!yearBuckets[yr]) yearBuckets[yr] = { d: [], e: [], v: [], a: [] };
    if (row.avg_danceability != null) yearBuckets[yr].d.push(row.avg_danceability);
    if (row.avg_energy != null) yearBuckets[yr].e.push(row.avg_energy);
    if (row.avg_valence != null) yearBuckets[yr].v.push(row.avg_valence);
    if (row.avg_acousticness != null) yearBuckets[yr].a.push(row.avg_acousticness);
  }

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  return Object.entries(yearBuckets)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, b]) => ({
      year: Number(year),
      danceability: avg(b.d),
      energy: avg(b.e),
      valence: avg(b.v),
      acousticness: avg(b.a),
    }));
}
