import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ChartMomentScrolly from "@/components/ChartMomentScrolly";
import {
  MOCK_PEER_SONGS,
  MOCK_GENRE_SHARES,
} from "@/stories/mocks/song-deep-dive";

const meta = {
  title: "Charts/ChartMomentScrolly",
  component: ChartMomentScrolly,
  parameters: {
    layout: "padded",
    backgrounds: { default: "dark" },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-4xl bg-[#121212] p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChartMomentScrolly>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseArgs = {
  peerSongs: MOCK_PEER_SONGS,
  songTrackName: "Blinding Lights",
  songPeakRank: 3,
  songPeakStreams: 9_800_000,
  totalChartStreams: 83_600_000,
  genreShares: MOCK_GENRE_SHARES,
  highlightGenre: "Pop",
  songFirstWeek: "2023-01-06",
  songLastWeek: "2023-10-20",
};

export const Beat0_PeerLeaderboard: Story = {
  args: { ...baseArgs, beat: 0 },
};

export const Beat1_StreamBars: Story = {
  args: { ...baseArgs, beat: 1 },
};

export const Beat2_GenreLandscape: Story = {
  args: { ...baseArgs, beat: 2 },
};

export const Beat3_GenreHighlight: Story = {
  args: { ...baseArgs, beat: 3 },
};

export const HipHopHighlight: Story = {
  args: {
    ...baseArgs,
    highlightGenre: "Hip Hop/Rap",
    beat: 3,
  },
};
