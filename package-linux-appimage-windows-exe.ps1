# Builds a Linux AppImage (via Docker/WSL) and a Windows portable .exe simultaneously.
# Output: dist/appimage/*.AppImage
#         dist/win-portable/*.exe

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

trap {
    Write-Host ''
    Write-Host "ERROR: $_" -ForegroundColor Red
    Write-Host ''
    Write-Host 'Press any key to close...' -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

$hasDocker = [bool](Get-Command docker -ErrorAction SilentlyContinue)
$hasWsl = [bool](Get-Command wsl -ErrorAction SilentlyContinue)

if (-not $hasDocker -and -not $hasWsl) {
    throw 'AppImage packaging requires Docker Desktop or WSL. Install one of them and retry.'
}

# Ensure dependencies are present in the workspace before container build.
if (-not (Test-Path (Join-Path $ScriptDir 'node_modules\electron\package.json'))) {
    Write-Host 'Installing npm dependencies...'
    npm install --no-audit --no-fund | Out-Host
}

# User data is not bundled in the app package; runtime data is created in the writable folder.

# Clean up stale Linux build output so a failed/interrupted prior build can't
# mask a new failure by leaving old artifacts that pass the post-build checks.
$appImageDirPre = Join-Path $ScriptDir 'dist\appimage'
if (Test-Path $appImageDirPre) {
    Write-Host "Removing stale dist/appimage folder before rebuild..."
    Remove-Item -Recurse -Force $appImageDirPre -ErrorAction SilentlyContinue
}

if ($hasDocker) {
    # Check if Docker daemon is running; if not, start Docker Desktop and wait.
    $dockerRunning = $false
    try {
        docker info 2>&1 | Out-Null
        $dockerRunning = ($LASTEXITCODE -eq 0)
    } catch { }

    if (-not $dockerRunning) {
        Write-Host 'Docker daemon is not running. Starting Docker Desktop...'
        $dockerDesktopExe = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
        if (-not (Test-Path $dockerDesktopExe)) {
            throw 'Docker Desktop executable not found. Please start Docker manually and retry.'
        }
        Start-Process $dockerDesktopExe

        Write-Host 'Waiting for Docker daemon to become ready...'
        $timeout = 120   # seconds
        $elapsed = 0
        $interval = 5
        while ($elapsed -lt $timeout) {
            Start-Sleep -Seconds $interval
            $elapsed += $interval
            docker info 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) { break }
            Write-Host "  Still waiting... ($elapsed/$timeout s)"
        }

        docker info 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "Docker daemon did not start within $timeout seconds. Start Docker Desktop manually and retry."
        }
        Write-Host 'Docker daemon is ready.'

        # Re-launch this script now that Docker is running.
        Write-Host 'Re-executing script with Docker available...'
        & powershell -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path
        exit $LASTEXITCODE
    }

    $dockerImage = 'electronuserland/builder:latest'
    $dockerProjectPath = '/project'

    Write-Host "Using Docker image: $dockerImage"
    Write-Host 'Building Linux AppImage (x64)...'

    # Write the build commands to a temp shell script inside the project so
    # Docker can execute it directly — avoids PowerShell 5 splatting quoting
    # issues that break double-quoted strings passed via bash -lc.
    # Use .NET WriteAllText with explicit LF endings to avoid CRLF/BOM issues.
    $buildScript = Join-Path $ScriptDir '_docker-build-linux.tmp.sh'
    $bashLines = @(
        '#!/bin/bash',
        'set -e',
        'echo "[Docker 1/2] Building AppImage in /tmp (avoids NTFS rename errors)..."',
        'npx electron-builder --linux AppImage --x64 --config.directories.output=/tmp/build-output',
        'echo "[Docker 2/2] Copying AppImage back to mounted volume..."',
        'mkdir -p /project/dist/appimage',
        'cp /tmp/build-output/*.AppImage /project/dist/appimage/',
        'cp /tmp/build-output/builder-debug.yml /project/dist/appimage/ 2>/dev/null || true'
    )
    [System.IO.File]::WriteAllText($buildScript, ($bashLines -join "`n"), [System.Text.Encoding]::ASCII)

    try {
        $cmd = @(
            'run', '--rm',
            '-v', "${ScriptDir}:/project",
            '-w', '/project',
            '-e', 'ELECTRON_CACHE=/project/.cache/electron',
            '-e', 'ELECTRON_BUILDER_CACHE=/project/.cache/electron-builder',
            $dockerImage,
            'bash', '/project/_docker-build-linux.tmp.sh'
        )
        & docker @cmd
        if ($LASTEXITCODE -ne 0) {
            if ($LASTEXITCODE -eq 137) {
                Write-Warning 'Docker build was killed (exit 137), usually due to memory pressure. Consider increasing Docker memory in Docker Desktop settings or use WSL fallback.'
            }
            throw "Docker AppImage build failed with exit code $LASTEXITCODE."
        }
    } finally {
        Remove-Item $buildScript -ErrorAction SilentlyContinue
    }
}
else {
    Write-Host 'Docker not found. Using WSL fallback for Linux AppImage build...'

    $wslProjectPath = (& wsl wslpath -a "$ScriptDir").Trim()
    if ($LASTEXITCODE -ne 0 -or -not $wslProjectPath) {
        throw 'WSL is not installed/configured. Run wsl --install or install Docker Desktop, then retry.'
    }

    # Copy to a temp WSL-native directory to avoid overwriting Windows node_modules
    $wslCommand = @"
set -e
TMPDIR=\$(mktemp -d)
trap 'rm -rf \"\$TMPDIR\"' EXIT
rsync -a --exclude=node_modules --exclude=dist '$wslProjectPath/' \"\$TMPDIR/\"
cd \"\$TMPDIR\"
echo "[WSL 1/2] Installing dependencies (npm ci)..."
npm ci --foreground-scripts --loglevel verbose --no-audit --no-fund
echo "[WSL 2/2] Running electron-builder..."
npx electron-builder --linux AppImage --x64
rsync -a dist/ '$wslProjectPath/dist/'
"@
    & wsl bash -lc $wslCommand
    if ($LASTEXITCODE -ne 0) {
        throw "WSL AppImage build failed with exit code $LASTEXITCODE."
    }
}



