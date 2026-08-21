# RTN Connect Hub

Setu-RTN — Frontend-Only Master Build Prompt for Lovable

Setu-RTN (SIH260455 — Department of Posts, All-India Road Transport Network)

This is the frontend companion to the backend build prompt. It assumes every RPC function, Edge Function, and table from the backend prompt already exists and is independently testable (e.g. via curl or Supabase's API tester). This prompt covers only screens, data fetching, state, auth-gating, and display logic. No SQL, no Edge Function bodies, no secret values.

Explicit priority order: correct data wiring first (every screen reads/writes through the real RPC/Edge Function, nothing hardcoded or mocked in frontend state), visual polish last and minimal. Default component library styling, no custom design system, no animation pass.

STEP 0 — CONNECTION, WITHOUT EXPOSING KEYS

Connect Supabase through Lovable's native Supabase panel — do not paste the anon key, service-role key, or any third-party API key directly into frontend code, .env files committed to the repo, or any client-side constant.

Rules for this build:

The frontend uses only the Supabase URL and anon key, and only via the client Lovable's Supabase integration provisions automatically. Never reference SUPABASE_SERVICE_ROLE_KEY from any file that ships to the browser.

GROQ_API_KEY, NVIDIA_API_KEY, and MAPPLS_API_KEY (for the REST/server side) are backend-only secrets — the frontend never imports or reads them. Any call to Groq or NVIDIA cuOpt goes through a Supabase Edge Function; the frontend just calls the Edge Function by name.

The one exception is Mappls' client-side Web SDK key, if the plan requires client-rendered maps — treat that as a separate, intentionally-public key (Mappls issues these for browser use), configured as a Lovable environment variable and referenced as import.meta.env.VITE_MAPPLS_WEB_SDK_KEY (or equivalent), never inlined as a literal string in a component file.

If a component appears to need a secret that isn't meant to be public, that's a signal the logic belongs in an Edge Function instead — move it server-side rather than exposing the key.

STEP 1 — DATA ACCESS PATTERN (applies to every screen)

Two categories of calls, and only these two:

Read via Postgres RPC — e.g. supabase.rpc('compute_capacity_at_touchpoint', { p_vehicle_id, p_touchpoint_id }). Used for anything that's a pure computation over existing tables.

Write/complex-logic via Edge Function — e.g. supabase.functions.invoke('submit-capacity-event', { body: {...} }). Used for anything that validates, mutates, or calls an external API.

Frontend rules:

No screen ever computes a capacity percentage, a price, or a prediction confidence score in JS. Those values only ever come back from an RPC or Edge Function response.

Frontend state (React Query / Zustand / plain useState, whichever Lovable defaults to) is a cache of the last server response, never a source of truth. On any mutation, re-fetch or optimistically update and reconcile against the next server response.

Every data-fetching hook needs three states surfaced to the component: loading, error, data — even if the UI for error is just a plain text line. Don't silently swallow a failed RPC/Edge Function call.

Supabase Realtime subscription on the booking table (Feature 2) is the one place polling is explicitly disallowed — wire supabase.channel(...).on('postgres_changes', ...) and update local state from the payload directly.

STEP 2 — AUTH & ROLE GATING

Supabase Auth, role stored on the user record (dispatcher / 3pl / directorate), set at signup — no custom onboarding flow, no password-reset flow beyond Supabase's default.

A single top-level route guard component reads the role from the session and decides which nav items and screens render. Don't duplicate role-checking logic per screen — one hook (useUserRole()), consumed everywhere.

3PL-role users should never even attempt to fetch DoP's internal ledger screens — gate at the route level, not just by hiding a button (RLS is the real enforcement, but the frontend shouldn't render dead-end screens that 403 either).

STEP 3 — SCREENS, ONE PER FEATURE, ONE SHARED NAV

Login / role landing

Single-line title, Supabase Auth login form, redirect by role. Nothing else.

Feature 1 — Capacity Engine (dispatcher-facing)

