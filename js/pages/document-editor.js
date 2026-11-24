async function mpInit() {
  if (mpState.loaded) return;
  if (_mpInitPromise) return _mpInitPromise;
  _mpInitPromise = (async () => {
    if (window.MailpostingService) {
      const res = await MailpostingService.loadClassGroups();
      mpState.classesMeta = res.meta || {};
      mpState.studentRoster = res.roster || {};
      mpState.loaded = true;
      mpPopulateClassSelects();
    }
  })();
  try {
    await _mpInitPromise;
  } finally {
    _mpInitPromise = null;
  }
}

function mpPopulateClassSelects() {
  const select = document.getElementById('mp-class-select');
  const exportSelect = document.getElementById('mp-export-class-select');
  if (!select) return;

  let html = '<option value="">-- Select Class --</option>';
  const keys = Object.keys(mpState.classesMeta).filter(k => {
    const c = mpState.classesMeta[k];
    return c && !c.archived && !c.isArchived;
  });
  keys.forEach(k => {
    const c = mpState.classesMeta[k];
    const name = (c && c.name) ? c.name : k;
    const count = (c && Array.isArray(c.students)) ? c.students.length : 0;
    html += `<option value="${escHtml(k)}">${escHtml(name)} (${count} students)</option>`;
  });

  select.innerHTML = html;
  if (exportSelect) exportSelect.innerHTML = html;

  if (mpState.connectedClassId && mpState.classesMeta[mpState.connectedClassId] && !mpState.classesMeta[mpState.connectedClassId].archived) {
    select.value = mpState.connectedClassId;
    if (exportSelect) exportSelect.value = mpState.connectedClassId;
  }
}

function mpConnectClass(classId) {
  if (!classId || !mpState.classesMeta[classId]) {
    mpState.connectedClassId = null;
    mpState.connectedClass = null;
    mpState.studentList = [];
    mpUpdateNavBadges();
    return;
  }

  const cMeta = mpState.classesMeta[classId];
  mpState.connectedClassId = classId;
  mpState.connectedClass = cMeta;

  const rawStudents = Array.isArray(cMeta.students) ? cMeta.students : [];
  mpState.studentList = rawStudents.map((s, idx) =>
    MailpostingService.normalizeStudent(s, idx, mpState.studentRoster)
  );

  mpUpdateNavBadges();
  showToast((t('mpClassConnected') || 'Class connected: ') + (cMeta.name || classId));
}

function mpUpdateNavBadges() {
  const badge = document.getElementById('mp-active-class-badge');
  const label = document.getElementById('mp-class-badge-label');
  const prevBadge = document.getElementById('mp-active-preview-badge');
  const studentSelect = document.getElementById('mp-nav-student-select');

  if (mpState.connectedClass) {
    if (badge) {
      badge.style.display = 'inline-flex';
      if (label) label.textContent = mpState.connectedClass.name || mpState.connectedClassId;
    }
  } else {
    if (badge) badge.style.display = 'none';
  }

  if (mpState.previewEnabled && mpState.studentList.length > 0) {
    if (prevBadge) prevBadge.style.display = 'inline-flex';
    if (studentSelect) {
      studentSelect.innerHTML = mpState.studentList.map((s, i) =>
        `<option value="${i}" ${i === mpState.previewStudentIndex ? 'selected' : ''}>${escHtml(s.fullName)}</option>`
      ).join('');
    }
  } else {
    if (prevBadge) prevBadge.style.display = 'none';
  }
}

function mpTogglePreview(forceState) {
  if (!mpState.connectedClass) {
    showToast('Please connect a class first (Mailposting ✉ -> Connect Class)', true);
    mpOpenConnectModal();
    return;
  }

  if (typeof forceState === 'boolean') {
    mpState.previewEnabled = forceState;
  } else {
    mpState.previewEnabled = !mpState.previewEnabled;
  }

  const btn = document.getElementById('btn-mp-toggle-preview');
  if (btn) {
    btn.classList.toggle('active', mpState.previewEnabled);
    btn.textContent = mpState.previewEnabled ? 'Disable Student Preview' : 'Toggle Student Preview';
  }

  mpUpdateNavBadges();
  renderPreview();
}

function mpInsertTagAtCursor(tag) {
  if (currentViewMode === 'wysiwyg' && currentDocType === 'html') {
    const chip = '<span class="mp-token-chip" contenteditable="false" data-token="' + escHtml(tag) + '">' + escHtml(tag) + '</span>&nbsp;';
    if (typeof deExecCmd === 'function') deExecCmd('insertHTML', chip);
    return;
  }
  if (!mdEditor) return;
  const sel = mdEditor.getSelection();
  mdEditor.executeEdits('user-insert', [{ range: sel, text: tag, forceMoveMarkers: true }]);
  mdEditor.focus();
}

