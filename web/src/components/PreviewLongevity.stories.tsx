import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import PreviewLongevity from "@/components/PreviewLongevity";
import { MOCK_LONGEVITY_DATA } from "@/stories/mocks/homepage-previews";

const meta = {
  title: "Charts/PreviewLongevity",
  component: PreviewLongevity,
  parameters: {
    layout: "padded",
    backgrounds: { default: "dark" },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-4xl rounded-2xl border border-zinc-800 bg-[#181818] p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PreviewLongevity>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: MOCK_LONGEVITY_DATA,
  },
};

export const ViralOnly: Story = {
  args: {
    data: MOCK_LONGEVITY_DATA.filter(
      (d) => d.category === "viral" || d.category === "other"
    ),
  },
};

export const SustainedOnly: Story = {
  args: {
    data: MOCK_LONGEVITY_DATA.filter(
      (d) => d.category === "sustained" || d.category === "other"
    ),
  },
};

export const FewPoints: Story = {
  args: {
    data: MOCK_LONGEVITY_DATA.slice(0, 10),
  },
};
