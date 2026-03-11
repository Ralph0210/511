import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import LongViewSection from "@/components/LongViewSection";
import { MOCK_LIFESPAN_BY_YEAR } from "@/stories/mocks/explore-longevity";

const meta = {
  title: "Components/LongViewSection",
  component: LongViewSection,
  parameters: {
    layout: "fullscreen",
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
} satisfies Meta<typeof LongViewSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    lifespanData: MOCK_LIFESPAN_BY_YEAR,
  },
};

export const ModernEraOnly: Story = {
  args: {
    lifespanData: MOCK_LIFESPAN_BY_YEAR.filter((d) => d.debut_year >= 1990),
  },
};
