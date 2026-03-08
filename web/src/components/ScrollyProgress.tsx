"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** Callback with progress 0-1 as user scrolls through the element */
  onProgress: (progress: number) => void;
  children: React.ReactNode;
  className?: string;
};

export default function ScrollyProgress({ onProgress, children, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight;
      // Progress: 0 when element top hits viewport bottom, 1 when element bottom hits viewport top
      const total = rect.height + viewH;
      const scrolled = viewH - rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / total));
      onProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // initial
    return () => window.removeEventListener("scroll", handleScroll);
  }, [onProgress]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
