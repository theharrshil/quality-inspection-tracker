# Build Spec — Quality Inspection Tracker

> Hand this to Claude Code as the build brief. Drop it in the repo root as `SPEC.md` or `CLAUDE.md`. **Read the whole thing before writing code, then follow the Build Order (§13).** Never leave the core in a broken state to chase a bonus. Working software over ambition — if a feature threatens the clean clone-and-run, cut it and document the cut.

---

## 1. What we're building & why

A **Quality Inspection Tracker**: a mobile-first web app a fabric-plant shop-floor supervisor uses on their phone to log, filter, resolve, and summarize quality defects, replacing paper registers. This is a hiring take-home for a manufacturer's AI & Analytics team.

**Optimize for the actual rubric**, in weight order:

1. **Code quality & structure (25%)** — clean, readable, a colleague can pick it up.
2. **API design (20%)** — sensible endpoints, correct status codes, consistent response shape.
3. **Mobile-first UX (20%)** — works well at **390px**, minimal taps, fast load.
4. **Shipping speed vs. quality (20%)** — feature-complete, **no critical bugs, clean clone-and-run**.
5. **Documentation & decisions (15%)** — README explains trade-offs, not just commands.

Their words: *"working software over polished architecture,"* *"a simple app that runs cleanly beats a complex app with setup errors."* **The single biggest failure mode is a repo that doesn't run cleanly for the reviewer. Guard that above everything.**

The API design is built the "hono-open-api-starter" way (see §4) specifically because it turns the 20% API line from a claim into something the reviewer can click through at `/reference`.

---

## 2. Tech stack (locked — do not substitute)

- **Language:** TypeScript, `strict: true`, end to end. No `any` across boundaries.
- **Backend:** Hono on Node via `@hono/node-server`.
- **OpenAPI layer:** `@hono/zod-openapi` — routes defined with Zod-typed `createRoute({...})`; the framework validates requests/responses against those schemas **and** emits the OpenAPI 3.0 doc from them. One source of truth: the Zod schema *is* the validation *and* the docs.
- **Helpers:** `stoker` — HTTP status-code/phrase constants, `jsonContent`/`jsonContentRequired`, `createErrorSchema`, `IdUUIDParamsSchema`, and the shared `defaultHook`/`notFound`/`onError`. Reach for a stoker helper before hand-rolling.
- **Docs UI:** Scalar (`@scalar/hono-api-reference`) at `/reference`, pointed at `/doc`.
- **DB:** SQLite via `better-sqlite3`, through **Drizzle ORM** + `drizzle-kit` migrations. No cloud DB.
- **Validation schemas:** `drizzle-zod` — `select*`/`insert*`/`patch*` generated from the Drizzle tables, never hand-written for DB types. Live in `src/validators/`.
- **Auth:** access JWT via `hono/jwt`; opaque rotating refresh tokens; passwords hashed with **`node:crypto` scrypt** (built-in, no native dep).
- **Frontend:** React + Vite + Tailwind CSS, TanStack Query for server state, a minimal router.
- **Package manager:** **npm**. Single package, no workspace.
- **One process serves both:** in production Hono serves the built React assets **and** `/api` on one port; in dev, Vite proxies `/api` to Hono.

Keep dependencies lean. No CSS-in-JS, no auth providers, no state library beyond TanStack Query, no premature abstraction.

---

## 3. Project structure

