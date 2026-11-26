function deNormalizeRelPath(relativePath) {
  const cleaned = String(relativePath || '')
    .replace(/\\/g, '/')
    .trim()
    .replace(/^\.\//, '')
    .replace(/^\/+|\/+$/g, '');
  return cleaned === '.' ? '' : cleaned;
}

function deJoinRelPath(basePath, childName) {
  const parts = [deNormalizeRelPath(basePath), deNormalizeRelPath(childName)].filter(Boolean);
  return parts.join('/');
}

function deBasename(relativePath) {
  const normalized = deNormalizeRelPath(relativePath);
  if (!normalized) return '';
  const idx = normalized.lastIndexOf('/');
  return idx >= 0 ? normalized.slice(idx + 1) : normalized;
}

function deDirname(relativePath) {
  const normalized = deNormalizeRelPath(relativePath);
  if (!normalized) return '';
  const idx = normalized.lastIndexOf('/');
  return idx >= 0 ? normalized.slice(0, idx) : '';
}

function deNativeSiblingPath(filePath, filename) {
  const source = String(filePath || '').trim();
  const name = String(filename || '').trim();
  if (!source || !name) return '';
  const slashIdx = Math.max(source.lastIndexOf('/'), source.lastIndexOf('\\'));
  if (slashIdx < 0) return name;
  return source.slice(0, slashIdx + 1) + name;
}

function deRelativeFromCurrent(relativePath, currentPath) {
  const target = deNormalizeRelPath(relativePath);
  const current = deNormalizeRelPath(currentPath);
  if (!current) return target;
  if (target === current) return '';
  const prefix = current + '/';
  return target.startsWith(prefix) ? target.slice(prefix.length) : null;
}

function deSplitTargetPath(relativePath) {
  const normalized = deNormalizeRelPath(relativePath);
  return {
    subdir: deDirname(normalized) || null,
    filename: deBasename(normalized)
  };
}

function deDocContainerPathFromBundle(bundlePath) {
  return deDirname(deNormalizeRelPath(bundlePath));
}

function deDocBaseName(filename) {
  return String(filename || '').replace(/\.(md|html)$/i, '');
}

function deDocIsBundledPath(subdir, filename) {
  const normalized = deNormalizeRelPath(subdir || '');
  if (!normalized) return false;
  return deBasename(normalized).toLowerCase() === deDocBaseName(filename).toLowerCase();
}

function deDocTargetContainerFromCurrent(subdir, filename) {
  const normalized = deNormalizeRelPath(subdir || '');
  if (!normalized) return '';
  return deDocIsBundledPath(normalized, filename)
    ? deDirname(normalized)
    : normalized;
}

function deDocFlatRelPath(subdir, filename) {
  return deJoinRelPath(subdir || '', filename || '');
}

function deDocBrowserDisplayName(relativePath) {
  return deBasename(relativePath);
}

function deTemplateBrowserDisplayName(relativePath) {
  return deBasename(relativePath).replace(/\.(md|html)$/i, '');
}

function deStylesheetBrowserDisplayName(relativePath) {
  return deBasename(relativePath);
}

async function deListTargetEntries(target, currentPath, extensions) {
  const result = await Desktop.listByPath(target, currentPath || '', {
    extensions,
    recursive: true,
    includeDirectories: true
  });
  return (result && result.ok && Array.isArray(result.files)) ? result.files : [];
}

function deBuildBundleBrowserEntries(rawEntries, currentPath, extensions, displayNameFn) {
  const folders = new Map();
  const bundleFiles = new Map();
  const directFiles = [];
  const allowedExts = new Set((extensions || []).map(ext => String(ext || '').toLowerCase()));

  rawEntries.forEach(entry => {
    const relativePath = deNormalizeRelPath(entry.relativePath || entry.filename || '');
    const inner = deRelativeFromCurrent(relativePath, currentPath);
    if (!inner) return;
    const parts = inner.split('/').filter(Boolean);
    if (!parts.length) return;

    if (entry.isDirectory) {
      if (parts.length === 1) {
        folders.set(parts[0], {
          kind: 'dir',
          name: parts[0],
          relativePath: deJoinRelPath(currentPath, parts[0])
        });
      }
      return;
    }

    if (parts.length === 1) {
      directFiles.push({
        kind: 'file',
        name: deBasename(relativePath),
        displayName: displayNameFn(relativePath),
        relativePath,
        suggestedName: deBasename(relativePath),
        isBundle: false
      });
      return;
    }

    if (parts.length === 2) {
      const folderName = parts[0];
      const fileName = parts[1];
      const ext = fileName.includes('.') ? ('.' + fileName.split('.').pop().toLowerCase()) : '';
      if (!allowedExts.has(ext)) return;
      if (fileName.toLowerCase() !== (folderName + ext).toLowerCase()) return;
      if (!bundleFiles.has(folderName)) {
        bundleFiles.set(folderName, {
          kind: 'file',
          name: fileName,
          displayName: displayNameFn(relativePath),
          relativePath,
          suggestedName: fileName,
          isBundle: true,
          bundlePath: deJoinRelPath(currentPath, folderName)
        });
      }
    }
  });

  const rows = [];
  folders.forEach((entry, folderName) => {
    if (!bundleFiles.has(folderName)) rows.push(entry);
  });
  bundleFiles.forEach(entry => rows.push(entry));
  directFiles.forEach(entry => rows.push(entry));

  rows.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
    return a.displayName ? a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' })
      : a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  return rows;
}

function deBuildPlainBrowserEntries(rawEntries, currentPath, displayNameFn) {
  const rows = [];
  rawEntries.forEach(entry => {
    const relativePath = deNormalizeRelPath(entry.relativePath || entry.filename || '');
    const inner = deRelativeFromCurrent(relativePath, currentPath);
    if (!inner) return;
    const parts = inner.split('/').filter(Boolean);
    if (!parts.length) return;

    if (entry.isDirectory) {
      if (parts.length === 1) {
        rows.push({ kind: 'dir', name: parts[0], relativePath: deJoinRelPath(currentPath, parts[0]) });
      }
      return;
    }

    if (parts.length === 1) {
      rows.push({
        kind: 'file',
        name: deBasename(relativePath),
        displayName: displayNameFn(relativePath),
        relativePath,
        suggestedName: deBasename(relativePath),
        isBundle: false
      });
    }
  });

  rows.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
    return (a.displayName || a.name).localeCompare((b.displayName || b.name), undefined, { sensitivity: 'base' });
  });

  return rows;
}

async function deRenderFileBrowser() {
  if (!fileBrowserState) return;
  const state = fileBrowserState;
  const body = document.getElementById('file-modal-body');
  const rawEntries = await deListTargetEntries(state.target, state.currentPath, state.extensions);
  state.entries = state.bundleMode
    ? deBuildBundleBrowserEntries(rawEntries, state.currentPath, state.extensions, state.displayNameFn)
    : deBuildPlainBrowserEntries(rawEntries, state.currentPath, state.displayNameFn);

  body.innerHTML = '';

  if (Array.isArray(state.sourceTabs) && state.sourceTabs.length) {
    const tabBar = document.createElement('div');
    tabBar.className = 'file-modal-tabs';
    state.sourceTabs.forEach(tab => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'file-modal-tab' + (tab.active ? ' active' : '') + (tab.isAction ? ' file-modal-tab-action' : '');
      btn.textContent = tab.label;
      btn.onclick = tab.onClick;
      tabBar.appendChild(btn);
    });
    body.appendChild(tabBar);
  }

  const nav = document.createElement('div');
  nav.className = 'file-browser-nav';

  const upBtn = document.createElement('button');
  upBtn.className = 'modal-toolbar-btn';
  upBtn.textContent = t('deFileBrowserUp') || 'Up';
  upBtn.disabled = !state.currentPath;
  upBtn.onclick = async () => {
    if (!state.currentPath) return;
    state.currentPath = deDirname(state.currentPath);
    await deRenderFileBrowser();
  };
  nav.appendChild(upBtn);

  const crumbs = document.createElement('div');
  crumbs.className = 'file-browser-breadcrumbs';
  const rootBtn = document.createElement('button');
  rootBtn.className = 'file-browser-crumb';
  rootBtn.textContent = state.rootLabel || (t('deFileBrowserRoot') || 'Root');
  rootBtn.onclick = async () => {
    state.currentPath = '';
    await deRenderFileBrowser();
  };
  crumbs.appendChild(rootBtn);
  const segments = state.currentPath ? state.currentPath.split('/').filter(Boolean) : [];
  let builtPath = '';
  segments.forEach(segment => {
    const sep = document.createElement('span');
    sep.className = 'file-browser-sep';
    sep.textContent = '›';
    crumbs.appendChild(sep);
    builtPath = deJoinRelPath(builtPath, segment);
    const crumbBtn = document.createElement('button');
    crumbBtn.className = 'file-browser-crumb';
    crumbBtn.textContent = segment;
    crumbBtn.onclick = async () => {
      state.currentPath = builtPath;
      await deRenderFileBrowser();
    };
    crumbs.appendChild(crumbBtn);
  });
  nav.appendChild(crumbs);

  const actions = document.createElement('div');
  actions.className = 'modal-toolbar';
  if (Array.isArray(state.toolbarButtons)) {
    state.toolbarButtons.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'modal-toolbar-btn';
      btn.textContent = item.label;
      btn.onclick = item.onClick;
      actions.appendChild(btn);
    });
  }
  if (state.allowCreateFolder) {
    const folderBtn = document.createElement('button');
    folderBtn.className = 'modal-toolbar-btn';
    folderBtn.textContent = t('deFileBrowserNewFolder') || 'New Folder';
    folderBtn.onclick = async () => {
      state.showNewFolderInput = !state.showNewFolderInput;
      if (!state.showNewFolderInput) state.newFolderName = '';
      await deRenderFileBrowser();
    };
    actions.appendChild(folderBtn);
  }
  if (actions.children.length) nav.appendChild(actions);
  body.appendChild(nav);

  if (state.allowCreateFolder && state.showNewFolderInput) {
    const folderBar = document.createElement('div');
    folderBar.className = 'file-browser-savebar';

    const folderInput = document.createElement('input');
    folderInput.className = 'modal-input';
    folderInput.id = 'file-browser-folder-input';
    folderInput.type = 'text';
    folderInput.autocomplete = 'off';
    folderInput.spellcheck = false;
    folderInput.placeholder = t('deFileBrowserFolderPrompt') || 'Folder name';
    folderInput.value = state.newFolderName || '';
    folderInput.oninput = () => {
      state.newFolderName = folderInput.value;
    };

    const createBtn = document.createElement('button');
    createBtn.className = 'modal-btn';
    createBtn.textContent = t('deFileBrowserCreateFolder') || 'Create';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-btn modal-btn-cancel';
    cancelBtn.textContent = t('btnCancel') || 'Cancel';

    const handleCreateFolder = async () => {
      const folderName = String(folderInput.value || '').trim().replace(/[\\/:*?"<>|]/g, '');
      if (!folderName) {
        showToast(t('deFileBrowserFolderPrompt') || 'Folder name', true);
        folderInput.focus();
        return;
      }
      const folderPath = deJoinRelPath(state.currentPath, folderName);
      const r = await Desktop.createDirectoryByPath(state.target, folderPath);
      if (!r || !r.ok) {
        showToast((t('deFileBrowserFolderCreateError') || 'Could not create folder: ') + ((r && r.error) || ''), true);
        return;
      }
      state.showNewFolderInput = false;
      state.newFolderName = '';
      showToast((t('deFileBrowserFolderCreated') || 'Folder created: ') + folderName);
      await deRenderFileBrowser();
    };

    createBtn.onclick = handleCreateFolder;
    cancelBtn.onclick = async () => {
      state.showNewFolderInput = false;
      state.newFolderName = '';
      await deRenderFileBrowser();
    };
    folderInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleCreateFolder();
      if (e.key === 'Escape') cancelBtn.click();
    });

    folderBar.appendChild(folderInput);
    folderBar.appendChild(createBtn);
    folderBar.appendChild(cancelBtn);
    body.appendChild(folderBar);

    setTimeout(() => {
      folderInput.focus();
      folderInput.select();
    }, 40);
  }

  if (state.mode === 'save') {
    const saveBar = document.createElement('div');
    saveBar.className = 'file-browser-savebar';
    const input = document.createElement('input');
    input.className = 'modal-input';
    input.id = 'file-browser-name-input';
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = state.placeholder || '';
    input.value = state.suggestedName || '';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'modal-btn';
    saveBtn.textContent = state.saveButtonLabel || (t('save') || 'Save');
    const handleSave = async () => {
      if (state.saving) return;
      const typedName = String(input.value || '').trim();
      if (!typedName) {
        showToast(t('deFileBrowserEnterName') || 'Enter a file name.', true);
        input.focus();
        return;
      }
      if (state.confirmOverwrite) {
        const existing = (state.entries || []).find(entry => entry.kind === 'file' && String(entry.suggestedName || '').toLowerCase() === typedName.toLowerCase());
        if (existing && !await showConfirm((t('deFileBrowserOverwriteConfirm') || 'Overwrite "{name}"?').replace('{name}', existing.suggestedName || typedName))) return;
      }
      state.saving = true;
      saveBtn.disabled = true;
      try {
        await state.onSave(typedName, state.currentPath);
      } finally {
        state.saving = false;
        saveBtn.disabled = false;
      }
    };
    saveBtn.onclick = handleSave;
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleSave();
    });
    saveBar.appendChild(input);
    saveBar.appendChild(saveBtn);
    body.appendChild(saveBar);
    setTimeout(() => {
      input.focus();
      input.select();
    }, 40);
  }

  if (!(state.entries || []).length) {
    const empty = document.createElement('div');
    empty.className = 'modal-empty';
    empty.innerHTML = state.emptyText || (t('deFileBrowserFolderEmpty') || 'This folder is empty.');
    body.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'file-list';
  state.entries.forEach(entry => {
    const row = document.createElement('div');
    row.className = 'file-row' + (entry.kind === 'dir' ? ' file-row-dir' : '');

    const info = document.createElement('div');
    info.className = 'file-row-info';
    info.style.cursor = 'pointer';
    info.innerHTML = '<span class="file-row-name">' + escHtml(entry.displayName || entry.name) + '</span>';
    info.onclick = async () => {
      if (entry.kind === 'dir') {
        state.currentPath = entry.relativePath;
        await deRenderFileBrowser();
        return;
      }
      if (state.mode === 'save') {
        const input = document.getElementById('file-browser-name-input');
        if (input) {
          input.value = entry.suggestedName || entry.name;
          input.focus();
          input.select();
        }
      } else {
        await state.onOpen(entry.relativePath, entry);
      }
    };
    row.appendChild(info);

    const actionBtn = document.createElement('button');
    actionBtn.className = 'file-row-btn' + (state.mode === 'save' ? ' file-row-btn-outline' : '');
    actionBtn.textContent = entry.kind === 'dir'
      ? (t('deFileBrowserOpenFolder') || 'Open')
      : (state.mode === 'save' ? (t('deFileBrowserSelectName') || 'Select') : (state.openButtonLabel || (t('deFileBrowserOpen') || 'Open')));
    actionBtn.onclick = info.onclick;
    row.appendChild(actionBtn);

    if (entry.kind === 'file' && state.mode !== 'save') {
      const newWinBtn = document.createElement('button');
      newWinBtn.className = 'file-row-btn file-row-btn-outline';
      newWinBtn.title = t('deOpenInNewWindow') || 'Open in New Window';
      newWinBtn.innerHTML = '<img src="../assets/icons/document-editor.svg" class="btn-icon" alt="" style="width:12px;height:12px;vertical-align:-1px;margin-right:4px;" />' + (t('deOpenInNewWindowShort') || 'New Window');
      newWinBtn.onclick = async (e) => {
        e.stopPropagation();
        if (window.Desktop && Desktop.isElectron()) {
          Desktop.openTool('document-editor.html', {
            newWindow: true,
            query: { editTarget: state.target || 'docEditorDocs', editRelPath: entry.relativePath }
          });
          hideModal('file-modal');
        }
      };
      row.appendChild(newWinBtn);
    }

    if (entry.kind === 'file' || (entry.kind === 'dir' && state.allowDeleteFolders)) {
      const delBtn = document.createElement('button');
      delBtn.className = 'file-row-btn file-row-btn-del';
      delBtn.textContent = t('deFileBrowserDelete') || 'Del';
      delBtn.onclick = async () => {
        const label = entry.displayName || entry.name;
        const confirmText = entry.kind === 'dir'
          ? (t('deFileBrowserDeleteFolderConfirm') || 'Delete folder "{name}"?').replace('{name}', label)
          : (t('deFileBrowserDeleteFileConfirm') || 'Delete "{name}"?').replace('{name}', label);
        if (!await showConfirm(confirmText)) return;
        await state.onDelete(entry);
        await deRenderFileBrowser();
      };
      row.appendChild(delBtn);
    }

    list.appendChild(row);
  });
  body.appendChild(list);
}

async function deOpenFileBrowser(config) {
  fileBrowserState = Object.assign({
    currentPath: '',
    toolbarButtons: [],
    allowCreateFolder: true,
    allowDeleteFolders: false,
    confirmOverwrite: false,
    bundleMode: false,
    rootLabel: t('deFileBrowserRoot') || 'Root'
  }, config || {});
  fileBrowserState.currentPath = deNormalizeRelPath(fileBrowserState.currentPath);
  document.getElementById('file-modal-title').textContent = fileBrowserState.title || 'Files';
  await deRenderFileBrowser();
  showModal('file-modal');
}

async function refreshDocList() {
  if (!window.Desktop || !Desktop.isElectron()) return [];
  try {
    const r = await Desktop.listByPath('docEditorDocs', '', { extensions: ['.md', '.html', '.typ'] });
    if (!r || !r.ok || !Array.isArray(r.files)) return [];
    return r.files.filter(f => {
      const rp = f.relativePath || '';
      if (rp.startsWith('history/')) return false;
      const parts = rp.split('/');
      if (parts.length === 1) return true; // flat doc
      if (parts.length === 2) return parts[1] === parts[0] + '.md' || parts[1] === parts[0] + '.html' || parts[1] === parts[0] + '.typ'; // my-doc/my-doc.* only
      return false;
    });
  } catch (e) { return []; }
}

function deBuildFileModalTabs(activeTab, mode) {
  if (mode === 'save') {
    return [
      { label: t('deFileTabDocs') || 'Documents', active: activeTab === 'docs', onClick: () => { if (activeTab !== 'docs') saveDocAs(); } },
      { label: t('deFileTabTemplates') || 'Templates', active: activeTab === 'templates', onClick: () => { if (activeTab !== 'templates') saveAsTemplate(); } },
      { label: t('deFileTabSaveToDisk') || 'Save to Disk…', isAction: true, onClick: () => { hideModal('file-modal'); saveDocToFolder(); } }
    ];
  }
  return [
    { label: t('deFileTabDocs') || 'Documents', active: activeTab === 'docs', onClick: () => { if (activeTab !== 'docs') openDocModal(); } },
    { label: t('deFileTabTemplates') || 'Templates', active: activeTab === 'templates', onClick: () => { if (activeTab !== 'templates') openTemplateModal(); } },
    { label: t('deFileTabBrowseDisk') || 'Browse Disk…', isAction: true, onClick: () => { hideModal('file-modal'); openFromDisk(); } }
  ];
}

async function openDocModal() {
  fileModalMode = 'open-doc';
  await deOpenFileBrowser({
    title: t('skmDeOpen') || 'Open document',
    target: 'docEditorDocs',
    currentPath: currentDocSubdir || '',
    extensions: ['.md', '.html', '.typ'],
    bundleMode: false,
    displayNameFn: deDocBrowserDisplayName,
    rootLabel: t('deFileBrowserDocumentsRoot') || 'Documents',
    openButtonLabel: t('deFileBrowserOpen') || 'Open',
    sourceTabs: deBuildFileModalTabs('docs', 'open'),
    emptyText: '<div>' + (t('deFileBrowserNoDocuments') || 'No saved documents yet.') + '<br>' + (t('deFileBrowserUseSaveHint') || 'Use Save to create one.') + '</div>',
    onOpen: async relativePath => {
      await loadDoc(relativePath);
    },
    onDelete: async entry => {
      await Desktop.deleteByPath('docEditorDocs', entry.relativePath).catch(() => { });
      await deDeleteLegacyManagedArtifacts(entry.name || deBasename(entry.relativePath), deDirname(entry.relativePath) || null);
    }
  });
}

async function openFromDisk() {
  if (!window.Desktop || !Desktop.isElectron()) {
    showToast(t('deOpenFromDiskNoElectron') || 'File import requires the desktop app.', true);
    return;
  }
  const r = await Desktop.pickAndReadFile([
    { name: t('deDocFilterName') || 'Documents & Spreadsheets', extensions: ['typ', 'html', 'md', 'txt', 'odt', 'ods', 'xlsx', 'csv'] },
    { name: t('deAllFilesFilter') || 'All Files', extensions: ['*'] }
  ]);
  if (!r || r.canceled) return;
  if (!r.ok) {
    showToast((t('deOpenFromDiskError') || 'Could not read file: ') + (r.error || ''), true);
    return;
  }
  const diskPath = r.path || r.filePath;
  if (diskPath && window.Desktop && Desktop.isElectron() && typeof Desktop.checkFileOpen === 'function') {
    try {
      const check = await Desktop.checkFileOpen({
        pageFile: 'document-editor.html',
        diskPath: diskPath
      });
      if (check && check.isOpen) {
        const msg = (window.t && t('deFileAlreadyOpenToast'))
          ? t('deFileAlreadyOpenToast')
          : 'This document is already open in another window.';
        showToast(msg);
        return;
      }
    } catch (_) {}
  }
  const ext = (r.name.split('.').pop() || '').toLowerCase();
  if (ext === 'odt') {
    showToast(t('deOpeningOdt') || 'Loading and converting ODT document…');
    const odtData = await Desktop.readOdtFile(r.path);
    if (!odtData || !odtData.ok) {
      showToast('Could not open ODT: ' + ((odtData && odtData.error) || 'unknown error'), true);
      return;
    }
    mdEditor.setValue(odtData.markdown || '');
    currentDocName = r.name;
    currentDocSubdir = null;
    currentEditTarget = null;
    currentEditRelPath = null;
    currentDocStoredInDocs = false;
    currentOpenedDiskPath = r.path || null;
    currentDocType = 'md';
    docModified = false;
    updateDocIndicator();
    const typeBtn = document.getElementById('btn-doc-type');
    if (typeBtn) {
      typeBtn.textContent = 'ODT';
      typeBtn.classList.remove('html-mode', 'typ-mode');
    }
    if (mdEditor) monaco.editor.setModelLanguage(mdEditor.getModel(), 'markdown');
    deUpdateViewSwitcherState();
    currentDocMeta = {};
    if (odtData.layout) {
      if (odtData.layout.size) pageLayout.size = odtData.layout.size;
      if (odtData.layout.orientation) pageLayout.orientation = odtData.layout.orientation;
      if (odtData.layout.margins) pageLayout.margins = Object.assign({}, pageLayout.margins, odtData.layout.margins);
      if (odtData.layout.fontFamily) pageLayout.fontFamily = odtData.layout.fontFamily;
      if (odtData.layout.fontSize) pageLayout.fontSize = odtData.layout.fontSize;
      syncPopupToState && syncPopupToState();
      applyPageLayoutToPreview && applyPageLayoutToPreview();
    }
    renderPreview();
    showToast(t('deOdtLoadedNotice') || 'ODT loaded. Edits can be saved directly back to .odt.');
    return;
  }
  const diskDocType = ext === 'typ' ? 'typ' : (ext === 'html' ? 'html' : 'md');
  const inlineState = deExtractStyleBlocks(r.content || '');
  mdEditor.setValue(inlineState.content || '');
  currentDocName = r.name;
  currentDocSubdir = null;
  currentEditTarget = null;
  currentEditRelPath = null;
  currentDocStoredInDocs = false;
  currentOpenedDiskPath = r.path || null;
  currentDocType = diskDocType;
  docModified = true;
  updateDocIndicator();
  const typeBtn = document.getElementById('btn-doc-type');
  if (typeBtn) {
    typeBtn.textContent = currentDocType.toUpperCase();
    typeBtn.classList.toggle('html-mode', currentDocType === 'html');
    typeBtn.classList.toggle('typ-mode', currentDocType === 'typ');
  }
  if (mdEditor) monaco.editor.setModelLanguage(mdEditor.getModel(), currentDocType === 'html' ? 'html' : (currentDocType === 'typ' ? 'typst' : 'markdown'));
  deUpdateViewSwitcherState();
  currentDocMeta = {};
  deApplyManagedDocState(inlineState.cssText || '', null);
  syncPopupToState && syncPopupToState();
  applyPageLayoutToPreview && applyPageLayoutToPreview();
  renderPreview();
  showToast((t('deOpenFromDiskSuccess') || 'Opened — save to store a copy in Documents.').replace('{name}', r.name));
}

async function saveDocToFolder() {
  if (!window.Desktop || !Desktop.isElectron()) {
    showToast(t('deSaveToFolderNoElectron') || 'File export requires the desktop app.', true);
    return;
  }

  const content = deBuildPersistedCurrentDocContent();
  const suggestedBase = (currentDocName || 'document').replace(/\.(md|html)$/i, '');
  const suggestedName = suggestedBase + '.' + currentDocType;

  const r = await Desktop.saveToDisk({
    title: t('deSaveToFolderDialogTitle') || 'Save document to folder',
    defaultPath: suggestedName,
    filters: [
      { name: t('deSaveToFolderFilterName') || 'Documents', extensions: ['typ', 'md', 'html'] },
      { name: t('deAllFilesFilter') || 'All Files', extensions: ['*'] }
    ],
    content,
    encoding: 'utf8'
  });

  if (!r || r.canceled) return;
  if (!r.ok) {
    showToast((t('deSaveToFolderError') || 'Could not save file: ') + (r.error || ''), true);
    return;
  }
  showToast((t('deSaveToFolderSuccess') || 'Saved to folder: ') + (r.name || suggestedName));
  if (window.showExportSuccessPopup && r.path) {
    showExportSuccessPopup(r.path, r.name || suggestedName);
  }
}

