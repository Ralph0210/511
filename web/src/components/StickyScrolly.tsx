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
 * Scrollytelling layout: first beat static below chapter title,
 * chart directly below it, sticks when scrolling, text scrolls over.
 */
export default function StickyScrolly({ beats, onBeatChange, children, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const beatRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [chartTop, setChartTop] = useState<number | null>(null);

  const scrollBeats = beats.slice(1);

  // Measure where the chart naturally sits so we can pin it there
  useEffect(() => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    // Calculate the top offset that pins the chart to the bottom of viewport
    const viewportBottom = window.innerHeight;
    const chartHeight = rect.height;
    setChartTop(viewportBottom - chartHeight - 24); // 24px = pb-6
  }, [children]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    beatRefs.current.forEach((el, i) => {
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveIndex(i);
          } else if (!entry.isIntersecting && entry.boundingClientRect.top > 0) {
            setActiveIndex((prev) => (prev === i ? i - 1 : prev));
          }
        },
        {
          rootMargin: "-15% 0px -55% 0px",
          threshold: 0.1,
        }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [scrollBeats.length]);

  // Single source of truth: derive beat from activeIndex
  useEffect(() => {
    onBeatChange(activeIndex + 1);
  }, [activeIndex, onBeatChange]);

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}>
      {/* Beat 0: static, directly below chapter title */}
      {beats.length > 0 && (
        <div className="mx-auto max-w-6xl px-6 mb-6">
          <div className="max-w-[70%] text-lg font-bold leading-snug text-muted sm:text-xl md:text-2xl">
            {beats[0].text}
          </div>
        </div>
      )}

      {/* Chart: sticks to bottom of viewport */}
      <div
        ref={chartRef}
        className="sticky z-10 w-full px-6"
        style={{ top: chartTop != null ? `${chartTop}px` : "auto" }}
      >
        {children}
      </div>

      {/* Remaining beats scroll over the chart */}
      {scrollBeats.length > 0 && (
        <div className="relative z-20">
          <div className="h-[40vh]" />

          {scrollBeats.map((beat, i) => (
            <div
              key={beat.id}
              ref={(el) => { beatRefs.current[i] = el; }}
              className={`mx-auto mb-[60vh] max-w-6xl px-6 transition-opacity duration-700 ${
                i <= activeIndex ? "opacity-100" : "opacity-[0.05]"
              }`}
            >
              <div className={`max-w-[70%] text-lg font-bold leading-snug sm:text-xl md:text-2xl ${
                i <= activeIndex ? "text-muted" : "text-white"
              }`}>
                {beat.text}
              </div>
            </div>
          ))}

          <div className="h-[60vh]" />
        </div>
      )}
    </div>
  );
}
