import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { callFunction, callRpc, supabase } from "@/lib/supabase";
import { RequireRole, Page } from "@/components/RequireRole";
import { ErrorLine, Loading } from "@/components/ErrorLine";
import { useUserRole } from "@/hooks/useUserRole";

type Listing = Record<string, unknown> & {
  id?: string;
  vehicle_id?: string;
  spare_tonnage?: number;
  price_per_tonne_km?: number;
  status?: string;
};

export const Route = createFileRoute("/marketplace")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Capacity Marketplace — Setu-RTN" },
      { name: "description", content: "Spare tonnage listings with server-computed pricing and live booking status." },
      { property: "og:title", content: "Capacity Marketplace — Setu-RTN" },
      { property: "og:description", content: "Spare tonnage listings with server-computed pricing and live booking status." },
    ],
  }),
  component: () => (
    <RequireRole allow={["dispatcher", "3pl", "directorate"]}>
      <Marketplace />
    </RequireRole>
  ),
});

function Marketplace() {
  const { role } = useUserRole();
  const queryClient = useQueryClient();
  const [conflict, setConflict] = useState<string | null>(null);

  const listings = useQuery({
    queryKey: ["marketplace-listings"],
    queryFn: () => callRpc<Listing[]>("list_marketplace_listings"),
    refetchOnWindowFocus: false,
  });

  // Realtime: no polling on this screen.
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("marketplace-bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "booking" },
        (payload) => {
          const row = (payload.new ?? payload.old) as Listing | null;
          if (!row) return;
          queryClient.setQueryData<Listing[]>(["marketplace-listings"], (prev) => {
            if (!prev) return prev;
            const key = String(row['listing_id'] ?? row.id ?? "");
            return prev.map((l) =>
              String(l.id) === key ? { ...l, status: String(row['status'] ?? l.status) } : l,
            );
          });
        },
      )
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [queryClient]);

  const book = useMutation({
    mutationFn: (listingId: string) => callFunction("confirm-booking", { listing_id: listingId }),
    onMutate: () => setConflict(null),
    onSuccess: (data) => {
      const status = (data as { status?: string } | null)?.status;
      if (status === "conflict") {
        setConflict("This capacity was booked by someone else. Listings refreshed.");
      }
      listings.refetch();
    },
    onError: () => {
      listings.refetch();
    },
  });

  const rows = listings.data ?? [];

  return (
    <Page title="Marketplace">
      {listings.isLoading ? <Loading /> : null}
      <ErrorLine error={listings.error} onRetry={() => listings.refetch()} />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Listing</th>
            <th className="py-2">Vehicle</th>
            <th className="py-2">Spare tonnage</th>
            <th className="py-2">Price / tonne-km</th>
            <th className="py-2">Status</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((l, i) => {
            const id = String(l.id ?? i);
            return (
              <tr key={id} className="border-b">
                <td className="py-2">{id}</td>
                <td className="py-2">{String(l.vehicle_id ?? "—")}</td>
                <td className="py-2">{String(l.spare_tonnage ?? "—")}</td>
                <td className="py-2">{String(l.price_per_tonne_km ?? "—")}</td>
                <td className="py-2">{String(l.status ?? "—")}</td>
                <td className="py-2">
                  {role === "3pl" && l.status === "open" ? (
                    <button
                      type="button"
                      disabled={book.isPending}
                      onClick={() => book.mutate(id)}
                      className="rounded-md border px-2 py-1 text-xs disabled:opacity-50"
                    >
                      {book.isPending ? "Booking…" : "Book"}
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {conflict ? <p className="mt-2 text-sm text-destructive">{conflict}</p> : null}
      {/* Booking is non-idempotent: no retry button offered. */}
      <ErrorLine error={book.error} />
    </Page>
  );
}
