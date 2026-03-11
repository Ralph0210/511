import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import StickyScrolly from "@/components/StickyScrolly";

const meta = {
  title: "Components/StickyScrolly",
  component: StickyScrolly,
  parameters: {
    layout: "fullscreen",
    backgrounds: { default: "dark" },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof StickyScrolly>;

export default meta;
type Story = StoryObj<typeof meta>;

function StickyScrollyDemo() {
  const [beat, setBeat] = useState(-1);

  const beats = [
    { id: "intro", text: <p className="text-sm text-white">Beat 0: The chart axes appear, setting the stage for the story.</p> },
    { id: "rise", text: <p className="text-sm text-white">Beat 1: The rank line draws in, revealing the song's trajectory.</p> },
    { id: "peak", text: <p className="text-sm text-white">Beat 2: The chart zooms into the peak region, highlighting the song's best performance.</p> },
    { id: "streams", text: <p className="text-sm text-white">Beat 3: Stream bars appear, showing popularity alongside chart position.</p> },
  ];

  return (
    <div className="mx-auto max-w-6xl bg-[#121212] px-6 py-16">
      <StickyScrolly beats={beats} onBeatChange={setBeat}>
        <div className="flex h-[400px] items-center justify-center rounded-2xl border border-zinc-800 bg-surface p-8">
          <p className="text-2xl font-bold text-white">
            Active beat: <span className="text-accent">{beat}</span>
          </p>
        </div>
      </StickyScrolly>
    </div>
  );
}

export const Default: Story = {
  render: () => <StickyScrollyDemo />,
  args: {
    beats: [],
    onBeatChange: () => {},
    children: null,
  },
};
