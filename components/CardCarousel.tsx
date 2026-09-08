"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function CardCarousel({ children }: { children: React.ReactNode[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Always read the real, current scroll position — never trust stale state for navigation.
  const getCurrentIndex = () => {
    const track = trackRef.current;
    if (!track) return 0;
    const containerCenter = track.scrollLeft + track.clientWidth / 2;
    let closest = 0;
    let minDistance = Infinity;
    slideRefs.current.forEach((el, i) => {
      if (!el) return;
      const elCenter = el.offsetLeft + el.offsetWidth / 2;
      const distance = Math.abs(elCenter - containerCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closest = i;
      }
    });
    return closest;
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame: number;
    const handleScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setActiveIndex(getCurrentIndex()));
    };
    track.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const center = () => slideRefs.current[0]?.scrollIntoView({ inline: "center", block: "nearest" });
    center();
    const raf = requestAnimationFrame(center);
    window.addEventListener("resize", center);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", center);
    };
  }, []);

  const goTo = (direction: 1 | -1) => {
    const current = getCurrentIndex();
    const target = Math.min(Math.max(current + direction, 0), slideRefs.current.length - 1);
    slideRefs.current[target]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="flex items-start overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide gap-5 py-3"
      >
        <div className="shrink-0 w-[11%] sm:w-[33%]" aria-hidden="true" />

        {children.map((child, i) => (
          <div
            key={i}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            className={`w-[78%] sm:w-[34%] shrink-0 snap-center transition-all duration-300 ${
              i === activeIndex
                ? "opacity-100 scale-105 ring-2 ring-foreground/15 shadow-2xl rounded-[28px]"
                : "opacity-40 scale-85"
            }`}
          >
            {child}
          </div>
        ))}

        <div className="shrink-0 w-[11%] sm:w-[33%]" aria-hidden="true" />
      </div>

      <button
        type="button"
        onClick={() => goTo(-1)}
        aria-label="Previous"
        className="absolute left-1 sm:-left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-foreground hover:bg-secondary transition cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => goTo(1)}
        aria-label="Next"
        className="absolute right-1 sm:-right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-foreground hover:bg-secondary transition cursor-pointer"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
