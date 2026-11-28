/**
 * js/reference-builder/rb-exporter.js
 * Compiles Reference Manuals into semantic HTML (interactive quizzes), PDF, Markdown (.md), and ODT (.odt).
 * Follows export-standards: CSS classes + <style> block (zero inline style attributes),
 * ExportStylesService integration, saveExportWithDestination, and showExportSuccessPopup.
 */
(function (root) {
  'use strict';

  function _escHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _renderMarkdownSnippet(mdText) {
    var raw = String(mdText || '');
    if (!raw.trim()) return '';
    if (root.marked && typeof root.marked.parse === 'function') {
      try {
        return root.marked.parse(raw);
      } catch (_) {}
    }
    return '<p>' + _escHtml(raw).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
  }

  function _getTypeDef(typeId, customTypes) {
    if (root.RbModuleTypes && typeof root.RbModuleTypes.getTypeById === 'function') {
      return root.RbModuleTypes.getTypeById(typeId, customTypes);
    }
    return { id: typeId || 'definition', defaultName: 'Module', styleVariant: 'card', fields: [{ key: 'body', kind: 'richtext' }] };
  }

  function compileMarkdown(manual, subject, customTypes) {
    var lines = [];
    var metaPairs = [
      'title: "' + String(manual.title || '').replace(/"/g, '\\"') + '"',
      subject ? 'subject: "' + String(subject.name || '').replace(/"/g, '\\"') + '"' : '',
      manual.level ? 'level: "' + String(manual.level).replace(/"/g, '\\"') + '"' : '',
      manual.year ? 'year: "' + String(manual.year).replace(/"/g, '\\"') + '"' : '',
      manual.subDiscipline ? 'subDiscipline: "' + String(manual.subDiscipline).replace(/"/g, '\\"') + '"' : ''
    ].filter(Boolean);
    lines.push('---');
    lines.push.apply(lines, metaPairs);
    lines.push('---', '');

    lines.push('# ' + (manual.title || 'Reference Manual'));
    if (manual.subtitle) lines.push('', '*' + manual.subtitle + '*');
    var badges = [subject && subject.name, manual.level, manual.year, manual.subDiscipline].filter(Boolean);
    if (badges.length) lines.push('', '**' + badges.join(' | ') + '**');
    lines.push('');

    var answerKey = [];
    var chapters = Array.isArray(manual.chapters) ? manual.chapters : [];
    chapters.forEach(function (ch, cIdx) {
      lines.push('## ' + (cIdx + 1) + '. ' + (ch.title || 'Topic'));
      var chMeta = [ch.level, ch.year, ch.subDiscipline].filter(Boolean);
      if (chMeta.length) lines.push('', '_' + chMeta.join(' · ') + '_');
      if (ch.summary) lines.push('', ch.summary);
      lines.push('');

      var mods = Array.isArray(ch.modules) ? ch.modules : [];
      mods.forEach(function (mod) {
        var tDef = _getTypeDef(mod.typeId, customTypes);
        var label = mod.title || tDef.defaultName;
        lines.push('### [' + tDef.defaultName + '] ' + label);
        lines.push('');
        var data = mod.data || {};
        (tDef.fields || []).forEach(function (f) {
          var val = data[f.key];
          if (val == null) return;
          if (f.kind === 'text' && String(val).trim()) {
            lines.push('**' + (f.defaultLabel || f.key) + ':** ' + String(val).trim(), '');
          } else if (f.kind === 'richtext' && String(val).trim()) {
            lines.push(String(val).trim(), '');
          } else if (f.kind === 'list' && Array.isArray(val)) {
            val.forEach(function (rawItem, i) {
              var text = typeof rawItem === 'object' && rawItem !== null ? String(rawItem.text || '') : String(rawItem || '');
              var indent = (typeof rawItem === 'object' && rawItem !== null && typeof rawItem.indent === 'number') ? Math.max(0, Math.min(8, rawItem.indent)) : 0;
              if (!text.trim()) return;
              var pad = new Array(indent + 1).join('  ');
              lines.push(pad + (tDef.id === 'procedure' && indent === 0 ? (i + 1) + '. ' : '- ') + text.trim());
            });
            lines.push('');
          } else if (f.kind === 'keyvalue' && Array.isArray(val)) {
            val.filter(function (p) { return p && (p.left || p.right); }).forEach(function (p) {
              lines.push('- **' + (p.left || '') + '**: ' + (p.right || ''));
            });
            lines.push('');
          } else if (f.kind === 'table' && val && Array.isArray(val.headers)) {
            lines.push('| ' + val.headers.join(' | ') + ' |');
            lines.push('| ' + val.headers.map(function () { return '---'; }).join(' | ') + ' |');
            (val.rows || []).forEach(function (row) {
              lines.push('| ' + (row || []).join(' | ') + ' |');
            });
            lines.push('');
          } else if (f.kind === 'media' && val && (val.src || val.dataUrl)) {
            var mSrc = val.src || val.dataUrl;
            if (f.mediaKind === 'video') {
              lines.push('[Video: ' + (val.fileName || mSrc) + '](' + mSrc + ')', '');
            } else {
              lines.push('![' + (data.alt || data.caption || label) + '](' + mSrc + ')', '');
            }
          } else if (f.kind === 'quiz' && val && Array.isArray(val.questions)) {
            val.questions.forEach(function (q, qi) {
              lines.push((qi + 1) + '. ' + (q.prompt || 'Question'));
              if (q.kind !== 'short' && Array.isArray(q.options)) {
                q.options.forEach(function (opt, oi) {
                  lines.push('   - ' + String.fromCharCode(65 + oi) + ') ' + opt);
                });
                var ansLetter = String.fromCharCode(65 + (q.correctIndex || 0));
                answerKey.push((cIdx + 1) + '.' + (qi + 1) + ' (' + label + '): ' + ansLetter + (q.explanation ? ' — ' + q.explanation : ''));
              } else {
                answerKey.push((cIdx + 1) + '.' + (qi + 1) + ' (' + label + '): ' + (q.answerText || '') + (q.explanation ? ' — ' + q.explanation : ''));
              }
            });
            lines.push('');
          } else if (f.kind === 'tool_link' && Array.isArray(val)) {
            val.forEach(function (lnk) {
              if (lnk && (lnk.label || lnk.urn)) {
                lines.push('- **CMT Link:** ' + (lnk.label || lnk.urn) + (lnk.urn ? ' (`' + lnk.urn + '`)' : ''));
              }
            });
            lines.push('');
          }
        });
      });
    });

    if (answerKey.length) {
      lines.push('---', '', '## Answer Key', '');
      answerKey.forEach(function (ak) { lines.push('- ' + ak); });
      lines.push('');
    }
    return lines.join('\n');
  }

  function _normalizeCssMargin(m) {
    var s = String(m || '').trim();
    if (!s) return '16mm 14mm';
    return s.split(/\s+/).map(function (tok) {
      return /^-?\d+(?:\.\d+)?$/.test(tok) ? (tok + 'mm') : tok;
    }).join(' ');
  }

  function _resolveExportLayout(manual) {
    var es = (manual && manual.exportSettings) || {};
    var overrides = {};
    if (es.pageSize && es.pageSize !== 'general') overrides.pageSize = es.pageSize;
    if (es.orientation && es.orientation !== 'general') overrides.orientation = es.orientation;
    if (es.margin && String(es.margin).trim()) overrides.margin = _normalizeCssMargin(es.margin);
    var base = (root.Desktop && typeof root.Desktop.getPdfExportSettings === 'function')
      ? root.Desktop.getPdfExportSettings(overrides)
      : (typeof root.getPdfExportSettings === 'function'
        ? root.getPdfExportSettings(overrides)
        : { pageSize: overrides.pageSize || 'A4', orientation: overrides.orientation || 'portrait', margin: overrides.margin || '16mm 14mm', isLandscape: overrides.orientation === 'landscape' });
    return {
      pageSize: base.pageSize || 'A4',
      orientation: base.orientation || 'portrait',
      isLandscape: !!base.isLandscape,
      margin: _normalizeCssMargin(base.margin || '16mm 14mm'),
      fontSize: (es.fontSize && String(es.fontSize).trim()) ? String(es.fontSize).trim() : '',
      showCover: es.showCover !== false,
      showToc: es.showToc !== undefined ? es.showToc : (manual && manual.showToc !== false),
      includeAnswerKey: es.includeAnswerKey !== false,
      pageBreakChapters: !!es.pageBreakChapters
    };
  }

  var _PAPER_DIMS = {
    A4: { w: '210mm', h: '297mm' },
    A3: { w: '297mm', h: '420mm' },
    A5: { w: '148mm', h: '210mm' },
    Letter: { w: '215.9mm', h: '279.4mm' },
    Legal: { w: '215.9mm', h: '355.6mm' }
  };

  function _baseReportCss(layout, forPdf) {
    var pageRule = '@page { size: ' + layout.pageSize + ' ' + layout.orientation + '; margin: ' + layout.margin + '; }';
    var fontRule = layout.fontSize ? ('body { font-size: ' + layout.fontSize + '; }') : '';
    var breakRule = layout.pageBreakChapters ? '.rb-chapter + .rb-chapter { page-break-before: always; break-before: page; }' : '';
    var dim = _PAPER_DIMS[layout.pageSize] || _PAPER_DIMS.A4;
    var sheetW = layout.isLandscape ? dim.h : dim.w;
    var sheetH = layout.isLandscape ? dim.w : dim.h;
    var bodyRule = forPdf
      ? 'body { font-family: var(--exp-font-family, "Lexend", system-ui, sans-serif); font-size: var(--exp-font-size-base, 14px); line-height: var(--exp-line-height, 1.6); color: var(--rb-fg); background: #e2e8f0; margin: 0; padding: 1.5rem; }'
      : 'body { font-family: var(--exp-font-family, "Lexend", system-ui, sans-serif); font-size: var(--exp-font-size-base, 14px); line-height: var(--exp-line-height, 1.6); color: var(--rb-fg); background: var(--rb-bg); margin: 0; padding: 2rem; }';
    var docRule = forPdf
      ? '.rb-doc { width: ' + sheetW + '; min-height: ' + sheetH + '; max-width: 100%; box-sizing: border-box; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 2px; padding: ' + layout.margin + '; box-shadow: 0 6px 24px rgba(15, 23, 42, 0.16); }'
      : '.rb-doc { max-width: 920px; margin: 0 auto; background: #ffffff; border: 2px solid #333333; border-radius: 10px; padding: 2rem 2.5rem; box-shadow: 4px 4px 0 #555555; }';
    return [
      pageRule,
      ':root { --rb-accent: #5b8fcc; --rb-bg: var(--exp-bg-page, #f5f5f0); --rb-fg: var(--exp-text-color, #222222); }',
      bodyRule,
      fontRule,
      breakRule,
      docRule,
      '.rb-cover { border-bottom: 2px solid #333333; padding-bottom: 1.25rem; margin-bottom: 1.75rem; }',
      '.rb-title { margin: 0 0 0.35rem 0; font-size: 2rem; font-weight: 800; }',
      '.rb-subtitle { margin: 0 0 0.75rem 0; color: #555555; font-size: 1.05rem; }',
      '.rb-meta-row { display: flex; flex-wrap: wrap; gap: 0.5rem; }',
      '.rb-badge { display: inline-block; padding: 0.2rem 0.6rem; border: 1.5px solid #333333; border-radius: 4px; background: #f5f5f0; font-size: 0.8rem; font-weight: 700; }',
      '.rb-toc { background: #f5f5f0; border: 2px solid #333333; border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 2rem; }',
      '.rb-toc-title { margin: 0 0 0.5rem 0; font-size: 1rem; font-weight: 700; }',
      '.rb-toc-list { margin: 0; padding-left: 1.25rem; }',
      '.rb-toc-list a { color: #222222; text-decoration: none; font-weight: 600; }',
      '.rb-toc-list a:hover { text-decoration: underline; }',
      '.rb-chapter { margin-bottom: 2.25rem; }',
      '.rb-chapter-title { border-bottom: 2px solid #333333; padding-bottom: 0.35rem; margin: 0 0 0.5rem 0; font-size: 1.4rem; }',
      '.rb-chapter-title-banner { background: #333333; color: #ffffff; padding: 0.6rem 1rem; border-radius: 6px; border-bottom: 0; }',
      '.rb-chapter-title-boxed { border: 2px solid #333333; background: #f5f5f0; padding: 0.5rem 0.9rem; border-radius: 6px; }',
      '.rb-chapter-meta { font-size: 0.85rem; color: #555555; margin-bottom: 0.75rem; display: flex; flex-wrap: wrap; gap: 0.4rem; }',
      '.rb-module { border: 2px solid #333333; border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1rem; background: #ffffff; page-break-inside: avoid; }',
      '.rb-module-layout-callout { border-left-width: 6px; }',
      '.rb-module-layout-card { box-shadow: 3px 3px 0 #555555; }',
      '.rb-module-layout-minimal { border: 0; border-left: 4px solid #333333; border-radius: 0; padding: 0.5rem 1rem; background: transparent; }',
      '.rb-module-layout-banner .rb-module-header { background: #f5f5f0; margin: -1rem -1.25rem 0.75rem -1.25rem; padding: 0.6rem 1.25rem; border-bottom: 2px solid #333333; border-radius: 6px 6px 0 0; }',
      '.rb-module-warning { background: #fdf2f2; border-left: 6px solid #c96b6b; }',
      '.rb-module-tip { background: #fefce8; border-left: 6px solid #e2c96e; }',
      '.rb-module-definition { background: #f0f6fc; border-left: 6px solid #5b8fcc; }',
      '.rb-module-rule { background: #f5f3ff; border-left: 6px solid #8b7cc2; }',
      '.rb-module-example { background: #f0fdf4; border-left: 6px solid #6abf8e; }',
      '.rb-module-header { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.6rem; }',
      '.rb-module-type { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #444444; }',
      '.rb-module-title { margin: 0; font-size: 1.1rem; font-weight: 700; }',
      '.rb-table { width: 100%; border-collapse: collapse; margin: 0.5rem 0; }',
      '.rb-table th, .rb-table td { border: 1.5px solid #333333; padding: 0.45rem 0.65rem; text-align: left; }',
      '.rb-table th { background: #f5f5f0; font-weight: 700; }',
      '.rb-media-figure { margin: 0.5rem 0; text-align: center; }',
      '.rb-media-img { max-width: 100%; height: auto; border: 1.5px solid #333333; border-radius: 6px; }',
      '.rb-media-video { max-width: 100%; border: 1.5px solid #333333; border-radius: 6px; }',
      '.rb-media-caption { font-size: 0.85rem; color: #555555; margin-top: 0.35rem; }',
      '.rb-video-card { border: 1.5px dashed #333333; border-radius: 6px; padding: 0.75rem 1rem; background: #f5f5f0; }',
      '.rb-quiz-item { border-top: 1px solid #dddddd; padding: 0.75rem 0; }',
      '.rb-quiz-item:first-child { border-top: 0; }',
      '.rb-quiz-options { list-style: none; padding: 0; margin: 0.4rem 0; display: grid; gap: 0.35rem; }',
      '.rb-quiz-opt-btn { display: block; width: 100%; text-align: left; padding: 0.45rem 0.75rem; border: 1.5px solid #333333; border-radius: 6px; background: #ffffff; cursor: pointer; font: inherit; }',
      '.rb-quiz-opt-btn.is-correct { background: #dcfce7; border-color: #166534; font-weight: 700; }',
      '.rb-quiz-opt-btn.is-wrong { background: #fee2e2; border-color: #991b1b; }',
      '.rb-quiz-feedback { font-size: 0.85rem; margin-top: 0.35rem; font-weight: 600; }',
      '.rb-tool-links { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.5rem 0; }',
      '.rb-tool-link-chip { display: inline-block; padding: 0.3rem 0.65rem; border: 1.5px solid #333333; border-radius: 4px; background: #e2c96e; color: #111111; font-weight: 700; text-decoration: none; font-size: 0.85rem; }',
      '.rb-field-text { margin: 0.35rem 0 0.6rem; }',
      '.rb-field-label { font-weight: 800; margin-right: 0.35rem; }',
      '.rb-field-subhead { font-size: 0.82rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; color: #444444; margin: 0.65rem 0 0.25rem; }',
      '.rb-field-style-highlight { background: #fef08a; padding: 0.35rem 0.6rem; border-left: 4px solid #333333; border-radius: 4px; }',
      '.rb-field-style-badge { display: inline-block; background: #e2c96e; border: 1.5px solid #333333; border-radius: 4px; padding: 0.2rem 0.55rem; font-weight: 700; }',
      '.rb-field-style-muted { color: #555555; font-size: 0.9em; font-style: italic; }',
      '.rb-field-style-boxed { border: 1.5px solid #333333; border-radius: 6px; padding: 0.5rem 0.75rem; background: #f5f5f0; }',
      '.rb-field-list, .rb-field-rich ul, .rb-field-rich ol { margin: 0.35rem 0; padding-left: 1.4rem; }',
      '.rb-field-list ul, .rb-field-list ol, .rb-field-rich ul ul, .rb-field-rich ol ol, .rb-field-rich ul ol, .rb-field-rich ol ul { margin: 0.2rem 0; padding-left: 1.35rem; }',
      '.rb-answer-key { border-top: 2px solid #333333; margin-top: 2rem; padding-top: 1rem; }',
      '@media print { body { background: #ffffff; padding: 0; } .rb-doc { width: auto; min-height: auto; border: 0; box-shadow: none; padding: 0; } .rb-quiz-opt-btn { cursor: default; } }'
    ].join('\n');
  }

  function compileHtml(manual, subject, customTypes, options) {
    var opts = options || {};
    var layout = _resolveExportLayout(manual);
    var interactive = opts.interactive !== false && !opts.forPdf;
    var chapters = Array.isArray(manual.chapters) ? manual.chapters : [];
    var answerKey = [];
    var dynamicCssRules = [];

    function _formatChapterHeading(ch, idx) {
      var showNum = ch.showNumber !== undefined ? ch.showNumber : (manual.showChapterNumbers !== false);
      var prefix = ch.prefix !== undefined ? ch.prefix : (manual.chapterPrefix || '');
      var numPart = showNum ? (idx + 1) + '. ' : '';
      var prefPart = prefix ? (prefix + ' ') : '';
      return prefPart + numPart + (ch.title || 'Topic');
    }

    var tocHtml = chapters.map(function (ch, idx) {
      return '<li><a href="#ch-' + _escHtml(ch.id || idx) + '">' + _escHtml(_formatChapterHeading(ch, idx)) + '</a></li>';
    }).join('');

    var chaptersHtml = chapters.map(function (ch, cIdx) {
      var chId = _escHtml(ch.id || cIdx);
      var chTitleCls = 'rb-chapter-title';
      if (ch.titleStyle === 'banner') chTitleCls += ' rb-chapter-title-banner';
      else if (ch.titleStyle === 'boxed') chTitleCls += ' rb-chapter-title-boxed';
      if (ch.accentColor) {
        dynamicCssRules.push('#ch-' + chId + ' .rb-chapter-title { border-color: ' + ch.accentColor + '; }');
        if (ch.titleStyle === 'banner') {
          dynamicCssRules.push('#ch-' + chId + ' .rb-chapter-title-banner { background: ' + ch.accentColor + '; }');
        }
      }

      var chMeta = [ch.level, ch.year, ch.subDiscipline].filter(Boolean).map(function (x) {
        return '<span class="rb-badge">' + _escHtml(x) + '</span>';
      }).join('');

      var modsHtml = (ch.modules || []).map(function (mod) {
        var tDef = _getTypeDef(mod.typeId, customTypes);
        var modDomId = 'mod-' + _escHtml(mod.id);
        var variantClass = 'rb-module-' + _escHtml(tDef.id || 'card');
        var layoutClass = 'rb-module-layout-' + _escHtml(mod.layoutStyle || tDef.styleVariant || 'callout');
        var customCls = mod.customClass ? (' ' + _escHtml(mod.customClass)) : '';
        var effectiveColor = mod.accentColor || tDef.color || '';
        if (effectiveColor) {
          dynamicCssRules.push('#' + modDomId + ' { border-left-color: ' + effectiveColor + '; }');
        }

        var showTitle = mod.showTitle !== false;
        var showBadge = mod.showTypeBadge !== undefined ? mod.showTypeBadge : (manual.showTypeBadges !== false);
        var badgeText = (mod.customTypeLabel != null && mod.customTypeLabel !== '') ? mod.customTypeLabel : tDef.defaultName;
        var data = mod.data || {};
        var bodyParts = [];

        (tDef.fields || []).forEach(function (f) {
          var val = data[f.key];
          if (val == null) return;
          var fov = (mod.fieldOverrides && mod.fieldOverrides[f.key]) || {};
          if (fov.hidden) return;
          var fieldLabel = (fov.label != null && fov.label !== '') ? fov.label : (f.defaultLabel || f.key);
          var showFieldLabel = fov.showLabel !== undefined ? fov.showLabel : (f.kind === 'text');
          var fStyleCls = (fov.style && fov.style !== 'default') ? (' rb-field-style-' + _escHtml(fov.style)) : '';
          var fCustomCls = fov.customClass ? (' ' + _escHtml(fov.customClass)) : '';
          var fExtraCls = fStyleCls + fCustomCls;

          if (f.kind === 'text' && String(val).trim()) {
            var lblSpan = showFieldLabel ? '<span class="rb-field-label">' + _escHtml(fieldLabel) + ':</span> ' : '';
            bodyParts.push('<p class="rb-field-text' + fExtraCls + '">' + lblSpan + '<span class="rb-field-value">' + _escHtml(val) + '</span></p>');
          } else if (f.kind === 'richtext' && String(val).trim()) {
            var richHead = (fov.showLabel === true || (fov.label && fov.showLabel !== false)) ? '<div class="rb-field-subhead">' + _escHtml(fieldLabel) + '</div>' : '';
            bodyParts.push('<div class="rb-field-rich' + fExtraCls + '">' + richHead + _renderMarkdownSnippet(val) + '</div>');
          } else if (f.kind === 'list' && Array.isArray(val)) {
            var items = val.map(function (rawItem) {
              var txt = typeof rawItem === 'object' && rawItem !== null ? String(rawItem.text || '') : String(rawItem || '');
              var ind = (typeof rawItem === 'object' && rawItem !== null && typeof rawItem.indent === 'number') ? Math.max(0, Math.min(8, rawItem.indent)) : 0;
              return { text: txt.trim(), indent: ind };
            }).filter(function (it) { return it.text.length > 0; });
            if (items.length) {
              var rootTag = tDef.id === 'procedure' ? 'ol' : 'ul';
              var listHead = (fov.showLabel === true || (fov.label && fov.showLabel !== false)) ? '<div class="rb-field-subhead">' + _escHtml(fieldLabel) + '</div>' : '';
              var listHtml = '<' + rootTag + ' class="rb-field-list">';
              var curDepth = 0;
              var stackTags = [rootTag];
              items.forEach(function (it, idx) {
                var targetDepth = idx === 0 ? 0 : Math.min(it.indent, curDepth + 1);
                while (curDepth < targetDepth) {
                  var subTag = 'ul';
                  listHtml += '<' + subTag + '>';
                  stackTags.push(subTag);
                  curDepth++;
                }
                while (curDepth > targetDepth) {
                  listHtml += '</li></' + stackTags.pop() + '>';
                  curDepth--;
                }
                if (idx > 0 && curDepth === targetDepth) {
                  listHtml += '</li>';
                }
                listHtml += '<li>' + _escHtml(it.text);
              });
              while (stackTags.length > 1) {
                listHtml += '</li></' + stackTags.pop() + '>';
              }
              listHtml += '</li></' + rootTag + '>';
              bodyParts.push('<div class="rb-field-list-wrap' + fExtraCls + '">' + listHead + listHtml + '</div>');
            }
          } else if (f.kind === 'keyvalue' && Array.isArray(val)) {
            var pairs = val.filter(function (p) { return p && (p.left || p.right); });
            if (pairs.length) {
              var kvHead = (fov.showLabel === true || (fov.label && fov.showLabel !== false)) ? '<div class="rb-field-subhead">' + _escHtml(fieldLabel) + '</div>' : '';
              bodyParts.push('<div class="rb-field-kv-wrap' + fExtraCls + '">' + kvHead + '<table class="rb-table"><tbody>' + pairs.map(function (p) {
                return '<tr><th>' + _escHtml(p.left) + '</th><td>' + _escHtml(p.right) + '</td></tr>';
              }).join('') + '</tbody></table></div>');
            }
          } else if (f.kind === 'table' && val && Array.isArray(val.headers)) {
            var tblHead = (fov.showLabel === true || (fov.label && fov.showLabel !== false)) ? '<div class="rb-field-subhead">' + _escHtml(fieldLabel) + '</div>' : '';
            bodyParts.push(
              '<div class="rb-field-table-wrap' + fExtraCls + '">' + tblHead +
              '<table class="rb-table"><thead><tr>' +
              val.headers.map(function (h) { return '<th>' + _escHtml(h) + '</th>'; }).join('') +
              '</tr></thead><tbody>' +
              (val.rows || []).map(function (r) {
                return '<tr>' + (r || []).map(function (c) { return '<td>' + _escHtml(c) + '</td>'; }).join('') + '</tr>';
              }).join('') +
              '</tbody></table></div>'
            );
          } else if (f.kind === 'media' && val && (val.src || val.dataUrl)) {
            var mSrc = val.src || val.dataUrl;
            if (f.mediaKind === 'video') {
              if (opts.forPdf) {
                bodyParts.push('<div class="rb-video-card"><strong>Video:</strong> ' + _escHtml(val.fileName || mSrc) + (data.caption ? '<div class="rb-media-caption">' + _escHtml(data.caption) + '</div>' : '') + '</div>');
              } else {
                bodyParts.push('<figure class="rb-media-figure"><video class="rb-media-video" controls src="' + _escHtml(mSrc) + '"></video>' + (data.caption ? '<figcaption class="rb-media-caption">' + _escHtml(data.caption) + '</figcaption>' : '') + '</figure>');
              }
            } else {
              bodyParts.push('<figure class="rb-media-figure"><img class="rb-media-img" src="' + _escHtml(mSrc) + '" alt="' + _escHtml(data.alt || data.caption || '') + '">' + (data.caption ? '<figcaption class="rb-media-caption">' + _escHtml(data.caption) + '</figcaption>' : '') + '</figure>');
            }
          } else if (f.kind === 'quiz' && val && Array.isArray(val.questions) && val.questions.length) {
            var qItems = val.questions.map(function (q, qi) {
              if (q.kind !== 'short' && Array.isArray(q.options) && q.options.length) {
                answerKey.push((cIdx + 1) + '.' + (qi + 1) + ' (' + (mod.title || tDef.defaultName) + '): ' + (q.options[q.correctIndex || 0] || '') + (q.explanation ? ' — ' + q.explanation : ''));
                var optHtml = q.options.map(function (opt, oi) {
                  return '<li><button type="button" class="rb-quiz-opt-btn" data-rb-q="' + _escHtml(q.id || qi) + '" data-rb-opt="' + oi + '" data-rb-ans="' + (q.correctIndex || 0) + '" data-rb-exp="' + _escHtml(q.explanation || '') + '">' + String.fromCharCode(65 + oi) + ') ' + _escHtml(opt) + '</button></li>';
                }).join('');
                return '<div class="rb-quiz-item"><p><strong>Q' + (qi + 1) + '.</strong> ' + _escHtml(q.prompt) + '</p><ul class="rb-quiz-options">' + optHtml + '</ul><div class="rb-quiz-feedback"></div></div>';
              }
              answerKey.push((cIdx + 1) + '.' + (qi + 1) + ' (' + (mod.title || tDef.defaultName) + '): ' + (q.answerText || '') + (q.explanation ? ' — ' + q.explanation : ''));
              return '<div class="rb-quiz-item"><p><strong>Q' + (qi + 1) + '.</strong> ' + _escHtml(q.prompt) + '</p></div>';
            }).join('');
            bodyParts.push('<div class="rb-quiz-block">' + qItems + '</div>');
          } else if (f.kind === 'tool_link' && Array.isArray(val) && val.length) {
            bodyParts.push('<div class="rb-tool-links">' + val.map(function (lnk) {
              return '<span class="rb-tool-link-chip">' + _escHtml(lnk.label || lnk.urn || 'CMT Link') + '</span>';
            }).join('') + '</div>');
          }
        });

        var headerHtml = (showTitle || showBadge)
          ? ('  <div class="rb-module-header">' +
              (showTitle ? '<h3 class="rb-module-title">' + _escHtml(mod.title || tDef.defaultName) + '</h3>' : '<span></span>') +
              (showBadge ? '<span class="rb-module-type">' + _escHtml(badgeText) + '</span>' : '') +
            '  </div>')
          : '';

        return [
          '<section class="rb-module ' + variantClass + ' ' + layoutClass + customCls + '" id="' + modDomId + '">',
          headerHtml,
          bodyParts.join('\n'),
          '</section>'
        ].join('\n');
      }).join('\n');

      return [
        '<article class="rb-chapter" id="ch-' + chId + '">',
        '  <h2 class="' + chTitleCls + '">' + _escHtml(_formatChapterHeading(ch, cIdx)) + '</h2>',
        chMeta ? '  <div class="rb-chapter-meta">' + chMeta + '</div>' : '',
        ch.summary ? '  <p class="rb-chapter-summary">' + _escHtml(ch.summary) + '</p>' : '',
        modsHtml,
        '</article>'
      ].join('\n');
    }).join('\n');

    var answerKeyHtml = (layout.includeAnswerKey && (opts.forPdf || !interactive) && answerKey.length)
      ? '<section class="rb-answer-key"><h2>Answer Key</h2><ul>' + answerKey.map(function (a) { return '<li>' + _escHtml(a) + '</li>'; }).join('') + '</ul></section>'
      : '';

    var interactiveScript = interactive
      ? '<script>(function(){document.addEventListener("click",function(e){var b=e.target.closest(".rb-quiz-opt-btn");if(!b)return;var item=b.closest(".rb-quiz-item");var btns=item.querySelectorAll(".rb-quiz-opt-btn");var ans=parseInt(b.getAttribute("data-rb-ans"),10);var opt=parseInt(b.getAttribute("data-rb-opt"),10);btns.forEach(function(x){x.classList.remove("is-correct","is-wrong");});b.classList.add(opt===ans?"is-correct":"is-wrong");var fb=item.querySelector(".rb-quiz-feedback");if(fb){var exp=b.getAttribute("data-rb-exp")||"";fb.textContent=(opt===ans?"Correct! ":"Not quite. ")+exp;}});})();</script>'
      : '';

    var badgesHtml = [subject && subject.name, manual.level, manual.year, manual.subDiscipline].filter(Boolean).map(function (b) {
      return '<span class="rb-badge">' + _escHtml(b) + '</span>';
    }).join('');

    var customCssBlocks = (Array.isArray(manual.customCssList) ? manual.customCssList : [])
      .filter(function (sheet) { return sheet && sheet.enabled !== false && String(sheet.css || '').trim(); })
      .map(function (sheet) {
        return '/* Custom CSS: ' + String(sheet.name || 'Sheet').replace(/\*\//g, '') + ' */\n' + sheet.css;
      }).join('\n\n');

    var showToc = layout.showToc && chapters.length > 1;
    var coverHtml = layout.showCover
      ? ('    <header class="rb-cover">\n' +
         '      <h1 class="rb-title">' + _escHtml(manual.title || 'Reference Manual') + '</h1>\n' +
         (manual.subtitle ? '      <p class="rb-subtitle">' + _escHtml(manual.subtitle) + '</p>\n' : '') +
         (badgesHtml ? '      <div class="rb-meta-row">' + badgesHtml + '</div>\n' : '') +
         '    </header>')
      : '';

    return [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '  <meta charset="UTF-8">',
      '  <title>' + _escHtml(manual.title || 'Reference Manual') + '</title>',
      '  <style>',
      _baseReportCss(layout, !!opts.forPdf),
      dynamicCssRules.join('\n'),
      customCssBlocks,
      '  </style>',
      '</head>',
      '<body>',
      '  <main class="rb-doc">',
      coverHtml,
      showToc ? '    <nav class="rb-toc"><h2 class="rb-toc-title">Table of Contents</h2><ol class="rb-toc-list">' + tocHtml + '</ol></nav>' : '',
      chaptersHtml,
      answerKeyHtml,
      '  </main>',
      interactiveScript,
      '</body>',
      '</html>'
    ].join('\n');
  }

  function _downloadFallback(filename, content, mime) {
    var blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  async function _buildPdfHtml(manual, subject, customTypes) {
    var layout = _resolveExportLayout(manual);
    var dim = _PAPER_DIMS[layout.pageSize] || _PAPER_DIMS.A4;
    var sheetW = layout.isLandscape ? dim.h : dim.w;
    var sheetH = layout.isLandscape ? dim.w : dim.h;
    var pdfHtml = compileHtml(manual, subject, customTypes, { forPdf: true, interactive: false });
    if (root.ExportStylesService) {
      var pdfStyleId = root.ExportStylesService.getSelectedStyle('referenceBuilder');
      pdfHtml = await root.ExportStylesService.injectStyleIntoHtml(pdfHtml, pdfStyleId, 'referenceBuilder');
    }
    var pageOverride = [
      '<style id="rb-pdf-page-override">',
      '@page { size: ' + layout.pageSize + ' ' + layout.orientation + '; margin: ' + layout.margin + '; }',
      '@media screen {',
      '  body { background: #e2e8f0 !important; padding: 1.5rem !important; margin: 0 !important; }',
      '  .rb-doc { width: ' + sheetW + ' !important; min-height: ' + sheetH + ' !important; max-width: 100% !important; box-sizing: border-box !important; margin: 0 auto !important; padding: ' + layout.margin + ' !important; background: #ffffff !important; border: 1px solid #cbd5e1 !important; border-radius: 2px !important; box-shadow: 0 6px 24px rgba(15, 23, 42, 0.16) !important; }',
      '}',
      '@media print {',
      '  body { background: #ffffff !important; padding: 0 !important; margin: 0 !important; }',
      '  .rb-doc { width: auto !important; min-height: auto !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; }',
      '}',
      '</style>'
    ].join('\n');
    if (pdfHtml.indexOf('</head>') !== -1) {
      pdfHtml = pdfHtml.replace('</head>', pageOverride + '\n</head>');
    } else {
      pdfHtml = pageOverride + pdfHtml;
    }
    return pdfHtml;
  }

  function _getPdfOptions(manual) {
    var layout = _resolveExportLayout(manual);
    return {
      pageSize: layout.pageSize,
      landscape: layout.isLandscape,
      marginsType: 1,
      preferCSSPageSize: true,
      printBackground: true
    };
  }

  async function previewPdf(manual, subject, customTypes) {
    if (!manual) return null;
    var pdfHtml = await _buildPdfHtml(manual, subject, customTypes);
    if (root.Desktop && typeof root.Desktop.printPdf === 'function') {
      var res = await root.Desktop.printPdf({
        html: pdfHtml,
        previewOnly: true,
        pdfOptions: _getPdfOptions(manual)
      });
      if (res && res.ok && res.base64) {
        return { ok: true, base64: res.base64, html: pdfHtml };
      }
    }
    return { ok: false, html: pdfHtml };
  }

  async function exportReference(manual, subject, customTypes, format) {
    if (!manual) return;
    var baseSlug = String(manual.title || 'reference-manual')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'reference-manual';

    if (format === 'md') {
      var md = compileMarkdown(manual, subject, customTypes);
      if (typeof root.saveExportWithDestination === 'function') {
        await root.saveExportWithDestination({
          filename: baseSlug + '.md',
          content: md,
          encoding: 'utf8',
          mimeType: 'text/markdown;charset=utf-8',
          filters: [{ name: 'Markdown', extensions: ['md'] }, { name: 'All Files', extensions: ['*'] }],
          toolKey: 'referenceBuilder',
          allowDocEditor: true
        });
      } else {
        _downloadFallback(baseSlug + '.md', md, 'text/markdown;charset=utf-8');
      }
      return;
    }

    if (format === 'odt') {
      var mdOdt = compileMarkdown(manual, subject, customTypes);
      if (typeof root.saveExportWithDestination === 'function') {
        await root.saveExportWithDestination({
          filename: baseSlug + '.odt',
          odtRequest: {
            markdown: mdOdt,
            title: manual.title || 'Reference Manual'
          },
          toolKey: 'referenceBuilder',
          allowDocEditor: true
        });
      } else if (root.Desktop && typeof root.Desktop.exportOdt === 'function') {
        var resOdt = await root.Desktop.exportOdt({
          markdown: mdOdt,
          title: manual.title || 'Reference Manual',
          defaultName: baseSlug + '.odt'
        });
        if (resOdt && (resOdt.path || resOdt.filePath) && typeof root.showExportSuccessPopup === 'function') {
          root.showExportSuccessPopup(resOdt.path || resOdt.filePath, resOdt.name || (baseSlug + '.odt'), false);
        }
      } else if (typeof root.showToast === 'function') {
        root.showToast('ODT export requires the Electron desktop app.', true);
      }
      return;
    }

    if (format === 'pdf') {
      var pdfHtml = await _buildPdfHtml(manual, subject, customTypes);
      var targetFilename = baseSlug + '.pdf';
      var chosenDest = 'picker';
      if (typeof root.promptExportDestination === 'function') {
        var destRes = await root.promptExportDestination({
          filename: targetFilename,
          allowDocEditor: false,
          toolKey: 'referenceBuilder'
        });
        if (!destRes || destRes.canceled) return;
        if (typeof destRes === 'string') chosenDest = destRes;
        else {
          chosenDest = destRes.destination || 'picker';
          if (destRes.filename) targetFilename = destRes.filename;
        }
      }
      if (root.Desktop && typeof root.Desktop.printPdf === 'function' && chosenDest !== 'browser') {
        var pdfOpts = _getPdfOptions(manual);
        var req = {
          html: pdfHtml,
          defaultName: targetFilename,
          landscape: pdfOpts.landscape,
          pdfOptions: pdfOpts
        };
        var resolvedTarget = (typeof root.cmtResolveExportTarget === 'function')
          ? root.cmtResolveExportTarget(chosenDest)
          : (chosenDest === 'to-print' ? 'toPrint' : null);
        if (resolvedTarget) {
          req.target = resolvedTarget;
          req.filename = targetFilename;
        }
        var pdfRes = await root.Desktop.printPdf(req);
        if (pdfRes && pdfRes.ok && (pdfRes.path || pdfRes.filePath) && typeof root.showExportSuccessPopup === 'function') {
          root.showExportSuccessPopup(pdfRes.path || pdfRes.filePath, pdfRes.name || targetFilename, false);
        } else if (pdfRes && !pdfRes.ok && !pdfRes.canceled && typeof root.showToast === 'function') {
          root.showToast('Could not save PDF: ' + (pdfRes.error || 'unknown error'), true);
        }
      } else {
        var w = window.open('', '_blank');
        if (w) { w.document.write(pdfHtml); w.document.close(); w.print(); }
      }
      return;
    }

    // Default: HTML
    var html = compileHtml(manual, subject, customTypes, { interactive: true, forPdf: false });
    if (root.ExportStylesService) {
      var htmlStyleId = root.ExportStylesService.getSelectedStyle('referenceBuilder');
      html = await root.ExportStylesService.injectStyleIntoHtml(html, htmlStyleId, 'referenceBuilder');
    }
    var htmlPreserve = '<style id="rb-html-layout-preserve">.rb-doc { max-width: 920px; margin: 0 auto !important; padding: 2rem 2.5rem !important; }</style>';
    if (html.indexOf('</head>') !== -1) {
      html = html.replace('</head>', htmlPreserve + '\n</head>');
    }
    if (typeof root.saveExportWithDestination === 'function') {
      await root.saveExportWithDestination({
        filename: baseSlug + '.html',
        content: html,
        encoding: 'utf8',
        mimeType: 'text/html;charset=utf-8',
        filters: [{ name: 'HTML Document', extensions: ['html'] }, { name: 'All Files', extensions: ['*'] }],
        toolKey: 'referenceBuilder',
        allowDocEditor: true
      });
    } else {
      _downloadFallback(baseSlug + '.html', html, 'text/html;charset=utf-8');
    }
  }

  root.RbExporter = {
    compileMarkdown: compileMarkdown,
    compileHtml: compileHtml,
    buildPdfHtml: _buildPdfHtml,
    previewPdf: previewPdf,
    exportReference: exportReference
  };
})(typeof window !== 'undefined' ? window : globalThis);
