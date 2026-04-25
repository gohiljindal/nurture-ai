# Adds a Windows Defender controlled-folder exclusion for this app folder (node_modules + native builds).
# Run PowerShell *as Administrator* once per machine if CMake/ninja still fails after npm install.
#
#   .\scripts\android-defender-exclusion.ps1
#
# Or manually: Windows Security -> Virus & threat protection -> Manage settings ->
# Exclusions -> Add folder -> choose apps\mobile (or the monorepo root).

$ErrorActionPreference = "Stop"

$mobileRoot = Split-Path -Parent $PSScriptRoot
$path = (Resolve-Path $mobileRoot).Path

try {
  Add-MpPreference -ExclusionPath $path
  Write-Host "Defender exclusion added for: $path"
} catch {
  Write-Error "Could not add exclusion (try Administrator PowerShell): $_"
  exit 1
}
