import type { GenreRow, WeeklyAttributes } from "@/lib/spotify-data";
import type { CategorizedExemplars } from "@/lib/featured-exemplars";

// --- ChartGenrePulseExplorer mock data ---

const WEEKS = Array.from({ length: 52 * 2 }, (_, i) => {
  const d = new Date("2019-01-04T00:00:00");
  d.setDate(d.getDate() + i * 7);
  return d.toISOString().slice(0, 10);
});

const GENRE_POOLS = [
  { genres: "pop", names: ["Pop Song A", "Pop Song B", "Pop Hit C"] },
  { genres: "hip hop, rap", names: ["Rap Track A", "Rap Track B"] },
  { genres: "latin, reggaeton", names: ["Latin Hit A", "Latin Banger B"] },
  { genres: "r&b, soul", names: ["R&B Groove A", "Soul Track B"] },
  { genres: "edm, dance", names: ["EDM Drop A", "Dance Hit B"] },
];

export const MOCK_GENRE_ROWS: GenreRow[] = WEEKS.flatMap((week) =>
  GENRE_POOLS.flatMap((pool, gi) =>
    pool.names.map((name, ni) => ({
      week,
      rank: gi * 10 + ni + 1,
      streams: Math.round(5_000_000 + Math.random() * 5_000_000),
      artist_genres: pool.genres,
      duration: 200_000 + Math.round(Math.random() * 40_000),
      track_id: `genre-${gi}-${ni}`,
      track_name: name,
      artist_name: `Artist ${String.fromCharCode(65 + gi)}`,
    })),
  ),
);

// --- ChartSongAnatomyExplorer mock data ---

export const MOCK_WEEKLY_ATTRIBUTES: WeeklyAttributes[] = WEEKS.map((week, i) => {
  const progress = i / (WEEKS.length - 1);
  return {
    week,
    song_count: 200,
    avg_duration: 228000 - progress * 20000 + (Math.random() - 0.5) * 5000,
    avg_danceability: 0.68 + progress * 0.04 + (Math.random() - 0.5) * 0.02,
    avg_energy: 0.65 - progress * 0.02 + (Math.random() - 0.5) * 0.03,
    avg_valence: 0.48 + (Math.random() - 0.5) * 0.04,
    avg_tempo: 120 + progress * 5 + (Math.random() - 0.5) * 3,
    avg_acousticness: 0.2 + progress * 0.03 + (Math.random() - 0.5) * 0.02,
    avg_speechiness: 0.1 + progress * 0.02 + (Math.random() - 0.5) * 0.01,
    avg_loudness: -6.5 + progress * 0.5 + (Math.random() - 0.5) * 0.3,
    avg_duration_top10: 210000 - progress * 15000,
    avg_duration_top50: 220000 - progress * 18000,
  };
});

// --- ExploreFeaturedSongs mock data ---

export const MOCK_CATEGORIES: CategorizedExemplars[] = [
  {
    label: "Viral Spikes",
    songs: [
      { track_id: "ex1", track_name: "Old Town Road", artist_name: "Lil Nas X", album_img: null, hook: "19 weeks at #1" },
      { track_id: "ex2", track_name: "WAP", artist_name: "Cardi B ft. Megan Thee Stallion", album_img: null, hook: "Debuted at #1" },
    ],
  },
  {
    label: "Slow Burns",
    songs: [
      { track_id: "ex3", track_name: "Heat Waves", artist_name: "Glass Animals", album_img: null, hook: "91 weeks to reach #1" },
      { track_id: "ex4", track_name: "Blinding Lights", artist_name: "The Weeknd", album_img: null, hook: "90 weeks on chart" },
    ],
  },
];
