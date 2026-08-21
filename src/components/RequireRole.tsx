import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import { supabaseConfigured } from "@/lib/supabase";
import { Loading } from "@/components/ErrorLine";

/**
 * Single top-level route guard. Screens never re-check roles themselves.
 */
export function RequireRole({
  allow,
  children,
}: {
  allow: UserRole[];
  children: ReactNode;
}) {
  const { loading, isAuthenticated, role } = useUserRole();

  if (!supabaseConfigured) {
    return (
      <p className="p-6 text-sm text-destructive">
        Supabase is not connected. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
      </p>
    );
  }
  if (loading) return <div className="p-6"><Loading /></div>;
  if (!isAuthenticated) {
    return (
      <p className="p-6 text-sm">
        Not signed in. <Link to="/" className="underline">Go to login</Link>
      </p>
    );
  }
  if (!role || !allow.includes(role)) {
    return (
      <p className="p-6 text-sm text-destructive">
        Your role ({role ?? "none"}) does not have access to this screen.
      </p>
    );
  }
  return <>{children}</>;
}

export function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-semibold">{title}</h1>
      {children}
    </main>
  );
}
