# EAS Build — NurtureAI mobile

This app uses [Expo Application Services (EAS)](https://docs.expo.dev/eas/) for iOS/Android binaries. Profiles live in `eas.json` at the app root (`apps/mobile/eas.json`).

## One-time setup

1. **Install CLI** (global or `npx`):

   ```bash
   npm install -g eas-cli
   ```

2. **Log in** to Expo:

   ```bash
   eas login
   ```

3. **Link the project** (creates `projectId` under `expo.extra` in `app.json`):

   ```bash
   cd apps/mobile
   eas init
   ```

   Follow prompts to create or select an Expo project. Commit the updated `app.json` / `eas.json` changes EAS writes.

4. **Apple & Google** (for store builds):

   - **iOS:** Apple Developer Program, App Store Connect API key or credentials in EAS.
   - **Android:** Google Play Console + service account JSON for EAS Submit (optional for internal tracks).

## Profiles (see `eas.json`)

| Profile | Use |
|---------|-----|
| `development` | Dev client + iOS Simulator + Android APK for fast iteration |
| `preview` | Internal distribution (TestFlight internal / Play internal testing) |
| `production` | Store release; `autoIncrement` Android version code |

## Commands

```bash
cd apps/mobile
eas build --profile development --platform ios
eas build --profile preview --platform all
eas build --profile production --platform all
```

Or use npm scripts: `npm run eas:build:preview`, etc.

## Environment for production builds

Set **EAS Secrets** (Dashboard → Project → Secrets) for values the app must embed at build time, e.g.:

- `EXPO_PUBLIC_API_URL` — production API base URL (HTTPS).

Never commit production secrets into the repo.
