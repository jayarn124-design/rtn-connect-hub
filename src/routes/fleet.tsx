import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { callRpc } from "@/lib/supabase";
import { RequireRole, Page } from "@/components/RequireRole";
import { ErrorLine, Loading } from "@/components/ErrorLine";

type VehicleRow = Record<string, unknown> & {
  vehicle_id?: string;
  id?: string;
  registration_no?: string;
  current_capacity_pct?: number;
};

export const Route = createFileRoute("/fleet")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Fleet Capacity — Setu-RTN" },
      { name: "description", content: "Live utilisation for every vehicle in the DoP road network." },
      { property: "og:title", content: "Fleet Capacity — Setu-RTN" },
      { property: "og:description", content: "Live utilisation for every vehicle in the DoP road network." },
    ],
  }),
  component: () => (
    <RequireRole allow={["dispatcher", "directorate"]}>
      <FleetScreen />
    </RequireRole>
  ),
});

function FleetScreen() {
  const q = useQuery({
    queryKey: ["fleet-capacity"],
    queryFn: () => callRpc<VehicleRow[]>("compute_capacity_all_vehicles"),
    refetchOnWindowFocus: false,
  });

  const rows = q.data ?? [];

  return (
    <Page title="Capacity Engine — Fleet overview">
      <button
        type="button"
        onClick={() => q.refetch()}
        className="mb-3 rounded-md border px-3 py-1.5 text-sm"
      >
        Refresh
      </button>
      {q.isLoading ? <Loading /> : null}
      <ErrorLine error={q.error} onRetry={() => q.refetch()} />
      {!q.isLoading && !q.error ? (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Vehicle</th>
              <th className="py-2">Registration</th>
              <th className="py-2">Current capacity %</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-2 text-muted-foreground">
                  No vehicles returned.
                </td>
              </tr>
            ) : null}
            {rows.map((v, i) => {
              const id = String(v.vehicle_id ?? v.id ?? i);
              return (
                <tr key={id} className="border-b">
                  <td className="py-2">{id}</td>
                  <td className="py-2">{String(v.registration_no ?? "—")}</td>
                  <td className="py-2">
                    {v.current_capacity_pct == null ? "—" : String(v.current_capacity_pct)}
                  </td>
                  <td className="py-2">
                    <Link
                      to="/fleet/$vehicleId"
                      params={{ vehicleId: id }}
                      className="underline underline-offset-2"
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
    </Page>
  );
}
