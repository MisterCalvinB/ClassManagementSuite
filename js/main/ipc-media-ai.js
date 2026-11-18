// Media converter, Whisper, and SLM IPC handlers extracted from electron-main.js
'use strict';

function registerMediaAiIpc(ctx) {
  const {
    BrowserWindow,
    dialog,
    ipcMain,
    fs,
    fsSync,
    path,
    http,
    https,
    spawn,
    ROOT_DIR,
    PAGE_FILES,
    getWritableRootDir
  } = ctx;

function _findFfmpegExecutable() {
  const isWin = process.platform === 'win32';
  const exeName = isWin ? 'ffmpeg.exe' : 'ffmpeg';
  const writableRoot = getWritableRootDir();

  // 1. Check user/tools/ffmpeg/
  const userToolPath = path.join(writableRoot, 'user', 'tools', 'ffmpeg', exeName);
  if (fsSync.existsSync(userToolPath)) {
    return { path: userToolPath, isUserTools: true };
  }

  // 2. Check ROOT_DIR/tools/ffmpeg/ or ROOT_DIR/bin/
  const appToolPath = path.join(ROOT_DIR, 'tools', 'ffmpeg', exeName);
  if (fsSync.existsSync(appToolPath)) {
    return { path: appToolPath, isUserTools: false };
  }
  const appBinPath = path.join(ROOT_DIR, 'bin', exeName);
  if (fsSync.existsSync(appBinPath)) {
    return { path: appBinPath, isUserTools: false };
  }

  // 3. Check system PATH
  const envPath = process.env.PATH || '';
  const pathDirs = envPath.split(path.delimiter);
  for (const dir of pathDirs) {
    if (!dir) continue;
    const candidate = path.join(dir, exeName);
    try {
      if (fsSync.existsSync(candidate)) {
        return { path: candidate, isUserTools: false };
      }
    } catch (_) {}
  }

  return null;
}

function _findFfprobeExecutable() {
  const isWin = process.platform === 'win32';
  const exeName = isWin ? 'ffprobe.exe' : 'ffprobe';
  const writableRoot = getWritableRootDir();

  const userToolPath = path.join(writableRoot, 'user', 'tools', 'ffmpeg', exeName);
  if (fsSync.existsSync(userToolPath)) return userToolPath;

  const appToolPath = path.join(ROOT_DIR, 'tools', 'ffmpeg', exeName);
  if (fsSync.existsSync(appToolPath)) return appToolPath;

  const appBinPath = path.join(ROOT_DIR, 'bin', exeName);
  if (fsSync.existsSync(appBinPath)) return appBinPath;

  const envPath = process.env.PATH || '';
  const pathDirs = envPath.split(path.delimiter);
  for (const dir of pathDirs) {
    if (!dir) continue;
    const candidate = path.join(dir, exeName);
    try {
      if (fsSync.existsSync(candidate)) return candidate;
    } catch (_) {}
  }
  return null;
}

function _downloadBufferWithRedirect(url, onProgress, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'));
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'ClassManagementTools/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let nextUrl = res.headers.location;
        if (!nextUrl.startsWith('http://') && !nextUrl.startsWith('https://')) {
          const parsed = new URL(url);
          nextUrl = new URL(nextUrl, parsed.origin).href;
        }
        return resolve(_downloadBufferWithRedirect(nextUrl, onProgress, maxRedirects - 1));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Download failed with HTTP ${res.statusCode}`));
      }

      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      let loadedBytes = 0;
      const chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
        loadedBytes += chunk.length;
        if (typeof onProgress === 'function') {
          const percent = totalBytes > 0 ? Math.min(100, Math.round((loadedBytes / totalBytes) * 1000) / 10) : 0;
          onProgress({ loadedBytes, totalBytes, percent });
        }
      });

      res.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      res.on('error', (err) => {
        reject(err);
      });
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}

function _downloadFileWithRedirect(url, destPath, onChunk, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'));
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'ClassManagementTools/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let nextUrl = res.headers.location;
        if (!nextUrl.startsWith('http://') && !nextUrl.startsWith('https://')) {
          const parsed = new URL(url);
          nextUrl = new URL(nextUrl, parsed.origin).href;
        }
        return resolve(_downloadFileWithRedirect(nextUrl, destPath, onChunk, maxRedirects - 1));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Download failed with HTTP ${res.statusCode}`));
      }

      fsSync.mkdirSync(path.dirname(destPath), { recursive: true });
      const fileStream = fsSync.createWriteStream(destPath);
      res.on('data', (chunk) => {
        if (typeof onChunk === 'function') {
          onChunk(chunk.length);
        }
      });
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close(() => resolve());
      });
      fileStream.on('error', (err) => {
        try { fsSync.unlinkSync(destPath); } catch (_) {}
        reject(err);
      });
      res.on('error', (err) => {
        try { fsSync.unlinkSync(destPath); } catch (_) {}
        reject(err);
      });
    });
    req.on('error', reject);
  });
}

