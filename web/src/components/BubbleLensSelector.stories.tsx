import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import BubbleLensSelector, { type LensType, type DepthAxisType } from "./BubbleLensSelector";

const meta = {
  title: "Bubble Explorer/BubbleLensSelector",
  component: BubbleLensSelector,
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
} satisfies Meta<typeof BubbleLensSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

// --- Default: genre selected, no depth axis ---
export const Default: Story = {
  args: {
    activeLens: "genre",
    onLensChange: () => {},
  },
};

// --- Longevity selected ---
export const LongevityActive: Story = {
  args: {
    activeLens: "longevity",
    onLensChange: () => {},
  },
};

// --- With depth axis (inside a category) ---
export const WithDepthAxis: Story = {
  args: {
    activeLens: "genre",
    onLensChange: () => {},
    activeCategory: "Pop",
    depthAxis: "streams",
    onDepthChange: () => {},
  },
};

// --- Depth axis: weeks selected ---
export const DepthWeeks: Story = {
  args: {
    activeLens: "genre",
    onLensChange: () => {},
    activeCategory: "Hip Hop/Rap",
    depthAxis: "weeks",
    onDepthChange: () => {},
  },
};

// --- Compact mode (for navbar) ---
export const Compact: Story = {
  args: {
    activeLens: "genre",
    onLensChange: () => {},
    compact: true,
  },
};

// --- Compact with depth ---
export const CompactWithDepth: Story = {
  args: {
    activeLens: "longevity",
    onLensChange: () => {},
    compact: true,
    activeCategory: "Sustained Hits",
    depthAxis: "peak",
    onDepthChange: () => {},
  },
};

// --- Interactive: clickable ---
function InteractiveLens() {
  const [lens, setLens] = useState<LensType>("genre");
  const [depth, setDepth] = useState<DepthAxisType>("streams");
  const [inCategory, setInCategory] = useState(false);

  return (
    <div className="space-y-4">
      <BubbleLensSelector
        activeLens={lens}
        onLensChange={setLens}
        activeCategory={inCategory ? "Pop" : null}
        depthAxis={depth}
        onDepthChange={setDepth}
      />
      <button
        onClick={() => setInCategory(!inCategory)}
        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
      >
        {inCategory ? "Exit category (hide depth)" : "Enter category (show depth)"}
      </button>
    </div>
  );
}

export const Interactive: Story = {
  args: { activeLens: "genre", onLensChange: () => {} },
  render: () => <InteractiveLens />,
};
