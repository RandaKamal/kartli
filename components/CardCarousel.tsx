"use client";

import { useEffect, useRef, useState } from "react";


export function CardCarousel({ children }: { children: React.ReactNode[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

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
    const center = () => {
      const track = trackRef.current;
      const first = slideRefs.current[0];
      if (!track || !first) return;
      track.scrollLeft = first.offsetLeft - (track.clientWidth - first.offsetWidth) / 2;
    };
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
        className="flex items-start overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide gap-5 py-3 touch-pan-x"
      >
        <div className="shrink-0 w-[11%] sm:w-[33%]" aria-hidden="true" />

        {children.map((child, i) => (
          <div
            key={i}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            onClick={() => {
              if (i !== activeIndex) {
                slideRefs.current[i]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
              }
            }}
            className={`w-[78%] sm:w-[34%] shrink-0 snap-center transition-all duration-300 flex flex-col ${
              i === activeIndex
                ? "opacity-100 scale-105 ring-2 ring-foreground/15 shadow-2xl rounded-2xl"
                : "opacity-40 scale-85 cursor-pointer"
            }`}
          >
            {child}
          </div>
        ))}

        <div className="shrink-0 w-[11%] sm:w-[33%]" aria-hidden="true" />
      </div>



      <div className="flex justify-center gap-1.5 mt-4">
        {children.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => slideRefs.current[i]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })}
            className={`cursor-pointer ${
              i === activeIndex
                ? "bg-primary w-5 h-1.5 rounded-full transition-all"
                : "bg-border w-1.5 h-1.5 rounded-full transition-all"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
