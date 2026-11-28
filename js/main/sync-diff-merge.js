// Helper functions for reading sync file pairs for comparison and writing merged results.
'use strict';

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.avif',
  '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.webm', '.mp4', '.mkv', '.mov', '.avi',
  '.pdf', '.zip', '.gz', '.tar', '.7z', '.rar', '.exe', '.dll', '.so', '.dylib',
  '.woff', '.woff2', '.ttf', '.otf', '.eot', '.onnx', '.bin', '.dat', '.sqlite', '.db'
]);

const MAX_TEXT_DIFF_BYTES = 5 * 1024 * 1024; // 5 MB

function isLikelyBinary(ext, buf) {
  if (BINARY_EXTENSIONS.has(ext)) return true;
  if (!buf || buf.length === 0) return false;
  const sampleLen = Math.min(buf.length, 8192);
  for (let i = 0; i < sampleLen; i++) {
    if (buf[i] === 0) return true;
  }
  return false;
}

async function readFileEntry(fs, path, crypto, filePath) {
  try {
    const stat = await fs.stat(filePath);
    const ext = path.extname(filePath).toLowerCase();
    if (stat.size > MAX_TEXT_DIFF_BYTES) {
      return {
        exists: true,
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        tooLarge: true,
        isBinary: BINARY_EXTENSIONS.has(ext),
        sha256: null,
        text: null
      };
    }
    const buf = await fs.readFile(filePath);
    const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
    const binary = isLikelyBinary(ext, buf);
    return {
      exists: true,
      size: stat.size,
      mtimeMs: stat.mtimeMs,
      tooLarge: false,
      isBinary: binary,
      sha256,
      text: binary ? null : buf.toString('utf8')
    };
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return { exists: false, size: 0, mtimeMs: 0, tooLarge: false, isBinary: false, sha256: null, text: null };
    }
    throw err;
  }
}

async function readSyncPair({ fs, path, crypto }, srcPath, destPath) {
  const [src, dest] = await Promise.all([
    readFileEntry(fs, path, crypto, srcPath),
    readFileEntry(fs, path, crypto, destPath)
  ]);

  const isBinary = Boolean(src.isBinary || dest.isBinary);
  const tooLarge = Boolean(src.tooLarge || dest.tooLarge);
  const sameContent = Boolean(src.exists && dest.exists && src.sha256 && src.sha256 === dest.sha256);

  return {
    ok: true,
    isBinary,
    tooLarge,
    sameContent,
    src,
    dest
  };
}

async function writeMergedSyncFile({ fs, path }, srcPath, destPath, mergedContent, { backupBeforeMerge = false, bakIfExists = null } = {}) {
  if (backupBeforeMerge && typeof bakIfExists === 'function') {
    await bakIfExists(srcPath);
    await bakIfExists(destPath);
  }

  await fs.mkdir(path.dirname(srcPath), { recursive: true });
  await fs.mkdir(path.dirname(destPath), { recursive: true });

  await fs.writeFile(srcPath, mergedContent, 'utf8');
  await fs.writeFile(destPath, mergedContent, 'utf8');

  const stat = await fs.stat(srcPath);
  await fs.utimes(destPath, stat.atime, stat.mtime).catch(() => {});

  return { mtimeMs: stat.mtimeMs, size: stat.size };
}

module.exports = {
  readSyncPair,
  writeMergedSyncFile
};
