import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";

const ITEMS: { to: string; label: string; roles: UserRole[] }[] = [
  { to: "/fleet", label: "Capacity", roles: ["dispatcher", "directorate"] },
  { to: "/marketplace", label: "Marketplace", roles: ["dispatcher", "3pl", "directorate"] },
  { to: "/twin", label: "Digital Twin", roles: ["dispatcher", "3pl", "directorate"] },
  { to: "/ulip", label: "ULIP Contract", roles: ["dispatcher", "directorate"] },
  { to: "/predictions", label: "Predictions", roles: ["directorate"] },
];

export function Nav() {
  const { role, email, isAuthenticated } = useUserRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!isAuthenticated) return null;

  const items = ITEMS.filter((i) => (role ? i.roles.includes(role) : false));

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase?.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="border-b">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3 text-sm">
        <span className="font-semibold">Setu-RTN</span>
        {items.map((i) => (
          <Link
            key={i.to}
            to={i.to}
            className="text-muted-foreground hover:text-foreground"
            activeProps={{ className: "text-foreground font-medium" }}
          >
            {i.label}
          </Link>
        ))}
        <span className="ml-auto text-muted-foreground">
          {email} ({role ?? "no role"})
        </span>
        <button type="button" onClick={signOut} className="underline underline-offset-2">
          Sign out
        </button>
      </nav>
    </header>
  );
}
