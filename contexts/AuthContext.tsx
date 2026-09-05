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

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "";
  const isAdmin    = !!user && user.email === adminEmail;

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
    // Get existing session on mount
    createClient().auth.getSession().then(
      ({ data: { session: s } }: { data: { session: Session | null } }) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) fetchProfile(s.user.id);
        setLoading(false);
      }
    );

    // Single persistent listener — the singleton client ensures
    // this only ever fires once and stays alive across navigations
    const { data: { subscription } } = createClient().auth.onAuthStateChange(
      (event: AuthChangeEvent, s: Session | null) => {
        // Ignore INITIAL_SESSION — we handle it above via getSession
        if (event === "INITIAL_SESSION") return;

        setSession(s);
        setUser(s?.user ?? null);

        if (s?.user) {
          fetchProfile(s.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]); // stable — fetchProfile is useCallback

  const signOut = useCallback(async () => {
    await createClient().auth.signOut();
    window.location.href = "/";
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, profile, isAdmin, loading, signOut, refreshProfile }}
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
