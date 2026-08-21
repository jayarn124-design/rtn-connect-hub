import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { useUserRole, homeForRole, type UserRole } from "@/hooks/useUserRole";
import { ErrorLine } from "@/components/ErrorLine";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Setu-RTN — Sign in" },
      {
        name: "description",
        content:
          "Setu-RTN: All-India Road Transport Network capacity, marketplace and predictive intelligence for the Department of Posts.",
      },
      { property: "og:title", content: "Setu-RTN — Sign in" },
      {
        property: "og:description",
        content: "Sign in to the Setu-RTN road transport network console.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { isAuthenticated, role } = useUserRole();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupRole, setSignupRole] = useState<UserRole>("dispatcher");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) navigate({ to: homeForRole(role), replace: true });
  }, [isAuthenticated, role, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!supabase) {
      setError(new Error("Supabase is not connected."));
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw new Error(err.message);
      } else {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { role: signupRole } },
        });
        if (err) throw new Error(err.message);
        setNotice("Account created. Sign in to continue.");
        setMode("signin");
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-2xl font-semibold">Setu-RTN</h1>
      {!supabaseConfigured ? (
        <p className="mb-4 text-sm text-destructive">
          Supabase is not connected. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
        </p>
      ) : null}
      <form onSubmit={submit} className="space-y-3">
        <input
          className="w-full rounded-md border px-3 py-2 text-sm"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded-md border px-3 py-2 text-sm"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {mode === "signup" ? (
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={signupRole}
            onChange={(e) => setSignupRole(e.target.value as UserRole)}
          >
            <option value="dispatcher">dispatcher</option>
            <option value="3pl">3pl</option>
            <option value="directorate">directorate</option>
          </select>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Working…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>
      <button
        type="button"
        className="mt-3 text-sm underline underline-offset-2"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
        }}
      >
        {mode === "signin" ? "Create an account" : "Back to sign in"}
      </button>
      {notice ? <p className="mt-2 text-sm text-muted-foreground">{notice}</p> : null}
      <ErrorLine error={error} />
    </main>
  );
}
