import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import BubbleInsightPanel from "./BubbleInsightPanel";
import { MOCK_BUBBLE_SONGS } from "@/stories/mocks/bubble-songs";

const meta = {
  title: "Bubble Explorer/BubbleInsightPanel",
  component: BubbleInsightPanel,
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
} satisfies Meta<typeof BubbleInsightPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GenreLens: Story = {
  args: {
    lens: "genre",
    songs: MOCK_BUBBLE_SONGS,
  },
};

export const LongevityLens: Story = {
  args: {
    lens: "longevity",
    songs: MOCK_BUBBLE_SONGS,
  },
};

export const Empty: Story = {
  args: {
    lens: "genre",
    songs: [],
  },
};
