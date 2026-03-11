"use client";

export type LensType = "genre" | "longevity" | "streams" | "sound";
export type DepthAxisType = "streams" | "weeks" | "peak";

type Props = {
  activeLens: LensType;
  onLensChange: (lens: LensType) => void;
  soundDisabled?: boolean;
  // Depth axis (shown when inside a category)
  activeCategory?: string | null;
  depthAxis?: DepthAxisType;
  onDepthChange?: (axis: DepthAxisType) => void;
};

const LENSES: { id: LensType; label: string }[] = [
  { id: "genre", label: "By Genre" },
  { id: "longevity", label: "Viral vs Lasting" },
  { id: "streams", label: "By Streams" },
  { id: "sound", label: "By Sound" },
];

const DEPTH_AXES: { id: DepthAxisType; label: string }[] = [
  { id: "streams", label: "Peak Streams" },
  { id: "weeks", label: "Weeks on Chart" },
  { id: "peak", label: "Peak Rank" },
];

export default function BubbleLensSelector({
  activeLens,
  onLensChange,
  soundDisabled = true,
  activeCategory,
  depthAxis = "streams",
  onDepthChange,
}: Props) {
  return (
    <div className="sticky top-16 z-30 bg-[#121212]/90 py-3 backdrop-blur">
      <div className="flex gap-2 overflow-x-auto">
        {LENSES.map(({ id, label }) => {
          const isActive = activeLens === id;
          const isDisabled = id === "sound" && soundDisabled;

          return (
            <button
              key={id}
              onClick={() => !isDisabled && onLensChange(id)}
              disabled={isDisabled}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent text-black"
                  : isDisabled
                    ? "cursor-not-allowed border border-zinc-800 bg-surface text-zinc-600"
                    : "border border-zinc-800 bg-surface text-[#B3B3B3] hover:border-zinc-700 hover:text-white"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Depth axis selector — visible when inside a category */}
      {activeCategory && onDepthChange && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-500">Depth:</span>
          {DEPTH_AXES.map(({ id, label }) => {
            const isActive = depthAxis === id;
            return (
              <button
                key={id}
                onClick={() => onDepthChange(id)}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-white/15 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
