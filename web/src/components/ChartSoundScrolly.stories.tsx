import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ChartSoundScrolly from "@/components/ChartSoundScrolly";
import {
  MOCK_SONG_FEATURES,
  MOCK_ERA_AVERAGE,
  MOCK_SONG_FEATURES_EXTREME,
} from "@/stories/mocks/song-deep-dive";

const meta = {
  title: "Charts/ChartSoundScrolly",
  component: ChartSoundScrolly,
  parameters: {
    layout: "padded",
    backgrounds: { default: "dark" },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-xl bg-[#121212] p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChartSoundScrolly>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseArgs = {
  songFeatures: MOCK_SONG_FEATURES,
  eraAverage: MOCK_ERA_AVERAGE,
  songName: "Blinding Lights",
};

export const Beat0_EmptyGrid: Story = {
  args: { ...baseArgs, beat: 0 },
};

export const Beat1_EraAverage: Story = {
  args: { ...baseArgs, beat: 1 },
};

export const Beat2_SongOverlay: Story = {
  args: { ...baseArgs, beat: 2 },
};

export const Beat3_Callouts: Story = {
  args: { ...baseArgs, beat: 3 },
};

export const ExtremeFeatures: Story = {
  args: {
    songFeatures: MOCK_SONG_FEATURES_EXTREME,
    eraAverage: MOCK_ERA_AVERAGE,
    songName: "Bohemian Rhapsody",
    beat: 3,
  },
};
