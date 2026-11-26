/**
 * DeCodeFormatter - Clean, deterministic CSS & HTML formatter for Document Editor.
 * Uses 2-space indentation and preserves strings, comments, and preformatted blocks.
 */
(function (global) {
  'use strict';

  const INDENT = '  ';
  const VOID_TAGS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ]);
  const RAW_TAGS = new Set(['pre', 'code', 'textarea', 'script', 'style']);
  const INLINE_TAGS = new Set([
    'a', 'abbr', 'b', 'bdi', 'bdo', 'cite', 'code', 'data', 'del', 'dfn',
    'em', 'i', 'ins', 'kbd', 'label', 'mark', 'q', 's', 'samp', 'small',
    'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr'
  ]);

  function formatCss(cssText) {
    const src = String(cssText || '').replace(/\r\n?/g, '\n').trim();
    if (!src) return '';

    const out = [];
    let depth = 0;
    let buf = '';
    let i = 0;
    const len = src.length;

    const pushLine = (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      out.push(INDENT.repeat(Math.max(0, depth)) + trimmed);
    };

    const formatSelector = (sel) => {
      return sel
        .replace(/\s*\n\s*/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s*,\s*/g, ', ')
        .trim();
    };

    const formatDecl = (decl) => {
      const colonIdx = decl.indexOf(':');
      if (colonIdx === -1) return decl.trim();
      const prop = decl.slice(0, colonIdx).trim();
      const val = decl.slice(colonIdx + 1).trim().replace(/\s{2,}/g, ' ');
      return prop + ': ' + val;
    };

    while (i < len) {
      const ch = src[i];
      const next = i + 1 < len ? src[i + 1] : '';

      // CSS comment
      if (ch === '/' && next === '*') {
        const end = src.indexOf('*/', i + 2);
        const comment = end === -1 ? src.slice(i) : src.slice(i, end + 2);
        if (buf.trim()) {
          pushLine(buf);
          buf = '';
        }
        comment.split('\n').forEach((cLine, idx) => {
          const t = cLine.trim();
          if (idx === 0) pushLine(t);
          else out.push(INDENT.repeat(Math.max(0, depth)) + ' ' + t);
        });
        i = end === -1 ? len : end + 2;
        continue;
      }

      // Quoted string
      if (ch === '"' || ch === "'") {
        const quote = ch;
        let j = i + 1;
        while (j < len) {
          if (src[j] === '\\') { j += 2; continue; }
          if (src[j] === quote) { j++; break; }
          j++;
        }
        buf += src.slice(i, j);
        i = j;
        continue;
      }

      if (ch === '{') {
        const head = formatSelector(buf);
        buf = '';
        if (depth === 0 && out.length > 0 && out[out.length - 1] !== '') {
          out.push('');
        }
        pushLine(head + ' {');
        depth++;
        i++;
        continue;
      }

      if (ch === '}') {
        if (buf.trim()) {
          pushLine(formatDecl(buf) + ';');
          buf = '';
        }
        depth = Math.max(0, depth - 1);
        pushLine('}');
        if (depth === 0) out.push('');
        i++;
        continue;
      }

      if (ch === ';') {
        const stmt = buf.trim();
        buf = '';
        if (stmt) {
          if (stmt.startsWith('@')) pushLine(stmt.replace(/\s{2,}/g, ' ') + ';');
          else pushLine(formatDecl(stmt) + ';');
        }
        i++;
        continue;
      }

      buf += ch;
      i++;
    }

    if (buf.trim()) {
      pushLine(buf.trim());
    }

    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  function _tokenizeHtml(html) {
    const tokens = [];
    let i = 0;
    const len = html.length;

    while (i < len) {
      if (html[i] === '<') {
        if (html.startsWith('<!--', i)) {
          const end = html.indexOf('-->', i + 4);
          const raw = end === -1 ? html.slice(i) : html.slice(i, end + 3);
          tokens.push({ type: 'comment', raw });
          i = end === -1 ? len : end + 3;
          continue;
        }
        // Tag: scan respecting quotes
        let j = i + 1;
        let quote = '';
        while (j < len) {
          const c = html[j];
          if (quote) {
            if (c === quote) quote = '';
          } else {
            if (c === '"' || c === "'") quote = c;
            else if (c === '>') { j++; break; }
          }
          j++;
        }
        const rawTag = html.slice(i, j);
        const m = rawTag.match(/^<\s*(\/?)\s*([a-zA-Z0-9:-]+)([\s\S]*?)(\/?)\s*>$/);
        if (m) {
          const isClose = m[1] === '/';
          const tagName = m[2].toLowerCase();
          const attrs = m[3];
          const selfClose = m[4] === '/' || VOID_TAGS.has(tagName);
          tokens.push({ type: 'tag', isClose, tagName, attrs, selfClose, raw: rawTag });
          i = j;

          if (!isClose && !selfClose && RAW_TAGS.has(tagName)) {
            const closeRe = new RegExp('<\\/\\s*' + tagName + '\\s*>', 'i');
            const rest = html.slice(i);
            const cm = closeRe.exec(rest);
            if (cm) {
              const inner = rest.slice(0, cm.index);
              if (inner) tokens.push({ type: 'raw', tagName, raw: inner });
              tokens.push({ type: 'tag', isClose: true, tagName, attrs: '', selfClose: false, raw: cm[0] });
              i += cm.index + cm[0].length;
            }
          }
          continue;
        }
        if (/^<!/i.test(rawTag)) {
          tokens.push({ type: 'doctype', raw: rawTag });
          i = j;
          continue;
        }
      }

      const nextLt = html.indexOf('<', i);
      const text = nextLt === -1 ? html.slice(i) : html.slice(i, nextLt);
      tokens.push({ type: 'text', raw: text });
      i = nextLt === -1 ? len : nextLt;
    }
    return tokens;
  }

  function _normalizeTag(tok) {
    if (tok.isClose) return '</' + tok.tagName + '>';
    const attrs = tok.attrs.replace(/\s+/g, ' ').trim();
    const closeSlash = (!VOID_TAGS.has(tok.tagName) && tok.selfClose) ? ' /' : '';
    return '<' + tok.tagName + (attrs ? ' ' + attrs : '') + closeSlash + '>';
  }

  function formatHtml(htmlText) {
    const src = String(htmlText || '').replace(/\r\n?/g, '\n').trim();
    if (!src) return '';

    const tokens = _tokenizeHtml(src);
    const out = [];
    let depth = 0;

    const canInline = (startIdx) => {
      const openTok = tokens[startIdx];
      if (!openTok || openTok.type !== 'tag' || openTok.isClose || openTok.selfClose) return -1;
      if (RAW_TAGS.has(openTok.tagName)) return -1;
      let innerLen = 0;
      let nested = 0;
      for (let k = startIdx + 1; k < tokens.length; k++) {
        const tk = tokens[k];
        if (tk.type === 'comment' || tk.type === 'doctype' || tk.type === 'raw') return -1;
        if (tk.type === 'text') {
          if (tk.raw.includes('\n') && tk.raw.trim().length > 60) return -1;
          innerLen += tk.raw.trim().length;
        } else if (tk.type === 'tag') {
          if (tk.isClose && tk.tagName === openTok.tagName && nested === 0) {
            return innerLen <= 100 ? k : -1;
          }
          if (!INLINE_TAGS.has(tk.tagName)) return -1;
          if (!tk.isClose && !tk.selfClose) nested++;
          else if (tk.isClose && nested > 0) nested--;
          innerLen += tk.raw.length;
        }
        if (innerLen > 100) return -1;
      }
      return -1;
    };

    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];

      if (tok.type === 'doctype') {
        out.push(INDENT.repeat(depth) + tok.raw.trim());
        continue;
      }

      if (tok.type === 'comment') {
        tok.raw.split('\n').forEach((line, idx) => {
          const t = line.trim();
          if (t) out.push(INDENT.repeat(depth) + (idx > 0 ? ' ' : '') + t);
        });
        continue;
      }

      if (tok.type === 'text') {
        const t = tok.raw.replace(/\s+/g, ' ').trim();
        if (t) out.push(INDENT.repeat(depth) + t);
        continue;
      }

      if (tok.type === 'raw') {
        if (tok.tagName === 'style') {
          const formattedCss = formatCss(tok.raw).trim();
          if (formattedCss) {
            formattedCss.split('\n').forEach(line => {
              out.push(line ? INDENT.repeat(depth) + line : '');
            });
          }
        } else {
          out.push(tok.raw.replace(/^\n+|\n+$/g, ''));
        }
        continue;
      }

      if (tok.type === 'tag') {
        if (tok.isClose) {
          depth = Math.max(0, depth - 1);
          out.push(INDENT.repeat(depth) + _normalizeTag(tok));
          continue;
        }

        const inlineEnd = canInline(i);
        if (inlineEnd !== -1) {
          let line = _normalizeTag(tok);
          for (let k = i + 1; k < inlineEnd; k++) {
            const innerTok = tokens[k];
            if (innerTok.type === 'text') {
              const prev = tokens[k - 1];
              const next = tokens[k + 1];
              let t = innerTok.raw.replace(/\s+/g, ' ');
              if (prev && prev.type === 'tag' && !prev.isClose && prev.tagName === tok.tagName) t = t.replace(/^\s+/, '');
              if (next && next.type === 'tag' && next.isClose && next.tagName === tok.tagName) t = t.replace(/\s+$/, '');
              line += t;
            } else if (innerTok.type === 'tag') {
              line += _normalizeTag(innerTok);
            }
          }
          line += _normalizeTag(tokens[inlineEnd]);
          out.push(INDENT.repeat(depth) + line);
          i = inlineEnd;
          continue;
        }

        out.push(INDENT.repeat(depth) + _normalizeTag(tok));
        if (!tok.selfClose) depth++;
      }
    }

    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  function _replaceMonacoContent(editor, nextText) {
    if (!editor || !editor.getModel) return false;
    const model = editor.getModel();
    if (!model) return false;
    const cur = model.getValue();
    if (cur === nextText) return false;
    editor.pushUndoStop();
    editor.executeEdits('de-clean-code', [{
      range: model.getFullModelRange(),
      text: nextText,
      forceMoveMarkers: true
    }]);
    editor.pushUndoStop();
    return true;
  }

  function cleanCssEditor() {
    const ed = (typeof cssEditor !== 'undefined' && cssEditor) ? cssEditor : global.cssEditor;
    if (!ed) return false;
    const formatted = formatCss(ed.getValue());
    return _replaceMonacoContent(ed, formatted);
  }

  function cleanMainHtmlEditor() {
    const ed = (typeof mdEditor !== 'undefined' && mdEditor) ? mdEditor : global.mdEditor;
    const docType = (typeof currentDocType !== 'undefined') ? currentDocType : global.currentDocType;
    if (!ed || docType !== 'html') return false;
    const formatted = formatHtml(ed.getValue());
    return _replaceMonacoContent(ed, formatted);
  }

  function cleanAll() {
    const isDetached = global.DeDetach && typeof global.DeDetach.isDetached === 'function' && global.DeDetach.isDetached();
    let changed = false;
    if (isDetached) {
      if (global.DeDetach.getPanel() === 'css') changed = cleanCssEditor();
    } else {
      const cHtml = cleanMainHtmlEditor();
      const cCss = cleanCssEditor();
      changed = cHtml || cCss;
    }
    if (typeof global.showToast === 'function') {
      const msg = (global.i18n && global.i18n.t) ? global.i18n.t('deCleanCodeDone') : 'Code formatted';
      global.showToast(changed ? (msg || 'Code formatted') : (msg || 'Code formatted'));
    }
    return changed;
  }

  global.DeCodeFormatter = {
    formatCss,
    formatHtml,
    cleanCssEditor,
    cleanMainHtmlEditor,
    cleanAll
  };
})(typeof window !== 'undefined' ? window : this);
