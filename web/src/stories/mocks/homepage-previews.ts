import type { ScatterPoint } from "@/lib/featured-exemplars";
import type { LongevityCategory } from "@/lib/spotify-data";

// --- PreviewLongevity mock data ---

function makeScatterPoints(
  category: LongevityCategory,
  weeksRange: [number, number],
  peakRange: [number, number],
  count: number
): ScatterPoint[] {
  const points: ScatterPoint[] = [];
  for (let i = 0; i < count; i++) {
    const weeks =
      weeksRange[0] + Math.random() * (weeksRange[1] - weeksRange[0]);
    const peak =
      peakRange[0] + Math.random() * (peakRange[1] - peakRange[0]);
    points.push({
      track_id: `${category}-${i}`,
      track_name: `Track ${i}`,
      artist_name: `Artist ${i}`,
      weeks: Math.round(weeks),
      peak: Math.round(peak),
      category,
    });
  }
  return points;
}

export const MOCK_LONGEVITY_DATA: ScatterPoint[] = [
  ...makeScatterPoints("viral", [1, 8], [1, 30], 40),
  ...makeScatterPoints("lasting", [15, 50], [1, 20], 50),
  ...makeScatterPoints("slow_burn", [20, 45], [10, 80], 40),
  ...makeScatterPoints("flash", [1, 30], [20, 200], 80),
];

// --- PreviewSongAnatomy mock data ---

export const MOCK_ANATOMY_DATA = [
  { year: 2017, danceability: 0.68, energy: 0.72, valence: 0.52, acousticness: 0.22 },
  { year: 2018, danceability: 0.71, energy: 0.70, valence: 0.48, acousticness: 0.20 },
  { year: 2019, danceability: 0.73, energy: 0.68, valence: 0.45, acousticness: 0.23 },
  { year: 2020, danceability: 0.70, energy: 0.65, valence: 0.40, acousticness: 0.28 },
  { year: 2021, danceability: 0.72, energy: 0.64, valence: 0.42, acousticness: 0.25 },
  { year: 2022, danceability: 0.74, energy: 0.66, valence: 0.44, acousticness: 0.21 },
  { year: 2023, danceability: 0.73, energy: 0.63, valence: 0.41, acousticness: 0.26 },
  { year: 2024, danceability: 0.75, energy: 0.62, valence: 0.39, acousticness: 0.29 },
];

// --- PreviewGenrePulse mock data ---

export const MOCK_GENRE_DATA = [
  { year: 2017, shares: { Pop: 32, "Hip Hop/Rap": 22, Latin: 8, "R&B": 10, "EDM/Dance": 9, Rock: 7, "K-Pop": 3, Country: 5, Other: 4 } },
  { year: 2018, shares: { Pop: 30, "Hip Hop/Rap": 25, Latin: 9, "R&B": 9, "EDM/Dance": 8, Rock: 6, "K-Pop": 4, Country: 5, Other: 4 } },
  { year: 2019, shares: { Pop: 28, "Hip Hop/Rap": 27, Latin: 10, "R&B": 8, "EDM/Dance": 7, Rock: 6, "K-Pop": 5, Country: 5, Other: 4 } },
  { year: 2020, shares: { Pop: 27, "Hip Hop/Rap": 28, Latin: 11, "R&B": 8, "EDM/Dance": 6, Rock: 5, "K-Pop": 6, Country: 5, Other: 4 } },
  { year: 2021, shares: { Pop: 26, "Hip Hop/Rap": 26, Latin: 13, "R&B": 8, "EDM/Dance": 6, Rock: 5, "K-Pop": 7, Country: 5, Other: 4 } },
  { year: 2022, shares: { Pop: 25, "Hip Hop/Rap": 24, Latin: 15, "R&B": 8, "EDM/Dance": 6, Rock: 5, "K-Pop": 8, Country: 5, Other: 4 } },
  { year: 2023, shares: { Pop: 26, "Hip Hop/Rap": 22, Latin: 16, "R&B": 7, "EDM/Dance": 6, Rock: 5, "K-Pop": 9, Country: 5, Other: 4 } },
  { year: 2024, shares: { Pop: 25, "Hip Hop/Rap": 21, Latin: 17, "R&B": 7, "EDM/Dance": 6, Rock: 5, "K-Pop": 10, Country: 5, Other: 4 } },
];

// Edge case: sparse genre data (only 3 genres)
export const MOCK_GENRE_DATA_SPARSE = [
  { year: 2020, shares: { Pop: 50, "Hip Hop/Rap": 35, Other: 15 } },
  { year: 2021, shares: { Pop: 48, "Hip Hop/Rap": 37, Other: 15 } },
  { year: 2022, shares: { Pop: 45, "Hip Hop/Rap": 40, Other: 15 } },
];

// Edge case: single data point
export const MOCK_ANATOMY_SINGLE = [
  { year: 2024, danceability: 0.75, energy: 0.62, valence: 0.39, acousticness: 0.29 },
];
