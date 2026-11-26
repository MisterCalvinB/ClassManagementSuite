    // =============================================
    // GAME: ORDER SENTENCES
    // =============================================
    let osCurrentSet = null;   // array of sentences in correct order
    let osShuffled = null;   // current displayed order (array of {text, correctIndex})
    let osUsedIdx = new Set();
    let osDragSrcIdx = null;
    let osSelectedTitle = null; // For filtering by story title

    function getOrderSentenceTitles() {
      const titles = new Set();
      awGetBankFilteredBySource('sentences').forEach(s => {
        if (s.title) titles.add(s.title);
      });
      return Array.from(titles).sort();
    }

    function buildOrderStoryFilter() {
      const mount = document.getElementById('os-filter-mount');
      if (!mount) return;
      mount.innerHTML = '';

      const filterBar = document.createElement('div');
      filterBar.className = 'filter-bar';

      const filterCol = document.createElement('div');
      filterCol.className = 'filter-col';

      const label = document.createElement('label');
      label.className = 'filter-label';
      label.textContent = 'Story';

      const pickerWrap = document.createElement('div');
      pickerWrap.className = 'theme-picker-wrap os-story-picker-wrap';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'theme-picker-btn';
      btn.textContent = osSelectedTitle ? osSelectedTitle : 'All Stories';
      btn.onclick = () => osStoryPickerToggle(btn);

      const dropdown = document.createElement('div');
      dropdown.className = 'theme-picker-dropdown';

      const storyTitles = getOrderSentenceTitles();

      // Add "All" option
      const allOption = document.createElement('div');
      allOption.className = 'theme-picker-option all-option';
      const allCheck = document.createElement('input');
      allCheck.type = 'radio';
      allCheck.name = 'os-story-filter';
      allCheck.value = '';
      allCheck.checked = !osSelectedTitle;
      allCheck.onchange = () => osStorySetSelected(null);
      allOption.appendChild(allCheck);
      const allLabel = document.createElement('span');
      allLabel.textContent = 'All Stories';
      allOption.appendChild(allLabel);
      dropdown.appendChild(allOption);

      // Add story options
      storyTitles.forEach(title => {
        const option = document.createElement('div');
        option.className = 'theme-picker-option';
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'os-story-filter';
        radio.value = title;
        radio.checked = osSelectedTitle === title;
        radio.onchange = () => osStorySetSelected(title);
        option.appendChild(radio);
        const titleLabel = document.createElement('span');
        titleLabel.textContent = title;
        option.appendChild(titleLabel);
        dropdown.appendChild(option);
      });

      pickerWrap.appendChild(btn);
      pickerWrap.appendChild(dropdown);
      filterCol.appendChild(label);
      filterCol.appendChild(pickerWrap);

      const sourceCol = document.createElement('div');
      sourceCol.className = 'filter-col';
      const sourceLabel = document.createElement('label');
      sourceLabel.className = 'filter-label';
      sourceLabel.textContent = 'Database';
      const sourceSelect = document.createElement('select');
      sourceSelect.id = 'os-source-select';
      sourceSelect.style.padding = '5px';
      sourceSelect.style.borderRadius = '5px';
      sourceSelect.onchange = () => {
        awSetSourceSelection('sentences', sourceSelect.value);
        osSelectedTitle = null;
        osUsedIdx.clear();
        buildOrderStoryFilter();
        osInit();
      };
      sourceCol.appendChild(sourceLabel);
      sourceCol.appendChild(sourceSelect);

      const resetCol = document.createElement('div');
      resetCol.className = 'filter-reset-col';
      const resetBtn = document.createElement('button');
      resetBtn.className = 'action-btn btn-grey';
      resetBtn.textContent = 'Reset';
      resetBtn.onclick = () => {
        osSelectedTitle = null;
        updateOrderStoryFilter();
        osUsedIdx.clear();
        osInit();
      };
      resetCol.appendChild(resetBtn);

      filterBar.appendChild(filterCol);
      filterBar.appendChild(sourceCol);
      filterBar.appendChild(resetCol);
      mount.appendChild(filterBar);

      awPopulateSourceSelect('os-source-select', 'sentences');
    }

    function osStoryPickerToggle(btn) {
      const wrap = btn.closest('.os-story-picker-wrap');
      const isOpen = wrap.classList.contains('open');
      document.querySelectorAll('.os-story-picker-wrap.open').forEach(w => w.classList.remove('open'));
      if (!isOpen) wrap.classList.add('open');
    }

    function osStorySetSelected(title) {
      osSelectedTitle = title;
      updateOrderStoryFilter();
      osUsedIdx.clear();
      osInit();
    }

    function updateOrderStoryFilter() {
      const btn = document.querySelector('.os-story-picker-wrap .theme-picker-btn');
      if (btn) {
        btn.textContent = osSelectedTitle ? osSelectedTitle : 'All Stories';
      }
      const radios = document.querySelectorAll('.os-story-picker-wrap input[type=radio]');
      radios.forEach(radio => {
        radio.checked = (osSelectedTitle === null && radio.value === '') || radio.value === osSelectedTitle;
      });
    }

    function osInit() {
      const sentenceBank = awGetBankFilteredBySource('sentences');
      if (!sentenceBank.length) {
        document.getElementById('os-progress').textContent = 'No sentence sets in this database yet.';
        document.getElementById('os-sentence-list').innerHTML = '';
        const fb = document.getElementById('os-feedback');
        fb.className = 'feedback hidden';
        fb.textContent = '';
        return;
      }

      // Pick an unused set
      let available = sentenceBank.map((s, i) => i).filter(i => !osUsedIdx.has(i));

      // Apply story title filter
      if (osSelectedTitle) {
        available = available.filter(i => sentenceBank[i].title === osSelectedTitle);
      }

      if (available.length === 0) {
        osUsedIdx.clear();
        available = sentenceBank.map((_, i) => i);
        // Reapply title filter if set
        if (osSelectedTitle) {
          available = available.filter(i => sentenceBank[i].title === osSelectedTitle);
        }
      }
      const idx = available[Math.floor(Math.random() * available.length)];
      osUsedIdx.add(idx);

      const raw = sentenceBank[idx];
      osCurrentSet = [];
      for (let n = 1; n <= 8; n++) {
        const s = raw['part' + n];
        if (s) osCurrentSet.push(s);
      }

      // Shuffle
      osShuffled = osCurrentSet.map((text, i) => ({ text, correctIndex: i, locked: false }));
      // Shuffle until not already in correct order
      do {
        osShuffled.sort(() => Math.random() - 0.5);
      } while (osShuffled.every((item, i) => item.correctIndex === i) && osCurrentSet.length > 1);

      const total = osSelectedTitle ? sentenceBank.filter(s => s.title === osSelectedTitle).length : sentenceBank.length;
      document.getElementById('os-progress').textContent =
        `Set ${osUsedIdx.size} of ${total} — ${osCurrentSet.length} sentences`;

      const fb = document.getElementById('os-feedback');
      fb.className = 'feedback hidden';
      fb.textContent = '';

      osTapFirst = null;
      osRender();
    }

    function osMoveItem(idx, delta) {
      const target = idx + delta;
      if (target < 0 || target >= osShuffled.length) return;
      if ((osShuffled[idx] && osShuffled[idx].locked) || (osShuffled[target] && osShuffled[target].locked)) return;
      [osShuffled[idx], osShuffled[target]] = [osShuffled[target], osShuffled[idx]];
      osTapFirst = null;
      osRender();
    }

    function osRender() {
      const list = document.getElementById('os-sentence-list');
      list.innerHTML = '';
      osShuffled.forEach((item, i) => {
        const div = document.createElement('div');
        div.className = 'os-item' + (item.locked ? ' os-correct' : '');
        div.draggable = !item.locked;
        div.dataset.idx = i;
        div.innerHTML =
          `<span class="os-drag-handle">⠿</span>` +
          `<span class="os-num">${i + 1}</span>` +
          `<span style="flex:1;">${item.text}</span>` +
          `<span class="os-move-controls">` +
            `<button type="button" class="os-move-btn" title="Move Up" ${i === 0 || item.locked ? 'disabled style="opacity:0.35;cursor:default;"' : ''} onclick="event.stopPropagation(); osMoveItem(${i}, -1)"><img src="../assets/icons/arrow-up.svg" alt="Up" /></button>` +
            `<button type="button" class="os-move-btn" title="Move Down" ${i === osShuffled.length - 1 || item.locked ? 'disabled style="opacity:0.35;cursor:default;"' : ''} onclick="event.stopPropagation(); osMoveItem(${i}, 1)"><img src="../assets/icons/arrow-down.svg" alt="Down" /></button>` +
          `</span>`;

        // Drag events
        div.addEventListener('dragstart', e => {
          if (item.locked) { e.preventDefault(); return; }
          osDragSrcIdx = i;
          div.classList.add('os-dragging');
          e.dataTransfer.effectAllowed = 'move';
        });
        div.addEventListener('dragend', () => {
          div.classList.remove('os-dragging');
          list.querySelectorAll('.os-item').forEach(el => el.classList.remove('os-drag-over'));
        });
        div.addEventListener('dragover', e => {
          if (item.locked) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          list.querySelectorAll('.os-item').forEach(el => el.classList.remove('os-drag-over'));
          if (i !== osDragSrcIdx) div.classList.add('os-drag-over');
        });
        div.addEventListener('drop', e => {
          e.preventDefault();
          if (item.locked || osDragSrcIdx === null || osDragSrcIdx === i) return;
          if (osShuffled[osDragSrcIdx] && osShuffled[osDragSrcIdx].locked) return;
          [osShuffled[osDragSrcIdx], osShuffled[i]] = [osShuffled[i], osShuffled[osDragSrcIdx]];
          osDragSrcIdx = null;
          osRender();
        });

        // Touch / click-based swap: tap first item then second to swap
        div.addEventListener('click', () => osTapSwap(i));

        list.appendChild(div);
      });
    }

    let osTapFirst = null;
    function osTapSwap(i) {
      if (!osShuffled[i] || osShuffled[i].locked) return;
      const items = document.querySelectorAll('#os-sentence-list .os-item');
      if (osTapFirst === null) {
        osTapFirst = i;
        if (items[i]) {
          items[i].style.outline = '3px solid #111';
          items[i].style.outlineOffset = '2px';
        }
      } else {
        if (osTapFirst !== i && (!osShuffled[osTapFirst] || !osShuffled[osTapFirst].locked)) {
          [osShuffled[osTapFirst], osShuffled[i]] = [osShuffled[i], osShuffled[osTapFirst]];
        }
        osTapFirst = null;
        osRender();
      }
    }

    function osCheck() {
      if (!osCurrentSet) return;
      const list = document.getElementById('os-sentence-list');
      const items = list.querySelectorAll('.os-item');
      let allCorrect = true;
      osShuffled.forEach((item, i) => {
        const el = items[i];
        const isCorrect = item.correctIndex === i;
        item.locked = isCorrect;
        if (!isCorrect) allCorrect = false;
        if (el) {
          el.classList.remove('os-correct', 'os-wrong');
          el.classList.add(isCorrect ? 'os-correct' : 'os-wrong');
          el.draggable = !isCorrect;
          el.style.cursor = isCorrect ? 'default' : 'grab';
        }
      });

      const fb = document.getElementById('os-feedback');
      if (allCorrect) {
        fb.className = 'feedback status-correct';
        fb.textContent = 'Perfect! All sentences are in the correct order.';
        fb.classList.remove('hidden');
        awardPoints(POINTS_WIN);
        showSuccess(() => { nextTeamTurn(); osInit(); });
      } else {
        const correct = osShuffled.filter((item, i) => item.correctIndex === i).length;
        fb.className = 'feedback status-wrong';
        fb.textContent = `${correct} of ${osCurrentSet.length} sentences are in the right position. Correct ones are locked — keep trying!`;
        fb.classList.remove('hidden');
      }
    }

    function osReveal() {
      if (!osCurrentSet) return;
      osShuffled.forEach(item => { item.locked = true; });
      osShuffled.sort((a, b) => a.correctIndex - b.correctIndex);
      osRender();
      const items = document.querySelectorAll('#os-sentence-list .os-item');
      items.forEach(el => {
        el.classList.add('os-correct');
        el.draggable = false;
        el.style.cursor = 'default';
      });
      const fb = document.getElementById('os-feedback');
      fb.className = 'feedback status-correct';
      fb.textContent = 'Here is the correct order.';
      fb.classList.remove('hidden');
    }

    // =============================================
    // GAME: MATCHING
    let matchNumPairs = 6;
    let matchMode = 'def'; // 'def' | 'trans' | 'syn'

    function matchSetPairs(n) {
      matchNumPairs = n;
      document.querySelectorAll('#match-game-section .match-pairs-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.textContent) === n);
      });
      initMatchGame();
    }

    function matchSetMode(mode) {
      matchMode = mode || 'def';
      document.querySelectorAll('#match-game-section .match-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === matchMode);
      });
      initMatchGame();
    }

    function _matchGetPairText(item) {
      if (matchMode === 'trans') {
        const tr = getTranslation(item);
        if (tr && tr.toLowerCase() !== String(item.word || '').toLowerCase()) return tr;
      } else if (matchMode === 'syn') {
        const syn = _firstVal(item.synonyms);
        if (syn) return '≈ ' + syn;
        if (item.ipa) return '/ ' + item.ipa + ' /';
      }
      return _firstVal(item.definition);
    }

    function initMatchGame() {
      setCurrentGameWord(null);
      const container = document.getElementById('match-game');
      container.innerHTML = '';
      const filterFn = w => {
        if (matchMode === 'trans') return !!(getTranslation(w) || _firstVal(w.definition));
        if (matchMode === 'syn') return !!(_firstVal(w.synonyms) || w.ipa || _firstVal(w.definition));
        return !!_firstVal(w.definition).trim();
      };
      const set = getRandomSet(matchNumPairs, filterFn);
      trackSeenWords(set, 'definition');
      const items = [
        ...set.map(i => ({ txt: i.word.toLowerCase(), type: 'w', id: i.word.toLowerCase(), wordObj: i })),
        ...set.map(i => ({ txt: _matchGetPairText(i), type: 'd', id: i.word.toLowerCase(), wordObj: i }))
      ].sort(() => Math.random() - 0.5);

      let matchSelection = null;
      items.forEach(item => {
        const c = document.createElement('div');
        c.className = 'card match-card';
        c.textContent = item.txt;
        c.onclick = () => {
          if (c.classList.contains('matched') || c.classList.contains('wrong-match')) return;
          if (!matchSelection) {
            matchSelection = { item, el: c };
            c.classList.add('selected');
            return;
          }
          if (matchSelection.el === c) {
            c.classList.remove('selected');
            matchSelection = null;
            return;
          }
          // Clicking another card of the SAME type (e.g. word -> word) switches selection
          if (matchSelection.item.type === item.type) {
            matchSelection.el.classList.remove('selected');
            matchSelection = { item, el: c };
            c.classList.add('selected');
            return;
          }
          // Different types: check match
          const prev = matchSelection;
          prev.el.classList.remove('selected');
          matchSelection = null;
          if (prev.item.id === item.id) {
            c.classList.add('matched');
            prev.el.classList.add('matched');
            setCurrentGameWord(item.wordObj);
            if (teams.length >= 2) {
              awardPoints(5);
            } else {
              playSuccessSound();
            }
            if (container.querySelectorAll('.card.matched').length === items.length) {
              awardPoints(teams.length >= 2 ? 10 : POINTS_WIN);
              showSuccess(() => { nextTeamTurn(); initMatchGame(); });
            }
          } else {
            c.classList.add('wrong-match');
            prev.el.classList.add('wrong-match');
            awardPoints(POINTS_WRONG_PENALTY);
            setTimeout(() => {
              c.classList.remove('wrong-match');
              prev.el.classList.remove('wrong-match');
            }, 450);
            if (teams.length >= 2) {
              setTimeout(() => wsNextTeamTurn(), 480);
            }
          }
        };
        container.appendChild(c);
      });
    }

    // --- GAME: FLIP CARDS ---
    let flipCardCount = 12;

    function flipSetCount(n) {
      flipCardCount = n;
      document.querySelectorAll('#flip-game-section .flip-count-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.textContent) === n);
      });
      initFlipGame();
    }

    function flipToggleAllCards() {
      const cards = Array.from(document.querySelectorAll('#flip-game .flip-card'));
      if (!cards.length) return;
      const allFlipped = cards.every(c => c.classList.contains('flipped'));
      cards.forEach(c => c.classList.toggle('flipped', !allFlipped));
    }

    function initFlipGame() {
      const container = document.getElementById('flip-game');
      container.innerHTML = '';
      const set = getRandomSet(flipCardCount);
      trackSeenWords(set, 'flashcards');
      set.forEach(item => {
        const div = document.createElement('div');
        div.className = 'flip-card';
        const ipaHtml = item.ipa ? `<div style="font-family:'Courier New',monospace;font-size:0.78rem;color:#666;margin-bottom:4px;">/ ${item.ipa} /</div>` : '';
        const otherFormsHtml = item.otherForms ? `<div style="font-size:0.78rem;color:#666;margin-top:4px;">${item.otherForms}</div>` : '';
        const safeWordAttr = String(item.word || '').replace(/'/g, "\\'");
        const cardActionsHtml = `<div style="margin-top:8px;display:flex;gap:6px;justify-content:center;" onclick="event.stopPropagation();">
          <button type="button" class="action-btn btn-blue" style="padding:3px 8px;font-size:0.72rem;" title="Listen" onclick="ltSpeakWord('${safeWordAttr}')"><img src="../assets/icons/volume.svg" class="btn-icon" style="margin:0;width:13px;height:13px;" alt="" /></button>
          <button type="button" class="action-btn btn-grey" style="padding:3px 8px;font-size:0.72rem;" title="Word Card" onclick="showWordDetail('${safeWordAttr}')"><img src="../assets/icons/word-card.svg" class="btn-icon" style="margin:0;width:13px;height:13px;" alt="" /></button>
        </div>`;
        div.innerHTML = `<div class="flip-card-inner"><div class="flip-card-front">${item.word.toLowerCase()}</div><div class="flip-card-back">${ipaHtml}<strong>${getTranslation(item)}</strong><em style="display:block;margin-top:2px;">(${item.partOfSpeech})</em>${otherFormsHtml}<br>${_firstVal(item.definition)}${cardActionsHtml}</div></div>`;
        div.addEventListener('click', () => {
          div.classList.toggle('flipped');
        });
        container.appendChild(div);
      });
    }

    // --- GAME: HANGMAN ---
    let hWordObj, hGuessed, hMistakes, hMaxMistakes = 8;
    let hangmanClueStep = 0;
    let hangmanClueRevealed = false;
    let hangmanProjectionRevealAll = false;

    function hangmanBuildClueHtml(stepOverride) {
      if (!hWordObj) return '';
      const step = stepOverride || hangmanClueStep || 1;
      const parts = [];
      const posTheme = [
        hWordObj.partOfSpeech ? `<strong>Part of Speech:</strong> ${hWordObj.partOfSpeech}` : '',
        hWordObj.theme ? `<strong>Theme:</strong> ${_allVals(hWordObj.theme).join(', ')}` : '',
        `<strong>Letters:</strong> ${hWordObj.word.length}`
      ].filter(Boolean).join(' · ');
      if (step >= 1 && posTheme) parts.push(posTheme);
      if (step >= 2) parts.push(`<strong>${t('defLabel')}</strong> ${_firstVal(hWordObj.definition)}`);
      if (step >= 3) {
        const extra = [];
        if (hWordObj.ipa) extra.push(`<span style="font-family:'Courier New',monospace;font-size:0.95rem;color:#555;">/ ${hWordObj.ipa} /</span>`);
        const tr = getTranslation(hWordObj);
        if (tr) extra.push(`<strong>Translation:</strong> ${tr}`);
        if (extra.length) parts.push(extra.join(' · '));
      }
      return parts.join('<br>');
    }

    function hangmanRenderPresenterPreview() {
      const fb = document.getElementById('hangman-feedback');
      const btn = document.getElementById('hangman-clue-btn');
      if (!fb || !btn || !hWordObj) return;
      const presenterPreview = ltIsPresenterPreviewActive('hangman-game-section');

      if (presenterPreview) {
        fb.innerHTML = hangmanBuildClueHtml(3);
        fb.className = 'feedback status-correct lt-presenter-grey';
        fb.classList.remove('hidden');
        btn.textContent = hangmanProjectionRevealAll ? 'Clues revealed' : 'Reveal clues';
        btn.disabled = !!hangmanProjectionRevealAll;
        return;
      }

      fb.classList.remove('lt-presenter-grey');
      if (!hangmanClueRevealed && fb.classList.contains('status-correct')) {
        fb.classList.add('hidden');
        fb.innerHTML = '';
      }
      if (hangmanClueStep >= 3) {
        btn.innerHTML = t('clueShown');
        btn.disabled = true;
      } else {
        const label = hangmanClueStep === 0 ? t('btnClue') : `${t('btnClue')} (${hangmanClueStep + 1}/3)`;
        btn.innerHTML = '<img src="../assets/icons/lightbulb.svg" class="btn-icon" alt="" /> ' + label;
        btn.disabled = false;
      }
    }

    function hSetMaxMistakes(n) {
      hMaxMistakes = n;
      document.querySelectorAll('#hangman-game-section .hangman-tries-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.textContent) === n);
      });
      if (hWordObj) { hGuessed = []; hMistakes = 0; renderH(); }
    }

    function selectRandomWord() {
      const filtered = getFilteredBank();
      if (!filtered.length) return;
      hWordObj = pickUnused(filtered);
      if (!hWordObj || typeof hWordObj.word !== 'string' || !hWordObj.word.trim()) return;
      hGuessed = []; hMistakes = 0;
      hangmanClueStep = 0;
      hangmanClueRevealed = false;
      hangmanProjectionRevealAll = false;
      setCurrentGameWord(hWordObj);
      trackSeenWord(hWordObj, 'hangman');
      document.getElementById('hangman-feedback').classList.add('hidden');
      const inp = document.getElementById('hangman-type-input');
      if (inp) { inp.value = ''; inp.style.borderColor = '#bbb'; inp.disabled = false; }
      const clueBtn = document.getElementById('hangman-clue-btn');
      if (clueBtn) { clueBtn.disabled = false; clueBtn.innerHTML = '<img src="../assets/icons/lightbulb.svg" class="btn-icon" alt="" /> ' + t('btnClue'); }
      hangmanRenderPresenterPreview();
      renderH();
    }

    function _updateHangmanSvg() {
      const totalParts = 12;
      const ratio = hMaxMistakes > 0 ? Math.min(1, hMistakes / hMaxMistakes) : 0;
      const visibleParts = hMistakes === 0 ? 0 : Math.max(1, Math.round(ratio * totalParts));
      for (let idx = 1; idx <= totalParts; idx++) {
        const el = document.getElementById('hm-part-' + idx);
        if (el) el.style.display = idx <= visibleParts ? '' : 'none';
      }
    }

    function _hangmanGuessLetter(letter) {
      if (!hWordObj) return;
      const word = hWordObj.word.toLowerCase();
      const lives = hMaxMistakes - hMistakes;
      if (lives <= 0) return;
      const l = String(letter || '').toLowerCase();
      if (!/^[a-z-]$/.test(l) || hGuessed.includes(l)) return;
      hGuessed.push(l);
      if (!word.includes(l)) hMistakes++;
      renderH();
      if (!document.getElementById('word-display').textContent.includes('_')) {
        const inp = document.getElementById('hangman-type-input');
        if (inp) inp.disabled = true;
        awardPoints(POINTS_WIN);
        showSuccess(() => { nextTeamTurn(); selectRandomWord(); });
      }
    }

    function renderH() {
      if (!hWordObj || typeof hWordObj.word !== 'string' || !hWordObj.word.trim()) return;
      const word = hWordObj.word.toLowerCase();
      document.getElementById('word-display').textContent = word.split('').map(l => hGuessed.includes(l) ? l : '_').join('');
      const lives = hMaxMistakes - hMistakes;
      const counter = document.getElementById('h-attempts');
      counter.textContent = lives;
      counter.className = 'attempts-counter ' + (lives <= Math.floor(hMaxMistakes * 0.3) ? 'attempts-low' : (lives <= Math.floor(hMaxMistakes * 0.6) ? 'attempts-med' : 'attempts-high'));
      _updateHangmanSvg();
      const kb = document.getElementById('keyboard'); kb.innerHTML = '';
      const gameOver = lives <= 0;
      if (gameOver) {
        const inp = document.getElementById('hangman-type-input');
        if (inp) { inp.disabled = true; inp.style.borderColor = '#bbb'; }
        const fb = document.getElementById('hangman-feedback');
        fb.innerHTML = `${t('gameOver')} <strong>${word}</strong>`;
        fb.className = 'feedback status-wrong';
        fb.classList.remove('hidden');
        awardPoints(POINTS_LOSE);
        showFailure(`${t('theWordWas')} ${word}`, () => { nextTeamTurn(); });
        showExplanationBtn(hWordObj, 'hangman-feedback');
      }
      "abcdefghijklmnopqrstuvwxyz-".split('').forEach(l => {
        const k = document.createElement('div'); k.className = 'key' + (hGuessed.includes(l) ? ' used' : '');
        k.textContent = l;
        if (!hGuessed.includes(l) && !gameOver) k.onclick = () => _hangmanGuessLetter(l);
        kb.appendChild(k);
      });
    }

    function hangmanHandleTyping(e) {
      const inp = e.target;
      if (!hWordObj || inp.disabled) return;
      const word = hWordObj.word.toLowerCase();
      const lives = hMaxMistakes - hMistakes;
      if (lives <= 0) { inp.value = ''; return; }

      const raw = inp.value.toLowerCase().replace(/[^a-z-]/g, '');
      if (!raw) { inp.value = ''; return; }

      // If full word typed/pasted correctly, win immediately
      if (raw === word) {
        inp.value = '';
        word.split('').forEach(l => { if (!hGuessed.includes(l)) hGuessed.push(l); });
        inp.disabled = true;
        renderH();
        awardPoints(POINTS_WIN);
        showSuccess(() => { nextTeamTurn(); selectRandomWord(); });
        return;
      }

      // Single character typed -> immediate letter guess
      if (raw.length === 1) {
        inp.value = '';
        _hangmanGuessLetter(raw);
      }
    }

    function hangmanHandleKey(e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const inp = e.target;
      if (!hWordObj || !inp || inp.disabled) return;
      const word = hWordObj.word.toLowerCase();
      const raw = inp.value.toLowerCase().replace(/[^a-z-]/g, '');
      inp.value = '';
      if (!raw) return;
      if (raw === word) {
        word.split('').forEach(l => { if (!hGuessed.includes(l)) hGuessed.push(l); });
        inp.disabled = true;
        renderH();
        awardPoints(POINTS_WIN);
        showSuccess(() => { nextTeamTurn(); selectRandomWord(); });
      } else if (raw.length === 1) {
        _hangmanGuessLetter(raw);
      } else {
        hMistakes++;
        renderH();
      }
    }

    // Global physical keyboard listener for Hangman when no input is focused
    document.addEventListener('keydown', function (e) {
      if (activeSection !== 'hangman-game-section' || !hWordObj) return;
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[a-zA-Z-]$/.test(e.key)) {
        e.preventDefault();
        _hangmanGuessLetter(e.key.toLowerCase());
      }
    });

    function revealHangmanClue() {
      if (ltIsPresenterPreviewActive('hangman-game-section')) {
        if (hangmanProjectionRevealAll) return;
        awardPoints(POINTS_CLUE_PENALTY);
        hangmanProjectionRevealAll = true;
        hangmanRenderPresenterPreview();
        ltSchedulePresentationBroadcast();
        return;
      }

      if (hangmanClueStep >= 3) return;
      awardPoints(POINTS_CLUE_PENALTY);
      hangmanClueStep++;
      hangmanClueRevealed = true;
      const fb = document.getElementById('hangman-feedback');
      fb.innerHTML = hangmanBuildClueHtml(hangmanClueStep);
      fb.className = 'feedback status-correct';
      fb.classList.remove('hidden');
      hangmanRenderPresenterPreview();
    }
    function revealHangmanAnswer() {
      if (!hWordObj || typeof hWordObj.word !== 'string') return;
      awardPoints(POINTS_LOSE);
      const word = hWordObj.word.toLowerCase();
      const fb = document.getElementById('hangman-feedback');
      fb.innerHTML = `${t('theWordWas')} <strong>${word}</strong>`;
      fb.className = 'feedback status-wrong';
      fb.classList.remove('hidden');
      showExplanationBtn(hWordObj, 'hangman-feedback');
      showFailure(`${t('theWordWas')} ${word}`, () => { nextTeamTurn(); selectRandomWord(); });
    }

    // --- GAME: SCRAMBLED WORD ---
    let sWordObj, scrambleClueStep;
    let scrambleClueRevealed = false;
    let scrambleProjectionRevealCount = 0;

    function scrambleBuildFullClueHtml() {
      if (!sWordObj) return '';
      const ipaLine = sWordObj.ipa ? `<br><span style="font-family:'Courier New',monospace;font-size:2rem;color:black;">Pronunciation: / ${sWordObj.ipa} /</span>` : '';
      return `${t('defLabel')} ${_firstVal(sWordObj.definition)}${ipaLine}`;
    }

    function scrambleRenderPresenterPreview() {
      const defEl = document.getElementById('scramble-definition');
      const btn = document.getElementById('scramble-clue-btn');
      if (!defEl || !btn || !sWordObj) return;
      const presenterPreview = ltIsPresenterPreviewActive('scramble-game-section');

      if (presenterPreview) {
        defEl.innerHTML = scrambleBuildFullClueHtml();
        defEl.classList.remove('hidden');
        defEl.classList.add('lt-presenter-grey');
        const maxProjClues = (sWordObj && sWordObj.ipa) ? 2 : 1;
        btn.textContent = (scrambleProjectionRevealCount >= maxProjClues) ? 'Clues revealed' : 'Reveal clue';
        btn.disabled = scrambleProjectionRevealCount >= maxProjClues;
        return;
      }

      defEl.classList.remove('lt-presenter-grey');
      if (!scrambleClueRevealed) defEl.classList.add('hidden');
      btn.textContent = scrambleClueRevealed ? t('clueShown') : t('btnHintShort');
      btn.disabled = !!scrambleClueRevealed;
    }

    function _shuffleScrambleChars(wordStr) {
      const chars = wordStr.toLowerCase().split('');
      if (chars.length <= 1 || new Set(chars).size <= 1) return chars;
      let attempts = 0;
      do {
        for (let i = chars.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [chars[i], chars[j]] = [chars[j], chars[i]];
        }
        attempts++;
      } while (chars.join('') === wordStr.toLowerCase() && attempts < 12);
      return chars;
    }

    function _resetScrambleTileStyles() {
      document.querySelectorAll('#scramble-answer-area .letter-slot, #scramble-letter-bag .letter-slot').forEach(el => {
        el.style.borderColor = '';
        el.style.background = '';
      });
    }

    function initScrambleGame() {
      const filtered = getFilteredBank();
      if (!filtered.length) return;
      sWordObj = pickUnused(filtered);
      scrambleClueStep = 0;
      scrambleClueRevealed = false;
      scrambleProjectionRevealCount = 0;
      setCurrentGameWord(sWordObj);
      trackSeenWord(sWordObj, 'scrambled');
      document.getElementById('scramble-definition').textContent = t("defLabel") + " " + _firstVal(sWordObj.definition);
      document.getElementById('scramble-definition').classList.add('hidden');
      const clueBtn = document.getElementById('scramble-clue-btn');
      if (clueBtn) { clueBtn.disabled = false; clueBtn.textContent = t('btnHintShort'); }
      scrambleRenderPresenterPreview();
      document.getElementById('scramble-feedback').classList.add('hidden');
      const inp = document.getElementById('scramble-type-input');
      if (inp) { inp.value = ''; inp.style.borderColor = '#bbb'; }
      const bag = document.getElementById('scramble-letter-bag'); bag.innerHTML = '';
      const answer = document.getElementById('scramble-answer-area'); answer.innerHTML = '';
      _shuffleScrambleChars(sWordObj.word).forEach(char => {
        const l = document.createElement('div');
        l.className = 'letter-slot'; l.textContent = char;
        l.onclick = () => {
          _resetScrambleTileStyles();
          (l.parentElement.id === 'scramble-letter-bag' ? answer : bag).appendChild(l);
          const answerEl = document.getElementById('scramble-answer-area');
          const inp2 = document.getElementById('scramble-type-input');
          if (inp2) inp2.value = [...answerEl.children].map(c => c.textContent).join('');
          if (answer.children.length === sWordObj.word.length) checkScramble();
        };
        bag.appendChild(l);
      });
    }

    function clearScrambleAnswer() {
      const bag = document.getElementById('scramble-letter-bag');
      const answer = document.getElementById('scramble-answer-area');
      if (!bag || !answer) return;
      while (answer.firstChild) {
        bag.appendChild(answer.firstChild);
      }
      _resetScrambleTileStyles();
      const inp = document.getElementById('scramble-type-input');
      if (inp) inp.value = '';
    }

    function revealScrambleNextLetter() {
      if (!sWordObj) return;
      const target = sWordObj.word.toLowerCase();
      const bag = document.getElementById('scramble-letter-bag');
      const answer = document.getElementById('scramble-answer-area');
      if (!bag || !answer) return;
      _resetScrambleTileStyles();

      // Keep matching prefix tiles in answer, return misplaced trailing tiles to bag
      let matchLen = 0;
      const currentTiles = [...answer.children];
      while (matchLen < currentTiles.length && currentTiles[matchLen].textContent === target[matchLen]) {
        matchLen++;
      }
      for (let i = currentTiles.length - 1; i >= matchLen; i--) {
        bag.appendChild(currentTiles[i]);
      }
      if (matchLen >= target.length) return;

      const neededChar = target[matchLen];
      const tile = [...bag.children].find(c => c.textContent === neededChar);
      if (tile) {
        awardPoints(POINTS_CLUE_PENALTY);
        tile.style.borderColor = '#6abf8e';
        tile.style.background = '#e8f5ee';
        answer.appendChild(tile);
        const inp = document.getElementById('scramble-type-input');
        if (inp) inp.value = [...answer.children].map(c => c.textContent).join('');
        if (answer.children.length === target.length) checkScramble();
      }
    }

    function scrambleHandleTyping(e) {
      const input = e.target;
      const bag = document.getElementById('scramble-letter-bag');
      const answer = document.getElementById('scramble-answer-area');
      if (!sWordObj) return;
      _resetScrambleTileStyles();

      // Derive typed value only from letters that exist in bag (prevent free-typing wrong chars)
      const typed = input.value.toLowerCase().replace(/[^a-z-]/g, '');
      const current = [...answer.children].map(c => c.textContent).join('');

      const newLen = typed.length;
      const oldLen = current.length;

      if (newLen > oldLen) {
        const newChar = typed[newLen - 1];
        const tile = [...bag.children].find(c => c.textContent === newChar);
        if (tile) {
          answer.appendChild(tile);
          if (answer.children.length === sWordObj.word.length) {
            input.value = [...answer.children].map(c => c.textContent).join('');
            checkScramble();
            return;
          }
        } else {
          input.value = [...answer.children].map(c => c.textContent).join('');
        }
      } else if (newLen < oldLen) {
        const last = answer.lastElementChild;
        if (last) bag.appendChild(last);
      }
      input.value = [...answer.children].map(c => c.textContent).join('');
    }

    function scrambleHandleKey(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        checkScramble();
      }
    }
    function revealScrambleClue() {
      if (ltIsPresenterPreviewActive('scramble-game-section')) {
        const maxProjClues = (sWordObj && sWordObj.ipa) ? 2 : 1;
        if (scrambleProjectionRevealCount >= maxProjClues) return;
        awardPoints(POINTS_CLUE_PENALTY);
        scrambleProjectionRevealCount++;
        scrambleRenderPresenterPreview();
        ltSchedulePresentationBroadcast();
        return;
      }

      awardPoints(POINTS_CLUE_PENALTY);
      scrambleClueStep++;
      scrambleClueRevealed = true;
      const defEl = document.getElementById('scramble-definition');
      const btn = document.getElementById('scramble-clue-btn');
      if (scrambleClueStep === 1) {
        defEl.innerHTML = `${t('defLabel')} ${_firstVal(sWordObj.definition)}`;
        defEl.classList.remove('hidden');
        if (sWordObj.ipa) {
          btn.textContent = t('clue2Btn');
        } else {
          if (btn) { btn.disabled = true; btn.textContent = t('clueShown'); }
        }
      } else {
        const ipaLine = sWordObj.ipa ? `<br><span style="font-family:'Courier New',monospace;font-size:0.92rem;color:#888;">Pronunciation: / ${sWordObj.ipa} /</span>` : '';
        defEl.innerHTML = `${t('defLabel')} ${_firstVal(sWordObj.definition)}${ipaLine}`;
        defEl.classList.remove('hidden');
        if (btn) { btn.disabled = true; btn.textContent = t('clueShown'); }
      }
      scrambleRenderPresenterPreview();
    }
    function checkScramble() {
      const answerEl = document.getElementById('scramble-answer-area');
      const tiles = [...answerEl.children];
      const res = tiles.map(l => l.textContent).join('');
      const target = sWordObj.word.toLowerCase();
      if (res.toLowerCase() === target) {
        tiles.forEach(tile => {
          tile.style.borderColor = '#6abf8e';
          tile.style.background = '#e8f5ee';
        });
        awardPoints(POINTS_WIN);
        showSuccess(() => { nextTeamTurn(); initScrambleGame(); });
      } else {
        tiles.forEach((tile, idx) => {
          const ok = tile.textContent.toLowerCase() === target[idx];
          tile.style.borderColor = ok ? '#6abf8e' : '#c96b6b';
          tile.style.background = ok ? '#e8f5ee' : '#fdeaea';
        });
        awardPoints(POINTS_WRONG_PENALTY);
        showFailure();
      }
    }
    function revealScrambleAnswer() {
      awardPoints(POINTS_LOSE);
      showFailure(`The answer is: ${sWordObj.word.toLowerCase()}`, () => { nextTeamTurn(); initScrambleGame(); });
      const fb = document.getElementById('scramble-feedback');
      fb.innerHTML = `The answer is: <strong>${sWordObj.word.toLowerCase()}</strong>`;
      fb.className = "feedback status-wrong";
      fb.classList.remove('hidden');
      showExplanationBtn(sWordObj, 'scramble-feedback');
    }

    // --- GAME: CLUE QUEST ---
    let clueObj, clueIdx;
    let clueProjectionRevealCount = 0;

    function _clueGetCurrentReward() {
      return Math.max(5, POINTS_WIN + (clueIdx || 0) * POINTS_CLUE_PENALTY);
    }

    function _clueUpdatePotentialBadge() {
      const badge = document.getElementById('clue-potential-pts');
      if (badge) badge.textContent = `Reward: +${_clueGetCurrentReward()} pts`;
    }

    function clueBuildHints() {
      if (!clueObj) return [];
      const word = String(clueObj.word || '').toLowerCase();
      if (!word) return [];
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const wordRegex = new RegExp(`\\b${escaped}\\b`, 'gi');

      if (!Array.isArray(clueObj._hints)) {
        clueObj._hints = [];
        clueObj._hints.push(`First letter: ${word[0].toUpperCase()} (${word.length} letters)`);
        const rawExample = Array.isArray(clueObj.exampleSentence)
          ? clueObj.exampleSentence.find(s => wordRegex.test(s)) || clueObj.exampleSentence[0]
          : clueObj.exampleSentence;
        if (rawExample && wordRegex.test(rawExample)) {
          clueObj._hints.push(`Example: ${rawExample.replace(wordRegex, '_____')}`);
        }
        const syn = _firstVal(clueObj.synonyms);
        if (syn) {
          clueObj._hints.push(`Synonym: ${syn}`);
        } else {
          const ant = _firstVal(clueObj.antonyms);
          if (ant) clueObj._hints.push(`Antonym: ${ant}`);
        }
        const tr = getTranslation(clueObj);
        if (tr && tr.toLowerCase() !== word) {
          clueObj._hints.push(`Translation: ${tr}`);
        }
        if (clueObj.ipa) {
          clueObj._hints.push(`Pronunciation: / ${clueObj.ipa} /`);
        }
        if (clueObj._hints.length < 4 && (clueObj.partOfSpeech || clueObj.theme)) {
          const metaParts = [];
          if (clueObj.partOfSpeech) metaParts.push(clueObj.partOfSpeech);
          if (clueObj.theme) metaParts.push(_allVals(clueObj.theme).join(', '));
          if (metaParts.length) clueObj._hints.push(`Category: ${metaParts.join(' · ')}`);
        }
        if (clueObj._hints.length < 4 && word.length >= 2) {
          const pattern = word[0].toUpperCase() + ' ' + Array(Math.max(1, word.length - 2)).fill('_').join(' ') + ' ' + word[word.length - 1].toUpperCase();
          clueObj._hints.push(`Pattern: ${pattern}`);
        }
        clueObj._hints = clueObj._hints.slice(0, 4);
      }
      return clueObj._hints;
    }

    function clueRenderPresenterPreview() {
      const shouldPreview = ltIsPresenterPreviewActive('clue-game-section');
      const hints = clueBuildHints();
      for (let i = 1; i <= 4; i++) {
        const el = document.getElementById(`clue-${i}`);
        if (!el) continue;
        if (i > hints.length) {
          el.style.display = 'none';
          continue;
        }
        el.style.display = '';
        if (shouldPreview && hints[i - 1]) {
          el.textContent = hints[i - 1];
          el.className = 'clue-box clue-active clue-presenter-preview';
          continue;
        }
        if (i <= clueIdx) {
          el.textContent = hints[i - 1] || t('clue' + i);
          el.className = 'clue-box clue-active';
          continue;
        }
        el.textContent = t('clue' + i);
        el.className = 'clue-box';
      }

      _clueUpdatePotentialBadge();
      const unlockBtn = document.getElementById('clue-unlock-btn');
      if (!unlockBtn) return;
      if (shouldPreview) {
        unlockBtn.textContent = (clueProjectionRevealCount >= hints.length) ? 'Clues revealed' : 'Reveal clue';
        unlockBtn.disabled = clueProjectionRevealCount >= hints.length;
      } else {
        unlockBtn.innerHTML = '<img src="../assets/icons/lightbulb.svg" class="btn-icon" alt="" /> ' + t('btnClue');
        unlockBtn.disabled = clueIdx >= hints.length;
      }
    }

    function initClueGame() {
      const filtered = getFilteredBank();
      if (!filtered.length) return;
      clueObj = pickUnused(filtered);
      clueIdx = 0;
      clueProjectionRevealCount = 0;
      setCurrentGameWord(clueObj);
      trackSeenWord(clueObj, 'wordquest');
      document.getElementById('clue-feedback').classList.add('hidden');
      const input = document.getElementById('clue-guess-input');
      input.value = ''; input.disabled = false;
      document.getElementById('clue-unlock-btn').disabled = false;
      clueBuildHints();
      clueRenderPresenterPreview();
      renderClueWithLiveWord("");
      input.oninput = (e) => {
        renderClueWithLiveWord(e.target.value);
        if (e.target.value.trim().toLowerCase() === clueObj.word.toLowerCase()) checkClueGuess();
      };
      input.onkeydown = (e) => { if (e.key === 'Enter') checkClueGuess(); };
    }
    function renderClueWithLiveWord(userInput) {
      const defContainer = document.getElementById('clue-definition');
      const placeholder = userInput.length > 0 ? userInput : "_________";
      defContainer.innerHTML = `<div class="clue-header-badge">Definition Analysis</div><div style="margin-bottom:15px;">${_firstVal(clueObj.definition)}</div><div style="text-align:center;"><span class="clue-word-live">${placeholder}</span></div>`;
    }
    function checkClueGuess() {
      const input = document.getElementById('clue-guess-input');
      if (input.value.trim().toLowerCase() === clueObj.word.toLowerCase()) {
        awardPoints(_clueGetCurrentReward());
        showSuccess(() => { nextTeamTurn(); initClueGame(); });
      } else {
        awardPoints(POINTS_WRONG_PENALTY);
        showFailure(t('notQuiteGuess'));
      }
    }
    function revealClueAnswer() {
      awardPoints(POINTS_LOSE);
      const input = document.getElementById('clue-guess-input');
      const fb = document.getElementById('clue-feedback');
      input.value = clueObj.word; renderClueWithLiveWord(clueObj.word);
      fb.innerHTML = `${t('theWordWas')} <strong>${clueObj.word}</strong>`; fb.className = "feedback status-wrong"; fb.classList.remove('hidden'); input.disabled = true;
      showExplanationBtn(clueObj, 'clue-feedback');
      showFailure(`${t('theWordWas')} ${clueObj.word}`, () => { nextTeamTurn(); initClueGame(); });
    }
    function unlockClue() {
      if (ltIsPresenterPreviewActive('clue-game-section')) {
        const hints = clueBuildHints();
        if (clueProjectionRevealCount >= hints.length) return;
        awardPoints(POINTS_CLUE_PENALTY);
        clueProjectionRevealCount++;
        clueRenderPresenterPreview();
        if (presentationState.active && presentationState.mode === 'generic' && presentationState.sectionId === 'clue-game-section') {
          ltSchedulePresentationBroadcast();
        }
        return;
      }

      const hints = clueBuildHints();
      if (clueIdx >= hints.length) return;
      awardPoints(POINTS_CLUE_PENALTY);
      clueIdx++;
      if (clueIdx <= hints.length) {
        const el = document.getElementById(`clue-${clueIdx}`);
        if (el) {
          el.textContent = hints[clueIdx - 1];
          el.className = 'clue-box clue-active';
        }
      }
      clueRenderPresenterPreview();
      if (clueIdx >= hints.length) {
        document.getElementById('clue-unlock-btn').disabled = true;
      }
    }

    // --- GAME: SENTENCE BUILDER ---
    let targetSentence = "";
    let targetWords = [];
    let hintIndex = 0;
    let sentenceWordObj = null;
    function getExampleSentenceChoices(item) {
      const value = item && item.exampleSentence;
      if (Array.isArray(value)) {
        return value
          .map(v => (typeof v === 'string' ? v.trim() : ''))
          .filter(Boolean);
      }
      if (typeof value === 'string') {
        const s = value.trim();
        return s ? [s] : [];
      }
      return [];
    }
    function _resetSentenceCardStyles() {
      document.querySelectorAll('#sentence-area .card, #word-bag .card').forEach(c => {
        c.style.borderColor = '';
        c.style.background = '';
      });
    }
    function selectRandomSentence() {
      const sentenceBank = getFilteredBank().filter(i => getExampleSentenceChoices(i).length > 0);
      if (!sentenceBank.length) return;
      sentenceWordObj = pickUnused(sentenceBank);
      setCurrentGameWord(sentenceWordObj);
      const sentenceChoices = getExampleSentenceChoices(sentenceWordObj);
      if (!sentenceChoices.length) return;
      const rawSentence = sentenceChoices[Math.floor(Math.random() * sentenceChoices.length)];
      targetSentence = rawSentence.replace(/[.!?]+$/, "").trim();
      targetWords = targetSentence.split(/\s+/).map(w => (w === 'I' || w.startsWith("I'")) ? w : w.toLowerCase());
      hintIndex = 0;
      document.getElementById('sentence-feedback').classList.add('hidden');
      document.getElementById('sentence-hint-display').textContent = "";
      const exEl = document.getElementById('sentence-example');
      if (exEl) {
        exEl.innerHTML = `<span style="font-size:0.9rem;color:#444;">Target vocabulary: <strong>${sentenceWordObj.word}</strong> <em>(${sentenceWordObj.partOfSpeech || ''})</em> — ${_firstVal(sentenceWordObj.definition)}</span>`;
      }
      const bag = document.getElementById('word-bag'); bag.innerHTML = '';
      const area = document.getElementById('sentence-area'); area.innerHTML = '';
      const shuffled = [...targetWords];
      if (shuffled.length > 1) {
        let tries = 0;
        do {
          shuffled.sort(() => Math.random() - 0.5);
          tries++;
        } while (shuffled.join(' ') === targetWords.join(' ') && tries < 10);
      }
      shuffled.forEach(w => {
        const c = document.createElement('div'); c.className = 'card'; c.textContent = w;
        c.onclick = () => {
          _resetSentenceCardStyles();
          (c.parentElement.id === 'word-bag' ? area : bag).appendChild(c);
        };
        bag.appendChild(c);
      });
    }
    function clearSentenceAttempt() {
      const bag = document.getElementById('word-bag');
      const area = document.getElementById('sentence-area');
      if (!bag || !area) return;
      while (area.firstChild) {
        bag.appendChild(area.firstChild);
      }
      _resetSentenceCardStyles();
      document.getElementById('sentence-feedback').classList.add('hidden');
    }
    function getWordHint() {
      if (hintIndex < targetWords.length) {
        awardPoints(POINTS_CLUE_PENALTY);
        hintIndex++;
        const hintDisplay = document.getElementById('sentence-hint-display');
        hintDisplay.textContent = t("hintLabel") + " " + targetWords.slice(0, hintIndex).join(" ") + "...";
      }
    }
    document.getElementById('check-sentence').onclick = () => {
      const areaCards = [...document.getElementById('sentence-area').children];
      const res = areaCards.map(c => c.textContent).join(' ');
      const fb = document.getElementById('sentence-feedback');
      if (res.trim().toLowerCase() === targetWords.join(' ').trim().toLowerCase()) {
        areaCards.forEach(c => {
          c.style.borderColor = '#6abf8e';
          c.style.background = '#e8f5ee';
        });
        fb.textContent = t("perfectSyntax"); fb.className = "feedback status-correct";
        awardPoints(POINTS_WIN);
        showSuccess(() => { nextTeamTurn(); selectRandomSentence(); });
      } else {
        areaCards.forEach((c, idx) => {
          const ok = targetWords[idx] && c.textContent.toLowerCase() === targetWords[idx].toLowerCase();
          c.style.borderColor = ok ? '#6abf8e' : '#c96b6b';
          c.style.background = ok ? '#e8f5ee' : '#fdeaea';
        });
        fb.textContent = t("incorrectOrder"); fb.className = "feedback status-wrong"; showFailure(); awardPoints(POINTS_WRONG_PENALTY);
      }
      fb.classList.remove('hidden');
    };
    function revealSentenceAnswer() {
      awardPoints(POINTS_LOSE);
      const area = document.getElementById('sentence-area');
      const bag = document.getElementById('word-bag');
      area.innerHTML = '';
      bag.innerHTML = '';
      targetWords.forEach(w => {
        const c = document.createElement('div'); c.className = 'card'; c.textContent = w;
        c.onclick = () => { (c.parentElement.id === 'word-bag' ? area : bag).appendChild(c); };
        area.appendChild(c);
      });
      const fb = document.getElementById('sentence-feedback');
      fb.innerHTML = `${t("answerLabel")} <strong>${targetWords.join(' ')}</strong>`; fb.className = "feedback status-wrong"; fb.classList.remove('hidden');
      showExplanationBtn(sentenceWordObj, 'sentence-feedback');
      showFailure(t('answerRevealed'), () => { nextTeamTurn(); });
    }

    // --- GAME: QUOTE ANALYSER ---
    let currentQuoteObj = null;
    let quoteClueStep = 0;
    let quoteProjectionRevealCount = 0;

    function quoteRenderPresenterPreview() {
      if (!currentQuoteObj) return;
      const themeBox = document.getElementById('quote-theme-box');
      const keywordBox = document.getElementById('quote-keywords-box');
      const clueBtn = document.getElementById('quote-clue-btn');
      if (!themeBox || !keywordBox) return;

      const presenterPreview = ltIsPresenterPreviewActive('quote-game-section');
      const showTheme = presenterPreview || quoteClueStep >= 1;
      const showKeywords = presenterPreview || quoteClueStep >= 2;

      themeBox.textContent = t('themeLabel') + (showTheme ? (' ' + currentQuoteObj.theme) : ' ????');
      themeBox.classList.toggle('clue-active', showTheme);

      keywordBox.textContent = t('keywordsLabel') + (showKeywords ? (' ' + currentQuoteObj.keywords.join(', ')) : ' ????');
      keywordBox.classList.toggle('clue-active', showKeywords);

      themeBox.classList.toggle('lt-presenter-grey', presenterPreview && showTheme);
      keywordBox.classList.toggle('lt-presenter-grey', presenterPreview && showKeywords);
      if (clueBtn) {
        if (presenterPreview) {
          clueBtn.textContent = (quoteProjectionRevealCount >= 2) ? 'Clues revealed' : 'Reveal clue';
          clueBtn.disabled = quoteProjectionRevealCount >= 2;
        } else {
          clueBtn.textContent = (quoteClueStep >= 2) ? t('noMoreClues') : t('btnClue');
          clueBtn.disabled = quoteClueStep >= 2;
        }
      }
    }

    function initQuoteGame() {
      setCurrentGameWord(null);
      document.getElementById('quote-feedback').classList.add('hidden');
      document.getElementById('quote-explanation-box').style.display = 'none';
      document.getElementById('quote-theme-box').textContent = t('themeLabel') + ' ????';
      document.getElementById('quote-theme-box').classList.remove('clue-active');
      document.getElementById('quote-keywords-box').textContent = t('keywordsLabel') + ' ????';
      document.getElementById('quote-keywords-box').classList.remove('clue-active');
      const qInp = document.getElementById('quote-guess-input');
      if (qInp) {
        qInp.value = "";
        qInp.onkeydown = (e) => { if (e.key === 'Enter') checkQuoteAnalysis(); };
      }

      quoteClueStep = 0;
      quoteProjectionRevealCount = 0;
      const clueBtn = document.getElementById('quote-clue-btn');
      clueBtn.disabled = false;
      clueBtn.textContent = t('btnClue');

      currentQuoteObj = quoteBank[Math.floor(Math.random() * quoteBank.length)];
      document.getElementById('display-quote').innerHTML = `<em>"${currentQuoteObj.quote}"</em>${currentQuoteObj.author ? `<div style="font-size:1rem;font-style:normal;color:#7f8c8d;margin-top:10px;">— ${currentQuoteObj.author}</div>` : ''}`;
      quoteRenderPresenterPreview();
    }

    function handleQuoteClue() {
      if (ltIsPresenterPreviewActive('quote-game-section')) {
        if (quoteProjectionRevealCount >= 2) return;
        awardPoints(POINTS_CLUE_PENALTY);
        quoteProjectionRevealCount++;
        quoteRenderPresenterPreview();
        ltSchedulePresentationBroadcast();
        return;
      }

      awardPoints(POINTS_CLUE_PENALTY);
      quoteClueStep++;
      if (quoteClueStep >= 2) {
        document.getElementById('quote-clue-btn').disabled = true;
        document.getElementById('quote-clue-btn').textContent = t('noMoreClues');
      }
      quoteRenderPresenterPreview();
    }

    function revealFullAnalysis() {
      awardPoints(POINTS_LOSE);
      const themeBox = document.getElementById('quote-theme-box');
      themeBox.textContent = t('themeLabel') + ' ' + currentQuoteObj.theme;
      themeBox.classList.add('clue-active');
      const keywordBox = document.getElementById('quote-keywords-box');
      keywordBox.textContent = t('keywordsLabel') + ' ' + currentQuoteObj.keywords.join(', ');
      keywordBox.classList.add('clue-active');
      document.getElementById('explanation-text').textContent = currentQuoteObj.explanation;
      document.getElementById('quote-explanation-box').style.display = 'block';
      document.getElementById('quote-clue-btn').disabled = true;
      quoteRenderPresenterPreview();
      showFailure(t('themeLabel') + ' ' + currentQuoteObj.theme, () => { nextTeamTurn(); });
    }

    function checkQuoteAnalysis() {
      const guess = document.getElementById('quote-guess-input').value.trim().toLowerCase();
      if (!guess || !currentQuoteObj) return;
      const theme = (currentQuoteObj.theme || '').toLowerCase();
      const themeWords = theme.split(/[\s,/&-]+/).filter(w => w.length >= 4);
      const keywords = (currentQuoteObj.keywords || []).map(k => k.toLowerCase());
      const isCorrect = guess === theme
        || (guess.length >= 4 && theme.includes(guess))
        || themeWords.includes(guess)
        || keywords.some(k => guess === k || (guess.length >= 3 && (k.includes(guess) || guess.includes(k))));
      const fb = document.getElementById('quote-feedback');
      if (isCorrect) {
        fb.textContent = t('correctTheme') + ' ' + currentQuoteObj.theme;
        fb.className = 'feedback status-correct';
        fb.classList.remove('hidden');
        awardPoints(POINTS_WIN);
        showSuccess(() => { nextTeamTurn(); initQuoteGame(); });
      } else {
        fb.textContent = 'Not quite — try again or use a clue.';
        fb.className = 'feedback status-wrong';
        fb.classList.remove('hidden');
        awardPoints(POINTS_WRONG_PENALTY);
        showFailure('Keep trying!');
      }
    }

    // --- GAP FILL LOGIC UPDATES ---

    let currentGapObj = null;
    let gapClueStep = 0;
    let gapClueRevealed = false;
    let gapProjectionRevealAll = false;

    function _gapBuildPatternHint(str) {
      return String(str || '').split(/\s+/).map(word => {
        if (!word) return '';
        return word[0] + (word.length > 1 ? ' ' + Array(word.length - 1).fill('_').join(' ') : '');
      }).join('   ');
    }

    function gapBuildGrammarTagHtml(presenterPreview) {
      if (!currentGapObj) return '';
      let html = `<span class="grammar-badge">Focus: ${currentGapObj.grammarType}</span>`;
      if (!presenterPreview && gapClueStep >= 2) {
        html += ` <span class="grammar-badge" style="background:#e2c96e;color:#222;">Pattern: ${_gapBuildPatternHint(currentGapObj.removedWord)}</span>`;
      }
      if (presenterPreview) {
        html += ` <span class="grammar-badge gap-presenter-answer">Answer: ${currentGapObj.removedWord}</span>`;
      }
      return html;
    }

    function gapRenderPresenterPreview() {
      const tag = document.getElementById('grammar-tag');
      const btn = document.getElementById('gap-clue-btn');
      if (!tag) return;
      const presenterPreview = ltIsPresenterPreviewActive('gap-game-section');
      if (currentGapObj) tag.innerHTML = gapBuildGrammarTagHtml(presenterPreview);
      const show = gapClueRevealed || presenterPreview;
      tag.classList.toggle('hidden', !show);
      tag.classList.toggle('lt-presenter-grey', presenterPreview && show);
      if (btn) {
        if (presenterPreview) {
          btn.textContent = gapProjectionRevealAll ? 'Clues revealed' : 'Reveal clues';
          btn.disabled = !!gapProjectionRevealAll;
        } else if (gapClueStep >= 2) {
          btn.textContent = t('clueShown');
          btn.disabled = true;
        } else {
          btn.textContent = gapClueStep === 1 ? `${t('btnHintShort')} (2/2)` : t('btnHintShort');
          btn.disabled = false;
        }
      }
    }

    /**
     * Dynamically populates the Grammar dropdown based on the gapFillBank database
     */
    function populateGrammarMenu() {
      const select = document.querySelector('#gap-game-section .grammar-select');
      if (!select) return;

      const sourceBank = awGetBankFilteredBySource('gaps');
      const grammarTypes = [...new Set(sourceBank.map(item => item.grammarType).filter(t => t))].sort();

      select.innerHTML = `<option value="all" selected>${t('allGrammar')}</option>`;
      grammarTypes.forEach(type => {
        const opt = document.createElement('option');
        opt.value = type;
        opt.textContent = type;
        select.appendChild(opt);
      });
    }
    function clearGapUsed() {
      for (const key of [...usedWords]) {
        if (key.startsWith('gap:')) usedWords.delete(key);
      }
    }

    function _normalizeContractions(s) {
      return String(s || '')
        .toLowerCase()
        .replace(/['’]/g, "'")
        .replace(/\bcan't\b/g, 'cannot')
        .replace(/\bwon't\b/g, 'will not')
        .replace(/\bshan't\b/g, 'shall not')
        .replace(/\bn't\b/g, ' not')
        .replace(/\bi'm\b/g, 'i am')
        .replace(/\b(you|we|they)'re\b/g, '$1 are')
        .replace(/\b(I|you|we|they)'ve\b/gi, '$1 have')
        .replace(/\b(I|you|he|she|it|we|they)'ll\b/gi, '$1 will')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function _gapMatchesAnswer(guess, expected) {
      const g = String(guess || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const e = String(expected || '').trim().toLowerCase().replace(/\s+/g, ' ');
      if (!g || !e) return false;
      if (g === e) return true;
      return _normalizeContractions(g) === _normalizeContractions(e);
    }

    function initGapGame() {
      const section = document.getElementById('gap-game-section');
      const grmFilter = section.querySelector('.grammar-select').value;
      const sourceBank = awGetBankFilteredBySource('gaps');

      if (!sourceBank.length) {
        currentGapObj = null;
        document.getElementById('gap-sentence-display').innerHTML = '<span style="color:#999;">No gap-fill items in this database yet.</span>';
        document.getElementById('gap-feedback').classList.add('hidden');
        document.getElementById('gap-input').value = '';
        return;
      }

      const lvlSel = document.getElementById('gap-level-select');
      const lvlFilters = lvlSel && lvlSel.value !== 'all' ? [lvlSel.value] : ['all'];

      let filtered = sourceBank.filter(item => {
        const lvlMatch = (lvlFilters.includes('all') || lvlFilters.includes(item.level));
        const grmMatch = (grmFilter === 'all' || item.grammarType === grmFilter);
        return lvlMatch && grmMatch;
      });

      if (!filtered.length) {
        filtered = sourceBank.filter(item => grmFilter === 'all' || item.grammarType === grmFilter);
      }
      if (!filtered.length) filtered = sourceBank;

      const usedGapWords = usedWords;
      let availableGap = filtered.filter(item => !usedGapWords.has('gap:' + item.removedWord));
      if (availableGap.length === 0) {
        filtered.forEach(item => usedGapWords.delete('gap:' + item.removedWord));
        availableGap = filtered;
      }
      currentGapObj = availableGap[Math.floor(Math.random() * availableGap.length)];
      usedGapWords.add('gap:' + currentGapObj.removedWord);
      setCurrentGameWord(vocabBank.find(w => w.word.toLowerCase() === currentGapObj.removedWord.toLowerCase()) || null);

      document.getElementById('gap-feedback').classList.add('hidden');
      const gapInput = document.getElementById('gap-input');
      gapInput.value = "";
      gapClueStep = 0;
      gapClueRevealed = false;
      gapProjectionRevealAll = false;
      document.getElementById('grammar-tag').innerHTML = gapBuildGrammarTagHtml(false);
      gapRenderPresenterPreview();

      renderSentenceWithGap("");

      gapInput.oninput = (e) => updateLiveGap(e.target.value);
      gapInput.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); checkGap(); } };
    }

    const originalOnLoad = window.onload;
    function renderSentenceWithGap(userInput) {
      const display = document.getElementById('gap-sentence-display');
      const placeholder = userInput.length > 0 ? userInput : "";

      const escapedRemoved = String(currentGapObj.removedWord || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedRemoved}\\b`, 'gi');
      const fallbackRegex = new RegExp(escapedRemoved, 'gi');

      const infinitiveHint = currentGapObj.infinitive
        ? ` <span style="color:#9b59b6; font-style:italic; font-size:0.95em;">(${currentGapObj.infinitive})</span>`
        : '';

      const activeRegex = regex.test(currentGapObj.sentence) ? new RegExp(`\\b${escapedRemoved}\\b`, 'gi') : fallbackRegex;
      let processedSentence = currentGapObj.sentence.replace(
        activeRegex,
        `<span class="gap-word">${placeholder}</span>`
      );

      display.innerHTML = processedSentence + infinitiveHint;
    }
    function updateLiveGap(text) {
      renderSentenceWithGap(text);
      if (currentGapObj && _gapMatchesAnswer(text, currentGapObj.removedWord)) checkGap();
    }
    function revealGapClue() {
      if (ltIsPresenterPreviewActive('gap-game-section')) {
        if (gapProjectionRevealAll) return;
        awardPoints(POINTS_CLUE_PENALTY);
        gapProjectionRevealAll = true;
        gapRenderPresenterPreview();
        ltSchedulePresentationBroadcast();
        return;
      }

      if (gapClueStep >= 2) return;
      awardPoints(POINTS_CLUE_PENALTY);
      gapClueStep++;
      gapClueRevealed = true;
      gapRenderPresenterPreview();
    }
    function checkGap() {
      if (!currentGapObj) return;
      const guess = document.getElementById('gap-input').value.trim();
      if (_gapMatchesAnswer(guess, currentGapObj.removedWord)) {
        awardPoints(POINTS_WIN);
        showSuccess(() => { nextTeamTurn(); initGapGame(); });
      } else {
        awardPoints(POINTS_WRONG_PENALTY);
        showFailure();
      }
    }
    function revealGap() {
      awardPoints(POINTS_LOSE);
      const input = document.getElementById('gap-input');
      input.value = currentGapObj.removedWord; renderSentenceWithGap(currentGapObj.removedWord);
      const fb = document.getElementById('gap-feedback');
      fb.innerHTML = `${t("answerLabel")} <strong>${currentGapObj.removedWord}</strong>`; fb.className = "feedback status-wrong"; fb.classList.remove('hidden');
      const gapWordObj = vocabBank.find(w => w.word.toLowerCase() === currentGapObj.removedWord.toLowerCase());
      if (gapWordObj) showExplanationBtn(gapWordObj, 'gap-feedback');
      showFailure(`${t('answerLabel')} ${currentGapObj.removedWord}`, () => { nextTeamTurn(); initGapGame(); });
    }

    // --- GAME: FIND THE ERROR ---
    let currentErrorObj = null;
    let errorMode = 'spot'; // 'spot' or 'rewrite'
    let errorCorrectIsA = false;
    let errorAnswered = false;
    let errorHintRevealed = false;
    let errorProjectionRevealAll = false;
    let selectedErrorCategories = []; // For filtering by error category

    function errorRewriteRenderPresenterPreview() {
      if (errorMode !== 'rewrite' || !currentErrorObj || errorAnswered) return;
      const expBox = document.getElementById('error-rewrite-explanation');
      const hintBtn = document.getElementById('error-hint-btn');
      if (!expBox) return;
      const presenterPreview = ltIsPresenterPreviewActive('error-game-section');
      const show = errorHintRevealed || presenterPreview;
      if (show) {
        expBox.className = 'error-explanation-box visible';
        expBox.innerHTML = `<img src="../assets/icons/lightbulb.svg" class="btn-icon" alt="" /> <strong>${t('clueLabel')}</strong> ${currentErrorObj.explanation.split('.')[0]}.`;
        expBox.classList.toggle('lt-presenter-grey', presenterPreview);
      } else {
        expBox.className = 'error-explanation-box';
        expBox.innerHTML = '';
      }
      if (hintBtn) {
        if (presenterPreview) {
          hintBtn.textContent = errorProjectionRevealAll ? '✅ Clues revealed' : '🔓 Reveal clues';
          hintBtn.disabled = !!errorProjectionRevealAll;
        } else {
          hintBtn.innerHTML = errorHintRevealed ? t('clueShown') : '<img src="../assets/icons/lightbulb.svg" class="btn-icon" alt="" /> ' + t('btnHintShort');
          hintBtn.disabled = !!errorHintRevealed;
        }
      }
    }

    function getErrorCategories() {
      const categories = new Set();
      awGetBankFilteredBySource('errors').forEach(e => {
        if (e.category) categories.add(e.category);
      });
      return Array.from(categories).sort();
    }

    function buildErrorTypeFilter() {
      const mount = document.getElementById('error-filter-mount');
      if (!mount) return;
      mount.innerHTML = '';

      const filterBar = document.createElement('div');
      filterBar.className = 'filter-bar';

      const filterCol = document.createElement('div');
      filterCol.className = 'filter-col';

      const label = document.createElement('label');
      label.className = 'filter-label';
      label.textContent = 'Error Category';

      const pickerWrap = document.createElement('div');
      pickerWrap.className = 'theme-picker-wrap error-type-picker-wrap';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'theme-picker-btn';
      btn.textContent = selectedErrorCategories.length === 0 ? 'All Categories' : `${selectedErrorCategories.length} selected`;
      btn.onclick = () => errorTypePickerToggle(btn);

      const dropdown = document.createElement('div');
      dropdown.className = 'theme-picker-dropdown';

      const errorTypes = getErrorCategories();

      // Add "All" option
      const allOption = document.createElement('div');
      allOption.className = 'theme-picker-option all-option';
      const allCheck = document.createElement('input');
      allCheck.type = 'checkbox';
      allCheck.checked = selectedErrorCategories.length === 0;
      allCheck.onchange = () => errorTypeSetSelected([]);
      allOption.appendChild(allCheck);
      const allLabel = document.createElement('span');
      allLabel.textContent = 'All Categories';
      allOption.appendChild(allLabel);
      dropdown.appendChild(allOption);

      // Add category options
      errorTypes.forEach(type => {
        const option = document.createElement('div');
        option.className = 'theme-picker-option';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = selectedErrorCategories.includes(type);
        checkbox.onchange = () => {
          if (checkbox.checked) {
            if (!selectedErrorCategories.includes(type)) selectedErrorCategories.push(type);
          } else {
            selectedErrorCategories = selectedErrorCategories.filter(t => t !== type);
          }
          updateErrorTypeFilter();
          usedWords.clear();
          initErrorGame();
        };
        option.appendChild(checkbox);
        const typeLabel = document.createElement('span');
        typeLabel.textContent = type;
        option.appendChild(typeLabel);
        dropdown.appendChild(option);
      });

      pickerWrap.appendChild(btn);
      pickerWrap.appendChild(dropdown);
      filterCol.appendChild(label);
      filterCol.appendChild(pickerWrap);

      const sourceCol = document.createElement('div');
      sourceCol.className = 'filter-col';
      const sourceLabel = document.createElement('label');
      sourceLabel.className = 'filter-label';
      sourceLabel.textContent = 'Database';
      const sourceSelect = document.createElement('select');
      sourceSelect.id = 'error-source-select';
      sourceSelect.style.padding = '5px';
      sourceSelect.style.borderRadius = '5px';
      sourceSelect.onchange = () => {
        awSetSourceSelection('errors', sourceSelect.value);
        selectedErrorCategories = [];
        buildErrorTypeFilter();
        usedWords.clear();
        initErrorGame();
      };
      sourceCol.appendChild(sourceLabel);
      sourceCol.appendChild(sourceSelect);

      const resetCol = document.createElement('div');
      resetCol.className = 'filter-reset-col';
      const resetBtn = document.createElement('button');
      resetBtn.className = 'action-btn btn-grey';
      resetBtn.textContent = 'Reset';
      resetBtn.onclick = () => {
        selectedErrorCategories = [];
        updateErrorTypeFilter();
        usedWords.clear();
        initErrorGame();
      };
      resetCol.appendChild(resetBtn);

      filterBar.appendChild(filterCol);
      filterBar.appendChild(sourceCol);
      filterBar.appendChild(resetCol);
      mount.appendChild(filterBar);

      awPopulateSourceSelect('error-source-select', 'errors');
    }

    function errorTypePickerToggle(btn) {
      const wrap = btn.closest('.error-type-picker-wrap');
      const isOpen = wrap.classList.contains('open');
      // close all others first
      document.querySelectorAll('.error-type-picker-wrap.open').forEach(w => w.classList.remove('open'));
      if (!isOpen) wrap.classList.add('open');
    }

    function errorTypeSetSelected(types) {
      selectedErrorCategories = types.length === 0 ? [] : types;
      updateErrorTypeFilter();
      usedWords.clear();
      initErrorGame();
    }

    function updateErrorTypeFilter() {
      const btn = document.querySelector('.error-type-picker-wrap .theme-picker-btn');
      if (btn) {
        btn.textContent = selectedErrorCategories.length === 0 ? 'All Categories' : `${selectedErrorCategories.length} selected`;
      }
      const allCheck = document.querySelector('.error-type-picker-wrap .all-option input');
      if (allCheck) {
        allCheck.checked = selectedErrorCategories.length === 0;
      }
      document.querySelectorAll('.error-type-picker-wrap .theme-picker-option:not(.all-option) input').forEach((checkbox, idx) => {
        const errorTypes = getErrorCategories();
        checkbox.checked = selectedErrorCategories.includes(errorTypes[idx]);
      });
    }

    function setErrorMode(mode) {
      errorMode = mode;
      document.getElementById('tab-spot').classList.toggle('active', mode === 'spot');
      document.getElementById('tab-rewrite').classList.toggle('active', mode === 'rewrite');
      document.getElementById('error-spot-mode').classList.toggle('hidden', mode !== 'spot');
      document.getElementById('error-rewrite-mode').classList.toggle('hidden', mode !== 'rewrite');
      initErrorGame();
    }

    function initErrorGame() {
      setCurrentGameWord(null);
      const sourceBank = awGetBankFilteredBySource('errors');

      if (!sourceBank.length) {
        document.getElementById('error-progress').textContent = 'No sentences in the error bank yet. Add some in the Database tab.';
        document.getElementById('error-spot-mode').classList.add('hidden');
        document.getElementById('error-rewrite-mode').classList.add('hidden');
        return;
      }

      // Pick unused error
      let available = sourceBank.filter(e => !usedWords.has('err:' + e.correct));

      // Apply error category filter
      if (selectedErrorCategories.length > 0) {
        available = available.filter(e => selectedErrorCategories.includes(e.category) || e.category === undefined);
      }

      if (available.length === 0) {
        sourceBank.forEach(e => usedWords.delete('err:' + e.correct));
        available = sourceBank;
        if (selectedErrorCategories.length > 0) {
          available = available.filter(e => selectedErrorCategories.includes(e.category) || e.category === undefined);
        }
      }
      const pool = available.length ? available : sourceBank;
      currentErrorObj = pool[Math.floor(Math.random() * pool.length)];
      usedWords.add('err:' + currentErrorObj.correct);
      errorAnswered = false;

      // Progress
      const total = selectedErrorCategories.length > 0 ? sourceBank.filter(e => selectedErrorCategories.includes(e.category) || e.category === undefined).length : sourceBank.length;
      const used = sourceBank.filter(e => usedWords.has('err:' + e.correct)).length;
      document.getElementById('error-progress').textContent = `${used} / ${total} sentences seen this session`;

      if (errorMode === 'spot') {
        initSpotMode();
      } else {
        initRewriteMode();
      }

      renderGameTeamUI();
    }

    function initSpotMode() {
      errorHintRevealed = false;
      // Randomly assign correct/erroneous to A or B
      errorCorrectIsA = Math.random() < 0.5;
      const btnA = document.getElementById('error-choice-a');
      const btnB = document.getElementById('error-choice-b');
      btnA.textContent = errorCorrectIsA ? currentErrorObj.correct : currentErrorObj.erroneous;
      btnB.textContent = errorCorrectIsA ? currentErrorObj.erroneous : currentErrorObj.correct;
      btnA.className = 'error-choice-btn';
      btnB.className = 'error-choice-btn';
      btnA.disabled = false;
      btnB.disabled = false;
      btnA.onclick = () => checkErrorChoice('A');
      btnB.onclick = () => checkErrorChoice('B');
      const expBox = document.getElementById('error-explanation');
      expBox.className = 'error-explanation-box';
      expBox.innerHTML = '';
    }

    function checkErrorChoice(choice) {
      if (errorAnswered) return;
      errorAnswered = true;
      const pickedCorrect = (choice === 'A') ? errorCorrectIsA : !errorCorrectIsA;
      const btnA = document.getElementById('error-choice-a');
      const btnB = document.getElementById('error-choice-b');
      btnA.disabled = true;
      btnB.disabled = true;

      // Green highlights the correct sentence, red the erroneous one
      btnA.classList.add(errorCorrectIsA ? 'correct-answer' : 'wrong-answer');
      btnB.classList.add(errorCorrectIsA ? 'wrong-answer' : 'correct-answer');

      const expBox = document.getElementById('error-explanation');
      expBox.className = 'error-explanation-box visible';

      if (pickedCorrect) {
        awardPoints(POINTS_WIN);
        expBox.innerHTML = `✅ <strong>Correct!</strong> You identified the right sentence.<br><br>
          ❌ <em>"${currentErrorObj.erroneous}"</em><br>
          ✅ <em>"${currentErrorObj.correct}"</em><br><br>
          📖 <strong>Why?</strong> ${currentErrorObj.explanation}`;
        showSuccess(() => { nextTeamTurn(); initErrorGame(); });
      } else {
        awardPoints(POINTS_LOSE);
        expBox.innerHTML = `❌ <strong>Not quite.</strong> That sentence contained an error!<br><br>
          ❌ <em>"${currentErrorObj.erroneous}"</em><br>
          ✅ <em>"${currentErrorObj.correct}"</em><br><br>
          📖 <strong>Why?</strong> ${currentErrorObj.explanation}`;
        showFailure("Wrong choice!", () => { nextTeamTurn(); });
      }
    }

    function initRewriteMode() {
      errorHintRevealed = false;
      errorProjectionRevealAll = false;
      document.getElementById('error-rewrite-display').textContent = currentErrorObj.erroneous;
      const input = document.getElementById('error-rewrite-input');
      input.value = currentErrorObj.erroneous || '';
      input.className = 'error-rewrite-input';
      input.disabled = false;
      input.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          checkRewrite();
        }
      };
      const expBox = document.getElementById('error-rewrite-explanation');
      expBox.className = 'error-explanation-box';
      expBox.innerHTML = '';
      const hintBtn = document.getElementById('error-hint-btn');
      if (hintBtn) { hintBtn.disabled = false; hintBtn.innerHTML = '<img src="../assets/icons/lightbulb.svg" class="btn-icon" alt="" /> ' + t('btnHintShort'); }
      errorRewriteRenderPresenterPreview();
    }

    function resetRewriteInput() {
      if (errorAnswered || !currentErrorObj) return;
      const input = document.getElementById('error-rewrite-input');
      if (!input) return;
      input.value = currentErrorObj.erroneous || '';
      input.className = 'error-rewrite-input';
      input.focus();
    }

    function showErrorHint() {
      if (ltIsPresenterPreviewActive('error-game-section')) {
        if (errorProjectionRevealAll) return;
        awardPoints(POINTS_CLUE_PENALTY);
        errorProjectionRevealAll = true;
        errorRewriteRenderPresenterPreview();
        ltSchedulePresentationBroadcast();
        return;
      }

      awardPoints(POINTS_CLUE_PENALTY);
      errorHintRevealed = true;
      const hintBtn = document.getElementById('error-hint-btn');
      if (hintBtn) { hintBtn.disabled = true; hintBtn.textContent = t('clueShown'); }
      errorRewriteRenderPresenterPreview();
    }

    function checkRewrite() {
      if (errorAnswered) return;
      const input = document.getElementById('error-rewrite-input');
      const userAnswer = input.value.trim();
      const normalise = s => _normalizeContractions(String(s || '').toLowerCase().replace(/[.!?,;]+$/, '').trim());
      const expBox = document.getElementById('error-rewrite-explanation');

      if (normalise(userAnswer) === normalise(currentErrorObj.correct)) {
        errorAnswered = true;
        input.className = 'error-rewrite-input input-correct';
        input.disabled = true;
        expBox.className = 'error-explanation-box visible';
        expBox.innerHTML = `<strong>Perfect!</strong><br><br><strong>Why?</strong> ${currentErrorObj.explanation}`;
        awardPoints(POINTS_WIN);
        showSuccess(() => { nextTeamTurn(); initErrorGame(); });
      } else {
        input.className = 'error-rewrite-input input-wrong';
        expBox.className = 'error-explanation-box visible';
        expBox.innerHTML = `<strong>Not quite right.</strong> Edit the sentence and try again, or click "Reveal Answer".`;
        showFailure();
      }
    }

    function revealError() {
      if (errorAnswered) return;
      errorAnswered = true;
      awardPoints(POINTS_LOSE);
      const input = document.getElementById('error-rewrite-input');
      input.value = currentErrorObj.correct;
      input.className = 'error-rewrite-input input-correct';
      input.disabled = true;
      const expBox = document.getElementById('error-rewrite-explanation');
      expBox.className = 'error-explanation-box visible';
      expBox.innerHTML = `<strong>${t('answerLabel')}</strong> <em>${currentErrorObj.correct}</em><br><br>${currentErrorObj.explanation}`;
      showFailure(`${t('answerLabel')} ${currentErrorObj.correct}`, () => { nextTeamTurn(); });
    }

    // --- GAME: IPA PHONETIC GUESS ---
    let ipaWordObj = null;
    let ipaMode = 'mcq'; // 'mcq' | 'type'
    let ipaScore = 0, ipaStreak = 0, ipaSeen = 0;
    let ipaAnswered = false;
    let ipaHintUsed = false;

    function ipaSetMode(mode) {
      ipaMode = mode;
      document.querySelectorAll('.ipa-tab').forEach(t => t.classList.remove('active'));
      document.getElementById(`ipa-tab-${mode}`).classList.add('active');
      document.getElementById('ipa-mcq-mode').classList.toggle('hidden', mode !== 'mcq');
      document.getElementById('ipa-type-mode').classList.toggle('hidden', mode !== 'type');
      initIpaGame();
    }

    function initIpaGame() {
      const pool = getFilteredBank().filter(item => item.ipa && item.ipa.trim() !== '');
      if (!pool.length) {
        document.getElementById('ipa-display').textContent = 'No IPA data available for current filter.';
        return;
      }
      ipaAnswered = false;
      ipaHintUsed = false;

      ipaWordObj = pickUnused(pool);
      setCurrentGameWord(ipaWordObj);
      trackSeenWord(ipaWordObj, 'phonetic');
      ipaSeen++;

      document.getElementById('ipa-display').textContent = `/ ${ipaWordObj.ipa} /`;
      document.getElementById('ipa-pos-hint').textContent = `${ipaWordObj.partOfSpeech} · ${ipaWordObj.level}`;
      document.getElementById('ipa-result').className = 'ipa-result-box';
      document.getElementById('ipa-result').textContent = '';
      document.getElementById('ipa-score').textContent = ipaScore;
      document.getElementById('ipa-streak').textContent = ipaStreak;
      document.getElementById('ipa-seen').textContent = ipaSeen;

      if (ipaMode === 'mcq') {
        buildIpaChoices(pool);
      } else {
        const inp = document.getElementById('ipa-type-input');
        inp.value = '';
        inp.className = 'ipa-type-input';
        inp.disabled = false;
        inp.focus();
        const hintBtn = document.getElementById('ipa-hint-btn');
        if (hintBtn) { hintBtn.disabled = false; hintBtn.innerHTML = '<img src="../assets/icons/lightbulb.svg" class="btn-icon" alt="" /> ' + t('btnHintShort'); }
        inp.onkeydown = (e) => { if (e.key === 'Enter') ipaCheckType(); };
        inp.oninput = () => { if (!ipaAnswered && inp.value.trim().toLowerCase() === ipaWordObj.word.toLowerCase()) ipaCheckType(); };
      }
    }

    function buildIpaChoices(pool) {
      const container = document.getElementById('ipa-choices');
      container.innerHTML = '';
      const targetLen = (ipaWordObj.word || '').length;
      const targetPos = ipaWordObj.partOfSpeech || '';
      const candidates = pool.filter(i => i.word !== ipaWordObj.word);
      // Score distractors by same POS (+2) and similar length within ±2 chars (+1)
      const scored = candidates.map(item => {
        let priority = Math.random() * 0.8;
        if (targetPos && item.partOfSpeech === targetPos) priority += 2;
        if (Math.abs((item.word || '').length - targetLen) <= 2) priority += 1;
        return { item, priority };
      }).sort((a, b) => b.priority - a.priority);
      const distractors = scored.slice(0, 3).map(x => x.item);
      const choices = [...distractors, ipaWordObj].sort(() => Math.random() - 0.5);
      choices.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'ipa-choice-btn';
        btn.textContent = item.word;
        btn.onclick = () => ipaCheckChoice(btn, item.word);
        container.appendChild(btn);
      });
    }

    function ipaCheckChoice(btn, chosenWord) {
      if (ipaAnswered) return;
      ipaAnswered = true;
      const correct = chosenWord === ipaWordObj.word;
      document.querySelectorAll('.ipa-choice-btn').forEach(b => {
        b.disabled = true;
        if (b.textContent === ipaWordObj.word) b.classList.add('ipa-correct');
        else if (b === btn && !correct) b.classList.add('ipa-wrong');
      });
      ipaShowResult(correct);
    }

    function ipaCheckType() {
      if (ipaAnswered) return;
      const inp = document.getElementById('ipa-type-input');
      const val = inp.value.trim().toLowerCase();
      const correct = val === ipaWordObj.word.toLowerCase();
      ipaAnswered = true;
      inp.disabled = true;
      inp.className = 'ipa-type-input ' + (correct ? 'ipa-inp-correct' : 'ipa-inp-wrong');
      ipaShowResult(correct);
    }

    function ipaRevealHint() {
      if (ipaHintUsed) return;
      ipaHintUsed = true;
      awardPoints(POINTS_CLUE_PENALTY);
      const hintBtn = document.getElementById('ipa-hint-btn');
      if (hintBtn) { hintBtn.disabled = true; hintBtn.textContent = t('clueShown'); }
      const word = ipaWordObj.word.toLowerCase();
      const hint = word[0].toUpperCase() + '_'.repeat(word.length - 1) + ` (${word.length} letters) · ${ipaWordObj.partOfSpeech}`;
      const result = document.getElementById('ipa-result');
      result.textContent = `${t('hintLabel')} ${hint}`;
      result.className = 'ipa-result-box show ipa-res-correct';
    }

    function ipaRevealAnswer() {
      if (ipaAnswered) return;
      ipaAnswered = true;
      awardPoints(POINTS_LOSE);
      ipaStreak = 0;
      if (ipaMode === 'type') {
        const inp = document.getElementById('ipa-type-input');
        inp.value = ipaWordObj.word;
        inp.disabled = true;
        inp.className = 'ipa-type-input ipa-inp-wrong';
      } else {
        document.querySelectorAll('.ipa-choice-btn').forEach(b => {
          b.disabled = true;
          if (b.textContent === ipaWordObj.word) b.classList.add('ipa-correct');
        });
      }
      const result = document.getElementById('ipa-result');
      result.innerHTML = `The answer was: <strong>${ipaWordObj.word}</strong><br><em style="font-size:0.9rem;color:#888;">${_firstVal(ipaWordObj.definition)}</em>`;
      result.className = 'ipa-result-box show ipa-res-wrong';
      showExplanationBtn(ipaWordObj, 'ipa-result');
      document.getElementById('ipa-streak').textContent = ipaStreak;
    }

    function ipaShowResult(correct) {
      const result = document.getElementById('ipa-result');
      if (correct) {
        ipaScore += ipaHintUsed ? 5 : POINTS_WIN;
        ipaStreak++;
        awardPoints(ipaHintUsed ? 5 : POINTS_WIN);
        result.innerHTML = `<strong>Correct!</strong> That's <em>${ipaWordObj.word}</em><br><span style="font-size:0.88rem;color:#555;">/ ${ipaWordObj.ipa} / — ${_firstVal(ipaWordObj.definition)}</span>`;
        result.className = 'ipa-result-box show ipa-res-correct';
        showSuccess(() => { nextTeamTurn(); initIpaGame(); });
      } else {
        ipaStreak = 0;
        awardPoints(POINTS_WRONG_PENALTY);
        result.innerHTML = `<strong>Not quite.</strong> The answer was <em>${ipaWordObj.word}</em><br><span style="font-size:0.88rem;color:#555;">/ ${ipaWordObj.ipa} / — ${_firstVal(ipaWordObj.definition)}</span>`;
        result.className = 'ipa-result-box show ipa-res-wrong';
        showFailure(`${t('theWordWas')} ${ipaWordObj.word}`, () => { nextTeamTurn(); });
      }
      document.getElementById('ipa-score').textContent = ipaScore;
      document.getElementById('ipa-streak').textContent = ipaStreak;
    }

    // --- SCROLL TO TOP ---
    window.addEventListener('scroll', function () {
      const btn = document.getElementById('scroll-top-btn');
      if (btn) btn.classList.toggle('visible', window.scrollY > 300);
    });

    // --- AUDIO PREWARM on first mousemove ---
    let audioPrewarmed = false;
    document.addEventListener('mousemove', function prewarmAudio() {
      if (audioPrewarmed) return;
      audioPrewarmed = true;
      try {
        const ctx = getAudioContext();
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        ctx.resume().catch(() => { });
      } catch (e) { }
      document.removeEventListener('mousemove', prewarmAudio);
    }, { passive: true });

