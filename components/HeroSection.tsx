import Link from "next/link";
import { Crown, ShoppingBag } from "lucide-react";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";

export function HeroSection() {
  return (
    <section
      className="relative overflow-hidden hero-gradient glitter-bg"
      aria-label="Hero section"
    >
      {/* Decorative background blobs */}
      <div
        className="animate-blob absolute top-[-10%] right-[-5%] w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, var(--gold-light), transparent)" }}
        aria-hidden="true"
      />
      <div
        className="animate-blob absolute bottom-[-10%] left-[-5%] w-80 h-80 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{
          background: "radial-gradient(circle, var(--brown-mid), transparent)",
          animationDelay: "2.5s",
        }}
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
        <div className="max-w-3xl">
          {/* Tag */}
          <div
            className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-6 border"
            style={{
              animationDelay: "0.05s",
              borderColor: "var(--gold-primary)",
              color: "var(--gold-primary)",
              background: "rgba(201,146,42,0.08)",
            }}
          >
            <Crown className="w-3.5 h-3.5" />
            FUNAAB&apos;s #1 Campus Fashion Store
          </div>

          {/* Headline */}
          <h1
            className="animate-fade-in-up text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6"
            style={{ animationDelay: "0.15s" }}
          >
            <span style={{ color: "var(--text-primary)" }}>Dress Like You</span>
            <br />
            <span className="gold-text">Own the Campus.</span>
          </h1>

          {/* Sub */}
          <p
            className="animate-fade-in-up text-lg sm:text-xl leading-relaxed mb-8 max-w-xl"
            style={{ color: "var(--text-secondary)", animationDelay: "0.25s" }}
          >
            Premium streetwear, trending fits and fresh campus styles, all
            delivered to your hostel. Place your order directly on WhatsApp in
            seconds.
          </p>

          {/* CTAs */}
          <div
            className="animate-fade-in-up flex flex-wrap gap-4"
            style={{ animationDelay: "0.35s" }}
          >
            <Link
              href="/shop"
              className="btn-gold inline-flex items-center gap-2 px-8 py-3.5 text-sm font-bold rounded-full"
            >
              <ShoppingBag className="w-4 h-4" />
              Shop Now
            </Link>
            <a
              href="https://wa.me/2348185319037?text=Hello%2C%20I%27d%20like%20to%20place%20an%20order"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost-gold inline-flex items-center gap-2 px-8 py-3.5 text-sm font-bold rounded-full"
            >
              <WhatsAppIcon className="w-4 h-4" />
              Order on WhatsApp
            </a>
          </div>

          {/* Trust badges */}
          <div
            className="animate-fade-in-up flex flex-wrap items-center gap-5 mt-10 text-xs font-semibold"
            style={{ color: "var(--text-muted)", animationDelay: "0.45s" }}
          >
            {["Fast Campus Delivery", "100% Authentic Pieces"].map((badge) => (
              <span key={badge}>{badge}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
