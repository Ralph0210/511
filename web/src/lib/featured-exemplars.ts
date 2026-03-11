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
  if (category === "lasting") return `${weeks} weeks on chart, peaking at #${peak}`;
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

export type HomepageStats = {
  longevityStat: string;
  anatomyStat: string;
  genreStat: string;
};

export async function fetchHomepageData(): Promise<{ exemplars: VizExemplars; preview: PreviewData; stats: HomepageStats }> {
  const supabase = createSupabaseClient();
  const allSongs = await fetchAllSongs();
  const classified = allSongs.map((s) => ({ ...s, category: classifySongLongevity(s) }));

  // Global dedup: no song appears in more than one viz section
  const usedIds = new Set<string>();

  // --- Longevity exemplars: shortest-lived vs longest-lived ---
  // Pick the most extreme contrast to illustrate lifespan spread
  const sortedByWeeks = [...allSongs].filter((s) => s.album_img).sort((a, b) => a.weeks_on_chart - b.weeks_on_chart);
  const medianWeeks = sortedByWeeks[Math.floor(sortedByWeeks.length / 2)]?.weeks_on_chart ?? 8;

  const longevity: ExemplarSong[] = [];
  // Shortest: a recognizable song (top 20 peak) that vanished fast
  const shortMatch = sortedByWeeks.find((s) => s.peak_rank <= 20 && !usedIds.has(s.track_id));
  if (shortMatch) {
    usedIds.add(shortMatch.track_id);
    longevity.push({
      ...toExemplar(shortMatch, `Only ${shortMatch.weeks_on_chart} weeks on chart — peaked at #${shortMatch.peak_rank}`),
      category: "Short-lived",
    });
  }
  // Longest: the song with the most weeks
  const longMatch = [...sortedByWeeks].reverse().find((s) => !usedIds.has(s.track_id));
  if (longMatch) {
    usedIds.add(longMatch.track_id);
    longevity.push({
      ...toExemplar(longMatch, `${longMatch.weeks_on_chart} weeks on chart — peaked at #${longMatch.peak_rank}`),
      category: "Long-lasting",
    });
  }

  // --- Song Anatomy exemplars: best cases from the two biggest audio trends ---
  // Acoustic wave (+35%) and shrinking hits (-9.4%) are the chart's standout stories
  const yearOf = (s: SongSummary) => parseInt(s.first_week?.slice(0, 4) || "0");
  const validYears = allSongs.map(yearOf).filter((yr) => yr >= 2017);
  const dataMinYear = Math.min(...validYears);
  const dataMaxYear = Math.max(...validYears);

  // Fetch audio features for top-peaking songs to find best exemplars
  const anatomyCandidates = allSongs.filter((s) => s.peak_rank <= 20 && s.album_img && !usedIds.has(s.track_id));
  const anatomyCandidateIds = anatomyCandidates.map((s) => s.track_id);

  type HomeAudioRow = { track_id: string; acousticness: number | null; duration: number | null };
  const homeAudioMap = new Map<string, HomeAudioRow>();
  const HOME_CHUNK = 100;
  for (let i = 0; i < anatomyCandidateIds.length; i += HOME_CHUNK) {
    const chunk = anatomyCandidateIds.slice(i, i + HOME_CHUNK);
    const { data: audioData } = await supabase
      .from("spotify_top200")
      .select("track_id, acousticness, duration")
      .in("track_id", chunk)
      .eq("pivot", false)
      .limit(5000);
    if (audioData) {
      for (const row of audioData as HomeAudioRow[]) {
        if (!homeAudioMap.has(row.track_id)) homeAudioMap.set(row.track_id, row);
      }
    }
  }

  const songAnatomy: ExemplarSong[] = [];

  // Best acoustic hit: highest acousticness from 2019+
  const acousticMatch = anatomyCandidates
    .filter((s) => {
      const a = homeAudioMap.get(s.track_id);
      return a && Number(a.acousticness) >= 0.5 && yearOf(s) >= 2019 && !usedIds.has(s.track_id);
    })
    .sort((a, b) => Number(homeAudioMap.get(b.track_id)!.acousticness) - Number(homeAudioMap.get(a.track_id)!.acousticness))[0];

  if (acousticMatch) {
    usedIds.add(acousticMatch.track_id);
    const acVal = Number(homeAudioMap.get(acousticMatch.track_id)!.acousticness);
    const pct = Math.round(acVal * 100);
    // Compute avg acousticness across candidates for context
    const homeAcVals = anatomyCandidates
      .map((s) => Number(homeAudioMap.get(s.track_id)?.acousticness ?? 0))
      .filter((v) => v > 0);
    const homeAvgAc = homeAcVals.length ? homeAcVals.reduce((a, b) => a + b, 0) / homeAcVals.length : 0.25;
    const xAbove = homeAvgAc > 0 ? acVal / homeAvgAc : 0;
    songAnatomy.push(toExemplar(acousticMatch, `${pct}% acoustic — ${xAbove.toFixed(1)}x above average`));
  }

  // Best short hit: shortest duration from top 20 peaks
  const shortDurMatch = anatomyCandidates
    .filter((s) => {
      const a = homeAudioMap.get(s.track_id);
      return a && Number(a.duration) > 0 && Number(a.duration) < 180_000 && !usedIds.has(s.track_id);
    })
    .sort((a, b) => Number(homeAudioMap.get(a.track_id)!.duration) - Number(homeAudioMap.get(b.track_id)!.duration))[0];

  if (shortDurMatch) {
    usedIds.add(shortDurMatch.track_id);
    const dur = Number(homeAudioMap.get(shortDurMatch.track_id)!.duration);
    const mins = Math.floor(dur / 60000);
    const secs = Math.floor((dur % 60000) / 1000);
    songAnatomy.push(toExemplar(shortDurMatch, `${mins}:${secs.toString().padStart(2, "0")} long — peaked at #${shortDurMatch.peak_rank}`));
  }

  // --- Genre Pulse exemplars: top 2 genres by song count ---
  // Pick the two most dominant genres and a representative hit from each
  const genreTotalsForExemplars: Record<string, number> = {};
  for (const s of allSongs) {
    const g = classifyGenre(s.artist_genres);
    genreTotalsForExemplars[g] = (genreTotalsForExemplars[g] || 0) + 1;
  }
  const topGenres = Object.entries(genreTotalsForExemplars)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  const genrePulse: ExemplarSong[] = [];
  for (const [genre, count] of topGenres) {
    const pct = Math.round((count / allSongs.length) * 100);
    const match = allSongs.find(
      (s) => s.album_img && classifyGenre(s.artist_genres) === genre && !usedIds.has(s.track_id)
    );
    if (match) {
      usedIds.add(match.track_id);
      genrePulse.push({
        ...toExemplar(match, `${genre} — ${pct}% of all charting songs`),
        category: genre,
      });
    }
  }

  // --- Preview chart data ---

  // Longevity scatter: sample ~250 songs across categories
  const scatter: ScatterPoint[] = [];
  const catCounts: Record<string, number> = { flash_hit: 0, anthem: 0, steady_grower: 0, fleeting: 0 };
  const catLimits: Record<string, number> = { flash_hit: 60, anthem: 80, steady_grower: 60, fleeting: 50 };
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

  // --- Compute real stats from the dataset ---

  // Longevity: median weeks and the spread
  const longevityStat = `Median chart life is ${medianWeeks} weeks — but some last ${sortedByWeeks[sortedByWeeks.length - 1]?.weeks_on_chart ?? "?"}`;

  // Anatomy: dataset year range (already computed above)
  const anatomyStat = `How hit songs evolved from ${dataMinYear} to ${dataMaxYear}`;

  // Genre: use the top genre data (already computed above for exemplars)
  const topGenreEntry = topGenres[0];
  const topGenrePct = topGenreEntry ? Math.round((topGenreEntry[1] / allSongs.length) * 100) : 0;
  const genreStat = topGenreEntry
    ? `${topGenreEntry[0]} leads with ${topGenrePct}% of all charting songs`
    : "Genre distribution across the chart";

  return {
    exemplars: { longevity, songAnatomy, genrePulse },
    preview: {
      longevityScatter: scatter,
      attributeTrend: [], // will be fetched from weekly_attribute_trends separately
      genreShares,
    },
    stats: { longevityStat, anatomyStat, genreStat },
  };
}