Fleet overview table: one row per vehicle, current % pulled from the "all vehicles" query, refreshed on mount and on a manual refresh button (no auto-poll needed here — Feature 1 isn't wired to Realtime, only Feature 2 is).

Vehicle detail view: chronological list of leg_event rows for that vehicle, a form to submit a new event (calls submit-capacity-event), and a correction form (calls override-capacity-event) that shows the resulting recomputed chain returned by the function — display it as a simple before/after table, not a diff visualization.

Client-side form validation is a UX nicety only (immediate feedback on obviously bad input) — it is never treated as the real validation; always surface the server's rejection message if the Edge Function returns one.

Feature 2 — Marketplace (dispatcher + 3PL-facing, role-gated views of the same data)

Listings table: spare tonnage, price/tonne-km (server-computed, never recalculated in the component), status.

Booking action calls confirm-booking; on the "conflict" response (someone else won the race), show a plain inline message and refresh the listings — don't build custom conflict-resolution UI.

Realtime subscription updates the listings table for both roles without a page refresh. For the demo, two browser tabs (one per role) side by side is sufficient — no built two-pane layout needed.

Feature 3 — Digital Twin (read-only, all roles per RLS)

Replay view over leg_event ordered by timestamp for a selected vehicle. This is a table or simple timeline list, not a custom animation — the backend prompt is explicit this is a thin read layer, so the frontend should match that: no client-side interpolation or simulation logic.

Driver-identity fields are never in the response payload (enforced server-side), so there's nothing to redact client-side — just render what comes back.

Feature 4 — ULIP Contract Screen

Single screen, one button ("Generate sample contract"), calls get-ulip-contract-sample, renders the returned JSON as a formatted read-only document (plain <pre>/table, not a custom contract-styled layout). Disclaimer and context strings are rendered exactly as returned from backend config — never hardcoded in the component.

Feature 5 — Predictive Intelligence (directorate-facing)

Prediction list/table: horizon, predicted %, confidence score, contributing factors (rendered as returned — if explain-prediction stored the fallback {confidence_score: null, factors: ["explanation unavailable"]}, render that plainly, don't hide or reformat it).

Accuracy panel: simple query/table comparing predicted_pct vs actual_pct_recorded for resolved rows — a table is fine, a chart only if there's spare time at the end.

No manual "run prediction" button is required as the primary path (the backend trigger fires on leg_event insert), but keep a manual trigger button calling simulate-forward-capacity for demo control.

STEP 4 — COMPONENT & STYLING RULES

Use the component library's default styling — no custom theme, no custom color tokens, no animation library.

Tables and forms over custom visualizations wherever a table would do (per backend prompt's own framing — the frontend should not "upgrade" a table into a chart unless a screen explicitly calls for it above).

Skip loading-state polish beyond a plain spinner or "Loading…" text; skip empty-state illustrations; skip a marketing-style landing page.

One shared nav component, role-filtered, is the only piece of "layout design" this build needs.

STEP 5 — ERROR SURFACE CONVENTIONS

Keep this consistent across all five feature screens so debugging during judging is fast:

RPC/Edge Function error → plain red-text line near the action that triggered it, showing the server's error message verbatim (don't paraphrase it into a generic "Something went wrong").

Network/timeout error → same treatment, generic "Request failed, try again" text plus a retry button where the action is idempotent (event submission, prediction trigger) — non-idempotent actions (booking confirmation) should not auto-offer retry; let the user re-check listing status first.

No toast/notification library needed — inline messages are sufficient for this scope.

STEP 6 — WHAT NOT TO BUILD

Matching the backend prompt's own scope discipline:

No custom onboarding, no password reset flow.

No client-side pricing, capacity, or confidence calculations anywhere, even as a "preview" — always round-trip to the server.

No separate replay/events table or client-side event log for Feature 3 — it reads the same leg_event table Feature 1 writes to.

No hardcoded secrets, contract text, disclaimers, or policy strings in components — all of that is fetched from backend config per the backend prompt's Step 6.

If there's spare time at the end: polish UI. Not before every screen above is reading and writing real data correctly.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1f172592-b491-413f-9524-c63fb2c5556d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
