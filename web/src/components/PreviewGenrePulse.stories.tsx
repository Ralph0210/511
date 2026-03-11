import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import PreviewGenrePulse from "@/components/PreviewGenrePulse";
import {
  MOCK_GENRE_DATA,
  MOCK_GENRE_DATA_SPARSE,
} from "@/stories/mocks/homepage-previews";

const meta = {
  title: "Charts/PreviewGenrePulse",
  component: PreviewGenrePulse,
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
} satisfies Meta<typeof PreviewGenrePulse>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: MOCK_GENRE_DATA,
  },
};

export const SparseGenres: Story = {
  args: {
    data: MOCK_GENRE_DATA_SPARSE,
  },
};

export const ShortRange: Story = {
  args: {
    data: MOCK_GENRE_DATA.slice(0, 3),
  },
};
