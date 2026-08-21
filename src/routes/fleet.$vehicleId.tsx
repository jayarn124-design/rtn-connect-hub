import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { callFunction, callRpc } from "@/lib/supabase";
import { RequireRole, Page } from "@/components/RequireRole";
import { ErrorLine, Loading } from "@/components/ErrorLine";

type LegEvent = Record<string, unknown> & {
  id?: string;
  touchpoint_id?: string;
  event_type?: string;
  weight_kg?: number;
  occurred_at?: string;
};

type ChainRow = Record<string, unknown>;
type OverrideResult = { before?: ChainRow[]; after?: ChainRow[] } & Record<string, unknown>;

export const Route = createFileRoute("/fleet/$vehicleId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Vehicle detail — Setu-RTN" },
      { name: "description", content: "Leg events, event submission and corrections for a single vehicle." },
      { property: "og:title", content: "Vehicle detail — Setu-RTN" },
      { property: "og:description", content: "Leg events, event submission and corrections for a single vehicle." },
    ],
  }),
  component: () => (
    <RequireRole allow={["dispatcher", "directorate"]}>
      <VehicleDetail />
    </RequireRole>
  ),
});

function VehicleDetail() {
  const { vehicleId } = Route.useParams();
  const queryClient = useQueryClient();

  const events = useQuery({
    queryKey: ["leg-events", vehicleId],
    queryFn: () => callRpc<LegEvent[]>("list_leg_events", { p_vehicle_id: vehicleId }),
    refetchOnWindowFocus: false,
  });

  const [form, setForm] = useState({
    touchpoint_id: "",
    event_type: "load",
    weight_kg: "",
  });
  const [clientHint, setClientHint] = useState<string | null>(null);

  const submitEvent = useMutation({
    mutationFn: () =>
      callFunction("submit-capacity-event", {
        vehicle_id: vehicleId,
        touchpoint_id: form.touchpoint_id,
        event_type: form.event_type,
        weight_kg: Number(form.weight_kg),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leg-events", vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["fleet-capacity"] });
    },
  });

  const [correction, setCorrection] = useState({ event_id: "", weight_kg: "" });
  const override = useMutation({
    mutationFn: () =>
      callFunction<OverrideResult>("override-capacity-event", {
        vehicle_id: vehicleId,
        event_id: correction.event_id,
        weight_kg: Number(correction.weight_kg),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leg-events", vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["fleet-capacity"] });
    },
  });

  return (
    <Page title={`Vehicle ${vehicleId}`}>
      <section className="mb-8">
        <h2 className="mb-2 text-lg font-medium">Leg events (chronological)</h2>
        {events.isLoading ? <Loading /> : null}
        <ErrorLine error={events.error} onRetry={() => events.refetch()} />
        {events.data ? (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Event ID</th>
                <th className="py-2">Occurred at</th>
                <th className="py-2">Touchpoint</th>
                <th className="py-2">Type</th>
                <th className="py-2">Weight (kg)</th>
              </tr>
            </thead>
            <tbody>
              {events.data.map((e, i) => (
                <tr key={String(e.id ?? i)} className="border-b">
                  <td className="py-2">{String(e.id ?? "—")}</td>
                  <td className="py-2">{String(e.occurred_at ?? "—")}</td>
                  <td className="py-2">{String(e.touchpoint_id ?? "—")}</td>
                  <td className="py-2">{String(e.event_type ?? "—")}</td>
                  <td className="py-2">{String(e.weight_kg ?? "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <section className="mb-8 max-w-md">
        <h2 className="mb-2 text-lg font-medium">Submit new event</h2>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            setClientHint(
              !form.touchpoint_id || form.weight_kg === ""
                ? "Touchpoint and weight are required."
                : null,
            );
            submitEvent.mutate();
          }}
        >
          <input
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Touchpoint ID"
            value={form.touchpoint_id}
            onChange={(e) => setForm({ ...form, touchpoint_id: e.target.value })}
          />
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={form.event_type}
            onChange={(e) => setForm({ ...form, event_type: e.target.value })}
          >
            <option value="load">load</option>
            <option value="unload">unload</option>
          </select>
          <input
            className="w-full rounded-md border px-3 py-2 text-sm"
            type="number"
            placeholder="Weight (kg)"
            value={form.weight_kg}
            onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
          />
          <button
            type="submit"
            disabled={submitEvent.isPending}
            className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {submitEvent.isPending ? "Submitting…" : "Submit event"}
          </button>
        </form>
        {clientHint ? <p className="mt-2 text-sm text-muted-foreground">{clientHint}</p> : null}
        <ErrorLine error={submitEvent.error} onRetry={() => submitEvent.mutate()} />
        {submitEvent.isSuccess ? (
          <pre className="mt-2 overflow-x-auto rounded-md border p-2 text-xs">
            {JSON.stringify(submitEvent.data, null, 2)}
          </pre>
        ) : null}
      </section>

      <section className="max-w-3xl">
        <h2 className="mb-2 text-lg font-medium">Correction (recomputes chain)</h2>
        <form
          className="max-w-md space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            override.mutate();
          }}
        >
          <input
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Event ID to correct"
            value={correction.event_id}
            onChange={(e) => setCorrection({ ...correction, event_id: e.target.value })}
          />
          <input
            className="w-full rounded-md border px-3 py-2 text-sm"
            type="number"
            placeholder="Corrected weight (kg)"
            value={correction.weight_kg}
            onChange={(e) => setCorrection({ ...correction, weight_kg: e.target.value })}
          />
          <button
            type="submit"
            disabled={override.isPending}
            className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
          >
            {override.isPending ? "Applying…" : "Apply correction"}
          </button>
        </form>
        <ErrorLine error={override.error} onRetry={() => override.mutate()} />
        {override.data ? <BeforeAfter result={override.data} /> : null}
      </section>
    </Page>
  );
}

function BeforeAfter({ result }: { result: OverrideResult }) {
  const before = Array.isArray(result.before) ? result.before : [];
  const after = Array.isArray(result.after) ? result.after : [];
  if (before.length === 0 && after.length === 0) {
    return (
      <pre className="mt-3 overflow-x-auto rounded-md border p-2 text-xs">
        {JSON.stringify(result, null, 2)}
      </pre>
    );
  }
  const cols = Array.from(
    new Set([...before, ...after].flatMap((r) => Object.keys(r))),
  );
  const render = (rows: ChainRow[], label: string) => (
    <div>
      <h3 className="mb-1 text-sm font-medium">{label}</h3>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b text-left">
            {cols.map((c) => (
              <th key={c} className="py-1">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b">
              {cols.map((c) => (
                <td key={c} className="py-1">{r[c] == null ? "—" : String(r[c])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      {render(before, "Before")}
      {render(after, "After")}
    </div>
  );
}
