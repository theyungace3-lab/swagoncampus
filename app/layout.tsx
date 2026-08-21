import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CartProvider } from "@/contexts/CartContext";
import { ProductsProvider } from "@/contexts/ProductsContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SwagOnCampus.... Campus Fashion for FUNAAB Students",
    template: "%s | SwagOnCampus",
  },
  description:
    "Shop the freshest fits for FUNAAB students. Tops, bottoms, dresses, sneakers and more. Order instantly via WhatsApp.",
  keywords: ["FUNAAB", "campus fashion", "student clothing", "Nigeria fashion", "SwagOnCampus"],
  openGraph: {
    siteName: "SwagOnCampus",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geist.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
        <ThemeProvider>
          <ProductsProvider>
            <CartProvider>
              <Navbar />
              <main className="flex-1 pt-16">
                {children}
              </main>
              <Footer />
              <CartDrawer />
            </CartProvider>
          </ProductsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
