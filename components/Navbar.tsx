"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useCart } from "@/contexts/CartContext";
import { ShoppingCart, Sun, Moon, Menu, X, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

export function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { cartCount, toggleCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    { href: "/shop?category=tops", label: "Tops" },
    { href: "/shop?category=bottoms", label: "Bottoms" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href.split("?")[0]);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 navbar-glass transition-all duration-300 ${
        scrolled ? "shadow-lg" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group" aria-label="SwagOnCampus Home">
            <div className="relative">
              <Sparkles
                className="w-6 h-6 transition-transform group-hover:rotate-12 group-hover:scale-110"
                style={{ color: "var(--gold-primary)" }}
              />
            </div>
            <span
              className="text-xl font-black tracking-tight gold-text hidden sm:block"
            >
              SwagOnCampus
            </span>
            <span
              className="text-xl font-black tracking-tight gold-text sm:hidden"
            >
              SOC
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  isActive(link.href)
                    ? "btn-gold text-xs px-4 py-2"
                    : "text-[var(--text-secondary)] hover:text-[var(--gold-primary)] hover:bg-[rgba(201,146,42,0.08)]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Dark Mode Toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-full transition-all duration-200 hover:bg-[rgba(201,146,42,0.1)] text-[var(--text-secondary)] hover:text-[var(--gold-primary)]"
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
            )}

            {/* Cart Button */}
            <button
              onClick={toggleCart}
              className="relative p-2 rounded-full transition-all duration-200 hover:bg-[rgba(201,146,42,0.1)] text-[var(--text-secondary)] hover:text-[var(--gold-primary)]"
              aria-label={`Shopping cart with ${cartCount} items`}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1 badge-pulse"
                  style={{
                    background: "var(--gold-primary)",
                    color: "#1a0e00",
                  }}
                >
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 rounded-full transition-all duration-200 hover:bg-[rgba(201,146,42,0.1)] text-[var(--text-secondary)]"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div
            className="md:hidden pb-4 border-t border-[var(--border-color)] mt-1 animate-slide-up"
            role="navigation"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col gap-1 pt-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive(link.href)
                      ? "bg-[rgba(201,146,42,0.15)] text-[var(--gold-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[rgba(201,146,42,0.08)] hover:text-[var(--gold-primary)]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
