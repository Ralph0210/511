import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import BackLink from "@/components/BackLink";

const meta = {
  title: "Components/BackLink",
  component: BackLink,
  parameters: {
    layout: "padded",
    backgrounds: { default: "dark" },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="bg-[#121212] p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BackLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const CustomLabel: Story = {
  args: {
    href: "/explore/longevity",
    label: "Back to Longevity",
  },
};
