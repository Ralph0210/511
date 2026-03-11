"use client";

import Link from "next/link";
import { useState } from "react";
import { useHeaderOverlay } from "@/lib/header-overlay-context";
import SongSearch from "./SongSearch";

const exploreLinks = [
  { href: "/explore/longevity", label: "The Lifespan of a Hit" },
  { href: "/explore/song-anatomy", label: "Anatomy of a Song" },
  { href: "/explore/genre-pulse", label: "Genre Breakdown" },
];

export default function Header() {
  const [exploreOpen, setExploreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { content: overlayContent } = useHeaderOverlay();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-[#121212]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-page items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-black">
            CP
          </div>
          {!overlayContent && (
            <span className="text-lg font-semibold tracking-tight text-white">
              ChartPulse
            </span>
          )}
        </Link>

        {/* Search */}
        <SongSearch className="mx-4 hidden w-56 md:block lg:w-72" />

        {/* Overlay content replaces nav when active */}
        {overlayContent ? (
          <div className="flex flex-1 items-center justify-center">{overlayContent}</div>
        ) : (
        /* Desktop nav */
        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
          >
            Home
          </Link>

          {/* Explore dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setExploreOpen(true)}
            onMouseLeave={() => setExploreOpen(false)}
          >
            <button className="flex items-center gap-1 text-sm font-medium text-zinc-400 transition-colors hover:text-white">
              Explore
              <svg
                className={`h-3.5 w-3.5 transition-transform ${exploreOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {exploreOpen && (
              <div className="absolute left-1/2 top-full -translate-x-1/2 pt-2">
                <div className="w-56 rounded-xl border border-zinc-700 bg-[#282828] p-2 shadow-lg">
                  {exploreLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link
            href="/legacy/billboard"
            className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Legacy
          </Link>
        </nav>
        )}

        {/* Mobile hamburger */}
        {!overlayContent && <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <svg
            className="h-6 w-6 text-zinc-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            {mobileOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>}
      </div>

      {/* Mobile menu */}
      {!overlayContent && mobileOpen && (
        <div className="border-t border-zinc-800 px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            <Link
              href="/"
              className="text-sm font-medium text-zinc-300"
              onClick={() => setMobileOpen(false)}
            >
              Home
            </Link>
            {exploreLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="pl-3 text-sm text-zinc-400"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/legacy/billboard"
              className="text-sm text-zinc-500"
              onClick={() => setMobileOpen(false)}
            >
              Legacy
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
