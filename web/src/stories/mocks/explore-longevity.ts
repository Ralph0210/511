import type { SongSummary } from "@/lib/spotify-data";
import type { LifespanByYear } from "@/lib/billboard-data";

// --- ChartLongevityExplorer mock data ---

function makeSummary(
  id: string,
  name: string,
  artist: string,
  peak: number,
  weeks: number,
  maxStreams: number,
): SongSummary {
  return {
    track_id: id,
    track_name: name,
    artist_name: artist,
    album_img: null,
    weeks_on_chart: weeks,
    peak_rank: peak,
    max_streams: maxStreams,
    avg_streams: Math.round(maxStreams * 0.6),
    first_week: "2020-01-03",
    last_week: "2020-06-26",
    release_date: "2019-12-20",
    artist_genres: "pop",
  };
}

export const MOCK_SUMMARIES: SongSummary[] = [
  // Viral spikes (high peak, short run)
  makeSummary("v1", "Viral Hit A", "Artist A", 3, 5, 12_000_000),
  makeSummary("v2", "Viral Hit B", "Artist B", 7, 4, 10_500_000),
  makeSummary("v3", "Viral Hit C", "Artist C", 12, 6, 9_200_000),
  makeSummary("v4", "Viral Hit D", "Artist D", 1, 3, 15_000_000),
  makeSummary("v5", "Viral Hit E", "Artist E", 5, 7, 11_000_000),
  // Sustained hits (long run)
  makeSummary("s1", "Blinding Lights", "The Weeknd", 3, 42, 9_800_000),
  makeSummary("s2", "Shape of You", "Ed Sheeran", 1, 55, 14_200_000),
  makeSummary("s3", "Levitating", "Dua Lipa", 5, 38, 7_600_000),
  makeSummary("s4", "Stay", "The Kid LAROI & Justin Bieber", 2, 32, 11_500_000),
  makeSummary("s5", "Heat Waves", "Glass Animals", 8, 48, 6_800_000),
  // Slow burns (moderate peak, decent run)
  makeSummary("b1", "Slow Burn A", "Artist F", 35, 22, 3_200_000),
  makeSummary("b2", "Slow Burn B", "Artist G", 28, 18, 4_100_000),
  makeSummary("b3", "Slow Burn C", "Artist H", 42, 15, 2_800_000),
  makeSummary("b4", "Slow Burn D", "Artist I", 50, 12, 2_400_000),
  // Other
  makeSummary("o1", "Mid Track A", "Artist J", 120, 3, 1_200_000),
  makeSummary("o2", "Mid Track B", "Artist K", 85, 5, 1_800_000),
  makeSummary("o3", "Mid Track C", "Artist L", 150, 2, 900_000),
  makeSummary("o4", "Mid Track D", "Artist M", 95, 8, 2_100_000),
];

export const MOCK_TRAJECTORIES = MOCK_SUMMARIES.flatMap((s) => {
  const points = [];
  const start = new Date("2020-01-03T00:00:00");
  for (let i = 0; i < s.weeks_on_chart; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i * 7);
    const progress = i / Math.max(s.weeks_on_chart - 1, 1);
    const peakAt = 0.25;
    let rank: number;
    if (progress < peakAt) {
      rank = Math.round(150 - (150 - s.peak_rank) * (progress / peakAt));
    } else {
      const fallProgress = (progress - peakAt) / (1 - peakAt);
      rank = Math.round(s.peak_rank + (200 - s.peak_rank) * Math.pow(fallProgress, 1.5));
    }
    rank = Math.max(1, Math.min(200, rank));
    points.push({
      track_id: s.track_id,
      track_name: s.track_name,
      artist_name: s.artist_name,
      week: d.toISOString().slice(0, 10),
      rank,
      streams: Math.round((s.max_streams || 5_000_000) * (1 - rank / 200)),
    });
  }
  return points;
});

// --- ChartLifespanScrolly mock data ---

export const MOCK_LIFESPAN_BY_YEAR: LifespanByYear[] = Array.from(
  { length: 66 },
  (_, i) => {
    const year = 1958 + i;
    // Simulate: stable ~12w in early decades, dip in 90s, rise in streaming era
    let base: number;
    if (year < 1991) {
      base = 11 + Math.sin((year - 1958) * 0.15) * 2;
    } else if (year < 2005) {
      base = 9 + (year - 1991) * 0.1;
    } else if (year < 2013) {
      base = 10 + (year - 2005) * 0.3;
    } else {
      base = 13 + (year - 2013) * 0.4;
    }
    return {
      debut_year: year,
      avg_lifespan: Math.round((base + (Math.random() - 0.5) * 2) * 10) / 10,
      song_count: Math.round(200 + Math.random() * 300),
    };
  },
);