ipcMain.handle('media:check-engine', async () => {
  try {
    const found = _findFfmpegExecutable();
    return {
      ok: true,
      hasNative: !!found,
      enginePath: found ? found.path : '',
      isUserTools: found ? found.isUserTools : false
    };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('media:download-engine', async (event) => {
  try {
    const isWin = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    const isLinux = process.platform === 'linux';
    const isArm64 = process.arch === 'arm64';

    let ffmpegUrl = '';
    if (isWin) {
      ffmpegUrl = 'https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1/ffmpeg-4.4.1-win-64.zip';
    } else if (isMac) {
      ffmpegUrl = 'https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1/ffmpeg-4.4.1-osx-64.zip';
    } else if (isLinux) {
      ffmpegUrl = isArm64
        ? 'https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1/ffmpeg-4.4.1-linux-arm-64.zip'
        : 'https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1/ffmpeg-4.4.1-linux-64.zip';
    } else {
      return { ok: false, error: 'Unsupported operating system for automated engine download.' };
    }

    const writableRoot = getWritableRootDir();
    const destDir = path.join(writableRoot, 'user', 'tools', 'ffmpeg');
    await fs.mkdir(destDir, { recursive: true });

    // Download with progress updates sent to renderer
    const zipBuf = await _downloadBufferWithRedirect(ffmpegUrl, (prog) => {
      if (event.sender && !event.sender.isDestroyed()) {
        try {
          event.sender.send('media:engine-download-progress', prog);
        } catch (_) {}
      }
    });

    // Extract entries
    const entries = await parseZipEntries(zipBuf);
    for (const ent of entries) {
      const baseName = path.basename(ent.name);
      if (baseName.toLowerCase().startsWith('ffmpeg')) {
        const targetFilePath = path.join(destDir, baseName);
        await fs.writeFile(targetFilePath, ent.data);
        if (!isWin) {
          await fs.chmod(targetFilePath, 0o755).catch(() => {});
        }
      }
    }

    const found = _findFfmpegExecutable();
    return {
      ok: !!found,
      hasNative: !!found,
      enginePath: found ? found.path : '',
      isUserTools: found ? found.isUserTools : true
    };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('media:select-input-files', async (_event, request = {}) => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: request.title || 'Select Media Files',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Media Files', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'wmv', 'flv', 'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webp'] },
        { name: 'Video Files', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'wmv', 'flv'] },
        { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    if (canceled || !filePaths || !filePaths.length) return { ok: false, canceled: true, files: [] };

    const results = [];
    for (const fp of filePaths) {
      const stats = await fs.stat(fp).catch(() => null);
      results.push({
        path: fp,
        name: path.basename(fp),
        size: stats ? stats.size : 0,
        ext: path.extname(fp).replace('.', '').toLowerCase()
      });
    }
    return { ok: true, files: results };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('media:select-output-folder', async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Select Output Directory',
      properties: ['openDirectory', 'createDirectory']
    });
    if (canceled || !filePaths || !filePaths.length) return { ok: false, canceled: true };
    return { ok: true, folderPath: filePaths[0] };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('media:probe', async (_event, request = {}) => {
  const filePath = request.filePath;
  if (!filePath) return { ok: false, error: 'No file path provided' };

  const ffprobePath = _findFfprobeExecutable();
  const ffmpegInfo = _findFfmpegExecutable();

  if (!ffprobePath && !ffmpegInfo) {
    return { ok: false, error: 'no-native-engine' };
  }

  const binary = ffprobePath || ffmpegInfo.path;
  const isFfprobe = !!ffprobePath;
  const args = isFfprobe
    ? ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath]
    : ['-i', filePath];

  return new Promise((resolve) => {
    try {
      const proc = spawn(binary, args);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });

      proc.on('close', () => {
        if (isFfprobe && stdout) {
          try {
            const data = JSON.parse(stdout);
            const format = data.format || {};
            const streams = data.streams || [];
            const vStream = streams.find(s => s.codec_type === 'video');
            const aStream = streams.find(s => s.codec_type === 'audio');

            const duration = parseFloat(format.duration) || (vStream ? parseFloat(vStream.duration) : 0) || 0;
            const width = vStream ? parseInt(vStream.width, 10) || 0 : 0;
            const height = vStream ? parseInt(vStream.height, 10) || 0 : 0;
            const videoCodec = vStream ? (vStream.codec_name || '') : '';
            const audioCodec = aStream ? (aStream.codec_name || '') : '';
            const bitrate = parseInt(format.bit_rate, 10) || 0;
            const channels = aStream ? (parseInt(aStream.channels, 10) || 2) : 0;
            const sampleRate = aStream ? (parseInt(aStream.sample_rate, 10) || 44100) : 0;

            return resolve({
              ok: true,
              meta: { duration, width, height, videoCodec, audioCodec, bitrate, channels, sampleRate }
            });
          } catch (_) {}
        }

        // Fallback: parse duration and stream from stderr output
        const durMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+|\d+)/);
        let duration = 0;
        if (durMatch) {
          duration = (parseInt(durMatch[1], 10) * 3600) + (parseInt(durMatch[2], 10) * 60) + parseFloat(durMatch[3]);
        }
        const dimMatch = stderr.match(/(\d{2,5})x(\d{2,5})/);
        const width = dimMatch ? parseInt(dimMatch[1], 10) : 0;
        const height = dimMatch ? parseInt(dimMatch[2], 10) : 0;

        const hasVideo = /Video:/.test(stderr);
        const hasAudio = /Audio:/.test(stderr);

        resolve({
          ok: true,
          meta: { duration, width, height, hasVideo, hasAudio }
        });
      });

      proc.on('error', (err) => {
        resolve({ ok: false, error: err.message });
      });
    } catch (e) {
      resolve({ ok: false, error: e.message });
    }
  });
});

ipcMain.handle('media:convert', async (event, request = {}) => {
  const ffmpegInfo = _findFfmpegExecutable();
  if (!ffmpegInfo) {
    return { ok: false, error: 'no-native-engine' };
  }

  const {
    jobId = 'job_' + Date.now(),
    inputPath,
    outputPath,
    targetFormat = 'mp4',
    resolution,
    videoQuality = 'medium',
    audioBitrate = '192k',
    audioChannels,
    normalize = false,
    speed = 1.0,
    trimStart = 0,
    trimEnd = 0,
    losslessCut = false
  } = request;

  if (!inputPath || !fsSync.existsSync(inputPath)) {
    return { ok: false, error: 'Input file does not exist' };
  }

  // Ensure output directory exists
  const outDir = path.dirname(outputPath);
  if (!fsSync.existsSync(outDir)) {
    await fs.mkdir(outDir, { recursive: true }).catch(() => {});
  }

  const args = [];
  args.push('-hide_banner');

  // Input seek (fast seek before input if specified)
  if (trimStart > 0) {
    args.push('-ss', String(trimStart));
  }
  args.push('-i', inputPath);

  if (trimEnd > 0 && trimEnd > trimStart) {
    args.push('-to', String(trimEnd - (trimStart > 0 ? trimStart : 0)));
  }

  const audioFormats = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'];
  const isAudioTarget = audioFormats.includes(targetFormat.toLowerCase());
  const isWebpTarget = targetFormat.toLowerCase() === 'webp';

  if (losslessCut && !normalize && speed === 1.0) {
    // Lossless stream copy
    args.push('-c', 'copy');
  } else if (isAudioTarget) {
    args.push('-vn'); // No video
    const fmt = targetFormat.toLowerCase();
    if (fmt === 'mp3') {
      args.push('-c:a', 'libmp3lame', '-b:a', String(audioBitrate || '192k'));
    } else if (fmt === 'wav') {
      args.push('-c:a', 'pcm_s16le');
    } else if (fmt === 'ogg') {
      args.push('-c:a', 'libvorbis', '-q:a', '4');
    } else if (fmt === 'm4a' || fmt === 'aac') {
      args.push('-c:a', 'aac', '-b:a', String(audioBitrate || '192k'));
    } else if (fmt === 'flac') {
      args.push('-c:a', 'flac');
    }
  } else if (isWebpTarget) {
    args.push('-vcodec', 'libwebp', '-filter:v', 'fps=15', '-lossless', '0', '-compression_level', '4', '-q:v', '75', '-loop', '0', '-an');
  } else {
    // Video conversion
    const fmt = targetFormat.toLowerCase();
    if (fmt === 'mp4' || fmt === 'mov' || fmt === 'mkv') {
      args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p');
      if (videoQuality === 'high') args.push('-crf', '18', '-preset', 'slow');
      else if (videoQuality === 'low') args.push('-crf', '28', '-preset', 'fast');
      else args.push('-crf', '23', '-preset', 'medium');
      args.push('-c:a', 'aac', '-b:a', String(audioBitrate || '192k'));
    } else if (fmt === 'webm') {
      args.push('-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32');
      args.push('-c:a', 'libopus', '-b:a', '128k');
    } else if (fmt === 'avi') {
      args.push('-c:v', 'mpeg4', '-qscale:v', '3');
      args.push('-c:a', 'libmp3lame', '-b:a', '192k');
    }

    // Video scale filter
    if (resolution && resolution !== 'original') {
      if (resolution === '1080p') args.push('-vf', 'scale=1920:-2:flags=lanczos');
      else if (resolution === '720p') args.push('-vf', 'scale=1280:-2:flags=lanczos');
      else if (resolution === '480p') args.push('-vf', 'scale=854:-2:flags=lanczos');
      else if (resolution === '360p') args.push('-vf', 'scale=640:-2:flags=lanczos');
    }
  }

  // Audio filter chain: normalization and tempo
  const audioFilters = [];
  if (normalize) {
    audioFilters.push('loudnorm=I=-16:TP=-1.5:LRA=11');
  }
  if (speed && speed !== 1.0) {
    const clampedSpeed = Math.max(0.5, Math.min(2.0, speed));
    audioFilters.push(`atempo=${clampedSpeed}`);
  }
  if (audioFilters.length > 0 && !losslessCut) {
    args.push('-af', audioFilters.join(','));
  }

  if (audioChannels === 1) {
    args.push('-ac', '1');
  } else if (audioChannels === 2) {
    args.push('-ac', '2');
  }

  args.push('-y', outputPath);

  return new Promise((resolve) => {
    try {
      const proc = spawn(ffmpegInfo.path, args);
      _activeMediaJobs.set(jobId, { process: proc, outputPath });

      let totalDurationSec = 0;
      let stderrText = '';

      proc.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderrText += chunk;

        if (!totalDurationSec) {
          const durMatch = chunk.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+|\d+)/);
          if (durMatch) {
            totalDurationSec = (parseInt(durMatch[1], 10) * 3600) + (parseInt(durMatch[2], 10) * 60) + parseFloat(durMatch[3]);
            if (trimEnd > 0 && trimEnd > trimStart) {
              totalDurationSec = trimEnd - trimStart;
            }
          }
        }

        const timeMatch = chunk.match(/time=(\d+):(\d+):(\d+\.\d+|\d+)/);
        if (timeMatch && totalDurationSec > 0) {
          const currentSec = (parseInt(timeMatch[1], 10) * 3600) + (parseInt(timeMatch[2], 10) * 60) + parseFloat(timeMatch[3]);
          const percent = Math.min(99.5, Math.max(0, (currentSec / totalDurationSec) * 100));
          const speedMatch = chunk.match(/speed=\s*([\d.]+x)/);
          const speedStr = speedMatch ? speedMatch[1] : '';

          try {
            if (event.sender && !event.sender.isDestroyed()) {
              event.sender.send('media:progress', {
                jobId,
                percent: Math.round(percent * 10) / 10,
                currentSec: Math.round(currentSec),
                totalSec: Math.round(totalDurationSec),
                speed: speedStr
              });
            }
          } catch (_) {}
        }
      });

      proc.on('close', (code) => {
        _activeMediaJobs.delete(jobId);
        if (code === 0) {
          if (event.sender && !event.sender.isDestroyed()) {
            try {
              event.sender.send('media:progress', { jobId, percent: 100, currentSec: totalDurationSec, totalSec: totalDurationSec, speed: '' });
            } catch (_) {}
          }
          resolve({ ok: true, outputPath, outputName: path.basename(outputPath) });
        } else {
          resolve({ ok: false, error: `Conversion exited with code ${code}`, stderr: stderrText.slice(-500) });
        }
      });

      proc.on('error', (err) => {
        _activeMediaJobs.delete(jobId);
        resolve({ ok: false, error: err.message });
      });
    } catch (e) {
      _activeMediaJobs.delete(jobId);
      resolve({ ok: false, error: e.message });
    }
  });
});

