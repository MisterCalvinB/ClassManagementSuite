/**
 * Board IPA (International Phonetic Alphabet) Keyboard Module
 * Class Management Tools - Board
 * 
 * Provides an interactive, draggable phonetic keyboard for inserting IPA symbols
 * into notes, nodes, text fields, or creating new nodes and notes on the board.
 */

(function (window, document) {
  'use strict';

  const IPA_PREFS_KEY = 'board-ipa-keyboard-prefs-v1';

  // --- IPA Datasets & Categorization ---
  const IPA_DATA = {
    vowels_short: [
      { char: 'ɪ', desc: 'near-close near-front (bit)' },
      { char: 'e', desc: 'close-mid front (bed)' },
      { char: 'æ', desc: 'near-open front (cat)' },
      { char: 'ʌ', desc: 'open-mid back unrounded (cup)' },
      { char: 'ɒ', desc: 'open back rounded (lot)' },
      { char: 'ʊ', desc: 'near-close near-back (foot)' },
      { char: 'ə', desc: 'schwa (about)' },
      { char: 'i', desc: 'close front unrounded (happy)' },
      { char: 'u', desc: 'close back rounded (influence)' },
      { char: 'ɛ', desc: 'open-mid front unrounded (dress)' },
      { char: 'ɔ', desc: 'open-mid back rounded (thought)' },
      { char: 'a', desc: 'open front unrounded' },
      { char: 'ɑ', desc: 'open back unrounded (spa)' },
      { char: 'y', desc: 'close front rounded (tu)' },
      { char: 'ø', desc: 'close-mid front rounded (peu)' },
      { char: 'œ', desc: 'open-mid front rounded (peur)' },
      { char: 'ɐ', desc: 'near-open central (wasser)' },
      { char: 'ɘ', desc: 'close-mid central unrounded' },
      { char: 'ɵ', desc: 'close-mid central rounded' },
      { char: 'ɤ', desc: 'close-mid back unrounded' },
      { char: 'ɯ', desc: 'close back unrounded' }
    ],
    vowels_long: [
      { char: 'iː', desc: 'long close front (see)' },
      { char: 'ɜː', desc: 'long open-mid central (nurse)' },
      { char: 'ɑː', desc: 'long open back (father)' },
      { char: 'ɔː', desc: 'long open-mid back (saw)' },
      { char: 'uː', desc: 'long close back (too)' },
      { char: 'eː', desc: 'long close-mid front (see/de)' },
      { char: 'oː', desc: 'long close-mid back (boot/de)' },
      { char: 'yː', desc: 'long close front rounded (über)' },
      { char: 'øː', desc: 'long close-mid front rounded (schön)' },
      { char: 'aː', desc: 'long open front/central (tag)' },
      { char: 'ɛː', desc: 'long open-mid front (bête)' }
    ],
    diphthongs: [
      { char: 'eɪ', desc: 'face' },
      { char: 'aɪ', desc: 'price' },
      { char: 'ɔɪ', desc: 'choice' },
      { char: 'aʊ', desc: 'mouth' },
      { char: 'əʊ', desc: 'goat (RP)' },
      { char: 'oʊ', desc: 'goat (GenAm)' },
      { char: 'ɪə', desc: 'near' },
      { char: 'eə', desc: 'square' },
      { char: 'ʊə', desc: 'cure' },
      { char: 'juː', desc: 'music' },
      { char: 'aɪə', desc: 'fire' },
      { char: 'aʊə', desc: 'hour' }
    ],
    vowels_nasal: [
      { char: 'ɑ̃', desc: 'nasalized open back (en/an - fr)' },
      { char: 'ɛ̃', desc: 'nasalized open-mid front (in/un - fr)' },
      { char: 'ɔ̃', desc: 'nasalized open-mid back (on - fr)' },
      { char: 'œ̃', desc: 'nasalized open-mid front rounded (un - fr)' },
      { char: 'ã', desc: 'nasalized open central' },
      { char: 'õ', desc: 'nasalized close-mid back' }
    ],
    consonants_plosives: [
      { char: 'p', desc: 'voiceless bilabial plosive (pen)' },
      { char: 'b', desc: 'voiced bilabial plosive (bag)' },
      { char: 't', desc: 'voiceless alveolar plosive (tea)' },
      { char: 'd', desc: 'voiced alveolar plosive (dog)' },
      { char: 'k', desc: 'voiceless velar plosive (cat)' },
      { char: 'ɡ', desc: 'voiced velar plosive (get)' },
      { char: 'ʔ', desc: 'glottal stop (uh-oh)' },
      { char: 'c', desc: 'voiceless palatal plosive' },
      { char: 'ɟ', desc: 'voiced palatal plosive' },
      { char: 'q', desc: 'voiceless uvular plosive' },
      { char: 'ɢ', desc: 'voiced uvular plosive' }
    ],
    consonants_fricatives: [
      { char: 'f', desc: 'voiceless labiodental fricative (fall)' },
      { char: 'v', desc: 'voiced labiodental fricative (voice)' },
      { char: 'θ', desc: 'voiceless dental fricative (think)' },
      { char: 'ð', desc: 'voiced dental fricative (this)' },
      { char: 's', desc: 'voiceless alveolar fricative (sun)' },
      { char: 'z', desc: 'voiced alveolar fricative (zoo)' },
      { char: 'ʃ', desc: 'voiceless postalveolar fricative (she)' },
      { char: 'ʒ', desc: 'voiced postalveolar fricative (vision)' },
      { char: 'h', desc: 'voiceless glottal fricative (hat)' },
      { char: 'ç', desc: 'voiceless palatal fricative (ich - de)' },
      { char: 'x', desc: 'voiceless velar fricative (loch/ach)' },
      { char: 'ɣ', desc: 'voiced velar fricative' },
      { char: 'ʁ', desc: 'voiced uvular fricative (rouge - fr)' },
      { char: 'χ', desc: 'voiceless uvular fricative' },
      { char: 'ɬ', desc: 'voiceless alveolar lateral fricative' },
      { char: 'ɮ', desc: 'voiced alveolar lateral fricative' },
      { char: 'ɸ', desc: 'voiceless bilabial fricative' },
      { char: 'β', desc: 'voiced bilabial fricative (haber - es)' }
    ],
    consonants_affricates: [
      { char: 'tʃ', desc: 'voiceless postalveolar affricate (chair)' },
      { char: 'dʒ', desc: 'voiced postalveolar affricate (jump)' },
      { char: 'ts', desc: 'voiceless alveolar affricate (zeit)' },
      { char: 'dz', desc: 'voiced alveolar affricate (zero - it)' },
      { char: 'pf', desc: 'voiceless labiodental affricate (pferd - de)' },
      { char: 'tɕ', desc: 'voiceless alveolo-palatal affricate' },
      { char: 'dʑ', desc: 'voiced alveolo-palatal affricate' }
    ],
    consonants_nasals: [
      { char: 'm', desc: 'bilabial nasal (man)' },
      { char: 'n', desc: 'alveolar nasal (no)' },
      { char: 'ŋ', desc: 'velar nasal (sing)' },
      { char: 'ɲ', desc: 'palatal nasal (gnon/año)' },
      { char: 'ɳ', desc: 'retroflex nasal' },
      { char: 'ɴ', desc: 'uvular nasal' },
      { char: 'ɱ', desc: 'labiodental nasal (symphony)' }
    ],
    consonants_approximants: [
      { char: 'l', desc: 'alveolar lateral approximant (light)' },
      { char: 'r', desc: 'alveolar trill (perro - es)' },
      { char: 'ɹ', desc: 'alveolar approximant (red - en)' },
      { char: 'j', desc: 'palatal approximant (yes)' },
      { char: 'w', desc: 'voiced labio-velar approximant (wet)' },
      { char: 'ʍ', desc: 'voiceless labio-velar fricative (which)' },
      { char: 'ɾ', desc: 'alveolar tap/flap (butter - us)' },
      { char: 'ʎ', desc: 'palatal lateral approximant (gli - it)' },
      { char: 'ɥ', desc: 'labial-palatal approximant (huit - fr)' },
      { char: 'ʋ', desc: 'labiodental approximant' },
      { char: 'ʀ', desc: 'uvular trill' }
    ],
    stress_suprasegmentals: [
      { char: 'ˈ', desc: 'primary stress' },
      { char: 'ˌ', desc: 'secondary stress' },
      { char: 'ː', desc: 'length mark' },
      { char: 'ˑ', desc: 'half-long' },
      { char: '.', desc: 'syllable break' },
      { char: '‿', desc: 'linking tie (liaison)' },
      { char: '|', desc: 'minor intonation group' },
      { char: '‖', desc: 'major intonation group' },
      { char: '↗', desc: 'rising pitch' },
      { char: '↘', desc: 'falling pitch' }
    ],
    diacritics: [
      { char: '̃', desc: 'combining nasalized' },
      { char: '̥', desc: 'combining voiceless' },
      { char: '̬', desc: 'combining voiced' },
      { char: 'ʰ', desc: 'aspirated' },
      { char: 'ʲ', desc: 'palatalized' },
      { char: 'ʷ', desc: 'labialized' },
      { char: 'ˤ', desc: 'pharyngealized' },
      { char: 'ʼ', desc: 'ejective' },
      { char: '̩', desc: 'combining syllabic' },
      { char: '̚', desc: 'no audible release' },
      { char: '̝', desc: 'combining raised' },
      { char: '̞', desc: 'combining lowered' },
      { char: '/', desc: 'phonemic slash' },
      { char: '[', desc: 'phonetic bracket open' },
      { char: ']', desc: 'phonetic bracket close' },
      { char: '(', desc: 'parenthesis open' },
      { char: ')', desc: 'parenthesis close' }
    ]
  };

  // Language specific curated subsets
  const LANG_SETS = {
    english: [
      { title: 'Vowels', keys: ['iː', 'ɪ', 'e', 'æ', 'ɑː', 'ɒ', 'ɔː', 'ʊ', 'uː', 'ʌ', 'ɜː', 'ə', 'eɪ', 'aɪ', 'ɔɪ', 'aʊ', 'əʊ', 'oʊ', 'ɪə', 'eə', 'ʊə', 'juː'] },
      { title: 'Consonants', keys: ['p', 'b', 't', 'd', 'k', 'ɡ', 'tʃ', 'dʒ', 'f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'h', 'm', 'n', 'ŋ', 'l', 'r', 'ɹ', 'w', 'j', 'ʔ'] },
      { title: 'Stress & Symbols', keys: ['ˈ', 'ˌ', 'ː', '.', '/', '[', ']'] }
    ],
    french: [
      { title: 'Voyelles', keys: ['i', 'e', 'ɛ', 'a', 'ɑ', 'ɔ', 'o', 'u', 'y', 'ø', 'œ', 'ə', 'ɑ̃', 'ɛ̃', 'ɔ̃', 'œ̃'] },
      { title: 'Consonnes', keys: ['p', 'b', 't', 'd', 'k', 'ɡ', 'f', 'v', 's', 'z', 'ʃ', 'ʒ', 'm', 'n', 'ɲ', 'ŋ', 'l', 'ʁ', 'j', 'w', 'ɥ'] },
      { title: 'Symboles', keys: ['‿', 'ː', '/', '[', ']'] }
    ],
    german: [
      { title: 'Vokale', keys: ['a', 'aː', 'ɛ', 'eː', 'ɪ', 'iː', 'ɔ', 'oː', 'ʊ', 'uː', 'œ', 'øː', 'ʏ', 'yː', 'ə', 'ɐ', 'aɪ', 'aʊ', 'ɔʏ'] },
      { title: 'Konsonanten', keys: ['p', 'b', 't', 'd', 'k', 'ɡ', 'pf', 'ts', 'tʃ', 'dʒ', 'f', 'v', 's', 'z', 'ʃ', 'ʒ', 'ç', 'x', 'h', 'm', 'n', 'ŋ', 'l', 'r', 'ʁ', 'j', 'ʔ'] },
      { title: 'Betonung', keys: ['ˈ', 'ˌ', 'ː', '/', '[', ']'] }
    ],
    italian: [
      { title: 'Vocali', keys: ['a', 'e', 'ɛ', 'i', 'o', 'ɔ', 'u'] },
      { title: 'Consonanti', keys: ['p', 'b', 't', 'd', 'k', 'ɡ', 'ts', 'dz', 'tʃ', 'dʒ', 'f', 'v', 's', 'z', 'ʃ', 'm', 'n', 'ɲ', 'ŋ', 'l', 'ʎ', 'r', 'j', 'w'] },
      { title: 'Simboli', keys: ['ˈ', 'ː', '/', '[', ']'] }
    ]
  };

  // State
  let ipaState = {
    visible: false,
    collapsed: false,
    activeTab: 'all',
    directInsert: true,
    buffer: '',
    x: 24,
    y: 24
  };

  // Tracking last active editable target / caret position
  let lastActiveTarget = {
    element: null,
    range: null,
    selectionStart: 0,
    selectionEnd: 0,
    isContentEditable: false,
    type: null // 'note-editor' | 'input' | 'node-selected' | 'note-selected' | null
  };

  // Helper: translation
  function t(key, fallback) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      const val = window.i18n.t(key);
      if (val && val !== key) return val;
    }
    return fallback || key;
  }

  // Helper: toast message
  function notify(msg, isError) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, isError);
    } else if (typeof window.mdbToast === 'function') {
      window.mdbToast(msg);
    }
  }

  // Load preferences from localStorage
  function loadPrefs() {
    try {
      const raw = localStorage.getItem(IPA_PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      if (typeof parsed.collapsed === 'boolean') ipaState.collapsed = parsed.collapsed;
      if (typeof parsed.directInsert === 'boolean') ipaState.directInsert = parsed.directInsert;
      if (typeof parsed.activeTab === 'string') ipaState.activeTab = parsed.activeTab;
      if (typeof parsed.x === 'number') ipaState.x = parsed.x;
      if (typeof parsed.y === 'number') ipaState.y = parsed.y;
    } catch (_) { }
  }

  // Save preferences to localStorage
  function savePrefs() {
    try {
      localStorage.setItem(IPA_PREFS_KEY, JSON.stringify({
        collapsed: ipaState.collapsed,
        directInsert: ipaState.directInsert,
        activeTab: ipaState.activeTab,
        x: ipaState.x,
        y: ipaState.y
      }));
    } catch (_) { }
  }

  // Track focused target across the page
  function updateActiveTarget(ev) {
    const el = document.activeElement;
    if (!el || el === document.body) {
      // Check if a note or node is currently selected
      if (typeof window.conSelected !== 'undefined' && window.conSelected) {
        lastActiveTarget = { element: null, range: null, type: 'node-selected', id: window.conSelected };
        updateTargetHint();
      } else if (typeof window._wnActiveNote !== 'undefined' && window._wnActiveNote) {
        lastActiveTarget = { element: null, range: null, type: 'note-selected', note: window._wnActiveNote };
        updateTargetHint();
      }
      return;
    }

    // Ignore clicks inside the IPA panel itself
    if (el.closest && el.closest('#board-ipa-keyboard-panel')) {
      return;
    }

    if (el.classList && el.classList.contains('wn-note-editor') || (el.closest && el.closest('.wn-note-editor'))) {
      const editorEl = el.classList.contains('wn-note-editor') ? el : el.closest('.wn-note-editor');
      const sel = window.getSelection();
      let range = null;
      if (sel && sel.rangeCount > 0) {
        range = sel.getRangeAt(0).cloneRange();
      }
      lastActiveTarget = {
        element: editorEl,
        range: range,
        isContentEditable: true,
        type: 'note-editor'
      };
      updateTargetHint();
      return;
    }

    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      lastActiveTarget = {
        element: el,
        selectionStart: el.selectionStart || 0,
        selectionEnd: el.selectionEnd || 0,
        isContentEditable: false,
        type: 'input'
      };
      updateTargetHint();
      return;
    }

    if (el.isContentEditable) {
      const sel = window.getSelection();
      let range = null;
      if (sel && sel.rangeCount > 0) {
        range = sel.getRangeAt(0).cloneRange();
      }
      lastActiveTarget = {
        element: el,
        range: range,
        isContentEditable: true,
        type: 'contenteditable'
      };
      updateTargetHint();
    }
  }

  // Update target hint in panel status
  function updateTargetHint() {
    const hintEl = document.getElementById('board-ipa-target-hint');
    if (!hintEl) return;
    if (lastActiveTarget.type === 'note-editor') {
      hintEl.textContent = '🎯 ' + t('ipaTargetActiveNote', 'Active Note');
      hintEl.title = t('ipaTargetActiveNoteHint', 'Inserting into focused Note');
    } else if (lastActiveTarget.type === 'input') {
      const name = lastActiveTarget.element.placeholder || lastActiveTarget.element.id || 'Input';
      hintEl.textContent = '🎯 ' + name;
      hintEl.title = t('ipaTargetActiveInputHint', 'Inserting into focused text input');
    } else if (lastActiveTarget.type === 'node-selected') {
      hintEl.textContent = '🎯 ' + t('ipaTargetSelectedNode', 'Selected Node');
      hintEl.title = t('ipaTargetSelectedNodeHint', 'Targeting selected word node');
    } else if (lastActiveTarget.type === 'note-selected') {
      hintEl.textContent = '🎯 ' + t('ipaTargetSelectedNote', 'Selected Note');
      hintEl.title = t('ipaTargetSelectedNoteHint', 'Targeting selected sticky note');
    } else {
      hintEl.textContent = '📋 ' + t('ipaTargetBufferOnly', 'Buffer');
      hintEl.title = t('ipaTargetBufferOnlyHint', 'Keys accumulate in the buffer bar');
    }
  }

  // --- Insertion Logic ---

  // Direct insertion into active caret target
  function insertAtCaret(text) {
    if (!text) return false;

    // 1. ContentEditable (Note editor)
    if (lastActiveTarget.isContentEditable && lastActiveTarget.element) {
      const el = lastActiveTarget.element;
      el.focus();
      if (lastActiveTarget.range) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(lastActiveTarget.range);
      }
      const success = document.execCommand('insertText', false, text);
      if (!success) {
        // Fallback range insertion
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const node = document.createTextNode(text);
          range.insertNode(node);
          range.setStartAfter(node);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          el.textContent += text;
        }
      }
      // Update saved range
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        lastActiveTarget.range = sel.getRangeAt(0).cloneRange();
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
      return true;
    }

    // 2. Input or Textarea
    if (lastActiveTarget.type === 'input' && lastActiveTarget.element) {
      const inp = lastActiveTarget.element;
      inp.focus();
      const val = inp.value || '';
      const start = (typeof inp.selectionStart === 'number') ? inp.selectionStart : val.length;
      const end = (typeof inp.selectionEnd === 'number') ? inp.selectionEnd : val.length;
      inp.value = val.substring(0, start) + text + val.substring(end);
      const newPos = start + text.length;
      inp.setSelectionRange(newPos, newPos);
      lastActiveTarget.selectionStart = newPos;
      lastActiveTarget.selectionEnd = newPos;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    // 3. Selected Node
    if (lastActiveTarget.type === 'node-selected' && lastActiveTarget.id && typeof window.conNodes !== 'undefined') {
      const node = window.conNodes.find(n => n.id === lastActiveTarget.id);
      if (node && node.el) {
        // Append or open edit with symbol
        if (typeof window.conPushUndo === 'function') window.conPushUndo();
        const base = node.baseWord || node.el.textContent.trim();
        node.baseWord = base + text;
        if (typeof window.conRenderNodeLabel === 'function') {
          window.conRenderNodeLabel(node);
        } else {
          node.el.textContent = node.baseWord;
        }
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({ type: 'node-edit', nodeId: String(node.id), text: node.baseWord });
        }
        return true;
      }
    }

    // 4. Selected Note
    if (lastActiveTarget.type === 'note-selected' && lastActiveTarget.note) {
      const noteEl = (typeof window.wnGetNoteElementById === 'function') ? window.wnGetNoteElementById(lastActiveTarget.note.id) : null;
      if (noteEl) {
        const editor = noteEl.querySelector('.wn-note-editor, textarea');
        if (editor) {
          lastActiveTarget = { element: editor, range: null, isContentEditable: true, type: 'note-editor' };
          return insertAtCaret(text);
        }
      }
    }

    return false;
  }

  // Key click handler
  function handleKeyClick(char) {
    if (ipaState.directInsert) {
      const inserted = insertAtCaret(char);
      if (inserted) return;
    }
    // Append to buffer
    const bufferInp = document.getElementById('board-ipa-buffer-input');
    ipaState.buffer = (ipaState.buffer || '') + char;
    if (bufferInp) {
      bufferInp.value = ipaState.buffer;
    }
  }

  // --- Explicit Action Handlers ---

  // 1. Insert in Note
  window.boardIpaInsertInNote = function (text) {
    const str = (typeof text === 'string' && text.length > 0) ? text : (ipaState.buffer || '').trim();
    if (!str) {
      notify(t('ipaEmptyBufferPrompt', 'Please select or type IPA symbols first'), true);
      return;
    }

    // Try inserting into active note editor
    if (lastActiveTarget.type === 'note-editor' && lastActiveTarget.element) {
      insertAtCaret(str);
      notify(t('ipaToastInserted', 'Inserted into active note'));
      return;
    }

    // If a note is selected
    if (typeof window._wnActiveNote !== 'undefined' && window._wnActiveNote) {
      const noteEl = (typeof window.wnGetNoteElementById === 'function') ? window.wnGetNoteElementById(window._wnActiveNote.id) : null;
      if (noteEl) {
        const editor = noteEl.querySelector('.wn-note-editor, textarea');
        if (editor) {
          lastActiveTarget = { element: editor, range: null, isContentEditable: true, type: 'note-editor' };
          insertAtCaret(str);
          notify(t('ipaToastInserted', 'Inserted into selected note'));
          return;
        }
      }
    }

    // Create a new note at center of board
    boardIpaCreateAsNote(str);
  };

  // 2. Insert in Node
  window.boardIpaInsertInNode = function (text) {
    const str = (typeof text === 'string' && text.length > 0) ? text : (ipaState.buffer || '').trim();
    if (!str) {
      notify(t('ipaEmptyBufferPrompt', 'Please select or type IPA symbols first'), true);
      return;
    }

    // If an input is focused (e.g. node inline editor)
    if (lastActiveTarget.type === 'input' && lastActiveTarget.element) {
      insertAtCaret(str);
      notify(t('ipaToastInserted', 'Inserted into active node'));
      return;
    }

    // If a node is selected on the board
    if (typeof window.conSelected !== 'undefined' && window.conSelected && typeof window.conNodes !== 'undefined') {
      const node = window.conNodes.find(n => n.id === window.conSelected);
      if (node && node.el) {
        if (typeof window.conPushUndo === 'function') window.conPushUndo();
        const base = node.baseWord || node.el.textContent.trim();
        node.baseWord = base + (base.endsWith(' ') ? '' : ' ') + str;
        if (typeof window.conRenderNodeLabel === 'function') {
          window.conRenderNodeLabel(node);
        } else {
          node.el.textContent = node.baseWord;
        }
        if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
        if (typeof window._conMirrorSend === 'function') {
          window._conMirrorSend({ type: 'node-edit', nodeId: String(node.id), text: node.baseWord });
        }
        notify(t('ipaToastInserted', 'Inserted into selected node'));
        return;
      }
    }

    // Otherwise create a new node
    boardIpaCreateAsNode(str);
  };

  // 3. Create as Node
  window.boardIpaCreateAsNode = function (text) {
    const str = (typeof text === 'string' && text.length > 0) ? text : (ipaState.buffer || '').trim();
    if (!str) {
      notify(t('ipaEmptyBufferPrompt', 'Please select or type IPA symbols first'), true);
      return;
    }

    if (typeof window.conPushUndo === 'function') window.conPushUndo();

    // Determine placement coordinates
    let x = window._boardCtxNoteX || 120;
    let y = window._boardCtxNoteY || 140;

    // Center in board viewport if no right-click context
    const boardEl = document.getElementById('constellation-board');
    if (boardEl && (!window._boardCtxNoteX || !window._boardCtxNoteY)) {
      const scrollX = window.scrollX || window.pageXOffset || 0;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      x = Math.max(40, Math.round(scrollX + window.innerWidth / 2 - 60 + (Math.random() * 40 - 20)));
      y = Math.max(60, Math.round(scrollY + window.innerHeight / 2 - 30 + (Math.random() * 40 - 20)));
    }

    if (typeof window.conAddWordAt === 'function') {
      const newId = window.conAddWordAt(str, x, y);
      if (typeof window.conSelect === 'function') window.conSelect(newId);
      if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
      notify(t('ipaToastNodeCreated', 'IPA node created on board'));
    }
  };

  // 4. Create as Note
  window.boardIpaCreateAsNote = function (text) {
    const str = (typeof text === 'string' && text.length > 0) ? text : (ipaState.buffer || '').trim();
    if (!str) {
      notify(t('ipaEmptyBufferPrompt', 'Please select or type IPA symbols first'), true);
      return;
    }

    if (typeof window.conPushUndo === 'function') window.conPushUndo();

    let x = window._boardCtxNoteX || 120;
    let y = window._boardCtxNoteY || 140;

    const boardEl = document.getElementById('constellation-board');
    if (boardEl && (!window._boardCtxNoteX || !window._boardCtxNoteY)) {
      const scrollX = window.scrollX || window.pageXOffset || 0;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      x = Math.max(40, Math.round(scrollX + window.innerWidth / 2 - 100 + (Math.random() * 40 - 20)));
      y = Math.max(60, Math.round(scrollY + window.innerHeight / 2 - 60 + (Math.random() * 40 - 20)));
    }

    if (typeof window.conNoteAdd === 'function') {
      window.conNoteAdd(x, y, str);
      if (typeof window.conMarkBoardDirty === 'function') window.conMarkBoardDirty();
      notify(t('ipaToastNoteCreated', 'IPA note created on board'));
    }
  };

  // Buffer formatting operations
  window.boardIpaWrapSlashes = function () {
    let buf = (ipaState.buffer || '').trim();
    if (!buf) buf = ' ';
    if (buf.startsWith('/') && buf.endsWith('/') && buf.length >= 2) {
      buf = buf.substring(1, buf.length - 1).trim();
    } else {
      buf = '/' + buf + '/';
    }
    ipaState.buffer = buf;
    const inp = document.getElementById('board-ipa-buffer-input');
    if (inp) inp.value = buf;
  };

  window.boardIpaWrapBrackets = function () {
    let buf = (ipaState.buffer || '').trim();
    if (!buf) buf = ' ';
    if (buf.startsWith('[') && buf.endsWith(']') && buf.length >= 2) {
      buf = buf.substring(1, buf.length - 1).trim();
    } else {
      buf = '[' + buf + ']';
    }
    ipaState.buffer = buf;
    const inp = document.getElementById('board-ipa-buffer-input');
    if (inp) inp.value = buf;
  };

  window.boardIpaCopyBuffer = function () {
    const buf = (ipaState.buffer || '').trim();
    if (!buf) {
      notify(t('ipaEmptyBufferPrompt', 'Please select or type IPA symbols first'), true);
      return;
    }
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(buf).then(() => {
        notify(t('ipaToastCopied', 'IPA copied to clipboard'));
      }).catch(() => {
        _fallbackCopy(buf);
      });
    } else {
      _fallbackCopy(buf);
    }
  };

  function _fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      notify(t('ipaToastCopied', 'IPA copied to clipboard'));
    } catch (_) { }
    document.body.removeChild(ta);
  }

  window.boardIpaClearBuffer = function () {
    ipaState.buffer = '';
    const inp = document.getElementById('board-ipa-buffer-input');
    if (inp) inp.value = '';
  };

  window.boardIpaBackspaceBuffer = function () {
    if (!ipaState.buffer) return;
    ipaState.buffer = ipaState.buffer.slice(0, -1);
    const inp = document.getElementById('board-ipa-buffer-input');
    if (inp) inp.value = ipaState.buffer;
  };

  window.boardIpaSetDirectInsert = function (enabled) {
    ipaState.directInsert = !!enabled;
    savePrefs();
  };

  window.boardIpaSwitchTab = function (tabId) {
    ipaState.activeTab = tabId;
    renderTabs();
    renderKeysGrid();
    savePrefs();
  };

  // --- UI Rendering ---

  function renderTabs() {
    const tabsBar = document.getElementById('board-ipa-tabs-bar');
    if (!tabsBar) return;
    const tabs = [
      { id: 'all', label: t('ipaTabAll', 'All') },
      { id: 'vowels', label: t('ipaTabVowels', 'Vowels') },
      { id: 'consonants', label: t('ipaTabConsonants', 'Consonants') },
      { id: 'diacritics', label: t('ipaTabDiacritics', 'Diacritics & Stress') },
      { id: 'english', label: t('ipaTabEnglish', 'English') },
      { id: 'french', label: t('ipaTabFrench', 'French') },
      { id: 'german', label: t('ipaTabGerman', 'German') },
      { id: 'italian', label: t('ipaTabItalian', 'Italian') }
    ];

    tabsBar.innerHTML = tabs.map(tb => `
      <button type="button" class="board-ipa-tab ${ipaState.activeTab === tb.id ? 'active' : ''}"
        onmousedown="event.preventDefault()" onclick="boardIpaSwitchTab('${tb.id}')">
        ${tb.label}
      </button>
    `).join('');
  }

  function renderKeysGrid() {
    const container = document.getElementById('board-ipa-grid-container');
    if (!container) return;
    container.innerHTML = '';

    const tab = ipaState.activeTab;

    if (LANG_SETS[tab]) {
      // Language curated set
      LANG_SETS[tab].forEach(group => {
        const sec = document.createElement('div');
        sec.className = 'board-ipa-section';

        const title = document.createElement('div');
        title.className = 'board-ipa-section-title';
        title.textContent = group.title;
        sec.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'board-ipa-keys-grid';

        group.keys.forEach(k => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'board-ipa-key ' + getKeyCategoryClass(k);
          btn.textContent = k;
          btn.title = k;
          btn.onmousedown = (e) => { e.preventDefault(); };
          btn.onclick = () => { handleKeyClick(k); };
          grid.appendChild(btn);
        });

        sec.appendChild(grid);
        container.appendChild(sec);
      });
      return;
    }

    // Category-based views
    if (tab === 'vowels' || tab === 'all') {
      appendSection(container, t('ipaSectionShortVowels', 'Short Vowels'), IPA_DATA.vowels_short, 'key-vowel');
      appendSection(container, t('ipaSectionLongVowels', 'Long Vowels'), IPA_DATA.vowels_long, 'key-vowel');
      appendSection(container, t('ipaSectionDiphthongs', 'Diphthongs & Triphthongs'), IPA_DATA.diphthongs, 'key-vowel');
      appendSection(container, t('ipaSectionNasalVowels', 'Nasal Vowels'), IPA_DATA.vowels_nasal, 'key-vowel');
    }

    if (tab === 'consonants' || tab === 'all') {
      appendSection(container, t('ipaSectionPlosives', 'Plosives & Stops'), IPA_DATA.consonants_plosives, 'key-consonant');
      appendSection(container, t('ipaSectionFricatives', 'Fricatives'), IPA_DATA.consonants_fricatives, 'key-consonant');
      appendSection(container, t('ipaSectionAffricates', 'Affricates'), IPA_DATA.consonants_affricates, 'key-consonant');
      appendSection(container, t('ipaSectionNasals', 'Nasals'), IPA_DATA.consonants_nasals, 'key-consonant');
      appendSection(container, t('ipaSectionApproximants', 'Approximants & Liquids'), IPA_DATA.consonants_approximants, 'key-consonant');
    }

    if (tab === 'diacritics' || tab === 'all') {
      appendSection(container, t('ipaSectionStress', 'Stress, Tone & Suprasegmentals'), IPA_DATA.stress_suprasegmentals, 'key-modifier');
      appendSection(container, t('ipaSectionDiacritics', 'Diacritics & Delimiters'), IPA_DATA.diacritics, 'key-bracket');
    }
  }

  function appendSection(parent, titleText, items, extraClass) {
    if (!items || items.length === 0) return;
    const sec = document.createElement('div');
    sec.className = 'board-ipa-section';

    const title = document.createElement('div');
    title.className = 'board-ipa-section-title';
    title.textContent = titleText;
    sec.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'board-ipa-keys-grid';

    items.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'board-ipa-key ' + (extraClass || '');
      btn.textContent = item.char;
      btn.title = item.char + (item.desc ? ' (' + item.desc + ')' : '');
      btn.onmousedown = (e) => { e.preventDefault(); };
      btn.onclick = () => { handleKeyClick(item.char); };
      grid.appendChild(btn);
    });

    sec.appendChild(grid);
    parent.appendChild(sec);
  }

  function getKeyCategoryClass(char) {
    if (['/', '[', ']', '(', ')'].includes(char)) return 'key-bracket';
    if (['ˈ', 'ˌ', 'ː', '.', '‿', '|', '‖'].includes(char)) return 'key-modifier';
    if (['iː', 'ɪ', 'e', 'æ', 'ɑː', 'ɒ', 'ɔː', 'ʊ', 'uː', 'ʌ', 'ɜː', 'ə', 'eɪ', 'aɪ', 'ɔɪ', 'aʊ', 'əʊ', 'oʊ', 'ɪə', 'eə', 'ʊə', 'juː', 'a', 'y', 'ø', 'œ', 'ɑ̃', 'ɛ̃', 'ɔ̃', 'œ̃'].includes(char)) return 'key-vowel';
    return 'key-consonant';
  }

  // --- Dragging & Repositioning ---

  function clampPosition(x, y) {
    const panel = document.getElementById('board-ipa-keyboard-panel');
    const width = panel ? Math.max(280, panel.offsetWidth) : 440;
    const height = panel ? Math.max(46, panel.offsetHeight) : 460;
    const maxX = Math.max(10, window.innerWidth - width - 10);
    const maxY = Math.max(10, window.innerHeight - height - 10);
    return {
      x: Math.max(10, Math.min(maxX, x)),
      y: Math.max(10, Math.min(maxY, y))
    };
  }

  function applyPlacement() {
    const panel = document.getElementById('board-ipa-keyboard-panel');
    if (!panel) return;
    const clamped = clampPosition(ipaState.x, ipaState.y);
    ipaState.x = clamped.x;
    ipaState.y = clamped.y;
    panel.style.left = ipaState.x + 'px';
    panel.style.top = ipaState.y + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  }

  function initDrag() {
    const handle = document.getElementById('board-ipa-drag-handle');
    const header = document.getElementById('board-ipa-header');
    const panel = document.getElementById('board-ipa-keyboard-panel');
    if (!header || !panel) return;

    function onPointerDown(ev) {
      if (ev.button !== 0) return;
      if (ev.target && ev.target.closest && ev.target.closest('.board-ipa-hdr-btn')) return;

      const startX = ev.clientX;
      const startY = ev.clientY;
      const rect = panel.getBoundingClientRect();
      const baseX = rect.left;
      const baseY = rect.top;

      const prevSelect = document.body.style.userSelect;
      document.body.style.userSelect = 'none';

      function onPointerMove(mev) {
        ipaState.x = baseX + (mev.clientX - startX);
        ipaState.y = baseY + (mev.clientY - startY);
        applyPlacement();
      }

      function onPointerUp() {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        document.body.style.userSelect = prevSelect;
        savePrefs();
      }

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      ev.preventDefault();
    }

    header.addEventListener('pointerdown', onPointerDown);
  }

  // --- Open / Close / Toggle ---

  window.boardToggleIpaKeyboard = function () {
    if (ipaState.visible) {
      boardCloseIpaKeyboard();
    } else {
      boardOpenIpaKeyboard();
    }
  };

  window.boardOpenIpaKeyboard = function (options) {
    const panel = document.getElementById('board-ipa-keyboard-panel');
    if (!panel) return;

    ipaState.visible = true;
    panel.style.display = 'flex';
    panel.classList.toggle('collapsed', !!ipaState.collapsed);

    if (options && typeof options.x === 'number' && typeof options.y === 'number') {
      ipaState.x = options.x;
      ipaState.y = options.y;
    } else if (ipaState.x === 24 && ipaState.y === 24) {
      // Default to bottom right
      ipaState.x = Math.max(10, window.innerWidth - 460);
      ipaState.y = Math.max(10, window.innerHeight - 540);
    }

    applyPlacement();
    renderTabs();
    renderKeysGrid();

    const directCheck = document.getElementById('board-ipa-direct-check-input');
    if (directCheck) directCheck.checked = ipaState.directInsert;

    const collapseBtn = document.getElementById('board-ipa-collapse-btn');
    if (collapseBtn) collapseBtn.textContent = ipaState.collapsed ? '▢' : '–';

    updateActiveTarget();
  };

  window.boardCloseIpaKeyboard = function () {
    const panel = document.getElementById('board-ipa-keyboard-panel');
    if (!panel) return;
    ipaState.visible = false;
    panel.style.display = 'none';
  };

  window.boardToggleIpaCollapse = function () {
    ipaState.collapsed = !ipaState.collapsed;
    const panel = document.getElementById('board-ipa-keyboard-panel');
    const collapseBtn = document.getElementById('board-ipa-collapse-btn');
    if (panel) panel.classList.toggle('collapsed', !!ipaState.collapsed);
    if (collapseBtn) collapseBtn.textContent = ipaState.collapsed ? '▢' : '–';
    savePrefs();
  };

  // Node context menu integration
  window.conCtxOpenIpaKeyboard = function () {
    if (typeof window.conCtxNodeId !== 'undefined' && window.conCtxNodeId) {
      lastActiveTarget = { element: null, range: null, type: 'node-selected', id: window.conCtxNodeId };
    }
    if (typeof window.conCtxClose === 'function') window.conCtxClose();
    boardOpenIpaKeyboard();
  };

  // Note popup integration
  window.wnOpenIpaKeyboard = function () {
    if (typeof window._wnActiveNote !== 'undefined' && window._wnActiveNote) {
      const noteEl = (typeof window.wnGetNoteElementById === 'function') ? window.wnGetNoteElementById(window._wnActiveNote.id) : null;
      if (noteEl) {
        const editor = noteEl.querySelector('.wn-note-editor, textarea');
        if (editor) {
          lastActiveTarget = { element: editor, range: null, isContentEditable: true, type: 'note-editor' };
        }
      }
    }
    boardOpenIpaKeyboard();
  };

  // --- Initialization ---

  function init() {
    loadPrefs();
    initDrag();

    // Global listeners to keep track of active editing target
    document.addEventListener('focusin', updateActiveTarget, { passive: true });
    document.addEventListener('selectionchange', () => {
      if (document.activeElement && (document.activeElement.classList.contains('wn-note-editor') || document.activeElement.isContentEditable)) {
        updateActiveTarget();
      }
    }, { passive: true });
    document.addEventListener('click', updateActiveTarget, { passive: true });

    // Keyboard shortcut handler: Alt+I or Ctrl+Alt+I
    window.addEventListener('keydown', function (e) {
      if ((e.altKey && !e.ctrlKey && !e.shiftKey && (e.key === 'i' || e.key === 'I')) ||
          (e.altKey && (e.ctrlKey || e.metaKey) && (e.key === 'i' || e.key === 'I'))) {
        e.preventDefault();
        boardToggleIpaKeyboard();
      }
    });

    window.addEventListener('resize', () => {
      if (ipaState.visible) applyPlacement();
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window, document);
