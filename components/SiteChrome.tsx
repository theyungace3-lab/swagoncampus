"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { FloatingCartButton } from "@/components/FloatingCartButton";

/**
 * Renders the store's chrome (fixed navbar, footer, cart drawer) around public
 * pages only. The admin and vendor panels are standalone tools that draw their
 * own header, so they render bare.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPanel = pathname.startsWith("/admin") || pathname.startsWith("/vendor");

  if (isPanel) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
      <FloatingCartButton />
      <CartDrawer />
    </>
  );
}
