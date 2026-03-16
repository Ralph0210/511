import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ChartStayingPowerScrolly from "@/components/ChartStayingPowerScrolly";
import {
  MOCK_SPOTIFY_DISTRIBUTION,
  MOCK_GENRE_DISTRIBUTION,
  MOCK_BILLBOARD_DISTRIBUTION,
} from "@/stories/mocks/song-deep-dive";

const meta = {
  title: "Charts/ChartStayingPowerScrolly",
  component: ChartStayingPowerScrolly,
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
} satisfies Meta<typeof ChartStayingPowerScrolly>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseArgs = {
  spotifyDistribution: MOCK_SPOTIFY_DISTRIBUTION,
  genreDistribution: MOCK_GENRE_DISTRIBUTION,
  songWeeks: 42,
  yearAvg: 8.3,
  genreAvg: 12.1,
  genreLabel: "Pop",
  percentileInYear: 96,
};

export const Beat0_AxesOnly: Story = {
  args: { ...baseArgs, beat: 0 },
};

export const Beat1_Histogram: Story = {
  args: { ...baseArgs, beat: 1 },
};

export const Beat2_Categories: Story = {
  args: { ...baseArgs, beat: 2 },
};

export const Beat3_BillboardComparison: Story = {
  args: {
    ...baseArgs,
    billboardDistribution: MOCK_BILLBOARD_DISTRIBUTION,
    billboardWeeks: 38,
    billboardPercentile: 92,
    beat: 3,
  },
};

export const NoBillboard: Story = {
  args: { ...baseArgs, beat: 3 },
};

export const Beat4_GenreOverlay: Story = {
  args: { ...baseArgs, beat: 4 },
};

export const ShortLivedSong: Story = {
  args: {
    ...baseArgs,
    songWeeks: 3,
    percentileInYear: 20,
    beat: 2,
  },
};
