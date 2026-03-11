import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ChartLongevityExplorer from "@/components/ChartLongevityExplorer";
import {
  MOCK_SUMMARIES,
  MOCK_TRAJECTORIES,
} from "@/stories/mocks/explore-longevity";

const meta = {
  title: "Charts/ChartLongevityExplorer",
  component: ChartLongevityExplorer,
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
} satisfies Meta<typeof ChartLongevityExplorer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    summaries: MOCK_SUMMARIES,
    initialTrajectories: MOCK_TRAJECTORIES,
  },
};

export const FewSongs: Story = {
  args: {
    summaries: MOCK_SUMMARIES.slice(0, 6),
    initialTrajectories: MOCK_TRAJECTORIES.filter((t) =>
      MOCK_SUMMARIES.slice(0, 6).some((s) => s.track_id === t.track_id),
    ),
  },
};
