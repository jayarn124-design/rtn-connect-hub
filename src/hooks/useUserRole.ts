import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type UserRole = "dispatcher" | "3pl" | "directorate";

export const ALL_ROLES: UserRole[] = ["dispatcher", "3pl", "directorate"];

function readRole(session: Session | null): UserRole | null {
  const user = session?.user;
  if (!user) return null;
  const raw =
    (user.app_metadata as Record<string, unknown> | undefined)?.['role'] ??
    (user.user_metadata as Record<string, unknown> | undefined)?.['role'];
  return typeof raw === "string" && (ALL_ROLES as string[]).includes(raw)
    ? (raw as UserRole)
    : null;
}

/**
 * Single source of session + role for the whole app.
 * Consumed by the route guard and the nav; never duplicate role logic per screen.
 */
export function useUserRole() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    loading,
    role: readRole(session),
    email: session?.user.email ?? null,
    isAuthenticated: Boolean(session),
  };
}

export function homeForRole(role: UserRole | null): string {
  if (role === "3pl") return "/marketplace";
  if (role === "directorate") return "/predictions";
  return "/fleet";
}
