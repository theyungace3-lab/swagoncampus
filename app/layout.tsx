import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CartProvider } from "@/contexts/CartContext";
import { ProductsProvider } from "@/contexts/ProductsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SiteChrome } from "@/components/SiteChrome";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SwagOnCampus | Campus Fashion for FUNAAB Students",
    template: "%s | SwagOnCampus",
  },
  description:
    "Shop the freshest fits for FUNAAB students. Tops, jackets, hoodies, trousers, jeans, footwear, watches, accessories and corporate dresses. Order instantly via WhatsApp.",
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col js" style={{ background: "var(--bg-primary)" }}>
        <ThemeProvider>
          <AuthProvider>
            <ProductsProvider>
              <CartProvider>
                <SiteChrome>{children}</SiteChrome>
              </CartProvider>
            </ProductsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
