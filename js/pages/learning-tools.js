    // ================================================================
    //  WORD SEARCH GAME
    // ================================================================
    let wsGridSize = 15;
    let wsWordCount = 8;
    let wsDirMode = 'all'; // 'easy' (→, ↓) | 'all' (8 directions)
    let wsGrid = [];       // 2D array of letters
    let wsPlaced = [];     // [{word, cells:[{r,c}], found:false, colorIdx}]
    let wsSelecting = false;
    let wsSelStart = null;
    let wsSelCells = [];
    let wsFoundCount = 0;

    const WS_DIRS = [
      [0, 1], [1, 0], [1, 1], [1, -1],   // →  ↓  ↘  ↙
      [0, -1], [-1, 0], [-1, -1], [-1, 1] // ←  ↑  ↖  ↗
    ];
    const WS_EASY_DIRS = [
      [0, 1], [1, 0] // →  ↓
    ];

    function wsSetSize(n) {
      wsGridSize = n;
      document.querySelectorAll('#wordsearch-game-section .ws-size-btns .ws-opt-btn').forEach(b => {
        b.classList.toggle('active', b.textContent === n + '×' + n);
      });
      initWordSearch();
    }

    function wsSetCount(n) {
      wsWordCount = n;
      document.querySelectorAll('#wordsearch-game-section .ws-count-btns .ws-opt-btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.textContent) === n);
      });
      initWordSearch();
    }

    function wsSetDirMode(mode) {
      wsDirMode = mode === 'easy' ? 'easy' : 'all';
      document.querySelectorAll('#wordsearch-game-section .ws-dir-btns .ws-opt-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.dir === wsDirMode);
      });
      initWordSearch();
    }

    function wsHintFirstLetter() {
      const unfound = wsPlaced.filter(e => !e.found && e.cells && e.cells.length > 0);
      if (!unfound.length) return;
      awardPoints(POINTS_CLUE_PENALTY);
      const pick = unfound[Math.floor(Math.random() * unfound.length)];
      const firstCell = pick.cells[0];
      const cellEl = wsGetCell(firstCell.r, firstCell.c);
      if (cellEl) {
        cellEl.classList.add('ws-hint-flash');
        cellEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => cellEl.classList.remove('ws-hint-flash'), 1800);
      }
      const clueIdx = wsPlaced.indexOf(pick);
      const clueEl = document.getElementById('ws-clue-' + clueIdx);
      if (clueEl) {
        clueEl.style.borderColor = '#e2c96e';
        clueEl.style.background = '#fdf8e4';
        setTimeout(() => {
          clueEl.style.borderColor = '';
          clueEl.style.background = '';
        }, 1800);
      }
    }

    function initWordSearch() {
      const pool = getFilteredBank().filter(w => {
        const word = (w.word || '').replace(/[^a-zA-Z]/g, '').toUpperCase();
        return word.length >= 3 && word.length <= wsGridSize - 1;
      });
      if (pool.length === 0) {
        document.getElementById('ws-grid').innerHTML = '<p style="padding:20px;color:#888;">No words available for the current filters.</p>';
        document.getElementById('ws-clues-list').innerHTML = '';
        return;
      }

      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const candidates = shuffled.slice(0, Math.min(wsWordCount * 3, shuffled.length));
      const words = candidates
        .map(w => ({ item: w, clean: w.word.replace(/[^a-zA-Z]/g, '').toUpperCase() }))
        .sort((a, b) => b.clean.length - a.clean.length);

      wsGrid = Array.from({ length: wsGridSize }, () => Array(wsGridSize).fill(''));
      wsPlaced = [];
      wsFoundCount = 0;

      let placed = 0;
      for (const { item, clean } of words) {
        if (placed >= wsWordCount) break;
        if (wsTryPlace(clean, item, placed)) placed++;
      }
      trackSeenWords(wsPlaced.map(entry => entry.item), 'wordsearch');

      const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      for (let r = 0; r < wsGridSize; r++)
        for (let c = 0; c < wsGridSize; c++)
          if (!wsGrid[r][c]) wsGrid[r][c] = alpha[Math.floor(Math.random() * 26)];

      wsFoundCount = 0;
      document.getElementById('ws-found-count').textContent = 0;
      document.getElementById('ws-total-count').textContent = wsPlaced.length;
      document.getElementById('ws-complete-banner').classList.remove('show');

      wsRenderGrid();
      wsRenderClues();
    }

    function wsTryPlace(word, item, colorIdx) {
      const activeDirs = wsDirMode === 'easy' ? WS_EASY_DIRS : WS_DIRS;
      const dirs = [...activeDirs].sort(() => Math.random() - 0.5);
      const size = wsGridSize;
      for (let attempt = 0; attempt < 200; attempt++) {
        const r0 = Math.floor(Math.random() * size);
        const c0 = Math.floor(Math.random() * size);
        for (const [dr, dc] of dirs) {
          const cells = [];
          let ok = true;
          for (let i = 0; i < word.length; i++) {
            const r = r0 + dr * i, c = c0 + dc * i;
            if (r < 0 || r >= size || c < 0 || c >= size) { ok = false; break; }
            const existing = wsGrid[r][c];
            if (existing && existing !== word[i]) { ok = false; break; }
            cells.push({ r, c });
          }
          if (ok) {
            cells.forEach(({ r, c }, i) => wsGrid[r][c] = word[i]);
            wsPlaced.push({ word, item, cells, found: false, colorIdx: colorIdx % 10 });
            return true;
          }
        }
      }
      return false;
    }

    function wsRenderGrid() {
      const grid = document.getElementById('ws-grid');
      grid.innerHTML = '';
      const maxW = Math.min(window.innerWidth - 80, 680);
      const cellPx = Math.max(22, Math.min(34, Math.floor(maxW / wsGridSize)));
      grid.style.gridTemplateColumns = `repeat(${wsGridSize}, ${cellPx}px)`;

      const cellEls = [];
      for (let r = 0; r < wsGridSize; r++) {
        for (let c = 0; c < wsGridSize; c++) {
          const el = document.createElement('div');
          el.className = 'ws-cell';
          el.textContent = wsGrid[r][c];
          el.dataset.r = r; el.dataset.c = c;
          el.style.width = cellPx + 'px';
          el.style.height = cellPx + 'px';
          el.style.fontSize = Math.max(10, cellPx * 0.52) + 'px';
          el.addEventListener('mousedown', wsOnDown);
          el.addEventListener('mouseover', wsOnOver);
          el.addEventListener('touchstart', wsTouchStart, { passive: false });
          el.addEventListener('touchmove', wsTouchMove, { passive: false });
          grid.appendChild(el);
          cellEls.push(el);
        }
      }
      grid.addEventListener('mouseup', wsOnUp);
      grid.addEventListener('touchend', wsTouchEnd);
      document.removeEventListener('mouseup', wsOnUp);
      document.addEventListener('mouseup', wsOnUp);

      wsPlaced.forEach(entry => {
        if (entry.found) wsMarkCells(entry.cells, entry.colorIdx);
      });
    }

    function wsRenderClues() {
      const list = document.getElementById('ws-clues-list');
      list.innerHTML = '';
      wsPlaced.forEach((entry, i) => {
        const div = document.createElement('div');
        div.className = 'ws-clue-item' + (entry.found ? ' ws-clue-found' : '');
        div.id = 'ws-clue-' + i;
        div.innerHTML = `
          <div class="ws-clue-num">${i + 1}.</div>
          <div>
            <div class="ws-clue-text">${_firstVal(entry.item.definition) || '—'}</div>
            <div class="ws-clue-word">${entry.word}</div>
          </div>`;
        list.appendChild(div);
      });
    }

    // --- Selection logic ---
    function wsGetCell(r, c) {
      return document.querySelector(`#ws-grid .ws-cell[data-r="${r}"][data-c="${c}"]`);
    }

    function wsCellsInLine(r0, c0, r1, c1) {
      const dr = r1 - r0, dc = c1 - c0;
      const steps = Math.max(Math.abs(dr), Math.abs(dc));
      if (steps === 0) return [{ r: r0, c: c0 }];
      if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
      const sr = dr === 0 ? 0 : dr / Math.abs(dr);
      const sc = dc === 0 ? 0 : dc / Math.abs(dc);
      const cells = [];
      for (let i = 0; i <= steps; i++) cells.push({ r: r0 + sr * i, c: c0 + sc * i });
      return cells;
    }

    function wsClearSelection() {
      wsSelCells.forEach(({ r, c }) => {
        const el = wsGetCell(r, c);
        if (el && !el.classList.contains('ws-found')) el.classList.remove('ws-selecting');
      });
      wsSelCells = [];
    }

    function wsOnDown(e) {
      e.preventDefault();
      wsSelecting = true;
      const r = +e.currentTarget.dataset.r, c = +e.currentTarget.dataset.c;
      wsSelStart = { r, c };
      wsClearSelection();
      wsSelCells = [{ r, c }];
      const el = wsGetCell(r, c);
      if (el && !el.classList.contains('ws-found')) el.classList.add('ws-selecting');
    }

    function wsOnOver(e) {
      if (!wsSelecting || !wsSelStart) return;
      const r = +e.currentTarget.dataset.r, c = +e.currentTarget.dataset.c;
      wsClearSelection();
      const cells = wsCellsInLine(wsSelStart.r, wsSelStart.c, r, c);
      if (!cells) { wsSelCells = [{ r: wsSelStart.r, c: wsSelStart.c }]; }
      else { wsSelCells = cells; }
      wsSelCells.forEach(({ r, c }) => {
        const el = wsGetCell(r, c);
        if (el && !el.classList.contains('ws-found')) el.classList.add('ws-selecting');
      });
    }

    function wsOnUp(e) {
      if (!wsSelecting) return;
      wsSelecting = false;
      if (wsSelCells.length >= 2) wsCheckSelection();
      wsClearSelection();
      wsSelStart = null;
      wsSelCells = [];
    }

    // Touch support
    function wsTouchStart(e) {
      e.preventDefault();
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (el && el.classList.contains('ws-cell')) wsOnDown({ preventDefault: () => { }, currentTarget: el });
    }
    function wsTouchMove(e) {
      e.preventDefault();
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (el && el.classList.contains('ws-cell')) wsOnOver({ currentTarget: el });
    }
    function wsTouchEnd(e) { wsOnUp(e); }

    function wsCheckSelection() {
      if (wsSelCells.length < 2) return;
      const snapCells = [...wsSelCells];
      const selected = snapCells.map(({ r, c }) => wsGrid[r][c]).join('');
      const selectedRev = selected.split('').reverse().join('');

      for (const entry of wsPlaced) {
        if (entry.found) continue;
        if (selected === entry.word || selectedRev === entry.word) {
          entry.found = true;
          wsFoundCount++;
          awardPoints(POINTS_WS_WORD);
          wsMarkCells(entry.cells, entry.colorIdx);
          const clueEl = document.getElementById('ws-clue-' + wsPlaced.indexOf(entry));
          if (clueEl) clueEl.classList.add('ws-clue-found');
          document.getElementById('ws-found-count').textContent = wsFoundCount;
          if (wsFoundCount === wsPlaced.length) {
            document.getElementById('ws-complete-banner').classList.add('show');
            awardPoints(POINTS_WIN);
            wsNextTeamTurn();
          } else {
            wsNextTeamTurn();
          }
          return;
        }
      }
      awardPoints(POINTS_WRONG_PENALTY);
      snapCells.forEach(({ r, c }) => {
        const el = wsGetCell(r, c);
        if (el) {
          el.classList.add('ws-wrong-flash');
          setTimeout(() => el.classList.remove('ws-wrong-flash'), 350);
        }
      });
      if (teams.length > 0) {
        const banner = document.getElementById('turn-banner');
        if (banner) {
          banner.style.transform = 'scale(1.06)';
          setTimeout(() => { banner.style.transform = ''; }, 300);
        }
        wsNextTeamTurn();
      }
    }

    function wsMarkCells(cells, colorIdx) {
      cells.forEach(({ r, c }) => {
        const el = wsGetCell(r, c);
        if (el) {
          el.classList.remove('ws-selecting', 'ws-wrong-flash');
          el.classList.add('ws-found', 'ws-found-' + colorIdx);
        }
      });
    }

    function wsRevealAll() {
      let unrevealedCount = wsPlaced.filter(e => !e.found).length;
      wsPlaced.forEach((entry, i) => {
        if (entry.found) return;
        entry.found = true;
        wsFoundCount++;
        wsMarkCells(entry.cells, entry.colorIdx);
        const clueEl = document.getElementById('ws-clue-' + i);
        if (clueEl) clueEl.classList.add('ws-clue-found');
      });
      document.getElementById('ws-found-count').textContent = wsFoundCount;
      if (unrevealedCount > 0) {
        awardPoints(POINTS_LOSE);
        renderGameTeamUI();
      }
      if (wsPlaced.length > 0) {
        document.getElementById('ws-complete-banner').textContent = 'Answers revealed!';
        document.getElementById('ws-complete-banner').classList.add('show');
      }
      if (unrevealedCount > 0) wsNextTeamTurn();
    }


    // ================================================================
    // CHOOSE YOUR STORY ENGINE
    // ================================================================

    let storyCurrentId = null;
    let storyCurrentStage = null;
    let storyChoiceCount = 0;
    let storyHistory = [];
    const STORY_MAX_STAGES = 10;

    function initStorySection() {
      storyCurrentId = null;
      storyCurrentStage = null;
      storyChoiceCount = 0;
      storyHistory = [];
      document.getElementById('story-library-view').style.display = '';
      document.getElementById('story-reader').style.display = 'none';
      renderStoryLibrary();
    }

    function renderStoryLibrary() {
      const grid = document.getElementById('story-library-grid');
      grid.innerHTML = '';
      const bank = awGetBankFilteredBySource('stories');
      if (!bank.length) {
        grid.innerHTML = '<p style="text-align:center;color:#aaa;padding:40px;font-style:italic;">No stories loaded. Make sure barras-chooseStory.js is present.</p>';
        return;
      }
      bank.forEach(story => {
        const card = document.createElement('div');
        card.className = 'story-card';
        const endingCount = Object.values(story.stages).filter(s => s.isEnding).length;
        card.innerHTML = `
          <span class="story-card-emoji">${story.coverEmoji || ''}</span>
          <div class="story-card-title">${story.title}</div>
          <div class="story-card-theme">${story.theme} &middot; ${story.level}</div>
          <div class="story-card-synopsis">${story.synopsis}</div>
          <div class="story-card-meta">~${(story.wordCount || 0).toLocaleString()} words &middot; ${endingCount} possible ending${endingCount !== 1 ? 's' : ''}</div>
        `;
        card.onclick = () => storyStart(story.id);
        grid.appendChild(card);
      });
    }

    function storyStart(storyId) {
      const bank = awGetBankFilteredBySource('stories');
      const story = bank.find(s => s.id === storyId);
      if (!story) return;
      storyCurrentId = storyId;
      storyCurrentStage = 'start';
      storyChoiceCount = 0;
      storyHistory = [];
      document.getElementById('story-library-view').style.display = 'none';
      document.getElementById('story-reader').style.display = 'block';
      document.getElementById('story-reader-emoji').textContent = story.coverEmoji || '';
      document.getElementById('story-reader-title').textContent = story.title;
      storyRenderStage();
    }

    function storyGoBackStep() {
      if (!storyHistory.length) return;
      const last = storyHistory.pop();
      storyCurrentStage = last.stageId || 'start';
      storyChoiceCount = Math.max(0, storyChoiceCount - 1);
      storyRenderStage();
    }

    function storyRenderStage() {
      const bank = awGetBankFilteredBySource('stories');
      const story = bank.find(s => s.id === storyCurrentId);
      if (!story) return;
      const stage = story.stages[storyCurrentStage];
      if (!stage) return;

      const stepBackBtn = document.getElementById('story-step-back-btn');
      if (stepBackBtn) {
        stepBackBtn.style.display = storyHistory.length > 0 ? '' : 'none';
      }

      const nonEndingCount = Object.values(story.stages).filter(s => !s.isEnding).length;
      const pct = Math.min(100, Math.round((storyChoiceCount / Math.min(STORY_MAX_STAGES, nonEndingCount)) * 100));
      document.getElementById('story-progress-bar').style.width = (stage.isEnding ? 100 : pct) + '%';
      document.getElementById('story-stage-label').textContent = stage.isEnding ? 'Ending' : 'Stage ' + (storyChoiceCount + 1);
      document.getElementById('story-choices-made').textContent = storyChoiceCount === 1 ? '1 choice' : storyChoiceCount + ' choices';

      const container = document.getElementById('story-stage-content');
      container.innerHTML = '';

      if (stage.isEnding) { storyRenderEnding(stage, container); return; }

      const passageEl = document.createElement('div');
      passageEl.className = 'story-passage';
      passageEl.innerHTML = stage.passage
        .split(/\n\n+/)
        .filter(p => p.trim())
        .map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>')
        .join('');
      container.appendChild(passageEl);

      if (stage.choices && stage.choices.length) {
        const label = document.createElement('div');
        label.className = 'story-choices-label';
        label.textContent = 'What do you do?';
        container.appendChild(label);

        const choicesEl = document.createElement('div');
        choicesEl.className = 'story-choices';

        const feedbackEl = document.createElement('div');
        feedbackEl.className = 'story-feedback-box';

        const continueBtn = document.createElement('button');
        continueBtn.className = 'action-btn story-continue-btn';
        continueBtn.innerHTML = 'Continue &rarr;';
        continueBtn.onclick = () => {
          storyChoiceCount++;
          storyRenderStage();
          document.getElementById('story-stage-content').scrollIntoView({ behavior: 'smooth', block: 'start' });
        };

        const letters = ['A', 'B', 'C', 'D'];
        stage.choices.forEach((choice, i) => {
          const btn = document.createElement('button');
          btn.className = 'story-choice-btn';
          btn.innerHTML = '<span class="story-choice-letter">' + letters[i] + '</span><span>' + choice.text + '</span>';
          btn.onclick = () => {
            choicesEl.querySelectorAll('.story-choice-btn').forEach(b => b.disabled = true);
            btn.classList.add('chosen');
            storyHistory.push({ stageId: storyCurrentStage, choiceText: choice.text });
            storyCurrentStage = choice.next;
            if (choice.feedback && choice.feedback.trim()) {
              feedbackEl.textContent = choice.feedback;
              feedbackEl.classList.add('show');
            }
            continueBtn.classList.add('show');
          };
          choicesEl.appendChild(btn);
        });

        container.appendChild(choicesEl);
        container.appendChild(feedbackEl);
        container.appendChild(continueBtn);
      }
    }

    function storyRenderEnding(stage, container) {
      const labels = { excellent: 'Outstanding ending', good: 'Good ending', learning: 'Learning ending' };

      const endingEl = document.createElement('div');
      endingEl.className = 'story-ending';

      const passageHtml = stage.passage
        .split(/\n\n+/)
        .filter(p => p.trim())
        .map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>')
        .join('');

      endingEl.innerHTML =
        '<div class="story-ending-label ' + (stage.endingType || '') + '">' + (labels[stage.endingType] || 'The End') + '</div>' +
        '<div class="story-ending-passage">' + passageHtml + '</div>';

      if (storyHistory.length) {
        let summaryHtml = '<div class="story-path-summary"><div class="story-path-summary-title">Your choices</div>';
        storyHistory.forEach((h, i) => {
          summaryHtml += '<div class="story-path-step"><strong>Choice ' + (i + 1) + ':</strong> ' + h.choiceText + '</div>';
        });
        summaryHtml += '</div>';
        endingEl.innerHTML += summaryHtml;
      }

      container.appendChild(endingEl);

      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:16px;';
      const sid = storyCurrentId;
      const replayBtn = document.createElement('button');
      replayBtn.className = 'action-btn';
      replayBtn.innerHTML = '\u21BA Read Again';
      replayBtn.onclick = () => storyStart(sid);
      const backBtn = document.createElement('button');
      backBtn.className = 'action-btn btn-grey';
      backBtn.innerHTML = '\u2190 All Stories';
      backBtn.onclick = storyBackToLibrary;
      btnRow.appendChild(replayBtn);
      btnRow.appendChild(backBtn);
      container.appendChild(btnRow);
    }

    function storyBackToLibrary() {
      storyCurrentId = storyCurrentStage = null;
      storyChoiceCount = 0; storyHistory = [];
      document.getElementById('story-library-view').style.display = '';
      document.getElementById('story-reader').style.display = 'none';
    }


