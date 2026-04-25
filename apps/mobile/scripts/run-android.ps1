# Native Android dev build: `npx expo run:android` with JDK + Android SDK env set.
# Fixes "JAVA_HOME is not set". Native CMake issues on Windows are mitigated via app.config.js
# (x86_64-only + org.gradle.parallel=false). If builds still fail, use a shorter clone path (e.g. C:\dev\na)
# or set EXPO_ANDROID_ALL_ARCH=1 for arm64 device builds after moving the repo.
#
# Usage (from repo):  npm run android:native
# Or:                  .\scripts\run-android.ps1
# First time / stale native:  npx expo prebuild --platform android --clean

$ErrorActionPreference = "Stop"

$javaHome = "${env:ProgramFiles}\Android\Android Studio\jbr"
if (-not (Test-Path "$javaHome\bin\java.exe")) {
  Write-Error "JDK not found at $javaHome. Install Android Studio (bundled JBR) or set JAVA_HOME manually."
}

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = "${env:LOCALAPPDATA}\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
if (-not $env:NODE_ENV) {
  $env:NODE_ENV = "development"
}

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "JAVA_HOME=$env:JAVA_HOME"
Write-Host "ANDROID_HOME=$env:ANDROID_HOME"
Write-Host "Project: $root"
Write-Host ""

# --all-arch: Gradle uses gradle.properties ABIs (see app.config.js / expo-build-properties buildArchs).
npx expo run:android --all-arch
