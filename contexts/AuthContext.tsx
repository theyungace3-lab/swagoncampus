"use client";

import React, {
  createContext, useContext, useEffect, useState, useCallback
} from "react";
import type {
  User, Session, AuthChangeEvent
} from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { DbProfile } from "@/lib/supabase/types";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: DbProfile | null;
  isAdmin: boolean;
  isVendor: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const isAdmin    = !!adminEmail && !!user && user.email?.toLowerCase() === adminEmail;
  const isVendor   = !isAdmin && profile?.role === "vendor";

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await createClient()
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      setProfile(data ?? null);
    } catch { /* ignore */ }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    function applySession(s: Session | null) {
      if (!active) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        void fetchProfile(s.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    }

    // Read the session already stored in cookies.
    supabase.auth.getSession().then(
      ({ data: { session: s } }: { data: { session: Session | null } }) => applySession(s)
    );

    // Single persistent listener — the singleton client ensures this only ever
    // fires once and stays alive across navigations. INITIAL_SESSION is handled
    // too so state cannot be left stale by a slower getSession() resolving after
    // a refresh or sign-out event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, s: Session | null) => applySession(s)
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]); // stable — fetchProfile is useCallback

  const signOut = useCallback(async () => {
    await createClient().auth.signOut();
    window.location.href = "/";
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, profile, isAdmin, isVendor, loading, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
