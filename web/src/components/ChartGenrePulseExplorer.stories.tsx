import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ChartGenrePulseExplorer from "@/components/ChartGenrePulseExplorer";
import { MOCK_GENRE_ROWS } from "@/stories/mocks/explore-shared";

const meta = {
  title: "Charts/ChartGenrePulseExplorer",
  component: ChartGenrePulseExplorer,
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
} satisfies Meta<typeof ChartGenrePulseExplorer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: MOCK_GENRE_ROWS,
  },
};

export const FewWeeks: Story = {
  args: {
    data: MOCK_GENRE_ROWS.filter((r) => r.week < "2019-04-01"),
  },
};
