    let _compPickerCallback = null;
    let _compPickerSelected = new Set();
    let _compPickerFilters = {
      search: '',
      subject: 'all',
      year: 'all',
      category: 'all',
      level: 'all',
      selectedOnly: false
    };

    function populateCompetencePickerFilters() {
      const subjSel = document.getElementById('gs-comp-filter-subject');
      const yrSel = document.getElementById('gs-comp-filter-year');
      const catSel = document.getElementById('gs-comp-filter-category');
      const lvlSel = document.getElementById('gs-comp-filter-level');
      if (!yrSel || !catSel || !lvlSel) return;

      const subjects = new Set();
      const years = new Set();
      const categories = new Set();
      const levels = new Set();

      _allLessonCompetences.forEach(c => {
        if (c.subjectId) subjects.add(c.subjectId);
        else if (c.subject) subjects.add(c.subject);
        if (c.year && c.year !== 'all') years.add(c.year);
        if (c.category && c.category !== 'all') categories.add(c.category);
        if (c.level && c.level !== 'all') levels.add(c.level);
      });

      const curSubj = _compPickerFilters.subject;
      const curYr = _compPickerFilters.year;
      const curCat = _compPickerFilters.category;
      const curLvl = _compPickerFilters.level;

      if (subjSel) {
        subjSel.innerHTML = `<option value="all">${t('cpStatusAll') || 'All Subjects'}</option>` +
          Array.from(subjects).sort().map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
        subjSel.value = subjects.has(curSubj) ? curSubj : 'all';
      }

      yrSel.innerHTML = `<option value="all">${t('gsCompFilterAllYears') || 'All Years'}</option>` +
        Array.from(years).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(y => `<option value="${escapeHtml(y)}">${escapeHtml(y)}</option>`).join('');
      yrSel.value = years.has(curYr) ? curYr : 'all';

      catSel.innerHTML = `<option value="all">${t('gsCompFilterAllDomains') || 'All Domains'}</option>` +
        Array.from(categories).sort().map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
      catSel.value = categories.has(curCat) ? curCat : 'all';

      lvlSel.innerHTML = `<option value="all">${t('gsCompFilterAllLevels') || 'All Levels'}</option>` +
        Array.from(levels).sort().map(l => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join('');
      lvlSel.value = levels.has(curLvl) ? curLvl : 'all';
    }

    function openCompetencePicker(initialSelectedIds, onApply) {
      _compPickerCallback = onApply;
      _compPickerSelected = new Set(Array.isArray(initialSelectedIds) ? initialSelectedIds : []);
      _compPickerFilters.search = '';
      _compPickerFilters.subject = 'all';
      _compPickerFilters.year = 'all';
      _compPickerFilters.category = 'all';
      _compPickerFilters.level = 'all';
      _compPickerFilters.selectedOnly = false;

      populateCompetencePickerFilters();

      const subjSel = document.getElementById('gs-comp-filter-subject');
      const yrSel = document.getElementById('gs-comp-filter-year');
      const catSel = document.getElementById('gs-comp-filter-category');
      const lvlSel = document.getElementById('gs-comp-filter-level');
      const searchInput = document.getElementById('gs-competence-picker-search');
      const showSelBtn = document.getElementById('gs-comp-filter-show-selected');

      if (searchInput) searchInput.value = '';
      if (subjSel) subjSel.value = 'all';
      if (yrSel) yrSel.value = 'all';
      if (catSel) catSel.value = 'all';
      if (lvlSel) lvlSel.value = 'all';

      // Auto pre-filter based on active class
      const activeClass = (typeof getActiveClass === 'function' && getActiveClass()) || null;
      if (activeClass) {
        const rawLvl = activeClass.level || activeClass.yearLevel || activeClass.year || '';
        if (rawLvl) {
          const targetLvl = String(rawLvl).toLowerCase().trim();
          let matchedYear = false;
          if (yrSel) {
            // Pass 1: Exact match
            for (let i = 0; i < yrSel.options.length; i++) {
              const val = (yrSel.options[i].value || '').toLowerCase().trim();
              const txt = (yrSel.options[i].textContent || '').toLowerCase().trim();
              if (val !== 'all' && val !== '' && (val === targetLvl || txt === targetLvl)) {
                yrSel.selectedIndex = i;
                _compPickerFilters.year = yrSel.value;
                matchedYear = true;
                break;
              }
            }
            // Pass 2: Token match
            if (!matchedYear) {
              const numMatch = targetLvl.match(/\b([1-6])\b/);
              const targetNum = numMatch ? numMatch[1] : null;
              for (let i = 0; i < yrSel.options.length; i++) {
                const val = (yrSel.options[i].value || '').toLowerCase().trim();
                const txt = (yrSel.options[i].textContent || '').toLowerCase().trim();
                if (val !== 'all' && val !== '') {
                  if (targetNum && (new RegExp('\\b' + targetNum + '([eè]me?|e|th)?\\b', 'i').test(val) || new RegExp('\\b' + targetNum + '([eè]me?|e|th)?\\b', 'i').test(txt))) {
                    yrSel.selectedIndex = i;
                    _compPickerFilters.year = yrSel.value;
                    matchedYear = true;
                    break;
                  }
                }
              }
            }
          }
          if (lvlSel) {
            for (let i = 0; i < lvlSel.options.length; i++) {
              const val = (lvlSel.options[i].value || '').toLowerCase().trim();
              const txt = (lvlSel.options[i].textContent || '').toLowerCase().trim();
              if (val !== 'all' && val !== '' && (val === targetLvl || txt === targetLvl || (targetLvl.length >= 2 && (val.includes(targetLvl) || targetLvl.includes(val))))) {
                lvlSel.selectedIndex = i;
                _compPickerFilters.level = lvlSel.value;
                break;
              }
            }
          }
        }
        if (activeClass.subject && subjSel) {
          const targetSubj = String(activeClass.subject).toLowerCase().trim();
          for (let i = 0; i < subjSel.options.length; i++) {
            const val = (subjSel.options[i].value || '').toLowerCase().trim();
            const txt = (subjSel.options[i].textContent || '').toLowerCase().trim();
            if (val !== 'all' && val !== '' && (val === targetSubj || txt === targetSubj || (val.length > 2 && targetSubj.includes(val)) || (targetSubj.length > 2 && val.includes(targetSubj)))) {
              subjSel.selectedIndex = i;
              _compPickerFilters.subject = subjSel.value;
              break;
            }
          }
        }
      }

      if (showSelBtn) {
        showSelBtn.classList.remove('active', 'primary');
      }

      renderCompetencePickerList();
      const overlay = document.getElementById('gs-competence-picker-overlay');
      if (overlay) overlay.classList.remove('hidden');
      if (searchInput) searchInput.focus();
    }

    function gsOpenCompetencePortfolio() {
      const classObj = (typeof getActiveClass === 'function' && getActiveClass()) || null;
      const classId = (classObj && classObj.id) || (typeof appState !== 'undefined' && appState.activeClassId) || '';
      if (window.Desktop && typeof Desktop.openTool === 'function') {
        Desktop.openTool('competence-portfolio.html', { query: { classId } });
      } else {
        window.open('competence-portfolio.html?classId=' + encodeURIComponent(classId), '_blank');
      }
    }

    function closeCompetencePicker() {
      const overlay = document.getElementById('gs-competence-picker-overlay');
      if (overlay) overlay.classList.add('hidden');
      _compPickerCallback = null;
    }

    function getFilteredCompetences() {
      const q = String(_compPickerFilters.search || '').toLowerCase().trim();
      const fs = _compPickerFilters.subject;
      const fy = _compPickerFilters.year;
      const fc = _compPickerFilters.category;
      const fl = _compPickerFilters.level;
      const fSelected = _compPickerFilters.selectedOnly;

      return _allLessonCompetences.filter(c => {
        if (fSelected && !_compPickerSelected.has(c.id)) return false;
        if (fs && fs !== 'all') {
          const cSubj = (c.subjectId || c.subject || '').toLowerCase();
          if (!cSubj.includes(fs.toLowerCase())) return false;
        }
        if (fy !== 'all' && c.year !== fy) return false;
        if (fc !== 'all' && c.category !== fc) return false;
        if (fl !== 'all' && c.level !== fl) return false;
        if (!q) return true;
        return (c.code && c.code.toLowerCase().includes(q)) ||
               (c.title && c.title.toLowerCase().includes(q)) ||
               (c.description && c.description.toLowerCase().includes(q)) ||
               (c.level && c.level.toLowerCase().includes(q)) ||
               (c.year && c.year.toLowerCase().includes(q)) ||
               (c.category && c.category.toLowerCase().includes(q));
      });
    }

    function renderCompetencePickerList() {
      const listEl = document.getElementById('gs-competence-picker-list');
      const countEl = document.getElementById('gs-competence-picker-count');
      if (!listEl) return;

      const filtered = getFilteredCompetences();

      if (countEl) {
        countEl.textContent = `${_compPickerSelected.size} selected (${filtered.length} visible)`;
      }

      if (filtered.length === 0) {
        listEl.innerHTML = '';
        const empty = document.createElement('div');
        empty.style.cssText = 'padding:16px;text-align:center;color:var(--muted);font-size:0.85rem;';
        empty.textContent = _allLessonCompetences.length === 0
          ? (t('gsNoCompetencesFound') || 'No competences found in Lesson Creator or database.')
          : (t('gsNoMatchingCompetences') || 'No matching competences.');
        listEl.appendChild(empty);
        return;
      }

      function createCompRow(comp) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:flex-start;gap:8px;padding:6px 8px;border-radius:5px;cursor:pointer;background:transparent;border:1px solid #f1f5f9;margin-bottom:2px;';

        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.style.marginTop = '3px';
        chk.style.cursor = 'pointer';

        const info = document.createElement('div');
        info.style.cssText = 'flex:1;min-width:0;';

        const topRow = document.createElement('div');
        topRow.style.cssText = 'display:flex;align-items:center;gap:5px;flex-wrap:wrap;';
        if (comp.code) {
          const codeSpan = document.createElement('span');
          codeSpan.style.cssText = 'background:#0284c7;color:#fff;border-radius:4px;padding:1px 6px;font-size:0.75rem;font-weight:700;';
          codeSpan.textContent = comp.code;
          topRow.appendChild(codeSpan);
        }
        if (comp.year) {
          const yrSpan = document.createElement('span');
          yrSpan.style.cssText = 'background:#e0e7ff;color:#3730a3;border-radius:4px;padding:1px 5px;font-size:0.72rem;font-weight:600;';
          yrSpan.textContent = comp.year;
          topRow.appendChild(yrSpan);
        }
        if (comp.category) {
          const catSpan = document.createElement('span');
          catSpan.style.cssText = 'background:#f1f5f9;color:#475569;border-radius:4px;padding:1px 5px;font-size:0.72rem;font-weight:500;';
          catSpan.textContent = comp.category;
          topRow.appendChild(catSpan);
        }
        if (comp.level) {
          const lvlSpan = document.createElement('span');
          lvlSpan.style.cssText = 'background:#fef3c7;color:#92400e;border-radius:4px;padding:1px 5px;font-size:0.72rem;font-weight:600;';
          lvlSpan.textContent = comp.level;
          topRow.appendChild(lvlSpan);
        }
        const titleSpan = document.createElement('span');
        titleSpan.style.cssText = 'font-weight:600;font-size:0.84rem;color:var(--ink);margin-left:2px;';
        titleSpan.textContent = comp.title;
        topRow.appendChild(titleSpan);

        info.appendChild(topRow);
        if (comp.description) {
          const descEl = document.createElement('div');
          descEl.style.cssText = 'font-size:0.78rem;color:var(--muted);margin-top:2px;line-height:1.3;';
          descEl.textContent = comp.description;
          info.appendChild(descEl);
        }

        function toggle() {
          if (_compPickerSelected.has(comp.id)) {
            _compPickerSelected.delete(comp.id);
            chk.checked = false;
            row.style.background = 'transparent';
            row.style.borderColor = '#f1f5f9';
          } else {
            _compPickerSelected.add(comp.id);
            chk.checked = true;
            row.style.background = '#f0f9ff';
            row.style.borderColor = '#bae6fd';

            if (typeof CompetenceAggregatorService !== 'undefined' && typeof CompetenceAggregatorService.promptAddLinkedCompetences === 'function') {
              CompetenceAggregatorService.promptAddLinkedCompetences(comp, _compPickerSelected, {
                onAdd: (linkedToAdd) => {
                  linkedToAdd.forEach(lc => {
                    _compPickerSelected.add(lc.id);
                  });
                  renderCompetencePickerList();
                }
              });
            }
          }
          const vis = getFilteredCompetences();
          if (countEl) countEl.textContent = `${_compPickerSelected.size} selected (${vis.length} visible)`;
        }

        chk.addEventListener('change', (e) => {
          e.stopPropagation();
          toggle();
        });
        row.addEventListener('click', (e) => {
          if (e.target === chk) return;
          toggle();
        });

        row.appendChild(chk);
        row.appendChild(info);
        return row;
      }

      function updateCompRow(row, comp) {
        const isChecked = _compPickerSelected.has(comp.id);
        const chk = row.querySelector('input[type="checkbox"]');
        if (chk && chk.checked !== isChecked) chk.checked = isChecked;
        row.style.background = isChecked ? '#f0f9ff' : 'transparent';
        row.style.borderColor = isChecked ? '#bae6fd' : '#f1f5f9';
      }

      if (window.DomSync && typeof window.DomSync.patchListByKey === 'function') {
        window.DomSync.patchListByKey(listEl, filtered, comp => comp.id, createCompRow, updateCompRow);
        return;
      }

      listEl.innerHTML = '';
      filtered.forEach(comp => {
        const row = createCompRow(comp);
        updateCompRow(row, comp);
        listEl.appendChild(row);
      });
    }

    (function wireCompetencePickerModal() {
      const overlay = document.getElementById('gs-competence-picker-overlay');
      const searchInput = document.getElementById('gs-competence-picker-search');
      const closeX = document.getElementById('gs-competence-picker-close-x');
      const cancelBtn = document.getElementById('gs-competence-picker-cancel');
      const applyBtn = document.getElementById('gs-competence-picker-apply');

      const subjSel = document.getElementById('gs-comp-filter-subject');
      const yrSel = document.getElementById('gs-comp-filter-year');
      const catSel = document.getElementById('gs-comp-filter-category');
      const lvlSel = document.getElementById('gs-comp-filter-level');
      const showSelBtn = document.getElementById('gs-comp-filter-show-selected');
      const resetBtn = document.getElementById('gs-comp-filter-reset');
      const selectAllBtn = document.getElementById('gs-comp-picker-select-all');
      const deselectAllBtn = document.getElementById('gs-comp-picker-deselect-all');

      if (closeX) closeX.addEventListener('click', closeCompetencePicker);
      if (cancelBtn) cancelBtn.addEventListener('click', closeCompetencePicker);
      if (overlay) {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) closeCompetencePicker();
        });
      }
      if (searchInput) {
        searchInput.addEventListener('input', () => {
          _compPickerFilters.search = searchInput.value;
          renderCompetencePickerList();
        });
      }
      if (subjSel) {
        subjSel.addEventListener('change', () => {
          _compPickerFilters.subject = subjSel.value;
          renderCompetencePickerList();
        });
      }
      if (yrSel) {
        yrSel.addEventListener('change', () => {
          _compPickerFilters.year = yrSel.value;
          renderCompetencePickerList();
        });
      }
      if (catSel) {
        catSel.addEventListener('change', () => {
          _compPickerFilters.category = catSel.value;
          renderCompetencePickerList();
        });
      }
      if (lvlSel) {
        lvlSel.addEventListener('change', () => {
          _compPickerFilters.level = lvlSel.value;
          renderCompetencePickerList();
        });
      }
      if (showSelBtn) {
        showSelBtn.addEventListener('click', () => {
          _compPickerFilters.selectedOnly = !_compPickerFilters.selectedOnly;
          showSelBtn.classList.toggle('active', _compPickerFilters.selectedOnly);
          showSelBtn.classList.toggle('primary', _compPickerFilters.selectedOnly);
          renderCompetencePickerList();
        });
      }
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          _compPickerFilters = { search: '', year: 'all', category: 'all', level: 'all', selectedOnly: false };
          if (searchInput) searchInput.value = '';
          if (yrSel) yrSel.value = 'all';
          if (catSel) catSel.value = 'all';
          if (lvlSel) lvlSel.value = 'all';
          if (showSelBtn) {
            showSelBtn.classList.remove('active', 'primary');
          }
          renderCompetencePickerList();
        });
      }
      if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
          const visible = getFilteredCompetences();
          visible.forEach(c => _compPickerSelected.add(c.id));
          renderCompetencePickerList();
        });
      }
      if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => {
          const visible = getFilteredCompetences();
          visible.forEach(c => _compPickerSelected.delete(c.id));
          renderCompetencePickerList();
        });
      }
      if (applyBtn) {
        applyBtn.addEventListener('click', () => {
          const result = Array.from(_compPickerSelected);
          if (typeof _compPickerCallback === 'function') {
            _compPickerCallback(result);
          }
          closeCompetencePicker();
        });
      }
    })();

