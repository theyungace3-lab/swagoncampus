"use client";

import React, {
  createContext, useContext, useEffect, useState, useCallback, useRef
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
  profileError: string | null;
  isAdmin: boolean;
  isVendor: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<{ session: Session | null; ready: boolean }>({ session: null, ready: false });
  const [profileState, setProfileState] = useState<{ userId: string; value: DbProfile | null; error: string | null } | null>(null);
  const activeUserId = useRef<string | null>(null);
  const profileRequest = useRef(0);
  const session = authState.session;
  const user = session?.user ?? null;
  const userId = user?.id ?? null;
  const profile = profileState?.userId === userId ? profileState?.value ?? null : null;
  const profileError = profileState?.userId === userId ? profileState?.error ?? null : null;
  const loading = !authState.ready || (!!userId && profileState?.userId !== userId);

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const isAdmin    = !!adminEmail && !!user && user.email?.toLowerCase() === adminEmail;
  const isVendor   = !!user && !isAdmin && profile?.role === "vendor";

  const fetchProfile = useCallback((userId: string) => {
    const request = ++profileRequest.current;
    // Schedule I/O outside Supabase's synchronous auth notification/lock.
    return Promise.resolve().then(() => createClient()
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()
    ).then(({ data, error }) => {
      if (error) throw error;
      if (activeUserId.current === userId && profileRequest.current === request) {
        setProfileState({ userId, value: data, error: null });
      }
    }).catch(() => {
      if (activeUserId.current === userId && profileRequest.current === request) {
        setProfileState({ userId, value: null, error: "Could not load your account permissions. Check your connection and retry." });
      }
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    if (userId) await fetchProfile(userId);
  }, [userId, fetchProfile]);

  useEffect(() => {
    const supabase = createClient();
    const pendingProfile = profileRequest;
    let active = true;

    // INITIAL_SESSION restores cookies. A second getSession() call can race
    // later sign-in/sign-out events, so the subscription is the only source.
    // Do not perform Supabase queries inside its auth lock; the effect below
    // loads permissions after the session event has returned.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (!active) return;
        const nextUserId = session?.user.id ?? null;
        if (activeUserId.current !== nextUserId) {
          activeUserId.current = nextUserId;
          profileRequest.current++;
          setProfileState(null);
        }
        setAuthState({ session, ready: true });
      }
    );

    return () => {
      active = false;
      pendingProfile.current++;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const pendingProfile = profileRequest;
    if (userId) void fetchProfile(userId);
    return () => { pendingProfile.current++; };
  }, [userId, fetchProfile]);

  const signOut = useCallback(async () => {
    await createClient().auth.signOut();
    window.location.assign(window.location.origin);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, profile, profileError, isAdmin, isVendor, loading, signOut, refreshProfile }}
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