ipcMain.handle('media:cancel', async (_event, request = {}) => {
  const jobId = request.jobId;
  if (!jobId || !_activeMediaJobs.has(jobId)) {
    return { ok: false, error: 'Job not found or already finished' };
  }

  const job = _activeMediaJobs.get(jobId);
  try {
    if (job && job.process && !job.process.killed) {
      job.process.kill('SIGKILL');
    }
    _activeMediaJobs.delete(jobId);
    // Cleanup incomplete output file if exists
    if (job.outputPath && fsSync.existsSync(job.outputPath)) {
      await fs.unlink(job.outputPath).catch(() => {});
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('media:editor-render', async (event, request = {}) => {
  const ffmpegInfo = _findFfmpegExecutable();
  if (!ffmpegInfo) {
    return { ok: false, error: 'no-native-engine' };
  }

  const {
    jobId = 'editor_' + Date.now(),
    clips = [],
    outputPath,
    targetFormat = 'mp4',
    resolution = '720p',
    videoQuality = 'medium',
    audioBitrate = '192k'
  } = request;

  if (!clips || clips.length === 0) {
    return { ok: false, error: 'No clips provided for rendering' };
  }
  if (!outputPath) {
    return { ok: false, error: 'No output path specified' };
  }

  const outDir = path.dirname(outputPath);
  if (!fsSync.existsSync(outDir)) {
    await fs.mkdir(outDir, { recursive: true }).catch(() => {});
  }

  const isAudioTarget = ['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(targetFormat.toLowerCase());
  const args = ['-hide_banner'];

  // 1. Add inputs with initial seek/trim if applicable
  clips.forEach(clip => {
    if (clip.trimStart > 0) args.push('-ss', String(clip.trimStart));
    args.push('-i', clip.sourcePath);
    if (clip.trimEnd > 0 && clip.trimEnd > clip.trimStart) {
      args.push('-to', String(clip.trimEnd - (clip.trimStart > 0 ? clip.trimStart : 0)));
    }
  });

  // 2. Build filter_complex string
  const filterParts = [];
  const concatVideoLabels = [];
  const concatAudioLabels = [];

  const resMap = {
    '1080p': '1920:1080',
    '720p': '1280:720',
    '480p': '854:480',
    '360p': '640:360'
  };
  const targetDim = resMap[resolution] || '1280:720';
  const [targetW, targetH] = targetDim.split(':');

  clips.forEach((clip, idx) => {
    const vLabel = `v${idx}`;
    const aLabel = `a${idx}`;
    const effDur = Math.max(0.1, (clip.trimEnd > clip.trimStart ? clip.trimEnd - clip.trimStart : (clip.originalDuration || clip.duration || 10)));

    if (!isAudioTarget) {
      const vFilters = [
        `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease`,
        `pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2`,
        `setsar=1`
      ];
      if (clip.fadeIn > 0) {
        vFilters.push(`fade=t=in:st=0:d=${clip.fadeIn}`);
      }
      if (clip.fadeOut > 0) {
        const fadeStart = Math.max(0, effDur - clip.fadeOut);
        vFilters.push(`fade=t=out:st=${fadeStart.toFixed(2)}:d=${clip.fadeOut}`);
      }
      filterParts.push(`[${idx}:v]${vFilters.join(',')}[${vLabel}]`);
      concatVideoLabels.push(`[${vLabel}]`);
    }

    const aFilters = [];
    if (clip.fadeIn > 0) {
      aFilters.push(`afade=t=in:ss=0:d=${clip.fadeIn}`);
    }
    if (clip.fadeOut > 0) {
      const fadeStart = Math.max(0, effDur - clip.fadeOut);
      aFilters.push(`afade=t=out:st=${fadeStart.toFixed(2)}:d=${clip.fadeOut}`);
    }
    if (clip.volume && clip.volume !== 1.0) {
      aFilters.push(`volume=${clip.volume}`);
    }
    if (clip.speed && clip.speed !== 1.0) {
      aFilters.push(`atempo=${clip.speed}`);
    }

    if (aFilters.length > 0) {
      filterParts.push(`[${idx}:a]${aFilters.join(',')}[${aLabel}]`);
      concatAudioLabels.push(`[${aLabel}]`);
    } else {
      concatAudioLabels.push(`[${idx}:a]`);
    }
  });

  // Concat filter
  if (!isAudioTarget) {
    filterParts.push(
      `${concatVideoLabels.join('')}${concatAudioLabels.join('')}concat=n=${clips.length}:v=1:a=1[outv][outa]`
    );
    args.push('-filter_complex', filterParts.join('; '));
    args.push('-map', '[outv]', '-map', '[outa]');
    args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p');
    if (videoQuality === 'high') args.push('-crf', '18', '-preset', 'slow');
    else if (videoQuality === 'low') args.push('-crf', '28', '-preset', 'fast');
    else args.push('-crf', '23', '-preset', 'medium');
    args.push('-c:a', 'aac', '-b:a', String(audioBitrate || '192k'));
  } else {
    filterParts.push(`${concatAudioLabels.join('')}concat=n=${clips.length}:v=0:a=1[outa]`);
    args.push('-filter_complex', filterParts.join('; '));
    args.push('-map', '[outa]');
    const fmt = targetFormat.toLowerCase();
    if (fmt === 'mp3') {
      args.push('-c:a', 'libmp3lame', '-b:a', String(audioBitrate || '192k'));
    } else if (fmt === 'wav') {
      args.push('-c:a', 'pcm_s16le');
    } else if (fmt === 'ogg') {
      args.push('-c:a', 'libvorbis');
    } else if (fmt === 'm4a') {
      args.push('-c:a', 'aac', '-b:a', String(audioBitrate || '192k'));
    } else if (fmt === 'flac') {
      args.push('-c:a', 'flac');
    }
  }

  args.push('-y', outputPath);

  return new Promise((resolve) => {
    try {
      const proc = spawn(ffmpegInfo.path, args);
      _activeMediaJobs.set(jobId, { process: proc, outputPath });

      let stderrText = '';
      const totalDurationSec = clips.reduce((acc, c) => {
        const d = (c.trimEnd > c.trimStart) ? (c.trimEnd - c.trimStart) : (c.originalDuration || c.duration || 10);
        return acc + d;
      }, 0);

      proc.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderrText += text;
        const timeMatch = text.match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (timeMatch && totalDurationSec > 0) {
          const currentSec = parseInt(timeMatch[1], 10) * 3600 + parseInt(timeMatch[2], 10) * 60 + parseFloat(timeMatch[3]);
          const percent = Math.min(99.5, Math.round((currentSec / totalDurationSec) * 1000) / 10);
          if (event.sender && !event.sender.isDestroyed()) {
            try {
              event.sender.send('media:progress', { jobId, percent, currentSec, totalSec: totalDurationSec });
            } catch (_) {}
          }
        }
      });

      proc.on('close', (code) => {
        _activeMediaJobs.delete(jobId);
        if (code === 0) {
          if (event.sender && !event.sender.isDestroyed()) {
            try {
              event.sender.send('media:progress', { jobId, percent: 100, currentSec: totalDurationSec, totalSec: totalDurationSec });
            } catch (_) {}
          }
          resolve({ ok: true, outputPath, outputName: path.basename(outputPath) });
        } else {
          resolve({ ok: false, error: 'FFmpeg editor process exited with code ' + code, stderr: stderrText.slice(-500) });
        }
      });

      proc.on('error', (err) => {
        _activeMediaJobs.delete(jobId);
        resolve({ ok: false, error: err.message });
      });
    } catch (e) {
      _activeMediaJobs.delete(jobId);
      resolve({ ok: false, error: e.message });
    }
  });
});

// ── Whisper Speech Recognition Models Manager ────────────────────────────────
const WHISPER_MODEL_FILES = [
  'config.json',
  'generation_config.json',
  'merges.txt',
  'normalizer.json',
  'preprocessor_config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'vocab.json',
  'special_tokens_map.json',
  'added_tokens.json',
  'onnx/decoder_model_merged_quantized.onnx',
  'onnx/encoder_model_quantized.onnx'
];

const WHISPER_MODEL_SPECS = {
  'whisper-tiny': {
    id: 'whisper-tiny',
    name: 'Whisper Tiny (Quantized)',
    tier: 'tiny',
    isBundled: true,
    speedRating: 'Fast',
    relativeSpeed: '1.0×',
    ramEstimate: '~180 MB',
    diskSize: '~41 MB',
    sizeBytes: 43336495,
    downloadSizeBytes: 43336495,
    huggingFaceRepo: 'Xenova/whisper-tiny',
    downloadUrl: '',
    descriptionKey: 'whisperTinyDesc'
  },
  'whisper-base': {
    id: 'whisper-base',
    name: 'Whisper Base (Quantized)',
    tier: 'base',
    isBundled: false,
    speedRating: 'Medium',
    relativeSpeed: '~1.8×',
    ramEstimate: '~350 MB',
    diskSize: '~78 MB',
    sizeBytes: 81261020,
    downloadSizeBytes: 81261020,
    huggingFaceRepo: 'Xenova/whisper-base',
    downloadUrl: '',
    descriptionKey: 'whisperBaseDesc'
  },
  'whisper-small': {
    id: 'whisper-small',
    name: 'Whisper Small (Quantized)',
    tier: 'small',
    isBundled: false,
    speedRating: 'Standard',
    relativeSpeed: '~3.5×',
    ramEstimate: '~850 MB',
    diskSize: '~242 MB',
    sizeBytes: 253458435,
    downloadSizeBytes: 253458435,
    huggingFaceRepo: 'Xenova/whisper-small',
    downloadUrl: '',
    descriptionKey: 'whisperSmallDesc'
  }
};

function getWhisperConfigPath() {
  return path.join(getWritableRootDir(), 'user', 'whisper-config.json');
}

async function loadWhisperConfig() {
  try {
    const raw = await fs.readFile(getWhisperConfigPath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        activeModel: parsed.activeModel || 'whisper-tiny'
      };
    }
  } catch (_) {}
  return { activeModel: 'whisper-tiny' };
}

async function saveWhisperConfig(cfg) {
  try {
    const cfgPath = getWhisperConfigPath();
    await fs.mkdir(path.dirname(cfgPath), { recursive: true });
    await fs.writeFile(cfgPath, JSON.stringify(cfg, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[WhisperModel] Failed to save whisper-config.json:', err);
    return false;
  }
}

function getUserWhisperModelsDir() {
  return path.join(getWritableRootDir(), 'user', 'models', 'whisper');
}

function getBundledWhisperDir() {
  return path.join(ROOT_DIR, 'modules', 'stt');
}

async function _getDirSizeBytes(dirPath) {
  let total = 0;
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dirPath, ent.name);
      if (ent.isDirectory()) {
        total += await _getDirSizeBytes(full);
      } else if (ent.isFile()) {
        const st = await fs.stat(full).catch(() => null);
        if (st) total += st.size;
      }
    }
  } catch (_) {}
  return total;
}

async function isWhisperModelInstalled(modelId) {
  if (modelId === 'whisper-tiny') {
    const bundledDir = path.join(getBundledWhisperDir(), 'whisper-tiny');
    const bundledCfg = path.join(bundledDir, 'config.json');
    if (fsSync.existsSync(bundledCfg)) return { installed: true, isBundled: true, dir: bundledDir, basePath: getBundledWhisperDir() };
    const rootCfg = path.join(getBundledWhisperDir(), 'config.json');
    if (fsSync.existsSync(rootCfg)) return { installed: true, isBundled: true, dir: getBundledWhisperDir(), basePath: getBundledWhisperDir() };
  }
  const userModelDir = path.join(getUserWhisperModelsDir(), modelId);
  const userCfg = path.join(userModelDir, 'config.json');
  if (fsSync.existsSync(userCfg)) {
    return { installed: true, isBundled: false, dir: userModelDir, basePath: getUserWhisperModelsDir() };
  }
  return { installed: false, isBundled: false, dir: '', basePath: '' };
}

ipcMain.handle('whisper:list-models', async () => {
  try {
    const config = await loadWhisperConfig();
    let activeModel = config.activeModel || 'whisper-tiny';
    const modelsList = [];

    for (const [modelId, spec] of Object.entries(WHISPER_MODEL_SPECS)) {
      const status = await isWhisperModelInstalled(modelId);
      let sizeBytes = spec.sizeBytes;
      if (status.installed && status.dir) {
        const calculatedSize = await _getDirSizeBytes(status.dir);
        if (calculatedSize > 0) sizeBytes = calculatedSize;
      }

      modelsList.push({
        id: spec.id,
        name: spec.name,
        tier: spec.tier,
        isBundled: spec.isBundled,
        isInstalled: status.installed,
        isActive: activeModel === spec.id,
        speedRating: spec.speedRating,
        relativeSpeed: spec.relativeSpeed,
        ramEstimate: spec.ramEstimate,
        diskSize: spec.diskSize,
        downloadSizeBytes: spec.downloadSizeBytes,
        sizeBytes: sizeBytes,
        modelDir: status.dir,
        basePath: status.basePath,
        downloadUrl: spec.downloadUrl,
        descriptionKey: spec.descriptionKey
      });
    }

    const activeModelObj = modelsList.find(m => m.id === activeModel);
    if (!activeModelObj || !activeModelObj.isInstalled) {
      activeModel = 'whisper-tiny';
      await saveWhisperConfig({ activeModel });
      for (const m of modelsList) {
        m.isActive = (m.id === activeModel);
      }
    }

    return {
      ok: true,
      activeModel: activeModel,
      models: modelsList,
      userModelsDir: getUserWhisperModelsDir(),
      bundledDir: getBundledWhisperDir()
    };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('whisper:get-config', async () => {
  try {
    const config = await loadWhisperConfig();
    return { ok: true, config };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('whisper:set-active-model', async (_event, request = {}) => {
  try {
    const modelId = request.modelId;
    if (!modelId || !WHISPER_MODEL_SPECS[modelId]) {
      return { ok: false, error: 'Invalid model ID' };
    }
    const status = await isWhisperModelInstalled(modelId);
    if (!status.installed) {
      return { ok: false, error: 'Model is not installed on this system' };
    }
    await saveWhisperConfig({ activeModel: modelId });
    return { ok: true, activeModel: modelId, basePath: status.basePath, modelDir: status.dir };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('whisper:delete-model', async (_event, request = {}) => {
  try {
    const modelId = request.modelId;
    if (!modelId || !WHISPER_MODEL_SPECS[modelId]) {
      return { ok: false, error: 'Invalid model ID' };
    }
    if (WHISPER_MODEL_SPECS[modelId].isBundled || modelId === 'whisper-tiny') {
      return { ok: false, error: 'Cannot delete pre-bundled default model' };
    }

    const modelDir = path.join(getUserWhisperModelsDir(), modelId);
    if (fsSync.existsSync(modelDir)) {
      await fs.rm(modelDir, { recursive: true, force: true });
    }

    const config = await loadWhisperConfig();
    if (config.activeModel === modelId) {
      await saveWhisperConfig({ activeModel: 'whisper-tiny' });
    }

    return { ok: true, modelId };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('whisper:download-model', async (event, request = {}) => {
  const modelId = request.modelId;
  if (!modelId || !WHISPER_MODEL_SPECS[modelId]) {
    return { ok: false, error: 'Invalid model specified' };
  }
  const spec = WHISPER_MODEL_SPECS[modelId];
  if (spec.isBundled) {
    return { ok: true, modelId, message: 'Model is pre-bundled' };
  }

  const userModelsDir = getUserWhisperModelsDir();
  const destDir = path.join(userModelsDir, modelId);
  const stageDir = path.join(userModelsDir, `.tmp-${modelId}-${Date.now()}`);

  const notifyProgress = (data) => {
    if (event.sender && !event.sender.isDestroyed()) {
      try {
        event.sender.send('whisper:download-progress', {
          modelId,
          ...data
        });
      } catch (_) {}
    }
  };

  try {
    await fs.mkdir(userModelsDir, { recursive: true });

    // Optional: If an explicit .zip archive download URL is supplied, attempt zip download first
    if (spec.downloadUrl && spec.downloadUrl.endsWith('.zip')) {
      try {
        notifyProgress({ phase: 'downloading', loadedBytes: 0, totalBytes: spec.downloadSizeBytes, percent: 0 });
        const zipBuf = await _downloadBufferWithRedirect(spec.downloadUrl, (prog) => {
          notifyProgress({
            phase: 'downloading',
            loadedBytes: prog.loadedBytes,
            totalBytes: prog.totalBytes || spec.downloadSizeBytes,
            percent: prog.percent
          });
        });

        notifyProgress({ phase: 'extracting', loadedBytes: zipBuf.length, totalBytes: zipBuf.length, percent: 100 });
        const entries = await parseZipEntries(zipBuf);
        if (entries && entries.length > 0) {
          let prefixToStrip = '';
          const nonDirEntries = entries.filter(e => !e.name.endsWith('/'));
          if (nonDirEntries.length > 0 && nonDirEntries.every(e => e.name.startsWith(modelId + '/') || e.name.startsWith(modelId + '\\'))) {
            prefixToStrip = modelId + '/';
          }

          await fs.mkdir(destDir, { recursive: true });
          for (const ent of entries) {
            let relName = normalizeZipEntryPath(ent.name) || ent.name;
            if (prefixToStrip && (relName.startsWith(prefixToStrip) || relName.startsWith(modelId + '/'))) {
              relName = relName.slice(prefixToStrip.length);
            }
            relName = relName.replace(/^[\/\\]+/, '');
            if (!relName || ent.name.endsWith('/')) continue;

            const targetFilePath = path.resolve(destDir, relName);
            if (!targetFilePath.startsWith(path.resolve(destDir) + path.sep)) continue;

            await fs.mkdir(path.dirname(targetFilePath), { recursive: true });
            await fs.writeFile(targetFilePath, ent.data);
          }

          const configPath = path.join(destDir, 'config.json');
          if (fsSync.existsSync(configPath)) {
            notifyProgress({ phase: 'complete', percent: 100 });
            return { ok: true, modelId, destDir };
          }
        }
      } catch (zipErr) {
        console.warn(`[WhisperModel] Zip archive download for ${modelId} failed (${zipErr.message}), falling back to direct model download.`);
      }
    }

    // Direct streaming download from Hugging Face repository
    const repo = spec.huggingFaceRepo || ('Xenova/' + modelId);
    const totalExpectedBytes = spec.downloadSizeBytes || 81261020;
    let overallLoaded = 0;

    await fs.mkdir(stageDir, { recursive: true });
    notifyProgress({ phase: 'downloading', loadedBytes: 0, totalBytes: totalExpectedBytes, percent: 0 });

    for (const file of WHISPER_MODEL_FILES) {
      if (event.sender && event.sender.isDestroyed()) {
        throw new Error('Download aborted: window closed');
      }

      const targetFilePath = path.join(stageDir, file);
      const primaryUrl = `https://huggingface.co/${repo}/resolve/main/${file}`;
      const fallbackUrl = `https://hf-mirror.com/${repo}/resolve/main/${file}`;

      let downloaded = false;
      let lastErr = null;

      try {
        await _downloadFileWithRedirect(primaryUrl, targetFilePath, (chunkBytes) => {
          overallLoaded += chunkBytes;
          const pct = Math.min(99.9, Math.round((overallLoaded / totalExpectedBytes) * 1000) / 10);
          notifyProgress({
            phase: 'downloading',
            loadedBytes: overallLoaded,
            totalBytes: totalExpectedBytes,
            percent: pct,
            currentFile: file
          });
        });
        downloaded = true;
      } catch (pErr) {
        lastErr = pErr;
      }

      if (!downloaded) {
        try {
          await _downloadFileWithRedirect(fallbackUrl, targetFilePath, (chunkBytes) => {
            overallLoaded += chunkBytes;
            const pct = Math.min(99.9, Math.round((overallLoaded / totalExpectedBytes) * 1000) / 10);
            notifyProgress({
              phase: 'downloading',
              loadedBytes: overallLoaded,
              totalBytes: totalExpectedBytes,
              percent: pct,
              currentFile: file
            });
          });
          downloaded = true;
        } catch (fErr) {
          lastErr = fErr;
        }
      }

      if (!downloaded) {
        if (file === 'added_tokens.json' || file === 'special_tokens_map.json' || file === 'normalizer.json') {
          console.warn(`[WhisperModel] Optional file ${file} skipped:`, lastErr?.message);
        } else {
          throw new Error(`Failed to download ${file}: ${lastErr?.message || 'Network error'}`);
        }
      }
    }

    notifyProgress({ phase: 'extracting', loadedBytes: overallLoaded, totalBytes: totalExpectedBytes, percent: 100 });

    const checkCfg = path.join(stageDir, 'config.json');
    const checkEnc = path.join(stageDir, 'onnx', 'encoder_model_quantized.onnx');
    const checkDec = path.join(stageDir, 'onnx', 'decoder_model_merged_quantized.onnx');

    if (!fsSync.existsSync(checkCfg) || !fsSync.existsSync(checkEnc) || !fsSync.existsSync(checkDec)) {
      throw new Error('Downloaded model is incomplete: missing required config or ONNX files');
    }

    if (fsSync.existsSync(destDir)) {
      await fs.rm(destDir, { recursive: true, force: true });
    }
    await fs.rename(stageDir, destDir);

    notifyProgress({ phase: 'complete', percent: 100 });
    return { ok: true, modelId, destDir };
  } catch (err) {
    try {
      if (fsSync.existsSync(stageDir)) {
        await fs.rm(stageDir, { recursive: true, force: true });
      }
    } catch (_) {}
    return { ok: false, error: err?.message || String(err) };
  }
});

// ── Small Language Models (SLM) Manager ──────────────────────────────────────
const SLM_TEXT_FILES = [
  { name: 'config.json', required: true },
  { name: 'generation_config.json', required: false },
  { name: 'tokenizer.json', required: true },
  { name: 'tokenizer_config.json', required: true },
  { name: 'special_tokens_map.json', required: false },
  { name: 'added_tokens.json', required: false },
  { name: 'vocab.json', required: false },
  { name: 'merges.txt', required: false }
];

const SLM_MODEL_SPECS = {
  'slm-ultra': {
    id: 'slm-ultra',
    name: 'SmolLM2 — 360M Instruct (Ultra Fast)',
    tier: 'ultra',
    isBundled: false,
    speedRating: '4/4',
    relativeSpeed: '0.6×',
    ramEstimate: '~450 MB',
    diskSize: '~370 MB',
    sizeBytes: 367000000,
    downloadSizeBytes: 367000000,
    huggingFaceRepo: 'onnx-community/SmolLM2-360M-Instruct-ONNX',
    onnxRemoteFile: 'onnx/model_quantized.onnx',
    onnxLocalFile: 'onnx/decoder_model_merged_quantized.onnx',
    descriptionKey: 'slmUltraFastDesc'
  },
  'slm-fast': {
    id: 'slm-fast',
    name: 'Qwen 2.5 — 0.5B Instruct (Fast)',
    tier: 'fast',
    isBundled: false,
    speedRating: '3/3',
    relativeSpeed: '1.0×',
    ramEstimate: '~700 MB',
    diskSize: '~495 MB',
    sizeBytes: 523585050,
    downloadSizeBytes: 523585050,
    huggingFaceRepo: 'onnx-community/Qwen2.5-0.5B-Instruct',
    onnxRemoteFile: 'onnx/model_quantized.onnx',
    onnxLocalFile: 'onnx/decoder_model_merged_quantized.onnx',
    descriptionKey: 'slmFastDesc'
  },
  'slm-balanced': {
    id: 'slm-balanced',
    name: 'Qwen 2.5 — 1.5B Instruct (Balanced)',
    tier: 'balanced',
    isBundled: false,
    speedRating: '2/3',
    relativeSpeed: '~2.2×',
    ramEstimate: '~1.8 GB',
    diskSize: '~1.48 GB',
    sizeBytes: 1590442786,
    downloadSizeBytes: 1590442786,
    huggingFaceRepo: 'onnx-community/Qwen2.5-1.5B-Instruct',
    onnxRemoteFile: 'onnx/model_quantized.onnx',
    onnxLocalFile: 'onnx/decoder_model_merged_quantized.onnx',
    descriptionKey: 'slmBalancedDesc'
  },
  'slm-deep': {
    id: 'slm-deep',
    name: 'Qwen 1.8B Deep Instruct (Quality)',
    tier: 'deep',
    isBundled: false,
    speedRating: '1/3',
    relativeSpeed: '~3.2×',
    ramEstimate: '~2.2 GB',
    diskSize: '~1.75 GB',
    sizeBytes: 1879360000,
    downloadSizeBytes: 1879360000,
    huggingFaceRepo: 'Xenova/Qwen1.5-1.8B-Chat',
    onnxRemoteFile: 'onnx/decoder_model_merged_quantized.onnx',
    onnxLocalFile: 'onnx/decoder_model_merged_quantized.onnx',
    descriptionKey: 'slmDeepDesc'
  }
};

function getSlmConfigPath() {
  return path.join(getWritableRootDir(), 'user', 'slm-config.json');
}

async function loadSlmConfig() {
  try {
    const raw = await fs.readFile(getSlmConfigPath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        activeModel: parsed.activeModel || '',
        device: parsed.device || 'auto'
      };
    }
  } catch (_) {}
  return { activeModel: '', device: 'auto' };
}

async function saveSlmConfig(cfg) {
  try {
    const cfgPath = getSlmConfigPath();
    await fs.mkdir(path.dirname(cfgPath), { recursive: true });
    await fs.writeFile(cfgPath, JSON.stringify(cfg, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[SlmModel] Failed to save slm-config.json:', err);
    return false;
  }
}

function getUserSlmModelsDir() {
  return path.join(getWritableRootDir(), 'user', 'models', 'slm');
}

/**
 * Ensures ONNX model files are compatible with the bundled onnxruntime-web WASM
 * by clamping the protobuf ir_version to <= 8 if it was exported with IR version 9 or 10.
 */
function patchOnnxIrVersionSync(filePath) {
  try {
    if (!fsSync.existsSync(filePath)) return false;
    const fd = fsSync.openSync(filePath, 'r+');
    const buf = Buffer.alloc(4);
    fsSync.readSync(fd, buf, 0, 4, 0);
    // Protobuf field 1 is ir_version (varint, tag 0x08).
    // If greater than 8, clamp to 8 for onnxruntime-web session creation compatibility.
    if (buf[0] === 0x08 && buf[1] > 0x08 && buf[1] <= 0x10) {
      console.log(`[SlmModel] Clamping ONNX IR version from ${buf[1]} to 8 in ${path.basename(filePath)}`);
      buf[1] = 0x08;
      fsSync.writeSync(fd, buf, 0, 2, 0);
      fsSync.closeSync(fd);
      return true;
    }
    fsSync.closeSync(fd);
  } catch (err) {
    console.warn('[SlmModel] Could not inspect/patch ONNX IR version:', err?.message || err);
  }
  return false;
}

/**
 * Ensures tokenizer.json is compatible with transformers.js v2 by converting
 * any array-based BPE merges (e.g. [["Ġ", "t"], ...]) into space-separated strings ("Ġ t").
 */
function patchTokenizerCompatibilitySync(filePath) {
  try {
    if (!fsSync.existsSync(filePath)) return false;
    const raw = fsSync.readFileSync(filePath, 'utf8');
    const tok = JSON.parse(raw);
    let modified = false;

    if (tok && tok.model && Array.isArray(tok.model.merges)) {
      if (tok.model.merges.length > 0 && Array.isArray(tok.model.merges[0])) {
        console.log(`[SlmModel] Converting array merges to space-delimited strings in ${path.basename(filePath)}`);
        tok.model.merges = tok.model.merges.map(m => Array.isArray(m) ? m.join(' ') : String(m));
        modified = true;
      }
    }

    if (modified) {
      fsSync.writeFileSync(filePath, JSON.stringify(tok), 'utf8');
      return true;
    }
  } catch (err) {
    console.warn('[SlmModel] Could not inspect/patch tokenizer compatibility:', err?.message || err);
  }
  return false;
}

async function isSlmModelInstalled(modelId) {
  const spec = SLM_MODEL_SPECS[modelId];
  if (!spec) return { installed: false, dir: '', basePath: '' };
  const userModelsDir = getUserSlmModelsDir();
  const userModelDir = path.join(userModelsDir, modelId);
  const cfgPath = path.join(userModelDir, 'config.json');
  const tokPath = path.join(userModelDir, 'tokenizer.json');
  const onnxPath = path.join(userModelDir, spec.onnxLocalFile);
  if (fsSync.existsSync(cfgPath) && fsSync.existsSync(tokPath) && fsSync.existsSync(onnxPath)) {
    patchOnnxIrVersionSync(onnxPath);
    patchTokenizerCompatibilitySync(tokPath);
    return { installed: true, dir: userModelDir, basePath: userModelsDir };
  }
  return { installed: false, dir: '', basePath: '' };
}

ipcMain.handle('slm:list-models', async () => {
  try {
    const config = await loadSlmConfig();
    let activeModel = config.activeModel || '';
    const modelsList = [];

    for (const [modelId, spec] of Object.entries(SLM_MODEL_SPECS)) {
      const status = await isSlmModelInstalled(modelId);
      let sizeBytes = spec.sizeBytes;
      if (status.installed && status.dir) {
        const calculatedSize = await _getDirSizeBytes(status.dir);
        if (calculatedSize > 0) sizeBytes = calculatedSize;
      }

      modelsList.push({
        id: spec.id,
        name: spec.name,
        tier: spec.tier,
        isBundled: false,
        isInstalled: status.installed,
        isActive: activeModel === spec.id && status.installed,
        speedRating: spec.speedRating,
        relativeSpeed: spec.relativeSpeed,
        ramEstimate: spec.ramEstimate,
        diskSize: spec.diskSize,
        downloadSizeBytes: spec.downloadSizeBytes,
        sizeBytes: sizeBytes,
        modelDir: status.dir,
        basePath: status.basePath,
        descriptionKey: spec.descriptionKey
      });
    }

    const activeModelObj = modelsList.find(m => m.id === activeModel && m.isInstalled);
    if (!activeModelObj) {
      const firstInstalled = modelsList.find(m => m.isInstalled);
      activeModel = firstInstalled ? firstInstalled.id : '';
      await saveSlmConfig({ ...config, activeModel });
      for (const m of modelsList) {
        m.isActive = Boolean(activeModel && m.id === activeModel);
      }
    }

    return {
      ok: true,
      activeModel: activeModel,
      device: config.device || 'auto',
      models: modelsList,
      userModelsDir: getUserSlmModelsDir()
    };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('slm:get-config', async () => {
  try {
    const config = await loadSlmConfig();
    return { ok: true, config, userModelsDir: getUserSlmModelsDir() };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('slm:set-active-model', async (_event, request = {}) => {
  try {
    const modelId = request.modelId;
    if (!modelId || !SLM_MODEL_SPECS[modelId]) {
      return { ok: false, error: 'Invalid SLM model ID' };
    }
    const status = await isSlmModelInstalled(modelId);
    if (!status.installed) {
      return { ok: false, error: 'Model is not installed on this system' };
    }
    const existing = await loadSlmConfig();
    const nextCfg = {
      ...existing,
      activeModel: modelId,
      device: request.device || existing.device || 'auto'
    };
    await saveSlmConfig(nextCfg);
    return { ok: true, activeModel: modelId, basePath: status.basePath, modelDir: status.dir };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('slm:delete-model', async (_event, request = {}) => {
  try {
    const modelId = request.modelId;
    if (!modelId || !SLM_MODEL_SPECS[modelId]) {
      return { ok: false, error: 'Invalid SLM model ID' };
    }

    const modelDir = path.join(getUserSlmModelsDir(), modelId);
    if (fsSync.existsSync(modelDir)) {
      await fs.rm(modelDir, { recursive: true, force: true });
    }

    const config = await loadSlmConfig();
    if (config.activeModel === modelId) {
      let nextActive = '';
      for (const candidateId of Object.keys(SLM_MODEL_SPECS)) {
        if (candidateId === modelId) continue;
        const st = await isSlmModelInstalled(candidateId);
        if (st.installed) {
          nextActive = candidateId;
          break;
        }
      }
      await saveSlmConfig({ ...config, activeModel: nextActive });
      return { ok: true, modelId, activeModel: nextActive };
    }

    return { ok: true, modelId, activeModel: config.activeModel };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

ipcMain.handle('slm:download-model', async (event, request = {}) => {
  const modelId = request.modelId;
  if (!modelId || !SLM_MODEL_SPECS[modelId]) {
    return { ok: false, error: 'Invalid SLM model specified' };
  }
  const spec = SLM_MODEL_SPECS[modelId];
  const userModelsDir = getUserSlmModelsDir();
  const destDir = path.join(userModelsDir, modelId);
  const stageDir = path.join(userModelsDir, `.tmp-${modelId}-${Date.now()}`);

  const notifyProgress = (data) => {
    if (event.sender && !event.sender.isDestroyed()) {
      try {
        event.sender.send('slm:download-progress', {
          modelId,
          ...data
        });
      } catch (_) {}
    }
  };

  try {
    await fs.mkdir(userModelsDir, { recursive: true });
    await fs.mkdir(stageDir, { recursive: true });

    const repo = spec.huggingFaceRepo;
    const totalExpectedBytes = spec.downloadSizeBytes || 523585050;
    let overallLoaded = 0;

    notifyProgress({ phase: 'downloading', loadedBytes: 0, totalBytes: totalExpectedBytes, percent: 0 });

    const filesToDownload = [
      ...SLM_TEXT_FILES.map(f => ({ remote: f.name, local: f.name, required: f.required })),
      { remote: spec.onnxRemoteFile, local: spec.onnxLocalFile, required: true }
    ];

    for (const fileSpec of filesToDownload) {
      if (event.sender && event.sender.isDestroyed()) {
        throw new Error('Download aborted: window closed');
      }

      const targetFilePath = path.join(stageDir, fileSpec.local);
      const primaryUrl = `https://huggingface.co/${repo}/resolve/main/${fileSpec.remote}`;
      const fallbackUrl = `https://hf-mirror.com/${repo}/resolve/main/${fileSpec.remote}`;

      let downloaded = false;
      let lastErr = null;
      let bytesBeforeFile = overallLoaded;

      try {
        await _downloadFileWithRedirect(primaryUrl, targetFilePath, (chunkBytes) => {
          overallLoaded += chunkBytes;
          const pct = Math.min(99.9, Math.round((overallLoaded / totalExpectedBytes) * 1000) / 10);
          notifyProgress({
            phase: 'downloading',
            loadedBytes: overallLoaded,
            totalBytes: totalExpectedBytes,
            percent: pct,
            currentFile: fileSpec.remote
          });
        });
        downloaded = true;
      } catch (pErr) {
        lastErr = pErr;
        overallLoaded = bytesBeforeFile;
      }

      if (!downloaded) {
        try {
          await _downloadFileWithRedirect(fallbackUrl, targetFilePath, (chunkBytes) => {
            overallLoaded += chunkBytes;
            const pct = Math.min(99.9, Math.round((overallLoaded / totalExpectedBytes) * 1000) / 10);
            notifyProgress({
              phase: 'downloading',
              loadedBytes: overallLoaded,
              totalBytes: totalExpectedBytes,
              percent: pct,
              currentFile: fileSpec.remote
            });
          });
          downloaded = true;
        } catch (fErr) {
          lastErr = fErr;
          overallLoaded = bytesBeforeFile;
        }
      }

      if (!downloaded) {
        if (!fileSpec.required) {
          console.warn(`[SlmModel] Optional file ${fileSpec.remote} skipped:`, lastErr?.message);
        } else {
          throw new Error(`Failed to download ${fileSpec.remote}: ${lastErr?.message || 'Network error'}`);
        }
      }
    }

    notifyProgress({ phase: 'extracting', loadedBytes: overallLoaded, totalBytes: totalExpectedBytes, percent: 100 });

    const checkCfg = path.join(stageDir, 'config.json');
    const checkTok = path.join(stageDir, 'tokenizer.json');
    const checkOnnx = path.join(stageDir, spec.onnxLocalFile);

    if (!fsSync.existsSync(checkCfg) || !fsSync.existsSync(checkTok) || !fsSync.existsSync(checkOnnx)) {
      throw new Error('Downloaded SLM model is incomplete: missing required config, tokenizer, or ONNX files');
    }

    patchOnnxIrVersionSync(checkOnnx);
    patchTokenizerCompatibilitySync(checkTok);

    if (fsSync.existsSync(destDir)) {
      await fs.rm(destDir, { recursive: true, force: true });
    }
    await fs.rename(stageDir, destDir);

    const existingCfg = await loadSlmConfig();
    await saveSlmConfig({ ...existingCfg, activeModel: modelId });

    notifyProgress({ phase: 'complete', percent: 100 });
    return { ok: true, modelId, destDir, basePath: userModelsDir };
  } catch (err) {
    try {
      if (fsSync.existsSync(stageDir)) {
        await fs.rm(stageDir, { recursive: true, force: true });
      }
    } catch (_) {}
    return { ok: false, error: err?.message || String(err) };
  }
});

}

module.exports = { registerMediaAiIpc };
