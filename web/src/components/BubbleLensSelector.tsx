"use client";

export type LensType = "genre" | "longevity";
export type DepthAxisType = "streams" | "weeks" | "peak";

type Props = {
  activeLens: LensType;
  onLensChange: (lens: LensType) => void;
  // Depth axis (shown when inside a category)
  activeCategory?: string | null;
  depthAxis?: DepthAxisType;
  onDepthChange?: (axis: DepthAxisType) => void;
  /** Compact mode for rendering inside the header navbar */
  compact?: boolean;
};

const LENSES: { id: LensType; label: string; description: string }[] = [
  { id: "genre", label: "By Genre", description: "Group songs by their musical genre" },
  { id: "longevity", label: "Viral vs Lasting", description: "Group songs by chart impact and endurance" },
];

const DEPTH_AXES: { id: DepthAxisType; label: string }[] = [
  { id: "streams", label: "Peak Streams" },
  { id: "weeks", label: "Weeks on Chart" },
  { id: "peak", label: "Peak Rank" },
];

export default function BubbleLensSelector({
  activeLens,
  onLensChange,
  activeCategory,
  depthAxis = "streams",
  onDepthChange,
  compact = false,
}: Props) {
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5">
          {LENSES.map(({ id, label, description }) => {
            const isActive = activeLens === id;
            return (
              <button
                key={id}
                onClick={() => onLensChange(id)}
                title={description}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-accent text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {activeCategory && onDepthChange && (
          <>
            <div className="h-4 w-px bg-zinc-700" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-zinc-500">Depth:</span>
              {DEPTH_AXES.map(({ id, label }) => {
                const isActive = depthAxis === id;
                return (
                  <button
                    key={id}
                    onClick={() => onDepthChange(id)}
                    className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
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
          </>
        )}
      </div>
    );
  }

  return (
    <div className="py-3">
      <div className="flex items-center gap-3 overflow-x-auto">
        <div className="flex gap-2">
          {LENSES.map(({ id, label, description }) => {
            const isActive = activeLens === id;
            return (
              <button
                key={id}
                onClick={() => onLensChange(id)}
                title={description}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent text-black"
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
          <>
            <div className="h-5 w-px bg-zinc-700" />
            <div className="flex items-center gap-2">
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
          </>
        )}
      </div>
    </div>
  );
}
