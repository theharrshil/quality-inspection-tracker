# Quality Inspection Tracker

A mobile-first web app a fabric-plant shop-floor supervisor uses on their phone to
**log, filter, resolve, and summarize quality defects** — replacing the paper
register. One TypeScript codebase: a Hono API that documents itself, a React SPA
served from the same process, SQLite for storage.

> Designed for a phone. Everything below works at **390px**; open your browser
> dev-tools device toolbar at that width to review it as intended.

```
┌───────────────────────────┐   ┌───────────────────────────┐   ┌───────────────────────────┐
│ Inspections      Sign out │   │ ‹ Back      Inspection    │   │ Summary                   │
│ ─────────────────────────  │   │ ─────────────────────────  │   │ ─────────────────────────  │
│ [All sev ▾] [All stat ▾]  │   │  Weave defect  [Critical] │   │  9      19      28         │
│ [All type▾] [Newest ▾]   │   │  [Open] [SAP]             │   │  Open  Resolved Total     │
│                           │   │  Machine/line   LOOM-14   │   │                           │
│ ┌───────────────────────┐ │   │  Inspection date 29 Jul   │   │  [Critical]        8 total │
│ │ Weave defect [Critical]│ │   │  Logged     29 Jul 14:04  │   │   ┌──────┐ ┌──────┐       │
│ │ LOOM-14 • 29 Jul 2026 │ │   │                           │   │   │  3   │ │  5   │       │
│ │ [Open]                │ │   │  ┌─ Mark as resolved ───┐ │   │   │ Open │ │Resolvd│      │
│ └───────────────────────┘ │   │  │ Resolution note      │ │   │   └──────┘ └──────┘       │
│ ┌───────────────────────┐ │   │  │ [__________________] │ │   │  [Major]          12 total │
│ │ Shade variation [Major]│ │   │  │ [   Mark resolved  ] │ │   │   ...                     │
│ │ RAPIER-03 • 29 Jul    │ │   │  └──────────────────────┘ │   │                           │
│ └───────────────────────┘ │   │                           │   │                           │
│      📋      (+)     📊     │   │                           │   │      📋      (+)     📊     │
└───────────────────────────┘   └───────────────────────────┘   └───────────────────────────┘
     Inspections list                 Detail / Resolve                     Summary
```

---

## Quickstart

Seeded login (created automatically on first run):

```
username: supervisor
password: inspect123
```

### Docker (one command)

```bash
docker compose up --build
```

Then open **http://localhost:3000**. First boot applies migrations, seeds ~20
realistic inspections, and serves the SPA + API on one port. Well under 5 minutes.

### Local (npm)

Requires Node 20+ (developed on Node 24). **Everything runs on one port — 3000 —
in both dev and production.**

```bash
npm install

# Option A — dev with hot reload. Open http://localhost:3000.
npm run dev
# The Hono server (3000) proxies the client from Vite; HMR still works.

# Option B — single-process production build. Open http://localhost:3000.
npm run build && npm start
```

> Under the hood, `npm run dev` also starts Vite on :5173 (for module transforms and
> HMR), but you only ever open **http://localhost:3000** — the server proxies
> non-API requests to Vite, and HMR connects back to :5173 directly. You may open
> :5173 instead if you prefer; it proxies `/api` to the server.

No `.env` is required — the app boots with safe defaults and generates an ephemeral
`JWT_SECRET` (with a warning) if one isn't set. See `.env.example` for every knob.

Interactive API docs (Scalar) live at **http://localhost:3000/reference** — click
the lock, paste an access token from `POST /api/auth/login`, and try any endpoint.

### Handy scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Single-port dev on :3000 (Hono proxies the Vite client, hot reload) |
| `npm run build` | Build the client bundle to `dist/client` |
| `npm start` | Serve SPA + API on one port (production) |
| `npm test` | Vitest API tests (in-memory SQLite) |
| `npm run typecheck` | Strict typecheck of client and server |
| `npm run db:generate` / `db:migrate` / `seed` / `db:reset` | Drizzle migration & seed management |

---

## Architecture & decisions