async function loadDoc(relativePath) {
  if (!window.Desktop || !Desktop.isElectron()) return;
  try {
    let normRel = String(relativePath || '').replace(/\\/g, '/').trim().replace(/^\/+/, '');
    if (normRel.startsWith('docEditorDocs/')) normRel = normRel.slice('docEditorDocs/'.length);
    else if (normRel.startsWith('user/document-editor/docs/')) normRel = normRel.slice('user/document-editor/docs/'.length);
    else if (normRel.startsWith('document-editor/docs/')) normRel = normRel.slice('document-editor/docs/'.length);
    else if (normRel.startsWith('doceditor/')) normRel = normRel.slice('doceditor/'.length);

    if (window.Desktop && Desktop.isElectron() && typeof Desktop.checkFileOpen === 'function') {
      try {
        const check = await Desktop.checkFileOpen({
          pageFile: 'document-editor.html',
          target: 'docEditorDocs',
          relativePath: normRel
        });
        if (check && check.isOpen) {
          const msg = (window.t && t('deFileAlreadyOpenToast'))
            ? t('deFileAlreadyOpenToast')
            : 'This document is already open in another window.';
          showToast(msg);
          hideModal('file-modal');
          return;
        }
      } catch (_) {}
    }

    const r = await Desktop.readByPath('docEditorDocs', normRel);
    if (r && r.ok) {
      const inlineState = deExtractStyleBlocks(r.content || '');
      const legacy = await deLoadLegacyManagedDocState(normRel);
      const mergedCss = deMergeCssText(inlineState.cssText, legacy.cssText);
      mdEditor.setValue(inlineState.content || '');
      currentDocName = deBasename(normRel);
      currentDocSubdir = deDirname(normRel) || null;
      currentDocStoredInDocs = true;
      currentEditTarget = 'docEditorDocs';
      currentEditRelPath = normRel;
      currentOpenedDiskPath = null;
      const lowerRel = normRel.toLowerCase();
      currentDocType = lowerRel.endsWith('.typ') ? 'typ' : (lowerRel.endsWith('.html') ? 'html' : 'md');
      docModified = false;
      _initialLoadDone = true;
      updateDocIndicator();
      const typeBtn = document.getElementById('btn-doc-type');
      if (typeBtn) {
        typeBtn.textContent = currentDocType.toUpperCase();
        typeBtn.classList.toggle('html-mode', currentDocType === 'html');
        typeBtn.classList.toggle('typ-mode', currentDocType === 'typ');
      }
      if (mdEditor) monaco.editor.setModelLanguage(mdEditor.getModel(), currentDocType === 'html' ? 'html' : (currentDocType === 'typ' ? 'typst' : 'markdown'));
      deUpdateViewSwitcherState();
      hideModal('file-modal');
      currentDocMeta = {};
      deApplyManagedDocState(mergedCss, legacy.pageLayout);
      syncPopupToState();
      applyPageLayoutToPreview();
      renderPreview();
    } else {
      showToast('Could not open document: ' + ((r && r.error) || normRel), true);
    }
  } catch (e) { showToast('Could not load: ' + e.message, true); }
}

