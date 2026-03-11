"use client";

export type LensType = "all" | "genre" | "longevity" | "streams" | "sound";

type Props = {
  activeLens: LensType;
  onLensChange: (lens: LensType) => void;
  soundDisabled?: boolean;
};

const LENSES: { id: LensType; label: string }[] = [
  { id: "all", label: "All Songs" },
  { id: "genre", label: "By Genre" },
  { id: "longevity", label: "Viral vs Lasting" },
  { id: "streams", label: "By Streams" },
  { id: "sound", label: "By Sound" },
];

export default function BubbleLensSelector({
  activeLens,
  onLensChange,
  soundDisabled = true,
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
    </div>
  );
}
