import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Suspense, lazy, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { callRpc } from "@/lib/supabase";
import { RequireRole, Page } from "@/components/RequireRole";
import { ErrorLine, Loading } from "@/components/ErrorLine";

const MapplsMap = lazy(() => import("@/components/MapplsMap"));

type LegEvent = Record<string, unknown> & {
  id?: string;
  occurred_at?: string;
  lat?: number;
  lng?: number;
};

export const Route = createFileRoute("/twin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Digital Twin Replay — Setu-RTN" },
      { name: "description", content: "Read-only chronological replay of recorded leg events per vehicle." },
      { property: "og:title", content: "Digital Twin Replay — Setu-RTN" },
      { property: "og:description", content: "Read-only chronological replay of recorded leg events per vehicle." },
    ],
  }),
  component: () => (
    <RequireRole allow={["dispatcher", "3pl", "directorate"]}>
      <Twin />
    </RequireRole>
  ),
});

function Twin() {
  const [vehicleId, setVehicleId] = useState("");
  const [selected, setSelected] = useState("");

  const events = useQuery({
    queryKey: ["twin-events", selected],
    queryFn: () => callRpc<LegEvent[]>("list_leg_events", { p_vehicle_id: selected }),
    enabled: Boolean(selected),
    refetchOnWindowFocus: false,
  });

  const markers = (events.data ?? [])
    .filter((e) => typeof e.lat === "number" && typeof e.lng === "number")
    .map((e) => ({ lat: e.lat as number, lng: e.lng as number, label: String(e.id ?? "") }));

  const cols = Array.from(new Set((events.data ?? []).flatMap((e) => Object.keys(e))));

  return (
    <Page title="Digital Twin — replay">
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSelected(vehicleId);
        }}
      >
        <input
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="Vehicle ID"
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
        />
        <button type="submit" className="rounded-md border px-3 py-2 text-sm">
          Load replay
        </button>
      </form>

      {events.isLoading ? <Loading /> : null}
      <ErrorLine error={events.error} onRetry={() => events.refetch()} />

      {events.data ? (
        <>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                {cols.map((c) => (
                  <th key={c} className="py-2">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.data.map((e, i) => (
                <tr key={String(e.id ?? i)} className="border-b">
                  {cols.map((c) => (
                    <td key={c} className="py-2">{e[c] == null ? "—" : String(e[c])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {markers.length > 0 ? (
            <div className="mt-6">
              <ClientOnly fallback={<Loading label="Loading map…" />}>
                <Suspense fallback={<Loading label="Loading map…" />}>
                  <MapplsMap markers={markers} />
                </Suspense>
              </ClientOnly>
            </div>
          ) : null}
        </>
      ) : null}
    </Page>
  );
}