$appImageDir = Join-Path $ScriptDir 'dist\appimage'
if (-not (Test-Path $appImageDir)) {
    throw 'Build completed but dist/appimage was not found.'
}

$appImages = Get-ChildItem -Path $appImageDir -Filter *.AppImage -File -ErrorAction SilentlyContinue
if (-not $appImages) {
    throw 'No .AppImage artifact was produced in dist/appimage.'
}

Write-Host ''
Write-Host 'Building Windows portable .exe...'

# Remove any previous win-unpacked output so locked/stale files from a prior
# build do not cause "Access is denied" errors during packaging.
$winPortableDir = Join-Path $ScriptDir 'dist\win-portable'
$winUnpacked = Join-Path $winPortableDir 'win-unpacked'
if (Test-Path $winUnpacked) {
    Write-Host "Removing stale win-unpacked folder..."
    # Kill any running instance of the built app to release file locks.
    Get-Process -Name 'Class Management Tools' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
    Remove-Item -Recurse -Force $winUnpacked -ErrorAction SilentlyContinue
}
# Also remove any leftover .exe artifacts so electron-builder starts clean.
if (Test-Path $winPortableDir) {
    Get-ChildItem -Path $winPortableDir -Filter '*.exe' -File -ErrorAction SilentlyContinue |
        Remove-Item -Force -ErrorAction SilentlyContinue
}

# ---- winCodeSign cache pre-population workaround ----------------------------------------
# electron-builder always downloads winCodeSign-2.6.0.7z on Windows, but that archive
# contains macOS symlinks (darwin/10.12/lib/libcrypto.dylib, libssl.dylib) that 7-Zip
# cannot create on Windows without Developer Mode, so extraction exits with code 2 and
# the build aborts after 4 retries.  We pre-extract the archive ourselves into the proper
# cache folder, tolerate exit 2, and drop empty stub files for the two macOS symlinks.
# Once the 'winCodeSign-2.6.0' folder exists, electron-builder skips the download entirely.
$winCodeSignCacheDir = "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign"
$winCodeSignTarget   = Join-Path $winCodeSignCacheDir 'winCodeSign-2.6.0'
if (-not (Test-Path (Join-Path $winCodeSignTarget 'windows'))) {
    Write-Host "Pre-populating winCodeSign cache (Windows symlink workaround)..."
    $sevenZip = Join-Path $ScriptDir 'node_modules\7zip-bin\win\x64\7za.exe'
    $tmpZip   = Join-Path $env:TEMP "winCodeSign-2.6.0.7z"
    $url      = 'https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z'
    Write-Host "  Downloading winCodeSign-2.6.0..."
    Invoke-WebRequest -Uri $url -OutFile $tmpZip -UseBasicParsing
    New-Item -ItemType Directory -Force $winCodeSignTarget | Out-Null
    Write-Host "  Extracting (macOS symlink errors will be ignored)..."
    & $sevenZip x -y $tmpZip "-o$winCodeSignTarget" | Out-Null
    # exit 2 = only the macOS symlinks failed; all Windows tools are extracted correctly
    # Create stub placeholder files for the two macOS symlinks 7-Zip could not create.
    $darwinLib = Join-Path $winCodeSignTarget 'darwin\10.12\lib'
    New-Item -ItemType Directory -Force $darwinLib | Out-Null
    foreach ($stub in 'libcrypto.dylib', 'libssl.dylib') {
        $p = Join-Path $darwinLib $stub
        if (-not (Test-Path $p)) { New-Item -ItemType File -Force $p | Out-Null }
    }
    Remove-Item $tmpZip -ErrorAction SilentlyContinue
    Write-Host "  winCodeSign cache ready at $winCodeSignTarget"
}
# -----------------------------------------------------------------------------------------

$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
& npx electron-builder --win portable --x64 --config.directories.output=dist/win-portable
if ($LASTEXITCODE -ne 0) {
    throw "Windows portable build failed with exit code $LASTEXITCODE."
}

$winExes = Get-ChildItem -Path $winPortableDir -Filter *.exe -File -ErrorAction SilentlyContinue
if (-not $winExes) {
    throw 'No .exe artifact was produced in dist/win-portable.'
}


# Copy the Linux launcher script into the AppImage output folder.
$launcherSrc = Join-Path $ScriptDir 'launch-linux.sh'
$launcherDst = Join-Path $appImageDir 'launch-linux.sh'
if (Test-Path $launcherSrc) {
    Copy-Item -Path $launcherSrc -Destination $launcherDst -Force
    Write-Host "Launcher script copied to $launcherDst"
}

Write-Host ''
Write-Host 'Build complete:'
$appImages | ForEach-Object { Write-Host " - $($_.FullName)" }
Write-Host " - $launcherDst"
$winExes   | ForEach-Object { Write-Host " - $($_.FullName)" }
