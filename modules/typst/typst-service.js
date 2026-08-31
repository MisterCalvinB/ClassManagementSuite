/**
 * Typst Service for Document Editor
 * Provides offline WebAssembly compilation of Typst documents to SVG and PDF.
 */
(function (global) {
  'use strict';

  const BUNDLED_FONTS = [
    'LibertinusSerif-Regular.otf',
    'LibertinusSerif-Bold.otf',
    'LibertinusSerif-Italic.otf',
    'LibertinusSerif-Semibold.otf',
    'NewCM10-Regular.otf',
    'NewCM10-Bold.otf',
    'NewCM10-Italic.otf',
    'NewCMMath-Regular.otf',
    'NewCMMath-Book.otf',
    'DejaVuSansMono.ttf',
    'DejaVuSansMono-Bold.ttf'
  ];

  let _initPromise = null;
  let _compiler = null;
  let _renderer = null;

  async function _fetchBinary(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  }

  async function _loadTypstService(basePath = '../modules/typst') {
    if (!global.TypstLib) {
      throw new Error('TypstLib not loaded. Ensure typst-bundle.js is included.');
    }

    const compilerWasmUrl = `${basePath}/pkg/typst_ts_web_compiler_bg.wasm`;
    const rendererWasmUrl = `${basePath}/pkg/typst_ts_renderer_bg.wasm`;

    // Fetch wasm binaries and fonts in parallel
    const [compilerWasm, rendererWasm, ...fontBuffers] = await Promise.all([
      _fetchBinary(compilerWasmUrl),
      _fetchBinary(rendererWasmUrl),
      ...BUNDLED_FONTS.map(f => _fetchBinary(`${basePath}/fonts/${f}`).catch(e => {
        console.warn(`[TypstService] Could not load font ${f}:`, e);
        return null;
      }))
    ]);

    const validFonts = fontBuffers.filter(Boolean);

    const compiler = global.TypstLib.createTypstCompiler();
    await compiler.init({
      getModule: () => ({ module_or_path: compilerWasm }),
      getWrapper: () => global.TypstLib.compilerModule,
      beforeBuild: [
        global.TypstLib.loadFonts(validFonts, { assets: false })
      ]
    });

    const renderer = global.TypstLib.createTypstRenderer();
    await renderer.init({
      getModule: () => ({ module_or_path: rendererWasm }),
      getWrapper: () => global.TypstLib.rendererModule
    });

    _compiler = compiler;
    _renderer = renderer;

    return { compiler, renderer };
  }

  const TypstService = {
    async init(basePath) {
      if (!_initPromise) {
        _initPromise = _loadTypstService(basePath).catch(err => {
          _initPromise = null;
          throw err;
        });
      }
      return _initPromise;
    },

    isReady() {
      return !!(_compiler && _renderer);
    },

    formatDiagnostics(diagnostics) {
      if (!Array.isArray(diagnostics) || diagnostics.length === 0) return '';
      return diagnostics.map(d => {
        const range = d.range ? ` (line ${d.range.split(':')[0]})` : '';
        return `${d.severity ? d.severity.toUpperCase() : 'ERROR'}${range}: ${d.message || JSON.stringify(d)}`;
      }).join('\n');
    },

    async compileToSvg(sourceCode, options = {}) {
      await this.init(options.basePath);
      
      _compiler.addSource('/main.typ', sourceCode);
      const artifact = await _compiler.compile({
        mainFilePath: '/main.typ'
      });

      if (!artifact || !artifact.result) {
        const errorMsg = this.formatDiagnostics(artifact?.diagnostics) || 'Unknown compilation error';
        const err = new Error(errorMsg);
        err.diagnostics = artifact?.diagnostics;
        throw err;
      }

      const svg = await _renderer.renderSvg({
        artifactContent: artifact.result
      });

      return {
        svg,
        diagnostics: artifact.diagnostics
      };
    },

    async compileToPdf(sourceCode, options = {}) {
      await this.init(options.basePath);
      
      _compiler.addSource('/main.typ', sourceCode);
      const artifact = await _compiler.compile({
        mainFilePath: '/main.typ',
        format: 1 // PDF format enum
      });

      if (!artifact || !artifact.result) {
        const errorMsg = this.formatDiagnostics(artifact?.diagnostics) || 'Unknown PDF compilation error';
        const err = new Error(errorMsg);
        err.diagnostics = artifact?.diagnostics;
        throw err;
      }

      return artifact.result; // Uint8Array of PDF binary data
    }
  };

  global.TypstService = TypstService;

})(typeof window !== 'undefined' ? window : globalThis);