async function mpOpenMailmergeWizard(startStep) {
  await mpInit();
  const tr = (k, fb) => {
    try { if (window.i18n && i18n.t) { const v = i18n.t(k); if (v && v !== k) return v; } } catch (_) {}
    return fb;
  };
  const classIds = Object.keys(mpState.classesMeta || {});
  const initialClass = mpState.connectedClassId || classIds[0] || '';

  CmtWizard.open({
    id: 'de-mailmerge-wizard',
    title: tr('deMpWizTitle', 'Personalized Class Handouts (Mail-Merge)'),
    icon: 'users.svg',
    width: '740px',
    initialStep: startStep || 0,
    initialState: {
      classId: initialClass,
      previewIdx: 0,
      format: currentDocType === 'typ' ? 'pdf' : 'pdf',
      mode: 'combined'
    },
    quickModeToggle: {
      label: tr('wizQuickAdvanced', 'Quick / Advanced Modals'),
      icon: 'settings.svg',
      onClick: function (w) {
        w.close();
        mpOpenExportModal();
      }
    },
    steps: [
      {
        id: 'class',
        label: tr('deMpWizStep1', '1. Pick Class'),
        render: function (container, st, ctx) {
          container.innerHTML =
            '<h3 class="cmt-wiz-step-heading">' + ctx.escHtml(tr('deMpWizClassHeading', 'Which class is this document for?')) + '</h3>' +
            '<p class="cmt-wiz-step-sub">' + ctx.escHtml(tr('deMpWizClassSub', 'Each student in the selected class can receive their own personalized copy.')) + '</p>';
          const sec = document.createElement('div');
          sec.className = 'cmt-wiz-section';
          sec.innerHTML = '<label class="cmt-wiz-label">' + ctx.escHtml(tr('deMpClassLabel', 'Class Roster')) + '</label>';
          const sel = document.createElement('select');
          sel.className = 'cmt-wiz-select';
          classIds.forEach(cid => {
            const c = mpState.classesMeta[cid];
            const opt = document.createElement('option');
            opt.value = cid;
            const count = Array.isArray(c.students) ? c.students.length : 0;
            opt.textContent = (c.name || cid) + ' (' + count + ' students)';
            if (cid === st.classId) opt.selected = true;
            sel.appendChild(opt);
          });
          const previewList = document.createElement('div');
          previewList.style.cssText = 'margin-top:10px;max-height:130px;overflow-y:auto;font-size:0.82rem;color:#475569;';
          function renderStudents() {
            const c = mpState.classesMeta[st.classId];
            const raw = c && Array.isArray(c.students) ? c.students : [];
            if (!raw.length) { previewList.textContent = tr('deMpNoStudents', 'No students in this class.'); return; }
            const norm = raw.slice(0, 8).map((s, i) => MailpostingService.normalizeStudent(s, i, mpState.studentRoster));
            previewList.innerHTML = norm.map((s, i) => '<div>' + (i + 1) + '. <strong>' + ctx.escHtml(s.fullName) + '</strong></div>').join('') +
              (raw.length > 8 ? '<div style="margin-top:4px;font-style:italic;">+ ' + (raw.length - 8) + ' more...</div>' : '');
          }
          sel.addEventListener('change', () => {
            st.classId = sel.value;
            mpConnectClass(st.classId);
            renderStudents();
          });
          if (st.classId) mpConnectClass(st.classId);
          sec.appendChild(sel);
          sec.appendChild(previewList);
          container.appendChild(sec);
          renderStudents();
        },
        validate: function (st) {
          const c = mpState.classesMeta[st.classId];
          if (!c || !Array.isArray(c.students) || !c.students.length) {
            return tr('deMpErrNoClass', 'Please choose a class with at least one student.');
          }
          return true;
        }
      },
      {
        id: 'fields',
        label: tr('deMpWizStep2', '2. Insert Fields'),
        render: function (container, st, ctx) {
          container.innerHTML =
            '<h3 class="cmt-wiz-step-heading">' + ctx.escHtml(tr('deMpWizFieldsHeading', 'Insert Student Placeholders')) + '</h3>' +
            '<p class="cmt-wiz-step-sub">' + ctx.escHtml(tr('deMpWizFieldsSub', 'Click any field below to insert it at your cursor in the document, or click Next if your template is already ready.')) + '</p>';
          const wrap = document.createElement('div');
          wrap.className = 'cmt-wiz-section';
          wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
          (MailpostingService.AVAILABLE_TAGS || []).forEach(tagObj => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'cmt-wiz-btn cmt-wiz-btn-subtle';
            btn.innerHTML = ctx.iconHtml('plus.svg') + ' <span>' + ctx.escHtml(tagObj.label) + '</span>';
            btn.addEventListener('click', () => {
              mpInsertTagAtCursor(tagObj.tag);
              if (typeof showToast === 'function') showToast('Inserted ' + tagObj.label);
            });
            wrap.appendChild(btn);
          });
          container.appendChild(wrap);
        }
      },
      {
        id: 'preview',
        label: tr('deMpWizStep3', '3. Preview'),
        render: function (container, st, ctx) {
          const c = mpState.classesMeta[st.classId];
          const raw = (c && Array.isArray(c.students)) ? c.students : [];
          const students = raw.map((s, i) => MailpostingService.normalizeStudent(s, i, mpState.studentRoster));
          container.innerHTML =
            '<h3 class="cmt-wiz-step-heading">' + ctx.escHtml(tr('deMpWizPreviewHeading', 'Preview Personalized Output')) + '</h3>' +
            '<p class="cmt-wiz-step-sub">' + ctx.escHtml(tr('deMpWizPreviewSub', 'Check how placeholders look when filled in for a real student.')) + '</p>';
          const sec = document.createElement('div');
          sec.className = 'cmt-wiz-section';
          const sel = document.createElement('select');
          sel.className = 'cmt-wiz-select';
          students.forEach((s, idx) => {
            const opt = document.createElement('option');
            opt.value = String(idx);
            opt.textContent = s.fullName;
            if (idx === st.previewIdx) opt.selected = true;
            sel.appendChild(opt);
          });
          const outBox = document.createElement('pre');
          outBox.style.cssText = 'margin:10px 0 0;padding:10px;background:#fff;border:1.5px solid #333;border-radius:6px;max-height:180px;overflow:auto;white-space:pre-wrap;font-family:inherit;font-size:0.82rem;';
          function updatePreview() {
            const stu = students[st.previewIdx] || students[0];
            const tpl = mdEditor ? mdEditor.getValue() : '';
            const merged = (window.MailpostingService && typeof MailpostingService.mergeTemplate === 'function')
              ? MailpostingService.mergeTemplate(tpl, stu)
              : tpl;
            outBox.textContent = merged.slice(0, 1200) + (merged.length > 1200 ? '\n...' : '');
          }
          sel.addEventListener('change', () => {
            st.previewIdx = parseInt(sel.value, 10) || 0;
            updatePreview();
          });
          sec.appendChild(sel);
          sec.appendChild(outBox);
          container.appendChild(sec);
          updatePreview();
        }
      },
      {
        id: 'export',
        label: tr('deMpWizStep4', '4. Export'),
        render: function (container, st, ctx) {
          container.innerHTML =
            '<h3 class="cmt-wiz-step-heading">' + ctx.escHtml(tr('deMpWizExportHeading', 'Export Personalized Copies')) + '</h3>' +
            '<p class="cmt-wiz-step-sub">' + ctx.escHtml(tr('deMpWizExportSub', 'Choose the file format and whether to combine all students into one file or separate files.')) + '</p>';
          const sec = document.createElement('div');
          sec.className = 'cmt-wiz-section';
          sec.innerHTML =
            '<label class="cmt-wiz-label">' + ctx.escHtml(tr('deMpFormatLabel', 'File Format')) + '</label>' +
            '<select class="cmt-wiz-select" id="de-wiz-mp-fmt" style="margin-bottom:12px;">' +
              '<option value="pdf">PDF (Print Ready)</option>' +
              '<option value="docx">Word Document (.docx)</option>' +
              '<option value="html">Webpage (.html)</option>' +
              '<option value="md">Markdown (.md)</option>' +
            '</select>' +
            '<label class="cmt-wiz-label">' + ctx.escHtml(tr('deMpModeLabel', 'Output Mode')) + '</label>';
          const fmtSel = sec.querySelector('#de-wiz-mp-fmt');
          fmtSel.value = st.format;
          fmtSel.addEventListener('change', () => { st.format = fmtSel.value; });
          container.appendChild(sec);
          ctx.renderCards(container, [
            { id: 'combined', icon: 'file-text.svg', badge: '1 File', title: tr('deMpModeCombined', 'One Combined Document'), desc: tr('deMpModeCombinedDesc', 'All students in one file with page breaks, ideal for fast printing.') },
            { id: 'separate', icon: 'folder.svg', badge: 'Per Student', title: tr('deMpModeSeparate', 'Separate File per Student'), desc: tr('deMpModeSeparateDesc', 'Creates one named file per student, ideal for emailing or LMS.') }
          ], st.mode, function (item) { st.mode = item.id; });
        }
      }
    ],
    finishLabel: tr('btnExport', 'Export'),
    finishIcon: 'export.svg',
    onFinish: function (st) {
      const classSel = document.getElementById('mp-export-class-select');
      const fmtSel = document.getElementById('mp-export-format');
      const modeRadio = document.querySelector('input[name="mp-export-mode"][value="' + st.mode + '"]');
      if (classSel) classSel.value = st.classId;
      if (fmtSel) fmtSel.value = st.format;
      if (modeRadio) modeRadio.checked = true;
      mpExecuteBatchExport();
    }
  });
}