// ---------- Explore page: richer categorized exemplars ----------

export async function fetchLongevityExemplars(): Promise<CategorizedExemplars[]> {
  const allSongs = await fetchAllSongs();
  const classified = allSongs.map((s) => ({ ...s, category: classifySongLongevity(s) }));
  const usedIds = new Set<string>();

  // Viral: highest peak with fewest weeks — the most extreme flash-in-the-pan hits
  const viralSongs = classified
    .filter((s) => s.category === "viral")
    .sort((a, b) => a.peak_rank - b.peak_rank || a.weeks_on_chart - b.weeks_on_chart);

  // Lasting: longest chart life among high-peaking songs — the true endurance champions
  const lastingSongs = classified
    .filter((s) => s.category === "lasting")
    .sort((a, b) => b.weeks_on_chart - a.weeks_on_chart || a.peak_rank - b.peak_rank);

  // Slow Burn: most weeks on chart among moderate-peak songs — patience rewarded
  const slowBurnSongs = classified
    .filter((s) => s.category === "slow_burn")
    .sort((a, b) => b.weeks_on_chart - a.weeks_on_chart);

  return [
    {
      label: "Viral",
      songs: pickUnique(viralSongs, 3, usedIds, (s) =>
        `Peaked at #${s.peak_rank} but gone in just ${s.weeks_on_chart} week${s.weeks_on_chart === 1 ? "" : "s"}`
      ),
    },
    {
      label: "Lasting",
      songs: pickUnique(lastingSongs, 3, usedIds, (s) =>
        `#${s.peak_rank} peak and ${s.weeks_on_chart} weeks on chart — built to last`
      ),
    },
    {
      label: "Slow Burns",
      songs: pickUnique(slowBurnSongs, 3, usedIds, (s) =>
        `${s.weeks_on_chart} weeks on chart despite only reaching #${s.peak_rank}`
      ),
    },
  ];
}

