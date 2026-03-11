import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import SongLoading from "./loading";

const meta = {
  title: "Pages/SongLoading",
  component: SongLoading,
  parameters: {
    layout: "fullscreen",
    backgrounds: { default: "dark" },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="bg-[#121212] text-white">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SongLoading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
