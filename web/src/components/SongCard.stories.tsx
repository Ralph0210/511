import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SongCard, SongGroup } from "@/components/SongCard";
import type { ExemplarSong } from "@/lib/featured-exemplars";

const MOCK_SONG: ExemplarSong = {
  track_id: "abc123",
  track_name: "Blinding Lights",
  artist_name: "The Weeknd",
  album_img: null,
  hook: "91 weeks — longest-charting song in history",
  category: "Sustained Hit",
};

const MOCK_SONGS: ExemplarSong[] = [
  MOCK_SONG,
  {
    track_id: "def456",
    track_name: "Shape of You",
    artist_name: "Ed Sheeran",
    album_img: null,
    hook: "59 weeks on chart with #1 peak",
    category: "Viral Spike",
  },
  {
    track_id: "ghi789",
    track_name: "Someone You Loved",
    artist_name: "Lewis Capaldi",
    album_img: null,
    hook: "Slow climb to #1 over 30 weeks",
    category: "Slow Burn",
  },
];

// --- SongCard stories ---

const cardMeta = {
  title: "Components/SongCard",
  component: SongCard,
  parameters: {
    layout: "padded",
    backgrounds: { default: "dark" },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-sm bg-[#121212] p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SongCard>;

export default cardMeta;
type CardStory = StoryObj<typeof cardMeta>;

export const Default: CardStory = {
  args: {
    song: MOCK_SONG,
  },
};

export const NoCategory: CardStory = {
  args: {
    song: { ...MOCK_SONG, category: undefined },
  },
};

export const NoAlbumArt: CardStory = {
  args: {
    song: { ...MOCK_SONG, album_img: null },
  },
};

export const LongName: CardStory = {
  args: {
    song: {
      ...MOCK_SONG,
      track_name: "A Very Long Song Title That Should Truncate Gracefully In The Card",
      artist_name: "An Extremely Long Artist Name That Also Truncates",
    },
  },
};

// --- SongGroup as a separate story ---

export const Group: CardStory = {
  args: { song: MOCK_SONG },
  render: () => <SongGroup label="Lifespan" songs={MOCK_SONGS} />,
};

export const GroupEmpty: CardStory = {
  args: { song: MOCK_SONG },
  render: () => <SongGroup label="Empty" songs={[]} />,
};
