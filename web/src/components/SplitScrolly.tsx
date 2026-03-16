"use client"

import { useRef, useState, useEffect } from "react"

export type ScrollBeat = {
  id: string
  text: React.ReactNode
}

type Props = {
  beats: ScrollBeat[]
  onBeatChange: (index: number) => void
  children: React.ReactNode
  className?: string
}

/**
 * Side-by-side scrollytelling: text scrolls on the left, chart sticks on the right.
 */
export default function SplitScrolly({
  beats,
  onBeatChange,
  children,
  className,
}: Props) {
  const beatRefs = useRef<(HTMLDivElement | null)[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    const observers: IntersectionObserver[] = []

    beatRefs.current.forEach((el, i) => {
      if (!el) return
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveIndex(i)
          } else if (
            !entry.isIntersecting &&
            entry.boundingClientRect.top > 0
          ) {
            setActiveIndex((prev) => (prev === i ? i - 1 : prev))
          }
        },
        {
          rootMargin: "-20% 0px -50% 0px",
          threshold: 0.1,
        },
      )
      observer.observe(el)
      observers.push(observer)
    })

    return () => observers.forEach((o) => o.disconnect())
  }, [beats.length])

  useEffect(() => {
    onBeatChange(activeIndex)
  }, [activeIndex, onBeatChange])

  return (
    <div className={`relative mx-auto max-w-6xl px-6 ${className || ""}`}>
      <div className="flex gap-8 md:gap-12">
        {/* Left: scrolling text */}
        <div className="w-full md:w-[45%]">
          <div className="h-[30vh]" />

          {beats.map((beat, i) => (
            <div
              key={beat.id}
              ref={(el) => {
                beatRefs.current[i] = el
              }}
              className={`mb-[65vh] transition-opacity duration-700 ${
                i <= activeIndex ? "opacity-100" : "opacity-[0.03]"
              }`}
            >
              <div
                className={`text-lg font-bold leading-snug sm:text-xl ${
                  i <= activeIndex ? "text-muted" : "text-white"
                }`}
              >
                {beat.text}
              </div>
            </div>
          ))}

          <div className="h-[40vh]" />
        </div>

        {/* Right: sticky chart */}
        <div className="hidden md:block md:w-[55%]">
          <div className="sticky top-[15vh]">{children}</div>
        </div>
      </div>

      {/* Mobile: chart above text (falls back to stacked) */}
      <div className="md:hidden sticky top-[10vh] z-10 -mx-6 px-6 mb-8">
        {children}
      </div>
    </div>
  )
}
