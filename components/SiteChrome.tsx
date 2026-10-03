"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { FloatingCartButton } from "@/components/FloatingCartButton";

/**
 * Renders the store's chrome (fixed navbar, footer, cart drawer) around public
 * pages only. The admin panel is a standalone tool and already draws its own
 * header, so it renders bare.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <Navbar />
      {/* pt-32 clears the fixed navbar plus the always-visible mobile search row (h-16 + py-3 + h-10 = 128px) */}
      <main className="flex-1 pt-32 md:pt-16">{children}</main>
      <Footer />
      <FloatingCartButton />
      <CartDrawer />
    </>
  );
}