export async function fetchAnatomyExemplars(): Promise<CategorizedExemplars[]> {
  const supabase = createSupabaseClient();
  const allSongs = await fetchAllSongs();
  const usedIds = new Set<string>();

  // Fetch audio features for recognizable songs (top 50 peak) to find exemplars
  const candidates = allSongs.filter((s) => s.peak_rank <= 50 && s.album_img);
  const candidateIds = candidates.map((s) => s.track_id);

  type AudioRow = {
    track_id: string;
    acousticness: number | null;
    speechiness: number | null;
    energy: number | null;
    duration: number | null;
  };

  const audioMap = new Map<string, AudioRow>();
  const CHUNK = 100;
  for (let i = 0; i < candidateIds.length; i += CHUNK) {
    const chunk = candidateIds.slice(i, i + CHUNK);
    const { data } = await supabase
      .from("spotify_top200")
      .select("track_id, acousticness, speechiness, energy, duration")
      .in("track_id", chunk)
      .eq("pivot", false)
      .limit(5000);
    if (data) {
      for (const row of data as AudioRow[]) {
        if (!audioMap.has(row.track_id)) audioMap.set(row.track_id, row);
      }
    }
  }

  type Enriched = SongSummary & {
    acousticness: number;
    speechiness: number;
    energy: number;
    duration: number;
    year: number;
  };

  const enriched: Enriched[] = candidates
    .filter((s) => audioMap.has(s.track_id))
    .map((s) => {
      const a = audioMap.get(s.track_id)!;
      return {
        ...s,
        acousticness: Number(a.acousticness) || 0,
        speechiness: Number(a.speechiness) || 0,
        energy: Number(a.energy) || 0,
        duration: Number(a.duration) || 0,
        year: parseInt(s.first_week?.slice(0, 4) || "0"),
      };
    })
    .filter((s) => s.year >= 2017);

  // --- Category 1: The Acoustic Wave ---
  // Chart shows acousticness rose +35% — find high-acousticness hits from later years
  const acousticHits = [...enriched]
    .filter((s) => s.acousticness >= 0.5 && s.year >= 2019)
    .sort((a, b) => b.acousticness - a.acousticness || a.peak_rank - b.peak_rank);

  // Compute avg acousticness across all enriched songs for context
  const allAcousticVals = enriched.map((s) => s.acousticness).filter((v) => v > 0);
  const avgAcousticness = allAcousticVals.length ? allAcousticVals.reduce((a, b) => a + b, 0) / allAcousticVals.length : 0.25;

  const acousticWave = pickUnique(acousticHits, 3, usedIds, (s) => {
    const e = enriched.find((x) => x.track_id === s.track_id);
    const pct = e ? Math.round(e.acousticness * 100) : 0;
    const xAbove = avgAcousticness > 0 ? (e ? e.acousticness / avgAcousticness : 0) : 0;
    return `${pct}% acoustic — ${xAbove.toFixed(1)}x above average`;
  });

  // --- Category 2: The Incredible Shrinking Hit ---
  // Chart shows duration fell -9.4% — find short-duration hits that still charted high
  const shortHits = [...enriched]
    .filter((s) => s.duration > 0 && s.duration < 180_000 && s.peak_rank <= 20)
    .sort((a, b) => a.duration - b.duration || a.peak_rank - b.peak_rank);

  const shrinkingHits = pickUnique(shortHits, 3, usedIds, (s) => {
    const e = enriched.find((x) => x.track_id === s.track_id);
    const dur = e ? e.duration : 0;
    const mins = Math.floor(dur / 60000);
    const secs = Math.floor((dur % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, "0")} long — peaked at #${s.peak_rank}`;
  });

  // --- Category 3: Bucking the Trend ---
  // Speechiness and energy both declined — find recent high-speech/high-energy outliers
  const outliers = [...enriched]
    .filter((s) => s.speechiness >= 0.15 && s.energy >= 0.7 && s.year >= 2020)
    .sort((a, b) => (b.speechiness + b.energy) - (a.speechiness + a.energy) || a.peak_rank - b.peak_rank);

  const buckingTrend = pickUnique(outliers, 3, usedIds, (s) => {
    const e = enriched.find((x) => x.track_id === s.track_id);
    const enPct = e ? Math.round(e.energy * 100) : 0;
    const spPct = e ? Math.round(e.speechiness * 100) : 0;
    return `${enPct}% energy, ${spPct}% speech — peaked at #${s.peak_rank} in ${e?.year ?? ""}`;
  });

  return [
    { label: "The Acoustic Wave", songs: acousticWave },
    { label: "The Incredible Shrinking Hit", songs: shrinkingHits },
    { label: "Bucking the Trend", songs: buckingTrend },
  ];
}

export async function fetchGenreExemplars(): Promise<CategorizedExemplars[]> {
  const allSongs = await fetchAllSongs();
  const usedIds = new Set<string>();

  const targetGenres = ["Pop", "Hip Hop/Rap", "Latin", "R&B", "EDM/Dance", "Rock", "K-Pop", "Afrobeats"];

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
