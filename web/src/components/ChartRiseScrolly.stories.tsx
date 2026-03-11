import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ChartRiseScrolly from "@/components/ChartRiseScrolly";
import {
  MOCK_RISE_DATA,
  MOCK_RISE_DATA_REENTRY,
  MOCK_CHART_RUN_INFO,
} from "@/stories/mocks/song-deep-dive";

const meta = {
  title: "Charts/ChartRiseScrolly",
  component: ChartRiseScrolly,
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
} satisfies Meta<typeof ChartRiseScrolly>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Beat0_AxesOnly: Story = {
  args: {
    data: MOCK_RISE_DATA,
    peakRank: 3,
    beat: 0,
  },
};

export const Beat1_LineAppears: Story = {
  args: {
    data: MOCK_RISE_DATA,
    peakRank: 3,
    beat: 1,
  },
};

export const Beat2_PeakZoom: Story = {
  args: {
    data: MOCK_RISE_DATA,
    peakRank: 3,
    beat: 2,
  },
};

export const Beat3_StreamBars: Story = {
  args: {
    data: MOCK_RISE_DATA,
    peakRank: 3,
    beat: 3,
  },
};

export const WithReentries: Story = {
  args: {
    data: MOCK_RISE_DATA_REENTRY,
    peakRank: 8,
    chartRunInfo: MOCK_CHART_RUN_INFO,
    beat: 1,
  },
};

export const ShortTrajectory: Story = {
  args: {
    data: MOCK_RISE_DATA.slice(0, 5),
    peakRank: 80,
    beat: 1,
  },
};
