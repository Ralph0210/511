import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import BubbleTooltip from "./BubbleTooltip";
import { MOCK_BUBBLE_SONGS } from "@/stories/mocks/bubble-songs";

const meta = {
  title: "Bubble Explorer/BubbleTooltip",
  component: BubbleTooltip,
  parameters: {
    layout: "padded",
    backgrounds: { default: "dark" },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="relative mx-auto h-[300px] w-[500px] bg-[#121212]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BubbleTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

const popSong = MOCK_BUBBLE_SONGS[0]; // Blinding Lights
const hipHopSong = MOCK_BUBBLE_SONGS[6]; // SICKO MODE
const noStreamsSong = { ...MOCK_BUBBLE_SONGS[0], max_streams: 0 };

export const Default: Story = {
  args: {
    song: popSong,
    position: { x: 250, y: 200 },
  },
};

export const HipHop: Story = {
  args: {
    song: hipHopSong,
    position: { x: 250, y: 200 },
  },
};

export const NoStreams: Story = {
  args: {
    song: noStreamsSong,
    position: { x: 250, y: 200 },
  },
};

export const NoAlbumArt: Story = {
  args: {
    song: { ...popSong, album_img: null },
    position: { x: 250, y: 200 },
  },
};

export const LongNames: Story = {
  args: {
    song: {
      ...popSong,
      track_name: "A Very Long Song Title That Should Truncate Properly",
      artist_name: "An Extremely Long Artist Name Featuring Someone Else",
    },
    position: { x: 250, y: 200 },
  },
};

export const Hidden: Story = {
  args: {
    song: null,
    position: { x: 0, y: 0 },
  },
};
