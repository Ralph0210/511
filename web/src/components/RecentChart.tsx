"use client";

type Entry = { date: string; rank: number; song: string; artist: string; peak_rank: number; weeks_on_board: number };

export default function RecentChart({ date, entries }: { date: string; entries: Entry[] }) {
  const sorted = [...entries].sort((a, b) => a.rank - b.rank);

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#181818] p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">
        Latest Hot 100 – {new Date(date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </h3>
      <div className="max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-zinc-800">
            <tr>
              <th className="py-2 text-left">#</th>
              <th className="py-2 text-left">Song</th>
              <th className="py-2 text-left">Artist</th>
              <th className="py-2 text-right">Peak</th>
              <th className="py-2 text-right">Wks</th>
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 50).map((e) => (
              <tr key={`${e.rank}-${e.song}`} className="border-t border-zinc-800">
                <td className="py-1.5 font-medium">{e.rank}</td>
                <td className="py-1.5">{e.song}</td>
                <td className="py-1.5 text-zinc-400">{e.artist}</td>
                <td className="py-1.5 text-right">{e.peak_rank}</td>
                <td className="py-1.5 text-right">{e.weeks_on_board}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