function deScrollToSection(section) {
  if (!section || !mdEditor) return;
  try {
    const model = mdEditor.getModel();
    if (!model) return;
    const cleanSec = decodeURIComponent(String(section)).toLowerCase().replace(/^#+/, '').trim();
    if (!cleanSec) return;
    const lineCount = model.getLineCount();
    for (let i = 1; i <= lineCount; i++) {
      const line = model.getLineContent(i).toLowerCase();
      if (line.includes(cleanSec)) {
        mdEditor.revealLineInCenter(i);
        mdEditor.setPosition({ lineNumber: i, column: 1 });
        mdEditor.focus();
        break;
      }
    }
  } catch (_) {}
}

async function openFromQueryParams(forcedParams) {
  const params = forcedParams || _initialSearchParams || new URLSearchParams(window.location.search);
  let target = params.get('editTarget') || params.get('target');
  let relPath = params.get('editRelPath') || params.get('relPath') || params.get('file');
  const absPath = params.get('editAbsPath') || params.get('editFile') || params.get('absPath');
  const section = params.get('section') || params.get('anchor');

  if (params.get('importPending') === 'draft') {
    try {
      const draftStr = sessionStorage.getItem('cmt_doc_editor_draft');
      if (draftStr) {
        sessionStorage.removeItem('cmt_doc_editor_draft');
        const draft = JSON.parse(draftStr);
        if (draft && draft.content) {
          const inlineState = deExtractStyleBlocks(draft.content || '');
          mdEditor.setValue(inlineState.content || '');
          currentDocName = draft.filename || 'export.html';
          currentDocSubdir = null;
          currentEditTarget = null;
          currentEditRelPath = null;
          currentDocStoredInDocs = false;
          currentOpenedDiskPath = null;
          const lower = currentDocName.toLowerCase();
          currentDocType = lower.endsWith('.typ') ? 'typ' : (lower.endsWith('.html') ? 'html' : 'md');
          docModified = false;
          _initialLoadDone = true;
          updateDocIndicator();
          const typeBtn = document.getElementById('btn-doc-type');
          if (typeBtn) {
            typeBtn.textContent = currentDocType.toUpperCase();
            typeBtn.classList.toggle('html-mode', currentDocType === 'html');
            typeBtn.classList.toggle('typ-mode', currentDocType === 'typ');
          }
          if (mdEditor) monaco.editor.setModelLanguage(mdEditor.getModel(), currentDocType === 'html' ? 'html' : (currentDocType === 'typ' ? 'typst' : 'markdown'));
          deUpdateViewSwitcherState();
          currentDocMeta = {};
          deApplyManagedDocState(inlineState.cssText || '', null);
          syncPopupToState && syncPopupToState();
          applyPageLayoutToPreview && applyPageLayoutToPreview();
          renderPreview();
          if (section) deScrollToSection(section);
          return;
        }
      }
    } catch (e) {}
  }

  if (target || relPath) {
    if (!target) target = 'docEditorDocs';
    let normRel = String(relPath || '').replace(/\\/g, '/').trim().replace(/^\/+/, '');
    if (target === 'docEditorDocs') {
      if (normRel.startsWith('docEditorDocs/')) normRel = normRel.slice('docEditorDocs/'.length);
      else if (normRel.startsWith('user/document-editor/docs/')) normRel = normRel.slice('user/document-editor/docs/'.length);
      else if (normRel.startsWith('document-editor/docs/')) normRel = normRel.slice('document-editor/docs/'.length);
      else if (normRel.startsWith('doceditor/')) normRel = normRel.slice('doceditor/'.length);
      await loadDoc(normRel);
    } else if (target === 'user' && (normRel.startsWith('document-editor/docs/') || normRel.startsWith('doceditor/'))) {
      if (normRel.startsWith('document-editor/docs/')) normRel = normRel.slice('document-editor/docs/'.length);
      else normRel = normRel.slice('doceditor/'.length);
      await loadDoc(normRel);
    } else {
      await loadExternalDoc(target, normRel);
    }
  } else if (absPath) {
    await loadExternalDocByAbsPath(absPath);
  } else {
    // Fallback: restore last open document on reload
    try {
      const rawLast = localStorage.getItem('cmt-doceditor-last-open');
      if (rawLast) {
        const last = JSON.parse(rawLast);
        let isAlreadyOpen = false;
        if (window.Desktop && Desktop.isElectron() && typeof Desktop.checkFileOpen === 'function') {
          try {
            const check = await Desktop.checkFileOpen({
              pageFile: 'document-editor.html',
              diskPath: last.diskPath,
              target: last.target,
              relativePath: last.relPath || last.name
            });
            if (check && check.isOpen) isAlreadyOpen = true;
          } catch (_) {}
        }
        if (!isAlreadyOpen) {
          if (last && last.diskPath) {
            await loadExternalDocByAbsPath(last.diskPath);
          } else if (last && last.target && last.relPath) {
            if (last.target === 'docEditorDocs') {
              await loadDoc(last.relPath);
            } else {
              await loadExternalDoc(last.target, last.relPath);
            }
          } else if (last && last.name) {
            await loadDoc(last.name);
          }
        }
      }
    } catch (_) {}
  }

  _initialLoadDone = true;
  if (section) {
    setTimeout(() => deScrollToSection(section), 250);
  }
  updateDeDocLinksBadge();
}

async function loadExternalDocByAbsPath(absPath) {
  if (!window.Desktop || !Desktop.isElectron()) return;
  if (typeof Desktop.checkFileOpen === 'function') {
    try {
      const check = await Desktop.checkFileOpen({
        pageFile: 'document-editor.html',
        diskPath: absPath
      });
      if (check && check.isOpen) {
        const msg = (window.t && t('deFileAlreadyOpenToast'))
          ? t('deFileAlreadyOpenToast')
          : 'This document is already open in another window.';
        showToast(msg);
        return;
      }
    } catch (_) {}
  }
  try {
    if (String(absPath).toLowerCase().endsWith('.odt')) {
      const odtData = await Desktop.readOdtFile(absPath);
      if (odtData && odtData.ok) {
        mdEditor.setValue(odtData.markdown || '');
        const filename = odtData.name || String(absPath).split(/[\\/]/).pop();
        currentDocName = filename;
        currentDocSubdir = null;
        currentEditTarget = null;
        currentEditRelPath = null;
        currentDocStoredInDocs = false;
        currentOpenedDiskPath = absPath;
        currentDocType = 'md';
        docModified = false;
        updateDocIndicator();
        const typeBtn2 = document.getElementById('btn-doc-type');
        if (typeBtn2) {
          typeBtn2.textContent = 'ODT';
          typeBtn2.classList.remove('html-mode', 'typ-mode');
        }
        if (mdEditor) monaco.editor.setModelLanguage(mdEditor.getModel(), 'markdown');
        deUpdateViewSwitcherState();
        currentDocMeta = {};
        if (odtData.layout) {
          if (odtData.layout.size) pageLayout.size = odtData.layout.size;
          if (odtData.layout.orientation) pageLayout.orientation = odtData.layout.orientation;
          if (odtData.layout.margins) pageLayout.margins = Object.assign({}, pageLayout.margins, odtData.layout.margins);
          if (odtData.layout.fontFamily) pageLayout.fontFamily = odtData.layout.fontFamily;
          if (odtData.layout.fontSize) pageLayout.fontSize = odtData.layout.fontSize;
          syncPopupToState && syncPopupToState();
          applyPageLayoutToPreview && applyPageLayoutToPreview();
        }
        renderPreview();
        return;
      }
    }
    const r = await Desktop.readDiskFile(absPath);
    if (r && r.ok) {
      const inlineState = deExtractStyleBlocks(r.content || '');
      mdEditor.setValue(inlineState.content || '');
      const filename = r.name || String(absPath).split(/[\\/]/).pop();
      currentDocName = filename;
      currentDocSubdir = null;
      currentEditTarget = null;
      currentEditRelPath = null;
      currentDocStoredInDocs = false;
      currentOpenedDiskPath = absPath;
      const lower = filename.toLowerCase();
      currentDocType = lower.endsWith('.typ') ? 'typ' : (lower.endsWith('.html') ? 'html' : 'md');
      docModified = false;
      updateDocIndicator();
      const typeBtn2 = document.getElementById('btn-doc-type');
      if (typeBtn2) {
        typeBtn2.textContent = currentDocType.toUpperCase();
        typeBtn2.classList.toggle('html-mode', currentDocType === 'html');
        typeBtn2.classList.toggle('typ-mode', currentDocType === 'typ');
      }
      if (mdEditor) monaco.editor.setModelLanguage(mdEditor.getModel(), currentDocType === 'html' ? 'html' : (currentDocType === 'typ' ? 'typst' : 'markdown'));
      deUpdateViewSwitcherState();
      currentDocMeta = {};
      deApplyManagedDocState(inlineState.cssText || '', null);
      syncPopupToState && syncPopupToState();
      applyPageLayoutToPreview && applyPageLayoutToPreview();
      renderPreview();
    } else {
      showToast('Could not open file: ' + ((r && r.error) || absPath), true);
    }
  } catch (e) {
    showToast('Could not load: ' + e.message, true);
  }
}

async function loadExternalDoc(target, relPath) {
  if (!window.Desktop || !Desktop.isElectron()) return;
  try {
    let normRel = String(relPath || '').replace(/\\/g, '/').trim().replace(/^\/+/, '');
    let effectiveTarget = target;
    if (effectiveTarget === 'docEditorDocs' && normRel.startsWith('docEditorDocs/')) {
      normRel = normRel.slice('docEditorDocs/'.length);
    } else if (effectiveTarget === 'user' && normRel.startsWith('document-editor/docs/')) {
      effectiveTarget = 'docEditorDocs';
      normRel = normRel.slice('document-editor/docs/'.length);
    } else if (effectiveTarget === 'user' && normRel.startsWith('doceditor/')) {
      effectiveTarget = 'docEditorDocs';
      normRel = normRel.slice('doceditor/'.length);
    }

    if (window.Desktop && Desktop.isElectron() && typeof Desktop.checkFileOpen === 'function') {
      try {
        const check = await Desktop.checkFileOpen({
          pageFile: 'document-editor.html',
          target: effectiveTarget,
          relativePath: normRel
        });
        if (check && check.isOpen) {
          const msg = (window.t && t('deFileAlreadyOpenToast'))
            ? t('deFileAlreadyOpenToast')
            : 'This document is already open in another window.';
          showToast(msg);
          return;
        }
      } catch (_) {}
    }

    const r = await Desktop.readByPath(effectiveTarget, normRel);
    if (r && r.ok) {
      const inlineState = deExtractStyleBlocks(r.content || '');
      mdEditor.setValue(inlineState.content || '');
      const lastSlash = normRel.lastIndexOf('/');
      currentDocName = lastSlash >= 0 ? normRel.slice(lastSlash + 1) : normRel;
      currentDocSubdir = lastSlash >= 0 ? normRel.slice(0, lastSlash) : null;
      currentEditTarget = effectiveTarget;
      currentEditRelPath = normRel;
      currentDocStoredInDocs = (effectiveTarget === 'docEditorDocs');
      currentOpenedDiskPath = null;
      const lowerRel = normRel.toLowerCase();
      currentDocType = lowerRel.endsWith('.typ') ? 'typ' : (lowerRel.endsWith('.html') ? 'html' : 'md');
      docModified = false;
      _initialLoadDone = true;
      updateDocIndicator();
      const typeBtn2 = document.getElementById('btn-doc-type');
      if (typeBtn2) {
        typeBtn2.textContent = currentDocType.toUpperCase();
        typeBtn2.classList.toggle('html-mode', currentDocType === 'html');
        typeBtn2.classList.toggle('typ-mode', currentDocType === 'typ');
      }
      if (mdEditor) monaco.editor.setModelLanguage(mdEditor.getModel(), currentDocType === 'html' ? 'html' : (currentDocType === 'typ' ? 'typst' : 'markdown'));
      deUpdateViewSwitcherState();
      currentDocMeta = {};
      deApplyManagedDocState(inlineState.cssText || '', null);
      syncPopupToState();
      applyPageLayoutToPreview();
      renderPreview();
    } else {
      showToast('Could not open file from ' + effectiveTarget + ': ' + normRel, true);
    }
  } catch (e) { showToast('Could not load: ' + e.message, true); }
}

async function saveExternalDoc() {
  if (docSaveInProgress) return;
  docSaveInProgress = true;
  const content = deBuildPersistedCurrentDocContent();
  const relPath = currentEditRelPath;
  const lastSlash = relPath.lastIndexOf('/');
  const filename = lastSlash >= 0 ? relPath.slice(lastSlash + 1) : relPath;
  const subdir = lastSlash >= 0 ? relPath.slice(0, lastSlash) : null;
  try {
    const r = await Desktop.saveText(currentEditTarget, filename, content, subdir);
    if (r && r.ok) {
      cssModified = false; scriptModified = false;
      docModified = false;
      updateDocIndicator();
      showToast('Saved: ' + filename);
    } else {
      showToast('Save failed.', true);
    }
  } catch (e) { showToast('Save error: ' + e.message, true); }
  finally { docSaveInProgress = false; }
}

async function saveDiskDoc() {
  if (docSaveInProgress) return;
  docSaveInProgress = true;
  try {
    if (currentOpenedDiskPath && currentOpenedDiskPath.toLowerCase().endsWith('.odt')) {
      deSyncPageLayoutFromControls();
      showToast(t('deSavingOdt') || 'Saving ODT…');
      const markdown = mdEditor.getValue();
      const r = await Desktop.exportOdt({
        markdown,
        targetPath: currentOpenedDiskPath,
        defaultName: currentDocName || 'document',
        fontFamily: pageLayout.fontFamily,
        fontSize: pageLayout.fontSize,
        margins: pageLayout.margins,
        size: pageLayout.size,
        orientation: pageLayout.orientation
      });
      if (r && r.ok) {
        cssModified = false; scriptModified = false;
        docModified = false;
        updateDocIndicator();
        showToast('Saved: ' + (currentDocName || currentOpenedDiskPath));
      } else {
        showToast('Save failed: ' + ((r && r.error) || ''), true);
      }
      return;
    }
    const content = deBuildPersistedCurrentDocContent();
    const r = await Desktop.writeDiskFile(currentOpenedDiskPath, content);
    if (r && r.ok) {
      cssModified = false; scriptModified = false;
      docModified = false;
      updateDocIndicator();
      showToast('Saved: ' + (currentDocName || currentOpenedDiskPath));
    } else {
      showToast('Save failed: ' + ((r && r.error) || ''), true);
    }
  } catch (e) { showToast('Save error: ' + e.message, true); }
  finally { docSaveInProgress = false; }
}

async function saveDoc() {
  if (window.DeDetach && typeof DeDetach.isDetached === 'function' && DeDetach.isDetached()) {
    DeDetach.requestSave();
    return;
  }
  if (!window.Desktop || !Desktop.isElectron()) {
    showToast('File saving requires the Electron app.', true);
    return;
  }
  if (currentEditTarget && currentEditRelPath) {
    await saveExternalDoc();
  } else if (currentOpenedDiskPath) {
    await saveDiskDoc();
  } else if (currentDocName) {
    await doSaveDoc(currentDocName);
  } else {
    const ext = '.' + currentDocType;
    await deOpenFileBrowser({
      title: t('deFileBrowserSaveDocument') || 'Save document',
      target: 'docEditorDocs',
      currentPath: currentDocSubdir || '',
      extensions: ['.md', '.html', '.typ'],
      bundleMode: false,
      displayNameFn: deDocBrowserDisplayName,
      rootLabel: t('deFileBrowserDocumentsRoot') || 'Documents',
      mode: 'save',
      placeholder: 'my-document' + ext,
      suggestedName: currentDocName || '',
      confirmOverwrite: true,
      onSave: async (name, folderPath) => {
        let nextName = name;
        if (/\.(md|html|typ)$/i.test(nextName)) setDocType(/\.typ$/i.test(nextName) ? 'typ' : (/\.html$/i.test(nextName) ? 'html' : 'md'));
        else nextName += ext;
        await doSaveDoc(nextName, folderPath);
      }
    });
  }
}

async function saveDocAs() {
  if (!window.Desktop || !Desktop.isElectron()) return;
  const ext = '.' + currentDocType;
  await deOpenFileBrowser({
    title: t('deFileBrowserSaveDocumentAs') || 'Save document as',
    target: 'docEditorDocs',
    currentPath: currentDocSubdir || '',
    extensions: ['.md', '.html', '.typ'],
    bundleMode: false,
    displayNameFn: deDocBrowserDisplayName,
    rootLabel: t('deFileBrowserDocumentsRoot') || 'Documents',
    mode: 'save',
    placeholder: 'my-document' + ext,
    suggestedName: currentDocName || '',
    confirmOverwrite: true,
    sourceTabs: deBuildFileModalTabs('docs', 'save'),
    onSave: async (name, folderPath) => {
      let nextName = name;
      if (/\.(md|html|typ)$/i.test(nextName)) setDocType(/\.typ$/i.test(nextName) ? 'typ' : (/\.html$/i.test(nextName) ? 'html' : 'md'));
      else nextName += ext;
      await doSaveDoc(nextName, folderPath);
    }
  });
}

async function renameDoc() {
  if (window.DeDetach && typeof DeDetach.isDetached === 'function' && DeDetach.isDetached()) {
    return;
  }
  if (!window.Desktop || !Desktop.isElectron()) {
    showToast((window.t && t('deRenameElectronRequired')) || 'File renaming requires the Electron app.', true);
    return;
  }
  const hasDiskPath = Boolean(currentOpenedDiskPath);
  const managedTarget = currentEditTarget || (currentDocStoredInDocs ? 'docEditorDocs' : null);
  const managedRelPath = currentEditRelPath || (currentDocStoredInDocs && currentDocName ? deJoinRelPath(currentDocSubdir || '', currentDocName) : null);
  if (!hasDiskPath && (!managedTarget || !managedRelPath)) {
    showToast((window.t && t('deRenameUnsaved')) || 'Save the document first before renaming it.', true);
    return;
  }

  const oldFilename = currentDocName || (hasDiskPath ? deBasename(currentOpenedDiskPath) : deBasename(managedRelPath));
  const promptLabel = (window.t && t('deRenamePrompt')) || 'New file name:';
  const nextInput = await showPrompt(promptLabel, oldFilename);
  if (nextInput === null) return;

  let newFilename = String(nextInput).trim();
  if (!newFilename) {
    showToast((window.t && t('deRenameEmpty')) || 'File name cannot be empty.', true);
    return;
  }
  if (/[\\/:*?"<>|]/.test(newFilename) || newFilename === '.' || newFilename === '..') {
    showToast((window.t && t('deRenameInvalidChars')) || 'File name contains invalid characters (\\ / : * ? " < > |).', true);
    return;
  }
  if (!/\.[a-z0-9]{1,8}$/i.test(newFilename)) {
    const extMatch = oldFilename.match(/(\.[^.]+)$/);
    if (extMatch) newFilename += extMatch[1];
  }
  if (newFilename === oldFilename) return;

  try {
    if (hasDiskPath) {
      const newDiskPath = deNativeSiblingPath(currentOpenedDiskPath, newFilename);
      const isCaseOnly = newDiskPath.toLowerCase() === currentOpenedDiskPath.toLowerCase();
      if (!isCaseOnly && typeof Desktop.statDiskFile === 'function') {
        const st = await Desktop.statDiskFile(newDiskPath);
        if (st && st.exists) {
          showToast((window.t && t('deRenameConflict')) || 'A file with that name already exists.', true);
          return;
        }
      }
      const r = await Desktop.renameDiskFile(currentOpenedDiskPath, newDiskPath);
      if (!r || !r.ok) {
        showToast(((window.t && t('deRenameFailed')) || 'Rename failed:') + ' ' + ((r && r.error) || ''), true);
        return;
      }
      currentOpenedDiskPath = r.path || newDiskPath;
      currentDocName = r.name || newFilename;
    } else {
      const dir = deDirname(managedRelPath);
      const newRelPath = deJoinRelPath(dir, newFilename);
      const isCaseOnly = newRelPath.toLowerCase() === managedRelPath.toLowerCase();
      if (!isCaseOnly && typeof Desktop.statByPath === 'function') {
        const st = await Desktop.statByPath(managedTarget, newRelPath);
        if (st && st.exists) {
          showToast((window.t && t('deRenameConflict')) || 'A file with that name already exists.', true);
          return;
        }
      }
      const r = await Desktop.renameByPath(managedTarget, managedRelPath, newRelPath);
      if (!r || !r.ok) {
        showToast(((window.t && t('deRenameFailed')) || 'Rename failed:') + ' ' + ((r && r.error) || ''), true);
        return;
      }
      const finalRelPath = (r.renamed && r.renamed.newRelativePath) ? r.renamed.newRelativePath : newRelPath;
      currentEditTarget = managedTarget;
      currentEditRelPath = finalRelPath;
      currentDocName = deBasename(finalRelPath);
      currentDocSubdir = deDirname(finalRelPath) || null;
      currentDocStoredInDocs = (managedTarget === 'docEditorDocs');
    }

    const lower = currentDocName.toLowerCase();
    const nextType = lower.endsWith('.typ') ? 'typ' : (lower.endsWith('.html') || lower.endsWith('.htm') ? 'html' : (lower.endsWith('.md') || lower.endsWith('.markdown') ? 'md' : currentDocType));
    if (nextType !== currentDocType) {
      currentDocType = nextType;
      const typeBtn = document.getElementById('btn-doc-type');
      if (typeBtn) {
        typeBtn.textContent = currentDocType.toUpperCase();
        typeBtn.classList.toggle('html-mode', currentDocType === 'html');
        typeBtn.classList.toggle('typ-mode', currentDocType === 'typ');
      }
      if (mdEditor && window.monaco && monaco.editor) {
        monaco.editor.setModelLanguage(mdEditor.getModel(), currentDocType === 'html' ? 'html' : (currentDocType === 'typ' ? 'typst' : 'markdown'));
      }
      if (typeof deUpdateViewSwitcherState === 'function') deUpdateViewSwitcherState();
      if (typeof renderPreview === 'function') renderPreview();
    }

    updateDocIndicator();
    showToast(((window.t && t('deRenamedToast')) || 'Renamed to:') + ' ' + currentDocName);
  } catch (e) {
    showToast(((window.t && t('deRenameFailed')) || 'Rename failed:') + ' ' + e.message, true);
  }
}

async function doSaveDoc(filename, folderPath = null) {
  if (!mdEditor) return;
  if (docSaveInProgress) return;
  docSaveInProgress = true;
  try {
    const targetSubdir = folderPath == null ? (currentDocSubdir || null) : (deNormalizeRelPath(folderPath) || null);
    const r = await deSaveManagedDocSnapshot('docEditorDocs', filename, targetSubdir);
    if (r && r.ok) {
      currentDocName = filename;
      currentDocSubdir = targetSubdir;
      currentDocStoredInDocs = true;
      currentEditTarget = 'docEditorDocs';
      currentEditRelPath = targetSubdir ? (targetSubdir + '/' + filename) : filename;
      currentOpenedDiskPath = null;
      docModified = false;
      updateDocIndicator();
      hideModal('file-modal');
      await deDeleteLegacyManagedArtifacts(filename, targetSubdir);
      showToast('Saved: ' + filename);
      saveHistorySnapshot(filename, deBuildPersistedCurrentDocContent());
    } else {
      showToast('Save failed: ' + (r && r.error ? r.error : 'unknown'), true);
    }
  } catch (e) { showToast('Save error: ' + e.message, true); }
  finally { docSaveInProgress = false; }
}

async function autosaveDoc() {
  if (window.DeDetach && typeof DeDetach.isDetached === 'function' && DeDetach.isDetached()) return;
  if (docSaveInProgress) return;
  if (!window.Desktop || !Desktop.isElectron() || !currentDocName || !mdEditor) return;
  const needsManagedSave = currentDocStoredInDocs && (docModified || cssModified);
  if (!needsManagedSave && !(docModified || cssModified || scriptModified)) return;
  try {
    if (currentDocStoredInDocs) {
      const r = await deSaveManagedDocSnapshot('docEditorDocs', currentDocName, currentDocSubdir || null);
      if (r && r.ok) {
        docModified = false;
        updateDocIndicator();
        await deDeleteLegacyManagedArtifacts(currentDocName, currentDocSubdir || null);
      }
    } else if (currentEditTarget && currentEditRelPath) {
      await saveExternalDoc();
    } else if (currentOpenedDiskPath) {
      await saveDiskDoc();
    }
  } catch (e) { /* silent */ }
}

async function saveAll() {
  if (!window.Desktop || !Desktop.isElectron()) {
    showToast('File saving requires the Electron app.', true);
    return;
  }
  if (currentEditTarget) {
    await saveExternalDoc();
    return;
  }
  if (currentOpenedDiskPath) {
    await saveDiskDoc();
    return;
  }
  if (currentDocName) {
    await doSaveAll(currentDocName);
  } else {
    const ext = '.' + currentDocType;
    await deOpenFileBrowser({
      title: t('deFileBrowserSaveAll') || 'Save all',
      target: 'docEditorDocs',
      currentPath: currentDocSubdir || '',
      extensions: ['.md', '.html'],
      bundleMode: false,
      displayNameFn: deDocBrowserDisplayName,
      rootLabel: t('deFileBrowserDocumentsRoot') || 'Documents',
      mode: 'save',
      placeholder: 'my-document' + ext,
      suggestedName: currentDocName || '',
      confirmOverwrite: true,
      onSave: async (name, folderPath) => {
        let nextName = name;
        if (/\.(md|html)$/i.test(nextName)) setDocType(/\.html$/i.test(nextName) ? 'html' : 'md');
        else nextName += ext;
        await doSaveAll(nextName, folderPath);
      }
    });
  }
}

async function doSaveAll(filename, folderPath = null) {
  if (!mdEditor) return;
  if (docSaveInProgress) return;
  docSaveInProgress = true;
  const targetSubdir = folderPath == null ? (currentDocSubdir || null) : (deNormalizeRelPath(folderPath) || null);
  try {
    const docR = await deSaveManagedDocSnapshot('docEditorDocs', filename, targetSubdir);
    if (docR && docR.ok) {
      currentDocName = filename;
      currentDocSubdir = targetSubdir;
      currentDocStoredInDocs = true;
      currentEditTarget = 'docEditorDocs';
      currentEditRelPath = targetSubdir ? (targetSubdir + '/' + filename) : filename;
      currentOpenedDiskPath = null;
      docModified = false;
      cssModified = false; scriptModified = false;
      updateDocIndicator();
      hideModal('file-modal');
      await deDeleteLegacyManagedArtifacts(filename, targetSubdir);
      document.getElementById('custom-css-style').textContent = deBuildScopedPreviewCss(cssEditor ? cssEditor.getValue() : '', '#preview-content');
      showToast('Saved: ' + filename);
      saveHistorySnapshot(filename, deBuildPersistedCurrentDocContent());
    } else {
      showToast('Save failed', true);
    }
  } catch (e) { showToast('Save error: ' + e.message, true); }
  finally { docSaveInProgress = false; }
}

async function newDoc() {
  if (docModified && mdEditor && mdEditor.getValue().trim()) {
    if (!await showConfirm('Discard unsaved changes?')) return;
  }
  _initialLoadDone = true;
  mdEditor && mdEditor.setValue('');
  currentDocName = null;
  currentDocSubdir = null;
  currentEditTarget = null;
  currentEditRelPath = null;
  currentDocStoredInDocs = false;
  currentOpenedDiskPath = null;
  currentDocMeta = {};
  docModified = false;
  updateDocIndicator();
  deApplyManagedDocState('', null);
  syncPopupToState();
  applyPageLayoutToPreview();
}

// ── Version history ──────────────────────────────────────
function makeHistoryFilename(docFilename) {
  const ext = (docFilename.match(/\.(md|html)$/i) || ['.md'])[0];
  const base = docFilename.replace(/\.(md|html)$/i, '');
  const now = new Date();
  const p = n => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  return `${base}.v${ts}${ext}`;
}

function formatHistoryDate(filename) {
  const m = String(filename).match(/\.v(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.(md|html)$/i);
  if (!m) return filename;
  const dt = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`);
  return dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    + ' — ' + dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

async function saveHistorySnapshot(filename, content) {
  if (!window.Desktop || !Desktop.isElectron()) return;
  try {
    const subdir = 'history/' + filename.replace(/\.(md|html)$/i, '');
    await Desktop.saveText('docEditorDocs', makeHistoryFilename(filename), content, subdir);
    const listed = await Desktop.listByPath('docEditorDocs', subdir, { extensions: ['.md', '.html'], recursive: false });
    if (listed && listed.ok && Array.isArray(listed.files) && listed.files.length > 30) {
      const sorted = listed.files.slice().sort((a, b) => (a.mtimeMs || 0) - (b.mtimeMs || 0));
      for (const f of sorted.slice(0, sorted.length - 30)) {
        await Desktop.deleteByPath('docEditorDocs', f.relativePath).catch(() => { });
      }
    }
  } catch (e) { /* silent — history is best-effort */ }
}

async function openHistoryModal() {
  if (!currentDocName) {
    showToast('Save the document first to view its history.', true);
    return;
  }
  const subdir = 'history/' + currentDocName.replace(/\.(md|html)$/i, '');
  document.getElementById('history-modal-title').textContent = 'Version History — ' + currentDocName;
  const body = document.getElementById('history-modal-body');
  body.innerHTML = '<div class="modal-empty">Loading…</div>';
  showModal('history-modal');

  let files = [];
  try {
    const r = await Desktop.listByPath('docEditorDocs', subdir, { extensions: ['.md', '.html'], recursive: false });
    files = (r && r.ok && Array.isArray(r.files)) ? r.files : [];
  } catch (e) { }

  files.sort((a, b) => (b.mtimeMs || 0) - (a.mtimeMs || 0));

  if (!files.length) {
    body.innerHTML = '<div class="modal-empty">No saved versions yet.<br>Versions are created on every manual save.</div>';
    return;
  }

  body.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'file-list';

  const preview = document.createElement('pre');
  preview.id = 'hist-preview-pane';

  files.forEach(f => {
    const rp = f.relativePath || '';
    const row = document.createElement('div');
    row.className = 'file-row';

    const label = document.createElement('span');
    label.className = 'file-row-name';
    label.textContent = formatHistoryDate(f.filename || rp);

    const size = document.createElement('span');
    size.style.cssText = 'font-size:.75rem;color:#888;white-space:nowrap;flex-shrink:0;';
    size.textContent = f.size ? (Math.ceil(f.size / 1024) + ' KB') : '';

    const previewBtn = document.createElement('button');
    previewBtn.className = 'file-row-btn file-row-btn-outline';
    previewBtn.textContent = 'Preview';
    previewBtn.onclick = async () => {
      previewBtn.textContent = '…';
      try {
        const r = await Desktop.readByPath('docEditorDocs', rp);
        if (r && r.ok) {
          preview.textContent = r.content || '';
          preview.classList.add('visible');
          preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      } catch (e) { }
      previewBtn.textContent = 'Preview';
    };

    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'file-row-btn';
    restoreBtn.textContent = 'Restore';
    restoreBtn.onclick = async () => {
      if (docModified && !await showConfirm('Discard unsaved changes and restore this version?')) return;
      try {
        const r = await Desktop.readByPath('docEditorDocs', rp);
        if (r && r.ok) {
          mdEditor.setValue(r.content || '');
          docModified = true;
          updateDocIndicator();
          hideModal('history-modal');
          showToast('Version restored — save to keep it.');
        }
      } catch (e) { showToast('Could not restore: ' + e.message, true); }
    };

    const delBtn = document.createElement('button');
    delBtn.className = 'file-row-btn file-row-btn-del';
    delBtn.textContent = 'Del';
    delBtn.onclick = async () => {
      if (!await showConfirm('Delete this version?')) return;
      try {
        await Desktop.deleteByPath('docEditorDocs', rp);
        row.remove();
        if (!list.children.length) {
          body.innerHTML = '<div class="modal-empty">No saved versions yet.<br>Versions are created on every manual save.</div>';
        }
      } catch (e) { showToast('Could not delete: ' + e.message, true); }
    };

    row.appendChild(label);
    row.appendChild(size);
    row.appendChild(previewBtn);
    row.appendChild(restoreBtn);
    row.appendChild(delBtn);
    list.appendChild(row);
  });

  body.appendChild(list);
  body.appendChild(preview);
}

// ── Template management ──────────────────────────────────
async function refreshTemplateList() {
  if (!window.Desktop || !Desktop.isElectron()) return [];
  try {
    const r = await Desktop.listByPath('docEditorTemplates', '', { extensions: ['.md', '.html', '.typ'], recursive: true });
    if (!r || !r.ok || !Array.isArray(r.files)) return [];
    return r.files.filter(f => {
      const rp = f.relativePath || '';
      const parts = rp.split('/');
      if (parts.length === 1) return true;
      if (parts.length === 2) return parts[1] === parts[0] + '.md' || parts[1] === parts[0] + '.html' || parts[1] === parts[0] + '.typ';
      return false;
    });
  } catch (e) { return []; }
}

async function openTemplateModal() {
  await deOpenFileBrowser({
    title: t('deFileBrowserTemplatesTitle') || 'Templates',
    target: 'docEditorTemplates',
    currentPath: '',
    extensions: ['.md', '.html', '.typ'],
    bundleMode: false,
    displayNameFn: deTemplateBrowserDisplayName,
    rootLabel: t('deFileBrowserTemplatesRoot') || 'Templates',
    openButtonLabel: t('deFileBrowserUse') || 'Use',
    emptyText: t('deFileBrowserNoTemplates') || 'No templates yet.',
    sourceTabs: deBuildFileModalTabs('templates', 'open'),
    toolbarButtons: [{
      label: t('deFileBrowserSaveCurrentTemplate') || '+ Save current doc as template',
      onClick: saveAsTemplate
    }],
    onOpen: async relativePath => {
      await loadTemplate(relativePath);
    },
    onDelete: async entry => {
      await Desktop.deleteByPath('docEditorTemplates', entry.relativePath).catch(() => { });
    }
  });
}

async function loadTemplate(filename) {
  if (!window.Desktop || !Desktop.isElectron()) return;
  if (docModified && mdEditor && mdEditor.getValue().trim()) {
    if (!await showConfirm('Load template? Unsaved changes will be lost.')) return;
  }
  try {
    const r = await Desktop.readByPath('docEditorTemplates', filename);
    if (r && r.ok) {
      const lower = (filename || '').toLowerCase();
      currentDocType = lower.endsWith('.typ') ? 'typ' : (lower.endsWith('.html') ? 'html' : 'md');
      const typeBtn = document.getElementById('btn-doc-type');
      if (typeBtn) {
        typeBtn.textContent = currentDocType.toUpperCase();
        typeBtn.classList.toggle('html-mode', currentDocType === 'html');
        typeBtn.classList.toggle('typ-mode', currentDocType === 'typ');
      }
      if (mdEditor) monaco.editor.setModelLanguage(mdEditor.getModel(), currentDocType === 'html' ? 'html' : (currentDocType === 'typ' ? 'typst' : 'markdown'));
      deUpdateViewSwitcherState();

      const inlineState = deExtractStyleBlocks(r.content || '');
      mdEditor.setValue(inlineState.content || '');
      currentDocName = null;
      currentDocSubdir = null;
      currentEditTarget = null;
      currentEditRelPath = null;
      currentDocStoredInDocs = false;
      docModified = false;
      updateDocIndicator();
      deApplyManagedDocState(inlineState.cssText || '', null);
      hideModal('file-modal');
      syncPopupToState();
      applyPageLayoutToPreview();
      renderPreview();
      showToast('Template loaded');
    }
  } catch (e) { showToast('Could not load template: ' + e.message, true); }
}

async function saveAsTemplate() {
  if (!window.Desktop || !Desktop.isElectron()) return;
  const currentExt = (currentDocType === 'typ') ? '.typ' : ((currentDocType === 'html') ? '.html' : '.md');
  const suggested = currentDocName ? currentDocName.replace(/\.(md|html|typ)$/i, '') + currentExt : ('template' + currentExt);
  await deOpenFileBrowser({
    title: t('deFileBrowserSaveTemplate') || 'Save as template',
    target: 'docEditorTemplates',
    currentPath: '',
    extensions: ['.md', '.html', '.typ'],
    bundleMode: false,
    displayNameFn: deTemplateBrowserDisplayName,
    rootLabel: t('deFileBrowserTemplatesRoot') || 'Templates',
    mode: 'save',
    placeholder: 'template-name' + currentExt,
    suggestedName: suggested,
    confirmOverwrite: true,
    sourceTabs: deBuildFileModalTabs('templates', 'save'),
    onSave: async (name, folderPath) => {
      let nextName = String(name || '').trim();
      if (!nextName) {
        showToast(t('deFileBrowserEnterName') || 'Enter a file name.', true);
        return;
      }
      if (!/\.(md|html|typ)$/i.test(nextName)) nextName += currentExt;
      try {
        const r = await Desktop.saveText('docEditorTemplates', nextName, deBuildPersistedCurrentDocContent(), deNormalizeRelPath(folderPath) || null);
        if (r && r.ok) {
          hideModal('file-modal');
          showToast((t('omTemplateSaved') || 'Template saved!').replace('!', '') + ': ' + nextName);
        } else {
          showToast('Save failed', true);
        }
      } catch (e) { showToast('Error: ' + e.message, true); }
    }
  });
}

// ── Stylesheet management ────────────────────────────────

// @docs@<filename> sentinel: a CSS file co-located with its document in docEditorDocs
function parsePairedSS(val) {
  return val && val.startsWith('@docs@') ? val.slice(6) : null;
}

function clearPairedSSOptions() {
  const sel = document.getElementById('stylesheet-select');
  if (!sel) return;
  for (let i = sel.options.length - 1; i >= 0; i--) {
    if (sel.options[i].value.startsWith('@docs@')) sel.remove(i);
  }
}

function injectPairedSSOption(cssFilename) {
  clearPairedSSOptions();
  const sel = document.getElementById('stylesheet-select');
  if (!sel) return;
  const opt = document.createElement('option');
  opt.value = '@docs@' + cssFilename;
  opt.textContent = cssFilename + ' (with doc)';
  // Insert after the "— none —" option
  sel.insertBefore(opt, sel.options[1] || null);
  sel.value = opt.value;
}

async function refreshStylesheetList() {
  deConfigureInlineStylesheetUi();
}

async function onStylesheetChange() {
  deConfigureInlineStylesheetUi();
}

async function loadStylesheet(filename) {
  deConfigureInlineStylesheetUi();
}

async function newStylesheet() {
  showToast('Stylesheets are stored inline in the document.');
}

async function saveStylesheet() {
  if (currentDocStoredInDocs && currentDocName) {
    const r = await deSaveManagedDocSnapshot('docEditorDocs', currentDocName, currentDocSubdir || null);
    if (r && r.ok) {
      cssModified = false; scriptModified = false;
      docModified = false;
      updateDocIndicator();
      showToast('Styles saved in document');
    }
    return;
  }
  showToast('Stylesheets are stored inline in the document.');
}

async function deleteStylesheet() {
  if (!cssEditor) return;
  deSetCssEditorValue(deComposeManagedStylesheet(''), true);
  updatePreviewFooter();
  showToast('Inline stylesheet cleared');
}

// ── CSS Rule Builder ──────────────────────────────────────
function addCssRule() {
  const selector = document.getElementById('rule-selector').value.trim();
  const property = document.getElementById('rule-property').value;
  const value = document.getElementById('rule-value').value.trim();
  if (!selector || !value) {
    showToast('Selector and value are required.', true);
    return;
  }
  const rule = '\n' + selector + ' {\n ' + property + ': ' + value + ';\n}\n';
  if (cssEditor) {
    cssEditor.setValue(cssEditor.getValue() + rule);
  }
  document.getElementById('rule-value').value = '';
  document.getElementById('rule-selector').focus();
  // Open CSS editor if not visible
  if (!cssEditorVisible) toggleCssEditor();
  showToast('Rule added');
}

// ── PDF Export ────────────────────────────────────────────
function extractDocTitleFromContent() {
  const raw = mdEditor ? mdEditor.getValue() : '';
  if (!raw || !raw.trim()) return '';
  // Markdown: first line starting with #
  const mdMatch = raw.match(/^#\s+([^\n\r#]+)/m);
  if (mdMatch && mdMatch[1].trim()) {
    return mdMatch[1].trim().replace(/[/\\?%*:|"<>]/g, '_');
  }
  // HTML: first <h1>...</h1>
  const htmlMatch = raw.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (htmlMatch && htmlMatch[1].trim()) {
    const text = htmlMatch[1].replace(/<[^>]+>/g, '').trim();
    if (text) return text.replace(/[/\\?%*:|"<>]/g, '_');
  }
  // Typst: first = Heading
  const typMatch = raw.match(/^=\s+([^\n\r=]+)/m);
  if (typMatch && typMatch[1].trim()) {
    return typMatch[1].trim().replace(/[/\\?%*:|"<>]/g, '_');
  }
  return '';
}

function getPdfExportBaseName() {
  const rawName = currentDocName
    || (currentEditRelPath ? deBasename(currentEditRelPath) : null)
    || (currentOpenedDiskPath ? deBasename(currentOpenedDiskPath) : null);
  if (rawName) {
    const baseName = String(rawName).replace(/\.[^.]+$/i, '').trim();
    if (baseName) return baseName;
  }
  const fromContent = extractDocTitleFromContent();
  if (fromContent) return fromContent;
  return 'document';
}

function getPdfSameFolderTarget() {
  const filename = getPdfExportBaseName() + '.pdf';
  if (currentEditTarget && currentEditRelPath) {
    const relDir = deDirname(currentEditRelPath) || null;
    const label = relDir ? (currentEditTarget + ' / ' + relDir + ' / ' + filename) : (currentEditTarget + ' / ' + filename);
    return { available: true, target: currentEditTarget, subdir: relDir, filename, label };
  }
  if (currentOpenedDiskPath) {
    const absolutePath = deNativeSiblingPath(currentOpenedDiskPath, filename);
    return { available: !!absolutePath, target: null, subdir: null, filename, absolutePath, label: absolutePath };
  }
  if (currentDocStoredInDocs && currentDocName) {
    const relDir = currentDocSubdir || null;
    const rootLabel = t('deFileBrowserDocumentsRoot') || 'Documents';
    const label = relDir ? (rootLabel + ' / ' + relDir + ' / ' + filename) : (rootLabel + ' / ' + filename);
    return { available: true, target: 'docEditorDocs', subdir: relDir, filename, label };
  }
  return {
    available: false,
    target: null,
    subdir: null,
    filename,
    label: '',
    reason: t('deExportPdfSameFolderUnavailable') || 'Save the document in Documents or open a managed file to use the same-folder option.'
  };
}

function closePdfExportModal(choice = null) {
  hideModal('pdf-export-modal');
  const callback = pdfExportModalCallback;
  pdfExportModalCallback = null;
  if (callback) callback(choice);
}

function openPdfExportModal(sameFolderInfo) {
  const titleEl = document.getElementById('pdf-export-modal-title');
  const textEl = document.getElementById('pdf-export-modal-text');
  const hintEl = document.getElementById('pdf-export-same-folder-hint');
  const sameBtn = document.getElementById('btn-pdf-export-same-folder');
  const toPrintBtn = document.getElementById('btn-pdf-export-to-print');
  const pickerBtn = document.getElementById('btn-pdf-export-picker');
  const cancelBtn = document.getElementById('btn-pdf-export-cancel');

  titleEl.textContent = t('deExportPdfDestinationTitle') || 'Export PDF';
  textEl.textContent = t('deExportPdfDestinationPrompt') || 'Where do you want to save the PDF?';
  sameBtn.textContent = t('deExportPdfSameFolder') || 'Save in same folder';
  if (toPrintBtn) toPrintBtn.textContent = t('deExportPdfToPrintFolder') || 'Export to Print folder';
  pickerBtn.textContent = t('deExportPdfFilePicker') || 'Choose with file picker';
  cancelBtn.textContent = t('btnCancel') || 'Cancel';

  if (sameFolderInfo && sameFolderInfo.available) {
    sameBtn.disabled = false;
    sameBtn.style.opacity = '';
    sameBtn.style.cursor = '';
    hintEl.textContent = (t('deExportPdfSameFolderPath') || 'Same-folder PDF: ') + sameFolderInfo.label;
  } else {
    sameBtn.disabled = true;
    sameBtn.style.opacity = '.45';
    sameBtn.style.cursor = 'default';
    hintEl.textContent = (sameFolderInfo && sameFolderInfo.reason) || (t('deExportPdfSameFolderUnavailable') || 'Save the document in Documents or open a managed file to use the same-folder option.');
  }

  if (pdfExportModalCallback) pdfExportModalCallback(null);

  const customRootsContainer = document.getElementById('de-pdf-export-custom-roots');
  if (customRootsContainer && typeof window.cmtBindExportRootsInModal === 'function') {
    window.cmtBindExportRootsInModal(customRootsContainer, function (dest) {
      closePdfExportModal(dest);
    }, { compact: true, buttonClass: 'modal-btn', newBtnClass: 'modal-btn' });
  }

  return new Promise(resolve => {
    pdfExportModalCallback = resolve;
    showModal('pdf-export-modal');
    setTimeout(() => {
      if (sameFolderInfo && sameFolderInfo.available) sameBtn.focus();
      else pickerBtn.focus();
    }, 0);
  });
}

async function getEmbeddedLexendFontsCss() {
  const weights = [300, 400, 500, 600, 700];
  let css = '';
  for (const weight of weights) {
    try {
      const relPath = 'modules/lexend/lexend-latin-' + weight + '-normal.woff2';
      const r = await Desktop.readByPath('app', relPath, { encoding: 'base64' });
      if (r && r.ok && r.content) {
        css += '@font-face {\n font-family: \'Lexend\';\n font-weight: ' + weight + ';\n font-style: normal;\n src: url(\'data:font/woff2;base64,' + r.content + '\') format(\'woff2\');\n}\n';
      }
    } catch (e) {
      console.warn('Failed to embed Lexend font weight ' + weight, e);
    }
  }
  return css;
}

async function deBuildPrintDocumentHtml(overrideTitle = null, overrideBodyHtml = null) {
  const lexendFontsCss = await getEmbeddedLexendFontsCss();

  let katexCssLink = '';
  try {
    const r = await Desktop.resolvePath('app', 'modules/katex/dist/katex.min.css');
    if (r && r.path) {
      const fwd = r.path.replace(/\\/g, '/');
      const normalized = fwd.startsWith('/') ? fwd : '/' + fwd;
      katexCssLink = '<link rel="stylesheet" href="' + encodeURI('file://' + normalized) + '">';
    }
  } catch (e) { }

  const customCss = deStripManagedLayoutCss(cssEditor ? cssEditor.getValue() : '');

  let previewContent = '';
  const previewEl = document.getElementById('preview-content');
  if (typeof overrideBodyHtml === 'string') {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = overrideBodyHtml;
    _deUnwrapPagedWrappers(wrapper);
    _deExpandPageBreakComments(wrapper);
    await fixPreviewImages(wrapper);
    previewContent = wrapper.innerHTML;
  } else if (previewEl && previewEl.querySelector('.full-preview-pdf-pages')) {
    let raw = mdEditor ? mdEditor.getValue() : '';
    if (window.MailpostingService) {
      const ctx = (window.DeMiniDb && typeof DeMiniDb.resolvePreviewContext === 'function')
        ? DeMiniDb.resolvePreviewContext(mpState, false)
        : {
          activeStudent: (mpState.connectedClass && mpState.studentList.length > 0)
            ? (mpState.studentList[mpState.previewStudentIndex] || mpState.studentList[0])
            : {},
          activeClass: mpState.connectedClass || {},
          miniDbRecord: window.DeMiniDb ? DeMiniDb.getActiveRecordDict() : null
        };
      raw = MailpostingService.renderTemplate(raw, ctx.activeStudent, ctx.activeClass, {
        roster: mpState.studentRoster,
        students: mpState.studentList,
        isHtml: currentDocType === 'html',
        miniDbRecord: ctx.miniDbRecord
      });
    }
    const bodyHtml = currentDocType === 'html' ? raw : marked.parse(raw);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = bodyHtml;
    _deExpandPageBreakComments(wrapper);
    await fixPreviewImages(wrapper);
    previewContent = wrapper.innerHTML;
  } else if (previewEl && previewEl.classList.contains('paged-mode')) {
    const bodies = previewEl.querySelectorAll('.doc-page-body');
    if (bodies.length > 0) {
      const wrapper = document.createElement('div');
      bodies.forEach(b => {
        Array.from(b.childNodes).forEach(node => {
          wrapper.appendChild(node.cloneNode(true));
        });
      });
      wrapper.querySelectorAll('.de-preview-footer').forEach(el => el.remove());
      wrapper.querySelectorAll('.de-fp-ruler').forEach(el => el.remove());
      await fixPreviewImages(wrapper);
      previewContent = wrapper.innerHTML;
    } else {
      previewContent = previewEl.innerHTML;
    }
  } else if (previewEl) {
    const _previewClone = previewEl.cloneNode(true);
    _previewClone.querySelectorAll('.de-preview-footer').forEach(el => el.remove());
    _previewClone.querySelectorAll('.de-fp-ruler').forEach(el => el.remove());
    await fixPreviewImages(_previewClone);
    previewContent = _previewClone.innerHTML;
  }

  const m = pageLayout.margins;
  const dims = getPageDims();
  const marginCss = m.top + 'mm ' + m.right + 'mm ' + m.bottom + 'mm ' + m.left + 'mm';

  const pdfFontFamily = pageLayout.fontFamily || "'Segoe UI', system-ui, sans-serif";
  const pdfFontSize = (pageLayout.fontSize || 11) + 'pt';
  const defaultPreviewCss =
    '@page { size: ' + dims.w + 'mm ' + dims.h + 'mm; margin: ' + marginCss + '; }\n' +
    'body { margin: 0; padding: 0; background: #fff; }\n' +
    '.doc-preview { line-height: 1.65; color: #1a1a1a; font-size: ' + pdfFontSize + '; font-family: ' + pdfFontFamily + '; }\n' +
    '.doc-preview > :first-child { margin-top: 0; }\n' +
    '.doc-preview > :last-child { margin-bottom: 0; }\n' +
    '.doc-preview h1 { font-size: 2em; font-weight: 800; margin: .67em 0 .4em; padding-bottom: .3em; border-bottom: 2px solid #eee; }\n' +
    '.doc-preview h2 { font-size: 1.5em; font-weight: 700; margin: 1em 0 .4em; padding-bottom: .2em; border-bottom: 2px solid #111; }\n' +
    '.doc-preview h3 { font-size: 1.17em; font-weight: 700; margin: 1em 0 .4em; }\n' +
    '.doc-preview h4 { font-size: 1em; font-weight: 700; margin: .8em 0 .3em; }\n' +
    '.doc-preview h5, .doc-preview h6 { font-size: .9em; font-weight: 700; margin: .8em 0 .3em; color: #444; }\n' +
    '.doc-preview p { margin: 0 0 1em; }\n' +
    '.doc-preview ul, .doc-preview ol { padding-left: 2em; margin: 0 0 1em; }\n' +
    '.doc-preview li { margin: .25em 0; }\n' +
    '.doc-preview pre { background: #f6f8fa; border: 1px solid #e1e4e8; border-radius: 6px; padding: 16px; overflow-x: auto; margin: 0 0 1em; font-size: .88em; }\n' +
    '.doc-preview code { background: rgba(27,31,35,.07); padding: 2px 5px; border-radius: 3px; font-size: .9em; font-family: \'Consolas\',\'Courier New\',monospace; }\n' +
    '.doc-preview pre code { background: none; padding: 0; font-size: inherit; }\n' +
    '.doc-preview blockquote { border-left: 4px solid #dfe2e5; padding: 2px 16px; color: #6a737d; margin: 0 0 1em; }\n' +
    '.doc-preview table { border-collapse: collapse; width: 100%; margin: 0 0 1em; }\n' +
    '.doc-preview th, .doc-preview td { border: 1px solid #dfe2e5; padding: 8px 13px; }\n' +
    '.doc-preview th { background: #f6f8fa; font-weight: 700; }\n' +
    '.doc-preview tr:nth-child(even) td { background: #fafbfc; }\n' +
    '.doc-preview hr { border: none; border-top: 2px solid #eee; margin: 1.5em 0; }\n' +
    '.doc-preview a { color: #0366d6; text-decoration: none; }\n' +
    '.de-page-break, .page-break, .pagebreak, .cmt-page-break, .mailposting-page-break-hr { display: block; height: 0; margin: 0; padding: 0; border: none; page-break-after: always; break-after: page; }\n' +
    '.math-display { margin: 1em 0; overflow-x: auto; text-align: center; }\n' +
    (pageLayout.imageWidth && pageLayout.imageWidth !== 'auto'
      ? '.doc-preview img { width: ' + pageLayout.imageWidth + '; max-width: 100%; height: auto; border-radius: 4px; }\n'
      : '.doc-preview img { max-width: 100%; height: auto; border-radius: 4px; }\n');

  const pdfTitle = overrideTitle || getPdfExportBaseName() || 'Document';
  const scopedCustomCss = deScopeCssForContainer(customCss, '.doc-preview');
  const printRootResetCss =
    'html, body, body > .doc-preview { border: none !important; box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; padding: 0 !important; max-width: none !important; }';

  const html = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n' +
    '<title>' + escHtml(pdfTitle) + '</title>\n' +
    katexCssLink + '\n' +
    '<style>\n* { box-sizing: border-box; }\nhtml, body { margin: 0; padding: 0; }\n' +
    lexendFontsCss + '\n' +
    defaultPreviewCss + '\n' + scopedCustomCss + '\n' + printRootResetCss + '\n</style>\n' +
    '</head>\n<body>\n<div class="doc-preview">\n' + previewContent + '\n</div>\n</body>\n</html>';

  const pdfSize = pageLayout.size === 'Custom'
    ? { width: Math.round(pageLayout.customW * 1000), height: Math.round(pageLayout.customH * 1000) }
    : (pageLayout.orientation === 'landscape'
      ? { width: Math.round(getPageDims().w * 1000), height: Math.round(getPageDims().h * 1000) }
      : pageLayout.size);

  const pdfOptions = {
    landscape: pageLayout.orientation === 'landscape',
    pageSize: pdfSize,
    margins: { top: 0, bottom: 0, left: 0, right: 0 }, // Electron 41+: zero browser-imposed PDF margins; use @page margin from generated CSS
    marginsType: 1,
    preferCSSPageSize: true
  };

  const hasPageNums = pageLayout.pageNumbers;
  const hasFooter = pageLayout.footer && (pageLayout.footerText || '').trim();
  if (hasPageNums || hasFooter) {
    const font = (pageLayout.fontFamily || 'Segoe UI').split(',')[0].trim().replace(/^['"]|['"]$/g, '');
    const ml = pageLayout.margins.left + 'mm';
    const mr = pageLayout.margins.right + 'mm';
    let rows = '';
    if (hasFooter) {
      const fa = pageLayout.footerAlign || 'center';
      const faStyle = fa === 'left' ? 'text-align:left;padding-left:' + ml
        : fa === 'right' ? 'text-align:right;padding-right:' + mr
          : 'text-align:center';
      const safeText = pageLayout.footerText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      rows += '<div style="width:100%;' + faStyle + '">' + safeText + '</div>';
    }
    if (hasPageNums) {
      const pos = pageLayout.pageNumbersPos || 'center';
      const paStyle = pos === 'left' ? 'text-align:left;padding-left:' + ml
        : pos === 'right' ? 'text-align:right;padding-right:' + mr
          : 'text-align:center';
      rows += '<div style="width:100%;' + paStyle + '"><span class="pageNumber"></span></div>';
    }
    pdfOptions.displayHeaderFooter = true;
    pdfOptions.headerTemplate = '<span></span>';
    pdfOptions.footerTemplate =
      '<div style="width:100%;font-size:8pt;color:#888;font-family:' + font + ',Arial,sans-serif">' +
      rows +
      '</div>';
  }

  return { html, pdfOptions, previewContent };
}

async function exportPdf() {
  if (!window.Desktop || !Desktop.isElectron()) {
    showToast(t('deExportPdfNoElectron') || 'PDF export requires the Electron desktop app.', true);
    return;
  }

  // Capture current popup values even if inputs haven't blurred yet.
  deSyncPageLayoutFromControls();
  deSyncCssEditorWithLayout(true);
  applyPageLayoutToPreview();
  updatePreviewFooter();

  const sameFolderInfo = getPdfSameFolderTarget();
  const destination = await openPdfExportModal(sameFolderInfo);
  if (!destination) return;

  const pdfBaseTitle = getPdfExportBaseName();
  let resolvedPdfName = (destination === 'same-folder' && sameFolderInfo && sameFolderInfo.available)
    ? (sameFolderInfo.filename || (pdfBaseTitle + '.pdf'))
    : (pdfBaseTitle + '.pdf');
  let resolvedAbsPath = (destination === 'same-folder' && sameFolderInfo && sameFolderInfo.available)
    ? (sameFolderInfo.absolutePath || '')
    : '';

  const isManagedDest = window.cmtIsManagedExportDest ? window.cmtIsManagedExportDest(destination) : (destination === 'to-print');
  const managedTarget = window.cmtResolveExportTarget ? window.cmtResolveExportTarget(destination) : (destination === 'to-print' ? 'toPrint' : null);

  if (window.resolveExportFilenameConflict && (isManagedDest || (destination === 'same-folder' && sameFolderInfo && sameFolderInfo.available))) {
    const conflictReq = isManagedDest
      ? { filename: resolvedPdfName, target: managedTarget }
      : (resolvedAbsPath
        ? { filename: resolvedPdfName, absolutePath: resolvedAbsPath }
        : { filename: resolvedPdfName, target: sameFolderInfo.target, subdir: sameFolderInfo.subdir });
    const conflictRes = await window.resolveExportFilenameConflict(conflictReq);
    if (!conflictRes || conflictRes.canceled) return;
    if (conflictRes.filename && conflictRes.filename !== resolvedPdfName) {
      resolvedPdfName = conflictRes.filename;
      if (resolvedAbsPath) {
        const sep = resolvedAbsPath.indexOf('\\') !== -1 ? '\\' : '/';
        const norm = resolvedAbsPath.replace(/\\/g, '/');
        const idx = norm.lastIndexOf('/');
        const dir = idx > 0 ? resolvedAbsPath.slice(0, idx) : '';
        resolvedAbsPath = dir ? (dir + sep + resolvedPdfName) : resolvedPdfName;
      }
    }
  }

  showToast(t('deExportPdfPreparing') || 'Preparing PDF…');

  if (currentDocType === 'typ') {
    if (!window.TypstService) {
      showToast('Typst service is not available.', true);
      return;
    }
    try {
      const raw = mdEditor ? mdEditor.getValue() : '';
      const pdfTitle = resolvedPdfName.replace(/\.pdf$/i, '');
      const pdfBytes = await TypstService.compileToPdf(raw, { title: pdfTitle });
      const defaultName = resolvedPdfName;

      let result = null;
      if (destination === 'same-folder' && sameFolderInfo && sameFolderInfo.available) {
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        result = await Desktop.saveBlob(sameFolderInfo.target, resolvedPdfName, blob, sameFolderInfo.subdir);
        if (result && !result.name) result.name = resolvedPdfName;
      } else if (isManagedDest && managedTarget) {
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        result = await Desktop.saveBlob(managedTarget, defaultName, blob);
        if (result && !result.name) result.name = defaultName;
      } else {
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < pdfBytes.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, pdfBytes.subarray(i, i + chunkSize));
        }
        result = await Desktop.saveToDisk({
          title: t('deExportPdfDestinationTitle') || 'Export PDF',
          defaultPath: defaultName,
          filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
          content: btoa(binary),
          encoding: 'base64'
        });
      }

      if (result && !result.ok && !result.canceled) {
        showToast((t('deExportPdfFailed') || 'PDF export failed: ') + (result.error || 'unknown'), true);
      } else if (result && result.ok) {
        showToast(
          destination === 'same-folder'
            ? ((t('deExportPdfSameFolderSuccess') || 'PDF saved in the same folder: ') + (result.name || resolvedPdfName))
            : destination === 'to-print'
              ? ((t('deExportPdfToPrintSuccess') || 'PDF saved to Print folder: ') + (result.name || defaultName))
              : (t('deExportPdfSuccess') || 'PDF exported')
        );
        if (window.showExportSuccessPopup && result.path) {
          showExportSuccessPopup(result.path, result.name || defaultName);
        }
      }
    } catch (err) {
      showToast((t('deExportPdfFailed') || 'PDF export failed: ') + (err.message || String(err)), true);
    }
    return;
  }

  const pdfBaseName = resolvedPdfName.replace(/\.pdf$/i, '');
  const { html, pdfOptions } = await deBuildPrintDocumentHtml(pdfBaseName);

  const defaultName = resolvedPdfName;
  const request = { html, defaultName, title: pdfBaseName, pdfOptions };
  if (destination === 'same-folder' && sameFolderInfo && sameFolderInfo.available) {
    if (resolvedAbsPath) {
      request.absolutePath = resolvedAbsPath;
    } else {
      request.target = sameFolderInfo.target;
      request.subdir = sameFolderInfo.subdir;
      request.filename = resolvedPdfName;
    }
  } else if (isManagedDest && managedTarget) {
    request.target = managedTarget;
    request.filename = defaultName;
  }
  const result = await Desktop.printPdf(request);
  if (result && !result.ok && !result.canceled) {
    showToast((t('deExportPdfFailed') || 'PDF export failed: ') + (result.error || 'unknown'), true);
  } else if (result && result.ok) {
    showToast(
      destination === 'same-folder'
        ? ((t('deExportPdfSameFolderSuccess') || 'PDF saved in the same folder: ') + (sameFolderInfo.filename || defaultName))
        : destination === 'to-print'
          ? ((t('deExportPdfToPrintSuccess') || 'PDF saved to Print folder: ') + (result.name || defaultName))
          : (t('deExportPdfSuccess') || 'PDF exported')
    );
    if (window.showExportSuccessPopup && result.path) {
      showExportSuccessPopup(result.path, result.name || defaultName);
    }
  }
}

function extractDocxStylesFromCss(css) {
  if (!css || !css.trim()) return {};
  const cleanCss = String(css).replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = ruleRe.exec(cleanCss)) !== null) {
    const sels = m[1].split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const props = {};
    for (const decl of m[2].split(';')) {
      const idx = decl.indexOf(':');
      if (idx === -1) continue;
      const k = decl.slice(0, idx).trim().toLowerCase();
      const v = decl.slice(idx + 1).trim().replace(/\s*!important\s*$/, '').trim();
      if (k && v) props[k] = v;
    }
    rules.push({ sels, props });
  }
  function collectFor(targets) {
    const merged = {};
    const set = new Set(targets.map(t => t.toLowerCase()));
    for (const r of rules) {
      if (r.sels.some(s => set.has(s))) Object.assign(merged, r.props);
    }
    return merged;
  }
  const base = Object.assign({}, collectFor(['body']), collectFor(['p']), collectFor(['.doc-preview']));
  const toPtStr = (val, refPt) => {
    if (!val) return null;
    const s = String(val).trim().toLowerCase();
    const n = parseFloat(s);
    if (isNaN(n)) return null;
    if (s.endsWith('em') || s.endsWith('rem')) return (n * refPt).toFixed(2).replace(/\.00$/, '') + 'pt';
    if (s.endsWith('px')) return (n * 0.75).toFixed(2).replace(/\.00$/, '') + 'pt';
    if (s.endsWith('pt')) return n + 'pt';
    return val;
  };
  const basePt = parseFloat(toPtStr(base['font-size'], 12)) || (typeof currentPageLayout !== 'undefined' && parseFloat(currentPageLayout.fontSize)) || 12;
  const headings = {};
  for (let i = 1; i <= 6; i++) {
    const h = collectFor(['h' + i]);
    if (Object.keys(h).length) {
      headings[i] = {
        color: h.color || null,
        fontFamily: h['font-family'] || null,
        fontSize: toPtStr(h['font-size'], basePt) || null,
        borderBottomColor: (h['border-bottom'] || h['border-bottom-color'] || '').match(/(#[0-9a-f]{3,8}|rgba?\([^)]+\)|[a-z]+)$/i)?.[1] || null,
        textAlign: h['text-align'] || null
      };
    }
  }
  const bq = collectFor(['blockquote']);
  const tbl = collectFor(['table', 'td', 'th']);
  const th = collectFor(['th', 'thead th']);
  const code = collectFor(['pre', 'code']);
  const link = collectFor(['a']);
  const hr = collectFor(['hr']);
  const borderCol = (val) => (val || '').match(/(#[0-9a-f]{3,8}|rgba?\([^)]+\))/i)?.[1] || null;
  return {
    fontFamily: base['font-family'] || null,
    color: base.color || null,
    lineHeight: base['line-height'] || null,
    fontSize: base['font-size'] || null,
    backgroundColor: base['background-color'] || null,
    headings,
    blockquote: {
      color: bq.color || null,
      backgroundColor: bq['background-color'] || bq.background || null,
      borderColor: borderCol(bq['border-left'] || bq['border-left-color'])
    },
    table: {
      thBg: th['background-color'] || th.background || null,
      thColor: th.color || null,
      borderColor: borderCol(tbl.border || tbl['border-color'] || th.border)
    },
    code: {
      bg: code['background-color'] || code.background || null,
      color: code.color || null,
      fontFamily: code['font-family'] || null
    },
    link: { color: link.color || null },
    hr: { color: borderCol(hr['border-top'] || hr['border-bottom'] || hr.border || hr['background-color']) }
  };
}

function deBuildExportBlocksFromHtml(rawSource) {
  const pc = document.getElementById('preview-content');
  let root = null;
  let isLiveDom = false;
  if (pc && pc.innerHTML && pc.innerHTML.trim()) {
    root = pc;
    isLiveDom = true;
  } else {
    let html = '';
    if (currentDocType === 'html') {
      const extracted = deExtractStyleBlocks(rawSource || '');
      html = extracted.content || '';
    } else {
      html = (typeof marked !== 'undefined' && marked.parse) ? marked.parse(rawSource || '') : (rawSource || '');
    }
    const doc = new DOMParser().parseFromString('<div id="de-exp-root">' + html + '</div>', 'text/html');
    root = doc.getElementById('de-exp-root');
  }
  if (!root) return [];

  const baseFontPt = (typeof currentPageLayout !== 'undefined' && parseFloat(currentPageLayout.fontSize)) || 12;
  const counters = {};

  function cssColorToHex(val) {
    if (!val) return null;
    const s = String(val).trim().toLowerCase();
    if (s === 'transparent' || s === 'none' || s === 'inherit' || s === 'initial') return null;
    if (s.startsWith('#')) {
      if (s.length === 4) return '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
      return s.slice(0, 7);
    }
    const m = s.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
    if (!m) return null;
    const a = m[4] !== undefined ? parseFloat(m[4]) : 1;
    if (a <= 0.01) return null;
    const blend = (c) => Math.round(parseFloat(c) * a + 255 * (1 - a));
    const toHex = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
    return '#' + toHex(blend(m[1])) + toHex(blend(m[2])) + toHex(blend(m[3]));
  }

  function pxToPt(pxStr) {
    const n = parseFloat(pxStr);
    if (isNaN(n) || Math.abs(n) < 0.05) return 0;
    return Math.round(n * 0.75 * 100) / 100;
  }

  function applyCounters(el) {
    if (!isLiveDom || !el || el.nodeType !== 1) return '';
    const cs = getComputedStyle(el);
    const beforeCs = getComputedStyle(el, '::before');

    const parseCounterOps = (str, isReset) => {
      if (!str || str === 'none') return;
      const parts = str.trim().split(/\s+/);
      for (let i = 0; i < parts.length; i++) {
        const name = parts[i];
        if (!name || /^-?\d+$/.test(name)) continue;
        const nextVal = parts[i + 1] && /^-?\d+$/.test(parts[i + 1]) ? parseInt(parts[++i], 10) : (isReset ? 0 : 1);
        if (isReset) counters[name] = nextVal;
        else counters[name] = (counters[name] || 0) + nextVal;
      }
    };
    parseCounterOps(cs.counterReset, true);
    parseCounterOps(cs.counterIncrement, false);
    parseCounterOps(beforeCs.counterIncrement, false);

    const rawContent = beforeCs.content;
    if (!rawContent || rawContent === 'none' || rawContent === 'normal' || rawContent === '""' || rawContent === "''") return '';
    // Evaluate counter(name) expressions and strip CSS string quotes
    let resolved = '';
    const tokenRe = /counter\(\s*([a-zA-Z0-9_-]+)(?:\s*,\s*[^)]+)?\s*\)|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g;
    let tm;
    while ((tm = tokenRe.exec(rawContent)) !== null) {
      if (tm[1]) {
        resolved += String(counters[tm[1]] ?? 0);
      } else {
        const lit = (tm[2] !== undefined ? tm[2] : tm[3] || '')
          .replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
          .replace(/\\(.)/g, '$1');
        resolved += lit;
      }
    }
    return resolved;
  }

  if (isLiveDom) {
    applyCounters(root);
  }

  function getCs(el) {
    return isLiveDom && el && el.nodeType === 1 ? getComputedStyle(el) : null;
  }

  function isPageBreakEl(el) {
    if (!el || el.nodeType !== 1) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === 'pbr') return true;
    const cls = (el.className || '').toString();
    const st = (el.getAttribute('style') || '').toLowerCase();
    if (cls.includes('page-break') || cls.includes('pagebreak') ||
      /page-break-(before|after)\s*:\s*always/.test(st) || /break-(before|after)\s*:\s*page/.test(st)) {
      return true;
    }
    const cs = getCs(el);
    return !!(cs && (cs.pageBreakBefore === 'always' || cs.breakBefore === 'page'));
  }

  function parseInlineStyle(el, inherited) {
    const st = Object.assign({}, inherited || {});
    if (!el || el.nodeType !== 1) return st;
    const tag = el.tagName.toLowerCase();
    if (tag === 'strong' || tag === 'b') st.bold = true;
    if (tag === 'em' || tag === 'i') st.italic = true;
    if (tag === 'u' || tag === 'ins') st.underline = true;
    if (tag === 's' || tag === 'del' || tag === 'strike') st.strike = true;
    if (tag === 'code' || tag === 'kbd' || tag === 'samp') st.code = true;
    if (tag === 'sup') st.sup = true;
    if (tag === 'sub') st.sub = true;
    if (tag === 'mark') st.bg = '#fff59d';

    const cs = getCs(el);
    if (cs) {
      const fw = parseInt(cs.fontWeight, 10);
      if (cs.fontWeight === 'bold' || (!isNaN(fw) && fw >= 600)) st.bold = true;
      if (cs.fontStyle === 'italic') st.italic = true;
      const td = cs.textDecorationLine || cs.textDecoration || '';
      if (td.includes('underline')) st.underline = true;
      if (td.includes('line-through')) st.strike = true;
      const colHex = cssColorToHex(cs.color);
      if (colHex && colHex !== '#222222' && colHex !== '#000000') st.color = colHex;
      const fsPt = pxToPt(cs.fontSize);
      if (fsPt > 0 && Math.abs(fsPt - baseFontPt) > 0.4) st.fontSize = fsPt + 'pt';
    }

    const s = el.style;
    if (s) {
      if (s.fontWeight && (s.fontWeight === 'bold' || parseInt(s.fontWeight, 10) >= 600)) st.bold = true;
      if (s.fontStyle === 'italic') st.italic = true;
      if (s.textDecoration && s.textDecoration.includes('underline')) st.underline = true;
      if (s.textDecoration && s.textDecoration.includes('line-through')) st.strike = true;
      if (s.color) st.color = cssColorToHex(s.color) || s.color;
      if (s.backgroundColor) st.bg = cssColorToHex(s.backgroundColor) || s.backgroundColor;
      if (s.fontFamily) st.font = s.fontFamily;
      if (s.fontSize) st.fontSize = s.fontSize;
    }
    return st;
  }

  function normalizeInlineText(t, preserveWs) {
    if (!t) return '';
    if (preserveWs) return t;
    return t.replace(/[\r\n\t ]+/g, ' ');
  }

  function trimRuns(runs) {
    if (!runs.length) return runs;
    const out = runs.map(r => Object.assign({}, r));
    while (out.length && out[0].type === 'text') {
      out[0].text = out[0].text.replace(/^\s+/, '');
      if (!out[0].text) out.shift();
      else break;
    }
    while (out.length && out[out.length - 1].type === 'text') {
      out[out.length - 1].text = out[out.length - 1].text.replace(/\s+$/, '');
      if (!out[out.length - 1].text) out.pop();
      else break;
    }
    return out;
  }

  function collectRuns(node, inherited, preserveWs = false, skipSelfCounters = true) {
    const runs = [];
    if (!node) return runs;
    for (const ch of node.childNodes) {
      if (ch.nodeType === 3) {
        const t = normalizeInlineText(ch.nodeValue, preserveWs);
        if (t) runs.push(Object.assign({ type: 'text', text: t }, inherited || {}));
      } else if (ch.nodeType === 1) {
        const tag = ch.tagName.toLowerCase();
        if (tag === 'style' || tag === 'script') continue;
        if (tag === 'br') { runs.push({ type: 'br' }); continue; }
        if (tag === 'img') {
          runs.push({
            type: 'image',
            src: ch.getAttribute('src') || '',
            alt: ch.getAttribute('alt') || '',
            width: ch.getAttribute('width') || ch.style.width || '',
            height: ch.getAttribute('height') || ch.style.height || ''
          });
          continue;
        }
        const beforeText = applyCounters(ch);
        const nextStyle = parseInlineStyle(ch, inherited);
        if (tag === 'a') {
          const href = ch.getAttribute('href') || '#';
          const linkRuns = collectRuns(ch, nextStyle, preserveWs, true);
          if (beforeText) linkRuns.unshift(Object.assign({ type: 'text', text: beforeText }, nextStyle));
          runs.push({ type: 'link', href, runs: linkRuns });
          continue;
        }
        if (beforeText) runs.push(Object.assign({ type: 'text', text: beforeText }, nextStyle));
        runs.push(...collectRuns(ch, nextStyle, preserveWs, true));
      }
    }
    return runs;
  }

  function blockAlign(el) {
    const cs = getCs(el);
    const a = (el?.style?.textAlign) || el?.getAttribute?.('align') || (cs ? cs.textAlign : null);
    if (!a || a === 'start') return null;
    return a;
  }

  function extractBlockBoxStyle(el) {
    const cs = getCs(el);
    if (!cs) return {};
    const box = {};
    const bg = cssColorToHex(cs.backgroundColor);
    if (bg && bg !== '#ffffff') box.bg = bg;
    const bbw = pxToPt(cs.borderBottomWidth);
    if (bbw > 0 && cs.borderBottomStyle && cs.borderBottomStyle !== 'none') {
      box.borderBottom = {
        widthPt: bbw,
        style: cs.borderBottomStyle,
        color: cssColorToHex(cs.borderBottomColor) || '#888888'
      };
    }
    const mt = pxToPt(cs.marginTop);
    const mb = pxToPt(cs.marginBottom);
    const ml = pxToPt(cs.marginLeft);
    const mr = pxToPt(cs.marginRight);
    if (mt > 0) box.marginTop = mt;
    if (mb > 0) box.marginBottom = mb;
    if (ml > 0) box.marginLeft = ml;
    if (mr > 0) box.marginRight = mr;
    const pt = pxToPt(cs.paddingTop);
    const pb = pxToPt(cs.paddingBottom);
    const pl = pxToPt(cs.paddingLeft);
    if (pt > 0 || pb > 0 || pl > 0) box.padding = { top: pt, bottom: pb, left: pl };
    return box;
  }

  const BLOCK_TAGS = new Set(['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'hr', 'ul', 'ol', 'table', 'section', 'article', 'header', 'footer', 'main', 'page', 'pbr', 'instruction', 'question', 'item', 'nbline', 'line']);

  function isBlockElement(el) {
    if (!el || el.nodeType !== 1) return false;
    const tag = el.tagName.toLowerCase();
    if (BLOCK_TAGS.has(tag)) return true;
    const cs = getCs(el);
    return !!(cs && (cs.display === 'block' || cs.display === 'flex' || cs.display === 'grid' || cs.display === 'table' || cs.display === 'list-item'));
  }

  function hasBlockChildren(el) {
    for (const ch of el.children) {
      const tag = ch.tagName.toLowerCase();
      if (tag === 'style' || tag === 'script') continue;
      if (isBlockElement(ch)) return true;
    }
    return false;
  }

  function collectListItems(container, inherited) {
    const items = [];
    for (const ch of container.children) {
      const tag = ch.tagName.toLowerCase();
      if (tag === 'li') {
        const liStyle = parseInlineStyle(ch, inherited);
        const subLists = [];
        const clone = ch.cloneNode(true);
        Array.from(clone.children).forEach(c => {
          const ct = c.tagName.toLowerCase();
          if (ct === 'ul' || ct === 'ol') { subLists.push(c); c.remove(); }
        });
        // Collect runs from live ch excluding nested ul/ol so computed styles work!
        const runs = [];
        for (const lc of ch.childNodes) {
          if (lc.nodeType === 3) {
            const t = normalizeInlineText(lc.nodeValue, false);
            if (t) runs.push(Object.assign({ type: 'text', text: t }, liStyle));
          } else if (lc.nodeType === 1) {
            const lct = lc.tagName.toLowerCase();
            if (lct === 'ul' || lct === 'ol') continue;
            if (lct === 'br') { runs.push({ type: 'br' }); continue; }
            const nextSt = parseInlineStyle(lc, liStyle);
            runs.push(...collectRuns(lc, nextSt, false, true));
          }
        }
        const parsedSubLists = subLists.map(sl => parseListEl(sl, liStyle));
        items.push({ runs: trimRuns(runs), lists: parsedSubLists, children: parsedSubLists });
      } else if (tag !== 'ul' && tag !== 'ol') {
        // Handle wrappers like <b><li>...</li></b>
        items.push(...collectListItems(ch, parseInlineStyle(ch, inherited)));
      }
    }
    return items;
  }

  function parseListEl(listEl, inherited) {
    const cs = getCs(listEl);
    const listStyle = parseInlineStyle(listEl, inherited);
    let bulletChar = null;
    if (cs && cs.listStyleType) {
      const lst = cs.listStyleType.trim();
      if (lst.startsWith('"') || lst.startsWith("'")) {
        bulletChar = lst.slice(1, -1).replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16))).trim();
      }
    }
    return {
      type: 'list',
      ordered: listEl.tagName.toLowerCase() === 'ol',
      bulletChar,
      items: collectListItems(listEl, listStyle)
    };
  }

  function walkBlocks(container) {
    const blocks = [];
    let inlineBuf = [];
    let inlineFlexGroup = [];

    function flushInlineFlex() {
      if (inlineFlexGroup.length >= 2) {
        const cells = inlineFlexGroup.map(el => ({
          align: blockAlign(el),
          runs: trimRuns(collectRuns(el, parseInlineStyle(el)))
        }));
        blocks.push({ type: 'table', borderless: true, header: [], rows: [cells] });
        inlineFlexGroup = [];
        return true;
      }
      if (inlineFlexGroup.length === 1) {
        const el = inlineFlexGroup[0];
        inlineBuf.push(...collectRuns(el, parseInlineStyle(el)));
        inlineFlexGroup = [];
      }
      return false;
    }

    function flushInline() {
      flushInlineFlex();
      const trimmed = trimRuns(inlineBuf);
      const nonWs = trimmed.some(r => r.type !== 'text' || r.text.trim() !== '');
      if (nonWs) blocks.push({ type: 'paragraph', runs: trimmed });
      inlineBuf = [];
    }

    for (const ch of container.childNodes) {
      if (ch.nodeType === 8) {
        if (/page-?break/i.test(ch.nodeValue || '')) { flushInline(); blocks.push({ type: 'pagebreak' }); }
        continue;
      }
      if (ch.nodeType === 3) {
        const t = normalizeInlineText(ch.nodeValue, false);
        if (t) {
          if (inlineFlexGroup.length && t.trim() === '') continue;
          flushInlineFlex();
          inlineBuf.push({ type: 'text', text: t });
        }
        continue;
      }
      if (ch.nodeType !== 1) continue;
      const tag = ch.tagName.toLowerCase();
      if (tag === 'style' || tag === 'script' || ch.classList?.contains('de-fp-ruler')) continue;

      const hasPageBreak = isPageBreakEl(ch);
      if (hasPageBreak) {
        flushInline();
        blocks.push({ type: 'pagebreak' });
        if (tag === 'pbr' || (ch.children.length === 0 && ch.textContent.trim() === '')) continue;
      }

      const cs = getCs(ch);
      if (cs && (cs.display === 'inline-flex' || cs.display === 'inline-block') && cs.width && cs.width !== 'auto' && !isBlockElement(ch)) {
        if (!inlineBuf.some(r => r.type !== 'text' || r.text.trim() !== '')) {
          inlineBuf = [];
          inlineFlexGroup.push(ch);
          continue;
        }
      }

      if (/^h[1-6]$/.test(tag)) {
        flushInline();
        const d = parseInt(tag[1], 10);
        const beforeText = applyCounters(ch);
        const hRuns = collectRuns(ch, parseInlineStyle(ch));
        if (beforeText) hRuns.unshift(Object.assign({ type: 'text', text: beforeText }, parseInlineStyle(ch)));
        blocks.push({ type: 'heading', depth: d, level: d, align: blockAlign(ch), runs: trimRuns(hRuns) });
      } else if (tag === 'p') {
        flushInline();
        const beforeText = applyCounters(ch);
        const pStyle = parseInlineStyle(ch);
        const runs = collectRuns(ch, pStyle);
        if (beforeText) runs.unshift(Object.assign({ type: 'text', text: beforeText }, pStyle));
        const trimmed = trimRuns(runs);
        if (trimmed.length || ch.innerHTML.trim() === '') {
          blocks.push(Object.assign({ type: 'paragraph', align: blockAlign(ch), runs: trimmed }, extractBlockBoxStyle(ch)));
        }
      } else if (tag === 'blockquote') {
        flushInline();
        blocks.push({ type: 'blockquote', blocks: walkBlocks(ch) });
      } else if (tag === 'pre') {
        flushInline();
        blocks.push({ type: 'code', text: ch.textContent || '' });
      } else if (tag === 'hr') {
        flushInline();
        blocks.push({ type: 'hr' });
      } else if (tag === 'ul' || tag === 'ol') {
        flushInline();
        blocks.push(parseListEl(ch));
      } else if (tag === 'table') {
        flushInline();
        const header = [];
        const rows = [];
        const theadTrs = Array.from(ch.querySelectorAll('thead > tr'));
        const tbodyTrs = Array.from(ch.querySelectorAll('tbody > tr'));
        const directTrs = Array.from(ch.children).filter(c => c.tagName.toLowerCase() === 'tr');
        const allTrs = theadTrs.length || tbodyTrs.length ? [...theadTrs, ...tbodyTrs] : directTrs;
        allTrs.forEach((tr, idx) => {
          const cells = Array.from(tr.children).filter(c => c.tagName.toLowerCase() === 'th' || c.tagName.toLowerCase() === 'td');
          const mapped = cells.map(c => ({
            align: blockAlign(c),
            bg: cssColorToHex(getCs(c)?.backgroundColor || c.style?.backgroundColor) || null,
            runs: trimRuns(collectRuns(c, parseInlineStyle(c)))
          }));
          if (idx === 0 && (theadTrs.length > 0 || cells.every(c => c.tagName.toLowerCase() === 'th'))) {
            header.push(...mapped);
          } else {
            rows.push(mapped);
          }
        });
        blocks.push({ type: 'table', header, rows });
      } else if (isBlockElement(ch)) {
        flushInline();
        const beforeText = applyCounters(ch);
        if (hasBlockChildren(ch)) {
          if (beforeText) {
            const st = parseInlineStyle(ch);
            blocks.push(Object.assign({ type: 'paragraph', align: blockAlign(ch), runs: [{ type: 'text', text: beforeText, ...st }] }, extractBlockBoxStyle(ch)));
          }
          blocks.push(...walkBlocks(ch));
        } else {
          const st = parseInlineStyle(ch);
          const box = extractBlockBoxStyle(ch);
          const runs = collectRuns(ch, st);
          if (beforeText) runs.unshift(Object.assign({ type: 'text', text: beforeText }, st));
          const trimmed = trimRuns(runs);
          if (trimmed.length || box.borderBottom || box.bg) {
            blocks.push(Object.assign({ type: 'paragraph', align: blockAlign(ch), runs: trimmed }, box));
          }
        }
      } else {
        flushInlineFlex();
        const beforeText = applyCounters(ch);
        const nextSt = parseInlineStyle(ch);
        if (beforeText) inlineBuf.push(Object.assign({ type: 'text', text: beforeText }, nextSt));
        inlineBuf.push(...collectRuns(ch, nextSt));
      }
    }
    flushInline();
    return blocks;
  }
  return walkBlocks(root);
}

async function collectDocxImages(markdown) {
  if (!window.Desktop || !Desktop.isElectron() || !markdown) return {};
  const map = {};
  const mdRegex = /!\[[^\]]*\]\(([^)\s"']+)/g;
  const htmlRegex = /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi;
  const sources = new Set();
  let m;
  while ((m = mdRegex.exec(markdown)) !== null) {
    if (m[1]) sources.add(m[1]);
  }
  while ((m = htmlRegex.exec(markdown)) !== null) {
    if (m[1]) sources.add(m[1]);
  }

  for (const src of sources) {
    if (!src || src.startsWith('http://') || src.startsWith('https://')) continue;
    if (map[src]) continue;
    try {
      let base64Data = '';
      let mime = 'image/png';

      if (src.startsWith('data:')) {
        const match = src.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mime = match[1];
          base64Data = match[2];
        } else {
          const comma = src.indexOf(',');
          if (comma !== -1) base64Data = src.slice(comma + 1);
        }
      } else {
        const relativePath = decodeURIComponent(src.replace(/\?.*$/, ''));
        const filename = relativePath.split('/').pop() || '';
        const ext = (filename.split('.').pop() || 'png').toLowerCase();
        mime = IMAGE_MIME_MAP[ext] || 'image/png';

        let r = await Desktop.readByPath('docEditorDocs', relativePath, { encoding: 'base64' });
        if ((!r || !r.ok || !r.content) && currentDocSubdir && !relativePath.startsWith(currentDocSubdir + '/')) {
          r = await Desktop.readByPath('docEditorDocs', currentDocSubdir + '/' + relativePath, { encoding: 'base64' });
        }
        if (r && r.content) {
          base64Data = r.content;
        }
      }

      if (base64Data) {
        const dataUrl = 'data:' + mime + ';base64,' + base64Data;
        const dims = await new Promise(resolve => {
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth || 600, height: img.naturalHeight || 400 });
          img.onerror = () => resolve({ width: 600, height: 400 });
          img.src = dataUrl;
        });
        map[src] = { data: base64Data, width: dims.width, height: dims.height };
      }
    } catch (e) { }
  }
  return map;
}

async function exportDocx() {
  if (!window.Desktop || !Desktop.isElectron()) {
    showToast('DOCX export requires the Electron desktop app.', true);
    return;
  }
  deSyncPageLayoutFromControls();
  deSyncCssEditorWithLayout(true);
  showToast('Preparing DOCX…');
  const markdown = mdEditor.getValue();
  const blocks = deBuildExportBlocksFromHtml(markdown);
  const [cssStyles, images] = await Promise.all([
    Promise.resolve(extractDocxStylesFromCss(cssEditor ? cssEditor.getValue() : '')),
    collectDocxImages(markdown)
  ]);
  const result = await Desktop.exportDocx({
    markdown,
    blocks,
    styles: cssStyles,
    defaultName: currentDocName || 'document',
    fontFamily: cssStyles.fontFamily || pageLayout.fontFamily,
    fontSize: cssStyles.fontSize || pageLayout.fontSize,
    color: cssStyles.color || null,
    lineHeight: cssStyles.lineHeight || null,
    margins: pageLayout.margins,
    size: pageLayout.size,
    customW: pageLayout.customW,
    customH: pageLayout.customH,
    orientation: pageLayout.orientation,
    imageWidth: pageLayout.imageWidth || 'auto',
    pageNumbers: !!pageLayout.pageNumbers,
    pageNumbersPos: pageLayout.pageNumbersPos || 'center',
    footer: !!pageLayout.footer,
    footerText: pageLayout.footerText || '',
    footerAlign: pageLayout.footerAlign || 'center',
    images
  });
  if (result && result.ok) {
    showToast('DOCX exported');
    if (window.showExportSuccessPopup && result.path) {
      showExportSuccessPopup(result.path, result.name || ((currentDocName || 'document') + '.docx'));
    }
  } else if (result && !result.ok && !result.canceled) {
    showToast('DOCX export failed: ' + (result.error || 'unknown'), true);
  }
}

async function exportOdt() {
  if (!window.Desktop || !Desktop.isElectron()) {
    showToast(t('deOdtRequiresElectron') || 'ODT export requires the Electron desktop app.', true);
    return;
  }
  deSyncPageLayoutFromControls();
  deSyncCssEditorWithLayout(true);
  showToast(t('dePreparingOdt') || 'Preparing ODT…');
  const markdown = mdEditor.getValue();
  const blocks = deBuildExportBlocksFromHtml(markdown);
  const [cssStyles, images] = await Promise.all([
    Promise.resolve(extractDocxStylesFromCss(cssEditor ? cssEditor.getValue() : '')),
    collectDocxImages(markdown)
  ]);
  const result = await Desktop.exportOdt({
    markdown,
    blocks,
    styles: cssStyles,
    defaultName: currentDocName || 'document',
    fontFamily: cssStyles.fontFamily || pageLayout.fontFamily,
    fontSize: cssStyles.fontSize || pageLayout.fontSize,
    color: cssStyles.color || null,
    lineHeight: cssStyles.lineHeight || null,
    margins: pageLayout.margins,
    size: pageLayout.size,
    customW: pageLayout.customW,
    customH: pageLayout.customH,
    orientation: pageLayout.orientation,
    imageWidth: pageLayout.imageWidth || 'auto',
    pageNumbers: !!pageLayout.pageNumbers,
    pageNumbersPos: pageLayout.pageNumbersPos || 'center',
    footer: !!pageLayout.footer,
    footerText: pageLayout.footerText || '',
    footerAlign: pageLayout.footerAlign || 'center',
    images
  });
  if (result && result.ok) {
    showToast(t('deOdtExported') || 'ODT exported successfully');
    if (window.showExportSuccessPopup && result.path) {
      showExportSuccessPopup(result.path, result.name || ((currentDocName || 'document') + '.odt'));
    }
  } else if (result && !result.ok && !result.canceled) {
    showToast((t('deOdtFailed') || 'ODT export failed: ') + (result.error || 'unknown'), true);
  }
}

// ── Page Layout ───────────────────────────────────────────
const PAGE_SIZES = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  A5: { w: 148, h: 210 },
  Letter: { w: 216, h: 279 },
  Legal: { w: 216, h: 356 },
};

const MARGIN_PRESETS = {
  Normal: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 },
  Narrow: { top: 12.7, right: 12.7, bottom: 12.7, left: 12.7 },
  Wide: { top: 25.4, right: 38.1, bottom: 25.4, left: 38.1 },
  Minimal: { top: 10, right: 10, bottom: 10, left: 10 },
  None: { top: 0, right: 0, bottom: 0, left: 0 },
};

const DEFAULT_PAGE_LAYOUT = {
  orientation: 'portrait',
  size: 'A4',
  customW: 210,
  customH: 297,
  margins: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 },
  fontFamily: "'Segoe UI', system-ui, sans-serif",
  fontSize: 11,
  pageNumbers: false,
  pageNumbersPos: 'center',
  footer: false,
  footerText: '',
  footerAlign: 'center',
  imageWidth: 'auto'
};

try {
  const _s = (window.Desktop && typeof Desktop.getPdfExportSettings === 'function')
    ? Desktop.getPdfExportSettings()
    : ((typeof getPdfExportSettings === 'function') ? getPdfExportSettings() : null);
  if (_s) {
    if (_s.pageSize) DEFAULT_PAGE_LAYOUT.size = _s.pageSize;
    if (_s.orientation) DEFAULT_PAGE_LAYOUT.orientation = _s.orientation;
  }
} catch (_) {}

let pageLayout = deCloneDefaultPageLayout();
let editorLayoutDefaults = deCloneDefaultPageLayout();

function resetPageLayout() {
  const defaults = deClonePageLayout(editorLayoutDefaults);
  Object.assign(pageLayout, defaults);
  pageLayout.margins = { ...defaults.margins };
}

function getPageDims() {
  let w, h;
  if (pageLayout.size === 'Custom') {
    w = pageLayout.customW;
    h = pageLayout.customH;
  } else {
    const d = PAGE_SIZES[pageLayout.size] || PAGE_SIZES.A4;
    w = d.w; h = d.h;
  }
  return pageLayout.orientation === 'landscape' ? { w: h, h: w } : { w, h };
}

function updatePreviewFooter() {
  const container = document.getElementById('preview-content');
  if (!container || container.classList.contains('paged-mode')) return;
  const existing = container.querySelector('.de-preview-footer');
  if (existing) existing.remove();
  if (pageLayout.footer && (pageLayout.footerText || '').trim()) {
    const el = document.createElement('div');
    el.className = 'de-preview-footer';
    el.style.textAlign = pageLayout.footerAlign || 'center';
    el.textContent = pageLayout.footerText;
    container.appendChild(el);
  }
}

function applyPageLayoutToPreview() {
  const MM2PX = 3.7795;
  const PT2PX = 1.3333;
  const dims = getPageDims();
  const m = pageLayout.margins;
  const ff = pageLayout.fontFamily || "'Segoe UI', system-ui, sans-serif";
  const fs = (pageLayout.fontSize || 11) * PT2PX;
  const imgW = pageLayout.imageWidth || 'auto';
  const imgCss = imgW === 'auto'
    ? '.doc-preview img, .doc-page-body img { max-width: 100%; height: auto; }\n'
    : '.doc-preview img, .doc-page-body img { width: ' + imgW + '; max-width: 100%; height: auto; }\n';

  const pageWPx = dims.w * MM2PX;
  const pageHPx = dims.h * MM2PX;
  const padTopPx = m.top * MM2PX;
  const padRightPx = m.right * MM2PX;
  const padBottomPx = m.bottom * MM2PX;
  const padLeftPx = m.left * MM2PX;

  document.getElementById('page-layout-style').textContent =
    ':root {\n' +
    ' --page-w: ' + pageWPx + 'px;\n' +
    ' --page-h: ' + pageHPx + 'px;\n' +
    ' --page-pad-top: ' + padTopPx + 'px;\n' +
    ' --page-pad-right: ' + padRightPx + 'px;\n' +
    ' --page-pad-bottom: ' + padBottomPx + 'px;\n' +
    ' --page-pad-left: ' + padLeftPx + 'px;\n' +
    ' --page-font-family: ' + ff + ';\n' +
    ' --page-font-size: ' + fs + 'px;\n' +
    '}\n' +
    '.doc-preview:not(.paged-mode) {\n' +
    ' max-width: ' + pageWPx + 'px !important;\n' +
    ' padding: ' + padTopPx + 'px ' + padRightPx + 'px ' + padBottomPx + 'px ' + padLeftPx + 'px !important;\n' +
    ' font-family: ' + ff + ';\n' +
    ' font-size: ' + fs + 'px;\n' +
    '}\n' +
    '.doc-page-sheet {\n' +
    ' width: ' + pageWPx + 'px;\n' +
    ' min-height: ' + pageHPx + 'px;\n' +
    ' max-height: ' + pageHPx + 'px;\n' +
    '}\n' +
    '.doc-page-body {\n' +
    ' padding: ' + padTopPx + 'px ' + padRightPx + 'px ' + padBottomPx + 'px ' + padLeftPx + 'px !important;\n' +
    ' font-family: ' + ff + ';\n' +
    ' font-size: ' + fs + 'px;\n' +
    '}\n' +
    imgCss;

  if (currentDocType !== 'typ') {
    renderPreview();
  }
}

function deSyncPageLayoutFromControls() {
  const getEl = id => document.getElementById(id);
  const sizeEl = getEl('pl-size');
  if (!sizeEl) return;

  pageLayout.orientation = getEl('pl-landscape') && getEl('pl-landscape').classList.contains('active')
    ? 'landscape'
    : 'portrait';
  pageLayout.size = sizeEl.value || pageLayout.size;
  pageLayout.customW = parseFloat(getEl('pl-custom-w') && getEl('pl-custom-w').value) || pageLayout.customW;
  pageLayout.customH = parseFloat(getEl('pl-custom-h') && getEl('pl-custom-h').value) || pageLayout.customH;
  pageLayout.margins.top = parseFloat(getEl('pl-mt') && getEl('pl-mt').value) || 0;
  pageLayout.margins.right = parseFloat(getEl('pl-mr') && getEl('pl-mr').value) || 0;
  pageLayout.margins.bottom = parseFloat(getEl('pl-mb') && getEl('pl-mb').value) || 0;
  pageLayout.margins.left = parseFloat(getEl('pl-ml') && getEl('pl-ml').value) || 0;
  pageLayout.fontFamily = (getEl('pl-font-family') && getEl('pl-font-family').value) || pageLayout.fontFamily;
  pageLayout.fontSize = parseFloat(getEl('pl-font-size') && getEl('pl-font-size').value) || pageLayout.fontSize;
  pageLayout.imageWidth = (getEl('pl-image-width') && getEl('pl-image-width').value) || pageLayout.imageWidth;
  pageLayout.pageNumbers = !!(getEl('pl-page-numbers') && getEl('pl-page-numbers').checked);
  pageLayout.pageNumbersPos = (getEl('pl-page-numbers-pos') && getEl('pl-page-numbers-pos').value) || pageLayout.pageNumbersPos;
  pageLayout.footer = !!(getEl('pl-footer') && getEl('pl-footer').checked);
  pageLayout.footerText = (getEl('pl-footer-text') && getEl('pl-footer-text').value) || '';
  pageLayout.footerAlign = getEl('pl-footer-left') && getEl('pl-footer-left').classList.contains('active')
    ? 'left'
    : (getEl('pl-footer-right') && getEl('pl-footer-right').classList.contains('active') ? 'right' : 'center');
}

/**
 * Walk a container's child nodes and replace HTML comment nodes whose
 * text matches "pagebreak" / "page-break" with a real element so the
 * pagination logic can detect them. Works for both MD and HTML modes.
 */
function _deExpandPageBreakComments(container) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_COMMENT);
  const commentsToReplace = [];
  let node;
  while ((node = walker.nextNode())) {
    const text = (node.textContent || '').trim().toLowerCase();
    if (/^page[-_ ]*break$/i.test(text)) {
      commentsToReplace.push(node);
    }
  }

  commentsToReplace.forEach(commentNode => {
    if (!commentNode.parentNode) return;
    const el = document.createElement('div');
    el.className = 'de-page-break';

    const parent = commentNode.parentNode;
    // If the comment is wrapped in a paragraph and it is the only text content of that paragraph,
    // replace the whole paragraph to prevent empty paragraph layout issues.
    if (parent.tagName === 'P' && parent.textContent.trim() === '') {
      if (parent.parentNode) {
        parent.parentNode.replaceChild(el, parent);
      }
    } else {
      parent.replaceChild(el, commentNode);
    }
  });
}

function _deUnwrapPagedWrappers(root) {
  if (!root) return;
  root.querySelectorAll('.doc-page-header, .doc-page-footer, .de-page-break-divider, .de-preview-footer, .de-fp-ruler')
    .forEach(el => el.remove());
  let wrapper;
  while ((wrapper = root.querySelector('.doc-page-sheet, .doc-page-body, .doc-page-content'))) {
    const parent = wrapper.parentNode;
    if (!parent) break;
    while (wrapper.firstChild) {
      parent.insertBefore(wrapper.firstChild, wrapper);
    }
    wrapper.remove();
  }
}

async function deRenderPagedPreview(container, html) {
  if (!container) return 1;

  const seq = (container._dePagedSeq = (container._dePagedSeq || 0) + 1);
  container.classList.add('doc-pages-container', 'paged-mode');
  container.innerHTML = '';

  const MM2PX = 3.7795;
  const dims = getPageDims();
  const pageWPx = Math.round(dims.w * MM2PX);
  const pageHPx = Math.round(dims.h * MM2PX);
  const m = pageLayout.margins;
  const padTop = Math.round(m.top * MM2PX);
  const padRight = Math.round(m.right * MM2PX);
  const padBottom = Math.round(m.bottom * MM2PX);
  const padLeft = Math.round(m.left * MM2PX);

  // Usable content height inside the page sheet
  const usableH = Math.max(100, pageHPx - padTop - padBottom);

  // Parse HTML in sandbox
  const sandbox = document.createElement('div');
  sandbox.innerHTML = html || '<p><br></p>';
  _deUnwrapPagedWrappers(sandbox);
  if (container.id && typeof deScopeCssForContainer === 'function') {
    sandbox.querySelectorAll('style').forEach(styleEl => {
      styleEl.textContent = deScopeCssForContainer(styleEl.textContent || '', '#' + container.id);
    });
  }
  _deExpandPageBreakComments(sandbox);
  _deHoistNestedPageBreaks(sandbox);
  await fixPreviewImages(sandbox);
  if (container._dePagedSeq !== seq) return 1;
  container.innerHTML = '';

  // Group inline children into block elements
  const blocks = [];
  let inlineBuffer = [];
  const flushInline = () => {
    if (inlineBuffer.length > 0) {
      const p = document.createElement('p');
      inlineBuffer.forEach(n => p.appendChild(n));
      blocks.push(p);
      inlineBuffer = [];
    }
  };

  Array.from(sandbox.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent.trim().length > 0) {
        inlineBuffer.push(node);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toUpperCase();
      const isInline = ['SPAN', 'A', 'STRONG', 'EM', 'B', 'I', 'U', 'SMALL', 'CODE'].includes(tag);
      if (isInline && !node.classList.contains('math-display')) {
        inlineBuffer.push(node);
      } else {
        flushInline();
        blocks.push(node);
      }
    }
  });
  flushInline();

  if (blocks.length === 0) {
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    blocks.push(p);
  }

  function createSheet(pageNum) {
    const sheet = document.createElement('div');
    sheet.className = 'doc-page-sheet';
    sheet.setAttribute('data-page', String(pageNum));
    sheet.style.width = pageWPx + 'px';
    sheet.style.height = pageHPx + 'px';
    sheet.style.minHeight = pageHPx + 'px';
    sheet.style.maxHeight = pageHPx + 'px';

    const body = document.createElement('div');
    body.className = 'doc-page-body';
    body.style.padding = `${padTop}px ${padRight}px ${padBottom}px ${padLeft}px`;

    const content = document.createElement('div');
    content.className = 'doc-page-content';
    body.appendChild(content);
    sheet.appendChild(body);

    if (pageLayout.footer || pageLayout.pageNumbers) {
      const footer = document.createElement('div');
      footer.className = 'doc-page-footer';
      footer.style.paddingLeft = padLeft + 'px';
      footer.style.paddingRight = padRight + 'px';
      footer.style.height = Math.max(padBottom, 24) + 'px';

      const textEl = document.createElement('span');
      textEl.className = 'doc-page-footer-text';
      if (pageLayout.footer && pageLayout.footerText) {
        textEl.textContent = pageLayout.footerText;
        textEl.style.textAlign = pageLayout.footerAlign || 'center';
      }

      const numEl = document.createElement('span');
      numEl.className = 'doc-page-footer-num';
      numEl.setAttribute('data-page-index', String(pageNum));

      const pos = pageLayout.pageNumbersPos || 'center';
      if (pos === 'left') {
        if (pageLayout.pageNumbers) footer.appendChild(numEl);
        footer.appendChild(textEl);
      } else if (pos === 'right') {
        footer.appendChild(textEl);
        if (pageLayout.pageNumbers) footer.appendChild(numEl);
      } else {
        const spacer1 = document.createElement('span');
        spacer1.style.width = '30px';
        footer.appendChild(spacer1);
        if (pageLayout.pageNumbers) footer.appendChild(numEl);
        else footer.appendChild(textEl);
        const spacer2 = document.createElement('span');
        spacer2.style.width = '30px';
        footer.appendChild(spacer2);
      }
      sheet.appendChild(footer);
    }

    return { sheet, body, content };
  }

  const sheets = [];
  let currentSheet = createSheet(1);
  sheets.push(currentSheet);
  container.appendChild(currentSheet.sheet);

  for (let i = 0; i < blocks.length; i++) {
    const el = blocks[i];

    // Check for manual page break
    if (_deIsManualPageBreak(el)) {
      if (currentSheet.content.childNodes.length > 0) {
        const divider = document.createElement('div');
        divider.className = 'de-page-break-divider';
        divider.innerHTML = '<span>PAGE BREAK</span>';
        container.appendChild(divider);
        currentSheet = createSheet(sheets.length + 1);
        sheets.push(currentSheet);
        container.appendChild(currentSheet.sheet);
      }
      continue;
    }

    currentSheet.content.appendChild(el);

    const isBrk = v => /^(always|page|left|right)$/.test(v || '');
    const elCs = window.getComputedStyle(el);
    // CSS break-before / page-break-before
    if ((isBrk(elCs.breakBefore) || isBrk(elCs.pageBreakBefore)) && currentSheet.content.children.length > 1) {
      currentSheet.content.removeChild(el);
      currentSheet = createSheet(sheets.length + 1);
      sheets.push(currentSheet);
      container.appendChild(currentSheet.sheet);
      currentSheet.content.appendChild(el);
    }
    const forceBreakAfter = isBrk(elCs.breakAfter) || isBrk(elCs.pageBreakAfter);

    // Split tables across pages by rows (matches print-to-PDF), unless break-inside: avoid
    const avoidInside = /avoid/.test(elCs.breakInside || '') || /avoid/.test(elCs.pageBreakInside || '');
    if (el.tagName === 'TABLE' && !avoidInside && el.tBodies.length === 1 &&
      el.tBodies[0].rows.length > 1 && currentSheet.content.offsetHeight > usableH) {
      const rows = Array.from(el.tBodies[0].rows);
      rows.forEach(r => r.remove());
      let curTable = el;
      let curBody = el.tBodies[0];
      for (const row of rows) {
        curBody.appendChild(row);
        if (currentSheet.content.offsetHeight <= usableH) continue;
        if (curBody.rows.length === 1 && currentSheet.content.children.length > 1 && curTable === el) {
          // Not even header + first row fits: move the whole table (with preceding heading)
          currentSheet.content.removeChild(curTable);
          const lastEl2 = currentSheet.content.lastElementChild;
          let hd = null;
          if (lastEl2 && /^H[1-6]$/.test(lastEl2.tagName) && currentSheet.content.children.length > 1) {
            hd = lastEl2;
            currentSheet.content.removeChild(hd);
          }
          currentSheet = createSheet(sheets.length + 1);
          sheets.push(currentSheet);
          container.appendChild(currentSheet.sheet);
          if (hd) currentSheet.content.appendChild(hd);
          currentSheet.content.appendChild(curTable);
          continue;
        }
        if (curBody.rows.length > 1) {
          curBody.removeChild(row);
          currentSheet = createSheet(sheets.length + 1);
          sheets.push(currentSheet);
          container.appendChild(currentSheet.sheet);
          const next = el.cloneNode(false);
          Array.from(el.children).forEach(ch => {
            if (ch.tagName === 'COLGROUP' || ch.tagName === 'THEAD') next.appendChild(ch.cloneNode(true));
          });
          next.removeAttribute('data-source-line');
          curBody = document.createElement('tbody');
          next.appendChild(curBody);
          curBody.appendChild(row);
          currentSheet.content.appendChild(next);
          curTable = next;
        }
      }
      if (forceBreakAfter && i < blocks.length - 1) {
        currentSheet = createSheet(sheets.length + 1);
        sheets.push(currentSheet);
        container.appendChild(currentSheet.sheet);
      }
      continue;
    }

    // Check overflow against usable height
    if (currentSheet.content.offsetHeight > usableH) {
      if (currentSheet.content.childNodes.length === 1) {
        // First item on sheet is larger than usable height; keep it to prevent infinite loop
        continue;
      }

      // Move this element to the next sheet
      currentSheet.content.removeChild(el);

      // Keep with next: if the last remaining element is a heading (H1-H6)
      // and there is at least one other element before it, move heading together
      const lastEl = currentSheet.content.lastElementChild;
      const isHeading = lastEl && ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(lastEl.tagName.toUpperCase());
      let orphanHeading = null;
      if (isHeading && currentSheet.content.children.length > 1) {
        orphanHeading = lastEl;
        currentSheet.content.removeChild(orphanHeading);
      }

      currentSheet = createSheet(sheets.length + 1);
      sheets.push(currentSheet);
      container.appendChild(currentSheet.sheet);

      if (orphanHeading) {
        currentSheet.content.appendChild(orphanHeading);
      }
      currentSheet.content.appendChild(el);
    }
    if (forceBreakAfter && i < blocks.length - 1) {
      currentSheet = createSheet(sheets.length + 1);
      sheets.push(currentSheet);
      container.appendChild(currentSheet.sheet);
    }
  }

  // Update page numbers: "Page X of N"
  const totalPages = sheets.length;
  container.querySelectorAll('.doc-page-footer-num').forEach(numEl => {
    const idx = numEl.getAttribute('data-page-index') || '1';
    numEl.textContent = 'Page ' + idx + ' / ' + totalPages;
  });

  return totalPages;
}

async function deEnsurePdfjsLib() {
  if (!window._dePdfjsLib) {
    const mod = await import('../modules/pdf.min.mjs');
    mod.GlobalWorkerOptions.workerSrc = new URL('../modules/pdf.worker.min.mjs', location.href).href;
    window._dePdfjsLib = mod;
  }
  return window._dePdfjsLib;
}

async function showFullPreview() {
  const overlay = document.getElementById('full-preview-overlay');
  const content = document.getElementById('full-preview-content');

  const docTitle = getPdfExportBaseName() || (currentDocName ? currentDocName.replace(/\.(md|html|typ)$/i, '') : 'Untitled');
  document.getElementById('full-preview-bar-title').textContent = 'Preview — ' + docTitle;
  overlay.removeAttribute('hidden');

  const expBtn = document.getElementById('btn-full-preview-export');
  if (expBtn && !expBtn._hasClickListener) {
    expBtn._hasClickListener = true;
    expBtn.addEventListener('click', () => exportPdf());
  }

  // Option B1: Electron exact print preview with PDF.js
  if (window.Desktop && Desktop.isElectron()) {
    content.classList.add('doc-preview', 'paged-mode');
    content.innerHTML =
      '<div class="full-preview-loading">' +
      ' <div class="full-preview-spinner"></div>' +
      ' <div>Rendering high-fidelity print preview…</div>' +
      '</div>';

    try {
      const printData = await deBuildPrintDocumentHtml();
      const req = {
        html: printData.html,
        pdfOptions: printData.pdfOptions,
        previewOnly: true
      };

      const result = await Desktop.printPdf(req);
      if (result && result.ok && result.base64) {
        const pdfjsLib = await deEnsurePdfjsLib();
        const binaryStr = atob(result.base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const pdfDoc = await pdfjsLib.getDocument({
          data: bytes,
          standardFontDataUrl: new URL('../modules/standard_fonts/', location.href).href,
          wasmUrl: new URL('../modules/wasm/', location.href).href,
          disableFontFace: false
        }).promise;

        content.innerHTML = '';
        const pagesWrapper = document.createElement('div');
        pagesWrapper.className = 'full-preview-pdf-pages';

        const dpr = Math.max(window.devicePixelRatio || 1, 2);

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          const unscaledViewport = page.getViewport({ scale: 1.0 });
          const displayWidth = Math.min(unscaledViewport.width, 860);
          const scale = (displayWidth / unscaledViewport.width) * dpr;
          const viewport = page.getViewport({ scale });

          const canvasWrap = document.createElement('div');
          canvasWrap.className = 'full-preview-pdf-canvas-wrap';
          canvasWrap.style.width = displayWidth + 'px';

          const canvas = document.createElement('canvas');
          canvas.className = 'full-preview-pdf-canvas';
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = displayWidth + 'px';
          canvas.style.height = (unscaledViewport.height * (displayWidth / unscaledViewport.width)) + 'px';

          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;

          canvasWrap.appendChild(canvas);
          pagesWrapper.appendChild(canvasWrap);
        }

        content.appendChild(pagesWrapper);
        document.getElementById('full-preview-bar-title').textContent =
          'Preview — ' + docTitle + ' (' + pdfDoc.numPages + ' page' + (pdfDoc.numPages !== 1 ? 's' : '') + ')';
        return;
      }
    } catch (err) {
      console.warn('PDF print preview fallback triggered:', err);
    }
  }

  // Fallback: render using DOM paginator
  const fpCssEl = document.getElementById('full-preview-custom-css');
  if (fpCssEl) fpCssEl.textContent = deBuildScopedPreviewCss(cssEditor ? cssEditor.getValue() : '', '#full-preview-content');
  const sourceHtml = document.getElementById('preview-content').innerHTML;
  const pageCount = await deRenderPagedPreview(content, sourceHtml);
  document.getElementById('full-preview-bar-title').textContent =
    'Preview — ' + docTitle + ' (' + pageCount + ' page' + (pageCount !== 1 ? 's' : '') + ')';
}

/** Legacy helper stub */
function deUpdatePageBreakRulers(content) {
  if (!content) return 1;
  const sheets = content.querySelectorAll('.doc-page-sheet, .full-preview-pdf-canvas-wrap');
  return sheets.length > 0 ? sheets.length : 1;
}

/** Hoist manual page-break elements nested inside <p> or simple wrapper blocks to top-level sandbox children */
function _deHoistNestedPageBreaks(sandbox) {
  if (!sandbox) return;
  const candidates = Array.from(sandbox.querySelectorAll('*')).filter(el => _deIsManualPageBreak(el));
  candidates.forEach(pb => {
    while (pb.parentNode && pb.parentNode !== sandbox) {
      const parent = pb.parentNode;
      const tag = parent.tagName ? parent.tagName.toUpperCase() : '';
      // Do not break apart tables or multi-column flex/grid containers
      if (['TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TD', 'TH'].includes(tag)) break;
      const before = parent.cloneNode(false);
      const after = parent.cloneNode(false);
      before.removeAttribute('id');
      after.removeAttribute('id');
      let seenPb = false;
      Array.from(parent.childNodes).forEach(ch => {
        if (ch === pb) {
          seenPb = true;
        } else if (!seenPb) {
          before.appendChild(ch);
        } else {
          after.appendChild(ch);
        }
      });
      const grand = parent.parentNode;
      if (!grand) break;
      const hasBefore = before.textContent.trim().length > 0 || before.querySelector('img, svg, table, br, hr, canvas, video, iframe');
      const hasAfter = after.textContent.trim().length > 0 || after.querySelector('img, svg, table, br, hr, canvas, video, iframe');
      if (hasBefore) grand.insertBefore(before, parent);
      grand.insertBefore(pb, parent);
      if (hasAfter) grand.insertBefore(after, parent);
      grand.removeChild(parent);
    }
  });
}

/** Check if an element represents a manual page break */
function _deIsManualPageBreak(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.classList.contains('de-page-break') || el.classList.contains('page-break') ||
    el.classList.contains('pagebreak') || el.classList.contains('cmt-page-break') ||
    el.classList.contains('mailposting-page-break-hr')) return true;
  const s = el.style;
  if (s && (s.pageBreakAfter === 'always' || s.pageBreakBefore === 'always' ||
    s.breakAfter === 'page' || s.breakBefore === 'page')) {
    const hasContent = el.textContent.trim().length > 0 || !!el.querySelector('img, svg, table, canvas, video, iframe');
    if (!hasContent) return true;
  }
  if (el.dataset && el.dataset.pageBreak === 'after') {
    const hasContent = el.textContent.trim().length > 0 || !!el.querySelector('img, svg, table, canvas, video, iframe');
    if (!hasContent) return true;
  }
  return false;
}

function hideFullPreview() {
  document.getElementById('full-preview-overlay').setAttribute('hidden', '');
}

let _saveLayoutTimer = null;
function savePageLayout() {
  deSyncCssEditorWithLayout(true);
  if (!currentDocName || !window.Desktop || !Desktop.isElectron() || !currentDocStoredInDocs) return;
  clearTimeout(_saveLayoutTimer);
  _saveLayoutTimer = setTimeout(async () => {
    try {
      const r = await deSaveManagedDocSnapshot('docEditorDocs', currentDocName, currentDocSubdir || null);
      if (r && r.ok) {
        docModified = false;
        cssModified = false; scriptModified = false;
        updateDocIndicator();
        await deDeleteLegacyManagedArtifacts(currentDocName, currentDocSubdir || null);
      }
    } catch (e) { }
  }, 300);
}

function loadPageLayout() {
  deSyncCssEditorWithLayout(false);
}

function syncPopupToState() {
  document.getElementById('pl-portrait').classList.toggle('active', pageLayout.orientation === 'portrait');
  document.getElementById('pl-landscape').classList.toggle('active', pageLayout.orientation === 'landscape');
  document.getElementById('pl-size').value = pageLayout.size;
  const isCustom = pageLayout.size === 'Custom';
  document.getElementById('pl-custom-dims').style.display = isCustom ? 'flex' : 'none';
  document.getElementById('pl-custom-w').value = pageLayout.customW;
  document.getElementById('pl-custom-h').value = pageLayout.customH;
  document.getElementById('pl-mt').value = round1(pageLayout.margins.top);
  document.getElementById('pl-mr').value = round1(pageLayout.margins.right);
  document.getElementById('pl-mb').value = round1(pageLayout.margins.bottom);
  document.getElementById('pl-ml').value = round1(pageLayout.margins.left);
  const preset = deDetectMarginPreset(pageLayout.margins);
  document.getElementById('pl-margin-preset').value = preset || 'Custom';
  document.getElementById('pl-font-family').value = pageLayout.fontFamily || "'Segoe UI', system-ui, sans-serif";
  document.getElementById('pl-font-size').value = pageLayout.fontSize || 11;
  document.getElementById('pl-image-width').value = pageLayout.imageWidth || 'auto';
  document.getElementById('pl-page-numbers').checked = !!pageLayout.pageNumbers;
  document.getElementById('pl-page-numbers-pos').value = pageLayout.pageNumbersPos || 'center';
  document.getElementById('pl-page-numbers-pos-row').style.display = pageLayout.pageNumbers ? 'flex' : 'none';
  document.getElementById('pl-footer').checked = !!pageLayout.footer;
  document.getElementById('pl-footer-rows').style.display = pageLayout.footer ? 'flex' : 'none';
  document.getElementById('pl-footer-text').value = pageLayout.footerText || '';
  const fa = pageLayout.footerAlign || 'center';
  ['left', 'center', 'right'].forEach(a =>
    document.getElementById('pl-footer-' + a).classList.toggle('active', fa === a)
  );
}

function round1(v) { return Math.round(v * 10) / 10; }

function initPageLayoutPopup() {
  loadPageLayout();
  syncPopupToState();
  applyPageLayoutToPreview();

  const popup = document.getElementById('page-layout-popup');
  const plBtn = document.getElementById('btn-page-layout');

  function closePageLayoutPopup() {
    if (popup) popup.classList.remove('open');
    if (plBtn) plBtn.classList.remove('active');
  }

  plBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    const isOpen = popup.classList.toggle('open');
    plBtn.classList.toggle('active', isOpen);
    document.querySelectorAll('#app-nav .nav-group.open').forEach(g => g.classList.remove('open'));
    if (isOpen) {
      const rect = this.getBoundingClientRect();
      popup.style.left = Math.min(rect.left, window.innerWidth - 300) + 'px';
      popup.style.top = rect.bottom + 'px';
    }
  });
  document.getElementById('pl-close-btn').addEventListener('click', function (e) {
    e.stopPropagation();
    closePageLayoutPopup();
  });
  document.addEventListener('click', function (e) {
    if (popup && popup.classList.contains('open') && !e.target.closest('#page-layout-wrap')) {
      closePageLayoutPopup();
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && popup && popup.classList.contains('open')) {
      closePageLayoutPopup();
    }
  });

  // Orientation buttons
  document.getElementById('pl-portrait').addEventListener('click', function () {
    pageLayout.orientation = 'portrait';
    syncPopupToState();
    applyPageLayoutToPreview();
    savePageLayout();
  });
  document.getElementById('pl-landscape').addEventListener('click', function () {
    pageLayout.orientation = 'landscape';
    syncPopupToState();
    applyPageLayoutToPreview();
    savePageLayout();
  });

  // Paper size select
  document.getElementById('pl-size').addEventListener('change', function () {
    pageLayout.size = this.value;
    if (this.value !== 'Custom' && PAGE_SIZES[this.value]) {
      pageLayout.customW = PAGE_SIZES[this.value].w;
      pageLayout.customH = PAGE_SIZES[this.value].h;
    }
    syncPopupToState();
    applyPageLayoutToPreview();
    savePageLayout();
  });

  // Custom dimensions
  function onCustomDim() {
    pageLayout.customW = parseFloat(document.getElementById('pl-custom-w').value) || 210;
    pageLayout.customH = parseFloat(document.getElementById('pl-custom-h').value) || 297;
    applyPageLayoutToPreview();
    savePageLayout();
  }
  document.getElementById('pl-custom-w').addEventListener('change', onCustomDim);
  document.getElementById('pl-custom-h').addEventListener('change', onCustomDim);

  // Margin preset
  document.getElementById('pl-margin-preset').addEventListener('change', function () {
    if (this.value === 'Custom') return;
    const p = MARGIN_PRESETS[this.value];
    if (p) {
      pageLayout.margins = { ...p };
      syncPopupToState();
      applyPageLayoutToPreview();
      savePageLayout();
    }
  });

  // Individual margin inputs
  function onMarginInput() {
    pageLayout.margins.top = parseFloat(document.getElementById('pl-mt').value) || 0;
    pageLayout.margins.right = parseFloat(document.getElementById('pl-mr').value) || 0;
    pageLayout.margins.bottom = parseFloat(document.getElementById('pl-mb').value) || 0;
    pageLayout.margins.left = parseFloat(document.getElementById('pl-ml').value) || 0;
    document.getElementById('pl-margin-preset').value = 'Custom';
    applyPageLayoutToPreview();
    savePageLayout();
  }
  ['pl-mt', 'pl-mr', 'pl-mb', 'pl-ml'].forEach(id =>
    document.getElementById(id).addEventListener('change', onMarginInput)
  );

  // Typography
  document.getElementById('pl-font-family').addEventListener('change', function () {
    pageLayout.fontFamily = this.value;
    applyPageLayoutToPreview();
    savePageLayout();
  });
  document.getElementById('pl-font-size').addEventListener('change', function () {
    pageLayout.fontSize = parseFloat(this.value) || 11;
    applyPageLayoutToPreview();
    savePageLayout();
  });

  document.getElementById('pl-image-width').addEventListener('change', function () {
    pageLayout.imageWidth = this.value;
    applyPageLayoutToPreview();
    savePageLayout();
  });

  // Page numbers
  document.getElementById('pl-page-numbers').addEventListener('change', function () {
    pageLayout.pageNumbers = this.checked;
    document.getElementById('pl-page-numbers-pos-row').style.display = this.checked ? 'flex' : 'none';
    savePageLayout();
  });
  document.getElementById('pl-page-numbers-pos').addEventListener('change', function () {
    pageLayout.pageNumbersPos = this.value;
    savePageLayout();
  });

  // Footer
  document.getElementById('pl-footer').addEventListener('change', function () {
    pageLayout.footer = this.checked;
    document.getElementById('pl-footer-rows').style.display = this.checked ? 'flex' : 'none';
    updatePreviewFooter();
    savePageLayout();
  });
  document.getElementById('pl-footer-text').addEventListener('input', function () {
    pageLayout.footerText = this.value;
    updatePreviewFooter();
    savePageLayout();
  });
  ['left', 'center', 'right'].forEach(a => {
    document.getElementById('pl-footer-' + a).addEventListener('click', function () {
      pageLayout.footerAlign = a;
      syncPopupToState();
      updatePreviewFooter();
      savePageLayout();
    });
  });
}

// ── Split pane drag ───────────────────────────────────────
function initSplitDivider() {
  const divider = document.getElementById('split-divider');
  const container = document.getElementById('main-split');
  let dragging = false;

  divider.addEventListener('mousedown', function (e) {
    e.preventDefault();
    dragging = true;
    divider.classList.add('dragging');
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  });

  document.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    const rect = container.getBoundingClientRect();
    const frac = Math.max(0.15, Math.min(0.85, (e.clientX - rect.left) / rect.width));
    splitFraction = frac;
    applySplit();
  });

  document.addEventListener('mouseup', function () {
    if (!dragging) return;
    dragging = false;
    divider.classList.remove('dragging');
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    saveSplitState();
  });
}

function applySplit() {
  const ep = document.getElementById('editor-pane');
  const pp = document.getElementById('preview-pane');
  const sd = document.getElementById('split-divider');
  if (currentViewMode === 'code') {
    if (ep) {
      ep.style.display = 'flex';
      ep.style.flexDirection = 'column';
      ep.style.width = '100%';
      ep.style.flex = '1 1 100%';
    }
    if (pp) pp.style.display = 'none';
    if (sd) sd.style.display = 'none';
  } else if (currentViewMode === 'wysiwyg') {
    if (ep) ep.style.display = 'none';
    if (pp) {
      pp.style.display = 'flex';
      pp.style.flexDirection = 'column';
      pp.style.width = '100%';
      pp.style.flex = '1 1 100%';
    }
    if (sd) sd.style.display = 'none';
  } else {
    if (ep) {
      ep.style.display = 'flex';
      ep.style.flexDirection = 'column';
      ep.style.width = (splitFraction * 100) + '%';
      ep.style.flex = 'none';
    }
    if (pp) {
      pp.style.display = 'flex';
      pp.style.flexDirection = 'column';
      pp.style.width = ((1 - splitFraction) * 100) + '%';
      pp.style.flex = 'none';
    }
    if (sd) sd.style.display = 'block';
  }
  if (mdEditor && currentViewMode !== 'wysiwyg') {
    requestAnimationFrame(() => {
      mdEditor.layout();
    });
  }
}

// ── WYSIWYG View Controller ──────────────────────────────
function deUpdateViewSwitcherState() {
  const wysiwygBtn = document.getElementById('btn-view-wysiwyg');
  if (!wysiwygBtn) return;
  const isHtml = currentDocType === 'html';
  wysiwygBtn.disabled = !isHtml;
  if (!isHtml) {
    wysiwygBtn.title = (window.t ? t('deWysiwygOnlyHtmlTooltip') : 'WYSIWYG editing is available for HTML documents');
    if (currentViewMode === 'wysiwyg') {
      deSetViewMode('split');
    }
  } else {
    wysiwygBtn.title = (window.t ? t('deViewWysiwyg') : 'WYSIWYG');
  }
}

function deSetViewMode(mode) {
  if (mode === 'wysiwyg' && currentDocType !== 'html') {
    showToast(window.t ? t('deWysiwygOnlyHtmlTooltip') : 'WYSIWYG editing is available for HTML documents', true);
    return;
  }
  const prevMode = currentViewMode;
  currentViewMode = mode;
  deClearInspectorHighlights();

  document.querySelectorAll('.de-view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
  });

  const tb = document.getElementById('de-wysiwyg-toolbar');
  const pc = document.getElementById('preview-content');

  if (prevMode === 'wysiwyg' && mode !== 'wysiwyg') {
    deSyncWysiwygToEditor();
  }

  applySplit();

  if (tb) tb.classList.toggle('visible', mode === 'wysiwyg');
  if (pc) pc.contentEditable = (mode === 'wysiwyg') ? 'true' : 'false';

  if (mode === 'code') {
    if (mdEditor) {
      requestAnimationFrame(() => {
        mdEditor.layout();
        setTimeout(() => mdEditor && mdEditor.layout(), 50);
      });
    }
  } else if (mode === 'split') {
    if (mdEditor) {
      requestAnimationFrame(() => {
        mdEditor.layout();
        setTimeout(() => mdEditor && mdEditor.layout(), 50);
      });
    }
    renderPreview();
  } else if (mode === 'wysiwyg') {
    if (pc) {
      pc.classList.remove('paged-mode', 'doc-pages-container');
      const raw = mdEditor ? mdEditor.getValue() : '';
      pc.innerHTML = raw;
      _deUnwrapPagedWrappers(pc);
      _deExpandPageBreakComments(pc);
      fixPreviewImages(pc);
    }
  }
}

function deSyncWysiwygToEditor() {
  if (!mdEditor || currentDocType !== 'html' || currentViewMode !== 'wysiwyg') return;
  const pc = document.getElementById('preview-content');
  if (!pc || pc.classList.contains('paged-mode')) return;

  const clone = pc.cloneNode(true);
  _deUnwrapPagedWrappers(clone);
  clone.querySelectorAll('.de-page-break, .page-break').forEach(el => {
    const comment = document.createComment(' pagebreak ');
    el.replaceWith(comment);
  });
  clone.querySelectorAll('.mp-token-chip').forEach(el => {
    const token = el.getAttribute('data-token') || el.textContent;
    const textNode = document.createTextNode(token);
    el.replaceWith(textNode);
  });

  const cleanHtml = clone.innerHTML;
  if (cleanHtml !== mdEditor.getValue()) {
    wysiwygIsUpdatingFromEditor = true;
    const pos = mdEditor.getPosition();
    mdEditor.setValue(cleanHtml);
    if (pos) mdEditor.setPosition(pos);
    wysiwygIsUpdatingFromEditor = false;
    docModified = true;
    updateDocIndicator();
  }
}

function deExecCmd(cmd, value = null) {
  const pc = document.getElementById('preview-content');
  if (pc && currentViewMode === 'wysiwyg') {
    pc.focus();
  }
  document.execCommand(cmd, false, value);
  if (currentViewMode === 'wysiwyg') {
    docModified = true;
    updateDocIndicator();
    if (wysiwygSyncTimer) clearTimeout(wysiwygSyncTimer);
    wysiwygSyncTimer = setTimeout(deSyncWysiwygToEditor, 250);
  }
}

function deFormatBlock(tag) {
  if (!tag) return;
  deExecCmd('formatBlock', '<' + tag + '>');
}

function deInsertPageBreakAtCursor() {
  const pbHtml = '<div class="de-page-break" contenteditable="false"></div><p><br></p>';
  deExecCmd('insertHTML', pbHtml);
}

function updateWysiwygToolbarState() {
  if (currentViewMode !== 'wysiwyg' || currentDocType !== 'html') return;
  try {
    const isBold = document.queryCommandState('bold');
    const isItalic = document.queryCommandState('italic');
    const isUnderline = document.queryCommandState('underline');
    const isStrike = document.queryCommandState('strikeThrough');

    const btnB = document.getElementById('tb-bold');
    const btnI = document.getElementById('tb-italic');
    const btnU = document.getElementById('tb-underline');
    const btnS = document.getElementById('tb-strike');

    if (btnB) btnB.classList.toggle('active', !!isBold);
    if (btnI) btnI.classList.toggle('active', !!isItalic);
    if (btnU) btnU.classList.toggle('active', !!isUnderline);
    if (btnS) btnS.classList.toggle('active', !!isStrike);

    const sel = window.getSelection();
    if (sel && sel.anchorNode) {
      let node = sel.anchorNode;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
      const heading = node.closest('h1, h2, h3, blockquote, p');
      const fmtSelect = document.getElementById('tb-format-block');
      if (fmtSelect && heading) {
        fmtSelect.value = heading.tagName.toLowerCase();
      }
    }
  } catch (e) { }
}

function initWysiwygListeners() {
  const pc = document.getElementById('preview-content');
  if (!pc) return;

  pc.addEventListener('input', function () {
    if (currentViewMode !== 'wysiwyg' || currentDocType !== 'html') return;
    docModified = true;
    updateDocIndicator();
    if (wysiwygSyncTimer) clearTimeout(wysiwygSyncTimer);
    wysiwygSyncTimer = setTimeout(() => {
      deSyncWysiwygToEditor();
    }, 300);
  });

  pc.addEventListener('keydown', function (e) {
    if (currentViewMode !== 'wysiwyg' || currentDocType !== 'html') return;
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        deSyncWysiwygToEditor();
        saveDoc();
      }
    }
  });

  document.addEventListener('selectionchange', function () {
    if (currentViewMode === 'wysiwyg') {
      updateWysiwygToolbarState();
    }
  });

  document.querySelectorAll('.de-view-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const mode = this.getAttribute('data-mode');
      if (mode) deSetViewMode(mode);
    });
  });

  const bindBtn = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };

  bindBtn('tb-undo', () => deExecCmd('undo'));
  bindBtn('tb-redo', () => deExecCmd('redo'));
  bindBtn('tb-bold', () => deExecCmd('bold'));
  bindBtn('tb-italic', () => deExecCmd('italic'));
  bindBtn('tb-underline', () => deExecCmd('underline'));
  bindBtn('tb-strike', () => deExecCmd('strikeThrough'));
  bindBtn('tb-align-left', () => deExecCmd('justifyLeft'));
  bindBtn('tb-align-center', () => deExecCmd('justifyCenter'));
  bindBtn('tb-align-right', () => deExecCmd('justifyRight'));
  bindBtn('tb-align-justify', () => deExecCmd('justifyFull'));
  bindBtn('tb-list-ul', () => deExecCmd('insertUnorderedList'));
  bindBtn('tb-list-ol', () => deExecCmd('insertOrderedList'));
  bindBtn('tb-insert-table', () => insertTable(3, 3));
  bindBtn('tb-insert-img', () => document.getElementById('image-file-input').click());
  bindBtn('tb-insert-pagebreak', () => deInsertPageBreakAtCursor());
  bindBtn('tb-insert-field', () => mpOpenFieldPickerModal());

  const fmtBlock = document.getElementById('tb-format-block');
  if (fmtBlock) {
    fmtBlock.addEventListener('change', function () {
      deFormatBlock(this.value);
    });
  }
}

// ── Stylesheet Panel toggle ────────────────────────────────
function deToggleCssPanel(forceState) {
  const panel = document.getElementById('css-panel');
  if (!panel) return;
  const isOpen = typeof forceState === 'boolean' ? forceState : !panel.classList.contains('open');
  panel.classList.toggle('open', isOpen);
  const navBtn = document.getElementById('btn-toggle-css-panel');
  if (navBtn) navBtn.classList.toggle('active', isOpen);
  if (isOpen && cssEditorVisible && cssEditor) {
    setTimeout(() => cssEditor.layout(), 30);
  }
  if (isOpen && scriptEditorVisible && scriptEditor) {
    setTimeout(() => scriptEditor.layout(), 30);
  }
}
window.deToggleCssPanel = deToggleCssPanel;

// ── CSS Panel toggle ──────────────────────────────────────
function toggleCssEditor() {
  cssEditorVisible = !cssEditorVisible;
  const wrapper = document.getElementById('css-editor-wrapper');
  const btn = document.getElementById('btn-toggle-css-editor');
  wrapper.classList.toggle('visible', cssEditorVisible);
  btn.classList.toggle('active', cssEditorVisible);
  if (cssEditorVisible && cssEditor) {
    setTimeout(() => cssEditor.layout(), 30);
  }
}

function toggleScriptEditor() {
  scriptEditorVisible = !scriptEditorVisible;
  document.getElementById('script-editor-wrapper').classList.toggle('visible', scriptEditorVisible);
  document.getElementById('btn-toggle-script-editor').classList.toggle('active', scriptEditorVisible);
  if (scriptEditorVisible && scriptEditor) setTimeout(() => scriptEditor.layout(), 30);
}

function deRunScriptInSandbox() {
  const frame = document.getElementById('script-run-frame');
  if (!frame || !mdEditor) return;
  const extracted = deExtractStyleBlocks(mdEditor.getValue());
  dePendingScriptText = '';
  const css = deStripManagedLayoutCss(cssEditor ? cssEditor.getValue() : '');
  let html = extracted.content;
  if (css.trim()) html = '<style>\n' + css + '\n</style>\n' + html;
  html = deInjectInlineScript(html, scriptEditor ? scriptEditor.getValue() : '');
  frame.classList.add('visible');
  frame.srcdoc = html;
}

function deBuildScriptHelperSnippet(preset, triggerSel, targetSel) {
  const trig = JSON.stringify(triggerSel || '#my-btn');
  const targ = JSON.stringify(targetSel || '#my-box');
  switch (preset) {
    case 'toggle':
      return `document.querySelector(${trig})?.addEventListener('click', () => {\n const el = document.querySelector(${targ});\n if (!el) return;\n el.style.display = el.style.display === 'none' ? '' : 'none';\n});`;
    case 'toggleClass':
      return `document.querySelector(${trig})?.addEventListener('click', () => {\n document.querySelector(${targ})?.classList.toggle('active');\n});`;
    case 'fadeIn':
      return `document.querySelector(${targ})?.animate(\n [{ opacity: 0 }, { opacity: 1 }],\n { duration: 400, easing: 'ease-out', fill: 'forwards' }\n);`;
    case 'slideDown':
      return `document.querySelector(${targ})?.animate(\n [{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'translateY(0)' }],\n { duration: 350, easing: 'ease-out', fill: 'forwards' }\n);`;
    case 'pulse':
      return `document.querySelector(${trig})?.addEventListener('click', () => {\n document.querySelector(${targ})?.animate(\n [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }],\n { duration: 300, easing: 'ease-in-out' }\n );\n});`;
    case 'countdown':
      return `(() => {\n const el = document.querySelector(${targ});\n if (!el) return;\n let sec = 60;\n el.textContent = sec;\n const id = setInterval(() => {\n sec -= 1;\n el.textContent = sec;\n if (sec <= 0) clearInterval(id);\n }, 1000);\n})();`;
    case 'clickMessage':
      return `document.querySelector(${trig})?.addEventListener('click', () => {\n const el = document.querySelector(${targ});\n if (el) el.textContent = 'Clicked!';\n});`;
    default:
      return '';
  }
}

function deInsertScriptHelperSnippet() {
  if (!scriptEditor) return;
  const preset = document.getElementById('script-helper-preset')?.value || 'toggle';
  const triggerVal = (document.getElementById('script-helper-trigger')?.value || '').trim();
  const targetVal = (document.getElementById('script-helper-target')?.value || '').trim();
  const snippet = deBuildScriptHelperSnippet(preset, triggerVal, targetVal);
  if (!snippet) return;
  const current = scriptEditor.getValue();
  const next = current.trim() ? current.replace(/\s+$/, '') + '\n\n' + snippet + '\n' : snippet + '\n';
  scriptEditor.setValue(next);
  scriptEditor.focus();
  const model = scriptEditor.getModel();
  if (model) {
    const lastLine = model.getLineCount();
    scriptEditor.setPosition({ lineNumber: lastLine, column: model.getLineMaxColumn(lastLine) });
  }
}

// ── Preview-to-Code & CSS Inspector ──────────────────────
function deParseCssRules(cssText) {
  if (!cssText) return [];
  const blocks = [];
  let i = 0;
  const len = cssText.length;
  let line = 1;
  let col = 1;

  let currentSelector = '';
  let selectorStartLine = 1;
  let selectorStartCol = 1;
  let inComment = false;
  let inString = false;
  let stringChar = '';
  let braceDepth = 0;
  let blockStartLine = 1;
  let blockStartCol = 1;
  let blockBody = '';

  while (i < len) {
    const ch = cssText[i];
    const nextCh = i + 1 < len ? cssText[i + 1] : '';

    if (inComment) {
      if (ch === '*' && nextCh === '/') {
        inComment = false;
        i += 2;
        col += 2;
        continue;
      }
      if (ch === '\n') {
        line++;
        col = 1;
      } else {
        col++;
      }
      i++;
      continue;
    }

    if (!inString && ch === '/' && nextCh === '*') {
      inComment = true;
      i += 2;
      col += 2;
      continue;
    }

    if (inString) {
      if (ch === stringChar && cssText[i - 1] !== '\\') {
        inString = false;
      }
      if (braceDepth > 0) blockBody += ch;
      else currentSelector += ch;
      if (ch === '\n') {
        line++;
        col = 1;
      } else {
        col++;
      }
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      if (braceDepth > 0) blockBody += ch;
      else {
        if (!currentSelector.trim()) {
          selectorStartLine = line;
          selectorStartCol = col;
        }
        currentSelector += ch;
      }
      col++;
      i++;
      continue;
    }

    if (ch === '{') {
      if (braceDepth === 0) {
        blockStartLine = line;
        blockStartCol = col;
        blockBody = '';
      } else {
        blockBody += ch;
      }
      braceDepth++;
      col++;
      i++;
      continue;
    }

    if (ch === '}') {
      braceDepth--;
      if (braceDepth === 0) {
        const trimmedSelector = currentSelector.trim();
        if (trimmedSelector &&
          !trimmedSelector.startsWith('@keyframes') &&
          !trimmedSelector.startsWith('@font-face') &&
          !trimmedSelector.startsWith('@import')) {
          blocks.push({
            selector: trimmedSelector,
            startLine: selectorStartLine,
            startCol: selectorStartCol,
            endLine: line,
            endCol: col,
            body: blockBody.trim()
          });
        }
        currentSelector = '';
      } else {
        blockBody += ch;
      }
      col++;
      i++;
      continue;
    }

    if (braceDepth === 0) {
      if (!currentSelector.trim() && ch !== ' ' && ch !== '\t' && ch !== '\r' && ch !== '\n') {
        selectorStartLine = line;
        selectorStartCol = col;
      }
      currentSelector += ch;
    } else {
      blockBody += ch;
    }

    if (ch === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
    i++;
  }

  return blocks;
}

function deFindMatchingCssRules(targetElement, cssText) {
  if (!targetElement || !cssText) return [];
  const allRules = deParseCssRules(cssText);
  const matched = [];

  for (let i = 0; i < allRules.length; i++) {
    const rule = allRules[i];
    const subSelectors = rule.selector.split(',').map(s => s.trim()).filter(Boolean);
    let isMatched = false;
    let isDirect = false;
    let matchedSelector = '';

    for (let j = 0; j < subSelectors.length; j++) {
      let sel = subSelectors[j];
      let testSel = sel.replace(/^(?:#preview-content|\.doc-preview)\s*/g, '').trim();
      if (!testSel) testSel = sel;
      const cleanSel = testSel.replace(/::?[a-zA-Z-]+(?:\([^)]*\))?/g, '').trim();

      // 1. Direct match on target element
      try {
        if (targetElement.matches(testSel) || (cleanSel && targetElement.matches(cleanSel))) {
          isMatched = true;
          isDirect = true;
          matchedSelector = sel;
          break;
        }
      } catch (e) { }

      // 2. Inherited match on parent elements up to preview container
      if (!isMatched) {
        let parent = targetElement.parentElement;
        while (parent &&
          !parent.classList.contains('doc-preview') &&
          !parent.classList.contains('doc-pages-container') &&
          parent !== document.body) {
          try {
            if (parent.matches(testSel) || (cleanSel && parent.matches(cleanSel))) {
              isMatched = true;
              isDirect = false;
              matchedSelector = sel;
              break;
            }
          } catch (e) { }
          parent = parent.parentElement;
        }
      }

      if (isMatched) break;
    }

    if (isMatched) {
      matched.push({
        ...rule,
        isDirect,
        matchedSelector
      });
    }
  }

  return matched;
}

function deLocateHtmlElementInCode(element, model) {
  if (!element || !model) return null;

  // 1. By ID
  if (element.id) {
    const idMatches = model.findMatches(`id="${element.id}"`, false, false, false, null, true);
    if (idMatches && idMatches.length > 0) return idMatches[0].range;
    const idMatchesSingle = model.findMatches(`id='${element.id}'`, false, false, false, null, true);
    if (idMatchesSingle && idMatchesSingle.length > 0) return idMatchesSingle[0].range;
  }

  // 2. By image src
  if (element.tagName === 'IMG') {
    const src = element.getAttribute('src');
    if (src) {
      const srcMatches = model.findMatches(src, false, false, false, null, true);
      if (srcMatches && srcMatches.length > 0) return srcMatches[0].range;
    }
  }

  // 3. By text content snippet
  const text = element.textContent.trim();
  if (text.length > 0) {
    const snippet = text.slice(0, Math.min(35, text.length)).replace(/\s+/g, ' ');
    const textMatches = model.findMatches(snippet, false, false, false, null, true);
    if (textMatches && textMatches.length > 0) {
      const preview = document.getElementById('preview-content');
      const allMatching = Array.from((preview || document).querySelectorAll(element.tagName.toLowerCase()))
        .filter(el => el.textContent.includes(snippet));
      const idx = Math.max(0, allMatching.indexOf(element));
      return textMatches[Math.min(idx, textMatches.length - 1)].range;
    }
  }

  // 4. By tag and class
  if (element.className && typeof element.className === 'string') {
    const firstClass = element.className.trim().split(/\s+/).find(c => c && !c.startsWith('cmt-'));
    if (firstClass) {
      const classMatches = model.findMatches(`class="${firstClass}"`, false, false, false, null, true);
      if (classMatches && classMatches.length > 0) return classMatches[0].range;
    }
  }

  // 5. By tag name
  const tagQuery = `<${element.tagName.toLowerCase()}`;
  const tagMatches = model.findMatches(tagQuery, false, false, false, null, true);
  if (tagMatches && tagMatches.length > 0) return tagMatches[0].range;

  return null;
}

function deLocateTypstElementInCode(element, model) {
  if (!element || !model) return null;
  const text = element.textContent.trim();
  if (text.length > 0) {
    const snippet = text.slice(0, 30);
    const matches = model.findMatches(snippet, false, false, false, null, true);
    if (matches && matches.length > 0) return matches[0].range;
  }
  return null;
}

function deClearInspectorHighlights() {
  if (lastInspectedPreviewEl) {
    lastInspectedPreviewEl.classList.remove('cmt-inspected-preview-elem');
    lastInspectedPreviewEl = null;
  }
  if (mdEditor && mdHighlightDecorations.length > 0) {
    mdHighlightDecorations = mdEditor.deltaDecorations(mdHighlightDecorations, []);
  }
  if (cssEditor && cssHighlightDecorations.length > 0) {
    cssHighlightDecorations = cssEditor.deltaDecorations(cssHighlightDecorations, []);
  }
  const pill = document.getElementById('de-inspector-pill');
  if (pill) pill.style.display = 'none';
  lastInspectedCodeRange = null;
  lastInspectedCssRange = null;
}

function deHandlePreviewElementClick(e) {
  if (currentViewMode === 'wysiwyg' || previewExactPdfMode) return;

  let target = e.target;
  const previewContainer = document.getElementById('preview-content');
  if (!target || target === previewContainer) return;
  if (target.closest && target.closest('.full-preview-pdf-pages')) return;

  // Ignore page sheet container margins/footers
  if (target.classList.contains('doc-pages-container') ||
    target.classList.contains('doc-page-sheet') ||
    target.classList.contains('doc-page-body') ||
    target.classList.contains('doc-page-footer') ||
    target.id === 'preview-scroll') {
    return;
  }

  if (target.nodeType === Node.TEXT_NODE) target = target.parentElement;
  if (!target || target === previewContainer) return;

  // Prevent link navigation in preview when inspecting
  if (target.closest('a')) e.preventDefault();

  const el = target;

  // 1. Highlight clicked element in preview
  if (lastInspectedPreviewEl && lastInspectedPreviewEl !== el) {
    lastInspectedPreviewEl.classList.remove('cmt-inspected-preview-elem');
  }
  el.classList.add('cmt-inspected-preview-elem');
  lastInspectedPreviewEl = el;

  // 2. Suggest selector in Quick Rule input
  const ruleSelectorInput = document.getElementById('rule-selector');
  if (ruleSelectorInput) {
    let suggestedSelector = el.tagName.toLowerCase();
    if (el.id) {
      suggestedSelector = '#' + el.id;
    } else if (el.className && typeof el.className === 'string') {
      const cleanClasses = el.className.split(/\s+/).filter(c => c && !c.startsWith('cmt-'));
      if (cleanClasses.length > 0) {
        suggestedSelector = '.' + cleanClasses[0];
      }
    }
    ruleSelectorInput.value = suggestedSelector;
  }

  // 3. Locate & highlight in Monaco Code Editor
  let codeRange = null;
  if (mdEditor) {
    const model = mdEditor.getModel();
    if (currentDocType === 'md') {
      const sourceBlock = el.closest('[data-source-line]');
      if (sourceBlock) {
        const sLine = parseInt(sourceBlock.getAttribute('data-source-line'), 10);
        const eLine = parseInt(sourceBlock.getAttribute('data-source-end-line') || sLine, 10);
        const maxLine = model.getLineCount();
        const clampedStart = Math.max(1, Math.min(sLine, maxLine));
        const clampedEnd = Math.max(clampedStart, Math.min(eLine, maxLine));

        const clickedText = el.textContent.trim();
        if (el !== sourceBlock && clickedText.length > 0) {
          for (let l = clampedStart; l <= clampedEnd; l++) {
            const lineStr = model.getLineContent(l);
            const idx = lineStr.indexOf(clickedText);
            if (idx !== -1) {
              codeRange = new monaco.Range(l, idx + 1, l, idx + 1 + clickedText.length);
              break;
            }
          }
        }

        if (!codeRange) {
          const mathDisplay = el.closest('.math-display');
          if (mathDisplay && mathDisplay.getAttribute('data-math')) {
            const mathFormula = mathDisplay.getAttribute('data-math');
            for (let l = clampedStart; l <= clampedEnd; l++) {
              const lineStr = model.getLineContent(l);
              const idx = lineStr.indexOf(mathFormula);
              if (idx !== -1) {
                codeRange = new monaco.Range(l, idx + 1, l, idx + 1 + mathFormula.length);
                break;
              }
            }
          }
        }

        if (!codeRange && el.tagName === 'IMG') {
          const src = el.getAttribute('src');
          if (src) {
            for (let l = clampedStart; l <= clampedEnd; l++) {
              const lineStr = model.getLineContent(l);
              const idx = lineStr.indexOf(src);
              if (idx !== -1) {
                codeRange = new monaco.Range(l, 1, l, lineStr.length + 1);
                break;
              }
            }
          }
        }

        if (!codeRange) {
          const endLineContent = model.getLineContent(clampedEnd);
          codeRange = new monaco.Range(clampedStart, 1, clampedEnd, endLineContent.length + 1);
        }
      } else {
        const text = el.textContent.trim();
        if (text.length > 0) {
          const matches = model.findMatches(text.slice(0, 30), false, false, false, null, true);
          if (matches && matches.length > 0) {
            codeRange = matches[0].range;
          }
        }
      }
    } else if (currentDocType === 'html') {
      codeRange = deLocateHtmlElementInCode(el, model);
    } else if (currentDocType === 'typ') {
      codeRange = deLocateTypstElementInCode(el, model);
    }

    if (codeRange) {
      lastInspectedCodeRange = codeRange;
      mdEditor.revealRangeInCenter(codeRange, monaco.editor.ScrollType.Smooth);
      mdEditor.setSelection(codeRange);
      mdHighlightDecorations = mdEditor.deltaDecorations(mdHighlightDecorations, [
        {
          range: codeRange,
          options: {
            isWholeLine: codeRange.startLineNumber !== codeRange.endLineNumber || codeRange.startColumn === 1,
            className: 'cmt-editor-highlight-line',
            inlineClassName: 'cmt-editor-highlight-inline',
            overviewRuler: {
              color: '#eab308',
              position: monaco.editor.OverviewRulerLane.Full
            }
          }
        }
      ]);
    }
  }

  // 4. Locate & highlight associated CSS in Monaco CSS Editor (without auto-opening cssEditor)
  const customCss = cssEditor ? cssEditor.getValue() : '';
  const matchingRules = deFindMatchingCssRules(el, customCss);
  let cssRange = null;

  if (matchingRules.length > 0) {
    const decs = matchingRules.map(r => ({
      range: new monaco.Range(r.startLine, 1, r.endLine, 999),
      options: {
        isWholeLine: true,
        className: 'cmt-css-highlight-line',
        inlineClassName: 'cmt-css-highlight-inline',
        overviewRuler: {
          color: '#0284c7',
          position: monaco.editor.OverviewRulerLane.Full
        }
      }
    }));
    if (cssEditor) {
      cssHighlightDecorations = cssEditor.deltaDecorations(cssHighlightDecorations, decs);
      const bestRule = matchingRules.find(r => r.isDirect) || matchingRules[0];
      cssRange = new monaco.Range(bestRule.startLine, bestRule.startCol, bestRule.endLine, bestRule.endCol);
      lastInspectedCssRange = cssRange;
      cssEditor.revealRangeInCenter(cssRange, monaco.editor.ScrollType.Smooth);
      cssEditor.setSelection(cssRange);
    }
  } else {
    lastInspectedCssRange = null;
    if (cssEditor && cssHighlightDecorations.length > 0) {
      cssHighlightDecorations = cssEditor.deltaDecorations(cssHighlightDecorations, []);
    }
  }

  // 5. Update Floating Inspector Pill & Style Drawer
  deUpdateInspectorPillUI(el, codeRange, matchingRules, customCss);
}

const deInspectorState = {
  selector: '',
  candidates: [],
  commitTimer: null,
  liveCssText: null,
  important: false
};

function deStripImportant(val) {
  if (!val || typeof val !== 'string') return { value: '', isImportant: false };
  const isImportant = /\s*!important\s*$/i.test(val);
  const cleaned = val.replace(/\s*!important\s*$/i, '').trim();
  return { value: cleaned, isImportant };
}

function deFormatPropValueWithImportant(val, makeImportant) {
  const cleaned = deStripImportant(val).value;
  if (!cleaned) return '';
  return makeImportant ? cleaned + ' !important' : cleaned;
}

function deNormalizeHexColor(val) {
  if (!val || typeof val !== 'string') return null;
  const v = val.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v)) {
    return '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
  }
  const m = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) {
    const r = Math.max(0, Math.min(255, parseInt(m[1], 10))).toString(16).padStart(2, '0');
    const g = Math.max(0, Math.min(255, parseInt(m[2], 10))).toString(16).padStart(2, '0');
    const b = Math.max(0, Math.min(255, parseInt(m[3], 10))).toString(16).padStart(2, '0');
    return '#' + r + g + b;
  }
  return null;
}

function deParseCssDeclarations(bodyStr) {
  const decls = new Map();
  if (!bodyStr) return decls;
  const cleaned = bodyStr.replace(/\/\*[\s\S]*?\*\//g, '');
  const parts = cleaned.split(';');
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;
    const colonIdx = part.indexOf(':');
    if (colonIdx <= 0) continue;
    const prop = part.slice(0, colonIdx).trim().toLowerCase();
    const value = part.slice(colonIdx + 1).trim();
    if (prop) decls.set(prop, value);
  }
  return decls;
}

function deFindExactCssRule(selector, cssText) {
  if (!selector || !cssText) return null;
  const target = selector.trim();
  const rules = deParseCssRules(cssText);
  for (let i = 0; i < rules.length; i++) {
    if (rules[i].selector.trim() === target) {
      return rules[i];
    }
  }
  return null;
}

function deUpdateCssRuleInText(cssText, selector, prop, value, makeImportant) {
  const sel = (selector || '').trim();
  if (!sel) return cssText;
  const existing = deFindExactCssRule(sel, cssText);
  const lines = cssText ? cssText.split('\n') : [''];

  if (existing) {
    const startIdx = existing.startLine - 1;
    const endIdx = existing.endLine - 1;
    if (prop === null && value === null) {
      // Remove entire rule block
      lines.splice(startIdx, endIdx - startIdx + 1);
      return lines.join('\n').replace(/\n{3,}/g, '\n\n');
    }
    const decls = deParseCssDeclarations(existing.body);
    if (value === '' || value === null || value === undefined) {
      decls.delete(prop.toLowerCase());
    } else {
      decls.set(prop.toLowerCase(), deFormatPropValueWithImportant(String(value), !!makeImportant));
    }
    if (decls.size === 0) {
      lines.splice(startIdx, endIdx - startIdx + 1);
      return lines.join('\n').replace(/\n{3,}/g, '\n\n');
    }
    const bodyLines = [];
    decls.forEach((v, k) => {
      bodyLines.push(' ' + k + ': ' + v + ';');
    });
    const replacement = sel + ' {\n' + bodyLines.join('\n') + '\n}';
    lines.splice(startIdx, endIdx - startIdx + 1, replacement);
    return lines.join('\n');
  }

  if (prop === null || value === '' || value === null || value === undefined) {
    return cssText;
  }
  const formattedVal = deFormatPropValueWithImportant(String(value), !!makeImportant);
  const prefix = cssText && !cssText.endsWith('\n') ? '\n\n' : (cssText ? '\n' : '');
  return (cssText || '') + prefix + sel + ' {\n ' + prop.toLowerCase() + ': ' + formattedVal + ';\n}\n';
}

function deToggleRuleImportantInText(cssText, selector, makeImportant) {
  const sel = (selector || '').trim();
  if (!sel || !cssText) return cssText;
  const existing = deFindExactCssRule(sel, cssText);
  if (!existing) return cssText;
  const decls = deParseCssDeclarations(existing.body);
  if (decls.size === 0) return cssText;
  const bodyLines = [];
  decls.forEach((v, k) => {
    bodyLines.push(' ' + k + ': ' + deFormatPropValueWithImportant(v, makeImportant) + ';');
  });
  const lines = cssText.split('\n');
  const startIdx = existing.startLine - 1;
  const endIdx = existing.endLine - 1;
  lines.splice(startIdx, endIdx - startIdx + 1, sel + ' {\n' + bodyLines.join('\n') + '\n}');
  return lines.join('\n');
}

function deBuildSelectorCandidates(el, matchingRules) {
  const candidates = [];
  const addCandidate = (sel) => {
    if (sel && !candidates.includes(sel)) candidates.push(sel);
  };
  if (matchingRules && matchingRules.length > 0) {
    const direct = matchingRules.find(r => r.isDirect);
    if (direct) addCandidate(direct.matchedSelector || direct.selector);
  }
  if (el.id) addCandidate('#' + el.id);
  if (el.className && typeof el.className === 'string') {
    const classes = el.className.split(/\s+/).filter(c => c && !c.startsWith('cmt-'));
    for (let i = 0; i < classes.length; i++) {
      addCandidate('.' + classes[i]);
    }
  }
  addCandidate(el.tagName.toLowerCase());
  return candidates;
}

function deRefreshInspectorCssBadge(matchingRules) {
  const cssItem = document.getElementById('de-pill-css');
  const cssTextEl = document.getElementById('de-pill-css-text');
  if (!cssItem || !cssTextEl) return;
  if (matchingRules && matchingRules.length > 0) {
    cssItem.classList.remove('de-pill-no-css');
    cssItem.classList.add('de-pill-css');
    cssTextEl.textContent = matchingRules.length + ' ' + (typeof t === 'function' ? t('deInspectorCssRules') : 'CSS') + ' (L' + matchingRules[0].startLine + ')';
  } else {
    cssItem.classList.remove('de-pill-css');
    cssItem.classList.add('de-pill-no-css');
    cssTextEl.textContent = typeof t === 'function' ? t('deInspectorNoCss') : 'No custom CSS';
  }
}

function dePopulateInspectorDrawerFromRule(selector, cssText) {
  const rule = deFindExactCssRule(selector, cssText);
  const decls = rule ? deParseCssDeclarations(rule.body) : new Map();
  const computed = lastInspectedPreviewEl ? window.getComputedStyle(lastInspectedPreviewEl) : null;

  let anyImportant = false;
  decls.forEach((v) => {
    if (deStripImportant(v).isImportant) anyImportant = true;
  });
  deInspectorState.important = anyImportant;
  const impBtn = document.getElementById('de-insp-important-btn');
  if (impBtn) {
    impBtn.classList.toggle('active', anyImportant);
    impBtn.setAttribute('aria-pressed', String(anyImportant));
  }

  const getClean = (prop) => deStripImportant(decls.get(prop) || '').value;

  const setVal = (id, prop) => {
    const inp = document.getElementById(id);
    if (inp) inp.value = getClean(prop);
  };

  setVal('de-insp-color', 'color');
  setVal('de-insp-bg', 'background-color');
  setVal('de-insp-font-size', 'font-size');
  setVal('de-insp-font-weight', 'font-weight');
  setVal('de-insp-line-height', 'line-height');
  setVal('de-insp-padding', 'padding');
  setVal('de-insp-margin', 'margin');
  setVal('de-insp-border', 'border');
  setVal('de-insp-radius', 'border-radius');

  const colorPicker = document.getElementById('de-insp-color-picker');
  if (colorPicker) {
    const hex = deNormalizeHexColor(getClean('color')) || (computed ? deNormalizeHexColor(computed.color) : null) || '#222222';
    colorPicker.value = hex;
  }

  const bgPicker = document.getElementById('de-insp-bg-picker');
  if (bgPicker) {
    const bgHex = deNormalizeHexColor(getClean('background-color')) || (computed ? deNormalizeHexColor(computed.backgroundColor) : null) || '#ffffff';
    bgPicker.value = bgHex;
  }

  const alignVal = getClean('text-align').toLowerCase();
  document.querySelectorAll('#de-insp-align-group .de-insp-seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.align === alignVal);
  });

  const italicBtn = document.getElementById('de-insp-italic-btn');
  if (italicBtn) {
    italicBtn.classList.toggle('active', getClean('font-style').toLowerCase() === 'italic');
  }
}

function deRenderSelectorChips() {
  const container = document.getElementById('de-insp-selector-chips');
  if (!container) return;
  container.innerHTML = '';
  deInspectorState.candidates.forEach(sel => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'de-insp-chip' + (sel === deInspectorState.selector ? ' active' : '');
    chip.textContent = sel;
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      deSetInspectorSelector(sel);
    });
    container.appendChild(chip);
  });
}

function deSetInspectorSelector(newSelector) {
  deInspectorState.selector = (newSelector || '').trim();
  const selInput = document.getElementById('de-insp-selector');
  if (selInput && selInput.value !== deInspectorState.selector) {
    selInput.value = deInspectorState.selector;
  }
  const ruleSelInput = document.getElementById('rule-selector');
  if (ruleSelInput && deInspectorState.selector) {
    ruleSelInput.value = deInspectorState.selector;
  }
  deRenderSelectorChips();
  const cssText = cssEditor ? cssEditor.getValue() : '';
  dePopulateInspectorDrawerFromRule(deInspectorState.selector, cssText);
}

function deCommitCssTextToEditor(nextCss) {
  if (!cssEditor) return;
  const model = cssEditor.getModel();
  if (!model) return;
  if (model.getValue() === nextCss) return;
  window._deInspectorApplyingCss = true;
  try {
    cssEditor.executeEdits('de-inspector', [{
      range: model.getFullModelRange(),
      text: nextCss,
      forceMoveMarkers: true
    }]);
  } finally {
    window._deInspectorApplyingCss = false;
  }
  if (lastInspectedPreviewEl) {
    const matchingRules = deFindMatchingCssRules(lastInspectedPreviewEl, nextCss);
    deRefreshInspectorCssBadge(matchingRules);
    if (matchingRules.length > 0) {
      const bestRule = matchingRules.find(r => r.isDirect) || matchingRules[0];
      lastInspectedCssRange = new monaco.Range(bestRule.startLine, bestRule.startCol, bestRule.endLine, bestRule.endCol);
    } else {
      lastInspectedCssRange = null;
    }
  }
}

function deApplyInspectorStyle(prop, value, commitNow) {
  const sel = (document.getElementById('de-insp-selector')?.value || deInspectorState.selector || '').trim();
  if (!sel) return;
  deInspectorState.selector = sel;

  const baseCss = deInspectorState.liveCssText !== null
    ? deInspectorState.liveCssText
    : (cssEditor ? cssEditor.getValue() : '');
  const nextCss = deUpdateCssRuleInText(baseCss, sel, prop, value, deInspectorState.important);
  deInspectorState.liveCssText = nextCss;

  // Immediate 60fps preview CSS update without DOM teardown
  const customStyleEl = document.getElementById('custom-css-style');
  if (customStyleEl) customStyleEl.textContent = deBuildScopedPreviewCss(nextCss, '#preview-content');
  const fpCss = document.getElementById('full-preview-custom-css');
  if (fpCss) fpCss.textContent = deBuildScopedPreviewCss(nextCss, '#full-preview-content');

  if (deInspectorState.commitTimer) {
    clearTimeout(deInspectorState.commitTimer);
    deInspectorState.commitTimer = null;
  }

  if (commitNow) {
    deInspectorState.liveCssText = null;
    deCommitCssTextToEditor(nextCss);
  } else {
    deInspectorState.commitTimer = setTimeout(() => {
      const pending = deInspectorState.liveCssText;
      deInspectorState.liveCssText = null;
      deInspectorState.commitTimer = null;
      if (pending !== null) deCommitCssTextToEditor(pending);
    }, 160);
  }
}

function deUpdateInspectorPillUI(el, codeRange, matchingRules, customCss) {
  const pill = document.getElementById('de-inspector-pill');
  if (!pill) return;

  const tagEl = document.getElementById('de-pill-tag');
  const codeTextEl = document.getElementById('de-pill-code-text');
  const cleanClasses = (el.className || '').split(/\s+/).filter(c => c && !c.startsWith('cmt-'));
  const tagDesc = '<' + el.tagName.toLowerCase() + (cleanClasses.length > 0 ? '.' + cleanClasses[0] : '') + '>';
  if (tagEl) tagEl.textContent = tagDesc;

  if (codeTextEl) {
    codeTextEl.textContent = (typeof t === 'function' ? t('deInspectorCodeLine') : 'Line') + ' ' + (codeRange ? codeRange.startLineNumber : '—');
  }

  deRefreshInspectorCssBadge(matchingRules);

  deInspectorState.liveCssText = null;
  deInspectorState.candidates = deBuildSelectorCandidates(el, matchingRules);
  deInspectorState.selector = deInspectorState.candidates[0] || el.tagName.toLowerCase();

  const selInput = document.getElementById('de-insp-selector');
  if (selInput) selInput.value = deInspectorState.selector;
  deRenderSelectorChips();
  dePopulateInspectorDrawerFromRule(deInspectorState.selector, customCss);

  pill.style.display = 'flex';
}

function initDocumentInspector() {
  const pc = document.getElementById('preview-content');
  if (pc) {
    pc.addEventListener('click', deHandlePreviewElementClick);
  }
  const fullPc = document.getElementById('full-preview-content');
  if (fullPc) {
    fullPc.addEventListener('click', deHandlePreviewElementClick);
  }

  const pill = document.getElementById('de-inspector-pill');
  if (pill) {
    pill.addEventListener('click', (e) => e.stopPropagation());
  }

  const pillClose = document.getElementById('de-pill-close');
  if (pillClose) {
    pillClose.addEventListener('click', (e) => {
      e.stopPropagation();
      deClearInspectorHighlights();
    });
  }

  const pillCode = document.getElementById('de-pill-code');
  if (pillCode) {
    pillCode.addEventListener('click', (e) => {
      e.stopPropagation();
      if (lastInspectedCodeRange && mdEditor) {
        mdEditor.revealRangeInCenter(lastInspectedCodeRange, monaco.editor.ScrollType.Smooth);
        mdEditor.setSelection(lastInspectedCodeRange);
        mdEditor.focus();
      }
    });
  }

  const pillCss = document.getElementById('de-pill-css');
  if (pillCss) {
    pillCss.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!cssEditorVisible) toggleCssEditor();
      if (lastInspectedCssRange && cssEditor) {
        cssEditor.revealRangeInCenter(lastInspectedCssRange, monaco.editor.ScrollType.Smooth);
        cssEditor.setSelection(lastInspectedCssRange);
        cssEditor.focus();
      }
    });
  }

  const styleToggle = document.getElementById('de-pill-style-toggle');
  const drawer = document.getElementById('de-inspector-drawer');
  if (styleToggle && drawer) {
    styleToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !drawer.hidden;
      drawer.hidden = isOpen;
      styleToggle.setAttribute('aria-expanded', String(!isOpen));
      styleToggle.classList.toggle('active', !isOpen);
    });
  }

  const selInput = document.getElementById('de-insp-selector');
  if (selInput) {
    selInput.addEventListener('input', () => {
      deSetInspectorSelector(selInput.value);
    });
  }

  const clearRuleBtn = document.getElementById('de-insp-clear-rule');
  if (clearRuleBtn) {
    clearRuleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deApplyInspectorStyle(null, null, true);
      dePopulateInspectorDrawerFromRule(deInspectorState.selector, cssEditor ? cssEditor.getValue() : '');
    });
  }

  const importantBtn = document.getElementById('de-insp-important-btn');
  if (importantBtn) {
    importantBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const nextImportant = !deInspectorState.important;
      deInspectorState.important = nextImportant;
      importantBtn.classList.toggle('active', nextImportant);
      importantBtn.setAttribute('aria-pressed', String(nextImportant));

      const sel = (document.getElementById('de-insp-selector')?.value || deInspectorState.selector || '').trim();
      if (sel && cssEditor) {
        const currentCss = cssEditor.getValue();
        const updatedCss = deToggleRuleImportantInText(currentCss, sel, nextImportant);
        if (updatedCss !== currentCss) {
          deInspectorState.liveCssText = null;
          if (deInspectorState.commitTimer) {
            clearTimeout(deInspectorState.commitTimer);
            deInspectorState.commitTimer = null;
          }
          deCommitCssTextToEditor(updatedCss);
        }
      }
    });
  }

  // Color pickers <-> text inputs
  const bindColorPair = (pickerId, textId, prop) => {
    const picker = document.getElementById(pickerId);
    const text = document.getElementById(textId);
    if (picker && text) {
      picker.addEventListener('input', () => {
        const val = window.UnifiedColorPicker ? window.UnifiedColorPicker.getValue(picker) : picker.value;
        text.value = val;
        deApplyInspectorStyle(prop, val, false);
      });
      picker.addEventListener('change', () => {
        const val = window.UnifiedColorPicker ? window.UnifiedColorPicker.getValue(picker) : picker.value;
        text.value = val;
        deApplyInspectorStyle(prop, val, true);
      });
      text.addEventListener('input', () => {
        const raw = text.value.trim();
        if (window.UnifiedColorPicker && window.UnifiedColorPicker.isValidColor(raw)) {
          window.UnifiedColorPicker.setValue(picker, raw);
        } else {
          const hex = deNormalizeHexColor(raw);
          if (hex) picker.value = hex;
        }
        deApplyInspectorStyle(prop, raw, false);
      });
      text.addEventListener('change', () => {
        deApplyInspectorStyle(prop, text.value.trim(), true);
      });
    }
  };
  bindColorPair('de-insp-color-picker', 'de-insp-color', 'color');
  bindColorPair('de-insp-bg-picker', 'de-insp-bg', 'background-color');

  // Mini clear buttons for color inputs
  document.querySelectorAll('.de-insp-mini-clear').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const prop = btn.dataset.prop;
      if (prop === 'color') {
        const inp = document.getElementById('de-insp-color');
        if (inp) inp.value = '';
      } else if (prop === 'background-color') {
        const inp = document.getElementById('de-insp-bg');
        if (inp) inp.value = '';
      }
      deApplyInspectorStyle(prop, '', true);
    });
  });

  // Text/select property inputs
  const bindTextProp = (id, prop) => {
    const el = document.getElementById(id);
    if (!el) return;
    const evt = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(evt, () => {
      deApplyInspectorStyle(prop, el.value.trim(), el.tagName === 'SELECT');
    });
    if (el.tagName !== 'SELECT') {
      el.addEventListener('change', () => {
        deApplyInspectorStyle(prop, el.value.trim(), true);
      });
    }
  };
  bindTextProp('de-insp-font-size', 'font-size');
  bindTextProp('de-insp-font-weight', 'font-weight');
  bindTextProp('de-insp-line-height', 'line-height');
  bindTextProp('de-insp-padding', 'padding');
  bindTextProp('de-insp-margin', 'margin');
  bindTextProp('de-insp-border', 'border');
  bindTextProp('de-insp-radius', 'border-radius');

  // Text-align segmented buttons
  document.querySelectorAll('#de-insp-align-group .de-insp-seg-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasActive = btn.classList.contains('active');
      document.querySelectorAll('#de-insp-align-group .de-insp-seg-btn').forEach(b => b.classList.remove('active'));
      if (wasActive) {
        deApplyInspectorStyle('text-align', '', true);
      } else {
        btn.classList.add('active');
        deApplyInspectorStyle('text-align', btn.dataset.align, true);
      }
    });
  });

  // Italic toggle button
  const italicBtn = document.getElementById('de-insp-italic-btn');
  if (italicBtn) {
    italicBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const next = !italicBtn.classList.contains('active');
      italicBtn.classList.toggle('active', next);
      deApplyInspectorStyle('font-style', next ? 'italic' : '', true);
    });
  }

  // Custom property row
  const customProp = document.getElementById('de-insp-custom-prop');
  const customVal = document.getElementById('de-insp-custom-val');
  const customAdd = document.getElementById('de-insp-custom-add');
  const propsList = document.getElementById('de-insp-css-props-list');
  const valsList = document.getElementById('de-insp-css-vals-list');
  const cssHelperBtn = document.getElementById('de-insp-css-helper-btn');

  if (propsList && !propsList.childElementCount) {
    const propSet = new Set([
      'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius',
      'background', 'background-color', 'color', 'font', 'font-family', 'font-size', 'font-weight', 'font-style',
      'line-height', 'letter-spacing', 'text-align', 'text-decoration', 'text-transform',
      'display', 'flex', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'gap', 'row-gap', 'column-gap',
      'grid', 'grid-template-columns', 'grid-template-rows',
      'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height',
      'position', 'top', 'right', 'bottom', 'left', 'inset', 'z-index',
      'overflow', 'box-shadow', 'opacity', 'outline', 'list-style', 'border-collapse',
      'break-before', 'break-after', 'break-inside', 'page-break-before', 'page-break-after', 'page-break-inside'
    ]);
    if (window.DeCssHelper && typeof window.DeCssHelper.getPropertyNames === 'function') {
      window.DeCssHelper.getPropertyNames().forEach(p => propSet.add(p));
    }
    try {
      const cs = window.getComputedStyle(document.documentElement);
      for (let i = 0; i < cs.length; i++) {
        const p = cs[i];
        if (p && !p.startsWith('-')) propSet.add(p);
      }
    } catch (_) {}
    const frag = document.createDocumentFragment();
    Array.from(propSet).sort().forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      frag.appendChild(opt);
    });
    propsList.appendChild(frag);
  }

  const updateValSuggestions = () => {
    if (!valsList) return;
    const p = (customProp?.value || '').trim().toLowerCase();
    const opts = (window.DeCssHelper && typeof window.DeCssHelper.getPropertyOptions === 'function')
      ? window.DeCssHelper.getPropertyOptions(p)
      : [];
    valsList.innerHTML = '';
    opts.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      valsList.appendChild(opt);
    });
  };
  if (customProp) {
    customProp.addEventListener('input', updateValSuggestions);
    customProp.addEventListener('change', updateValSuggestions);
  }

  if (cssHelperBtn) {
    cssHelperBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.DeCssHelper && typeof window.DeCssHelper.open === 'function') {
        const typedProp = (customProp?.value || '').trim();
        window.DeCssHelper.open('properties', typedProp);
      }
    });
  }

  const applyCustom = () => {
    const p = (customProp?.value || '').trim().toLowerCase();
    const v = (customVal?.value || '').trim();
    if (!p) return;
    deApplyInspectorStyle(p, v, true);
    if (customProp) customProp.value = '';
    if (customVal) customVal.value = '';
    dePopulateInspectorDrawerFromRule(deInspectorState.selector, cssEditor ? cssEditor.getValue() : '');
  };
  if (customAdd) customAdd.addEventListener('click', applyCustom);
  if (customVal) {
    customVal.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyCustom();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lastInspectedPreviewEl) {
      deClearInspectorHighlights();
    }
  });

  initPreviewDictionaryLookup();
}

// ── Quick Dictionary Lookup ──────────────────────────────────
