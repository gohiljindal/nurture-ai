# API security audit (auth + child ownership)

Source: `ARCHITECTURE_MASTER.md` task 11 — audit `/api/*` for authentication and scoping to the signed-in user’s children and records.

## Conventions

- **Session auth**: Most routes use `getServerUserIdFromRequest` (Supabase cookie or `Authorization: Bearer`) or `getAuthUserFromRequest` / `loadChildForUser` from `@/lib/supabase/for-request` and `@/lib/load-child-for-user`.
- **Child ownership**: Routes that take a `childId` in the path or body resolve the child with `loadChildForUser`, which returns **401** if unauthenticated and **404** if the child is not on the account.
- **Row ownership**: Symptom-check routes that return DB rows filter by `userId` in the service layer (`getSymptomCheckDetailForUser`, `listSymptomChecksForHistory`, `upsertSymptomCheckFeedbackForUser`).

## Route table

| Route | Methods | Auth | Ownership / notes |
| --- | --- | --- | --- |
| `/api/health` | GET | Public | Liveness; no user data. |
| `/api/meta` | GET | Public | Build/version metadata only. |
| `/api/me` | GET | Required (`getAuthUserFromRequest`) | Returns current auth + Prisma `users` row for that id. |
| `/api/auth/sync-app-user` | POST | Required for write | Upserts `public.users` for the session user; no cross-user access. |
| `/api/children` | GET, POST | Required (`getServerUserIdFromRequest`) | Lists/creates children for the session user only. |
| `/api/children/[id]` | GET, PATCH, … | Required | Loads/updates child by id **scoped to user** in route handlers. |
| `/api/symptom-check` | POST | **Disabled** | Returns **410** — fail closed; clients must use follow-up flow. |
| `/api/symptom-followup` | POST | Via `loadChildForUser` | Rate limit + AI; child must belong to user. |
| `/api/symptom-final` | POST | Via `loadChildForUser` | Rate limit + AI; child must belong to user. |
| `/api/symptom-checks` | GET | Required | History list for **session user**; GET rate limit (`symptomHistoryRateLimit`). |
| `/api/symptom-checks/[id]` | GET | Required | Detail only if check belongs to user (`getSymptomCheckDetailForUser`). |
| `/api/symptom-feedback` | POST | Required (`getAuthUserFromRequest`) | Feedback upsert scoped to `user.id` + `checkId` ownership in service. |
| `/api/feeding/log/[childId]` | GET, POST, … | `loadChildForUser` | All actions scoped to that child (owned). |
| `/api/feeding/guidance/[childId]` | GET | `loadChildForUser` | Same. |
| `/api/feeding/allergens/[childId]` | GET, PATCH | `loadChildForUser` | Same. |
| `/api/sleep/log/[childId]` | … | `loadChildForUser` | Same. |
| `/api/sleep/guidance/[childId]` | GET | `loadChildForUser` | Same. |
| `/api/sleep/checklist/[childId]` | … | `loadChildForUser` | Same. |
| `/api/growth/[childId]` | … | `loadChildForUser` | Same. |
| `/api/milestones/[childId]` | … | `loadChildForUser` | Same. |
| `/api/vaccines/[childId]` | … | `loadChildForUser` | Same. |
| `/api/vaccines/[childId]/province` | … | `loadChildForUser` | Same. |

## Gaps / follow-ups (non-blocking)

- **Unified error JSON**: Hardened symptom routes use `apiJsonError` with `code`; older routes may still return `{ error }` only — align opportunistically when touching those files.
- **`/api/symptom-checks/[id]`**: Uses `NextResponse.json` for errors; behavior is correct; optional cosmetic alignment with `apiJsonError`.

Last reviewed: 2026-04-19 (task 11).
