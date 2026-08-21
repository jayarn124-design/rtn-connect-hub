export function ErrorLine({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  if (!error) return null;
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Request failed, try again";
  return (
    <p className="mt-2 text-sm text-destructive">
      {message}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="ml-2 underline underline-offset-2"
        >
          Retry
        </button>
      ) : null}
    </p>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>;
}
