# SINEVERSE AI Headquarters — Edge Functions

Deno Edge Functions (TypeScript) for the production HQ web app. This HQ
backend is a **separate Supabase project** from the SINEVERSE platform:
the platform never calls HQ, and HQ never writes to the platform database.

## Honest status

**Stubs — not deployed. No HQ Supabase project exists yet.**

- `command-center` — creates a backlog task-plan skeleton only. Agent
  execution / NARA replies are **not wired**.
- `approval-engine` — founder-only decisions with audit logging; Level 3
  needs a special authorization flag. MFA (aal2) enforcement is a TODO
  until Auth MFA is configured.
- `scheduler` — queues due jobs as `pending` rows only. **No reports are
  generated.**
- `groq-proxy` — implemented (validation, daily cap, upstream call, usage
  logging without prompt/response text), but **not deployed or tested live**.
- `drive-sync` — returns **501 `drive_not_configured`**; the Drive upload
  is not built (needs the founder OAuth token in secrets).
- `platform-api-client` — returns **501 `platform_api_not_built`** until
  `PLATFORM_API_URL` is set **and** the platform exposes the read-only
  endpoints (`overview`, `tasks`, `certificates`). Allowlisted fields only.

No function in this folder has been deployed, and none has been tested
against a live project. Do not claim otherwise.

## Deploy

From the repo root, with the Supabase CLI logged in and linked to the HQ
project (once it exists):

```bash
supabase functions deploy command-center
supabase functions deploy approval-engine
supabase functions deploy scheduler
supabase functions deploy groq-proxy
supabase functions deploy drive-sync
supabase functions deploy platform-api-client
```

Or deploy all at once:

```bash
supabase functions deploy
```

## Environment variables

Set in the HQ Supabase project with `supabase secrets set ...` (never in
code, never committed). A missing required var returns a generic HTTP 500
`server misconfigured` — the function never says which var is missing.

| Function | Env vars |
| --- | --- |
| All (auth) | `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| `command-center` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `approval-engine` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (+ `FOUNDER_UID` in `_shared/auth.ts` — replace the placeholder at deploy) |
| `scheduler` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` (sent as header `x-cron-secret`; no JWT on this route) |
| `groq-proxy` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`; optional `GROQ_DAILY_REQUEST_LIMIT` (default `900`) |
| `drive-sync` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (+ founder Google OAuth token — **not configured**) |
| `platform-api-client` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PLATFORM_API_URL`, `PLATFORM_API_KEY` |

## Shared helpers

- `_shared/cors.ts` — CORS headers + preflight handling.
- `_shared/auth.ts` — Bearer JWT validation via `auth.getUser`, service-role
  client factory, and the `FOUNDER_UID` placeholder (must be replaced at
  deploy; while it is the all-zero UUID, founder-only routes refuse everyone).

## Rules these stubs follow

- Secrets only from `Deno.env`; nothing hardcoded.
- JWT validated on every route except `scheduler` (cron-secret header instead).
- JSON responses with 200 / 400 / 401 / 403 / 404 / 409 / 429 / 500 / 501 / 502.
- No request bodies, prompts, or personal data are ever logged or stored.
- Unimplemented downstream steps return an honest `501` / `pending` status,
  never a fake success.
