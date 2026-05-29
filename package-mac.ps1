# Builds a macOS DMG using electron-builder.
# Electron binaries and builder cache are stored under .cache/ so they are
# downloaded only once and reused on subsequent builds.
# Output: dist/mac/*.dmg
#
# NOTE: macOS DMG builds must run on macOS. Use this script from a macOS
#       machine or a macOS CI runner. Running on Windows will fail at the
#       electron-builder step.
#
# Usage:
#   .\package-mac.ps1              # x64 (Intel)
#   .\package-mac.ps1 --arm64      # Apple Silicon
#   .\package-mac.ps1 --x64 --arm64  # universal

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

try {

if (-not $IsMacOS) {
    throw "macOS DMG builds must run on macOS. This machine is running $([System.Runtime.InteropServices.RuntimeInformation]::OSDescription). Copy this script to a Mac (or a macOS CI runner) and run it there."
}

$ScriptDir = $PSScriptRoot
Set-Location $ScriptDir

# Install npm dependencies if not already present.
if (-not (Test-Path (Join-Path $ScriptDir 'node_modules\electron\package.json'))) {
    Write-Host 'Installing npm dependencies...'
    npm install --no-audit --no-fund | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "npm install failed with exit code $LASTEXITCODE." }
}

# Point electron and electron-builder at a local cache directory so binaries
# are downloaded only once (same behaviour as the Linux/Docker build).
$env:ELECTRON_CACHE         = Join-Path $ScriptDir '.cache\electron'
$env:ELECTRON_BUILDER_CACHE = Join-Path $ScriptDir '.cache\electron-builder'

# Default to x64 if no arch flags are supplied.
$ArchFlags = if ($args.Count -gt 0) { $args } else { @('--x64') }

Write-Host "Building macOS DMG ($($ArchFlags -join ' '))..."
& npx electron-builder --mac dmg @ArchFlags --config.directories.output=dist/mac
if ($LASTEXITCODE -ne 0) {
    throw "electron-builder macOS build failed with exit code $LASTEXITCODE."
}

$macDir = Join-Path $ScriptDir 'dist\mac'
if (-not (Test-Path $macDir)) {
    throw 'Build completed but dist/mac was not found.'
}

$dmgs = Get-ChildItem -Path $macDir -Filter *.dmg -File -ErrorAction SilentlyContinue
if (-not $dmgs) {
    throw 'No .dmg artifact was produced in dist/mac.'
}

Write-Host ''
Write-Host 'Build complete:'
$dmgs | ForEach-Object { Write-Host " - $($_.FullName)" }

} catch {
    Write-Host ''
    Write-Host "ERROR: $_" -ForegroundColor Red
}

Read-Host "`nPress Enter to close"
