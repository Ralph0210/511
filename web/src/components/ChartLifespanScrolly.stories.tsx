import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ChartLifespanScrolly from "@/components/ChartLifespanScrolly";
import { MOCK_LIFESPAN_BY_YEAR } from "@/stories/mocks/explore-longevity";

const meta = {
  title: "Charts/ChartLifespanScrolly",
  component: ChartLifespanScrolly,
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
} satisfies Meta<typeof ChartLifespanScrolly>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseArgs = {
  data: MOCK_LIFESPAN_BY_YEAR,
};

export const Beat0_AxesOnly: Story = {
  args: { ...baseArgs, beat: 0 },
};

export const Beat1_PreDigitalLine: Story = {
  args: { ...baseArgs, beat: 1 },
};

export const Beat2_FullLineWithEras: Story = {
  args: { ...baseArgs, beat: 2 },
};

export const Beat3_StreamingHighlight: Story = {
  args: { ...baseArgs, beat: 3 },
};

export const Beat4_FullAnnotations: Story = {
  args: { ...baseArgs, beat: 4 },
};

export const ShortRange: Story = {
  args: {
    data: MOCK_LIFESPAN_BY_YEAR.filter((d) => d.debut_year >= 2000),
    beat: 3,
  },
};
