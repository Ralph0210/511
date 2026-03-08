"use client";

import { useRef, useState, useEffect } from "react";

export type ScrollBeat = {
  id: string;
  text: React.ReactNode;
};

type Props = {
  beats: ScrollBeat[];
  /** Called when active beat changes (index into beats array, -1 if none) */
  onBeatChange: (index: number) => void;
  /** The sticky visualization */
  children: React.ReactNode;
  className?: string;
};

/**
 * Scrollytelling layout: sticky visualization on the left/top,
 * text panels scroll on the right/bottom. As each text panel enters
 * the viewport center, it becomes "active" and triggers onBeatChange.
 */
export default function StickyScrolly({ beats, onBeatChange, children, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const beatRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    beatRefs.current.forEach((el, i) => {
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveIndex(i);
            onBeatChange(i);
          }
        },
        {
          // Trigger when the beat is near the vertical center of the viewport
          rootMargin: "-40% 0px -40% 0px",
          threshold: 0.1,
        }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [beats.length, onBeatChange]);

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}>
      {/* Desktop: side-by-side. Mobile: stacked (chart on top, text below) */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-8">
        {/* Sticky chart */}
        <div className="lg:col-span-7">
          <div className="lg:sticky lg:top-24">
            {children}
          </div>
        </div>

        {/* Scrolling text beats */}
        <div className="mt-8 lg:col-span-5 lg:mt-0">
          {/* Top spacer so first beat can reach center */}
          <div className="h-[30vh]" />

          {beats.map((beat, i) => (
            <div
              key={beat.id}
              ref={(el) => { beatRefs.current[i] = el; }}
              className={`mb-[40vh] transition-opacity duration-500 ${
                activeIndex === i ? "opacity-100" : "opacity-30"
              }`}
            >
              <div className="rounded-xl bg-white/90 p-6 shadow-sm backdrop-blur-sm dark:bg-zinc-900/90">
                {beat.text}
              </div>
            </div>
          ))}

          {/* Bottom spacer so last beat can reach center */}
          <div className="h-[40vh]" />
        </div>
      </div>
    </div>
  );
}