async function mpOpenConnectModal() {
  await mpInit();
  showModal('mp-connect-modal');

  const select = document.getElementById('mp-class-select');
  const rosterDiv = document.getElementById('mp-roster-preview');
  const tagGrid = document.getElementById('mp-tag-grid-preview');
  const countSpan = document.getElementById('mp-roster-count');

  if (tagGrid && window.MailpostingService) {
    tagGrid.innerHTML = MailpostingService.AVAILABLE_TAGS.map(t =>
      `<button class="mp-tag-chip" data-mp-tag="${escHtml(t.tag)}" data-mp-modal="mp-connect-modal">${escHtml(t.label)}<br><code style="font-size:.7rem;color:#0284c7;">${t.tag}</code></button>`
    ).join('');
    if (!tagGrid._mpDelegated) {
      tagGrid._mpDelegated = true;
      tagGrid.addEventListener('click', function (e) {
        var btn = e.target.closest('button.mp-tag-chip[data-mp-tag]');
        if (!btn) return;
        mpInsertTagAtCursor(btn.getAttribute('data-mp-tag'));
        hideModal(btn.getAttribute('data-mp-modal'));
      });
    }
  }

  const updateRosterUI = (cid) => {
    if (cid && mpState.classesMeta[cid]) {
      const c = mpState.classesMeta[cid];
      const raw = Array.isArray(c.students) ? c.students : [];
      if (countSpan) countSpan.textContent = raw.length;
      const normalized = raw.map((s, i) => MailpostingService.normalizeStudent(s, i, mpState.studentRoster));
      rosterDiv.innerHTML = normalized.map((s, i) =>
        `<div style="padding:2px 0;">${i + 1}. <strong>${escHtml(s.fullName)}</strong> ${s.email ? `<span style="color:#64748b;">(${escHtml(s.email)})</span>` : ''}</div>`
      ).join('');
    } else {
      if (countSpan) countSpan.textContent = '0';
      rosterDiv.innerHTML = 'No class selected.';
    }
  };

  if (select) {
    mpPopulateClassSelects();
    select.value = mpState.connectedClassId || (select.options[1] ? select.options[1].value : '');
    updateRosterUI(select.value);
    select.onchange = () => updateRosterUI(select.value);
  }
}

function mpOpenFieldPickerModal() {
  showModal('mp-field-picker-modal');
  const grid = document.getElementById('mp-field-picker-grid');
  if (grid && window.MailpostingService) {
    grid.innerHTML = MailpostingService.AVAILABLE_TAGS.map(t =>
      `<button class="mp-tag-chip" data-mp-tag="${escHtml(t.tag)}" data-mp-modal="mp-field-picker-modal">${escHtml(t.label)}<br><code style="font-size:.7rem;color:#0284c7;">${t.tag}</code></button>`
    ).join('');
    if (!grid._mpDelegated) {
      grid._mpDelegated = true;
      grid.addEventListener('click', function (e) {
        var btn = e.target.closest('button.mp-tag-chip[data-mp-tag]');
        if (!btn) return;
        mpInsertTagAtCursor(btn.getAttribute('data-mp-tag'));
        hideModal(btn.getAttribute('data-mp-modal'));
      });
    }
  }
}

async function mpOpenExportModal() {
  await mpInit();
  showModal('mp-export-modal');
  const select = document.getElementById('mp-export-class-select');
  if (select) {
    mpPopulateClassSelects();
    if (mpState.connectedClassId) {
      select.value = mpState.connectedClassId;
    } else if (select.options[1]) {
      select.value = select.options[1].value;
    }
  }
}

