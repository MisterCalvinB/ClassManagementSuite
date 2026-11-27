(function (root) {
  'use strict';

  function tr(key, fallback) {
    try {
      if (root.i18n && typeof root.i18n.t === 'function') {
        var v = root.i18n.t(key);
        if (v && v !== key) return v;
      }
      if (typeof root.t === 'function') {
        var v2 = root.t(key);
        if (v2 && v2 !== key) return v2;
      }
    } catch (_) {}
    return fallback !== undefined ? fallback : key;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function open(options) {
    var opts = options || {};
    if (!root.CmtWizard || !root.DocumentWordbankExtractor) {
      if (typeof root.showToast === 'function') {
        root.showToast(tr('docWbMissingDeps', 'Wizard dependencies not loaded.'), true);
      }
      return null;
    }

    var initialState = {
      sourceType: 'upload',
      file: null,
      fileName: '',
      ext: '',
      rawText: '',
      extracting: false,
      extractError: '',
      appDocs: [],
      appDocsLoaded: false,
      appDocSearch: '',
      appSource: null,
      linkToAppDoc: true,
      linkTargetKey: '',
      sourceLanguage: opts.sourceLanguage || 'en',
      caseMode: 'lower',
      minLength: 2,
      minOccurrences: 1,
      maxWords: 0,
      excludeStopwords: false,
      excludeContractions: false,
      excludeWords: '',
      excludeChars: '',
      includeExample: true,
      sortBy: 'frequency_desc',
      theme: '',
      analysis: null,
      selectedKeys: null,
      searchQuery: '',
      targetMode: opts.defaultTargetFile ? 'existing' : 'new',
      newFilename: '',
      existingFilename: opts.defaultTargetFile || '',
      conflictMode: 'overwrite',
      existingFiles: []
    };

    function recomputeAnalysis(state) {
      if (!state.rawText) {
        state.analysis = null;
        state.selectedKeys = null;
        return;
      }
      var res = root.DocumentWordbankExtractor.analyzeTextToWordbank(state.rawText, {
        sourceLanguage: state.sourceLanguage,
        caseMode: state.caseMode,
        minLength: state.minLength,
        minOccurrences: state.minOccurrences,
        maxWords: state.maxWords,
        excludeStopwords: state.excludeStopwords,
        excludeContractions: state.excludeContractions,
        excludeWords: state.excludeWords,
        excludeChars: state.excludeChars,
        includeExample: state.includeExample,
        sortBy: state.sortBy,
        theme: state.theme
      });
      state.analysis = res;
      state.selectedKeys = new Set(res.entries.map(function (e) { return e.word; }));
    }

    return root.CmtWizard.open({
      id: 'doc-wordbank-wizard',
      title: tr('docWbWizTitle', 'Document to Wordbank Wizard'),
      icon: 'book.svg',
      width: '860px',
      finishLabel: tr('docWbWizSaveBtn', 'Save Wordbank .js'),
      finishIcon: 'save.svg',
      initialState: initialState,
      steps: [
        {
          id: 'source',
          label: tr('docWbStepSource', 'Source File'),
          render: function (container, state, api) {
            var wrap = document.createElement('div');
            wrap.className = 'dwb-step-wrap';
            wrap.innerHTML =
              '<p class="dwb-lead">' + esc(tr('docWbStepSourceDesc', 'Upload an EPUB, PDF, TXT, or Markdown file to extract every word and compute frequency, percentage, and percentile.')) + '</p>' +
              '<div class="dwb-mode-toggle">' +
                '<button type="button" class="dwb-mode-btn' + (state.sourceType === 'upload' ? ' is-active' : '') + '" id="dwb-src-upload">' + esc(tr('docWbSrcUpload', 'Upload File')) + '</button>' +
                '<button type="button" class="dwb-mode-btn' + (state.sourceType === 'app' ? ' is-active' : '') + '" id="dwb-src-app">' + esc(tr('docWbSrcAppLib', 'App Library (Books & Docs)')) + '</button>' +
              '</div>' +
              '<div id="dwb-panel-upload" style="' + (state.sourceType === 'upload' ? '' : 'display:none') + '">' +
                '<div class="dwb-dropzone" id="dwb-dropzone">' +
                  '<div class="dwb-drop-icon">' + api.iconHtml('upload.svg', 'dwb-icon-lg') + '</div>' +
                  '<div class="dwb-drop-title">' + esc(tr('docWbDropTitle', 'Drop .epub, .pdf, .txt, or .md file here')) + '</div>' +
                  '<button type="button" class="btn btn-primary btn-sm" id="dwb-browse-btn">' + esc(tr('importStep2Browse', 'Browse')) + '</button>' +
                  '<div class="dwb-drop-sub">' + esc(tr('docWbSupports', 'Supports EPUB, PDF, TXT, MD')) + '</div>' +
                '</div>' +
                '<input type="file" id="dwb-file-input" accept=".epub,.pdf,.txt,.md,.markdown" style="display:none" />' +
              '</div>' +
              '<div id="dwb-panel-app" class="dwb-lib-wrap" style="' + (state.sourceType === 'app' ? '' : 'display:none') + '">' +
                '<input type="text" id="dwb-app-search" class="dwb-search-input" placeholder="' + esc(tr('docWbAppLibSearch', 'Search books in custom-data/books & Document Editor...')) + '" value="' + esc(state.appDocSearch) + '" />' +
                '<div class="dwb-lib-list" id="dwb-app-list"></div>' +
              '</div>' +
              '<div id="dwb-source-status" class="dwb-status-box" style="display:none;"></div>';
            container.appendChild(wrap);

            var btnSrcUpload = wrap.querySelector('#dwb-src-upload');
            var btnSrcApp = wrap.querySelector('#dwb-src-app');
            var panelUpload = wrap.querySelector('#dwb-panel-upload');
            var panelApp = wrap.querySelector('#dwb-panel-app');
            var appSearchEl = wrap.querySelector('#dwb-app-search');
            var appListEl = wrap.querySelector('#dwb-app-list');
            var dropzone = wrap.querySelector('#dwb-dropzone');
            var fileInput = wrap.querySelector('#dwb-file-input');
            var browseBtn = wrap.querySelector('#dwb-browse-btn');
            var statusBox = wrap.querySelector('#dwb-source-status');

            function updateStatusUI() {
              if (state.extracting) {
                statusBox.style.display = 'block';
                statusBox.innerHTML = '<div class="dwb-loading">' + esc(tr('docWbExtracting', 'Extracting text from document...')) + '</div>';
                api.setNextEnabled(false);
                return;
              }
              if (state.extractError) {
                statusBox.style.display = 'block';
                statusBox.innerHTML = '<div class="dwb-err">' + esc(state.extractError) + '</div>';
                api.setNextEnabled(false);
                return;
              }
              if (state.rawText) {
                var approxWords = state.rawText.trim() ? state.rawText.trim().split(/\s+/).length : 0;
                var excerpt = state.rawText.trim().slice(0, 320) + (state.rawText.length > 320 ? '...' : '');
                statusBox.style.display = 'block';
                statusBox.innerHTML =
                  '<div class="dwb-file-pill">' +
                    '<strong>' + esc(state.fileName) + '</strong>' +
                    '<span class="dwb-badge">.' + esc(state.ext.toUpperCase()) + '</span>' +
                    '<span class="dwb-badge">' + approxWords.toLocaleString() + ' ' + esc(tr('docWbWordsUnit', 'words')) + '</span>' +
                  '</div>' +
                  '<div class="dwb-excerpt">' + esc(excerpt) + '</div>';
                api.setNextEnabled(true);
              } else {
                statusBox.style.display = 'none';
                api.setNextEnabled(false);
              }
            }

            async function handleSelectedFile(file) {
              if (!file) return;
              state.file = file;
              state.appSource = null;
              state.fileName = file.name;
              state.ext = (file.name.split('.').pop() || '').toLowerCase();
              state.extracting = true;
              state.extractError = '';
              state.rawText = '';
              if (!state.newFilename) {
                state.newFilename = file.name.replace(/\.[^.]+$/, '') + '-wordbank';
              }
              if (!state.theme) {
                state.theme = file.name.replace(/\.[^.]+$/, '');
              }
              updateStatusUI();

              try {
                var res = await root.DocumentWordbankExtractor.extractRawTextFromFile(file);
                state.rawText = res.text || '';
                if (!state.rawText.trim()) {
                  state.extractError = tr('docWbNoTextFound', 'No readable text was found in this file.');
                } else {
                  recomputeAnalysis(state);
                }
              } catch (err) {
                state.extractError = (err && err.message) ? err.message : String(err);
              } finally {
                state.extracting = false;
                updateStatusUI();
              }
            }

            async function handleSelectedAppDoc(docItem) {
              if (!docItem) return;
              state.file = null;
              state.appSource = docItem;
              state.linkTargetKey = docItem.target + '::' + docItem.relativePath;
              state.linkToAppDoc = true;
              state.fileName = docItem.name;
              state.ext = docItem.ext;
              state.extracting = true;
              state.extractError = '';
              state.rawText = '';
              if (!state.newFilename) {
                state.newFilename = docItem.name.replace(/\.[^.]+$/, '') + '-wordbank';
              }
              if (!state.theme) {
                state.theme = docItem.name.replace(/\.[^.]+$/, '');
              }
              renderAppDocsList();
              updateStatusUI();

              try {
                var res = await root.DocumentWordbankExtractor.extractRawTextFromAppTarget(docItem.target, docItem.relativePath);
                state.rawText = res.text || '';
                if (!state.rawText.trim()) {
                  state.extractError = tr('docWbNoTextFound', 'No readable text was found in this file.');
                } else {
                  recomputeAnalysis(state);
                }
              } catch (err) {
                state.extractError = (err && err.message) ? err.message : String(err);
              } finally {
                state.extracting = false;
                updateStatusUI();
              }
            }

            function renderAppDocsList() {
              if (!state.appDocsLoaded) {
                appListEl.innerHTML = '<div class="dwb-hint">' + esc(tr('loading', 'Loading...')) + '</div>';
                return;
              }
              var q = (state.appDocSearch || '').trim().toLowerCase();
              var filtered = q ? state.appDocs.filter(function (d) {
                return d.relativePath.toLowerCase().indexOf(q) !== -1 || d.sourceLabel.toLowerCase().indexOf(q) !== -1;
              }) : state.appDocs;
              if (!filtered.length) {
                appListEl.innerHTML = '<div class="dwb-hint">' + esc(tr('docWbAppLibEmpty', 'No supported documents found in custom-data/books or Document Editor.')) + '</div>';
                return;
              }
              appListEl.innerHTML = '';
              filtered.forEach(function (item) {
                var btn = document.createElement('button');
                btn.type = 'button';
                var isSel = state.appSource && state.appSource.target === item.target && state.appSource.relativePath === item.relativePath;
                btn.className = 'dwb-lib-item' + (isSel ? ' is-selected' : '');
                var badgeLabel = item.target === 'customBooks' ? tr('docWbBadgeBooks', 'Books') : tr('docWbBadgeDocs', 'Docs');
                btn.innerHTML = '<span>' + esc(item.relativePath) + '</span><span class="dwb-lib-badge">' + esc(badgeLabel) + '</span>';
                btn.addEventListener('click', function () { handleSelectedAppDoc(item); });
                appListEl.appendChild(btn);
              });
            }

            function loadAppDocsIfNeeded() {
              if (state.appDocsLoaded) {
                renderAppDocsList();
                return;
              }
              renderAppDocsList();
              root.DocumentWordbankExtractor.listAppDocumentSources().then(function (list) {
                state.appDocs = list || [];
                state.appDocsLoaded = true;
                renderAppDocsList();
              }).catch(function () {
                state.appDocs = [];
                state.appDocsLoaded = true;
                renderAppDocsList();
              });
            }

            function setSourceType(t) {
              state.sourceType = t;
              btnSrcUpload.classList.toggle('is-active', t === 'upload');
              btnSrcApp.classList.toggle('is-active', t === 'app');
              panelUpload.style.display = t === 'upload' ? '' : 'none';
              panelApp.style.display = t === 'app' ? '' : 'none';
              if (t === 'app') loadAppDocsIfNeeded();
            }

            btnSrcUpload.addEventListener('click', function () { setSourceType('upload'); });
            btnSrcApp.addEventListener('click', function () { setSourceType('app'); });
            appSearchEl.addEventListener('input', function () {
              state.appDocSearch = appSearchEl.value;
              renderAppDocsList();
            });
            if (state.sourceType === 'app') loadAppDocsIfNeeded();

            browseBtn.addEventListener('click', function (ev) {
              ev.stopPropagation();
              fileInput.click();
            });
            dropzone.addEventListener('click', function () { fileInput.click(); });
            dropzone.addEventListener('dragover', function (ev) {
              ev.preventDefault();
              dropzone.classList.add('is-dragover');
            });
            dropzone.addEventListener('dragleave', function () {
              dropzone.classList.remove('is-dragover');
            });
            dropzone.addEventListener('drop', function (ev) {
              ev.preventDefault();
              dropzone.classList.remove('is-dragover');
              if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files.length) {
                handleSelectedFile(ev.dataTransfer.files[0]);
              }
            });
            fileInput.addEventListener('change', function () {
              if (fileInput.files && fileInput.files.length) {
                handleSelectedFile(fileInput.files[0]);
                fileInput.value = '';
              }
            });

            updateStatusUI();
          },
          validate: function (state) {
            if (!state.rawText || !state.rawText.trim()) {
              return tr('docWbErrNoFile', 'Please select a valid EPUB, PDF, TXT, or Markdown file first.');
            }
            return true;
          }
        },
        {
          id: 'options',
          label: tr('docWbStepOptions', 'Options'),
          render: function (container, state) {
            var wrap = document.createElement('div');
            wrap.className = 'dwb-step-wrap';
            wrap.innerHTML =
              '<div class="dwb-opt-grid">' +
                '<div class="dwb-field">' +
                  '<label>' + esc(tr('importWbFieldSourceLang', 'Source Language')) + '</label>' +
                  '<select id="dwb-opt-lang">' +
                    '<option value="en">English (en)</option>' +
                    '<option value="fr">Français (fr)</option>' +
                    '<option value="de">Deutsch (de)</option>' +
                    '<option value="it">Italiano (it)</option>' +
                  '</select>' +
                '</div>' +
                '<div class="dwb-field">' +
                  '<label>' + esc(tr('docWbOptCase', 'Case Normalization')) + '</label>' +
                  '<select id="dwb-opt-case">' +
                    '<option value="lower">' + esc(tr('docWbOptCaseLower', 'Lowercase (merge capitalized words)')) + '</option>' +
                    '<option value="preserve">' + esc(tr('docWbOptCasePreserve', 'Preserve original casing')) + '</option>' +
                  '</select>' +
                '</div>' +
                '<div class="dwb-field">' +
                  '<label>' + esc(tr('docWbOptMinLen', 'Minimum Word Length')) + '</label>' +
                  '<input type="number" id="dwb-opt-minlen" min="1" max="20" value="' + esc(state.minLength) + '" />' +
                '</div>' +
                '<div class="dwb-field">' +
                  '<label>' + esc(tr('docWbOptMinOcc', 'Minimum Occurrences')) + '</label>' +
                  '<input type="number" id="dwb-opt-minocc" min="1" max="1000" value="' + esc(state.minOccurrences) + '" />' +
                '</div>' +
                '<div class="dwb-field">' +
                  '<label>' + esc(tr('docWbOptMaxWords', 'Max Words (0 = all)')) + '</label>' +
                  '<input type="number" id="dwb-opt-maxwords" min="0" max="50000" value="' + esc(state.maxWords) + '" />' +
                '</div>' +
                '<div class="dwb-field">' +
                  '<label>' + esc(tr('docWbOptSort', 'Sort Order')) + '</label>' +
                  '<select id="dwb-opt-sort">' +
                    '<option value="frequency_desc">' + esc(tr('docWbSortFreq', 'Most frequent first')) + '</option>' +
                    '<option value="alpha_asc">' + esc(tr('docWbSortAlpha', 'Alphabetical (A-Z)')) + '</option>' +
                    '<option value="appearance">' + esc(tr('docWbSortAppear', 'Order of appearance')) + '</option>' +
                  '</select>' +
                '</div>' +
                '<div class="dwb-field dwb-col-span-2">' +
                  '<label>' + esc(tr('docWbOptTheme', 'Theme / Source Tag')) + '</label>' +
                  '<input type="text" id="dwb-opt-theme" value="' + esc(state.theme) + '" placeholder="e.g. Chapter 1, Novel..." />' +
                '</div>' +
                '<div class="dwb-field">' +
                  '<label>' + esc(tr('docWbOptExcludeWords', 'Exclude Specific Words')) + '</label>' +
                  '<input type="text" id="dwb-opt-excludewords" value="' + esc(state.excludeWords) + '" placeholder="' + esc(tr('docWbOptExcludeWordsPh', 'e.g. chapter, page, isbn')) + '" />' +
                '</div>' +
                '<div class="dwb-field">' +
                  '<label>' + esc(tr('docWbOptExcludeChars', 'Exclude Words Containing Characters')) + '</label>' +
                  '<input type="text" id="dwb-opt-excludechars" value="' + esc(state.excludeChars) + '" placeholder="' + esc(tr('docWbOptExcludeCharsPh', 'e.g. - _ ’')) + '" />' +
                '</div>' +
              '</div>' +
              '<div class="dwb-checks-row">' +
                '<label class="dwb-check-lbl"><input type="checkbox" id="dwb-opt-stop"' + (state.excludeStopwords ? ' checked' : '') + ' /> ' + esc(tr('docWbOptStopwords', 'Exclude common stopwords')) + '</label>' +
                '<label class="dwb-check-lbl"><input type="checkbox" id="dwb-opt-contractions"' + (state.excludeContractions ? ' checked' : '') + ' /> ' + esc(tr('docWbOptExcludeContractions', 'Exclude contractions (don\'t, it\'s, l\'...)')) + '</label>' +
                '<label class="dwb-check-lbl"><input type="checkbox" id="dwb-opt-ex"' + (state.includeExample ? ' checked' : '') + ' /> ' + esc(tr('docWbOptExample', 'Include example sentence from text')) + '</label>' +
              '</div>';
            container.appendChild(wrap);

            wrap.querySelector('#dwb-opt-lang').value = state.sourceLanguage;
            wrap.querySelector('#dwb-opt-case').value = state.caseMode;
            wrap.querySelector('#dwb-opt-sort').value = state.sortBy;

            function syncFromInputs() {
              state.sourceLanguage = wrap.querySelector('#dwb-opt-lang').value;
              state.caseMode = wrap.querySelector('#dwb-opt-case').value;
              state.minLength = Math.max(1, parseInt(wrap.querySelector('#dwb-opt-minlen').value, 10) || 1);
              state.minOccurrences = Math.max(1, parseInt(wrap.querySelector('#dwb-opt-minocc').value, 10) || 1);
              state.maxWords = Math.max(0, parseInt(wrap.querySelector('#dwb-opt-maxwords').value, 10) || 0);
              state.sortBy = wrap.querySelector('#dwb-opt-sort').value;
              state.theme = wrap.querySelector('#dwb-opt-theme').value;
              state.excludeWords = wrap.querySelector('#dwb-opt-excludewords').value;
              state.excludeChars = wrap.querySelector('#dwb-opt-excludechars').value;
              state.excludeStopwords = wrap.querySelector('#dwb-opt-stop').checked;
              state.excludeContractions = wrap.querySelector('#dwb-opt-contractions').checked;
              state.includeExample = wrap.querySelector('#dwb-opt-ex').checked;
            }

            wrap.addEventListener('change', syncFromInputs);
            wrap.addEventListener('input', syncFromInputs);
          },
          validate: function (state) {
            recomputeAnalysis(state);
            if (!state.analysis || !state.analysis.entries.length) {
              return tr('docWbErrNoWordsAfterFilter', 'No words matched your filter settings. Try lowering minimum length or occurrences.');
            }
            return true;
          }
        },
        {
          id: 'preview',
          label: tr('docWbStepPreview', 'Preview'),
          render: function (container, state) {
            if (!state.analysis) recomputeAnalysis(state);
            var entries = state.analysis ? state.analysis.entries : [];
            if (!state.selectedKeys) {
              state.selectedKeys = new Set(entries.map(function (e) { return e.word; }));
            }

            var wrap = document.createElement('div');
            wrap.className = 'dwb-step-wrap';
            wrap.innerHTML =
              '<div class="dwb-stats-bar">' +
                '<div class="dwb-stat"><span class="dwb-stat-val">' + (state.analysis ? state.analysis.totalTokens.toLocaleString() : 0) + '</span><span class="dwb-stat-lbl">' + esc(tr('docWbStatTokens', 'Total Words')) + '</span></div>' +
                '<div class="dwb-stat"><span class="dwb-stat-val">' + entries.length.toLocaleString() + '</span><span class="dwb-stat-lbl">' + esc(tr('docWbStatUnique', 'Unique Words')) + '</span></div>' +
                '<div class="dwb-stat"><span class="dwb-stat-val" id="dwb-selected-count">' + state.selectedKeys.size.toLocaleString() + '</span><span class="dwb-stat-lbl">' + esc(tr('docWbStatSelected', 'Selected')) + '</span></div>' +
              '</div>' +
              '<div class="dwb-preview-toolbar">' +
                '<input type="text" id="dwb-preview-search" class="dwb-search-input" placeholder="' + esc(tr('docWbSearchPlaceholder', 'Filter words...')) + '" value="' + esc(state.searchQuery) + '" />' +
                '<button type="button" class="btn btn-secondary btn-sm" id="dwb-sel-all">' + esc(tr('mdbBtnSelectAll', 'Select All')) + '</button>' +
                '<button type="button" class="btn btn-secondary btn-sm" id="dwb-sel-none">' + esc(tr('mdbBtnNone', 'None')) + '</button>' +
              '</div>' +
              '<div class="dwb-table-wrap">' +
                '<table class="dwb-table">' +
                  '<thead><tr>' +
                    '<th></th>' +
                    '<th>' + esc(tr('importWbFieldWord', 'Word')) + '</th>' +
                    '<th>' + esc(tr('importWbFieldOccurrences', 'Count')) + '</th>' +
                    '<th>' + esc(tr('importWbFieldPercentage', '%')) + '</th>' +
                    '<th>' + esc(tr('importWbFieldPercentile', 'Percentile')) + '</th>' +
                    '<th>' + esc(tr('importWbFieldExample', 'Example')) + '</th>' +
                  '</tr></thead>' +
                  '<tbody id="dwb-preview-tbody"></tbody>' +
                '</table>' +
              '</div>' +
              '<div class="dwb-table-note" id="dwb-table-note"></div>';
            container.appendChild(wrap);

            var tbody = wrap.querySelector('#dwb-preview-tbody');
            var countEl = wrap.querySelector('#dwb-selected-count');
            var noteEl = wrap.querySelector('#dwb-table-note');
            var searchEl = wrap.querySelector('#dwb-preview-search');

            function renderRows() {
              var q = (state.searchQuery || '').trim().toLowerCase();
              var visible = q ? entries.filter(function (e) { return e.word.toLowerCase().indexOf(q) !== -1; }) : entries;
              var limit = 250;
              var slice = visible.slice(0, limit);
              var html = '';
              for (var i = 0; i < slice.length; i++) {
                var e = slice[i];
                var checked = state.selectedKeys.has(e.word) ? ' checked' : '';
                html += '<tr>' +
                  '<td><input type="checkbox" class="dwb-row-chk" data-word="' + esc(e.word) + '"' + checked + ' /></td>' +
                  '<td><strong>' + esc(e.word) + '</strong></td>' +
                  '<td>' + esc(e.occurrences) + '</td>' +
                  '<td>' + esc(e.percentage.toFixed(2)) + '%</td>' +
                  '<td>' + esc(e.percentile.toFixed(1)) + '</td>' +
                  '<td class="dwb-ex-cell">' + esc(e.exampleSentence || '') + '</td>' +
                '</tr>';
              }
              tbody.innerHTML = html;
              countEl.textContent = state.selectedKeys.size.toLocaleString();
              if (visible.length > limit) {
                noteEl.textContent = tr('docWbPreviewTruncated', 'Showing first 250 matching words. All selected words will be exported.');
              } else {
                noteEl.textContent = '';
              }
            }

            tbody.addEventListener('change', function (ev) {
              var chk = ev.target.closest('.dwb-row-chk');
              if (!chk) return;
              var w = chk.getAttribute('data-word');
              if (chk.checked) state.selectedKeys.add(w);
              else state.selectedKeys.delete(w);
              countEl.textContent = state.selectedKeys.size.toLocaleString();
            });

            searchEl.addEventListener('input', function () {
              state.searchQuery = searchEl.value;
              renderRows();
            });

            wrap.querySelector('#dwb-sel-all').addEventListener('click', function () {
              entries.forEach(function (e) { state.selectedKeys.add(e.word); });
              renderRows();
            });

            wrap.querySelector('#dwb-sel-none').addEventListener('click', function () {
              state.selectedKeys.clear();
              renderRows();
            });

            renderRows();
          },
          validate: function (state) {
            if (!state.selectedKeys || state.selectedKeys.size === 0) {
              return tr('docWbErrNoSelected', 'Please select at least one word to save.');
            }
            return true;
          }
        },
        {
          id: 'target',
          label: tr('docWbStepTarget', 'Save Target'),
          render: function (container, state) {
            var wrap = document.createElement('div');
            wrap.className = 'dwb-step-wrap';
            wrap.innerHTML =
              '<div class="dwb-mode-toggle">' +
                '<button type="button" class="dwb-mode-btn' + (state.targetMode === 'new' ? ' is-active' : '') + '" id="dwb-mode-new">' + esc(tr('importWbNew', 'Create new file')) + '</button>' +
                '<button type="button" class="dwb-mode-btn' + (state.targetMode === 'existing' ? ' is-active' : '') + '" id="dwb-mode-existing">' + esc(tr('importWbExisting', 'Add to existing file')) + '</button>' +
              '</div>' +
              '<div id="dwb-target-new" style="' + (state.targetMode === 'new' ? '' : 'display:none') + '">' +
                '<div class="dwb-field">' +
                  '<label>' + esc(tr('importWbFileName', 'File name *')) + '</label>' +
                  '<input type="text" id="dwb-new-filename" value="' + esc(state.newFilename) + '" placeholder="e.g. chapter1-vocab" />' +
                  '<small class="dwb-hint">' + esc(tr('importWbFileNameHint', '.js will be added automatically')) + '</small>' +
                '</div>' +
              '</div>' +
              '<div id="dwb-target-existing" style="' + (state.targetMode === 'existing' ? '' : 'display:none') + '">' +
                '<div class="dwb-field">' +
                  '<label>' + esc(tr('importWbExistingLabel', 'Existing wordbank')) + '</label>' +
                  '<select id="dwb-existing-select"><option value="">' + esc(tr('loading', 'Loading...')) + '</option></select>' +
                '</div>' +
                '<div class="dwb-field" style="margin-top:10px;">' +
                  '<label>' + esc(tr('docWbConflictLabel', 'When word already exists')) + '</label>' +
                  '<select id="dwb-conflict-mode">' +
                    '<option value="overwrite">' + esc(tr('docWbConflictOverwrite', 'Update / Overwrite with new fields')) + '</option>' +
                    '<option value="skip">' + esc(tr('docWbConflictSkip', 'Skip existing words')) + '</option>' +
                  '</select>' +
                '</div>' +
              '</div>' +
              '<div class="dwb-field" style="margin-top:12px;padding-top:12px;border-top:1.5px dashed #ccc;">' +
                '<label class="dwb-check-lbl"><input type="checkbox" id="dwb-link-enable"' + (state.linkToAppDoc ? ' checked' : '') + ' /> ' + esc(tr('docWbLinkToAppDoc', 'Link wordbank to an App Document / Book (Links & Tags)')) + '</label>' +
                '<select id="dwb-link-select" style="margin-top:6px;' + (state.linkToAppDoc ? '' : 'display:none') + '"><option value="">' + esc(tr('loading', 'Loading...')) + '</option></select>' +
              '</div>';
            container.appendChild(wrap);

            var btnNew = wrap.querySelector('#dwb-mode-new');
            var btnEx = wrap.querySelector('#dwb-mode-existing');
            var boxNew = wrap.querySelector('#dwb-target-new');
            var boxEx = wrap.querySelector('#dwb-target-existing');
            var selEx = wrap.querySelector('#dwb-existing-select');
            var newInp = wrap.querySelector('#dwb-new-filename');
            var confSel = wrap.querySelector('#dwb-conflict-mode');
            var linkChk = wrap.querySelector('#dwb-link-enable');
            var linkSel = wrap.querySelector('#dwb-link-select');

            confSel.value = state.conflictMode;

            function setMode(m) {
              state.targetMode = m;
              btnNew.classList.toggle('is-active', m === 'new');
              btnEx.classList.toggle('is-active', m === 'existing');
              boxNew.style.display = m === 'new' ? '' : 'none';
              boxEx.style.display = m === 'existing' ? '' : 'none';
            }

            btnNew.addEventListener('click', function () { setMode('new'); });
            btnEx.addEventListener('click', function () { setMode('existing'); });
            newInp.addEventListener('input', function () { state.newFilename = newInp.value; });
            selEx.addEventListener('change', function () { state.existingFilename = selEx.value; });
            confSel.addEventListener('change', function () { state.conflictMode = confSel.value; });
            linkChk.addEventListener('change', function () {
              state.linkToAppDoc = linkChk.checked;
              linkSel.style.display = state.linkToAppDoc ? '' : 'none';
            });
            linkSel.addEventListener('change', function () {
              state.linkTargetKey = linkSel.value;
            });

            function populateLinkSelect(docs) {
              linkSel.innerHTML = '<option value="">' + esc(tr('docWbLinkNone', '— None —')) + '</option>';
              (docs || []).forEach(function (d) {
                var opt = document.createElement('option');
                opt.value = d.target + '::' + d.relativePath;
                var prefix = d.target === 'customBooks' ? tr('docWbBadgeBooks', 'Books') : tr('docWbBadgeDocs', 'Docs');
                opt.textContent = '[' + prefix + '] ' + d.relativePath;
                linkSel.appendChild(opt);
              });
              if (state.linkTargetKey) {
                linkSel.value = state.linkTargetKey;
              }
            }

            if (state.appDocsLoaded) {
              populateLinkSelect(state.appDocs);
            } else {
              root.DocumentWordbankExtractor.listAppDocumentSources().then(function (docs) {
                state.appDocs = docs || [];
                state.appDocsLoaded = true;
                populateLinkSelect(state.appDocs);
              }).catch(function () {
                populateLinkSelect([]);
              });
            }

            if (root.Desktop && typeof root.Desktop.listFiles === 'function') {
              root.Desktop.listFiles('customWordbanks', { extensions: ['.js'] }).then(function (r) {
                selEx.innerHTML = '';
                var files = (r && r.ok && Array.isArray(r.files)) ? r.files : [];
                if (!files.length) {
                  selEx.innerHTML = '<option value="">' + esc(tr('importWbNoFiles', '(no files found)')) + '</option>';
                  return;
                }
                files.forEach(function (f) {
                  var fn = f.filename || f;
                  var opt = document.createElement('option');
                  opt.value = fn;
                  opt.textContent = fn.replace(/\.js$/, '');
                  selEx.appendChild(opt);
                });
                if (state.existingFilename && Array.from(selEx.options).some(function (o) { return o.value === state.existingFilename; })) {
                  selEx.value = state.existingFilename;
                } else {
                  state.existingFilename = selEx.value;
                }
              }).catch(function () {
                selEx.innerHTML = '<option value="">' + esc(tr('importWbNoFiles', '(no files found)')) + '</option>';
              });
            } else {
              selEx.innerHTML = '<option value="">' + esc(tr('importWbNoFiles', '(no files found)')) + '</option>';
            }
          },
          validate: function (state) {
            if (state.targetMode === 'new' && !(state.newFilename || '').trim()) {
              return tr('importErrNoWbFileName', 'Please enter a file name for the wordbank');
            }
            if (state.targetMode === 'existing' && !(state.existingFilename || '').trim()) {
              return tr('importErrNoWbFile', 'Please select a wordbank file');
            }
            return true;
          }
        }
      ],
      onFinish: async function (state) {
        var entries = (state.analysis ? state.analysis.entries : []).filter(function (e) {
          return state.selectedKeys && state.selectedKeys.has(e.word);
        });
        var filename = state.targetMode === 'new' ? state.newFilename : state.existingFilename;
        var res = await root.DocumentWordbankExtractor.saveWordbankRecords(entries, {
          filename: filename,
          mode: state.targetMode,
          conflictMode: state.conflictMode
        });
        if (!res || !res.ok) {
          throw new Error((res && res.error) || tr('importErrSaveFail', 'Save failed'));
        }
        if (state.linkToAppDoc && state.linkTargetKey && state.linkTargetKey.indexOf('::') !== -1) {
          var parts = state.linkTargetKey.split('::');
          await root.DocumentWordbankExtractor.linkWordbankToDocument(res.filename, parts[0], parts.slice(1).join('::'));
        }
        if (typeof root.showToast === 'function') {
          root.showToast(tr('docWbSaveSuccess', 'Wordbank saved') + ': ' + res.filename + ' (' + res.added + ' added, ' + res.updated + ' updated)');
        }
        if (typeof opts.onSaved === 'function') {
          await opts.onSaved(res);
        }
        return true;
      }
    });
  }

  root.DocumentWordbankWizard = {
    open: open
  };
})(typeof window !== 'undefined' ? window : globalThis);
