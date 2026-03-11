import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ChartSongAnatomyExplorer from "@/components/ChartSongAnatomyExplorer";
import { MOCK_WEEKLY_ATTRIBUTES } from "@/stories/mocks/explore-shared";

const meta = {
  title: "Charts/ChartSongAnatomyExplorer",
  component: ChartSongAnatomyExplorer,
  parameters: {
    layout: "padded",
    backgrounds: { default: "dark" },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-6xl bg-[#121212] p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChartSongAnatomyExplorer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: MOCK_WEEKLY_ATTRIBUTES,
  },
};

export const ShortRange: Story = {
  args: {
    data: MOCK_WEEKLY_ATTRIBUTES.slice(0, 26),
  },
};