async function mpExecuteBatchExport() {
  const classId = document.getElementById('mp-export-class-select').value;
  const format = document.getElementById('mp-export-format').value;
  const modeRadio = document.querySelector('input[name="mp-export-mode"]:checked');
  const mode = modeRadio ? modeRadio.value : 'combined';

  if (!classId || !mpState.classesMeta[classId]) {
    showToast('Please select a valid class for batch export.', true);
    return;
  }

  hideModal('mp-export-modal');
  const classMeta = mpState.classesMeta[classId];
  const rawStudents = Array.isArray(classMeta.students) ? classMeta.students : [];
  if (rawStudents.length === 0) {
    showToast('Selected class has no students.', true);
    return;
  }

  const students = rawStudents.map((s, idx) =>
    MailpostingService.normalizeStudent(s, idx, mpState.studentRoster)
  );

  const templateContent = mdEditor ? mdEditor.getValue() : '';
  const isHtmlMode = currentDocType === 'html';
  const classNameClean = (classMeta.name || classId).replace(/[/\\?%*:|"<>]/g, '_');
  const docNameClean = (currentDocName || 'document').replace(/[/\\?%*:|"<>]/g, '_');

  showToast(`Starting batch export (${format.toUpperCase()}) for ${students.length} students…`);

  if (currentDocType === 'typ') {
    if (format === 'pdf') {
      if (!window.TypstService) {
        showToast('Typst service not initialized.', true);
        return;
      }
      try {
        if (mode === 'combined') {
          const combinedTypst = students.map(s =>
            MailpostingService.renderTemplate(templateContent, s, classMeta, {
              roster: mpState.studentRoster,
              students: students,
              isHtml: false
            })
          ).join('\n\n#pagebreak()\n\n');

          const combinedTypstTitle = `${classNameClean}_${docNameClean}_BatchCombined`;
          const pdfBytes = await TypstService.compileToPdf(combinedTypst, { title: combinedTypstTitle });
          const defaultName = `${combinedTypstTitle}.pdf`;
          if (window.Desktop && Desktop.isElectron()) {
            await Desktop.saveBlob('docEditorDocs', defaultName, new Blob([pdfBytes], { type: 'application/pdf' }));
            showToast(`Batch PDF export complete! Saved as ${defaultName}`);
          } else {
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = defaultName;
            a.click();
            URL.revokeObjectURL(url);
            showToast(`Downloaded ${defaultName}`);
          }
        } else {
          let successCount = 0;
          for (const s of students) {
            const studentTypst = MailpostingService.renderTemplate(templateContent, s, classMeta, {
              roster: mpState.studentRoster,
              students: students,
              isHtml: false
            });
            const singleTypstTitle = `${classNameClean}_${(s.fullName || s.lastName || 'student').replace(/[/\\?%*:|"<>]/g, '_')}_${docNameClean}`;
            const pdfBytes = await TypstService.compileToPdf(studentTypst, { title: singleTypstTitle });
            const filename = `${singleTypstTitle}.pdf`;
            if (window.Desktop && Desktop.isElectron()) {
              await Desktop.saveBlob('docEditorDocs', filename, new Blob([pdfBytes], { type: 'application/pdf' }));
              successCount++;
            } else {
              const blob = new Blob([pdfBytes], { type: 'application/pdf' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              a.click();
              URL.revokeObjectURL(url);
              successCount++;
            }
          }
          showToast(`Exported ${successCount}/${students.length} individual Typst PDF files.`);
        }
      } catch (err) {
        showToast('Batch export error: ' + (err.message || String(err)), true);
      }
      return;
    }
  }

  if (mode === 'combined') {
    if (format === 'pdf') {
      if (!window.Desktop || !Desktop.isElectron()) {
        showToast('PDF export requires Electron application.', true);
        return;
      }
      deSyncPageLayoutFromControls();
      deSyncCssEditorWithLayout(true);

      const combinedHtmlBody = MailpostingService.renderBatchCombinedHtml(
        templateContent,
        isHtmlMode,
        students,
        classMeta,
        currentDocType === 'html' ? null : marked.parse
      );
      const inlinedCombinedHtml = await deInlineAllImages(combinedHtmlBody);

      const lexendFontsCss = await getEmbeddedLexendFontsCss();
      const customCss = deStripManagedLayoutCss(cssEditor ? cssEditor.getValue() : '');
      const m = pageLayout.margins;
      const marginCss = m.top + 'mm ' + m.right + 'mm ' + m.bottom + 'mm ' + m.left + 'mm';
      const pdfFontFamily = pageLayout.fontFamily || "'Segoe UI', system-ui, sans-serif";
      const pdfFontSize = (pageLayout.fontSize || 11) + 'pt';

      const defaultPreviewCss =
        '@page { size: auto; margin: ' + marginCss + '; }\n' +
        'body { margin: 0; padding: 0; background: #fff; }\n' +
        '.doc-preview { line-height: 1.65; color: #1a1a1a; font-size: ' + pdfFontSize + '; font-family: ' + pdfFontFamily + '; }\n' +
        '.mailposting-student-page { page-break-after: always; break-after: page; padding: 0; margin: 0; }\n' +
        '.mailposting-student-page:last-child { page-break-after: auto; break-after: auto; }\n' +
        customCss;

      const combinedPdfTitle = `${classNameClean} - ${docNameClean}`;
      const html = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n' +
        '<title>' + escHtml(combinedPdfTitle) + '</title>\n' +
        '<style>\n* { box-sizing: border-box; margin: 0; padding: 0; }\n' +
        lexendFontsCss + '\n' +
        defaultPreviewCss + '\n</style>\n</head>\n<body>\n<div class="doc-preview">\n' +
        inlinedCombinedHtml + '\n</div>\n</body>\n</html>';

      const defaultName = `${classNameClean}_${docNameClean}_BatchCombined.pdf`;
      const pdfSize = pageLayout.orientation === 'landscape'
        ? { width: Math.round(getPageDims().w * 1000), height: Math.round(getPageDims().h * 1000) }
        : pageLayout.size;

      const pdfOptions = {
        landscape: pageLayout.orientation === 'landscape',
        pageSize: pdfSize,
        marginsType: 1,
        preferCSSPageSize: true
      };

      const result = await Desktop.printPdf({ html, defaultName, title: combinedPdfTitle, pdfOptions });
      if (result && result.ok) {
        showToast(`Batch PDF export complete! Saved as ${result.name || defaultName}`);
      } else if (result && !result.canceled) {
        showToast(`Batch PDF export failed: ${result.error || 'unknown'}`, true);
      }
    } else if (format === 'html') {
      const combinedHtmlBody = MailpostingService.renderBatchCombinedHtml(
        templateContent,
        isHtmlMode,
        students,
        classMeta,
        currentDocType === 'html' ? null : marked.parse
      );
      const fullHtml = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>${escHtml(classNameClean)} - ${escHtml(docNameClean)}</title>\n</head>\n<body>\n${combinedHtmlBody}\n</body>\n</html>`;
      const defaultName = `${classNameClean}_${docNameClean}_BatchCombined.html`;

      if (window.Desktop && Desktop.isElectron()) {
        await Desktop.saveText('docs', defaultName, fullHtml);
        showToast(`Batch HTML exported as ${defaultName}`);
      } else {
        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Downloaded ${defaultName}`);
      }
    } else if (format === 'docx') {
      if (!window.Desktop || !Desktop.isElectron()) {
        showToast('DOCX export requires Electron application.', true);
        return;
      }
      const combinedMarkdown = students.map(s =>
        MailpostingService.renderTemplate(templateContent, s, classMeta, {
          roster: mpState.studentRoster,
          students: students,
          isHtml: false
        })
      ).join('\n\n---\n\n');

      const images = await collectDocxImages(combinedMarkdown);
      const result = await Desktop.exportDocx({
        markdown: combinedMarkdown,
        defaultName: `${classNameClean}_${docNameClean}_BatchCombined`,
        margins: pageLayout.margins,
        size: pageLayout.size,
        orientation: pageLayout.orientation,
        images
      });

      if (result && result.ok) {
        showToast('Batch DOCX exported');
      }
    }
  } else {
    // Separate Files mode
    const docs = MailpostingService.renderBatchIndividualDocs(
      templateContent,
      isHtmlMode,
      students,
      classMeta,
      docNameClean,
      currentDocType === 'html' ? null : marked.parse
    );

    if (window.Desktop && Desktop.isElectron()) {
      if (format === 'html') {
        for (const d of docs) {
          const fullHtml = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n</head>\n<body>\n${d.processedContent}\n</body>\n</html>`;
          await Desktop.saveText('docs', `${d.filename}.html`, fullHtml);
        }
        showToast(`Exported ${docs.length} individual HTML files to user documents folder.`);
      } else if (format === 'pdf') {
        let successCount = 0;
        const lexendFontsCss = await getEmbeddedLexendFontsCss();
        const customCss = deStripManagedLayoutCss(cssEditor ? cssEditor.getValue() : '');
        const pdfFontFamily = pageLayout.fontFamily || "'Segoe UI', system-ui, sans-serif";
        const pdfFontSize = (pageLayout.fontSize || 11) + 'pt';
        const m = pageLayout.margins;
        const marginCss = m.top + 'mm ' + m.right + 'mm ' + m.bottom + 'mm ' + m.left + 'mm';

        const defaultPreviewCss =
          '@page { size: auto; margin: ' + marginCss + '; }\n' +
          'body { margin: 0; padding: 0; background: #fff; }\n' +
          '.doc-preview { line-height: 1.65; color: #1a1a1a; font-size: ' + pdfFontSize + '; font-family: ' + pdfFontFamily + '; }\n' +
          customCss;

        for (const d of docs) {
          const inlinedDocContent = await deInlineAllImages(d.processedContent);
          const html = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n' +
            '<title>' + escHtml(d.filename) + '</title>\n' +
            '<style>\n* { box-sizing: border-box; margin: 0; padding: 0; }\n' +
            lexendFontsCss + '\n' +
            defaultPreviewCss + '\n</style>\n</head>\n<body>\n<div class="doc-preview">\n' +
            inlinedDocContent + '\n</div>\n</body>\n</html>';

          const res = await Desktop.printPdf({
            html,
            defaultName: `${d.filename}.pdf`,
            title: d.filename,
            pdfOptions: { landscape: pageLayout.orientation === 'landscape', marginsType: 1, preferCSSPageSize: true }
          });
          if (res && res.ok) successCount++;
        }
        showToast(`Exported ${successCount}/${docs.length} individual PDF files.`);
      } else if (format === 'docx') {
        let successCount = 0;
        for (const d of docs) {
          const images = await collectDocxImages(d.rawRenderedText);
          const res = await Desktop.exportDocx({
            markdown: d.rawRenderedText,
            defaultName: d.filename,
            margins: pageLayout.margins,
            size: pageLayout.size,
            orientation: pageLayout.orientation,
            images
          });
          if (res && res.ok) successCount++;
        }
        showToast(`Exported ${successCount}/${docs.length} individual DOCX files.`);
      }
    } else {
      // Browser fallback: download HTML files
      docs.forEach(d => {
        const fullHtml = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>${escHtml(d.filename)}</title>\n</head>\n<body>\n${d.processedContent}\n</body>\n</html>`;
        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${d.filename}.html`;
        a.click();
        URL.revokeObjectURL(url);
      });
      showToast(`Downloaded ${docs.length} individual HTML files.`);
    }
  }
}

// ── DOM init ──────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', function () {
  if (new URLSearchParams(window.location.search).get('presentation') === '1') return;
  if (typeof applyTranslations === 'function') applyTranslations();
  setInterval(autosaveDoc, 60000);
  setupMarked();
  initSplitDivider();
  mpInit();
  initPageLayoutPopup();
  initDocumentInspector();

  const docTypeWrap = document.getElementById('doc-type-wrap');
  const docTypePop = document.getElementById('doc-type-popover');
  document.getElementById('btn-doc-type').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!docTypePop) return;
    const willOpen = !docTypePop.classList.contains('open');
    if (willOpen) {
      docTypePop.querySelectorAll('.doc-type-opt').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.docType === currentDocType);
      });
    }
    docTypePop.classList.toggle('open', willOpen);
  });
  if (docTypePop) {
    docTypePop.addEventListener('click', (e) => {
      const opt = e.target.closest('.doc-type-opt');
      if (!opt) return;
      setDocType(opt.dataset.docType);
      docTypePop.classList.remove('open');
    });
  }
  document.addEventListener('click', (e) => {
    if (docTypePop && docTypeWrap && !docTypeWrap.contains(e.target)) {
      docTypePop.classList.remove('open');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && docTypePop) docTypePop.classList.remove('open');
  });
  document.getElementById('btn-new-doc').addEventListener('click', newDoc);
  const btnNewWin = document.getElementById('btn-new-window');
  if (btnNewWin) {
    btnNewWin.addEventListener('click', () => {
      if (window.Desktop && Desktop.isElectron()) {
        Desktop.openTool('document-editor.html', { newWindow: true });
      }
    });
  }
  document.getElementById('btn-open-doc').addEventListener('click', openDocModal);
  const btnOpenDisk = document.getElementById('btn-open-from-disk');
  if (btnOpenDisk) btnOpenDisk.addEventListener('click', openFromDisk);
  document.getElementById('btn-save-doc').addEventListener('click', saveDoc);
  document.getElementById('btn-save-as-doc').addEventListener('click', saveDocAs);
  const btnSaveFolder = document.getElementById('btn-save-to-folder');
  if (btnSaveFolder) btnSaveFolder.addEventListener('click', saveDocToFolder);
  document.getElementById('btn-save-all-doc').addEventListener('click', saveAll);
  document.getElementById('btn-doc-history').addEventListener('click', openHistoryModal);
  document.getElementById('btn-pin-doc').addEventListener('click', async function () {
    if (!currentEditTarget || !currentEditRelPath) return;
    const isPinned = await Pins.isPinned({
      type: 'doc',
      relativePath: currentEditRelPath,
      target: currentEditTarget
    });
    if (isPinned) {
      await Pins.unpinItem({
        type: 'doc',
        relativePath: currentEditRelPath,
        target: currentEditTarget
      });
    } else {
      await Pins.pinItem({
        type: 'doc',
        title: currentDocName ? currentDocName.replace(/\.(md|html)$/, '') : 'Document',
        relativePath: currentEditRelPath,
        target: currentEditTarget
      });
    }
    updatePinButtonState();
  });
  document.getElementById('history-modal-close').addEventListener('click', () => hideModal('history-modal'));
  document.getElementById('history-modal').addEventListener('click', function (e) {
    if (e.target === this) hideModal('history-modal');
  });
  document.getElementById('btn-export-pdf').addEventListener('click', exportPdf);
  document.getElementById('btn-export-docx').addEventListener('click', exportDocx);
  document.getElementById('btn-export-odt').addEventListener('click', exportOdt);
  document.getElementById('btn-preview').addEventListener('click', showFullPreview);
  document.getElementById('btn-preview-zoom-out').addEventListener('click', () => applyPreviewZoom(previewZoom - PREVIEW_ZOOM_STEP));
  document.getElementById('btn-preview-zoom-in').addEventListener('click', () => applyPreviewZoom(previewZoom + PREVIEW_ZOOM_STEP));
  document.getElementById('btn-preview-zoom-reset').addEventListener('click', () => applyPreviewZoom(1));
  document.getElementById('btn-preview-zoom-fit').addEventListener('click', fitPreviewZoomToWidth);
  document.getElementById('btn-preview-exact-pdf').addEventListener('click', togglePreviewExactPdf);
  const previewScrollEl = document.getElementById('preview-scroll');
  if (previewScrollEl) {
    let _zoomRaf = null;
    let _pendingZoom = null;
    previewScrollEl.addEventListener('wheel', (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const base = _pendingZoom !== null ? _pendingZoom : previewZoom;
      const delta = e.deltaY < 0 ? 0.05 : -0.05;
      _pendingZoom = Math.max(PREVIEW_ZOOM_MIN, Math.min(PREVIEW_ZOOM_MAX, Math.round((base + delta) * 100) / 100));
      if (!_zoomRaf) {
        _zoomRaf = requestAnimationFrame(() => {
          _zoomRaf = null;
          if (_pendingZoom !== null) {
            applyPreviewZoom(_pendingZoom);
            _pendingZoom = null;
          }
        });
      }
    }, { passive: false });
  }
  document.getElementById('btn-syntax-help').addEventListener('click', () => openSyntaxHelpModal());
  document.getElementById('syntax-help-close').addEventListener('click', () => hideModal('syntax-help-modal'));
  document.getElementById('syntax-help-modal').addEventListener('click', function (e) {
    if (e.target === this) hideModal('syntax-help-modal');
  });
  document.getElementById('btn-editor-settings').addEventListener('click', openSettingsModal);
  document.getElementById('stg-close').addEventListener('click', closeSettingsModal);
  document.getElementById('settings-modal').addEventListener('click', function (e) {
    if (e.target === this) closeSettingsModal();
  });
  document.getElementById('btn-close-preview').addEventListener('click', hideFullPreview);
  document.getElementById('btn-toggle-css-editor').addEventListener('click', toggleCssEditor);
  document.getElementById('btn-toggle-script-editor').addEventListener('click', toggleScriptEditor);
  document.getElementById('btn-script-run').addEventListener('click', deRunScriptInSandbox);
  document.getElementById('btn-script-insert').addEventListener('click', deInsertScriptHelperSnippet);
  ['script-helper-trigger', 'script-helper-target'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') deInsertScriptHelperSnippet(); });
  });
  document.getElementById('btn-add-rule').addEventListener('click', addCssRule);
  document.getElementById('rule-value').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') addCssRule();
  });

  const btnOpenTpl = document.getElementById('btn-open-template');
  if (btnOpenTpl) btnOpenTpl.addEventListener('click', openTemplateModal);
  const btnSaveTpl = document.getElementById('btn-save-as-template');
  if (btnSaveTpl) btnSaveTpl.addEventListener('click', saveAsTemplate);

  // Click-to-open nav dropdowns (replaces hover-only menus)
  const navGroups = Array.from(document.querySelectorAll('#app-nav .nav-group'));
  function closeAllNavGroups(exceptGroup) {
    navGroups.forEach(g => {
      if (g !== exceptGroup) g.classList.remove('open');
    });
  }
  navGroups.forEach(group => {
    const trigger = group.querySelector(':scope > .nav-btn');
    if (trigger) {
      trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        const willOpen = !group.classList.contains('open');
        closeAllNavGroups(willOpen ? group : null);
        group.classList.toggle('open', willOpen);
        const plPopup = document.getElementById('page-layout-popup');
        const plBtn = document.getElementById('btn-page-layout');
        if (plPopup) plPopup.classList.remove('open');
        if (plBtn) plBtn.classList.remove('active');
        if (docTypePop) docTypePop.classList.remove('open');
        const hmWrap = document.getElementById('main-hm-wrap');
        if (hmWrap) hmWrap.classList.remove('open');
      });
    }
    const popup = group.querySelector(':scope > .nav-group-popup');
    if (popup) {
      popup.addEventListener('click', function (e) {
        const item = e.target.closest('.nav-pop-item');
        if (!item || item.id === 'btn-insert-table') return;
        group.classList.remove('open');
      });
    }
  });

  // Hamburger
  initHamburger('main-hm-wrap');
  window._cmtApplyNavBrand();
  document.addEventListener('click', function (e) {
    document.getElementById('table-insert-wrap').classList.remove('open');
    if (!e.target.closest('#app-nav .nav-group')) {
      closeAllNavGroups(null);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllNavGroups(null);
  });

  // Save modal
  document.getElementById('btn-save-confirm').addEventListener('click', function () {
    const name = document.getElementById('save-filename-input').value.trim();
    if (!name) { showToast('Enter a filename', true); return; }
    if (saveModalCallback) saveModalCallback(name);
  });
  document.getElementById('btn-save-cancel').addEventListener('click', () => hideModal('save-modal'));
  document.getElementById('save-modal-close').addEventListener('click', () => hideModal('save-modal'));
  document.getElementById('save-filename-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('btn-save-confirm').click();
    if (e.key === 'Escape') hideModal('save-modal');
  });

  // Mailposting event listeners
  const mpConnectBtn = document.getElementById('btn-mp-connect');
  if (mpConnectBtn) mpConnectBtn.addEventListener('click', (e) => (window.CmtWizard && !e.shiftKey) ? mpOpenMailmergeWizard(0) : mpOpenConnectModal());
  const mpInsertFieldBtn = document.getElementById('btn-mp-insert-field');
  if (mpInsertFieldBtn) mpInsertFieldBtn.addEventListener('click', mpOpenFieldPickerModal);
  const mpTogglePrevBtn = document.getElementById('btn-mp-toggle-preview');
  if (mpTogglePrevBtn) mpTogglePrevBtn.addEventListener('click', () => mpTogglePreview());
  const mpBatchExpBtn = document.getElementById('btn-mp-batch-export');
  if (mpBatchExpBtn) mpBatchExpBtn.addEventListener('click', (e) => (window.CmtWizard && !e.shiftKey) ? mpOpenMailmergeWizard(3) : mpOpenExportModal());
  const expBatchMpBtn = document.getElementById('btn-export-batch-mp');
  if (expBatchMpBtn) expBatchMpBtn.addEventListener('click', (e) => (window.CmtWizard && !e.shiftKey) ? mpOpenMailmergeWizard(0) : mpOpenExportModal());
  document.getElementById('mp-connect-close').addEventListener('click', () => hideModal('mp-connect-modal'));
  document.getElementById('btn-mp-connect-cancel').addEventListener('click', () => hideModal('mp-connect-modal'));
  document.getElementById('btn-mp-connect-confirm').addEventListener('click', function () {
    const cid = document.getElementById('mp-class-select').value;
    mpConnectClass(cid);
    hideModal('mp-connect-modal');
  });
  document.getElementById('mp-field-picker-close').addEventListener('click', () => hideModal('mp-field-picker-modal'));
  document.getElementById('btn-mp-field-picker-cancel').addEventListener('click', () => hideModal('mp-field-picker-modal'));
  document.getElementById('mp-export-close').addEventListener('click', () => hideModal('mp-export-modal'));
  document.getElementById('btn-mp-export-cancel').addEventListener('click', () => hideModal('mp-export-modal'));
  document.getElementById('btn-mp-export-confirm').addEventListener('click', mpExecuteBatchExport);
  document.getElementById('mp-nav-student-select').addEventListener('change', function () {
    mpState.previewStudentIndex = parseInt(this.value, 10) || 0;
    renderPreview();
  });


  // PDF export modal
  document.getElementById('btn-pdf-export-same-folder').addEventListener('click', () => closePdfExportModal('same-folder'));
  const toPrintBtn = document.getElementById('btn-pdf-export-to-print');
  if (toPrintBtn) toPrintBtn.addEventListener('click', () => closePdfExportModal('to-print'));
  document.getElementById('btn-pdf-export-picker').addEventListener('click', () => closePdfExportModal('picker'));
  document.getElementById('btn-pdf-export-cancel').addEventListener('click', () => closePdfExportModal(null));
  document.getElementById('pdf-export-modal-close').addEventListener('click', () => closePdfExportModal(null));
  document.getElementById('pdf-export-modal').addEventListener('click', function (e) {
    if (e.target === this) closePdfExportModal(null);
  });
  document.getElementById('pdf-export-modal').addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closePdfExportModal(null);
  });

  // File modal
  document.getElementById('file-modal-close').addEventListener('click', () => hideModal('file-modal'));
  document.getElementById('file-modal').addEventListener('click', function (e) {
    if (e.target === this) hideModal('file-modal');
  });
  document.getElementById('save-modal').addEventListener('click', function (e) {
    if (e.target === this) hideModal('save-modal');
  });

  // Add to syntax snippet & Add to custom CSS modals
  document.getElementById('add-syntax-snippet-close').addEventListener('click', closeAddSyntaxSnippetModal);
  document.getElementById('btn-add-snip-cancel').addEventListener('click', closeAddSyntaxSnippetModal);
  document.getElementById('add-syntax-snippet-modal').addEventListener('click', function (e) {
    if (e.target === this) closeAddSyntaxSnippetModal();
  });
  document.getElementById('btn-add-snip-confirm').addEventListener('click', handleAddSyntaxSnippetConfirm);
  document.getElementById('add-snip-target-type').addEventListener('change', function () {
    populateSyntaxCategoryOptions(this.value);
  });
  document.getElementById('add-snip-enable-autocomplete').addEventListener('change', function () {
    const row = document.getElementById('add-snip-prefix-row');
    if (row) row.style.display = this.checked ? 'flex' : 'none';
  });

  document.getElementById('add-custom-css-close').addEventListener('click', closeAddCustomCssModal);
  document.getElementById('btn-add-css-cancel').addEventListener('click', closeAddCustomCssModal);
  document.getElementById('add-custom-css-modal').addEventListener('click', function (e) {
    if (e.target === this) closeAddCustomCssModal();
  });
  document.getElementById('btn-add-css-confirm').addEventListener('click', handleAddCustomCssConfirm);

  // Mindmap outline modal
  const deMindmapModalEl = document.getElementById('de-mindmap-modal');
  if (deMindmapModalEl) {
    deMindmapModalEl.addEventListener('click', function (e) {
      if (e.target === this) hideModal('de-mindmap-modal');
    });
  }

  // Global keyboard shortcuts
  document.addEventListener('keydown', function (e) {
    const key = String(e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'a') {
      e.preventDefault();
      if (typeof window.deAiOpenPopover === 'function') window.deAiOpenPopover();
      return;
    }
    // Avoid running the same command twice when Monaco already handles it.
    if (mdEditor && typeof mdEditor.hasTextFocus === 'function' && mdEditor.hasTextFocus()) return;
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'l') { e.preventDefault(); openSyntaxHelpModal(); return; }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 's') { e.preventDefault(); saveAll(); return; }
    if ((e.ctrlKey || e.metaKey) && key === 's') { e.preventDefault(); saveDoc(); }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'n') { e.preventDefault(); if (window.Desktop && Desktop.isElectron()) Desktop.openTool('document-editor.html', { newWindow: true }); return; }
    if ((e.ctrlKey || e.metaKey) && key === 'n') { e.preventDefault(); newDoc(); }
    if ((e.ctrlKey || e.metaKey) && key === 'o') { e.preventDefault(); openDocModal(); }
    if (e.key === 'Escape') {
      // 1. Table dropdown popover
      const tableWrap = document.getElementById('table-insert-wrap');
      if (tableWrap && tableWrap.classList.contains('open')) {
        tableWrap.classList.remove('open');
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        return;
      }

      // 2. Book overlay
      const bookOverlay = document.getElementById('de-book-overlay');
      if (bookOverlay && bookOverlay.classList.contains('active')) {
        deBookCloseModal();
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        return;
      }

      // 3. Full preview overlay
      const fullPrev = document.getElementById('full-preview-overlay');
      if (fullPrev && !fullPrev.hasAttribute('hidden')) {
        hideFullPreview();
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        return;
      }

      // 4. Modal stack (LIFO)
      while (_deOpenModalStack.length > 0) {
        const topId = _deOpenModalStack.pop();
        const el = document.getElementById(topId);
        if (el && !el.hasAttribute('hidden') && el.style.display !== 'none') {
          if (topId === 'settings-modal') {
            closeSettingsModal();
          } else if (topId === 'pdf-export-modal') {
            closePdfExportModal(null);
          } else if (topId === 'add-syntax-snippet-modal') {
            closeAddSyntaxSnippetModal();
          } else if (topId === 'add-custom-css-modal') {
            closeAddCustomCssModal();
          } else {
            hideModal(topId);
          }
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          return;
        }
      }

      // 5. Fallback priority checks for any un-stacked modals
      const fallbackModals = [
        'add-syntax-snippet-modal',
        'add-custom-css-modal',
        'mp-field-picker-modal',
        'mp-export-modal',
        'mp-connect-modal',
        'pdf-export-modal',
        'settings-modal',
        'de-mindmap-modal',
        'file-modal',
        'save-modal',
        'history-modal',
        'syntax-help-modal'
      ];
      for (const id of fallbackModals) {
        const el = document.getElementById(id);
        if (el && !el.hasAttribute('hidden') && el.style.display !== 'none') {
          if (id === 'settings-modal') closeSettingsModal();
          else if (id === 'pdf-export-modal') closePdfExportModal(null);
          else if (id === 'add-syntax-snippet-modal') closeAddSyntaxSnippetModal();
          else if (id === 'add-custom-css-modal') closeAddCustomCssModal();
          else hideModal(id);
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          return;
        }
      }
    }
  });

  // Table picker
  document.getElementById('btn-insert-table').addEventListener('click', function (e) {
    e.stopPropagation();
    document.getElementById('table-insert-wrap').classList.toggle('open');
  });

  // Image toolbar button
  document.getElementById('btn-insert-image').addEventListener('click', function () {
    document.getElementById('image-file-input').click();
  });
  document.getElementById('image-file-input').addEventListener('change', function () {
    if (this.files && this.files[0]) {
      embedImageFile(this.files[0]);
      this.value = '';
    }
  });

  initTablePicker();
  initImageDrop();
  initImagePaste();
  initWysiwygListeners();
  deUpdateViewSwitcherState();
  deBookPopulateDropdown();

  if (typeof mpInit === 'function') {
    mpInit();
  }

  updateDocIndicator();
});

// ── Interactive Spotlight Tour ───────────────────────────
function startDeTutorial() {
  if (typeof Tutorial === 'undefined') return;
  var steps = [
    { selector: '#app-nav', title: t('tutDe1Title'), text: t('tutDe1Text') },
    { selector: '#de-tour-btn', title: t('tutDe2Title'), text: t('tutDe2Text') },
    { selector: '#pl-close-btn', title: t('tutDe3Title'), text: t('tutDe3Text') }
  ].filter(function (s) { return s && s.selector && document.querySelector(s.selector); });
  if (!steps.length) return;
  Tutorial.start(steps, {
    next: t('tutNext', 'Next'),
    prev: t('tutPrev', 'Back'),
    skip: t('tutSkip', 'Skip'),
    done: t('tutDone', 'Done')
  });
}
window.startDeTutorial = startDeTutorial;
document.addEventListener('DOMContentLoaded', function () {
  try {
    if (!localStorage.getItem('cmt-tour-seen-document-editor')) {
      localStorage.setItem('cmt-tour-seen-document-editor', '1');
      setTimeout(startDeTutorial, 700);
    }
  } catch (e) {}
});

