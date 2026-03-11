import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SongStoryClient from "./SongStoryClient";
import type { SongStoryChapter } from "@/data/featured-songs";
import type { SongPageData } from "./page";
import type { SongClassification } from "@/lib/narrative-generator";
import {
  MOCK_RISE_DATA,
  MOCK_CHART_RUN_INFO,
  MOCK_SONG_FEATURES,
  MOCK_ERA_AVERAGE,
  MOCK_PEER_SONGS,
  MOCK_GENRE_SHARES,
  MOCK_SPOTIFY_DISTRIBUTION,
  MOCK_BILLBOARD_DISTRIBUTION,
} from "@/stories/mocks/song-deep-dive";

const meta = {
  title: "Pages/SongStoryClient",
  component: SongStoryClient,
  parameters: {
    layout: "fullscreen",
    backgrounds: { default: "dark" },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="bg-[#121212] text-white">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SongStoryClient>;

export default meta;
type Story = StoryObj<typeof meta>;

const makeChapter = (
  title: string,
  label: string,
  beats: string[],
): SongStoryChapter => ({
  title,
  label,
  narrative: beats.join(" "),
  beats,
});

const MOCK_CHAPTERS = {
  rise: makeChapter("The Rise", "Chapter 1", [
    "The song debuted at #150 in early January 2023.",
    "It climbed steadily through the chart, gaining momentum each week.",
    "By week 12, it reached its peak position at #3 — a remarkable ascent.",
    "The trajectory shows a classic viral-then-sustained pattern.",
  ]),
  sound: makeChapter("The Sound", "Chapter 2", [
    "Let's look at the sonic fingerprint of this track.",
    "Compared to the era average, it stands out in danceability and acousticness.",
    "The combination of high danceability with low energy creates a unique groove.",
    "This sonic profile set it apart from the competition.",
  ]),
  moment: makeChapter("The Moment", "Chapter 3", [
    "At its peak week, the song was competing against chart heavyweights.",
    "It commanded 9.8M streams — 11.7% of all chart streams that week.",
    "The genre landscape was dominated by Pop and Hip Hop.",
    "Pop held 30% of the chart, making this song's success even more notable.",
  ]),
  stayingPower: makeChapter("The Staying Power", "Chapter 4", [
    "With 42 weeks on chart, this song outlasted 96% of songs that year.",
    "Most songs survive only 4-6 weeks on the Spotify Top 200.",
    "The genre average was 12.1 weeks — this song tripled that.",
    "On Billboard, it charted for 38 weeks, placing in the 92nd percentile.",
  ]),
};

const MOCK_SONG_DATA: SongPageData = {
  trackId: "0VjIjW4GlUZAMYd2vXMi3b",
  trackName: "Blinding Lights",
  artistName: "The Weeknd",
  albumImg: null,
  releaseDate: "2020-03-20",
  genre: "Pop",
  trajectory: MOCK_RISE_DATA,
  songFeatures: MOCK_SONG_FEATURES,
  eraAverage: MOCK_ERA_AVERAGE,
  genreShares: MOCK_GENRE_SHARES,
  peakRank: 3,
  weeksOnChart: 42,
  maxStreams: 9_800_000,
  firstWeek: "2023-01-06",
  lastWeek: "2023-10-20",
  billboardData: {
    peakRank: 1,
    totalWeeks: 38,
    trajectory: [],
    longevityDistribution: MOCK_BILLBOARD_DISTRIBUTION,
    longevityPercentile: 92,
  },
  spotifyLifespan: {
    yearAvg: 8.3,
    genreAvg: 12.1,
    genreLabel: "Pop",
    percentileInYear: 96,
    totalSongsInYear: 1132,
    yearDistribution: MOCK_SPOTIFY_DISTRIBUTION,
  },
  chartRunInfo: {
    runs: [{ startWeek: "2023-01-06", endWeek: "2023-10-20", weeks: 42, peakRank: 3 }],
    totalRuns: 1,
    hasReentries: false,
    longestGapWeeks: 0,
    longestRunWeeks: 42,
  },
  peerSongs: MOCK_PEER_SONGS,
  totalChartStreams: 83_600_000,
  songPeakStreams: 9_800_000,
};

const MOCK_CLASSIFICATION: { label: string; classification: SongClassification } = {
  label: "Steady Performer",
  classification: "steady-performer",
};

const baseArgs = {
  trackName: "Blinding Lights",
  chapters: MOCK_CHAPTERS,
  outro:
    "Blinding Lights is a statistical anomaly — a song that combined viral momentum with genuine staying power. Its 42-week chart run, peak at #3, and sonic uniqueness make it one of the defining hits of 2023.",
  songData: MOCK_SONG_DATA,
  genre: "Pop",
  classification: MOCK_CLASSIFICATION,
};

export const Default: Story = {
  args: baseArgs,
};

export const WithoutStayingPower: Story = {
  args: {
    ...baseArgs,
    chapters: {
      rise: MOCK_CHAPTERS.rise,
      sound: MOCK_CHAPTERS.sound,
      moment: MOCK_CHAPTERS.moment,
    },
    songData: {
      ...MOCK_SONG_DATA,
      spotifyLifespan: undefined,
    },
  },
};

export const NoBillboard: Story = {
  args: {
    ...baseArgs,
    songData: {
      ...MOCK_SONG_DATA,
      billboardData: undefined,
    },
  },
};

export const ViralSpike: Story = {
  args: {
    ...baseArgs,
    classification: { label: "Viral Spike", classification: "viral-spike" as SongClassification },
  },
};

export const NoData: Story = {
  args: {
    ...baseArgs,
    songData: null,
  },
};
