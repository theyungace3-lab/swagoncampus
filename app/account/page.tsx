"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { User, ShoppingBag, MapPin, Phone, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function AccountPage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/auth/signin?redirect=/account");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--gold-primary)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-3 mb-8">
        <Sparkles className="w-6 h-6" style={{ color: "var(--gold-primary)" }} />
        <h1 className="text-3xl font-black gold-text">My Account</h1>
      </div>

      <hr className="gold-divider mb-8" />

      {/* Profile card */}
      <div className="luxury-card p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black"
            style={{ background: "rgba(201,146,42,0.12)", color: "var(--gold-primary)" }}
          >
            {profile?.full_name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div>
            <p className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
              {profile?.full_name || "Campus Student"}
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{user.email}</p>
          </div>
        </div>

        <div className="space-y-3">
          {profile?.phone && (
            <div className="flex items-center gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
              <Phone className="w-4 h-4" style={{ color: "var(--gold-primary)" }} />
              {profile.phone}
            </div>
          )}
          {profile?.hostel && (
            <div className="flex items-center gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
              <MapPin className="w-4 h-4" style={{ color: "var(--gold-primary)" }} />
              {profile.hostel}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          href="/shop"
          className="luxury-card p-5 flex items-center gap-3 hover:border-[var(--gold-primary)] transition-all"
        >
          <ShoppingBag className="w-6 h-6" style={{ color: "var(--gold-primary)" }} />
          <div>
            <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Browse Shop</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Shop the latest drops</p>
          </div>
        </Link>
        <Link
          href="/cart"
          className="luxury-card p-5 flex items-center gap-3 hover:border-[var(--gold-primary)] transition-all"
        >
          <User className="w-6 h-6" style={{ color: "var(--gold-primary)" }} />
          <div>
            <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>My Cart</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Review your items</p>
          </div>
        </Link>
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 text-sm font-semibold hover:text-red-500 transition-colors"
        style={{ color: "var(--text-muted)" }}
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>
    </div>
  );
}
