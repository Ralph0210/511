import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import VizPreviewCard from "@/components/VizPreviewCard";

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

export const Default: Story = {
  args: {
    title: "The Lifespan of a Hit",
    subtitle: "Do viral songs sustain popularity, or do most fade fast?",
    href: "/explore/longevity",
    children: (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Chart preview area
      </div>
    ),
  },
};

export const WithLongTitle: Story = {
  args: {
    title: "How Song Attributes and Characteristics Have Changed Over Time",
    subtitle:
      "Explore the shifting landscape of danceability, energy, valence, and acousticness across the Top 200.",
    href: "/explore/song-anatomy",
    children: (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Chart preview area
      </div>
    ),
  },
};

export const ShortContent: Story = {
  args: {
    title: "Genre Pulse",
    subtitle: "Which genres dominate?",
    href: "/explore/genre-pulse",
    children: (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Chart preview area
      </div>
    ),
  },
};
