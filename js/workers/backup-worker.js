'use strict';
/**
 * Background backup worker (worker_threads).
 *
 * Offloads recursive file collection, CRC32 calculation, zlib compression,
 * and archive/folder writing off the Electron main process so the UI and
 * window activation remain 100% responsive while backups are created.
 */
const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const zlib = require('zlib');
const { once } = require('events');

const BACKUP_META_ENTRY = '__backup_meta__.json';

const CRC32_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    t[i] = c;
  }
  return t;
})();

function calcCrc32(buf) {
  if (typeof zlib.crc32 === 'function') return zlib.crc32(buf);
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toDosDateTime(ms) {
  const d = new Date(Number(ms) || Date.now());
  let year = d.getFullYear();
  if (year < 1980) year = 1980;
  if (year > 2107) year = 2107;
  const dosDate = ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  return { dosDate, dosTime };
}

function deflateRawAsync(buf, level = 1) {
  return new Promise((resolve, reject) => {
    zlib.deflateRaw(buf, { level }, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

async function collectFiles(dir, rootPrefix) {
  const fileList = [];
  async function walk(currentDir) {
    let entries;
    try {
      entries = await fsp.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const rel = path.relative(dir, fullPath).replace(/\\/g, '/');
        const zipName = rootPrefix ? `${rootPrefix}/${rel}` : rel;
        fileList.push({ fullPath, relativePath: zipName });
      }
    }
  }
  await walk(dir);
  return fileList;
}

async function writeZipEntry(fh, centralDirs, entryName, rawContent, mtimeMs, currentOffset, level, forceStore = false) {
  const uncompressedSize = rawContent.length;
  const crc = calcCrc32(rawContent);
  const { dosDate, dosTime } = toDosDateTime(mtimeMs);

  let compMethod = 0;
  let compData = rawContent;
  let compSize = uncompressedSize;

  if (!forceStore) {
    const deflated = await deflateRawAsync(rawContent, level);
    if (deflated.length < uncompressedSize) {
      compMethod = 8;
      compData = deflated;
      compSize = deflated.length;
    }
  }

  const nameBuf = Buffer.from(entryName, 'utf8');
  const nameLen = nameBuf.length;

  const lfh = Buffer.alloc(30 + nameLen);
  lfh.writeUInt32LE(0x04034b50, 0);
  lfh.writeUInt16LE(20, 4);
  lfh.writeUInt16LE(0x0800, 6);
  lfh.writeUInt16LE(compMethod, 8);
  lfh.writeUInt16LE(dosTime, 10);
  lfh.writeUInt16LE(dosDate, 12);
  lfh.writeUInt32LE(crc, 14);
  lfh.writeUInt32LE(compSize, 18);
  lfh.writeUInt32LE(uncompressedSize, 22);
  lfh.writeUInt16LE(nameLen, 26);
  lfh.writeUInt16LE(0, 28);
  nameBuf.copy(lfh, 30);

  await fh.write(lfh);
  if (compData.length > 0) {
    await fh.write(compData);
  }

  const cdh = Buffer.alloc(46 + nameLen);
  cdh.writeUInt32LE(0x02014b50, 0);
  cdh.writeUInt16LE(20, 4);
  cdh.writeUInt16LE(20, 6);
  cdh.writeUInt16LE(0x0800, 8);
  cdh.writeUInt16LE(compMethod, 10);
  cdh.writeUInt16LE(dosTime, 12);
  cdh.writeUInt16LE(dosDate, 14);
  cdh.writeUInt32LE(crc, 16);
  cdh.writeUInt32LE(compSize, 20);
  cdh.writeUInt32LE(uncompressedSize, 24);
  cdh.writeUInt16LE(nameLen, 28);
  cdh.writeUInt16LE(0, 30);
  cdh.writeUInt16LE(0, 32);
  cdh.writeUInt16LE(0, 34);
  cdh.writeUInt16LE(0, 36);
  cdh.writeUInt32LE(0x81a40000, 38);
  cdh.writeUInt32LE(currentOffset, 42);
  nameBuf.copy(cdh, 46);

  centralDirs.push(cdh);
  return currentOffset + lfh.length + compSize;
}

async function runZipBackup({ sourceDir, destFile, rootPrefix = 'user', includeMeta = false, level = 1 }) {
  const files = await collectFiles(sourceDir, rootPrefix);
  await fsp.mkdir(path.dirname(destFile), { recursive: true });

  const tmpFile = `${destFile}.tmp.${process.pid}.${Date.now()}`;
  const centralDirs = [];
  const errors = [];
  const timestampMap = includeMeta ? {} : null;
  let currentOffset = 0;
  let copiedCount = 0;
  let fh = null;

  try {
    fh = await fsp.open(tmpFile, 'w');

    for (const file of files) {
      try {
        const rawContent = await fsp.readFile(file.fullPath);
        const stats = await fsp.stat(file.fullPath);
        if (timestampMap) {
          timestampMap[file.relativePath] = {
            mtimeMs: Number(stats.mtimeMs) || undefined,
            ctimeMs: Number(stats.ctimeMs) || undefined,
            birthtimeMs: Number(stats.birthtimeMs) || undefined
          };
        }
        currentOffset = await writeZipEntry(
          fh,
          centralDirs,
          file.relativePath,
          rawContent,
          stats.mtimeMs,
          currentOffset,
          level
        );
        copiedCount++;
      } catch (err) {
        errors.push({ filename: file.relativePath, error: String(err?.message || err) });
      }
    }

    if (includeMeta) {
      const backupMeta = {
        version: 1,
        generatedAt: Date.now(),
        timestamps: timestampMap
      };
      const metaBuf = Buffer.from(JSON.stringify(backupMeta), 'utf8');
      currentOffset = await writeZipEntry(
        fh,
        centralDirs,
        BACKUP_META_ENTRY,
        metaBuf,
        Date.now(),
        currentOffset,
        level
      );
    }

    const cdStartOffset = currentOffset;
    const cdBuffer = centralDirs.length > 0 ? Buffer.concat(centralDirs) : Buffer.alloc(0);
    if (cdBuffer.length > 0) {
      await fh.write(cdBuffer);
    }

    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(centralDirs.length, 8);
    eocd.writeUInt16LE(centralDirs.length, 10);
    eocd.writeUInt32LE(cdBuffer.length, 12);
    eocd.writeUInt32LE(cdStartOffset, 16);
    eocd.writeUInt16LE(0, 20);
    await fh.write(eocd);

    await fh.close();
    fh = null;

    try { await fsp.unlink(destFile); } catch { }
    await fsp.rename(tmpFile, destFile);

    return {
      ok: true,
      copied: copiedCount,
      count: centralDirs.length,
      errors,
      path: destFile
    };
  } catch (err) {
    if (fh) {
      try { await fh.close(); } catch { }
    }
    try { await fsp.unlink(tmpFile); } catch { }
    throw err;
  }
}

async function writeChunkWithBackpressure(stream, buf) {
  if (!buf || buf.length === 0) return;
  if (!stream.write(buf)) {
    await once(stream, 'drain');
  }
}

async function runTarGzBackup({ sourceDir, destFile, rootPrefix = 'user', level = 1 }) {
  const files = await collectFiles(sourceDir, rootPrefix);
  await fsp.mkdir(path.dirname(destFile), { recursive: true });

  const tmpFile = `${destFile}.tmp.${process.pid}.${Date.now()}`;
  const errors = [];
  let copiedCount = 0;

  const outStream = fs.createWriteStream(tmpFile);
  const gzip = zlib.createGzip({ level });
  gzip.pipe(outStream);

  const finishPromise = new Promise((resolve, reject) => {
    outStream.on('finish', resolve);
    outStream.on('error', reject);
    gzip.on('error', reject);
  });

  try {
    for (const file of files) {
      try {
        const content = await fsp.readFile(file.fullPath);
        const stats = await fsp.stat(file.fullPath);

        const header = Buffer.alloc(512);
        let nameStr = file.relativePath;
        let prefixStr = '';
        if (Buffer.byteLength(nameStr) > 100) {
          const slashIdx = nameStr.indexOf('/', nameStr.length - 100);
          if (slashIdx > 0 && slashIdx <= 155) {
            prefixStr = nameStr.substring(0, slashIdx);
            nameStr = nameStr.substring(slashIdx + 1);
          }
        }

        header.write(nameStr, 0, Math.min(100, Buffer.byteLength(nameStr)), 'utf8');
        header.write('0000644\0', 100, 8, 'utf8');
        header.write('0000000\0', 108, 8, 'utf8');
        header.write('0000000\0', 116, 8, 'utf8');
        header.write(content.length.toString(8).padStart(11, '0') + '\0', 124, 12, 'utf8');
        const mtimeSec = Math.floor(stats.mtimeMs / 1000);
        header.write(mtimeSec.toString(8).padStart(11, '0') + '\0', 136, 12, 'utf8');
        header.write('        ', 148, 8, 'utf8');
        header.write('0', 156, 1, 'utf8');
        header.write('ustar\0', 257, 6, 'utf8');
        header.write('00', 263, 2, 'utf8');
        if (prefixStr) {
          header.write(prefixStr, 345, Math.min(155, Buffer.byteLength(prefixStr)), 'utf8');
        }

        let chksum = 0;
        for (let i = 0; i < 512; i++) {
          chksum += header[i];
        }
        header.write(chksum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'utf8');

        await writeChunkWithBackpressure(gzip, header);
        await writeChunkWithBackpressure(gzip, content);

        const padLen = (512 - (content.length % 512)) % 512;
        if (padLen > 0) {
          await writeChunkWithBackpressure(gzip, Buffer.alloc(padLen));
        }

        copiedCount++;
      } catch (err) {
        errors.push({ filename: file.relativePath, error: String(err?.message || err) });
      }
    }

    await writeChunkWithBackpressure(gzip, Buffer.alloc(1024));
    gzip.end();
    await finishPromise;

    try { await fsp.unlink(destFile); } catch { }
    await fsp.rename(tmpFile, destFile);

    return { ok: true, copied: copiedCount, errors, path: destFile };
  } catch (err) {
    try { gzip.destroy(); } catch { }
    try { outStream.destroy(); } catch { }
    try { await fsp.unlink(tmpFile); } catch { }
    throw err;
  }
}

async function renameWithRetry(tmpFile, destFile) {
  let lastErr = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await fsp.rename(tmpFile, destFile);
      return;
    } catch (renameErr) {
      lastErr = renameErr;
      if (renameErr.code === 'EPERM' || renameErr.code === 'EEXIST' || renameErr.code === 'EBUSY' || renameErr.code === 'EACCES') {
        await fsp.unlink(destFile).catch(() => { });
        await new Promise(r => setTimeout(r, 60));
      } else {
        throw renameErr;
      }
    }
  }
  throw lastErr || new Error('Could not rename temp archive to target path');
}

function decodeEntryBuffer(entry) {
  if (Buffer.isBuffer(entry.data)) return entry.data;
  if (entry.data instanceof Uint8Array) {
    return Buffer.from(entry.data.buffer, entry.data.byteOffset, entry.data.byteLength);
  }
  if (entry.data && entry.data.buffer instanceof ArrayBuffer) {
    return Buffer.from(entry.data.buffer, entry.data.byteOffset || 0, entry.data.byteLength || entry.data.length);
  }
  if (entry.encoding === 'base64') {
    let rawB64 = String(entry.data || '');
    const commaIdx = rawB64.indexOf(',');
    if (rawB64.startsWith('data:') && commaIdx !== -1) {
      rawB64 = rawB64.slice(commaIdx + 1);
    }
    return Buffer.from(rawB64, 'base64');
  }
  return Buffer.from(String(entry.data || ''), 'utf8');
}

async function runZipEntriesBackup({ entries = [], destFile, level = 1 }) {
  const finalDir = path.dirname(destFile);
  const filename = path.basename(destFile);
  await fsp.mkdir(finalDir, { recursive: true });

  const randTag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tmpFile = path.join(finalDir, `.${filename}.${randTag}.tmp`);
  const centralDirs = [];
  let currentOffset = 0;
  let fh = null;

  try {
    fh = await fsp.open(tmpFile, 'w');

    for (const entry of entries) {
      if (!entry || !entry.name) continue;
      const name = String(entry.name).replace(/\\/g, '/');
      const data = decodeEntryBuffer(entry);
      const store = entry.store !== false && entry.compressionMethod !== 8;
      currentOffset = await writeZipEntry(
        fh,
        centralDirs,
        name,
        data,
        entry.mtimeMs || Date.now(),
        currentOffset,
        level,
        store
      );
    }

    const cdStartOffset = currentOffset;
    const cdBuffer = centralDirs.length > 0 ? Buffer.concat(centralDirs) : Buffer.alloc(0);
    if (cdBuffer.length > 0) {
      await fh.write(cdBuffer);
    }

    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(centralDirs.length, 8);
    eocd.writeUInt16LE(centralDirs.length, 10);
    eocd.writeUInt32LE(cdBuffer.length, 12);
    eocd.writeUInt32LE(cdStartOffset, 16);
    eocd.writeUInt16LE(0, 20);
    await fh.write(eocd);

    const totalSize = cdStartOffset + cdBuffer.length + 22;
    await fh.close();
    fh = null;

    await renameWithRetry(tmpFile, destFile);
    return { ok: true, path: destFile, count: centralDirs.length, size: totalSize };
  } catch (err) {
    if (fh) {
      try { await fh.close(); } catch { }
    }
    await fsp.unlink(tmpFile).catch(() => { });
    throw err;
  }
}

async function runFolderBackup({ sourceDir, destDir }) {
  let copied = 0;
  const errors = [];

  async function copyTree(src, dst) {
    let dirents;
    try {
      dirents = await fsp.readdir(src, { withFileTypes: true });
    } catch {
      return;
    }
    await fsp.mkdir(dst, { recursive: true });

    for (const entry of dirents) {
      const srcPath = path.join(src, entry.name);
      const dstPath = path.join(dst, entry.name);
      if (entry.isDirectory()) {
        await copyTree(srcPath, dstPath);
      } else if (entry.isFile()) {
        try {
          await fsp.copyFile(srcPath, dstPath);
          const stats = await fsp.stat(srcPath);
          await fsp.utimes(dstPath, stats.atime, stats.mtime).catch(() => { });
          copied++;
        } catch (err) {
          errors.push({ path: srcPath, error: String(err?.message || err) });
        }
      }
    }
  }

  await copyTree(sourceDir, destDir);
  return { ok: true, copied, errors };
}

async function main() {
  try {
    const task = workerData || {};
    let result;
    if (task.op === 'zip') {
      result = await runZipBackup(task);
    } else if (task.op === 'zip-entries') {
      result = await runZipEntriesBackup(task);
    } else if (task.op === 'targz') {
      result = await runTarGzBackup(task);
    } else if (task.op === 'folder') {
      result = await runFolderBackup(task);
    } else {
      throw new Error(`Unknown backup operation: ${String(task.op)}`);
    }
    if (parentPort) {
      parentPort.postMessage(result);
    }
  } catch (err) {
    if (parentPort) {
      parentPort.postMessage({
        ok: false,
        error: String(err?.message || err)
      });
    }
    process.exitCode = 1;
  }
}

main();
