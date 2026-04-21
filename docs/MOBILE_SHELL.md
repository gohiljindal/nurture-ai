# Mobile shell — navigation, API URL, offline, splash & a11y (tasks 16–20)

For a full Windows testing walkthrough (Android emulator + iPhone Expo Go + API URL matrix), see `docs/WINDOWS_MOBILE_VALIDATION.md`.

## 16 — Tab navigation & deep links

- **Router:** Expo Router with **tabs** in `app/(app)/_layout.tsx`: Home `(home)`, Check, History, Child.
- **URL scheme:** `nurtureai` (see `apps/mobile/app.json` → `expo.scheme`).
- **Examples:**
  - Open app: `nurtureai://`
  - Path-style deep links follow Expo Router segments, e.g. `nurtureai://check` (exact paths depend on your route files under `app/(app)/`).

Use `npx expo-linking` or `Linking.createURL` in dev to validate links on device.

## 17 — Offline

- **Banner:** Shown in the authenticated shell when the device reports no network connection (`expo-network`).
- **React Query:** `onlineManager` is wired so queries respect connectivity (see `lib/network-setup.ts`).
- **Recovery:** When the network returns, `syncAppUser()` is retried so the Prisma user row stays in sync after offline sign-in.

Non-critical work queued for later can be extended in `lib/offline-queue.ts`.

## 18 — `EXPO_PUBLIC_API_URL` (LAN / device testing)

1. Find your machine’s LAN IP (e.g. `ipconfig` on Windows, `192.168.x.x`).
2. Run the Next API: `cd nurtureai && npm run dev` (default `http://127.0.0.1:3000`).
3. In `apps/mobile/.env` (or EAS secrets for builds), set:
   - `EXPO_PUBLIC_API_URL=http://192.168.x.x:3000`
4. **Restart Expo** after changing env. Physical devices must be on the **same Wi‑Fi** as the dev machine.
5. Windows: prefer `127.0.0.1` over `localhost` in URLs if IPv6 causes hangs (see `lib/api.ts` comment).

## 19 — Splash, fonts, React Query defaults

- **Splash:** `app.json` → `expo.splash` + `expo-splash-screen` plugin; hidden after fonts load in `app/_layout.tsx`.
- **Fonts:** Inter (`@expo-google-fonts/inter`) loaded before rendering the navigation tree.
- **React Query:** `lib/query-client.ts` — `staleTime` **5 minutes** for list/home data; `retry: 1`; `refetchOnWindowFocus: false` (mobile).

## 20 — Accessibility

- Tab icons use **`accessibilityLabel`** / **`accessibilityRole="tab"`** where applicable.
- Aim for **≥ 44×44** pt touch targets on primary actions (tab bar height ~64).
