"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import type { ReactNode } from "react";

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || /^\/(admin|api)(\/|$)/.test(pathname)) {
      lastPath.current = pathname;
      return;
    }

    function onVisible() {
      if (document.visibilityState !== "visible") return;
      // A ref also prevents React Strict Mode from recording a second pageview.
      if (lastPath.current !== pathname) {
        lastPath.current = pathname;
        trackEvent("pageview", pathname);
      } else {
        trackEvent("heartbeat", pathname);
      }
    }

    onVisible();
    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === "visible") trackEvent("heartbeat", pathname);
    }, 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname]);

  useEffect(() => {
    // Capture handles stopped propagation, server-rendered links, and nested SVGs.
    function onClickCapture(event: MouseEvent) {
      if (event.type === "auxclick" ? event.button !== 1 : event.button !== 0) return;
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;
      if (anchor.protocol === "https:" && anchor.hostname === "wa.me") {
        // A checkout click is also a WhatsApp click in the server summary.
        trackEvent(anchor.dataset.analyticsCheckout === "true" ? "checkout_start" : "whatsapp_click");
      }
    }

    document.addEventListener("click", onClickCapture, true);
    document.addEventListener("auxclick", onClickCapture, true);
    return () => {
      document.removeEventListener("click", onClickCapture, true);
      document.removeEventListener("auxclick", onClickCapture, true);
    };
  }, []);

  return <>{children}</>;
}
