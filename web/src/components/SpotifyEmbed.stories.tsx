import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SpotifyEmbed from "@/components/SpotifyEmbed";

const meta = {
  title: "Components/SpotifyEmbed",
  component: SpotifyEmbed,
  parameters: {
    layout: "padded",
    backgrounds: { default: "dark" },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-md bg-[#121212] p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SpotifyEmbed>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BlindingLights: Story = {
  args: {
    trackId: "0VjIjW4GlUZAMYd2vXMi3b",
  },
};

export const ShapeOfYou: Story = {
  args: {
    trackId: "7qiZfU4dY1lWllzX7mPBI3",
  },
};
