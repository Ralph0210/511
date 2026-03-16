import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import BubbleDetailDrawer from "./BubbleDetailDrawer";
import { MOCK_BUBBLE_SONGS } from "@/stories/mocks/bubble-songs";

const meta = {
  title: "Bubble Explorer/BubbleDetailDrawer",
  component: BubbleDetailDrawer,
  parameters: {
    layout: "fullscreen",
    backgrounds: { default: "dark" },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof BubbleDetailDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PopSong: Story = {
  args: {
    song: MOCK_BUBBLE_SONGS[0], // Blinding Lights
    onClose: () => {},
  },
};

export const HipHopSong: Story = {
  args: {
    song: MOCK_BUBBLE_SONGS[6], // SICKO MODE
    onClose: () => {},
  },
};

export const LatinSong: Story = {
  args: {
    song: MOCK_BUBBLE_SONGS[11], // Despacito
    onClose: () => {},
  },
};

export const NoAlbumArt: Story = {
  args: {
    song: { ...MOCK_BUBBLE_SONGS[0], album_img: null },
    onClose: () => {},
  },
};

export const NoStreams: Story = {
  args: {
    song: { ...MOCK_BUBBLE_SONGS[0], max_streams: 0 },
    onClose: () => {},
  },
};

export const Closed: Story = {
  args: {
    song: null,
    onClose: () => {},
  },
};
