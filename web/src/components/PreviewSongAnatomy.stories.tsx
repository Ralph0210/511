import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import PreviewSongAnatomy from "@/components/PreviewSongAnatomy";
import {
  MOCK_ANATOMY_DATA,
  MOCK_ANATOMY_SINGLE,
} from "@/stories/mocks/homepage-previews";

const meta = {
  title: "Charts/PreviewSongAnatomy",
  component: PreviewSongAnatomy,
  parameters: {
    layout: "padded",
    backgrounds: { default: "dark" },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-4xl rounded-2xl border border-zinc-800 bg-[#181818] p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PreviewSongAnatomy>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: MOCK_ANATOMY_DATA,
  },
};

export const ShortRange: Story = {
  args: {
    data: MOCK_ANATOMY_DATA.slice(0, 3),
  },
};

export const SinglePoint: Story = {
  args: {
    data: MOCK_ANATOMY_SINGLE,
  },
};

export const HighContrast: Story = {
  args: {
    data: [
      { year: 2020, danceability: 0.9, energy: 0.2, valence: 0.8, acousticness: 0.1 },
      { year: 2021, danceability: 0.85, energy: 0.25, valence: 0.75, acousticness: 0.15 },
      { year: 2022, danceability: 0.8, energy: 0.3, valence: 0.7, acousticness: 0.2 },
      { year: 2023, danceability: 0.75, energy: 0.35, valence: 0.65, acousticness: 0.25 },
      { year: 2024, danceability: 0.7, energy: 0.4, valence: 0.6, acousticness: 0.3 },
    ],
  },
};
