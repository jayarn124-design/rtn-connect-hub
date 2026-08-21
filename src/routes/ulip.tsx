import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { callFunction } from "@/lib/supabase";
import { RequireRole, Page } from "@/components/RequireRole";
import { ErrorLine } from "@/components/ErrorLine";

export const Route = createFileRoute("/ulip")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ULIP Contract Sample — Setu-RTN" },
      { name: "description", content: "Generate and review a sample ULIP data-exchange contract payload." },
      { property: "og:title", content: "ULIP Contract Sample — Setu-RTN" },
      { property: "og:description", content: "Generate and review a sample ULIP data-exchange contract payload." },
    ],
  }),
  component: () => (
    <RequireRole allow={["dispatcher", "directorate"]}>
      <Ulip />
    </RequireRole>
  ),
});

function Ulip() {
  const gen = useMutation({
    mutationFn: () => callFunction<Record<string, unknown>>("get-ulip-contract-sample"),
  });

  return (
    <Page title="ULIP contract">
      <button
        type="button"
        onClick={() => gen.mutate()}
        disabled={gen.isPending}
        className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
      >
        {gen.isPending ? "Generating…" : "Generate sample contract"}
      </button>
      <ErrorLine error={gen.error} onRetry={() => gen.mutate()} />
      {gen.data ? (
        <pre className="mt-4 overflow-x-auto rounded-md border p-3 text-xs">
          {JSON.stringify(gen.data, null, 2)}
        </pre>
      ) : null}
    </Page>
  );
}
