    // =============================================
    // GRAMMAR PRACTICE MODULE
    // =============================================
    let gpMode = 'reference';
    let gpFilteredData = [];
    let gpCurrentQuizItem = null;
    let gpHintsShown = 0;
    let gpQuizAnswered = false;
    let gpQuizScore = 0;
    let gpQuizStreak = 0;
    let gpQuizSeen = 0;
    const gpUsed = new Set();

    function gpInit() {
      const catSelect = document.getElementById('gp-cat-filter');
      if (catSelect.options.length <= 1) {
        const cats = [...new Set(grammarData.map(g => g.category).filter(Boolean))].sort();
        cats.forEach(c => {
          const o = document.createElement('option');
          o.value = c; o.textContent = c;
          catSelect.appendChild(o);
        });
      }
      gpApplyFilters();
    }

    function gpApplyFilters() {
      const lvl = document.getElementById('gp-level-filter').value;
      const cat = document.getElementById('gp-cat-filter').value;
      const search = (document.getElementById('gp-search').value || '').toLowerCase().trim();
      gpFilteredData = grammarData.filter(g => {
        const lvlM = (lvl === 'all' || g.level === lvl);
        const catM = (cat === 'all' || g.category === cat);
        const srchM = !search || g.topic.toLowerCase().includes(search)
          || (g.nuance_delta || '').toLowerCase().includes(search)
          || (g.category || '').toLowerCase().includes(search)
          || (g.syntax && g.syntax.formula ? g.syntax.formula.toLowerCase().includes(search) : false)
          || (g.signal_words || []).some(s => s.toLowerCase().includes(search));
        return lvlM && catM && srchM;
      });
      if (gpMode === 'reference') gpRenderReference();
      else if (gpMode === 'quiz') { gpUsed.clear(); gpNextQuiz(); }
      else if (gpMode === 'browse') gpRenderBrowse();
    }

    function gpSetMode(mode) {
      gpMode = mode;
      ['reference', 'quiz', 'browse'].forEach(m => {
        document.getElementById('gp-mode-' + m).classList.toggle('hidden', m !== mode);
        document.getElementById('gp-tab-' + m).classList.toggle('active', m === mode);
      });
      gpApplyFilters();
    }

    // ---- REFERENCE MODE ----
    function gpRenderReference() {
      const container = document.getElementById('gp-reference-list');
      const count = document.getElementById('gp-ref-count');
      container.innerHTML = '';
      count.textContent = 'Showing ' + gpFilteredData.length + ' grammar topic' + (gpFilteredData.length !== 1 ? 's' : '');
      if (!gpFilteredData.length) {
        container.innerHTML = '<p style="text-align:center;color:#999;margin:40px 0;">No topics match your filters.</p>';
        return;
      }
      gpFilteredData.forEach(function (g) {
        const freqStars = '★'.repeat(g.frequency_rating || 0) + '☆'.repeat(5 - (g.frequency_rating || 0));
        const signalChips = (g.signal_words || []).map(s => '<span class="gp-signal-chip">' + s + '</span>').join('');
        const card = document.createElement('div');
        card.className = 'gp-card';
        const relLinks = (g.related_topic_ids || []).map(function (id) {
          const rel = grammarData.find(x => x.id === id);
          return rel ? '<span class="gp-related-tag" onclick="gpJumpToTopic(\'' + id + '\')">' + rel.topic + '</span>' : id;
        }).join(' ');
        card.innerHTML =
          '<div class="gp-card-header">'
          + '<div class="gp-topic">' + g.topic + '</div>'
          + '<div class="gp-badges">'
          + '<span class="gp-badge gp-badge-level">' + g.level + '</span>'
          + '<span class="gp-badge gp-badge-cat">' + g.category + '</span>'
          + '<span class="gp-badge gp-badge-freq" title="Frequency">' + freqStars + '</span>'
          + '</div></div>'
          + '<div class="gp-card-body">'
          + '<div class="gp-nuance">' + g.nuance_delta + '</div>'
          + '<div class="gp-formula-box"><strong>Formula:</strong> ' + (g.syntax && g.syntax.formula ? g.syntax.formula : '—') + '</div>'
          + (signalChips ? '<div style="margin-bottom:12px;"><span style="font-size:0.72rem;color:#718096;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-right:8px;">Signal words</span><div class="gp-signals">' + signalChips + '</div></div>' : '')
          + (g.common_mistake ? '<div class="gp-mistake">⚠️ <strong>Common Mistake:</strong> ' + g.common_mistake + '</div>' : '')
          + (g.cefr_milestone ? '<div class="gp-milestone">🎯 ' + g.cefr_milestone + '</div>' : '')
          + '<button class="gp-expand-btn" onclick="gpToggleExtra(this)">＋ More details</button>'
          + '<div class="gp-extra">'
          + (g.syntax && g.syntax.negation_pattern ? '<div class="gp-extra-row"><span class="gp-extra-label">Negative</span> <span>' + g.syntax.negation_pattern + '</span></div>' : '')
          + (g.syntax && g.syntax.interrogative_pattern ? '<div class="gp-extra-row"><span class="gp-extra-label">Question</span> <span>' + g.syntax.interrogative_pattern + '</span></div>' : '')
          + (g.syntax && g.syntax.alternatives && g.syntax.alternatives.length ? '<div class="gp-extra-row"><span class="gp-extra-label">Alternatives</span> <span>' + g.syntax.alternatives.join(' / ') + '</span></div>' : '')
          + (g.register ? '<div class="gp-extra-row"><span class="gp-extra-label">Register</span> <span>' + g.register + '</span></div>' : '')
          + (relLinks ? '<div class="gp-extra-row"><span class="gp-extra-label">Related</span> <span style="display:flex;gap:6px;flex-wrap:wrap;">' + relLinks + '</span></div>' : '')
          + '<button class="action-btn btn-purple" style="margin-top:12px;font-size:0.88rem;padding:8px 18px;letter-spacing:0.5px;" onclick="gpQuizOnTopic(\'' + g.id + '\')">Quiz me on this →</button>'
          + '</div>'
          + '</div>';
        container.appendChild(card);
      });
    }

    function gpToggleExtra(btn) {
      const extra = btn.nextElementSibling;
      const open = extra.classList.toggle('open');
      btn.textContent = open ? '－ Less details' : '＋ More details';
    }

    function gpJumpToTopic(id) {
      gpSetMode('reference');
      document.getElementById('gp-search').value = '';
      document.getElementById('gp-level-filter').value = 'all';
      document.getElementById('gp-cat-filter').value = 'all';
      gpApplyFilters();
      setTimeout(function () {
        const cards = document.querySelectorAll('#gp-reference-list .gp-card');
        const idx = gpFilteredData.findIndex(x => x.id === id);
        if (cards[idx]) {
          cards[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
          cards[idx].style.border = '2.5px solid #8e44ad';
          setTimeout(() => { cards[idx].style.border = ''; }, 2000);
        }
      }, 200);
    }

    // ---- QUIZ MODE ----
    function gpQuizOnTopic(id) {
      const item = grammarData.find(g => g.id === id);
      if (!item || !item.quiz) return;
      gpSetMode('quiz');
      gpLoadQuizItem(item);
    }

    function gpNextQuiz() {
      const available = gpFilteredData.filter(g => g.quiz && !gpUsed.has(g.id));
      if (!available.length) {
        gpUsed.clear();
        const retry = gpFilteredData.filter(g => g.quiz);
        if (!retry.length) {
          document.getElementById('gp-quiz-question').textContent = t('noQuizItems');
          return;
        }
        gpLoadQuizItem(retry[Math.floor(Math.random() * retry.length)]);
        return;
      }
      gpLoadQuizItem(available[Math.floor(Math.random() * available.length)]);
    }

    function gpLoadQuizItem(item) {
      gpCurrentQuizItem = item;
      gpUsed.add(item.id);
      gpHintsShown = 0;
      gpQuizAnswered = false;
      gpQuizSeen++;
      document.getElementById('gp-quiz-topic-badge').textContent = item.topic;
      document.getElementById('gp-quiz-type-badge').textContent = (item.quiz.type || 'cloze').toUpperCase();
      document.getElementById('gp-quiz-question').textContent = item.quiz.question;
      const input = document.getElementById('gp-quiz-input');
      input.value = '';
      input.className = 'gp-quiz-input';
      input.disabled = false;
      document.getElementById('gp-hints-container').innerHTML = '';
      const exp = document.getElementById('gp-quiz-explanation');
      exp.className = 'gp-quiz-explanation';
      exp.innerHTML = '';
      document.getElementById('gp-related-tags').innerHTML = '';
      document.getElementById('gp-hint-btn').disabled = false;
      document.getElementById('gp-hint-btn').textContent = t('btnHintShort');
      gpUpdateQuizStats();
    }

    function gpUpdateQuizStats() {
      document.getElementById('gp-quiz-score').textContent = gpQuizScore;
      document.getElementById('gp-quiz-streak').textContent = gpQuizStreak;
      document.getElementById('gp-quiz-seen').textContent = gpQuizSeen;
    }

    function gpCheckAnswer() {
      if (gpQuizAnswered || !gpCurrentQuizItem) return;
      const input = document.getElementById('gp-quiz-input');
      const userVal = input.value.trim();
      const correct = gpCurrentQuizItem.quiz.answer;
      const normalise = s => s.toLowerCase().replace(/[.!?,;]$/, '').trim();
      const isCorrect = normalise(userVal) === normalise(correct);
      gpQuizAnswered = true;
      input.disabled = true;
      const exp = document.getElementById('gp-quiz-explanation');
      exp.className = 'gp-quiz-explanation visible';
      if (isCorrect) {
        input.classList.add('gp-correct');
        const pts = Math.max(20 - gpHintsShown * 5, 5);
        gpQuizScore += pts;
        gpQuizStreak++;
        awardPoints(pts);
        exp.innerHTML = '✅ <strong>Correct!</strong> +' + pts + ' pts<br><br>'
          + `<strong>${t('answerLabel')}</strong> <em>` + correct + '</em><br>'
          + '<strong>Formula:</strong> ' + (gpCurrentQuizItem.syntax && gpCurrentQuizItem.syntax.formula ? gpCurrentQuizItem.syntax.formula : '—') + '<br>'
          + '<strong>Key point:</strong> ' + gpCurrentQuizItem.nuance_delta;
        showSuccess(function () { nextTeamTurn(); gpNextQuiz(); });
      } else {
        input.classList.add('gp-wrong');
        gpQuizStreak = 0;
        awardPoints(POINTS_WRONG_PENALTY);
        exp.className = 'gp-quiz-explanation visible wrong-exp';
        exp.innerHTML = '❌ <strong>Not quite.</strong><br>'
          + '<em>Your answer: ' + (userVal || '(empty)') + '</em><br><br>'
          + '✅ <strong>Correct answer:</strong> <em>' + correct + '</em><br>'
          + '<strong>Formula:</strong> ' + (gpCurrentQuizItem.syntax && gpCurrentQuizItem.syntax.formula ? gpCurrentQuizItem.syntax.formula : '—') + '<br>'
          + (gpCurrentQuizItem.common_mistake ? '<strong>Common mistake:</strong> ' + gpCurrentQuizItem.common_mistake : '<strong>Key point:</strong> ' + gpCurrentQuizItem.nuance_delta);
        gpQuizAnswered = false;
        input.disabled = false;
        input.className = 'gp-quiz-input gp-wrong';
        showFailure(t('answerLabel') + ' ' + correct);
      }
      gpRenderRelatedTags();
      gpUpdateQuizStats();
    }

    function gpShowHint() {
      if (!gpCurrentQuizItem || gpQuizAnswered) return;
      const hints = gpCurrentQuizItem.quiz.hints || [];
      if (gpHintsShown >= hints.length) {
        document.getElementById('gp-hint-btn').disabled = true;
        document.getElementById('gp-hint-btn').textContent = t('noMoreHints');
        return;
      }
      const chip = document.createElement('span');
      chip.className = 'gp-hint-chip';
      chip.innerHTML = '<img src="../assets/icons/lightbulb.svg" class="btn-icon" alt="" /> ' + hints[gpHintsShown];
      document.getElementById('gp-hints-container').appendChild(chip);
      gpHintsShown++;
      awardPoints(POINTS_CLUE_PENALTY);
      if (gpHintsShown >= hints.length) {
        document.getElementById('gp-hint-btn').disabled = true;
        document.getElementById('gp-hint-btn').textContent = t('noMoreHints');
      }
    }

    function gpRevealAnswer() {
      if (!gpCurrentQuizItem || gpQuizAnswered) return;
      gpQuizAnswered = true;
      gpQuizStreak = 0;
      awardPoints(POINTS_LOSE);
      const input = document.getElementById('gp-quiz-input');
      input.value = gpCurrentQuizItem.quiz.answer;
      input.classList.add('gp-correct');
      input.disabled = true;
      const exp = document.getElementById('gp-quiz-explanation');
      exp.className = 'gp-quiz-explanation visible';
      exp.innerHTML = '📖 <strong>Answer:</strong> <em>' + gpCurrentQuizItem.quiz.answer + '</em><br><br>'
        + '<strong>Formula:</strong> ' + (gpCurrentQuizItem.syntax && gpCurrentQuizItem.syntax.formula ? gpCurrentQuizItem.syntax.formula : '—') + '<br>'
        + '<strong>Key point:</strong> ' + gpCurrentQuizItem.nuance_delta + '<br>'
        + '<strong>Common mistake:</strong> ' + (gpCurrentQuizItem.common_mistake || '—');
      gpRenderRelatedTags();
      gpUpdateQuizStats();
      showFailure('Answer: ' + gpCurrentQuizItem.quiz.answer);
    }

    function gpRenderRelatedTags() {
      const container = document.getElementById('gp-related-tags');
      container.innerHTML = '';
      const relIds = (gpCurrentQuizItem && gpCurrentQuizItem.related_topic_ids) ? gpCurrentQuizItem.related_topic_ids : [];
      if (!relIds.length) return;
      const label = document.createElement('span');
      label.style.cssText = 'font-size:0.82rem;color:#888;font-weight:600;margin-right:6px;align-self:center;';
      label.textContent = t('relatedTopics');
      container.appendChild(label);
      relIds.forEach(function (id) {
        const rel = grammarData.find(x => x.id === id);
        if (!rel) return;
        const tag = document.createElement('span');
        tag.className = 'gp-related-tag';
        tag.textContent = rel.topic;
        tag.onclick = function () { gpQuizOnTopic(id); };
        container.appendChild(tag);
      });
    }

    // ---- BROWSE BY TOPIC MODE ----
    function gpRenderBrowse() {
      const list = document.getElementById('gp-browse-list');
      const count = document.getElementById('gp-browse-count');
      list.innerHTML = '';
      document.getElementById('gp-topic-detail').classList.add('hidden');
      list.style.display = 'grid';
      count.textContent = gpFilteredData.length + ' ' + (gpFilteredData.length !== 1 ? t('topicsFound') : t('topicFound'));
      if (!gpFilteredData.length) {
        list.innerHTML = '<p style="text-align:center;color:#999;grid-column:1/-1;margin:40px 0;">No topics match your filters.</p>';
        return;
      }
      gpFilteredData.forEach(function (g) {
        const card = document.createElement('div');
        card.style.cssText = 'background:#ffffff;border:2px solid #333333;border-left:6px solid #8b7cc2;border-radius:10px;padding:16px 18px;cursor:pointer;transition:transform 0.15s ease;box-shadow:3px 3px 0 #555555;color:#222222;';
        card.onmouseover = function () { card.style.transform = 'translate(-2px, -2px)'; };
        card.onmouseout = function () { card.style.transform = ''; };
        const nuanceTrunc = g.nuance_delta ? (g.nuance_delta.length > 75 ? g.nuance_delta.substring(0, 75) + '…' : g.nuance_delta) : '';
        card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">'
          + '<strong style="color:#222222;font-size:1rem;">' + g.topic + '</strong>'
          + '<span class="gp-badge gp-badge-level">' + g.level + '</span></div>'
          + '<div style="font-size:0.78rem;color:#5b8fcc;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:8px;">' + g.category + '</div>'
          + '<div style="font-size:0.9rem;color:#555555;font-style:italic;font-weight:400;">' + nuanceTrunc + '</div>';
        card.onclick = function () { gpShowTopicDetail(g); };
        list.appendChild(card);
      });
    }

    function gpShowTopicDetail(g) {
      document.getElementById('gp-browse-list').style.display = 'none';
      const panel = document.getElementById('gp-topic-detail');
      panel.classList.remove('hidden');
      const freqStars = '★'.repeat(g.frequency_rating || 0) + '☆'.repeat(5 - (g.frequency_rating || 0));
      const signalChips = (g.signal_words || []).map(s => '<span class="gp-signal-chip">' + s + '</span>').join('');
      const relatedHtml = (g.related_topic_ids || []).map(function (id) {
        const rel = grammarData.find(x => x.id === id);
        return rel ? '<span class="gp-related-tag" onclick="gpShowTopicDetail(grammarData.find(function(x){return x.id===\'' + id + '\';}))">' + rel.topic + '</span>' : '';
      }).join('');
      const quizHtml = g.quiz ? (
        '<textarea id="gp-detail-quiz-input" class="gp-quiz-input" rows="2" placeholder="Type your answer…" style="max-width:100%;"></textarea>'
        + '<div id="gp-detail-quiz-hints" style="margin-bottom:10px;"></div>'
        + '<div class="gp-actions" style="justify-content:flex-start;">'
        + '<button class="action-btn btn-purple" onclick="gpDetailCheckAnswer(\'' + g.id + '\')"><img src="../assets/icons/check.svg" class="btn-icon" alt="" /> Check</button>'
        + '<button class="action-btn btn-blue" onclick="gpDetailHint(\'' + g.id + '\',0)"><img src="../assets/icons/lightbulb.svg" class="btn-icon" alt="" /> Hint 1</button>'
        + '<button class="action-btn btn-orange" onclick="gpDetailReveal(\'' + g.id + '\')"><img src="../assets/icons/eye.svg" class="btn-icon" alt="" /> Reveal</button>'
        + '</div>'
        + '<div class="gp-quiz-explanation" id="gp-detail-explanation" style="margin-top:12px;"></div>'
      ) : '<em style="color:#777;">No quiz available.</em>';

      function acc(iconPath, label, bodyHtml) {
        const uid = 'acc-' + Math.random().toString(36).slice(2, 8);
        return '<div class="gp-accordion">'
          + '<button class="gp-accordion-btn" onclick="(function(btn){'
          + 'btn.classList.toggle(\'open\');'
          + 'var body=document.getElementById(\'' + uid + '\');'
          + 'body.classList.toggle(\'open\');'
          + '})(this)">'
          + '<img src="' + iconPath + '" class="btn-icon" alt="" /> ' + label
          + '<span class="acc-icon">+</span>'
          + '</button>'
          + '<div class="gp-accordion-body" id="' + uid + '">' + bodyHtml + '</div>'
          + '</div>';
      }

      let formulaBody = '<div class="gp-detail-formula">'
        + '<strong>Formula:</strong> ' + (g.syntax && g.syntax.formula ? g.syntax.formula : '—') + '<br>'
        + (g.syntax && g.syntax.negation_pattern ? '<strong>Negative:</strong> ' + g.syntax.negation_pattern + '<br>' : '')
        + (g.syntax && g.syntax.interrogative_pattern ? '<strong>Question:</strong> ' + g.syntax.interrogative_pattern : '')
        + '</div>'
        + (g.syntax && g.syntax.alternatives && g.syntax.alternatives.length
          ? '<p><strong>Alternatives:</strong> ' + g.syntax.alternatives.join(' / ') + '</p>' : '')
        + (g.register ? '<p><strong>Register:</strong> ' + g.register + '</p>' : '');

      let signalBody = signalChips
        ? '<div class="gp-detail-signals">' + signalChips + '</div>'
        : '<em style="color:#777;">None listed.</em>';

      let notesBody = ''
        + (g.common_mistake ? '<div class="gp-mistake" style="margin-bottom:10px;"><strong>Common Mistake:</strong> ' + g.common_mistake + '</div>' : '')
        + (g.cefr_milestone ? '<div class="gp-milestone">' + g.cefr_milestone + '</div>' : '')
        + (relatedHtml ? '<div style="margin-top:12px;"><strong style="font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;">Related:</strong><div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:8px;">' + relatedHtml + '</div></div>' : '');
      if (!notesBody) notesBody = '<em style="color:#777;">No additional notes.</em>';

      let quizBody = '<div style="font-size:1.15rem;font-weight:700;margin-bottom:14px;color:#111;">' + (g.quiz ? g.quiz.question : '') + '</div>' + quizHtml;

      document.getElementById('gp-topic-detail-content').innerHTML =
        '<div style="max-width:780px;margin:0 auto;">'
        + '<div class="gp-detail-header">'
        + '<div class="gp-detail-title">' + g.topic + '</div>'
        + '<div class="gp-detail-badges">'
        + '<span class="gp-badge gp-badge-level">' + g.level + '</span>'
        + '<span class="gp-badge gp-badge-cat">' + g.category + '</span>'
        + '<span class="gp-badge gp-badge-freq">' + freqStars + '</span>'
        + '</div></div>'
        + '<div class="gp-detail-nuance">' + g.nuance_delta + '</div>'
        + acc('../assets/icons/book.svg', 'Formula & Structure', formulaBody)
        + acc('../assets/icons/sparkles.svg', 'Signal Words', signalBody)
        + acc('../assets/icons/edit.svg', 'Notes & Related Topics', notesBody)
        + acc('../assets/icons/quiz.svg', 'Quiz', quizBody)
        + '</div>';
    }

    function gpDetailCheckAnswer(id) {
      const g = grammarData.find(x => x.id === id);
      if (!g || !g.quiz) return;
      const input = document.getElementById('gp-detail-quiz-input');
      const normalise = s => s.toLowerCase().replace(/[.!?,;]$/, '').trim();
      const exp = document.getElementById('gp-detail-explanation');
      exp.className = 'gp-quiz-explanation visible';
      if (normalise(input.value) === normalise(g.quiz.answer)) {
        input.className = 'gp-quiz-input gp-correct';
        input.disabled = true;
        exp.innerHTML = '<strong>Correct!</strong> <em>' + g.quiz.answer + '</em><br>' + g.nuance_delta;
        awardPoints(POINTS_WIN);
      } else {
        input.className = 'gp-quiz-input gp-wrong';
        exp.innerHTML = 'Not quite. Try again or reveal the answer.';
        awardPoints(POINTS_WRONG_PENALTY);
      }
    }

    function gpDetailHint(id, idx) {
      const g = grammarData.find(x => x.id === id);
      const hints = (g && g.quiz && g.quiz.hints) ? g.quiz.hints : [];
      const container = document.getElementById('gp-detail-quiz-hints');
      container.innerHTML = '';
      for (let i = 0; i <= Math.min(idx, hints.length - 1); i++) {
        const chip = document.createElement('span');
        chip.className = 'gp-hint-chip';
        chip.innerHTML = '<img src="../assets/icons/lightbulb.svg" class="btn-icon" alt="" /> ' + hints[i];
        container.appendChild(chip);
      }
      awardPoints(POINTS_CLUE_PENALTY);
    }

    function gpDetailReveal(id) {
      const g = grammarData.find(x => x.id === id);
      if (!g || !g.quiz) return;
      const input = document.getElementById('gp-detail-quiz-input');
      input.value = g.quiz.answer;
      input.className = 'gp-quiz-input gp-correct';
      input.disabled = true;
      const exp = document.getElementById('gp-detail-explanation');
      exp.className = 'gp-quiz-explanation visible';
      exp.innerHTML = '<strong>Answer:</strong> <em>' + g.quiz.answer + '</em><br>' + (g.common_mistake || g.nuance_delta);
      awardPoints(POINTS_LOSE);
    }
    // ================================================================
    // DICTATION GAME
    // ================================================================

    let dictSelectedId = null;   // currently selected text id
    let dictDifficulty = 'easy'; // 'easy' | 'medium' | 'hard'
    let dictHiddenWords = [];     // array of { index, word, clean } for each hidden slot
    let dictChecked = false;      // whether Check All has been pressed
    let dictLastFocusedInput = null;

    function _dictGetActiveEntry() {
      const bank = (typeof dictationBank !== 'undefined') ? dictationBank : [];
      return bank.find(t => t.id === dictSelectedId) || null;
    }

    function _dictGetRate() {
      const sel = document.getElementById('dict-tts-rate');
      return sel ? (parseFloat(sel.value) || 0.9) : 0.9;
    }

    function dictSpeakFullText() {
      const entry = _dictGetActiveEntry();
      if (!entry || !entry.text) return;
      if (typeof window.speechSynthesis !== 'undefined' && window.speechSynthesis.speaking) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          return;
        }
        window.speechSynthesis.pause();
        return;
      }
      ltSpeakWord(entry.text, _dictGetRate());
    }

    function dictSpeakCurrentSentence() {
      const entry = _dictGetActiveEntry();
      if (!entry || !entry.text) return;
      const sentences = entry.text.match(/[^.!?]+[.!?]*/g) || [entry.text];
      const activeInput = dictLastFocusedInput
        || document.querySelector('.dict-input:focus')
        || Array.from(document.querySelectorAll('.dict-input')).find(inp => !inp.value.trim())
        || document.querySelector('.dict-input');
      if (!activeInput) {
        ltSpeakWord(sentences[0], _dictGetRate());
        return;
      }
      const allInputs = Array.from(document.querySelectorAll('.dict-input'));
      const ratio = allInputs.length > 0 ? Math.max(0, allInputs.indexOf(activeInput)) / allInputs.length : 0;
      const sentIdx = Math.min(sentences.length - 1, Math.floor(ratio * sentences.length));
      ltSpeakWord(sentences[sentIdx] || entry.text, _dictGetRate());
    }

    function dictStopSpeech() {
      if (typeof window.speechSynthesis !== 'undefined') {
        try { window.speechSynthesis.cancel(); } catch (e) { }
      }
    }

    function dictRenderPresenterPreview() {
      const section = document.getElementById('dictation-section');
      if (!section) return;
      const presenterPreview = ltIsPresenterPreviewActive('dictation-section');
      section.classList.toggle('dict-presenter-preview', presenterPreview);
      section.querySelectorAll('.dict-word-hidden').forEach(wrapper => {
        wrapper.classList.toggle('dict-presenter-answer', presenterPreview);
      });
    }

    // Difficulty → hidden word percentage
    const DICT_RATES = { easy: 0.10, medium: 0.50, hard: 0.90 };

    // ---- Initialisation (called when entering the section) ----
    function dictInit() {
      dictStopSpeech();
      document.getElementById('dict-setup-area').style.display = 'block';
      document.getElementById('dict-game-area').style.display = 'none';
      dictRenderSetup();
      dictRenderPresenterPreview();
      renderGameTeamUI();
    }

    // ---- Populate theme filter from dictationBank ----
    function dictPopulateThemeFilter() {
      const sel = document.getElementById('dict-filter-theme');
      if (!sel || sel.options.length > 1) return;
      const themes = [...new Set((dictationBank || []).flatMap(t => getItemThemes(t)))].sort();
      themes.forEach(th => {
        const opt = document.createElement('option');
        opt.value = th; opt.textContent = th;
        sel.appendChild(opt);
      });
    }

    // ---- Render text-selection cards ----
    function dictRenderSetup() {
      const grid = document.getElementById('dict-setup-grid');
      const lvl = document.getElementById('dict-filter-level').value;
      const theme = document.getElementById('dict-filter-theme').value;

      const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      const bank = (typeof dictationBank !== 'undefined') ? dictationBank : [];
      const filtered = bank.filter(t => {
        if (lvl !== 'all' && t.level !== lvl) return false;
        if (theme !== 'all' && !getItemThemes(t).includes(theme)) return false;
        return true;
      }).sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));

      grid.innerHTML = '';
      if (filtered.length === 0) {
        grid.innerHTML = '<p class="dict-no-results">No texts match these filters.</p>';
        return;
      }

      filtered.forEach(t => {
        const card = document.createElement('div');
        card.className = 'dict-text-card' + (dictSelectedId === t.id ? ' selected' : '');
        card.innerHTML = `
          <div class="dict-card-title">${t.title}</div>
          <div class="dict-card-meta">
            <span>${t.level}</span>
            <span>${getItemThemes(t).join(', ') || '—'}</span>
          </div>
          <div class="dict-card-preview">${t.text}</div>
        `;
        card.onclick = () => {
          dictSelectedId = t.id;
          document.querySelectorAll('.dict-text-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
        };
        grid.appendChild(card);
      });
    }

    // ---- Difficulty selection ----
    function dictSetDifficulty(diff) {
      dictDifficulty = diff;
      document.querySelectorAll('.dict-diff-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.diff === diff);
      });
    }

    // ---- Start the game ----
    function dictStartGame() {
      const bank = (typeof dictationBank !== 'undefined') ? dictationBank : [];
      if (!dictSelectedId) {
        const lvl = document.getElementById('dict-filter-level').value;
        const theme = document.getElementById('dict-filter-theme').value;
        const filtered = bank.filter(t => {
          if (lvl !== 'all' && t.level !== lvl) return false;
          if (theme !== 'all' && !getItemThemes(t).includes(theme)) return false;
          return true;
        });
        if (filtered.length === 0) { showToast('Please select a text first.'); return; }
        dictSelectedId = filtered[Math.floor(Math.random() * filtered.length)].id;
      }

      const entry = bank.find(t => t.id === dictSelectedId);
      if (!entry) { showToast('Text not found. Please try again.', true); return; }

      dictChecked = false;
      dictHiddenWords = [];
      dictLastFocusedInput = null;

      document.getElementById('dict-setup-area').style.display = 'none';
      document.getElementById('dict-game-area').style.display = 'block';

      document.getElementById('dict-game-title').textContent = entry.title;
      const badge = document.getElementById('dict-diff-badge');
      const labels = { easy: 'Easy (10%)', medium: 'Medium (50%)', hard: 'Hard (90%)' };
      badge.textContent = labels[dictDifficulty];

      const metaBadges = document.getElementById('dict-meta-badges');
      metaBadges.innerHTML = `
        <span style="font-size:0.68rem;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;background:#f0f0f0;border:1px solid #ccc;border-radius:3px;padding:2px 7px;color:#555;">${entry.level}</span>
        <span style="font-size:0.68rem;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;background:#f0f0f0;border:1px solid #ccc;border-radius:3px;padding:2px 7px;color:#555;">${entry.theme}</span>
      `;

      document.getElementById('dict-stat-correct').textContent = '0';
      document.getElementById('dict-stat-wrong').textContent = '0';
      document.getElementById('dict-stat-pct').textContent = '—';
      document.getElementById('dict-progress-bar').style.width = '0%';
      document.getElementById('dict-result-box').className = 'dict-result-box';

      dictBuildText(entry.text);

      document.getElementById('dict-stat-total').textContent = dictHiddenWords.length;
      renderGameTeamUI();
    }

    // ---- Tokenise and build the interactive text display ----
    function dictBuildText(rawText) {
      const display = document.getElementById('dict-text-display');
      display.innerHTML = '';
      const presenterPreview = ltIsPresenterPreviewActive('dictation-section');

      const tokens = rawText.split(/(\s+|[.,!?;:'"()\-–—…])/);

      const wordTokenIndices = [];
      tokens.forEach((tok, i) => {
        if (/^[a-zA-Z''\u2019]+$/.test(tok)) wordTokenIndices.push(i);
      });

      const rate = DICT_RATES[dictDifficulty];
      const toHideCount = Math.max(1, Math.round(wordTokenIndices.length * rate));

      const step = wordTokenIndices.length / toHideCount;
      const hiddenTokenIndices = new Set();
      for (let i = 0; i < toHideCount; i++) {
        const idx = Math.min(
          Math.floor(i * step + step * 0.5 + (Math.random() - 0.5) * step * 0.4),
          wordTokenIndices.length - 1
        );
        hiddenTokenIndices.add(wordTokenIndices[Math.max(0, idx)]);
      }

      let hiddenCounter = 0;

      tokens.forEach((tok, i) => {
        if (tok === '' || tok === undefined) return;

        if (wordTokenIndices.includes(i) && hiddenTokenIndices.has(i)) {
          const cleanWord = tok.replace(/[^a-zA-Z''\u2019]/g, '').toLowerCase();
          const slotIdx = hiddenCounter++;

          dictHiddenWords.push({ slotIdx, word: tok, clean: cleanWord });

          const wrapper = document.createElement('span');
          wrapper.className = 'dict-word-hidden' + (presenterPreview ? ' dict-presenter-answer' : '');

          const ghost = document.createElement('span');
          ghost.className = 'dict-ghost';
          ghost.textContent = tok;
          ghost.setAttribute('aria-hidden', 'true');

          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'dict-input';
          input.dataset.slot = slotIdx;
          input.dataset.answer = cleanWord;
          input.autocomplete = 'off';
          input.autocorrect = 'off';
          input.spellcheck = false;
          const charWidth = Math.max(34, Math.ceil(tok.length * 13) + 12);
          input.style.width = charWidth + 'px';
          input.style.minWidth = charWidth + 'px';
          ghost.style.minWidth = charWidth + 'px';

          input.addEventListener('focus', () => {
            dictLastFocusedInput = input;
          });
          input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const inputs = document.querySelectorAll('.dict-input:not(.dict-revealed)');
              const idx = [...inputs].indexOf(e.target);
              if (idx < inputs.length - 1) inputs[idx + 1].focus();
            }
          });

          wrapper.appendChild(ghost);
          wrapper.appendChild(input);
          display.appendChild(wrapper);

        } else {
          const span = document.createElement('span');
          span.className = 'dict-word-visible';
          span.textContent = tok;
          display.appendChild(span);
        }
      });
    }

    // ---- Check all answers ----
    function dictCheckAll() {
      const wasAlreadyChecked = dictChecked;
      dictChecked = true;
      let correct = 0;
      let wrong = 0;

      document.querySelectorAll('.dict-input').forEach(input => {
        if (input.classList.contains('dict-revealed')) return;
        const userVal = input.value.trim().toLowerCase().replace(/[^a-z'\u2019]/g, '');
        const answer = input.dataset.answer;
        input.classList.remove('dict-correct', 'dict-wrong');
        if (userVal === answer) {
          input.classList.add('dict-correct');
          correct++;
        } else {
          input.classList.add('dict-wrong');
          wrong++;
        }
      });

      const total = dictHiddenWords.length;
      const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

      document.getElementById('dict-stat-correct').textContent = correct;
      document.getElementById('dict-stat-wrong').textContent = wrong;
      document.getElementById('dict-stat-pct').textContent = pct + '%';
      document.getElementById('dict-progress-bar').style.width = pct + '%';

      if (!wasAlreadyChecked && teams.length > 0 && total > 0) {
        const earnedPts = pct >= 50 ? Math.max(5, Math.round((correct / total) * POINTS_WIN)) : POINTS_WRONG_PENALTY;
        awardPoints(earnedPts);
      }

      const resultBox = document.getElementById('dict-result-box');
      if (pct === 100) {
        resultBox.className = 'dict-result-box visible correct';
        resultBox.textContent = t('perfectScore') + ' ' + total + ' ' + t('wordsCorrect');
      } else if (pct >= 60) {
        resultBox.className = 'dict-result-box visible partial';
        resultBox.textContent = t('goodEffort') + ' ' + correct + '/' + total + ' ' + t('correct') + ' (' + pct + t('keepPractising');
      } else {
        resultBox.className = 'dict-result-box visible wrong';
        resultBox.textContent = t('reviewLabel') + ' ' + correct + '/' + total + ' ' + t('correct') + ' (' + pct + t('tryAgainSuffix');
      }
    }

    // ---- Reveal all answers ----
    function dictRevealAll() {
      document.querySelectorAll('.dict-input').forEach(input => {
        if (input.classList.contains('dict-correct')) return;
        input.value = dictHiddenWords.find(w => w.slotIdx == input.dataset.slot)?.word || input.dataset.answer;
        input.classList.remove('dict-wrong');
        input.classList.add('dict-revealed');
        input.disabled = true;
      });
      if (!dictChecked) dictCheckAll();
    }

    // ---- Re-hide all — clear inputs and remove reveal/check styling ----
    function dictRehideAll() {
      document.querySelectorAll('.dict-input').forEach(input => {
        input.value = '';
        input.disabled = false;
        input.classList.remove('dict-correct', 'dict-wrong', 'dict-revealed');
      });
      dictChecked = false;
      document.getElementById('dict-stat-correct').textContent = '0';
      document.getElementById('dict-stat-wrong').textContent = '0';
      document.getElementById('dict-stat-pct').textContent = '—';
      document.getElementById('dict-progress-bar').style.width = '0%';
      document.getElementById('dict-result-box').className = 'dict-result-box';
      const first = document.querySelector('.dict-input');
      if (first) first.focus();
    }

    // ---- Reset — go back to setup ----
    function dictReset() {
      dictStopSpeech();
      dictSelectedId = null;
      dictHiddenWords = [];
      dictChecked = false;
      document.getElementById('dict-game-area').style.display = 'none';
      document.getElementById('dict-setup-area').style.display = 'block';
      document.querySelectorAll('.dict-text-card').forEach(c => c.classList.remove('selected'));
      dictRenderPresenterPreview();
    }

    // ================================================================
    // EXPORT — WORD LIST (CSV + JSON)
    // ================================================================

    function exportTimestamp() {
      const d = new Date();
      return d.getFullYear()
        + '-' + String(d.getMonth() + 1).padStart(2, '0')
        + '-' + String(d.getDate()).padStart(2, '0');
    }

    function exportWordListCSV() {
      const words = getFilteredBank().sort((a, b) => a.word.localeCompare(b.word));
      const rows = [['Word', 'IPA', 'Part of Speech', 'Level', 'Theme', 'French', 'Definition', 'Example Sentence']];
      words.forEach(w => {
        rows.push([
          w.word, w.ipa || '', w.partOfSpeech || '', w.level || '', getItemThemes(w).join(', '),
          w.french || '', _allVals(w.definition).join(' / ').replace(/"/g, '""'), _allVals(w.exampleSentence).join(' / ').replace(/"/g, '""')
        ]);
      });
      const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
      downloadFile(`vocabulary_list_${exportTimestamp()}.csv`, csv, 'text/csv');
    }

    function exportWordListTXT() {
      const words = getFilteredBank().sort((a, b) => a.word.localeCompare(b.word));
      const payload = words.map(w => ({
        word: w.word,
        ipa: w.ipa || '',
        partOfSpeech: w.partOfSpeech || '',
        level: w.level || '',
        theme: getItemThemes(w),
        french: w.french || '',
        definition: _allVals(w.definition),
        exampleSentence: _allVals(w.exampleSentence),
        synonyms: Array.isArray(w.synonyms) ? w.synonyms : [],
        antonyms: Array.isArray(w.antonyms) ? w.antonyms : [],
        otherForms: Array.isArray(w.otherForms) ? w.otherForms : []
      }));
      const ts = exportTimestamp();
      downloadFile(`vocabulary_list_${ts}.json`, JSON.stringify(payload, null, 2), 'application/json');
    }

    async function downloadFile(filename, content, mimeType) {
      if (typeof window.saveExportWithDestination === 'function') {
        const isCsv = String(mimeType || '').includes('csv');
        const textOut = isCsv ? ('\uFEFF' + String(content || '')) : String(content || '');
        await window.saveExportWithDestination({
          defaultFilename: filename,
          subdir: 'exports',
          target: 'user',
          text: textOut,
          mimeType: (mimeType || 'text/plain') + ';charset=utf-8',
          title: 'Export Vocabulary List'
        });
        return;
      }
      const bom = mimeType.includes("csv") ? new Uint8Array([0xEF, 0xBB, 0xBF]) : new Uint8Array();
      const blob = new Blob([bom, content], { type: mimeType + ";charset=utf-8" });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    }

    // ================================================================
    // EXPORT — CONSTELLATION AS PNG
    // ================================================================

    async function conExportPNG() {
      const board = document.getElementById('constellation-board');
      const svg = document.getElementById('constellation-svg');
      const nodes = document.querySelectorAll('.con-node');

      if (nodes.length === 0) { showToast('Add some words to the constellation first!'); return; }

      const bw = board.clientWidth;
      const bh = board.clientHeight;

      const scale = window.devicePixelRatio || 1;
      const canvas = document.createElement('canvas');
      canvas.width = bw * scale;
      canvas.height = bh * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, bw, bh);

      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => { ctx.drawImage(img, 0, 0, bw, bh); URL.revokeObjectURL(svgUrl); resolve(); };
        img.onerror = reject;
        img.src = svgUrl;
      });

      const boardRect = board.getBoundingClientRect();
      nodes.forEach(node => {
        const rect = node.getBoundingClientRect();
        const x = rect.left - boardRect.left;
        const y = rect.top - boardRect.top;
        const w = rect.width;
        const h = rect.height;
        const bgColor = node.style.backgroundColor || '#ffffff';
        const fgColor = node.style.color || '#111111';
        const fontSize = parseInt(node.style.fontSize) || 16;

        ctx.fillStyle = bgColor;
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, w, h, 4);
        } else {
          ctx.rect(x, y, w, h);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = fgColor;
        ctx.font = `700 ${fontSize}px 'Segoe UI', Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.textContent.trim(), x + w / 2, y + h / 2);
      });

      const ts = exportTimestamp();
      const now = new Date();
      const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
      const label = `${ts}  ${timeStr}`;
      ctx.font = '500 12px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillText(label, bw - 8, bh - 6);

      canvas.toBlob(async blob => {
        const filename = `word_constellation_${exportTimestamp()}.png`;
        if (typeof window.saveExportWithDestination === 'function' && blob) {
          await window.saveExportWithDestination({
            defaultFilename: filename,
            subdir: 'exports',
            target: 'user',
            blob: blob,
            mimeType: 'image/png',
            title: 'Export Constellation PNG'
          });
          return;
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      }, 'image/png');
    }

    // ================================================================
    // SYNONYMS & ANTONYMS GAME
    // ================================================================

    let synWordObj = null;
    let synMode = 'mcq';       // 'mcq' | 'type'
    let synRelation = 'synonym';   // 'synonym' | 'antonym' | 'both'
    let synCurrentRel = 'synonym';  // actual relation for the current round
    let synScore = 0;
    let synStreak = 0;
    let synSeen = 0;
    let synAnswered = false;
    let synCorrectAnswers = [];     // the valid correct words for current question
    let synHintUsed = false;

    function synParseField(val) {
      if (!val) return [];
      if (Array.isArray(val)) return val.map(s => s.trim().toLowerCase()).filter(Boolean);
      return String(val).split(/[,;\/]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
    }

    function synGetPool() {
      const bank = getFilteredBank();
      if (synRelation === 'synonym') return bank.filter(w => synParseField(w.synonyms || w.synonym).length > 0);
      if (synRelation === 'antonym') return bank.filter(w => synParseField(w.antonyms || w.antonym).length > 0);
      return bank.filter(w =>
        synParseField(w.synonyms || w.synonym).length > 0 ||
        synParseField(w.antonyms || w.antonym).length > 0
      );
    }

    function synSetMode(mode) {
      synMode = mode;
      document.querySelectorAll('.syn-tab').forEach(t => t.classList.remove('active'));
      document.getElementById(`syn-tab-${mode}`).classList.add('active');
      document.getElementById('syn-mcq-mode').classList.toggle('hidden', mode !== 'mcq');
      document.getElementById('syn-type-mode').classList.toggle('hidden', mode !== 'type');
      initSynGame();
    }

    function synSetRelation(rel) {
      synRelation = rel;
      document.querySelectorAll('.syn-toggle-btn').forEach(b => b.classList.remove('active-syn', 'active-ant'));
      if (rel === 'synonym') document.getElementById('syn-toggle-syn').classList.add('active-syn');
      else if (rel === 'antonym') document.getElementById('syn-toggle-ant').classList.add('active-ant');
      else { document.getElementById('syn-toggle-both').classList.add('active-syn'); }
      initSynGame();
    }

    function synToggleDefClue() {
      if (!synWordObj) return;
      const defEl = document.getElementById('syn-def-clue');
      if (!defEl) return;
      const isHidden = defEl.classList.contains('hidden');
      if (isHidden) {
        defEl.textContent = `${t('defLabel')} ${_firstVal(synWordObj.definition)}`;
        defEl.classList.remove('hidden');
      } else {
        defEl.classList.add('hidden');
      }
    }

    function initSynGame() {
      const pool = synGetPool();
      const result = document.getElementById('syn-result');
      result.className = 'syn-result-box';
      result.textContent = '';
      const defClueEl = document.getElementById('syn-def-clue');
      if (defClueEl) {
        defClueEl.classList.add('hidden');
        defClueEl.textContent = '';
      }

      if (pool.length === 0) {
        document.getElementById('syn-word').textContent = '—';
        document.getElementById('syn-pos').textContent = '';
        document.getElementById('syn-other').textContent = '';
        document.getElementById('syn-challenge-label').textContent = '';
        document.getElementById('syn-choices').innerHTML = '';
        setCurrentGameWord(null);
        return;
      }

      synAnswered = false;
      synHintUsed = false;
      synWordObj = pickUnused(pool);
      setCurrentGameWord(synWordObj);
      synSeen++;

      const hasSyn = synParseField(synWordObj.synonyms || synWordObj.synonym).length > 0;
      const hasAnt = synParseField(synWordObj.antonyms || synWordObj.antonym).length > 0;
      if (synRelation === 'both') {
        if (hasSyn && hasAnt) synCurrentRel = Math.random() < 0.5 ? 'synonym' : 'antonym';
        else synCurrentRel = hasSyn ? 'synonym' : 'antonym';
      } else {
        synCurrentRel = synRelation;
      }

      synCorrectAnswers = synCurrentRel === 'synonym'
        ? synParseField(synWordObj.synonyms || synWordObj.synonym)
        : synParseField(synWordObj.antonyms || synWordObj.antonym);
      trackSeenWord(synWordObj, synCurrentRel === 'antonym' ? 'antonyms' : 'synonyms');

      document.getElementById('syn-score').textContent = synScore;
      document.getElementById('syn-streak').textContent = synStreak;
      document.getElementById('syn-seen').textContent = synSeen;
      document.getElementById('syn-word').textContent = synWordObj.word.toLowerCase();
      document.getElementById('syn-pos').textContent = [synWordObj.partOfSpeech, synWordObj.level].filter(Boolean).join(' · ');
      document.getElementById('syn-other').textContent = synWordObj.otherForms || '';

      const label = document.getElementById('syn-challenge-label');
      if (synCurrentRel === 'synonym') {
        label.textContent = t('findSynonymOf');
        label.className = 'syn-challenge-label mode-synonym';
      } else {
        label.textContent = t('findAntonymOf');
        label.className = 'syn-challenge-label mode-antonym';
      }

      if (synMode === 'mcq') {
        synBuildChoices();
      } else {
        const inp = document.getElementById('syn-type-input');
        inp.value = ''; inp.className = 'syn-type-input'; inp.disabled = false; inp.focus();
        const hintBtn = document.getElementById('syn-hint-btn');
        if (hintBtn) { hintBtn.disabled = false; hintBtn.innerHTML = '<img src="../assets/icons/lightbulb.svg" class="btn-icon" alt="" /> ' + t('btnHintShort'); }
        inp.onkeydown = (e) => { if (e.key === 'Enter') synCheckType(); };
        inp.oninput = () => {
          if (!synAnswered && synCorrectAnswers.includes(inp.value.trim().toLowerCase())) {
            synCheckType();
          }
        };
      }
    }

    function synBuildChoices() {
      const container = document.getElementById('syn-choices');
      container.innerHTML = '';

      const correctWord = synCorrectAnswers[Math.floor(Math.random() * synCorrectAnswers.length)];
      const targetPos = synWordObj.partOfSpeech || '';
      const targetWordLower = synWordObj.word.toLowerCase();

      // Prioritize distractors with the same part of speech
      const candidates = vocabBank.filter(w => {
        const lw = (w.word || '').toLowerCase();
        return lw && lw !== targetWordLower && !synCorrectAnswers.includes(lw);
      });
      const samePos = candidates.filter(w => targetPos && w.partOfSpeech === targetPos).map(w => w.word.toLowerCase());
      const otherPos = candidates.filter(w => !targetPos || w.partOfSpeech !== targetPos).map(w => w.word.toLowerCase());
      const shuffledSame = [...new Set(samePos)].sort(() => Math.random() - 0.5);
      const shuffledOther = [...new Set(otherPos)].sort(() => Math.random() - 0.5);
      const distractors = [...shuffledSame, ...shuffledOther].slice(0, 3);

      const choices = [...distractors, correctWord].sort(() => Math.random() - 0.5);

      choices.forEach(word => {
        const btn = document.createElement('button');
        btn.className = 'syn-choice-btn';
        btn.textContent = word;
        btn.onclick = () => synCheckChoice(btn, word);
        container.appendChild(btn);
      });
    }

    function synCheckChoice(btn, chosen) {
      if (synAnswered) return;
      synAnswered = true;
      const isCorrect = synCorrectAnswers.includes(chosen.toLowerCase());

      document.querySelectorAll('.syn-choice-btn').forEach(b => {
        b.disabled = true;
        if (synCorrectAnswers.includes(b.textContent.toLowerCase())) b.classList.add('syn-correct');
        else if (b === btn && !isCorrect) b.classList.add('syn-wrong');
      });

      synShowResult(isCorrect);
    }

    function synCheckType() {
      if (synAnswered) return;
      const inp = document.getElementById('syn-type-input');
      const val = inp.value.trim().toLowerCase();
      if (!val) return;
      const isCorrect = synCorrectAnswers.includes(val);
      synAnswered = true;
      inp.disabled = true;
      inp.className = 'syn-type-input ' + (isCorrect ? 'syn-inp-correct' : 'syn-inp-wrong');
      synShowResult(isCorrect);
    }

    function synRevealHint() {
      if (synHintUsed || synAnswered) return;
      synHintUsed = true;
      awardPoints(POINTS_CLUE_PENALTY);
      const btn = document.getElementById('syn-hint-btn');
      if (btn) { btn.disabled = true; btn.textContent = t('hintShown'); }
      const ans = synCorrectAnswers[0] || '?';
      const hint = ans[0].toUpperCase() + '_'.repeat(ans.length - 1) + ` (${ans.length} letters)`;
      const result = document.getElementById('syn-result');
      result.textContent = `${t('hintLabel')} ${hint}`;
      result.className = 'syn-result-box show syn-res-correct';
    }

    function synRevealAnswer() {
      if (synAnswered) return;
      synAnswered = true;
      awardPoints(POINTS_LOSE);
      synStreak = 0;
      if (synMode === 'type') {
        const inp = document.getElementById('syn-type-input');
        inp.value = synCorrectAnswers[0] || '';
        inp.disabled = true;
        inp.className = 'syn-type-input syn-inp-wrong';
      } else {
        document.querySelectorAll('.syn-choice-btn').forEach(b => {
          b.disabled = true;
          if (synCorrectAnswers.includes(b.textContent.toLowerCase())) b.classList.add('syn-correct');
        });
      }
      document.getElementById('syn-streak').textContent = synStreak;
      const result = document.getElementById('syn-result');
      result.innerHTML = `${synCurrentRel === 'synonym' ? t('synonymLabel') : t('antonymLabel')}(s): <strong>${synCorrectAnswers.join(', ')}</strong>`;
      result.className = 'syn-result-box show syn-res-wrong';
      showFailure(`${t('answerLabel')} ${synCorrectAnswers.join(' / ')}`, () => { nextTeamTurn(); });
    }

    function synShowResult(correct) {
      const result = document.getElementById('syn-result');
      if (correct) {
        synScore += POINTS_WIN;
        synStreak++;
        awardPoints(POINTS_WIN);
        result.innerHTML = `${t('excellent')} ${synCurrentRel === 'synonym' ? t('synonymLabel') : t('antonymLabel')}(s): <strong>${synCorrectAnswers.join(', ')}</strong>`;
        result.className = 'syn-result-box show syn-res-correct';
        document.getElementById('syn-score').textContent = synScore;
        document.getElementById('syn-streak').textContent = synStreak;
        showSuccess(() => { nextTeamTurn(); initSynGame(); });
      } else {
        synStreak = 0;
        awardPoints(POINTS_WRONG_PENALTY);
        result.innerHTML = `${t('answerLabel')} <strong>${synCorrectAnswers.join(', ')}</strong>`;
        result.className = 'syn-result-box show syn-res-wrong';
        document.getElementById('syn-streak').textContent = synStreak;
        showFailure(`${synCurrentRel === 'synonym' ? t('synonymLabel') : t('antonymLabel')}: ${synCorrectAnswers.join(' / ')}`, () => { nextTeamTurn(); });
      }
    }

    // ================================================================
    // END SYNONYMS & ANTONYMS GAME
    // ================================================================

    // ================================================================
    // TIMER SYSTEM
    // ================================================================
    const timerCfg = { grace: 1, points: 5, interval: 10 };
    let timerState = {
      running: false,
      paused: false,
      elapsed: 0,       // seconds since timer started
      tickId: null,     // setInterval id for the 1s tick
      deductId: null,   // setInterval id for point deductions
      graceId: null,    // setTimeout id for the grace period
    };

    function timerOpenSettings() {
      // Pre-fill with current config
      document.getElementById('timer-grace').value = timerCfg.grace;
      document.getElementById('timer-points').value = timerCfg.points;
      document.getElementById('timer-interval').value = timerCfg.interval;
      document.getElementById('timer-settings-overlay').classList.add('active');
    }

    function timerCloseSettings() {
      document.getElementById('timer-settings-overlay').classList.remove('active');
    }

    function timerSaveAndStart() {
      const grace = parseInt(document.getElementById('timer-grace').value) || 1;
      const points = parseInt(document.getElementById('timer-points').value) || 5;
      const interval = parseInt(document.getElementById('timer-interval').value) || 10;
      timerCfg.grace = Math.max(0, grace);
      timerCfg.points = Math.max(1, points);
      timerCfg.interval = Math.max(5, interval);
      timerCloseSettings();
      timerStop();   // stop any existing timer
      timerStart();
    }

    function timerStart() {
      timerState.running = true;
      timerState.paused = false;
      timerState.elapsed = 0;
      timerUpdateUI();

      // Show UI elements
      document.getElementById('timer-bar-container').classList.add('visible');
      document.getElementById('timer-display').classList.add('visible');

      // 1-second tick for display updates
      timerState.tickId = setInterval(() => {
        timerState.elapsed++;
        timerUpdateUI();
      }, 1000);

      // Point deduction: starts after grace period
      if (timerCfg.grace > 0) {
        timerState.graceId = setTimeout(() => {
          timerState.graceId = null;
          if (!timerState.running) return;
          timerStartDeductions();
        }, timerCfg.grace * 1000);
      } else {
        timerStartDeductions();
      }

      timerUpdateButtons();
    }

    function timerStartDeductions() {
      timerState.deductId = setInterval(() => {
        if (!timerState.running) return;
        if (teams.length > 0) {
          awardPoints(-timerCfg.points);
        } else {
          // No teams — just show a toast-like notification
          timerShowPenaltyToast();
        }
      }, timerCfg.interval * 1000);
    }

    function timerShowPenaltyToast() {
      const toast = document.createElement('div');
      toast.style.cssText = `position:fixed;top:20px;right:20px;z-index:9999;padding:12px 22px;border-radius:10px;font-size:1.2rem;font-weight:bold;color:white;background:#c85a00;box-shadow:0 4px 15px rgba(0,0,0,0.3);animation:fadeIn 0.3s;`;
      toast.textContent = `⏱ -${timerCfg.points} pts (time!)`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    }

    function timerStop() {
      timerState.running = false;
      clearInterval(timerState.tickId);
      clearInterval(timerState.deductId);
      clearTimeout(timerState.graceId);
      timerState.tickId = null;
      timerState.deductId = null;
      timerState.graceId = null;
      timerState.paused = false;
      document.getElementById('timer-bar-container').classList.remove('visible');
      const disp = document.getElementById('timer-display');
      disp.classList.remove('visible', 'warning', 'danger');
      timerUpdateButtons();
    }

    function timerReset() {
      if (!timerState.running) return;
      // Cancel all pending timers
      clearInterval(timerState.tickId);
      clearInterval(timerState.deductId);
      clearTimeout(timerState.graceId);
      timerState.deductId = null;
      timerState.graceId = null;
      // Restart elapsed and ticking
      timerState.elapsed = 0;
      timerUpdateUI();
      timerState.tickId = setInterval(() => {
        timerState.elapsed++;
        timerUpdateUI();
      }, 1000);
      // Restart deductions after grace period
      if (timerCfg.grace > 0) {
        timerState.graceId = setTimeout(() => {
          timerState.graceId = null;
          if (!timerState.running) return;
          timerStartDeductions();
        }, timerCfg.grace * 1000);
      } else {
        timerStartDeductions();
      }
    }

    function timerPause() {
      if (!timerState.running || timerState.paused) return;
      timerState.paused = true;
      clearInterval(timerState.tickId);
      clearInterval(timerState.deductId);
      clearTimeout(timerState.graceId);
      timerState.tickId = null;
      timerState.deductId = null;
      timerState.graceId = null;
      // Freeze the bar visually: snap to current rendered width, no transition
      const bar = document.getElementById('timer-bar');
      if (bar) {
        const currentWidth = bar.getBoundingClientRect().width;
        const containerWidth = bar.parentElement ? bar.parentElement.getBoundingClientRect().width : 0;
        const frozenPct = containerWidth > 0 ? (currentWidth / containerWidth) * 100 : parseFloat(bar.style.width) || 100;
        bar.style.transition = 'none';
        bar.style.width = frozenPct + '%';
      }
    }

    function timerResume() {
      if (!timerState.running || !timerState.paused) return;
      timerState.paused = false;
      // Restore smooth transition
      const bar = document.getElementById('timer-bar');
      if (bar) bar.style.transition = '';
      timerState.tickId = setInterval(() => {
        timerState.elapsed++;
        timerUpdateUI();
      }, 1000);
      const remainingGrace = timerCfg.grace - timerState.elapsed;
      if (remainingGrace > 0) {
        timerState.graceId = setTimeout(() => {
          timerState.graceId = null;
          if (!timerState.running || timerState.paused) return;
          timerStartDeductions();
        }, remainingGrace * 1000);
      } else {
        timerStartDeductions();
      }
    }

    function timerUpdateUI() {
      const elapsed = timerState.elapsed;
      const grace = timerCfg.grace;
      const interval = timerCfg.interval;
      const inGrace = elapsed < grace;

      // --- Progress bar ---
      // During grace: bar depletes from 100% → 0% over grace seconds
      // After grace: bar cycles from 100% → 0% every interval seconds
      let pct;
      if (grace > 0 && inGrace) {
        pct = ((grace - elapsed) / grace) * 100;
      } else if (interval > 0) {
        const afterGrace = elapsed - grace;
        pct = 100 - ((afterGrace % interval) / interval) * 100;
      } else {
        pct = 100;
      }

      const bar = document.getElementById('timer-bar');
      bar.style.width = pct + '%';
      const isWarning = pct < 40;
      const isDanger = pct < 20;
      bar.classList.toggle('warning', isWarning && !isDanger);
      bar.classList.toggle('danger', isDanger);

      // --- Floating timer display ---
      const disp = document.getElementById('timer-display');
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      disp.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
      disp.classList.toggle('warning', isWarning && !isDanger);
      disp.classList.toggle('danger', isDanger);

      // Update all visible timer buttons
      timerUpdateButtons();
    }

    function timerUpdateButtons() {
      document.querySelectorAll('.timer-btn').forEach(btn => {
        btn.classList.remove('timer-running', 'timer-warning');
        if (timerState.running) {
          const elapsed = timerState.elapsed;
          const grace = timerCfg.grace;
          const interval = timerCfg.interval;
          const inGrace = elapsed < grace;
          let pct;
          if (grace > 0 && inGrace) {
            pct = ((grace - elapsed) / grace) * 100;
          } else if (interval > 0) {
            const afterGrace = elapsed - grace;
            pct = 100 - ((afterGrace % interval) / interval) * 100;
          } else { pct = 100; }
          btn.classList.add(pct < 30 ? 'timer-warning' : 'timer-running');
          btn.textContent = `⏱ ${Math.floor(timerState.elapsed / 60)}:${(timerState.elapsed % 60).toString().padStart(2, '0')}`;
        } else {
          btn.textContent = '⏱ Timer';
        }
      });
    }

    // Stop timer when navigating back to main menu
    const _navToOrig = navTo;
    navTo = function (sectionId) {
      if (sectionId === 'main-menu' && timerState.running) {
        timerStop();
      }
      _navToOrig(sectionId);
    };

    // ================================================================
    // END TIMER SYSTEM
    // ================================================================

