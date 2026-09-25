"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section";
}

// How long to wait for the observer before showing the content anyway.
// Content must never be able to get stuck invisible.
const REVEAL_TIMEOUT = 1500;

/**
 * Fades and slides content in when it scrolls into view.
 *
 * - Renders identically on the server and the client (no hydration mismatch).
 * - Only applies the hidden state when JavaScript is running, so the content
 *   is still visible with JS disabled.
 * - Always reveals within REVEAL_TIMEOUT even if the observer never fires.
 */
export function Reveal({ children, delay = 0, className = "", as = "div" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;

    const show = () => setVisible(true);

    // Safety net: reveal no matter what.
    const timeout = setTimeout(show, REVEAL_TIMEOUT);

    if (typeof IntersectionObserver === "undefined") {
      show();
      clearTimeout(timeout);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) show();
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
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
