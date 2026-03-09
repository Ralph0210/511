import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800">
      <div className="mx-auto flex max-w-page items-center justify-between px-6 py-6">
        <p className="text-xs text-zinc-500">
          ChartPulse &middot; Spotify Top 200 data, 2017&ndash;2021
        </p>
        <div className="flex gap-4">
          <Link
            href="/legacy/billboard"
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Billboard (Legacy)
          </Link>
          <Link
            href="/legacy/spotify"
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Spotify (Legacy)
          </Link>
        </div>
      </div>
    </footer>
  );
}
