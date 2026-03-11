import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SongSearch from "@/components/SongSearch";

const meta = {
  title: "Components/SongSearch",
  component: SongSearch,
  parameters: {
    layout: "padded",
    backgrounds: { default: "dark" },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-md bg-[#121212] p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SongSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithClassName: Story = {
  args: {
    className: "max-w-sm",
  },
};

export const FullWidth: Story = {
  args: {
    className: "w-full",
  },
};
