#!/usr/bin/env bash
# Builds a macOS DMG using electron-builder.
# Electron binaries and builder cache are stored under .cache/ so they are
# downloaded only once and reused on subsequent builds.
# Output: dist/mac/*.dmg
#
# Usage:
#   bash package-mac.sh           # x64 (Intel)
#   bash package-mac.sh --arm64   # Apple Silicon
#   bash package-mac.sh --x64 --arm64  # universal

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Install npm dependencies if not already present.
if [ ! -f "node_modules/electron/package.json" ]; then
    echo "Installing npm dependencies..."
    npm install --no-audit --no-fund
fi

# Point electron and electron-builder at a local cache directory so binaries
# are downloaded only once (same behaviour as the Docker Linux build).
export ELECTRON_CACHE="$SCRIPT_DIR/.cache/electron"
export ELECTRON_BUILDER_CACHE="$SCRIPT_DIR/.cache/electron-builder"

ARCH_FLAGS="${*:---x64}"

echo "Building macOS DMG ($ARCH_FLAGS)..."
npx electron-builder --mac dmg $ARCH_FLAGS --config.directories.output=dist/mac

echo ""
echo "Build complete:"
find "$SCRIPT_DIR/dist/mac" -name "*.dmg" | while read -r f; do
    echo " - $f"
done
