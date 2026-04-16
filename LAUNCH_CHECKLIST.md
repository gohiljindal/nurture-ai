# Launch checklist (run before sharing widely)

Use this before inviting testers or deploying to production.

## Environment & secrets

- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in Vercel (or host)
- [ ] `OPENAI_API_KEY` set **server-side only** (not `NEXT_PUBLIC_`)
- [ ] No API keys in git; `.env*` ignored (see `.gitignore`)
- [ ] Optional: `NEXT_PUBLIC_FEEDBACK_URL` for external feedback form
- [ ] Supabase Auth: redirect URLs include production domain (Auth → URL configuration)

## Core flows (manual)

- [ ] Homepage loads
- [ ] Sign up works
- [ ] Login works
- [ ] Add child works
- [ ] Dashboard shows children and “What to Expect” when applicable
- [ ] Symptom check: disclaimer → concern → follow-ups (when shown) → result with disclaimer
- [ ] History lists checks (max 10)
- [ ] Check detail opens; feedback Yes/No saves (after DB migration applied)
- [ ] Child profile page loads; symptom list uses plain-language urgency labels
- [ ] Logout works; log back in; data still present

## Trust & safety (read through once)

- [ ] No raw `monitor_home` / `urgent_doctor` strings in the UI
- [ ] Emergency / urgent paths tell user to seek care (Care Actions + copy)
- [ ] Disclaimer visible on result screens

## Quality bar

- [ ] Mobile layout acceptable on narrow screen
- [ ] No broken links on main paths (Home, Dashboard, History, Feedback)
- [ ] Browser console: no red errors on happy path

## After launch

- [ ] Run `supabase/migrations` on production DB (including `symptom_check_feedback`)

---

**Tester questions (ask 3–5 people):** What confused you? What felt useful? What felt untrustworthy? What would make you come back? Avoid “Do you like it?”

**Do not add next:** growth charts, sleep/feeding engines, milestone engines, billing—until you have real usage signal.
