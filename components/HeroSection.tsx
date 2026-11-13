import Image from "next/image";
import Link from "next/link";
import { Crown, ShoppingBag } from "lucide-react";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { waOrderUrl, WA_ORDER_MESSAGE } from "@/lib/whatsapp";
import styles from "./HeroSection.module.css";

export function HeroSection() {
  return (
    <section
      className="relative isolate overflow-clip hero-gradient"
      aria-label="Hero section"
    >
      <div className={styles.artwork} aria-hidden="true">
        <div className={styles.emblemScene}>
          <div className={styles.emblem}>
            <Image
              src="/hero-emblem.svg"
              alt=""
              width={1000}
              height={1000}
              loading="eager"
              draggable={false}
              className={styles.emblemImage}
            />
          </div>
        </div>
        <svg
          className={styles.hanger}
          viewBox="0 0 72 60"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          focusable="false"
        >
          <path d="M30 16a6 6 0 1 1 9 5c-2 1-3 3-3 6v2l26 16c3 2 2 6-2 6H12c-4 0-5-4-2-6l26-16" />
        </svg>
        <svg
          className={styles.tag}
          viewBox="0 0 48 72"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          focusable="false"
        >
          <path d="M24 25c-9-8-7-20 0-21 9-1 11 10 3 15" />
          <path d="m8 31 16-13 16 13v33H8Z" />
          <circle cx="24" cy="30" r="2.5" />
          <path d="M17 47h14m-14 7h9" />
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
        <div className="max-w-3xl">
          {/* Tag */}
          <div
            className={`${styles.eyebrow} animate-fade-in-up inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-6 border`}
            style={{
              animationDelay: "0.05s",
              borderColor: "var(--gold-primary)",
              color: "var(--gold-primary)",
              background: "var(--hero-badge-background, rgba(201,146,42,0.08))",
            }}
          >
            <Crown className="w-3.5 h-3.5" />
            FUNAAB&apos;s #1 Campus Fashion Store
          </div>

          {/* Headline */}
          <h1
            className={`${styles.headline} animate-fade-in-up text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6`}
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
            Welcome to Swag Headquarters, your plug for brand-new clean fits
            and handpicked thrifted styles. Upgrade your wardrobe, step out in
            style, and get your order delivered straight to your hostel in
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
              href={waOrderUrl(WA_ORDER_MESSAGE)}
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