**Single-process Hono + SPA, one port everywhere.** In production, Hono serves the
built React assets *and* `/api` on one port, with an SPA fallback for client routes
and JSON 404s for unknown API paths. In dev it stays single-port too: Hono proxies
non-API requests to the Vite dev server (HMR intact), so you always open
`http://localhost:3000`. One thing to run, nothing to orchestrate — the surest way
to protect a clean clone-and-run.

**SQLite + Drizzle ORM.** No database server to provision; the file lives in
`data/` (a Docker volume in the container). Drizzle gives typed queries and
`drizzle-kit` migrations, and the summary is a single grouped SQL aggregation
rather than a row scan.

**`@hono/zod-openapi` + `stoker` — the schema *is* the contract.** Routes are
declared with Zod-typed `createRoute({...})`; the framework validates every
request/response against those schemas **and** emits the OpenAPI 3 document from
them, rendered at `/reference`. There is no separate spec to drift. Each feature is
a three-file router (`*.routes.ts` contract / `*.handlers.ts` logic / `*.index.ts`
wiring); the route↔handler generic makes a wrong status code or off-schema body a
*compile error*.

**Auth: in-memory access token + rotating refresh cookie.** A short-lived (15 min)
access JWT lives only in JS memory (never `localStorage`) to limit XSS token theft;
a rotating opaque refresh token lives in an `httpOnly`, `SameSite=Lax`,
`Path=/api/auth` cookie the page's JS can't read. On load the client silently
refreshes to restore the session without persisting the access token. Passwords are
hashed with **scrypt** from `node:crypto` — memory-hard, built in, no native build
step (unlike argon2/bcrypt).

**Rotation + reuse detection.** Every `/refresh` revokes the presented token and
mints a new one. Only the SHA-256 hash of a refresh token is stored, so a database
leak can't be replayed. If an already-rotated token is presented again — the
signature of a stolen-cookie replay — the entire token family for that user is
revoked and they're forced to re-login.

**Client-generated UUIDs for offline idempotency.** The client mints the inspection
`id`, and `POST /inspections` upserts on it (existing id → `200`, else `201`), so an
offline resend can never create a duplicate.

**Lean dependencies.** Server state via TanStack Query; a ~40-line hand-rolled
history router instead of a routing library; Tailwind for styling. No CSS-in-JS, no
auth provider, no state library.

---

## API reference

Base path `/api`. All inspection/summary endpoints require
`Authorization: Bearer <accessToken>`.

| Method | Path | Body / Query | Success | Errors |
|---|---|---|---|---|
| `POST` | `/api/auth/login` | `{ username, password }` | `200 { accessToken, user }` + refresh cookie | `401` `429` `422` |
| `POST` | `/api/auth/refresh` | _(refresh cookie)_ | `200 { accessToken }` + new cookie | `401` |
| `POST` | `/api/auth/logout` | _(refresh cookie)_ | `204` | — |
| `GET` | `/api/auth/me` | — | `200 { user }` | `401` |
| `GET` | `/api/inspections` | filters + `sort,limit,offset` | `200 { data, meta:{ total } }` | `401` `422` |
| `POST` | `/api/inspections` | `insertInspectionSchema` | `201` (or `200` idempotent) | `401` `422` |
| `GET` | `/api/inspections/{id}` | — | `200` inspection | `401` `404` `422` |
| `PATCH` | `/api/inspections/{id}/resolve` | `{ resolutionNote }` | `200` inspection | `401` `404` `409` `422` |
| `GET` | `/api/summary` | — | `200` summary | `401` |
| `POST` | `/api/sap/sap-webhook` | SAP payload + `x-webhook-secret` | `201` inspection | `401` `422` |
| `GET` | `/api/health` | — | `200 { status: "ok" }` | — |

**List filters:** `severity`, `status`, `defectType`, `from`/`to` (range on
`inspectionDate`), `sort` (`-createdAt` default, `createdAt`, `severity` [critical >
major > minor], `inspectionDate`), `limit` (≤200), `offset`.

### Response contract

