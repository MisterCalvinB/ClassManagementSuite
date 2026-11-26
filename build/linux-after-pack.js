/**
 * electron-builder afterPack hook for Linux targets.
 * Wraps the Electron binary in a POSIX shell launcher that passes --no-sandbox
 * when running inside an AppImage, as root, or when chrome-sandbox lacks the
 * SUID root bit (04755). This prevents Chromium's zygote from aborting on
 * startup on modern Linux distros (e.g. Ubuntu 24.04+ AppArmor userns limits).
 */
'use strict';

const fs = require('fs');
const path = require('path');

exports.default = async function linuxAfterPack(context) {
  if (context.electronPlatformName !== 'linux') {
    return;
  }

  const exeName = (context.packager && context.packager.executableName) || 'class-management-tools';
  const exePath = path.join(context.appOutDir, exeName);
  const binPath = path.join(context.appOutDir, `${exeName}.bin`);

  if (!fs.existsSync(exePath) || fs.existsSync(binPath)) {
    return;
  }

  fs.renameSync(exePath, binPath);

  const wrapper = [
    '#!/bin/sh',
    'HERE="$(dirname "$(readlink -f "$0")")"',
    'if [ -n "$APPIMAGE" ] || [ "$(id -u)" -eq 0 ] || [ ! -u "$HERE/chrome-sandbox" ]; then',
    `  exec "$HERE/${exeName}.bin" --no-sandbox "$@"`,
    'fi',
    `exec "$HERE/${exeName}.bin" "$@"`,
    ''
  ].join('\n');

  fs.writeFileSync(exePath, wrapper, { encoding: 'utf8', mode: 0o755 });
  fs.chmodSync(exePath, 0o755);
  console.log(`linuxAfterPack: wrapped ${exeName} with SUID-sandbox fallback.`);
};
