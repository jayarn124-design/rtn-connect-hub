import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { callFunction, callRpc } from "@/lib/supabase";
import { RequireRole, Page } from "@/components/RequireRole";
import { ErrorLine, Loading } from "@/components/ErrorLine";

type Prediction = Record<string, unknown> & {
  id?: string;
  horizon?: string;
  predicted_pct?: number;
  confidence_score?: number | null;
  factors?: unknown;
};

type AccuracyRow = Record<string, unknown> & {
  predicted_pct?: number;
  actual_pct_recorded?: number;
};

export const Route = createFileRoute("/predictions")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Predictive Intelligence — Setu-RTN" },
      { name: "description", content: "Forward capacity predictions, confidence scores and accuracy tracking." },
      { property: "og:title", content: "Predictive Intelligence — Setu-RTN" },
      { property: "og:description", content: "Forward capacity predictions, confidence scores and accuracy tracking." },
    ],
  }),
  component: () => (
    <RequireRole allow={["directorate"]}>
      <Predictions />
    </RequireRole>
  ),
});

function Predictions() {
  const queryClient = useQueryClient();
  const [vehicleId, setVehicleId] = useState("");

  const preds = useQuery({
    queryKey: ["predictions"],
    queryFn: () => callRpc<Prediction[]>("list_predictions"),
    refetchOnWindowFocus: false,
  });

  const accuracy = useQuery({
    queryKey: ["prediction-accuracy"],
    queryFn: () => callRpc<AccuracyRow[]>("prediction_accuracy"),
    refetchOnWindowFocus: false,
  });

  const run = useMutation({
    mutationFn: () =>
      callFunction("simulate-forward-capacity", vehicleId ? { vehicle_id: vehicleId } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["predictions"] });
      queryClient.invalidateQueries({ queryKey: ["prediction-accuracy"] });
    },
  });

  return (
    <Page title="Predictive intelligence">
      <section className="mb-6 flex flex-wrap items-center gap-2">
        <input
          className="rounded-md border px-3 py-2 text-sm"
          placeholder="Vehicle ID (optional)"
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
        />
        <button
          type="button"
          onClick={() => run.mutate()}
          disabled={run.isPending}
          className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
        >
          {run.isPending ? "Running…" : "Run prediction (demo)"}
        </button>
        <ErrorLine error={run.error} onRetry={() => run.mutate()} />
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-medium">Predictions</h2>
        {preds.isLoading ? <Loading /> : null}
        <ErrorLine error={preds.error} onRetry={() => preds.refetch()} />
        {preds.data ? (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Horizon</th>
                <th className="py-2">Predicted %</th>
                <th className="py-2">Confidence</th>
                <th className="py-2">Factors</th>
              </tr>
            </thead>
            <tbody>
              {preds.data.map((p, i) => (
                <tr key={String(p.id ?? i)} className="border-b">
                  <td className="py-2">{String(p.horizon ?? "—")}</td>
                  <td className="py-2">{p.predicted_pct == null ? "—" : String(p.predicted_pct)}</td>
                  <td className="py-2">
                    {p.confidence_score === null || p.confidence_score === undefined
                      ? "null"
                      : String(p.confidence_score)}
                  </td>
                  <td className="py-2">
                    {Array.isArray(p.factors)
                      ? (p.factors as unknown[]).map(String).join(", ")
                      : p.factors == null
                        ? "—"
                        : JSON.stringify(p.factors)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">Accuracy (predicted vs actual)</h2>
        {accuracy.isLoading ? <Loading /> : null}
        <ErrorLine error={accuracy.error} onRetry={() => accuracy.refetch()} />
        {accuracy.data ? (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                {Array.from(new Set(accuracy.data.flatMap((r) => Object.keys(r)))).map((c) => (
                  <th key={c} className="py-2">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accuracy.data.map((r, i) => (
                <tr key={i} className="border-b">
                  {Array.from(new Set(accuracy.data!.flatMap((x) => Object.keys(x)))).map((c) => (
                    <td key={c} className="py-2">{r[c] == null ? "—" : String(r[c])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>
    </Page>
  );
}
