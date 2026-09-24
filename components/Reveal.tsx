"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section";
}

function hasIntersectionObserver(): boolean {
  return typeof window !== "undefined" && typeof IntersectionObserver !== "undefined";
}

// Fades + slides content up when it scrolls into view (once)
export function Reveal({ children, delay = 0, className = "", as = "div" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Without IntersectionObserver support, render visible immediately
  const [visible, setVisible] = useState(() => !hasIntersectionObserver());

  useEffect(() => {
    const el = ref.current;
    if (!el || visible || !hasIntersectionObserver()) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  const Tag = as;

  return (
    <Tag
      ref={ref as never}
      className={`reveal ${visible ? "reveal-visible" : ""} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
