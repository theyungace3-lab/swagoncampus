"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { ShoppingCart, Sun, Moon, Menu, X, Sparkles, User, LogOut, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export function Navbar() {
  const pathname          = usePathname();
  const router            = useRouter();
  const { theme, setTheme } = useTheme();
  const { cartCount, toggleCart } = useCart();
  const { user, profile, isAdmin, signOut } = useAuth();

  const [menuOpen, setMenuOpen]       = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled]       = useState(false);
  const [mounted, setMounted]         = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
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

  async function handleSignOut() {
    await signOut();
    setUserMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  const displayName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Account";
  const initials    = displayName[0]?.toUpperCase() ?? "U";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 navbar-glass transition-all duration-300 ${scrolled ? "shadow-lg" : ""}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group" aria-label="SwagOnCampus Home">
            <Sparkles className="w-6 h-6 transition-transform group-hover:rotate-12 group-hover:scale-110" style={{ color: "var(--gold-primary)" }} />
            <span className="text-xl font-black tracking-tight gold-text hidden sm:block">SwagOnCampus</span>
            <span className="text-xl font-black tracking-tight gold-text sm:hidden">SOC</span>
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
            {/* Dark mode */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-full transition-all duration-200 hover:bg-[rgba(201,146,42,0.1)] text-[var(--text-secondary)] hover:text-[var(--gold-primary)]"
                aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            )}

            {/* Cart */}
            <button
              onClick={toggleCart}
              className="relative p-2 rounded-full transition-all duration-200 hover:bg-[rgba(201,146,42,0.1)] text-[var(--text-secondary)] hover:text-[var(--gold-primary)]"
              aria-label={`Cart (${cartCount})`}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1 badge-pulse"
                  style={{ background: "var(--gold-primary)", color: "#1a0e00" }}
                >
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>

            {/* User menu (desktop) */}
            {mounted && (
              user ? (
                <div className="relative hidden md:block" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full border transition-all hover:border-[var(--gold-primary)]"
                    style={{ borderColor: "var(--border-color)" }}
                    aria-label="Account menu"
                    aria-expanded={userMenuOpen}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                      style={{ background: "var(--gold-primary)", color: "#1a0e00" }}
                    >
                      {initials}
                    </div>
                    <span className="text-xs font-semibold max-w-[80px] truncate" style={{ color: "var(--text-primary)" }}>
                      {displayName}
                    </span>
                    <ChevronDown className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                  </button>

                  {/* Dropdown */}
                  {userMenuOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-48 rounded-2xl border shadow-lg overflow-hidden animate-slide-up"
                      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
                    >
                      <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border-color)" }}>
                        <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{displayName}</p>
                        <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{user.email}</p>
                      </div>
                      <div className="py-1">
                        <Link href="/account" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-[rgba(201,146,42,0.08)] transition-colors"
                          style={{ color: "var(--text-secondary)" }}>
                          <User className="w-4 h-4" /> My Account
                        </Link>
                        {isAdmin && (
                          <Link href="/admin" onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-[rgba(201,146,42,0.08)] transition-colors"
                            style={{ color: "var(--gold-primary)" }}>
                            <Sparkles className="w-4 h-4" /> Admin Panel
                          </Link>
                        )}
                        <button onClick={handleSignOut}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/auth/signin"
                  className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all hover:border-[var(--gold-primary)] hover:text-[var(--gold-primary)]"
                  style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
                >
                  <User className="w-4 h-4" /> Sign In
                </Link>
              )
            )}

            {/* Mobile menu toggle */}
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

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 border-t border-[var(--border-color)] mt-1 animate-slide-up" role="navigation" aria-label="Mobile navigation">
            <div className="flex flex-col gap-1 pt-3">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
                  className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive(link.href)
                      ? "bg-[rgba(201,146,42,0.15)] text-[var(--gold-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[rgba(201,146,42,0.08)] hover:text-[var(--gold-primary)]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <hr className="my-1" style={{ borderColor: "var(--border-color)" }} />
              {user ? (
                <>
                  <Link href="/account" onClick={() => setMenuOpen(false)}
                    className="px-4 py-3 rounded-xl text-sm font-semibold text-[var(--text-secondary)] hover:bg-[rgba(201,146,42,0.08)] hover:text-[var(--gold-primary)] transition-all flex items-center gap-2">
                    <User className="w-4 h-4" /> My Account
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setMenuOpen(false)}
                      className="px-4 py-3 rounded-xl text-sm font-semibold hover:bg-[rgba(201,146,42,0.08)] transition-all flex items-center gap-2"
                      style={{ color: "var(--gold-primary)" }}>
                      <Sparkles className="w-4 h-4" /> Admin Panel
                    </Link>
                  )}
                  <button onClick={() => { handleSignOut(); setMenuOpen(false); }}
                    className="px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-left flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </>
              ) : (
                <Link href="/auth/signin" onClick={() => setMenuOpen(false)}
                  className="px-4 py-3 rounded-xl text-sm font-semibold text-[var(--text-secondary)] hover:bg-[rgba(201,146,42,0.08)] hover:text-[var(--gold-primary)] transition-all flex items-center gap-2">
                  <User className="w-4 h-4" /> Sign In / Create Account
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
