/**
 * js/pages/reference-builder-events.js
 * Delegated event wiring for Reference Builder (zero inline HTML handlers).
 */
(function (root) {
  'use strict';

  function _findMod(modId) {
    var ch = root.RbApp._getActiveChapter();
    if (!ch || !Array.isArray(ch.modules)) return null;
    for (var i = 0; i < ch.modules.length; i++) {
      if (ch.modules[i].id === modId) return ch.modules[i];
    }
    return null;
  }

  document.addEventListener('click', async function (ev) {
    var app = root.RbApp;
    if (!app) return;

    // Toggle .nav-group dropdowns on click
    var navGroupBtn = ev.target.closest('.nav-group > .nav-btn');
    if (navGroupBtn) {
      var grp = navGroupBtn.parentElement;
      var wasOpen = grp.classList.contains('is-open');
      document.querySelectorAll('#app-nav .nav-group.is-open').forEach(function (g) { g.classList.remove('is-open'); });
      if (!wasOpen) grp.classList.add('is-open');
      return;
    }
    if (!ev.target.closest('.nav-group')) {
      document.querySelectorAll('#app-nav .nav-group.is-open').forEach(function (g) { g.classList.remove('is-open'); });
    }
    if (!ev.target.closest('#rb-phrase-popover') && !ev.target.closest('[data-rb-phrase-pick]')) {
      app.closePhrasePopover();
    }

    var actionEl = ev.target.closest('[data-rb-action]');
    if (actionEl) {
      document.querySelectorAll('#app-nav .nav-group.is-open').forEach(function (g) { g.classList.remove('is-open'); });
      var act = actionEl.getAttribute('data-rb-action');
      if (act === 'new-subject') app.openSubjectModal('');
      else if (act === 'new-manual') app.openNewManualModal();
      else if (act === 'save-manual') await app.saveCurrentManual(false);
      else if (act === 'open-export-modal') app.openExportModal();
      else if (act === 'preview-mode-html') app.setPreviewMode('html');
      else if (act === 'preview-mode-pdf') app.setPreviewMode('pdf');
      else if (act === 'open-export-preview') await app.openExportPreviewModal();
      else if (act === 'close-export-preview') app.closeAllModals();
      else if (act === 'back-to-export-options') { app.closeAllModals(); app.openExportModal(); }
      else if (act === 'preview-open-external') await app.openPreviewInExternalBrowser();
      else if (act === 'preview-print') app.printExportPreviewIframe();
      else if (act === 'open-type-builder') app.openTypeBuilderModal();
      else if (act === 'open-css-modal') app.openCssModal();
      else if (act === 'add-css-sheet') {
        if (!app.state.activeManual) return;
        app.state.activeManual.customCssList = Array.isArray(app.state.activeManual.customCssList) ? app.state.activeManual.customCssList : [];
        app.state.activeManual.customCssList.push({
          id: root.RbStore.uuid(),
          name: 'Custom Style ' + (app.state.activeManual.customCssList.length + 1),
          enabled: true,
          css: ''
        });
        app.renderCssSheetsList();
        app.schedulePreviewUpdate();
      }
      else if (act === 'show-library') app.showLibraryView();
      else if (act === 'close-modals') app.closeAllModals();
      else if (act === 'start-tour') app.startTour();
      else if (act === 'toggle-preview') {
        app.state.previewVisible = !app.state.previewVisible;
        document.getElementById('rb-editor-view').classList.toggle('preview-hidden', !app.state.previewVisible);
        document.getElementById('rb-preview-pane').classList.toggle('is-hidden', !app.state.previewVisible);
        if (app.state.previewVisible) app.schedulePreviewUpdate();
      } else if (act === 'save-subject') {
        var name = document.getElementById('rb-subj-name').value.trim();
        if (!name) return;
        var desc = document.getElementById('rb-subj-desc').value.trim();
        if (app.state.editingSubjectId) {
          var existing = app._getSubjectById(app.state.editingSubjectId);
          if (existing) {
            existing.name = name;
            existing.description = desc;
            existing.color = app.state.subjColor;
            existing.updatedAt = new Date().toISOString();
          }
        } else {
          app.state.index.subjects.push(root.RbStore.createSubjectObj({ name: name, description: desc, color: app.state.subjColor }));
        }
        await root.RbStore.saveIndex(app.state.index);
        app.closeAllModals();
        app.renderSubjectsSidebar();
        app.renderReferenceCards();
      } else if (act === 'delete-subject') {
        app.state.index.subjects = app.state.index.subjects.filter(function (s) { return s.id !== app.state.editingSubjectId; });
        if (app.state.activeSubjectId === app.state.editingSubjectId) app.state.activeSubjectId = '';
        await root.RbStore.saveIndex(app.state.index);
        app.closeAllModals();
        app.renderSubjectsSidebar();
        app.renderReferenceCards();
      } else if (act === 'create-manual') {
        var title = document.getElementById('rb-new-manual-title').value.trim() || 'Untitled Reference';
        var mObj = root.RbStore.createManualObj({
          subjectId: document.getElementById('rb-new-manual-subject').value,
          title: title,
          level: document.getElementById('rb-new-manual-level').value.trim(),
          year: document.getElementById('rb-new-manual-year').value.trim(),
          subDiscipline: document.getElementById('rb-new-manual-subdisc').value.trim()
        });
        var saved = await root.RbStore.saveManual(mObj, app.state.index);
        app.state.index = saved.index;
        app.closeAllModals();
        await app.openManual(mObj.id);
      } else if (act === 'add-chapter') {
        if (!app.state.activeManual) return;
        var newCh = {
          id: root.RbStore.uuid(),
          title: 'Topic ' + (app.state.activeManual.chapters.length + 1),
          level: app.state.activeManual.level || '',
          year: app.state.activeManual.year || '',
          subDiscipline: app.state.activeManual.subDiscipline || '',
          summary: '',
          modules: []
        };
        app.state.activeManual.chapters.push(newCh);
        app.state.activeChapterId = newCh.id;
        app.renderEditorAll();
      } else if (act === 'add-ctype-field') {
        app.state.ctypeFields.push({ key: 'field_' + app.state.ctypeFields.length, defaultLabel: 'New Field', kind: 'richtext' });
        app.renderCtypeFields();
      } else if (act === 'save-custom-type') {
        var cName = document.getElementById('rb-ctype-name').value.trim();
        if (!cName) return;
        var cObj = root.RbModuleTypes.createCustomTypeObj({
          name: cName,
          color: app.state.ctypeColor,
          fields: app.state.ctypeFields
        });
        app.state.index.customModuleTypes.push(cObj);
        await root.RbStore.saveIndex(app.state.index);
        document.getElementById('rb-ctype-name').value = '';
        app.state.ctypeFields = [{ key: 'body', defaultLabel: 'Content', kind: 'richtext' }];
        app.openTypeBuilderModal();
        if (app.state.activeManual) app.renderEditorAll();
      }
      return;
    }

    var editSubjEl = ev.target.closest('[data-rb-edit-subject]');
    if (editSubjEl) {
      ev.stopPropagation();
      app.openSubjectModal(editSubjEl.getAttribute('data-rb-edit-subject'));
      return;
    }

    var selSubjEl = ev.target.closest('[data-rb-select-subject]');
    if (selSubjEl) {
      app.state.activeSubjectId = selSubjEl.getAttribute('data-rb-select-subject') || '';
      app.renderSubjectsSidebar();
      app.renderReferenceCards();
      return;
    }

    var delManualEl = ev.target.closest('[data-rb-delete-manual]');
    if (delManualEl) {
      ev.stopPropagation();
      var delId = delManualEl.getAttribute('data-rb-delete-manual');
      var ok = typeof root.showConfirm === 'function' ? await root.showConfirm('Delete this reference manual?') : true;
      if (ok) {
        app.state.index = await root.RbStore.deleteManual(delId, app.state.index);
        app.renderSubjectsSidebar();
        app.renderReferenceCards();
      }
      return;
    }

    var openManualEl = ev.target.closest('[data-rb-open-manual]');
    if (openManualEl) {
      await app.openManual(openManualEl.getAttribute('data-rb-open-manual'));
      return;
    }

    var chUpEl = ev.target.closest('[data-rb-ch-up]');
    if (chUpEl) {
      ev.stopPropagation();
      var idxCu = parseInt(chUpEl.getAttribute('data-rb-ch-up'), 10);
      var chsU = app.state.activeManual && app.state.activeManual.chapters;
      if (chsU && idxCu > 0) {
        var tmpCu = chsU[idxCu - 1];
        chsU[idxCu - 1] = chsU[idxCu];
        chsU[idxCu] = tmpCu;
        app.renderOutline();
        app.schedulePreviewUpdate();
      }
      return;
    }

    var chDownEl = ev.target.closest('[data-rb-ch-down]');
    if (chDownEl) {
      ev.stopPropagation();
      var idxCd = parseInt(chDownEl.getAttribute('data-rb-ch-down'), 10);
      var chsD = app.state.activeManual && app.state.activeManual.chapters;
      if (chsD && idxCd < chsD.length - 1) {
        var tmpCd = chsD[idxCd + 1];
        chsD[idxCd + 1] = chsD[idxCd];
        chsD[idxCd] = tmpCd;
        app.renderOutline();
        app.schedulePreviewUpdate();
      }
      return;
    }

    var chDelEl = ev.target.closest('[data-rb-ch-del]');
    if (chDelEl) {
      ev.stopPropagation();
      var idxCdel = parseInt(chDelEl.getAttribute('data-rb-ch-del'), 10);
      var chsDel = app.state.activeManual && app.state.activeManual.chapters;
      if (!chsDel || idxCdel < 0 || idxCdel >= chsDel.length) return;
      if (chsDel.length <= 1) {
        if (typeof root.showToast === 'function') root.showToast('A manual must keep at least one topic.', true);
        return;
      }
      var okCh = typeof root.showConfirm === 'function' ? await root.showConfirm('Delete this topic and all its modules?') : true;
      if (!okCh) return;
      var removed = chsDel.splice(idxCdel, 1)[0];
      if (removed && removed.id === app.state.activeChapterId) {
        var nextCh = chsDel[Math.min(idxCdel, chsDel.length - 1)];
        app.state.activeChapterId = nextCh ? nextCh.id : '';
      }
      app.renderEditorAll();
      return;
    }

    var selChEl = ev.target.closest('[data-rb-select-chapter]');
    if (selChEl) {
      app.state.activeChapterId = selChEl.getAttribute('data-rb-select-chapter');
      app.renderOutline();
      app.renderChapterWorkspace();
      return;
    }

    var addModEl = ev.target.closest('[data-rb-add-module]');
    if (addModEl) {
      if (t.id === 'rb-exp-pagesize' || t.id === 'rb-exp-orientation' || t.id === 'rb-exp-cover' || t.id === 'rb-exp-toc' || t.id === 'rb-exp-anskey' || t.id === 'rb-exp-pagebreak') {
      if (!app.state.activeManual) return;
      app.state.activeManual.exportSettings = app.state.activeManual.exportSettings || {};
      var es = app.state.activeManual.exportSettings;
      if (t.id === 'rb-exp-pagesize') es.pageSize = t.value;
      if (t.id === 'rb-exp-orientation') es.orientation = t.value;
      if (t.id === 'rb-exp-cover') es.showCover = !!t.checked;
      if (t.id === 'rb-exp-toc') es.showToc = !!t.checked;
      if (t.id === 'rb-exp-anskey') es.includeAnswerKey = !!t.checked;
      if (t.id === 'rb-exp-pagebreak') es.pageBreakChapters = !!t.checked;
      app.schedulePreviewUpdate();
      return;
    }

    var ch = app._getActiveChapter();
      if (!ch) return;
      var tId = addModEl.getAttribute('data-rb-add-module');
      var tDef = root.RbModuleTypes.getTypeById(tId, app.state.index.customModuleTypes);
      ch.modules.push({
        id: root.RbStore.uuid(),
        typeId: tDef.id,
        title: tDef.defaultName,
        data: root.RbModuleTypes.createDefaultDataForType(tDef)
      });
      app.renderOutline();
      app.renderChapterWorkspace();
      app.schedulePreviewUpdate();
      return;
    }

    var upEl = ev.target.closest('[data-rb-mod-up]');
    if (upEl) {
      var chU = app._getActiveChapter();
      var idxU = parseInt(upEl.getAttribute('data-rb-mod-up'), 10);
      if (chU && idxU > 0) {
        var tmpU = chU.modules[idxU - 1];
        chU.modules[idxU - 1] = chU.modules[idxU];
        chU.modules[idxU] = tmpU;
        app.renderChapterWorkspace();
        app.schedulePreviewUpdate();
      }
      return;
    }

    var downEl = ev.target.closest('[data-rb-mod-down]');
    if (downEl) {
      var chD = app._getActiveChapter();
      var idxD = parseInt(downEl.getAttribute('data-rb-mod-down'), 10);
      if (chD && idxD < chD.modules.length - 1) {
        var tmpD = chD.modules[idxD + 1];
        chD.modules[idxD + 1] = chD.modules[idxD];
        chD.modules[idxD] = tmpD;
        app.renderChapterWorkspace();
        app.schedulePreviewUpdate();
      }
      return;
    }

    var delModEl = ev.target.closest('[data-rb-mod-del]');
    if (delModEl) {
      var chDel = app._getActiveChapter();
      var idxDel = parseInt(delModEl.getAttribute('data-rb-mod-del'), 10);
      if (chDel) {
        chDel.modules.splice(idxDel, 1);
        app.renderOutline();
        app.renderChapterWorkspace();
        app.schedulePreviewUpdate();
      }
      return;
    }

    var pickColorEl = ev.target.closest('[data-rb-pick-color]');
    if (pickColorEl) {
      var cParts = pickColorEl.getAttribute('data-rb-pick-color').split('|');
      if (cParts[0] === 'subj') app.state.subjColor = cParts[1];
      else app.state.ctypeColor = cParts[1];
      pickColorEl.parentElement.querySelectorAll('.rb-color-swatch').forEach(function (s) { s.classList.remove('is-selected'); });
      pickColorEl.classList.add('is-selected');
      return;
    }

    var delCtypeEl = ev.target.closest('[data-rb-del-ctype]');
    if (delCtypeEl) {
      var cid = delCtypeEl.getAttribute('data-rb-del-ctype');
      app.state.index.customModuleTypes = app.state.index.customModuleTypes.filter(function (c) { return c.id !== cid; });
      await root.RbStore.saveIndex(app.state.index);
      app.openTypeBuilderModal();
      return;
    }

    var delCssEl = ev.target.closest('[data-rb-css-del]');
    if (delCssEl && app.state.activeManual && Array.isArray(app.state.activeManual.customCssList)) {
      app.state.activeManual.customCssList.splice(parseInt(delCssEl.getAttribute('data-rb-css-del'), 10), 1);
      app.renderCssSheetsList();
      app.schedulePreviewUpdate();
      return;
    }

    var expEl = ev.target.closest('[data-rb-export]');
    if (expEl) {
      var fmt = expEl.getAttribute('data-rb-export');
      app.closeAllModals();
      var subj = app._getSubjectById(app.state.activeManual.subjectId);
      await root.RbExporter.exportReference(app.state.activeManual, subj, app.state.index.customModuleTypes, fmt);
      return;
    }

    // List, KV, Table, Media, Quiz, ToolLink item actions
    var listAdd = ev.target.closest('[data-rb-list-add]');
    if (listAdd) {
      var lp = listAdd.getAttribute('data-rb-list-add').split('|');
      var mL = _findMod(lp[0]);
      if (mL) {
        mL.data[lp[1]] = Array.isArray(mL.data[lp[1]]) ? mL.data[lp[1]] : [];
        var lastIt = mL.data[lp[1]][mL.data[lp[1]].length - 1];
        var lastInd = (lastIt && typeof lastIt === 'object' && typeof lastIt.indent === 'number') ? lastIt.indent : 0;
        mL.data[lp[1]].push({ text: '', indent: lastInd });
        app.renderChapterWorkspace();
      }
      return;
    }

    var listIndent = ev.target.closest('[data-rb-list-indent]');
    if (listIndent) {
      var lip = listIndent.getAttribute('data-rb-list-indent').split('|');
      var mLi = _findMod(lip[0]);
      var lii = parseInt(lip[2], 10);
      if (mLi && Array.isArray(mLi.data[lip[1]]) && mLi.data[lip[1]][lii] !== undefined) {
        var curLi = mLi.data[lip[1]][lii];
        var objLi = (typeof curLi === 'object' && curLi !== null) ? curLi : { text: String(curLi || ''), indent: 0 };
        objLi.indent = Math.min(8, (objLi.indent || 0) + 1);
        mLi.data[lip[1]][lii] = objLi;
        app.renderChapterWorkspace();
        app.schedulePreviewUpdate();
      }
      return;
    }

    var listOutdent = ev.target.closest('[data-rb-list-outdent]');
    if (listOutdent) {
      var lop = listOutdent.getAttribute('data-rb-list-outdent').split('|');
      var mLo = _findMod(lop[0]);
      var loi = parseInt(lop[2], 10);
      if (mLo && Array.isArray(mLo.data[lop[1]]) && mLo.data[lop[1]][loi] !== undefined) {
        var curLo = mLo.data[lop[1]][loi];
        var objLo = (typeof curLo === 'object' && curLo !== null) ? curLo : { text: String(curLo || ''), indent: 0 };
        objLo.indent = Math.max(0, (objLo.indent || 0) - 1);
        mLo.data[lop[1]][loi] = objLo;
        app.renderChapterWorkspace();
        app.schedulePreviewUpdate();
      }
      return;
    }

    var listDel = ev.target.closest('[data-rb-list-del]');
    if (listDel) {
      var ldp = listDel.getAttribute('data-rb-list-del').split('|');
      var mLd = _findMod(ldp[0]);
      if (mLd && Array.isArray(mLd.data[ldp[1]])) {
        mLd.data[ldp[1]].splice(parseInt(ldp[2], 10), 1);
        app.renderChapterWorkspace();
        app.schedulePreviewUpdate();
      }
      return;
    }

    var kvAdd = ev.target.closest('[data-rb-kv-add]');
    if (kvAdd) {
      var kvp = kvAdd.getAttribute('data-rb-kv-add').split('|');
      var mKv = _findMod(kvp[0]);
      if (mKv) {
        mKv.data[kvp[1]] = Array.isArray(mKv.data[kvp[1]]) ? mKv.data[kvp[1]] : [];
        mKv.data[kvp[1]].push({ left: '', right: '' });
        app.renderChapterWorkspace();
      }
      return;
    }

    var kvDel = ev.target.closest('[data-rb-kv-del]');
    if (kvDel) {
      var kvdp = kvDel.getAttribute('data-rb-kv-del').split('|');
      var mKvd = _findMod(kvdp[0]);
      if (mKvd && Array.isArray(mKvd.data[kvdp[1]])) {
        mKvd.data[kvdp[1]].splice(parseInt(kvdp[2], 10), 1);
        app.renderChapterWorkspace();
        app.schedulePreviewUpdate();
      }
      return;
    }

    var tblAdd = ev.target.closest('[data-rb-tbl-add]');
    if (tblAdd) {
      var tp = tblAdd.getAttribute('data-rb-tbl-add').split('|');
      var mT = _findMod(tp[0]);
      if (mT && mT.data[tp[1]]) {
        var cols = (mT.data[tp[1]].headers || ['Col 1', 'Col 2']).length;
        mT.data[tp[1]].rows.push(new Array(cols).fill(''));
        app.renderChapterWorkspace();
      }
      return;
    }

    var tblDel = ev.target.closest('[data-rb-tbl-del]');
    if (tblDel) {
      var tdp = tblDel.getAttribute('data-rb-tbl-del').split('|');
      var mTd = _findMod(tdp[0]);
      if (mTd && mTd.data[tdp[1]]) {
        mTd.data[tdp[1]].rows.splice(parseInt(tdp[2], 10), 1);
        app.renderChapterWorkspace();
        app.schedulePreviewUpdate();
      }
      return;
    }

    var mediaPick = ev.target.closest('[data-rb-media-pick]');
    if (mediaPick) {
      var mp = mediaPick.getAttribute('data-rb-media-pick').split('|');
      var mMed = _findMod(mp[0]);
      if (mMed) {
        var picked = await root.RbQuizMedia.pickAndImportMedia(app.state.activeManual.id, mp[2]);
        if (picked) {
          mMed.data[mp[1]] = picked;
          app.renderChapterWorkspace();
          app.schedulePreviewUpdate();
        }
      }
      return;
    }

    var qAdd = ev.target.closest('[data-rb-q-add]');
    if (qAdd) {
      var qp = qAdd.getAttribute('data-rb-q-add').split('|');
      var mQ = _findMod(qp[0]);
      if (mQ) {
        mQ.data[qp[1]] = mQ.data[qp[1]] || { questions: [] };
        mQ.data[qp[1]].questions.push(root.RbQuizMedia.createEmptyQuestion(qp[2]));
        app.renderChapterWorkspace();
        app.schedulePreviewUpdate();
      }
      return;
    }

    var qDel = ev.target.closest('[data-rb-q-del]');
    if (qDel) {
      var qdp = qDel.getAttribute('data-rb-q-del').split('|');
      var mQd = _findMod(qdp[0]);
      if (mQd && mQd.data[qdp[1]]) {
        mQd.data[qdp[1]].questions.splice(parseInt(qdp[2], 10), 1);
        app.renderChapterWorkspace();
        app.schedulePreviewUpdate();
      }
      return;
    }

    var qImp = ev.target.closest('[data-rb-q-import]');
    if (qImp) {
      var qip = qImp.getAttribute('data-rb-q-import').split('|');
      var mQi = _findMod(qip[0]);
      if (mQi) {
        var banks = await root.RbQuizMedia.listCmtQuizBanks();
        if (!banks.length) {
          if (typeof root.showToast === 'function') root.showToast('No quiz banks found in custom-data/quizzes.', true);
          return;
        }
        var chosen = typeof root.showPrompt === 'function'
          ? await root.showPrompt('Enter quiz bank filename (' + banks.slice(0, 6).join(', ') + '):', banks[0])
          : banks[0];
        if (chosen) {
          var importedQs = await root.RbQuizMedia.loadCmtQuizBankQuestions(chosen.trim());
          mQi.data[qip[1]] = mQi.data[qip[1]] || { questions: [] };
          mQi.data[qip[1]].sourceBankFile = chosen.trim();
          Array.prototype.push.apply(mQi.data[qip[1]].questions, importedQs);
          app.renderChapterWorkspace();
          app.schedulePreviewUpdate();
        }
      }
      return;
    }

    var linkPick = ev.target.closest('[data-rb-link-pick]');
    if (linkPick) {
      var lkp = linkPick.getAttribute('data-rb-link-pick').split('|');
      var mLk = _findMod(lkp[0]);
      if (mLk) {
        if (root.TagLinkModal && typeof root.TagLinkModal.open === 'function') {
          root.TagLinkModal.open({
            sourceUrn: 'cmt:reference:' + app.state.activeManual.id + '#' + mLk.id,
            title: mLk.title || app.state.activeManual.title,
            onSelect: function (urn, label) {
              mLk.data[lkp[1]] = Array.isArray(mLk.data[lkp[1]]) ? mLk.data[lkp[1]] : [];
              mLk.data[lkp[1]].push({ urn: urn, label: label || urn });
              app.renderChapterWorkspace();
              app.schedulePreviewUpdate();
            }
          });
        } else {
          var urnInput = typeof root.showPrompt === 'function'
            ? await root.showPrompt('Enter CMT URN (e.g. cmt:quiz:myquiz.json or cmt:doc:lesson.md):', 'cmt:quiz:')
            : '';
          if (urnInput) {
            mLk.data[lkp[1]] = Array.isArray(mLk.data[lkp[1]]) ? mLk.data[lkp[1]] : [];
            mLk.data[lkp[1]].push({ urn: urnInput.trim(), label: urnInput.trim() });
            app.renderChapterWorkspace();
            app.schedulePreviewUpdate();
          }
        }
      }
      return;
    }

    var linkDel = ev.target.closest('[data-rb-link-del]');
    if (linkDel) {
      var lkdp = linkDel.getAttribute('data-rb-link-del').split('|');
      var mLkd = _findMod(lkdp[0]);
      if (mLkd && Array.isArray(mLkd.data[lkdp[1]])) {
        mLkd.data[lkdp[1]].splice(parseInt(lkdp[2], 10), 1);
        app.renderChapterWorkspace();
        app.schedulePreviewUpdate();
      }
      return;
    }

    var phraseSave = ev.target.closest('[data-rb-phrase-save]');
    if (phraseSave) {
      var psp = phraseSave.getAttribute('data-rb-phrase-save').split('|');
      var mPs = _findMod(psp[0]);
      if (mPs && app.state.index) {
        var rawText = '';
        if (psp[2] === 'label') {
          var lblInp = document.querySelector('[data-rb-fov-label="' + psp[0] + '|' + psp[1] + '"]');
          rawText = lblInp ? lblInp.value.trim() : '';
        } else {
          var v = mPs.data ? mPs.data[psp[1]] : '';
          if (typeof v === 'string') rawText = v.trim();
          else if (Array.isArray(v)) rawText = v.filter(Boolean).join('\n');
          else if (v && typeof v === 'object' && v.fileName) rawText = v.fileName;
          if (!rawText && typeof root.showPrompt === 'function') {
            rawText = (await root.showPrompt('Enter phrase to save:', '')) || '';
          }
        }
        if (rawText) {
          app.state.index.savedPhrases = Array.isArray(app.state.index.savedPhrases) ? app.state.index.savedPhrases : [];
          var exists = app.state.index.savedPhrases.some(function (x) { return x && x.text === rawText; });
          if (!exists) {
            app.state.index.savedPhrases.unshift({ id: root.RbStore.uuid(), text: rawText, kind: psp[2], fieldKey: psp[1] });
            await root.RbStore.saveIndex(app.state.index);
          }
          if (typeof root.showToast === 'function') root.showToast('Phrase saved: "' + rawText.slice(0, 40) + '"');
        }
      }
      return;
    }

    var phrasePick = ev.target.closest('[data-rb-phrase-pick]');
    if (phrasePick) {
      var ppp = phrasePick.getAttribute('data-rb-phrase-pick').split('|');
      app.openPhrasePopover(phrasePick, ppp[0], ppp[1], ppp[2]);
      return;
    }

    var phraseApply = ev.target.closest('[data-rb-phrase-apply]');
    if (phraseApply) {
      var pap = phraseApply.getAttribute('data-rb-phrase-apply').split('|');
      var mPa = _findMod(pap[0]);
      var pIdx = parseInt(pap[3], 10);
      var phraseObj = app.state.index && app.state.index.savedPhrases && app.state.index.savedPhrases[pIdx];
      if (mPa && phraseObj) {
        if (pap[2] === 'label') {
          mPa.fieldOverrides = mPa.fieldOverrides || {};
          mPa.fieldOverrides[pap[1]] = mPa.fieldOverrides[pap[1]] || {};
          mPa.fieldOverrides[pap[1]].label = phraseObj.text;
          var lblInput = document.querySelector('[data-rb-fov-label="' + pap[0] + '|' + pap[1] + '"]');
          if (lblInput) lblInput.value = phraseObj.text;
        } else {
          var valInput = document.querySelector('[data-rb-field="' + pap[0] + '|' + pap[1] + '"]');
          if (valInput) {
            var cur = valInput.value || '';
            valInput.value = cur ? (cur + (cur.endsWith('\n') || cur.endsWith(' ') ? '' : ' ') + phraseObj.text) : phraseObj.text;
            mPa.data[pap[1]] = valInput.value;
          } else if (Array.isArray(mPa.data[pap[1]])) {
            mPa.data[pap[1]].push(phraseObj.text);
            app.renderChapterWorkspace();
          } else {
            mPa.data[pap[1]] = phraseObj.text;
          }
        }
        app.schedulePreviewUpdate();
        app.closePhrasePopover();
      }
      return;
    }

    var phraseDel = ev.target.closest('[data-rb-phrase-del]');
    if (phraseDel && app.state.index && Array.isArray(app.state.index.savedPhrases)) {
      app.state.index.savedPhrases.splice(parseInt(phraseDel.getAttribute('data-rb-phrase-del'), 10), 1);
      await root.RbStore.saveIndex(app.state.index);
      app.closePhrasePopover();
      return;
    }

    var openUrn = ev.target.closest('[data-rb-open-urn]');
    if (openUrn) {
      ev.preventDefault();
      var urn = openUrn.getAttribute('data-rb-open-urn');
      if (root.LinksService && typeof root.LinksService.openEntity === 'function') {
        root.LinksService.openEntity(urn);
      }
    }
  });

  // In-place input updates (zero DOM teardowns during typing!)
  document.addEventListener('input', function (ev) {
    var app = root.RbApp;
    if (!app) return;
    var t = ev.target;

    if (t.id === 'rb-search-input' || t.id === 'rb-filter-level' || t.id === 'rb-filter-year' || t.id === 'rb-filter-subdisc') {
      app.renderReferenceCards();
      return;
    }

    if (!app.state.activeManual) return;

    if (t.id === 'rb-manual-title') { app.state.activeManual.title = t.value; app.schedulePreviewUpdate(); return; }
    if (t.id === 'rb-manual-subtitle') { app.state.activeManual.subtitle = t.value; app.schedulePreviewUpdate(); return; }
    if (t.id === 'rb-manual-level') { app.state.activeManual.level = t.value; app.schedulePreviewUpdate(); return; }
    if (t.id === 'rb-manual-year') { app.state.activeManual.year = t.value; app.schedulePreviewUpdate(); return; }
    if (t.id === 'rb-manual-subdisc') { app.state.activeManual.subDiscipline = t.value; app.schedulePreviewUpdate(); return; }
    if (t.id === 'rb-manual-tags') {
      app.state.activeManual.tags = t.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
      app.schedulePreviewUpdate();
      return;
    }

    if (t.id === 'rb-exp-pagesize' || t.id === 'rb-exp-orientation' || t.id === 'rb-exp-cover' || t.id === 'rb-exp-toc' || t.id === 'rb-exp-anskey' || t.id === 'rb-exp-pagebreak') {
      if (!app.state.activeManual) return;
      app.state.activeManual.exportSettings = app.state.activeManual.exportSettings || {};
      var es = app.state.activeManual.exportSettings;
      if (t.id === 'rb-exp-pagesize') es.pageSize = t.value;
      if (t.id === 'rb-exp-orientation') es.orientation = t.value;
      if (t.id === 'rb-exp-cover') es.showCover = !!t.checked;
      if (t.id === 'rb-exp-toc') es.showToc = !!t.checked;
      if (t.id === 'rb-exp-anskey') es.includeAnswerKey = !!t.checked;
      if (t.id === 'rb-exp-pagebreak') es.pageBreakChapters = !!t.checked;
      app.schedulePreviewUpdate();
      return;
    }

    var ch = app._getActiveChapter();
    if (ch) {
      if (t.id === 'rb-chapter-title') { ch.title = t.value; app.schedulePreviewUpdate(); return; }
      if (t.id === 'rb-chapter-prefix') { ch.prefix = t.value; app.schedulePreviewUpdate(); return; }
      if (t.id === 'rb-chapter-level') { ch.level = t.value; app.schedulePreviewUpdate(); return; }
      if (t.id === 'rb-chapter-year') { ch.year = t.value; app.schedulePreviewUpdate(); return; }
      if (t.id === 'rb-chapter-subdisc') { ch.subDiscipline = t.value; app.schedulePreviewUpdate(); return; }
    }

    if (t.id === 'rb-exp-margin' || t.id === 'rb-exp-fontsize') {
      app.state.activeManual.exportSettings = app.state.activeManual.exportSettings || {};
      if (t.id === 'rb-exp-margin') app.state.activeManual.exportSettings.margin = t.value;
      if (t.id === 'rb-exp-fontsize') app.state.activeManual.exportSettings.fontSize = t.value;
      app.schedulePreviewUpdate();
      return;
    }

    if (t.hasAttribute('data-rb-mod-style-badge')) {
      var mSb = _findMod(t.getAttribute('data-rb-mod-style-badge'));
      if (mSb) { mSb.customTypeLabel = t.value; app.schedulePreviewUpdate(); }
      return;
    }
    if (t.hasAttribute('data-rb-mod-style-cls')) {
      var mSc = _findMod(t.getAttribute('data-rb-mod-style-cls'));
      if (mSc) { mSc.customClass = t.value; app.schedulePreviewUpdate(); }
      return;
    }
    if (t.hasAttribute('data-rb-mod-style-color')) {
      var mScol = _findMod(t.getAttribute('data-rb-mod-style-color'));
      if (mScol) { mScol.accentColor = t.value; app.schedulePreviewUpdate(); }
      return;
    }
    if (t.hasAttribute('data-rb-css-name') && app.state.activeManual && app.state.activeManual.customCssList) {
      var cni = parseInt(t.getAttribute('data-rb-css-name'), 10);
      if (app.state.activeManual.customCssList[cni]) app.state.activeManual.customCssList[cni].name = t.value;
      return;
    }
    if (t.hasAttribute('data-rb-css-code') && app.state.activeManual && app.state.activeManual.customCssList) {
      var cci = parseInt(t.getAttribute('data-rb-css-code'), 10);
      if (app.state.activeManual.customCssList[cci]) {
        app.state.activeManual.customCssList[cci].css = t.value;
        app.schedulePreviewUpdate();
      }
      return;
    }

    if (t.hasAttribute('data-rb-fov-label')) {
      var flp = t.getAttribute('data-rb-fov-label').split('|');
      var mFl = _findMod(flp[0]);
      if (mFl) {
        mFl.fieldOverrides = mFl.fieldOverrides || {};
        mFl.fieldOverrides[flp[1]] = mFl.fieldOverrides[flp[1]] || {};
        mFl.fieldOverrides[flp[1]].label = t.value;
        app.schedulePreviewUpdate();
      }
      return;
    }
    if (t.hasAttribute('data-rb-fov-cls')) {
      var fcp = t.getAttribute('data-rb-fov-cls').split('|');
      var mFc = _findMod(fcp[0]);
      if (mFc) {
        mFc.fieldOverrides = mFc.fieldOverrides || {};
        mFc.fieldOverrides[fcp[1]] = mFc.fieldOverrides[fcp[1]] || {};
        mFc.fieldOverrides[fcp[1]].customClass = t.value;
        app.schedulePreviewUpdate();
      }
      return;
    }

    if (t.hasAttribute('data-rb-mod-title')) {
      var mT = _findMod(t.getAttribute('data-rb-mod-title'));
      if (mT) { mT.title = t.value; app.schedulePreviewUpdate(); }
      return;
    }
    if (t.hasAttribute('data-rb-field')) {
      var fp = t.getAttribute('data-rb-field').split('|');
      var mF = _findMod(fp[0]);
      if (mF) { mF.data[fp[1]] = t.value; app.schedulePreviewUpdate(); }
      return;
    }
    if (t.hasAttribute('data-rb-list-item')) {
      var lp = t.getAttribute('data-rb-list-item').split('|');
      var mL = _findMod(lp[0]);
      var liIdx = parseInt(lp[2], 10);
      if (mL && Array.isArray(mL.data[lp[1]])) {
        var prevIt = mL.data[lp[1]][liIdx];
        if (prevIt && typeof prevIt === 'object') prevIt.text = t.value;
        else mL.data[lp[1]][liIdx] = t.value;
        app.schedulePreviewUpdate();
      }
      return;
    }
    if (t.hasAttribute('data-rb-kv')) {
      var kvp = t.getAttribute('data-rb-kv').split('|');
      var mKv = _findMod(kvp[0]);
      if (mKv && Array.isArray(mKv.data[kvp[1]])) {
        mKv.data[kvp[1]][parseInt(kvp[2], 10)][kvp[3]] = t.value;
        app.schedulePreviewUpdate();
      }
      return;
    }
    if (t.hasAttribute('data-rb-tbl-headers')) {
      var thp = t.getAttribute('data-rb-tbl-headers').split('|');
      var mTh = _findMod(thp[0]);
      if (mTh && mTh.data[thp[1]]) {
        mTh.data[thp[1]].headers = t.value.split('|').map(function (s) { return s.trim(); });
        app.schedulePreviewUpdate();
      }
      return;
    }
    if (t.hasAttribute('data-rb-tbl-row')) {
      var trp = t.getAttribute('data-rb-tbl-row').split('|');
      var mTr = _findMod(trp[0]);
      if (mTr && mTr.data[trp[1]]) {
        mTr.data[trp[1]].rows[parseInt(trp[2], 10)] = t.value.split('|').map(function (s) { return s.trim(); });
        app.schedulePreviewUpdate();
      }
      return;
    }
    if (t.hasAttribute('data-rb-media-src')) {
      var mp = t.getAttribute('data-rb-media-src').split('|');
      var mM = _findMod(mp[0]);
      if (mM) {
        mM.data[mp[1]] = mM.data[mp[1]] || {};
        mM.data[mp[1]].src = t.value;
        app.schedulePreviewUpdate();
      }
      return;
    }
    if (t.hasAttribute('data-rb-q-prompt')) {
      var qpp = t.getAttribute('data-rb-q-prompt').split('|');
      var mQp = _findMod(qpp[0]);
      if (mQp && mQp.data[qpp[1]]) { mQp.data[qpp[1]].questions[parseInt(qpp[2], 10)].prompt = t.value; app.schedulePreviewUpdate(); }
      return;
    }
    if (t.hasAttribute('data-rb-q-opt')) {
      var qop = t.getAttribute('data-rb-q-opt').split('|');
      var mQo = _findMod(qop[0]);
      if (mQo && mQo.data[qop[1]]) { mQo.data[qop[1]].questions[parseInt(qop[2], 10)].options[parseInt(qop[3], 10)] = t.value; app.schedulePreviewUpdate(); }
      return;
    }
    if (t.hasAttribute('data-rb-q-anstext')) {
      var qap = t.getAttribute('data-rb-q-anstext').split('|');
      var mQa = _findMod(qap[0]);
      if (mQa && mQa.data[qap[1]]) { mQa.data[qap[1]].questions[parseInt(qap[2], 10)].answerText = t.value; app.schedulePreviewUpdate(); }
      return;
    }
    if (t.hasAttribute('data-rb-q-exp')) {
      var qep = t.getAttribute('data-rb-q-exp').split('|');
      var mQe = _findMod(qep[0]);
      if (mQe && mQe.data[qep[1]]) { mQe.data[qep[1]].questions[parseInt(qep[2], 10)].explanation = t.value; app.schedulePreviewUpdate(); }
      return;
    }
    if (t.hasAttribute('data-rb-ctype-flabel')) {
      var fi = parseInt(t.getAttribute('data-rb-ctype-flabel'), 10);
      if (app.state.ctypeFields[fi]) app.state.ctypeFields[fi].defaultLabel = t.value;
    }
  });

  document.addEventListener('change', function (ev) {
    var app = root.RbApp;
    if (!app) return;
    var t = ev.target;
    if (t.id === 'rb-exp-pagesize' || t.id === 'rb-exp-orientation' || t.id === 'rb-exp-cover' || t.id === 'rb-exp-toc' || t.id === 'rb-exp-anskey' || t.id === 'rb-exp-pagebreak') {
      if (!app.state.activeManual) return;
      app.state.activeManual.exportSettings = app.state.activeManual.exportSettings || {};
      var es = app.state.activeManual.exportSettings;
      if (t.id === 'rb-exp-pagesize') es.pageSize = t.value;
      if (t.id === 'rb-exp-orientation') es.orientation = t.value;
      if (t.id === 'rb-exp-cover') es.showCover = !!t.checked;
      if (t.id === 'rb-exp-toc') es.showToc = !!t.checked;
      if (t.id === 'rb-exp-anskey') es.includeAnswerKey = !!t.checked;
      if (t.id === 'rb-exp-pagebreak') es.pageBreakChapters = !!t.checked;
      app.schedulePreviewUpdate();
      return;
    }

    var ch = app._getActiveChapter();
    if (ch) {
      if (t.id === 'rb-chapter-title-style') { ch.titleStyle = t.value; app.schedulePreviewUpdate(); return; }
      if (t.id === 'rb-chapter-show-num') { ch.showNumber = !!t.checked; app.schedulePreviewUpdate(); return; }
    }
    if (t.hasAttribute('data-rb-mod-style-layout')) {
      var mSl = _findMod(t.getAttribute('data-rb-mod-style-layout'));
      if (mSl) { mSl.layoutStyle = t.value; app.schedulePreviewUpdate(); }
      return;
    }
    if (t.hasAttribute('data-rb-mod-style-showtitle')) {
      var mSt = _findMod(t.getAttribute('data-rb-mod-style-showtitle'));
      if (mSt) { mSt.showTitle = !!t.checked; app.schedulePreviewUpdate(); }
      return;
    }
    if (t.hasAttribute('data-rb-mod-style-showbadge')) {
      var mSbg = _findMod(t.getAttribute('data-rb-mod-style-showbadge'));
      if (mSbg) { mSbg.showTypeBadge = !!t.checked; app.schedulePreviewUpdate(); }
      return;
    }
    if (t.hasAttribute('data-rb-css-toggle') && app.state.activeManual && app.state.activeManual.customCssList) {
      var cti = parseInt(t.getAttribute('data-rb-css-toggle'), 10);
      if (app.state.activeManual.customCssList[cti]) {
        app.state.activeManual.customCssList[cti].enabled = !!t.checked;
        app.schedulePreviewUpdate();
      }
      return;
    }
    if (t.hasAttribute('data-rb-fov-style')) {
      var fsp = t.getAttribute('data-rb-fov-style').split('|');
      var mFs = _findMod(fsp[0]);
      if (mFs) {
        mFs.fieldOverrides = mFs.fieldOverrides || {};
        mFs.fieldOverrides[fsp[1]] = mFs.fieldOverrides[fsp[1]] || {};
        mFs.fieldOverrides[fsp[1]].style = t.value;
        app.schedulePreviewUpdate();
      }
      return;
    }
    if (t.hasAttribute('data-rb-fov-showlbl')) {
      var fslp = t.getAttribute('data-rb-fov-showlbl').split('|');
      var mFsl = _findMod(fslp[0]);
      if (mFsl) {
        mFsl.fieldOverrides = mFsl.fieldOverrides || {};
        mFsl.fieldOverrides[fslp[1]] = mFsl.fieldOverrides[fslp[1]] || {};
        mFsl.fieldOverrides[fslp[1]].showLabel = !!t.checked;
        app.schedulePreviewUpdate();
      }
      return;
    }
    if (t.hasAttribute('data-rb-fov-hide')) {
      var fhp = t.getAttribute('data-rb-fov-hide').split('|');
      var mFh = _findMod(fhp[0]);
      if (mFh) {
        mFh.fieldOverrides = mFh.fieldOverrides || {};
        mFh.fieldOverrides[fhp[1]] = mFh.fieldOverrides[fhp[1]] || {};
        mFh.fieldOverrides[fhp[1]].hidden = !!t.checked;
        app.schedulePreviewUpdate();
      }
      return;
    }
    if (t.hasAttribute('data-rb-q-correct')) {
      var qcp = t.getAttribute('data-rb-q-correct').split('|');
      var mQc = _findMod(qcp[0]);
      if (mQc && mQc.data[qcp[1]]) {
        mQc.data[qcp[1]].questions[parseInt(qcp[2], 10)].correctIndex = parseInt(qcp[3], 10);
        app.schedulePreviewUpdate();
      }
      return;
    }
    if (t.hasAttribute('data-rb-ctype-fkind')) {
      var fi = parseInt(t.getAttribute('data-rb-ctype-fkind'), 10);
      if (app.state.ctypeFields[fi]) app.state.ctypeFields[fi].kind = t.value;
    }
  });

  var _dragChIdx = -1;
  document.addEventListener('dragstart', function (ev) {
    var item = ev.target.closest('[data-rb-ch-idx]');
    if (!item) return;
    _dragChIdx = parseInt(item.getAttribute('data-rb-ch-idx'), 10);
    if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move';
  });
  document.addEventListener('dragover', function (ev) {
    var item = ev.target.closest('[data-rb-ch-idx]');
    if (item && _dragChIdx >= 0) ev.preventDefault();
  });
  document.addEventListener('drop', function (ev) {
    var item = ev.target.closest('[data-rb-ch-idx]');
    if (!item || _dragChIdx < 0) return;
    ev.preventDefault();
    var toIdx = parseInt(item.getAttribute('data-rb-ch-idx'), 10);
    var app = root.RbApp;
    var chs = app && app.state.activeManual && app.state.activeManual.chapters;
    if (chs && _dragChIdx !== toIdx && toIdx >= 0 && toIdx < chs.length) {
      var moved = chs.splice(_dragChIdx, 1)[0];
      chs.splice(toIdx, 0, moved);
      app.renderOutline();
      app.schedulePreviewUpdate();
    }
    _dragChIdx = -1;
  });
  document.addEventListener('dragend', function () { _dragChIdx = -1; });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Tab') {
      var listInp = ev.target && ev.target.hasAttribute && ev.target.hasAttribute('data-rb-list-item') ? ev.target : null;
      if (listInp) {
        ev.preventDefault();
        var lkp = listInp.getAttribute('data-rb-list-item').split('|');
        var mList = _findMod(lkp[0]);
        var idxL = parseInt(lkp[2], 10);
        if (mList && Array.isArray(mList.data[lkp[1]]) && mList.data[lkp[1]][idxL] !== undefined) {
          var curItem = mList.data[lkp[1]][idxL];
          var objItem = (typeof curItem === 'object' && curItem !== null) ? curItem : { text: String(curItem || ''), indent: 0 };
          objItem.indent = ev.shiftKey ? Math.max(0, (objItem.indent || 0) - 1) : Math.min(8, (objItem.indent || 0) + 1);
          mList.data[lkp[1]][idxL] = objItem;
          root.RbApp.renderChapterWorkspace();
          root.RbApp.schedulePreviewUpdate();
          var refocused = document.querySelector('[data-rb-list-item="' + lkp[0] + '|' + lkp[1] + '|' + idxL + '"]');
          if (refocused) refocused.focus();
        }
        return;
      }
      var ta = ev.target && ev.target.tagName === 'TEXTAREA' ? ev.target : null;
      if (ta && (ta.classList.contains('rb-textarea') || ta.classList.contains('rb-css-code'))) {
        ev.preventDefault();
        var start = ta.selectionStart || 0;
        var end = ta.selectionEnd || 0;
        var val = ta.value || '';
        if (ev.shiftKey) {
          var lineStart = val.lastIndexOf('\n', start - 1) + 1;
          var block = val.slice(lineStart, end);
          var outdented = block.replace(/^(  |\t)/gm, '');
          var removedTotal = block.length - outdented.length;
          ta.value = val.slice(0, lineStart) + outdented + val.slice(end);
          ta.selectionStart = Math.max(lineStart, start - (val.slice(lineStart, lineStart + 2) === '  ' || val[lineStart] === '\t' ? (val[lineStart] === '\t' ? 1 : 2) : 0));
          ta.selectionEnd = Math.max(ta.selectionStart, end - removedTotal);
        } else if (start !== end && val.slice(start, end).indexOf('\n') !== -1) {
          var lStart = val.lastIndexOf('\n', start - 1) + 1;
          var selBlock = val.slice(lStart, end);
          var indented = selBlock.replace(/^/gm, '  ');
          var added = indented.length - selBlock.length;
          ta.value = val.slice(0, lStart) + indented + val.slice(end);
          ta.selectionStart = start + 2;
          ta.selectionEnd = end + added;
        } else {
          ta.value = val.slice(0, start) + '  ' + val.slice(end);
          ta.selectionStart = ta.selectionEnd = start + 2;
        }
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
      if (root.RbApp && root.RbApp.state.activeManual) {
        ev.preventDefault();
        root.RbApp.saveCurrentManual(false);
      }
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