```
quality-inspection-tracker/
  package.json
  tsconfig.json                 # base + path aliases
  tsconfig.server.json          # server build (Node)
  vite.config.ts                # client; vite-tsconfig-paths; proxies /api → server in dev
  drizzle.config.ts
  Dockerfile
  docker-compose.yml
  .env.example
  .gitignore                    # /data/*.sqlite, node_modules, dist
  README.md
  data/                         # sqlite file created here at runtime
  drizzle/                      # generated migrations
  src/
    validators/
      index.ts                  # drizzle-zod select/insert schemas + query/summary/auth schemas
    shared/
      labels.ts                 # enum → human label maps (UI), pure, isomorphic
    server/
      app.ts                    # mounts routers, configureOpenAPI(app); exports AppType
      index.ts                  # entry: migrate → auto-seed-if-empty → serve static + api
      lib/
        create-app.ts           # createRouter()/createApp(): OpenAPIHono + defaultHook + notFound + onError
        configure-open-api.ts   # /doc + Scalar /reference + Bearer security scheme
        types.ts                # AppBindings (Variables: db, user), AppRouteHandler<R>
        constants.ts            # notFoundSchema, conflictSchema, ZOD_ERROR_* if needed
        scrypt.ts               # hashPassword / verifyPassword (scrypt + timingSafeEqual)
        tokens.ts               # access-JWT sign/verify, refresh mint/hash/rotate helpers
      middlewares/
        require-auth.ts         # verify access JWT → c.var.user; 401 otherwise
        rate-limit.ts           # in-memory fixed-window limiter for /auth/login
      db/
        schema.ts               # drizzle tables (isomorphic-safe: no better-sqlite3 import)
        client.ts               # drizzle(better-sqlite3) — SERVER ONLY
        seed.ts                 # seed users + inspections; invoked if tables empty
      routers/
        inspections/            # inspections.routes.ts | .handlers.ts | .index.ts
        summary/
        auth/
        sap/
    client/
      index.html
      main.tsx
      App.tsx
      lib/
        api.ts                  # apiFetch<T>: envelope-aware, 401 → refresh-and-retry
        auth.tsx                # AuthContext: access token in memory, silent refresh
        offline.ts             # IndexedDB queue + sync engine (bonus)
      pages/                    # Login, InspectionsList, LogInspection, InspectionDetail, Summary
      components/               # Card, SeverityBadge, StatusPill, FilterBar, FormField, ...
  test/
    inspections.test.ts         # Vitest API tests
    auth.test.ts
```

**Client-bundle safety:** the client may import only `src/validators`, `src/shared`, and types from `src/server/db/schema.ts` (pure table defs — no `better-sqlite3`). It must never import `db/client.ts`, handlers, routers, or `lib/*`. Verify Vite doesn't pull server code into the client bundle.

**Path aliases:** `@/*` → `src/server/*`, `@validators` → `src/validators`, `@shared/*` → `src/shared/*`. Wire in tsconfig + `vite-tsconfig-paths` + tsx. Confirm they resolve in **dev, prod build, and Vitest**; fall back to relative imports if any context can't resolve them — don't ship a build that only works in one.

---

## 4. API conventions (the pattern — follow it exactly)

### Three-file router
Every feature is `routers/{feature}/` split into three files:

- **`{feature}.routes.ts`** — pure `createRoute({...})` definitions. Zod schemas only, no logic, no DB. Export each route and its `type XRoute = typeof x`.
- **`{feature}.handlers.ts`** — one `AppRouteHandler<XRoute>` per route. Read input via `c.req.valid("json"|"query"|"param")` (never `c.req.json()`); return `c.json(body, status)` with a status declared in the route. The generic binds handler ↔ contract, so a wrong status or off-schema body is a **compile error**.
- **`{feature}.index.ts`** — `createRouter()`, register middleware in order, wire `.openapi(route, handler)`.

Mount each router in `app.ts` under its base path; export `AppType = typeof routes`.

### createRoute essentials
- **Paths in route defs are OpenAPI-style `/{id}`**, but middleware registered via `.use`/`.on` in the index file is **Hono-style `/:id`**. This asymmetry is real — `PATCH /inspections/{id}/resolve` in the route def, `/:id/resolve` if you register per-route middleware. Get it right.
- `request.body`: `jsonContentRequired(schema, desc)` (required) / `jsonContent(...)` (optional).
- `request.query`: `z.object({...})` with `z.coerce.number()` for numerics, `z.enum([...])` for constrained strings.
- `request.params`: `IdUUIDParamsSchema` (stoker) for `{ id: uuid }`.
- `responses`: keyed by stoker status constant, each a `jsonContent(schema, desc)`; `204` is a bare `{ description }`.
- **Declare every failure a route can produce** — success shape, plus `NOT_FOUND`→`notFoundSchema`, `UNPROCESSABLE_ENTITY`→`createErrorSchema(requestSchema)`, `CONFLICT`→`conflictSchema`, `UNAUTHORIZED`→`{ message }` where applicable.

