import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ExploreFeaturedSongs from "@/components/ExploreFeaturedSongs";
import { MOCK_CATEGORIES } from "@/stories/mocks/explore-shared";

const meta = {
  title: "Components/ExploreFeaturedSongs",
  component: ExploreFeaturedSongs,
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
} satisfies Meta<typeof ExploreFeaturedSongs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    categories: MOCK_CATEGORIES,
  },
};

export const Empty: Story = {
  args: {
    categories: [],
  },
};

export const SingleCategory: Story = {
  args: {
    categories: [MOCK_CATEGORIES[0]],
  },
};
