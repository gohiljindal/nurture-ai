# Environments (staging vs production)

Use separate infrastructure for **staging** and **production** so you can test migrations and mobile builds without touching parent data.

## Variables (conceptual)

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `DATABASE_URL` | Local Docker / dev DB | Staging Postgres URL | Production Postgres URL |
| `DIRECT_URL` | Same as `DATABASE_URL` unless using a pooler | Staging direct (non-pooled) URL for migrations | Production direct URL for migrations |
| `NEXT_PUBLIC_SUPABASE_URL` | Dev Supabase project | Staging Supabase | Production Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dev anon key | Staging anon | Production anon |
| `OPENAI_API_KEY` | Dev key (low quota OK) | Staging key | Production key |
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | Optional locally | Staging Redis | Production Redis |
| Mobile `EXPO_PUBLIC_API_URL` | `http://127.0.0.1:3000` or LAN IP | `https://api-staging.example.com` | `https://api.example.com` |

## How to wire staging

1. Create a **second** Supabase project (or separate Postgres) for staging.
2. Deploy Next.js to a staging host (e.g. `staging.nurtureai.com`) with staging env vars.
3. Set **EAS secrets** for a `preview` channel build with `EXPO_PUBLIC_API_URL` pointing at staging.
4. Never reuse production `DATABASE_URL` in staging jobs.

## Health endpoints (all environments)

- `GET /api/health` — liveness (`{ ok: true }`).
- `GET /api/meta` — service name + npm `version` (deploy probes).

Both are implemented in `proxy.ts` (fast path, no session work).
