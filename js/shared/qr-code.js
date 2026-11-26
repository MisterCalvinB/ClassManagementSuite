// Lightweight offline QR Code generator (Byte mode, ECC Level L, Versions 1-6)
// Exposes window.CmtQrCode.toDataUrl(text, sizePx) -> data:image/svg+xml URI
(function (root) {
  'use strict';

  var VERSIONS = [
    null,
    { size: 21, totalData: 19, eccPerBlock: 7, blocks: 1, align: [] },
    { size: 25, totalData: 34, eccPerBlock: 10, blocks: 1, align: [6, 18] },
    { size: 29, totalData: 55, eccPerBlock: 15, blocks: 1, align: [6, 22] },
    { size: 33, totalData: 80, eccPerBlock: 20, blocks: 1, align: [6, 26] },
    { size: 37, totalData: 108, eccPerBlock: 26, blocks: 1, align: [6, 30] },
    { size: 41, totalData: 136, eccPerBlock: 18, blocks: 2, align: [6, 34] }
  ];

  // GF(256) with primitive polynomial 0x11D
  var GF_EXP = new Uint8Array(512);
  var GF_LOG = new Uint8Array(256);
  (function initGalois() {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) {
      GF_EXP[j] = GF_EXP[j - 255];
    }
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  function rsGeneratorPoly(degree) {
    var poly = [1];
    for (var i = 0; i < degree; i++) {
      var next = new Array(poly.length + 1).fill(0);
      var factor = GF_EXP[i];
      for (var j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], factor);
      }
      poly = next;
    }
    return poly;
  }

  function rsComputeEcc(data, eccLen) {
    var gen = rsGeneratorPoly(eccLen);
    var res = new Array(data.length + eccLen).fill(0);
    for (var i = 0; i < data.length; i++) res[i] = data[i];
    for (var j = 0; j < data.length; j++) {
      var coef = res[j];
      if (coef !== 0) {
        for (var k = 0; k < gen.length; k++) {
          res[j + k] ^= gfMul(gen[k], coef);
        }
      }
    }
    return res.slice(data.length);
  }

  function utf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') {
      return Array.from(new TextEncoder().encode(String(str || '')));
    }
    var s = unescape(encodeURIComponent(String(str || '')));
    var out = [];
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }

  function encodeData(bytes) {
    var verIdx = -1;
    for (var v = 1; v < VERSIONS.length; v++) {
      var maxBytes = VERSIONS[v].totalData - 2; // 4-bit mode + 8-bit len + 4-bit terminator = 2 bytes
      if (bytes.length <= maxBytes) {
        verIdx = v;
        break;
      }
    }
    if (verIdx === -1) return null;

    var spec = VERSIONS[verIdx];
    var bits = [];
    function pushBits(val, len) {
      for (var i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
    }

    pushBits(0x4, 4); // Byte mode
    pushBits(bytes.length, 8);
    for (var i = 0; i < bytes.length; i++) pushBits(bytes[i], 8);

    var maxBits = spec.totalData * 8;
    var termLen = Math.min(4, maxBits - bits.length);
    pushBits(0, termLen);
    while (bits.length % 8 !== 0) bits.push(0);

    var codewords = [];
    for (var b = 0; b < bits.length; b += 8) {
      var byteVal = 0;
      for (var k = 0; k < 8; k++) byteVal = (byteVal << 1) | bits[b + k];
      codewords.push(byteVal);
    }
    var padBytes = [0xec, 0x11];
    var padIdx = 0;
    while (codewords.length < spec.totalData) {
      codewords.push(padBytes[padIdx % 2]);
      padIdx++;
    }

    var blockDataLen = Math.floor(spec.totalData / spec.blocks);
    var dataBlocks = [];
    var eccBlocks = [];
    for (var bl = 0; bl < spec.blocks; bl++) {
      var slice = codewords.slice(bl * blockDataLen, (bl + 1) * blockDataLen);
      dataBlocks.push(slice);
      eccBlocks.push(rsComputeEcc(slice, spec.eccPerBlock));
    }

    var finalBytes = [];
    for (var di = 0; di < blockDataLen; di++) {
      for (var b1 = 0; b1 < spec.blocks; b1++) finalBytes.push(dataBlocks[b1][di]);
    }
    for (var ei = 0; ei < spec.eccPerBlock; ei++) {
      for (var b2 = 0; b2 < spec.blocks; b2++) finalBytes.push(eccBlocks[b2][ei]);
    }

    return { version: verIdx, spec: spec, bytes: finalBytes };
  }

  function makeMatrix(size) {
    var m = [];
    var isFunc = [];
    for (var r = 0; r < size; r++) {
      m.push(new Uint8Array(size));
      isFunc.push(new Uint8Array(size));
    }
    return { m: m, isFunc: isFunc, size: size };
  }

  function setFunc(grid, r, c, dark) {
    if (r < 0 || c < 0 || r >= grid.size || c >= grid.size) return;
    grid.m[r][c] = dark ? 1 : 0;
    grid.isFunc[r][c] = 1;
  }

  function drawFinder(grid, row, col) {
    for (var dr = -1; dr <= 7; dr++) {
      for (var dc = -1; dc <= 7; dc++) {
        var r = row + dr;
        var c = col + dc;
        if (r < 0 || c < 0 || r >= grid.size || c >= grid.size) continue;
        var inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        var dark = inOuter && (
          dr === 0 || dr === 6 || dc === 0 || dc === 6 ||
          (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4)
        );
        setFunc(grid, r, c, dark);
      }
    }
  }

  function drawAlignment(grid, row, col) {
    for (var dr = -2; dr <= 2; dr++) {
      for (var dc = -2; dc <= 2; dc++) {
        var dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
        setFunc(grid, row + dr, col + dc, dark);
      }
    }
  }

  function buildFunctionPatterns(version, spec) {
    var grid = makeMatrix(spec.size);
    drawFinder(grid, 0, 0);
    drawFinder(grid, 0, spec.size - 7);
    drawFinder(grid, spec.size - 7, 0);

    for (var i = 8; i < spec.size - 8; i++) {
      setFunc(grid, 6, i, i % 2 === 0);
      setFunc(grid, i, 6, i % 2 === 0);
    }

    if (spec.align.length) {
      for (var a = 0; a < spec.align.length; a++) {
        for (var b = 0; b < spec.align.length; b++) {
          var r = spec.align[a];
          var c = spec.align[b];
          if ((r === 6 && c === 6) || (r === 6 && c === spec.size - 7) || (r === spec.size - 7 && c === 6)) continue;
          drawAlignment(grid, r, c);
        }
      }
    }

    setFunc(grid, 4 * version + 9, 8, true);

    // Reserve format info cells
    for (var f = 0; f < 9; f++) {
      if (f !== 6) {
        setFunc(grid, 8, f, false);
        setFunc(grid, f, 8, false);
      }
    }
    for (var f2 = 0; f2 < 8; f2++) {
      setFunc(grid, 8, spec.size - 1 - f2, false);
      if (f2 < 7) setFunc(grid, spec.size - 1 - f2, 8, false);
    }

    return grid;
  }

  function placeDataAndMask(grid, bytes, maskId) {
    var size = grid.size;
    var bitIdx = 0;
    var totalBits = bytes.length * 8;
    var up = true;

    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        var r = up ? (size - 1 - vert) : vert;
        for (var lr = 0; lr < 2; lr++) {
          var c = right - lr;
          if (grid.isFunc[r][c]) continue;
          var bit = false;
          if (bitIdx < totalBits) {
            bit = ((bytes[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1) === 1;
            bitIdx++;
          }
          var invert = false;
          switch (maskId) {
            case 0: invert = (r + c) % 2 === 0; break;
            case 1: invert = r % 2 === 0; break;
            case 2: invert = c % 3 === 0; break;
            case 3: invert = (r + c) % 3 === 0; break;
            case 4: invert = (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; break;
            case 5: invert = ((r * c) % 2 + (r * c) % 3) === 0; break;
            case 6: invert = (((r * c) % 2 + (r * c) % 3) % 2) === 0; break;
            case 7: invert = (((r + c) % 2 + (r * c) % 3) % 2) === 0; break;
          }
          grid.m[r][c] = (bit !== invert) ? 1 : 0;
        }
      }
      up = !up;
    }

    // Format info for ECC Level L (01) + maskId (0..7)
    var data = (1 << 3) | maskId;
    var rem = data;
    for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >> 9) * 0x537);
    var fmt = ((data << 10) | rem) ^ 0x5412;

    for (var k = 0; k <= 5; k++) setFunc(grid, 8, k, (fmt >> k) & 1);
    setFunc(grid, 8, 7, (fmt >> 6) & 1);
    setFunc(grid, 8, 8, (fmt >> 7) & 1);
    setFunc(grid, 7, 8, (fmt >> 8) & 1);
    for (var k2 = 9; k2 < 15; k2++) setFunc(grid, 14 - k2, 8, (fmt >> k2) & 1);

    for (var j = 0; j < 8; j++) setFunc(grid, 8, size - 1 - j, (fmt >> j) & 1);
    for (var j2 = 8; j2 < 15; j2++) setFunc(grid, size - 15 + j2, 8, (fmt >> j2) & 1);
  }

  function penaltyScore(m) {
    var n = m.length;
    var score = 0;
    // Rule 1: adjacent modules in row/col
    for (var r = 0; r < n; r++) {
      var runColor = m[r][0], runLen = 1;
      for (var c = 1; c < n; c++) {
        if (m[r][c] === runColor) {
          runLen++;
          if (runLen === 5) score += 3;
          else if (runLen > 5) score += 1;
        } else {
          runColor = m[r][c];
          runLen = 1;
        }
      }
    }
    for (var c2 = 0; c2 < n; c2++) {
      var runColor2 = m[0][c2], runLen2 = 1;
      for (var r2 = 1; r2 < n; r2++) {
        if (m[r2][c2] === runColor2) {
          runLen2++;
          if (runLen2 === 5) score += 3;
          else if (runLen2 > 5) score += 1;
        } else {
          runColor2 = m[r2][c2];
          runLen2 = 1;
        }
      }
    }
    // Rule 2: 2x2 blocks
    for (var r3 = 0; r3 < n - 1; r3++) {
      for (var c3 = 0; c3 < n - 1; c3++) {
        var v = m[r3][c3];
        if (v === m[r3][c3 + 1] && v === m[r3 + 1][c3] && v === m[r3 + 1][c3 + 1]) score += 3;
      }
    }
    return score;
  }

  function generateMatrix(text) {
    var encoded = encodeData(utf8Bytes(text));
    if (!encoded) return null;

    var bestGrid = null;
    var bestScore = Infinity;
    for (var mask = 0; mask < 8; mask++) {
      var grid = buildFunctionPatterns(encoded.version, encoded.spec);
      placeDataAndMask(grid, encoded.bytes, mask);
      var sc = penaltyScore(grid.m);
      if (sc < bestScore) {
        bestScore = sc;
        bestGrid = grid;
      }
    }
    return bestGrid ? bestGrid.m : null;
  }

  function toSvg(text, sizePx) {
    var m = generateMatrix(text);
    if (!m) return '';
    var n = m.length;
    var margin = 2;
    var total = n + margin * 2;
    var px = sizePx || 140;
    var paths = [];
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (m[r][c]) {
          paths.push('M' + (c + margin) + ',' + (r + margin) + 'h1v1h-1z');
        }
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + px + '" height="' + px + '" viewBox="0 0 ' + total + ' ' + total + '" shape-rendering="crispEdges">' +
      '<rect width="100%" height="100%" fill="#ffffff"/>' +
      '<path d="' + paths.join('') + '" fill="#111111"/>' +
      '</svg>';
  }

  function toDataUrl(text, sizePx) {
    var svg = toSvg(text, sizePx);
    if (!svg) return '';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  root.CmtQrCode = {
    generateMatrix: generateMatrix,
    toSvg: toSvg,
    toDataUrl: toDataUrl
  };
})(typeof window !== 'undefined' ? window : this);
