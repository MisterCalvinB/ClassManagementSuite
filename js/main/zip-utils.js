// Pure Node ZIP archive utilities extracted from electron-main.js
'use strict';

const fs = require('fs/promises');
const path = require('path');
const zlib = require('zlib');

const CRC32_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ buffer[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function msToDosDateTime(ms) {
  const d = new Date(Number(ms) || Date.now());
  let year = d.getFullYear();
  if (year < 1980) year = 1980;
  if (year > 2107) year = 2107;

  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const seconds = Math.floor(d.getSeconds() / 2);

  const dosTime = (hours << 11) | (minutes << 5) | seconds;
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;
  return { dosTime, dosDate };
}

function dosDateTimeToMs(dosTime, dosDate) {
  if (!dosDate && !dosTime) return null;

  const year = 1980 + ((dosDate >> 9) & 0x7f);
  const month = (dosDate >> 5) & 0x0f;
  const day = dosDate & 0x1f;
  const hours = (dosTime >> 11) & 0x1f;
  const minutes = (dosTime >> 5) & 0x3f;
  const seconds = (dosTime & 0x1f) * 2;

  const ms = new Date(year, (month || 1) - 1, day || 1, hours, minutes, seconds).getTime();
  return Number.isFinite(ms) ? ms : null;
}

async function buildZip(entries) {
  // entries: Array<{ name: string, data: Buffer, mtimeMs?: number, store?: boolean, compressionMethod?: number }>
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  let loopCount = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const isStore = entry.store === true || entry.compressionMethod === 0;
    const method = isStore ? 0 : 8;
    const compressed = isStore
      ? entry.data
      : await new Promise((resolve, reject) => {
        zlib.deflateRaw(entry.data, { level: 1 }, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      });
    const crc = crc32(entry.data);
    const { dosTime, dosDate } = msToDosDateTime(entry.mtimeMs);

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);
    localParts.push(local, compressed);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);
    centralParts.push(central);

    offset += local.length + compressed.length;

    loopCount++;
    if (loopCount % 10 === 0) {
      await new Promise(r => setImmediate(r));
    }
  }

  const centralDir = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(centralParts.length, 8);
  end.writeUInt16LE(centralParts.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, end]);
}

async function collectDirEntries(dirPath, zipPrefix) {
  const entries = [];
  let dirents;
  try {
    dirents = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return entries;
  }
  for (const dirent of dirents) {
    const full = path.join(dirPath, dirent.name);
    const zipName = zipPrefix ? `${zipPrefix}/${dirent.name}` : dirent.name;
    if (dirent.isDirectory()) {
      entries.push(...await collectDirEntries(full, zipName));
    } else if (dirent.isFile()) {
      try {
        const data = await fs.readFile(full);
        const stats = await fs.stat(full);
        entries.push({
          name: zipName,
          data,
          mtimeMs: stats.mtimeMs,
          ctimeMs: stats.ctimeMs,
          birthtimeMs: stats.birthtimeMs
        });
      } catch { }
    }
  }
  return entries;
}
// ──────────────────────────────────────────────────────────────────────

module.exports = {
  crc32,
  msToDosDateTime,
  dosDateTimeToMs,
  buildZip,
  collectDirEntries
};
