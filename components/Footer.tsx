import Link from "next/link";
import { Sparkles, MapPin, MessageCircle } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="mt-auto border-t border-[var(--border-color)]"
      style={{ background: "var(--bg-secondary)" }}
    >
      {/* Gold divider */}
      <hr className="gold-divider" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6" style={{ color: "var(--gold-primary)" }} />
              <span className="text-xl font-black gold-text">SwagOnCampus</span>
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-muted)" }}>
              The number one campus fashion destination for FUNAAB students.
              Drip in style, order via WhatsApp — fast, easy, delivered.
            </p>
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: "var(--gold-primary)" }} />
              <span>Federal University of Agriculture, Abeokuta (FUNAAB)</span>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3
              className="font-bold text-sm uppercase tracking-widest mb-4"
              style={{ color: "var(--gold-primary)" }}
            >
              Shop
            </h3>
            <ul className="space-y-2">
              {[
                { label: "All Items", href: "/shop" },
                { label: "Tops", href: "/shop?category=tops" },
                { label: "Bottoms", href: "/shop?category=bottoms" },
                { label: "Dresses", href: "/shop?category=dresses" },
                { label: "Hoodies", href: "/shop?category=hoodies" },
                { label: "Footwear", href: "/shop?category=footwear" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors duration-200 hover:text-[var(--gold-primary)]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3
              className="font-bold text-sm uppercase tracking-widest mb-4"
              style={{ color: "var(--gold-primary)" }}
            >
              Order Now
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              See something you like? Tap the WhatsApp button on any product to place your order instantly.
            </p>
            <a
              href="https://wa.me/2348185319037?text=Hello%2C%20I%27d%20like%20to%20place%20an%20order"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-105"
              style={{
                background: "#25D366",
                color: "white",
              }}
            >
              <MessageCircle className="w-4 h-4" />
              Chat on WhatsApp
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
          style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
        >
          <p>© {currentYear} SwagOnCampus. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made with <span style={{ color: "var(--gold-primary)" }}>✦</span> for FUNAAB students
          </p>
        </div>
      </div>
    </footer>
  );
}
