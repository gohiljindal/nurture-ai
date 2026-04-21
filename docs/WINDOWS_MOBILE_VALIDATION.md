# Windows mobile validation guide

This guide is the fastest reliable setup for validating Nurture AI mobile on Windows when iOS Simulator is not available.

## 1) One-time environment setup

### Install tooling

- Node.js 20+ LTS
- Android Studio (includes Android SDK, emulator, platform-tools)
- Expo Go on a real iPhone

### Configure Android SDK env vars (PowerShell)

Run once, then open a new terminal:

```powershell
setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
setx ANDROID_SDK_ROOT "$env:LOCALAPPDATA\Android\Sdk"
setx PATH "$($env:PATH);$env:LOCALAPPDATA\Android\Sdk\platform-tools;$env:LOCALAPPDATA\Android\Sdk\emulator"
```

Verify:

```powershell
adb version
emulator -list-avds
```

If `adb` is not found, restart terminal/IDE after setting PATH.

## 2) API URL configuration (`EXPO_PUBLIC_API_URL`)

Set values in `apps/mobile/.env` and restart Expo after every change.

### Expo Web on the same machine

```env
EXPO_PUBLIC_API_URL=http://127.0.0.1:3000
```

### Android emulator

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
```

### Real iPhone (Expo Go)

Use your PC LAN IP (`ipconfig`), for example:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.25:3000
```

Phone and PC must be on the same Wi-Fi network.

## 3) Start backend + Expo correctly

Use separate terminals.

### Terminal A (Next.js API)

```powershell
cd c:\Users\shrad\Documents\cursor-projects\NurtureAI\nurtureai
npm run dev
```

### Terminal B (mobile)

```powershell
cd c:\Users\shrad\Documents\cursor-projects\NurtureAI\nurtureai\apps\mobile
npm install
npm run start:8082
```

Why `start:8082`: avoids interactive port-prompt failures when 8081 is busy.

## 4) Validate targets

### A) Android emulator on desktop

1. Start AVD in Android Studio.
2. In `apps/mobile` run:

```powershell
npm run android
```

Script uses a fixed port to avoid non-interactive Expo port prompts.

### B) Real iPhone via Expo Go

1. Keep Expo running (`npm run start:8082`).
2. In Expo terminal, open the app in Expo Go (scan QR).
3. Ensure `.env` uses LAN IP URL, not localhost.

## 5) Full app flow checklist

Run in this order:

1. Login with Supabase account.
2. Add child profile (name, DOB, sex, optional photo).
3. Open child profile and verify:
   - photo upload/remove
   - province update
   - remove child
4. Validate quick actions from child profile:
   - Check symptoms
   - History
   - Milestones
   - Vaccine preview
   - Growth
   - Feeding
   - Sleep
   - Visit prep
   - Toddler behavior
   - Potty readiness
   - Screen time guidance
   - Preschool social checklist
   - Dental/hearing/vision checks
   - Grade readiness
   - IEP awareness
   - Timeline

## 6) Common networking mistakes

- Using `localhost` on Android emulator (must be `10.0.2.2`)
- Using `127.0.0.1` on real iPhone (must be PC LAN IP)
- Not restarting Expo after changing `EXPO_PUBLIC_*`
- Backend not running on port 3000
- Firewall blocking port 3000 on Windows
- Phone on different Wi-Fi/VPN than dev machine
- Using `npx eas ...` in this repo; use `npx eas-cli ...` or package scripts

## 7) EAS commands (this repo)

From `apps/mobile`:

```powershell
npm run eas:login
npm run eas:init
npm run eas:build:preview
```
