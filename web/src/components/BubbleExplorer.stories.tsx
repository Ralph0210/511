import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import BubbleExplorer from "./BubbleExplorer";
import { MOCK_BUBBLE_SONGS } from "@/stories/mocks/bubble-songs";

const meta = {
  title: "Bubble Explorer/BubbleExplorer",
  component: BubbleExplorer,
  parameters: {
    layout: "fullscreen",
    backgrounds: { default: "dark" },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="bg-[#121212] px-6 py-8" style={{ minHeight: "100vh" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BubbleExplorer>;

export default meta;
type Story = StoryObj<typeof meta>;

// Full dataset (all mock songs)
export const Default: Story = {
  args: {
    songs: MOCK_BUBBLE_SONGS,
  },
};

// Fewer songs — smaller bubbles, fewer categories
export const FewSongs: Story = {
  args: {
    songs: MOCK_BUBBLE_SONGS.slice(0, 6), // Pop only
  },
};

// Single genre — only one bubble in Level 1
export const SingleGenre: Story = {
  args: {
    songs: MOCK_BUBBLE_SONGS.filter((s) => s.genre === "Pop"),
  },
};

// Two genres
export const TwoGenres: Story = {
  args: {
    songs: MOCK_BUBBLE_SONGS.filter(
      (s) => s.genre === "Pop" || s.genre === "Hip Hop/Rap"
    ),
  },
};

// With audio features for sound lens
export const WithAudioFeatures: Story = {
  args: {
    songs: MOCK_BUBBLE_SONGS.map((s) => ({
      ...s,
      danceability: s.danceability ?? Math.random() * 0.5 + 0.4,
      energy: s.energy ?? Math.random() * 0.5 + 0.3,
      valence: s.valence ?? Math.random() * 0.7 + 0.1,
      acousticness: s.acousticness ?? Math.random() * 0.3,
    })),
  },
};

// Edge case: empty
export const Empty: Story = {
  args: {
    songs: [],
  },
};

// Edge case: single song
export const SingleSong: Story = {
  args: {
    songs: [MOCK_BUBBLE_SONGS[0]],
  },
};
