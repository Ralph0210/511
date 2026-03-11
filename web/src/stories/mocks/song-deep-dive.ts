import type { ChartRunInfo, PeerSong } from "@/lib/narrative-generator";
import type { SpotifyLifespanBucket } from "@/lib/spotify-data";
import type { LongevityBucket } from "@/lib/billboard-data";

// --- ChartRiseScrolly mock data ---

function generateTrajectory(
  peakRank: number,
  weeks: number,
  startDate: string
): { week: string; rank: number; streams: number | null }[] {
  const data: { week: string; rank: number; streams: number | null }[] = [];
  const start = new Date(startDate + "T00:00:00");

  for (let i = 0; i < weeks; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i * 7);
    const week = d.toISOString().slice(0, 10);

    // Simulate a rise-peak-fall curve
    const progress = i / (weeks - 1);
    const peakAt = 0.3;
    let rank: number;
    if (progress < peakAt) {
      // Rise phase: start around 150, descend to peak
      rank = Math.round(150 - (150 - peakRank) * (progress / peakAt));
    } else {
      // Fall phase: climb back from peak toward 200
      const fallProgress = (progress - peakAt) / (1 - peakAt);
      rank = Math.round(peakRank + (200 - peakRank) * Math.pow(fallProgress, 1.5));
    }
    rank = Math.max(1, Math.min(200, rank));

    const streams = Math.round(
      (5_000_000 * (1 - rank / 200)) + Math.random() * 500_000
    );

    data.push({ week, rank, streams });
  }

  return data;
}

export const MOCK_RISE_DATA = generateTrajectory(3, 42, "2023-01-06");

export const MOCK_RISE_DATA_REENTRY = [
  ...generateTrajectory(8, 15, "2023-01-06"),
  // Gap of 4 weeks (off chart)
  ...generateTrajectory(25, 10, "2023-07-14"),
];

export const MOCK_CHART_RUN_INFO: ChartRunInfo = {
  runs: [
    { startWeek: "2023-01-06", endWeek: "2023-04-07", weeks: 15, peakRank: 8 },
    { startWeek: "2023-07-14", endWeek: "2023-09-15", weeks: 10, peakRank: 25 },
  ],
  totalRuns: 2,
  hasReentries: true,
  longestGapWeeks: 14,
  longestRunWeeks: 15,
};

// --- ChartSoundScrolly mock data ---

export const MOCK_SONG_FEATURES = {
  danceability: 0.82,
  energy: 0.45,
  valence: 0.35,
  acousticness: 0.72,
  speechiness: 0.15,
  tempo: 0.55,
};

export const MOCK_ERA_AVERAGE = {
  danceability: 0.68,
  energy: 0.65,
  valence: 0.50,
  acousticness: 0.25,
  speechiness: 0.12,
  tempo: 0.60,
};

// High-contrast variant: all features very different from era
export const MOCK_SONG_FEATURES_EXTREME = {
  danceability: 0.95,
  energy: 0.20,
  valence: 0.10,
  acousticness: 0.90,
  speechiness: 0.05,
  tempo: 0.30,
};

// --- ChartMomentScrolly mock data ---

export const MOCK_PEER_SONGS: PeerSong[] = [
  { track_name: "Flowers", artist_name: "Miley Cyrus", rank: 1, streams: 12_500_000 },
  { track_name: "Kill Bill", artist_name: "SZA", rank: 2, streams: 10_200_000 },
  { track_name: "Blinding Lights", artist_name: "The Weeknd", rank: 3, streams: 9_800_000 },
  { track_name: "Boy's a liar Pt. 2", artist_name: "PinkPantheress & Ice Spice", rank: 4, streams: 8_900_000 },
  { track_name: "Creepin'", artist_name: "Metro Boomin, The Weeknd, 21 Savage", rank: 5, streams: 8_100_000 },
  { track_name: "Calm Down", artist_name: "Rema & Selena Gomez", rank: 6, streams: 7_600_000 },
  { track_name: "Die For You", artist_name: "The Weeknd & Ariana Grande", rank: 7, streams: 7_200_000 },
  { track_name: "Unholy", artist_name: "Sam Smith & Kim Petras", rank: 8, streams: 6_800_000 },
  { track_name: "Anti-Hero", artist_name: "Taylor Swift", rank: 9, streams: 6_400_000 },
  { track_name: "As It Was", artist_name: "Harry Styles", rank: 10, streams: 6_100_000 },
];

const GENRE_PERIODS = [
  "2022-01", "2022-04", "2022-07", "2022-10",
  "2023-01", "2023-04", "2023-07", "2023-10",
  "2024-01", "2024-04",
];

function makeGenreShares() {
  const genres = ["Pop", "Hip Hop/Rap", "Latin", "R&B", "EDM/Dance", "Rock"];
  const shares: { period: string; genre: string; share: number }[] = [];

  GENRE_PERIODS.forEach((period) => {
    genres.forEach((genre) => {
      let base: number;
      switch (genre) {
        case "Pop": base = 28 + Math.random() * 4; break;
        case "Hip Hop/Rap": base = 24 + Math.random() * 4; break;
        case "Latin": base = 14 + Math.random() * 3; break;
        case "R&B": base = 10 + Math.random() * 2; break;
        case "EDM/Dance": base = 8 + Math.random() * 2; break;
        case "Rock": base = 5 + Math.random() * 2; break;
        default: base = 5;
      }
      shares.push({ period, genre, share: Math.round(base * 10) / 10 });
    });
  });

  return shares;
}

export const MOCK_GENRE_SHARES = makeGenreShares();

// --- ChartStayingPowerScrolly mock data ---

export const MOCK_SPOTIFY_DISTRIBUTION: SpotifyLifespanBucket[] = [
  { bucket: "1-3", count: 420 },
  { bucket: "4-6", count: 280 },
  { bucket: "7-10", count: 190 },
  { bucket: "11-15", count: 120 },
  { bucket: "16-25", count: 75 },
  { bucket: "26-40", count: 35 },
  { bucket: "41+", count: 12 },
];

export const MOCK_BILLBOARD_DISTRIBUTION: LongevityBucket[] = [
  { bucket: "1-5", count: 3200 },
  { bucket: "6-10", count: 2800 },
  { bucket: "11-15", count: 1900 },
  { bucket: "16-20", count: 1200 },
  { bucket: "21-30", count: 800 },
  { bucket: "31-40", count: 350 },
  { bucket: "41+", count: 120 },
];