- **Single resource** (get / create / resolve) → the resource object directly.
- **Collections** → `{ data: Item[], meta: { total } }` (the envelope carries
  pagination metadata; single resources don't need it).
- **Validation errors (422)** → `{ success: false, error: { issues: [...], name:
  "ZodError" } }` (the shared `defaultHook` shape from `createErrorSchema`).
- **404 / 409 / 401 / 429** → `{ message }`.

Server-owned fields are never trusted from the body: `createdBy` / `resolvedBy` come
from the token, and `status` / `resolvedAt` / timestamps are set server-side. The
`insert*` schemas `.omit(...)` those columns, and `selectUserSchema.omit({
passwordHash })` guarantees the hash is never serialized.

### SAP webhook (mock)

`POST /api/sap/sap-webhook`, guarded by the `x-webhook-secret` header:

```json
{ "plant_code": "GJ-AHM-01", "machine_id": "LOOM-14",
  "defect_code": "WEAVE", "severity": "CRITICAL",
  "observed_at": "2025-07-28", "notes": "Detected by loom sensor" }
```

Mapping: `defect_code` → `defectType` (`WEAVE`→weave_defect, `SHADE`→shade_variation,
`HOLE`/`TEAR`→hole_tear, `COUNT`→count_deviation, unknown→`other`); `severity`
lowercased; `observed_at` → `inspectionDate`; `notes` → `remarks`. The row is created
with `source: "sap"` and `createdBy: null` (no human author).

Because this is a mock *we* control, it uses `createRoute` + a Zod schema, so it's
validated and appears in `/reference`. A **real** external webhook would instead skip
OpenAPI and verify an HMAC signature over the raw request body — you can't reject a
third party's payload for failing *your* schema, and the security boundary is the
signature, not the shape.

---

## Trade-offs & what I'd do next

Each of these is a deliberate cut to keep the app simple, correct, and shippable —
not an oversight.

- **Single-tenant, authentication-only.** One kind of user (a supervisor), so there's
  no `role` column and no RBAC. No self-serve registration — users are seeded /
  provisioned. Adding roles later is a column + a middleware check.
- **In-memory rate limiter.** The login limiter (5 / 15 min per IP+username) is
  per-instance. A multi-instance deploy would move it to a shared store (Redis).
- **Offline is bounded on purpose.** It covers the two writes (create + resolve) plus
  cached list reads — not a general CRDT sync. Writes queue in IndexedDB, show a
  "pending sync" marker, and replay idempotently through the same `apiFetch` (so a
  token refresh mid-flush is handled); a `401` that can't refresh leaves items
  queued rather than dropping them. It degrades to a no-op if IndexedDB is
  unavailable, so online behavior is never affected. A full installable PWA /
  service worker is out of scope.
- **Runtime via `tsx`.** The server runs TypeScript directly with `tsx` in both dev
  and prod instead of a separate compiled build, which removes a whole class of
  path-alias/emit issues from the clone-and-run path. `tsconfig.server.json` still
  typechecks the server strictly in CI (`npm run typecheck`).
- **Test coverage is representative, not exhaustive.** The suites cover the critical
  paths and contracts (below); with more time I'd add component tests for the React
  screens and property tests for the list filter/sort matrix.
- `npm audit` reports a few moderate advisories in dev-only tooling; none affect the
  runtime, and the safe fixes are already in.

---

## Testing

`npm test` runs the Vitest suites against an in-memory SQLite database (fresh
migrate + seed per file), exercising the real Hono app via `app.request`:

- **`auth.test.ts`** — login → `/me` → refresh-rotates → logout; generic failure for
  both wrong-password and unknown-user; **refresh-token reuse detection revokes the
  family**; `429` rate limiting; `422` on a bad body.
- **`inspections.test.ts`** — full happy path (create → idempotent replay → list with
  filter → get → resolve → summary reflects it); `404` unknown id; `409` re-resolve;
  `422` on an empty resolution note and an invalid create body; `401` without a token.
- **`sap.test.ts`** — bad secret `401`; payload → `sap`-sourced row with
  `createdBy: null`; unknown `defect_code` → `other`; `422` on a bad payload.

`npm run typecheck` strictly typechecks client and server (TypeScript `strict`, no
`any` across boundaries).

**Verified clean-run path:** fresh checkout → `docker compose up` (or `npm install
&& npm run build && npm start`) → health, seeded data, login, create + resolve, live
summary update, SAP webhook, and `/reference` all confirmed from an empty database.
```
