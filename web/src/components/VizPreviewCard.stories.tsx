import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import VizPreviewCard from "@/components/VizPreviewCard";
import type { ExemplarSong } from "@/lib/featured-exemplars";

const mockLongevitySongs: ExemplarSong[] = [
  {
    track_id: "short-1",
    track_name: "MONTERO (Call Me By Your Name)",
    artist_name: "Lil Nas X",
    album_img: null,
    hook: "Only 2 weeks on chart — peaked at #2",
    category: "Short-lived",
  },
  {
    track_id: "long-1",
    track_name: "Blinding Lights",
    artist_name: "The Weeknd",
    album_img: null,
    hook: "91 weeks on chart — peaked at #1",
    category: "Long-lasting",
  },
];

const mockAnatomySongs: ExemplarSong[] = [
  {
    track_id: "anatomy-1",
    track_name: "Shape of You",
    artist_name: "Ed Sheeran",
    album_img: null,
    hook: "#1 in 2017 — 33w on chart",
  },
  {
    track_id: "anatomy-2",
    track_name: "Levitating",
    artist_name: "Dua Lipa",
    album_img: null,
    hook: "#2 in 2021 — 43w on chart",
  },
];

const mockGenreSongs: ExemplarSong[] = [
  {
    track_id: "genre-1",
    track_name: "God's Plan",
    artist_name: "Drake",
    album_img: null,
    hook: "Hip Hop/Rap — 28% of all charting songs",
    category: "Hip Hop/Rap",
  },
  {
    track_id: "genre-2",
    track_name: "Blinding Lights",
    artist_name: "The Weeknd",
    album_img: null,
    hook: "Pop — 24% of all charting songs",
    category: "Pop",
  },
];

const meta = {
  title: "Components/VizPreviewCard",
  component: VizPreviewCard,
  parameters: {
    layout: "padded",
    backgrounds: { default: "dark" },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-2xl bg-[#121212] p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VizPreviewCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Longevity: Story = {
  args: {
    title: "The Lifespan of a Hit",
    stat: "Median chart life is 6 weeks — but some last 91",
    href: "/explore/longevity",
    accent: "#1DB954",
    songs: mockLongevitySongs,
  },
};

export const SongAnatomy: Story = {
  args: {
    title: "Anatomy of a Song",
    stat: "How hit songs evolved from 2017 to 2021",
    href: "/explore/song-anatomy",
    accent: "#F59E0B",
    songs: mockAnatomySongs,
  },
};

export const GenrePulse: Story = {
  args: {
    title: "Genre Breakdown",
    stat: "Hip Hop/Rap leads with 28% of all charting songs",
    href: "/explore/genre-pulse",
    accent: "#8B5CF6",
    songs: mockGenreSongs,
  },
};

export const WithoutSongs: Story = {
  args: {
    title: "The Lifespan of a Hit",
    stat: "Median chart life is 6 weeks — but some last 91",
    href: "/explore/longevity",
    accent: "#1DB954",
  },
};

export const AllThree: Story = {
  args: { ...Longevity.args! },
  render: () => (
    <div className="space-y-3">
      <VizPreviewCard
        title="The Lifespan of a Hit"
        stat="Median chart life is 6 weeks — but some last 91"
        href="/explore/longevity"
        accent="#1DB954"
        songs={mockLongevitySongs}
      />
      <VizPreviewCard
        title="Anatomy of a Song"
        stat="How hit songs evolved from 2017 to 2021"
        href="/explore/song-anatomy"
        accent="#F59E0B"
        songs={mockAnatomySongs}
      />
      <VizPreviewCard
        title="Genre Breakdown"
        stat="Hip Hop/Rap leads with 28% of all charting songs"
        href="/explore/genre-pulse"
        accent="#8B5CF6"
        songs={mockGenreSongs}
      />
    </div>
  ),
};