### Response contract (document this in the README verbatim)
- **Single resource** (get/create/resolve) → the resource object directly (e.g. `selectInspectionSchema`), per the stoker convention.
- **Collections** → `{ data: Item[], meta: { total } }` (the envelope carries pagination metadata; single resources don't need it).
- **Validation errors (422)** → the shared `defaultHook` shape: `{ success: false, error: { issues: [...], name: "ZodError" } }` — exactly what `createErrorSchema(schema)` describes.
- **404** → `{ message }` (`notFoundSchema` = `createMessageObjectSchema(NOT_FOUND)`).
- **409 / 401 / 429** → `{ message }`.
- Global fallthroughs in `create-app.ts`: stoker `notFound` for unmatched routes, stoker `onError` → 500 `{ message }`.

### Generated docs
No spec file to maintain. `configure-open-api.ts` does `app.doc("/doc", {...})` and mounts Scalar at `/reference`. Also **register a Bearer security scheme** so `/reference` shows the lock and lets the reviewer paste a token; add `security: [{ Bearer: [] }]` to protected routes. A route appears in the doc only if its router is `.route(...)`-mounted **and** the route is `.openapi(...)`-registered.

### Server-stamped fields
Never trust the body for server-owned fields. `createdBy`/`resolvedBy` come from `c.var.user.id`; `status`/timestamps/`resolvedAt` are set server-side. `insert*` schemas `.omit(...)` those columns.

---

## 5. Data model (Drizzle, SQLite)

### `inspections`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | UUID, `$defaultFn(crypto.randomUUID)`. **Client may supply it** for offline idempotency. |
| `inspectionDate` | text | ISO `YYYY-MM-DD`, day observed. |
| `machineLineId` | text | Free text. |
| `defectType` | text (enum) | `weave_defect`\|`shade_variation`\|`hole_tear`\|`count_deviation`\|`other`. |
| `severity` | text (enum) | `critical`\|`major`\|`minor`. |
| `remarks` | text nullable | Optional. |
| `status` | text (enum) | `open`\|`resolved`, default `open`. |
| `resolutionNote` | text nullable | Required to resolve. |
| `resolvedAt` | integer (epoch ms) nullable | Set on resolve. |
| `resolvedBy` | text nullable | FK users.id, stamped from token. |
| `source` | text (enum) | `manual`\|`sap`, default `manual`. |
| `createdBy` | text nullable | FK users.id, stamped from token; `null` for SAP-sourced rows (no human author). |
| `createdAt` / `updatedAt` | integer (epoch ms) | Defaults; bump `updatedAt` on write. |

Define enums once via `text('col', { enum: [...] })`; `drizzle-zod` derives the Zod enums. Human labels live in `shared/labels.ts`.

### `users`
`id` (uuid PK), `username` (text unique), `passwordHash` (text — scrypt `saltHex:keyHex`), `createdAt`. No `role` column — this app has one kind of user (a supervisor), so auth is authentication only, not role-based authorization. **`selectUserSchema` must `.omit({ passwordHash: true })`** — never serialize the hash.

### `refresh_tokens`
`id` (uuid PK), `userId` (FK), `tokenHash` (text — SHA-256 of the opaque token; raw token never stored), `expiresAt` (epoch ms), `revokedAt` (epoch ms nullable), `replacedBy` (text nullable — rotation lineage), `createdAt`.

---

## 6. Endpoints

### `routers/inspections` (requires auth)
- **`POST /`** — body `insertInspectionSchema` (fields: `inspectionDate`, `machineLineId`, `defectType`, `severity`, `remarks?`, optional client `id`). Idempotent on `id`: existing id → `200` existing; else insert → `201`. Stamp `createdBy`. `422` on invalid.
- **`GET /`** — query `listInspectionsQuerySchema`: `severity?`, `status?`, `defectType?`, `from?`, `to?` (range on `inspectionDate`), `sort?` (default `-createdAt`; also `createdAt`, `severity`, `inspectionDate`; `severity` orders `critical>major>minor`), `limit?`, `offset?`. → `200 { data, meta: { total } }`.
- **`GET /{id}`** → `200` resource / `404`.
- **`PATCH /{id}/resolve`** — body `{ resolutionNote: z.string().min(1) }`. `404` if missing, `409` if already resolved, `422` if empty. On success set `status=resolved`, `resolvedAt`, `resolvedBy`, note → `200` resource.

### `routers/summary` (requires auth)
- **`GET /`** → `200` `summarySchema`. Compute with SQL aggregation, not by loading rows:
```json
{ "bySeverity": {
    "critical": { "open": 3, "resolved": 5 },
    "major":    { "open": 4, "resolved": 8 },
    "minor":    { "open": 2, "resolved": 6 } },
  "totals": { "open": 9, "resolved": 19, "total": 28 } }
```

### `routers/auth` (see §7 for mechanics)
- **`POST /login`** — rate-limited. Body `{ username, password }`. Valid → `200 { accessToken, user }` + sets refresh cookie. `401 { message }` generic ("Invalid credentials") on any failure. `429` when rate-limited. `422` invalid body.
- **`POST /refresh`** — reads refresh cookie, rotates it. → `200 { accessToken }` + new cookie / `401` if invalid/expired/revoked (and on reuse-detection, revoke the whole family — see §7).
- **`POST /logout`** — revokes current refresh token, clears cookie → `204`.
- **`GET /me`** — requires access token → `200 { user }` (id, username) / `401`.

### `routers/sap` (bonus — secret-guarded)
- **`POST /sap-webhook`** — guarded by `x-webhook-secret` header (env). Because this is a *mock we control*, it **does** use `createRoute` + a Zod schema (validated, appears in `/reference`). Payload:
```json
{ "plant_code": "GJ-AHM-01", "machine_id": "LOOM-14",
  "defect_code": "WEAVE",  "severity": "CRITICAL",
  "observed_at": "2025-07-28", "notes": "Detected by loom sensor" }
```
Map `defect_code`→`defectType` (unknown→`other`), `severity`→internal, `observed_at`→`inspectionDate`, `notes`→`remarks`; create with `source:"sap"`, `createdBy = null` (no human author). `422` on bad payload, `401` on bad secret. In the README, note a *real* external webhook would skip Zod and verify an HMAC signature instead — that's the §"when to skip OpenAPI" distinction.

---

## 7. Auth design (the centerpiece — build with care)

**Model:** short-lived access JWT + rotating opaque refresh token. Access token lives **in memory on the client** (not localStorage) to limit XSS token theft; the refresh token lives in an **httpOnly cookie** the JS can't read.

**Passwords (`lib/scrypt.ts`):**
```
hash:   salt = randomBytes(16); key = await scrypt(password, salt, 64)
        store `${salt.toString('hex')}:${key.toString('hex')}`
verify: split stored; re-derive with same salt; timingSafeEqual(key, stored)
```
Use async `scrypt` (promisified) in request handlers; `scryptSync` is fine in the seed. Never log or serialize hashes.

**Access token:** `hono/jwt` signed with `JWT_SECRET`, ~15 min TTL, claims `{ sub: userId }`. `require-auth.ts` reads `Authorization: Bearer`, verifies, sets `c.var.user`; `401` otherwise.

**Refresh token:** opaque `randomBytes(32).base64url`. Store only its SHA-256 hash in `refresh_tokens` with an expiry (~7 days). On **`/refresh`**: hash the presented token, look it up; if missing/expired/revoked → `401`. If it's already revoked but presented again → **reuse detection**: revoke every token in that user's family and force re-login (call this out in the README as a real security property). On success: mark the row revoked with `replacedBy`, mint a new refresh token + row, set the new cookie, return a new access token. **Rotation on every refresh.**

**Cookie flags:** `httpOnly`, `SameSite=Lax`, `Path=/api/auth` (only sent to auth endpoints), `Max-Age` = refresh TTL, and **`Secure` only when `NODE_ENV=production`** — omit `Secure` in local dev so the cookie works over `http://localhost` (setting `Secure` on plain-http localhost is the classic "auth works nowhere locally" bug; avoiding it is deliberate).

**Rate limiting (`rate-limit.ts`):** in-memory fixed-window (e.g. 5 attempts / 15 min) keyed by IP + username on `/login`; `429` when exceeded. Note in README it's per-instance/in-memory and a real deploy would use a shared store.

**Login hygiene:** generic failure message (don't reveal whether username or password was wrong); validate payloads with Zod; timing-safe compare.

**Client (`lib/auth.tsx` + `lib/api.ts`):** `AuthContext` holds the access token in memory. On app load, silently `POST /auth/refresh` (cookie present) to obtain an access token — survives reloads without persisting the access token. `apiFetch` attaches the Bearer header; on `401` it attempts **one** refresh then retries the original request; if refresh fails it dispatches `auth:expired` → redirect to Login. A minimal Login page; `/me` populates the header/user state.

**Offline interaction:** the sync engine flushes through `apiFetch`, so a `401` mid-flush triggers a refresh-and-retry automatically. If refresh also fails (fully logged out), leave items queued and surface a "sign in to sync" state rather than dropping them.

**README-worthy trade-offs to state honestly:** access-in-memory + refresh-in-httpOnly-cookie and why; rotation + reuse detection; scrypt (built-in, no native build) vs argon2; in-memory rate limiter; no registration flow (users are provisioned/seeded — see §12 scope note).

---

## 8. Frontend (mobile-first — graded at 390px)

Everything must look and work at **390px**. Tap targets ≥44px, primary actions thumb-reachable, minimal taps to log a defect (the supervisor's most frequent action). Test in devtools at 390px before calling any screen done.

**Navigation:** bottom tab bar — **Inspections** and **Summary** — plus a persistent **"+ Log"** action. Auth-gate the app; unauthenticated → Login.

**Screens:**
1. **Login** — username/password, error state, calls `/login`.
2. **Inspections (home)** — cards (not a desktop table): defect label, color-coded **severity badge** (Critical=red, Major=amber, Minor=slate), machine/line, date, **status pill**. Tap → detail. Filter bar (severity, status, defect type, date range) + sort (newest default, severity). Empty + loading states. A subtle "pending sync" marker on unsynced records (bonus).
3. **Log Inspection** — date (default today), machine/line (text), defect type (chunky segmented buttons/large select), severity (three color-coded segmented buttons), remarks (optional). One big Submit. Optimistic insert; queues offline (bonus).
4. **Inspection Detail / Resolve** — full record; if `open`, **Mark Resolved** requiring a mandatory resolution note (block empty submit); if `resolved`, show note + resolved timestamp read-only.
5. **Summary** — the severity × status matrix from `/summary` as color-coded cards/compact table with totals. The management view — glanceable.

Data: TanStack Query for all reads/writes; centralize in `lib/api.ts` (`apiFetch<T>` with response types inferred from validators, e.g. `z.infer<typeof selectInspectionSchema>` — the contract is shared through the validators, matching the Vaidant convention). Invalidate query keys on mutation.

---

## 9. Offline support (bonus — build LAST, keep bounded)

**Not a CRDT or general sync framework.** Scope to two writes — **create** and **resolve** — plus offline reads of the last-seen list.

- Client generates the inspection UUID; server upserts on `id`, so resends are idempotent (no dupes).
- Offline writes (detect via `navigator.onLine` + `online`/`offline`) enqueue an op in **IndexedDB** (`idb` package) and reflect optimistically with a "pending sync" marker.
- A sync engine in `lib/offline.ts` flushes on app load, `online`, and after reconnect: creates → `POST`, resolves → `PATCH .../resolve`, clearing each op on success. It goes through `apiFetch`, so token refresh is handled (§7).
- Cache the last list fetch in IndexedDB so the list renders offline; on reconnect, refetch (server is source of truth) with pending ops overlaid.
- A full service worker / installable PWA is **out of scope** unless everything else is done; if wanted, use `vite-plugin-pwa` for the app-shell cache rather than hand-rolling one.
- **If it gets flaky, ship "offline create + resolve queue + cached reads" and document the boundary.** Bounded-and-solid beats ambitious-and-broken on this rubric.

---

## 10. Seed & DB lifecycle

- Migrations generated by `drizzle-kit`, applied on startup (`better-sqlite3` migrator).
- **Auto-seed if empty on startup** so the reviewer sees populated data with zero extra steps.
- Seed: 1 user (credentials documented in the README + `.env.example`) and ~18–24 realistic inspections spanning all severities, both statuses, a range of recent dates, a few `source:"sap"` (with `createdBy = null`), several resolved with real-sounding notes. Plausible loom/line IDs and fabric-defect content.
- Scripts: `db:generate`, `db:migrate`, `seed`, `db:reset` (drop sqlite → migrate → seed).

---

## 11. Setup, run & Docker (protect the clone-and-run)

- `.env.example` lists every var (`PORT`, `JWT_SECRET`, `SAP_WEBHOOK_SECRET`, refresh TTL, seed creds). App must boot with safe defaults if `.env` is absent so the reviewer can just run it (generate a dev `JWT_SECRET` if unset, and warn).
- **Dev:** `npm install` → `npm run dev` (Vite + server concurrently; Vite proxies `/api`).
- **Single-process local:** `npm run build` → `npm start` (Hono serves built client + API on one port, default 3000).
- **Docker:** `docker compose up` builds and runs the single container, SQLite on a mounted volume. Target well under 5 minutes.
- **Health:** `GET /api/health` → `{ status: "ok" }`.
- After building, **run the clean path yourself** on a fresh checkout / fresh container (no pre-existing `data/`): hit health, load UI, log in, create + resolve an inspection, watch the summary update, open `/reference`. Fix anything before declaring done.

---

## 12. README (15% — make it earn its points)

In order: (1) one-liner + a 390px screenshot or two; (2) **Quickstart** — fastest copy-paste path (Docker one-liner + npm path), the under-5-min promise, seeded login creds; (3) **Architecture decisions**, 2–3 sentences each — single-process Hono+SPA; SQLite+Drizzle; the zod-openapi/stoker pattern and self-documenting `/reference`; the auth model (access-in-memory + rotating refresh cookie, reuse detection, scrypt); client-generated UUIDs for offline idempotency; (4) **API reference** — endpoint table (method, path, sample req/resp, status codes), the response contract from §4, the SAP payload + mapping; (5) **Trade-offs / what I cut / what I'd do with more time** — honest: single-tenant, no registration/self-serve user mgmt, in-memory rate limiter, offline limited to create+resolve, limited test coverage. Frame each cut as deliberate. This section wins the 15%; (6) **Testing** — what's covered, how to verify.

---

## 13. Definition of done

- Clean clone → one documented command → running app, **no errors**, seeded data + `/reference` visible.
- Every screen verified at **390px**.
- API: three-file routers, typed route↔handler binding, correct status codes, consistent response contract, Zod validation on all first-party inputs, server-stamped fields never from body.
- Auth: hashed passwords, rotating refresh with reuse detection, correct cookie flags (conditional `Secure`), rate-limited login, `/me`, access-in-memory client with silent refresh + 401-retry.
- TypeScript strict; no `any` across boundaries; no dead code; `selectUserSchema` never leaks the hash.
- **Vitest** tests: inspections happy path (create→list→get→resolve→summary) + a 422; auth (login→me→refresh-rotates→logout, plus a rejected reused refresh token).
- Meaningful git history: commit per logical feature.
- README complete per §12.

---

## 14. Build order (follow strictly — core stays shippable at every step)

1. **Scaffold:** repo, tooling, strict tsconfigs + aliases (verify dev/build/test), Tailwind, Vite, Hono, `create-app.ts` (defaultHook/notFound/onError), `configure-open-api.ts` (/doc + /reference), `/api/health`, single-process static serving verified, git init.
2. **DB:** drizzle `inspections` + `users` + `refresh_tokens`, migrations, `client.ts`, seed + auto-seed-if-empty.
3. **Validators:** `drizzle-zod` select/insert schemas (+ `selectUserSchema` omitting the hash), query/summary/auth Zod schemas.
4. **Auth (do early — everything else sits behind it):** scrypt helpers, token helpers, `auth` router (login/refresh/logout/me), `require-auth` + `rate-limit` middleware, cookie handling, security scheme in the doc. Write `auth.test.ts`.
5. **API core:** `inspections` router (create/list+filters+sort/getOne/resolve) + `summary` router, all behind `require-auth`, full `responses` declarations. Write `inspections.test.ts`.
6. **Frontend core:** AuthContext + `apiFetch` (silent refresh, 401-retry), Login, then list (cards/filters/sort), log form, detail/resolve, summary, bottom-tab nav via TanStack Query. Verify the full flow end-to-end at 390px.
7. **Polish:** empty/loading/error states, severity colors, validation UX, README first draft.
   **← CORE COMPLETE AND SHIPPABLE. Commit. Everything below is bonus.**
8. **Bonus:** SAP webhook (§6).
9. **Bonus:** offline sync (§9) — bounded; ship the solid subset if flaky.
10. **Final:** complete the README (trade-offs, API ref, what-I-cut), verify `docker compose up` from clean state, final 390px QA pass + `/reference` walk-through, tidy commits.

**Guardrails:** no multi-tenant/billing/RBAC/audit/idempotency-key apparatus (not needed here — the stripped-down auth above is the whole access story). No cloud services, no extra ORMs, one package, lean deps. If any bonus threatens the clean run or the 5-minute setup, cut it and document it.
