/**
 * Universal Importer & Exporter Module
 * ------------------------------------
 * Standalone, trans-app component for querying, filtering, multi-selecting,
 * inserting, auto-linking in CMT Link Graph, and exporting data across 5 suite domains:
 * 1. Learning Content (9 databases)
 * 2. Assessment & Curriculum (6 databases)
 * 3. Class & Rosters (Rosters, Seating Plans, Teams)
 * 4. Grade Sheet (Terms, Tests, Competences)
 * 5. Participation Tracker (Leaderboards, Notes, Rules)
 *
 * Designed for Light Neobrutalist aesthetics with 100% SVG icon compliance.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.UniversalImporter = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Helper Utilities
  // ---------------------------------------------------------------------------
  function escHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function getIconPath(iconName) {
    if (!iconName) iconName = 'file-text.svg';
    const name = iconName.endsWith('.svg') ? iconName : iconName + '.svg';
    const isSub = typeof window !== 'undefined' &&
      (window.location.pathname.includes('/pages/') || window.location.pathname.includes('\\pages\\'));
    return (isSub ? '../' : '') + 'assets/icons/' + name;
  }

  function renderSvgIcon(iconName, extraClass = '') {
    const src = getIconPath(iconName);
    return `<img src="${src}" class="btn-icon ${extraClass}" alt="" onerror="this.style.display='none'" />`;
  }

  function isUuid(str) {
    if (!str || typeof str !== 'string') return false;
    return /^st-[a-z0-9_-]+$/i.test(str) ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) ||
      /^[0-9a-f]{16,}$/i.test(str) ||
      /^plan_[a-z0-9_-]+$/i.test(str);
  }

  // Fast student lookup cache: id/uuid -> full readable name
  const _studentLookupMap = new Map();

  function _resolveReadableStudentName(idOrName, fallbackName) {
    if (!idOrName && !fallbackName) return '';
    const rawVal = String(idOrName || fallbackName || '').trim();

    // 1. Direct hit in internal lookup map
    if (_studentLookupMap.has(rawVal)) {
      const cached = _studentLookupMap.get(rawVal);
      if (cached && !isUuid(cached)) return cached;
    }
    if (idOrName && _studentLookupMap.has(idOrName)) {
      const cached = _studentLookupMap.get(idOrName);
      if (cached && !isUuid(cached)) return cached;
    }

    // 2. If not a UUID and contains valid characters, return it
    if (!isUuid(rawVal) && rawVal.length > 0) {
      return rawVal;
    }

    // 3. Check in LinksService if available
    if (typeof window !== 'undefined' && window.LinksService && typeof window.LinksService.resolveStudentName === 'function') {
      try {
        const resolved = window.LinksService.resolveStudentName(idOrName || rawVal);
        if (resolved && !isUuid(resolved)) return resolved;
      } catch (_) {}
    }

    // 4. Fallback name if provided and readable
    if (fallbackName && !isUuid(fallbackName)) {
      return String(fallbackName).trim();
    }

    // 5. Clean up ID formatting if nothing else
    return rawVal.replace(/^st[-_]/i, '').replace(/[-_]/g, ' ');
  }

  function formatStudentName(rawStudent, nameDisplayMode = 'full', fallbackTitle = '') {
    if (!rawStudent) return fallbackTitle || '';
    if (typeof rawStudent === 'string') {
      const clean = _resolveReadableStudentName(rawStudent, fallbackTitle);
      return clean || rawStudent;
    }

    let first = (rawStudent.firstName || rawStudent.first || '').trim();
    let last = (rawStudent.lastName || rawStudent.last || '').trim();
    const custom = (rawStudent.customName || rawStudent.nickname || '').trim();
    let rawName = (rawStudent.name || rawStudent.fullName || rawStudent.displayName || fallbackTitle || '').trim();

    // If names are empty but we have an ID/UUID, try resolving from cache
    const stId = rawStudent.id || rawStudent.uuid;
    if ((!first && !last) && stId) {
      const resolved = _resolveReadableStudentName(stId, rawName);
      if (resolved && !isUuid(resolved)) {
        rawName = resolved;
      }
    }

    if (!first && !last && rawName && !isUuid(rawName)) {
      const parts = rawName.split(/\s+/);
      if (parts.length > 1) {
        first = parts[0];
        last = parts.slice(1).join(' ');
      } else {
        first = rawName;
      }
    }

    if (nameDisplayMode === 'first') {
      return first || custom || rawName || fallbackTitle;
    }
    if (nameDisplayMode === 'last') {
      return last || first || custom || rawName || fallbackTitle;
    }
    if (nameDisplayMode === 'last_first') {
      if (last && first) return `${last}, ${first}`;
      return first || rawName || fallbackTitle;
    }
    if (nameDisplayMode === 'custom' && custom) {
      return custom;
    }
    // Default: full
    if (first && last) return `${first} ${last}`;
    return custom || first || rawName || fallbackTitle || '';
  }

  function getItemText(item, fieldChoice = 'title', nameDisplayMode = 'full') {
    if (!item) return '';

    const raw = item.raw || {};
    const subType = item.subType || '';

    // Class Roster & Student Tokens
    if (subType === 'roster' || raw.studentId || item.studentId || raw.rawStudent || raw.student) {
      const studentObj = item.rawStudent || raw.rawStudent || raw.student || raw;
      const formattedName = formatStudentName(studentObj, nameDisplayMode, item.title);
      if (fieldChoice === 'first' || fieldChoice === 'last' || fieldChoice === 'last_first' || fieldChoice === 'custom' || fieldChoice === 'full') {
        return formatStudentName(studentObj, fieldChoice, item.title);
      }
      if (fieldChoice === 'name_email') {
        const email = raw.email || raw.contact || '';
        return email ? `${formattedName} (${email})` : formattedName;
      }
      if (fieldChoice === 'student_card') {
        const cls = raw.className || raw.group || item.level || '';
        return cls ? `${formattedName} [${cls}]` : formattedName;
      }
      if (fieldChoice === 'subtitle') return (item.subtitle || '').trim() || formattedName;
      if (fieldChoice === 'both_dash') return item.subtitle ? `${formattedName} — ${item.subtitle}` : formattedName;
      if (fieldChoice === 'both_paren') return item.subtitle ? `${formattedName} (${item.subtitle})` : formattedName;
      if (fieldChoice === 'both_newline') return item.subtitle ? `${formattedName}\n${item.subtitle}` : formattedName;
      return formattedName;
    }

    // Database-specific field handlers
    switch (subType) {
      case 'wordbanks': {
        const word = raw.word || raw.text || item.title || '';
        const trans = raw.translation || raw.definition || item.subtitle || '';
        const ipa = raw.ipa ? `[${raw.ipa}]` : '';
        const def = raw.definition || trans;
        const ex = raw.example || raw.sentence || (Array.isArray(raw.examples) ? raw.examples[0] : '');

        switch (fieldChoice) {
          case 'word_only': return word;
          case 'trans_only': return trans || word;
          case 'definition': return def || trans || word;
          case 'example': return ex || trans || word;
          case 'word_trans': return trans ? `${word} — ${trans}` : word;
          case 'word_ipa_trans': return [word, ipa, trans ? `— ${trans}` : ''].filter(Boolean).join(' ');
          case 'both_dash': return trans ? `${word} — ${trans}` : word;
          case 'both_paren': return trans ? `${word} (${trans})` : word;
          case 'both_newline': return trans ? `${word}\n${trans}` : word;
          default: return word;
        }
      }

      case 'quizzes': {
        const q = raw.question || raw.prompt || item.title || '';
        const ans = raw.answer != null ? (Array.isArray(raw.options) && typeof raw.answer === 'number' ? raw.options[raw.answer] : raw.answer) : (raw.correctAnswer || '');
        const exp = raw.explanation || '';
        const optionsList = Array.isArray(raw.options) ? raw.options.map((opt, i) => `${['A', 'B', 'C', 'D', 'E'][i] || i + 1}) ${opt}`).join('\n') : '';

        switch (fieldChoice) {
          case 'question_only': return q;
          case 'question_answer': return ans ? `${q} — Answer: ${ans}` : q;
          case 'full_mcq': return optionsList ? `${q}\n${optionsList}` : q;
          case 'question_explanation': return exp ? `${q}\n💡 ${exp}` : q;
          case 'both_dash': return ans ? `${q} — ${ans}` : q;
          case 'both_paren': return ans ? `${q} (${ans})` : q;
          case 'both_newline': return ans ? `${q}\nAnswer: ${ans}` : q;
          default: return q;
        }
      }

      case 'quotebanks': {
        const quote = raw.quote || raw.text || item.title || '';
        const author = raw.author || '';
        const source = raw.source || '';

        switch (fieldChoice) {
          case 'quote_only': return `"${quote}"`;
          case 'author_only': return author || 'Author';
          case 'quote_author': return author ? `"${quote}" — ${author}` : `"${quote}"`;
          case 'quote_author_source': return author ? `"${quote}" — ${author}${source ? ` (${source})` : ''}` : `"${quote}"`;
          default: return author ? `"${quote}" — ${author}` : `"${quote}"`;
        }
      }

      case 'dictations': {
        const title = item.title || 'Dictation';
        const transcript = raw.text || raw.transcript || item.subtitle || '';
        switch (fieldChoice) {
          case 'title_only': return title;
          case 'transcript_full': return transcript || title;
          case 'prompt_audio': return `🔊 ${title}`;
          default: return transcript ? `${title}\n${transcript}` : title;
        }
      }

      case 'grammarbanks': {
        const rule = raw.rule || raw.title || item.title || '';
        const struct = raw.structure || raw.formula || '';
        const exp = raw.explanation || item.subtitle || '';
        const ex = raw.example || (Array.isArray(raw.examples) ? raw.examples[0] : '');

        switch (fieldChoice) {
          case 'rule_title': return rule;
          case 'structure': return struct || rule;
          case 'explanation': return exp || rule;
          case 'rule_examples': return ex ? `${rule}\nEx: ${ex}` : rule;
          default: return exp ? `${rule} — ${exp}` : rule;
        }
      }

      case 'gapfillbanks': {
        const sentence = raw.sentence || raw.text || item.title || '';
        const answers = Array.isArray(raw.answers) ? raw.answers.join(', ') : (raw.target || raw.answer || item.subtitle || '');
        switch (fieldChoice) {
          case 'sentence_blank': return sentence;
          case 'answers_only': return answers || sentence;
          case 'sentence_solved': return raw.solved || (answers ? `${sentence} [${answers}]` : sentence);
          default: return answers ? `${sentence} (${answers})` : sentence;
        }
      }

      case 'errorbanks': {
        const err = raw.erroneous || raw.sentence || item.title || '';
        const corr = raw.corrected || raw.correction || item.subtitle || '';
        switch (fieldChoice) {
          case 'erroneous': return err;
          case 'corrected': return corr || err;
          case 'error_correction_pair': return corr ? `❌ ${err}\n✅ ${corr}` : err;
          default: return corr ? `${err} ➔ ${corr}` : err;
        }
      }

      case 'sentencebanks': {
        const scrambled = raw.scrambled || item.title || '';
        const ordered = raw.ordered || raw.sentence || item.subtitle || '';
        switch (fieldChoice) {
          case 'scrambled': return scrambled;
          case 'ordered': return ordered || scrambled;
          default: return ordered ? `${scrambled} ➔ ${ordered}` : scrambled;
        }
      }

      case 'storybanks': {
        const title = raw.title || item.title || '';
        const body = raw.story || raw.text || raw.content || item.subtitle || '';
        switch (fieldChoice) {
          case 'story_title': return title;
          case 'story_body': return body || title;
          default: return body ? `${title}\n\n${body}` : title;
        }
      }

      case 'testbanks': {
        const title = item.title || '';
        const prompt = raw.prompt || raw.instructions || title;
        const pts = raw.points != null ? raw.points : (raw.weight || '');
        switch (fieldChoice) {
          case 'exercise_title': return title;
          case 'exercise_prompt': return prompt;
          case 'prompt_points': return pts ? `${prompt} [${pts} pts]` : prompt;
          default: return pts ? `${prompt} [${pts} pts]` : prompt;
        }
      }

      case 'competences': {
        const code = raw.code || item.id || '';
        const cTitle = raw.name || raw.title || item.title || '';
        const desc = raw.description || item.subtitle || '';
        switch (fieldChoice) {
          case 'code_only': return code;
          case 'title_only': return cTitle;
          case 'code_title': return code && cTitle ? `[${code}] ${cTitle}` : (cTitle || code);
          case 'full_descriptor': return desc ? `[${code}] ${cTitle}\n${desc}` : (cTitle || code);
          default: return code && cTitle ? `[${code}] ${cTitle}` : (cTitle || code);
        }
      }

      case 'phases': {
        const name = raw.name || item.title || '';
        const dur = raw.duration ? `${raw.duration}m` : '';
        const obj = raw.objectives || item.subtitle || '';
        switch (fieldChoice) {
          case 'phase_name': return name;
          case 'phase_duration': return dur ? `${name} (${dur})` : name;
          case 'phase_objectives': return obj ? `${name} — ${obj}` : name;
          default: return dur ? `${name} (${dur})` : name;
        }
      }

      case 'criteria': {
        const name = raw.name || item.title || '';
        const weight = raw.weight != null ? `${raw.weight}%` : '';
        const desc = raw.descriptor || item.subtitle || '';
        switch (fieldChoice) {
          case 'criterion_name': return name;
          case 'name_weight': return weight ? `${name} (Weight: ${weight})` : name;
          case 'rubric_descriptor': return desc ? `${name}: ${desc}` : name;
          default: return weight ? `${name} (${weight})` : name;
        }
      }

      case 'scales': {
        const name = raw.scaleName || raw.name || item.title || '';
        const bounds = item.subtitle || '';
        switch (fieldChoice) {
          case 'scale_name': return name;
          case 'boundaries': return bounds || name;
          default: return bounds ? `${name}: ${bounds}` : name;
        }
      }

      case 'chips': {
        const label = raw.label || raw.text || item.title || '';
        const cat = raw.category || item.theme || '';
        const pts = raw.points != null ? raw.points : (raw.weight != null ? raw.weight : '');
        switch (fieldChoice) {
          case 'chip_label': return label;
          case 'label_category': return cat ? `[${cat}] ${label}` : label;
          case 'label_points': return pts !== '' ? `${label} (${Number(pts) > 0 ? '+' : ''}${pts} pts)` : label;
          default: return label;
        }
      }

      case 'seating': {
        const rawP = raw.rawPlan || raw || {};
        const pTitle = item.title || rawP.name || rawP.title || 'Seating Plan';
        const pClass = rawP.className || item.level || '';
        const pLayout = (rawP.layoutType || rawP.layout || 'GRID').toUpperCase();
        const seats = Array.isArray(rawP.seats) ? rawP.seats : [];
        const seatCount = seats.length || (rawP.rows && rawP.cols ? rawP.rows * rawP.cols : 0);
        const assignedNames = seats.filter(s => s && (s.studentId || s.studentName || s.name)).map(s => _resolveReadableStudentName(s.studentId || s.studentName || s.name, s.studentName || s.name)).filter(Boolean);

        switch (fieldChoice) {
          case 'plan_title':
            return pClass ? `${pTitle} (${pClass})` : pTitle;
          case 'plan_full_details':
            return `${pTitle} [${pClass || 'Class'}] — ${pLayout}${seatCount ? ` (${seatCount} seats)` : ''}`;
          case 'desk_matrix':
            return rawP.rows && rawP.cols ? `${pTitle} (${rawP.rows}×${rawP.cols} Grid)` : `${pTitle} (${pLayout})`;
          case 'assigned_list':
            return assignedNames.length > 0 ? `${pTitle} (${pClass}): ${assignedNames.join(', ')}` : (pClass ? `${pTitle} (${pClass})` : pTitle);
          default:
            return pClass ? `${pTitle} (${pClass})` : pTitle;
        }
      }

      case 'teams': {
        const tName = item.title || raw.teamName || raw.name || 'Team';
        const members = Array.isArray(raw.members) ? raw.members.map(m => _resolveReadableStudentName(m)).filter(Boolean) : [];
        const mCount = members.length;

        switch (fieldChoice) {
          case 'team_name':
            return tName;
          case 'team_with_members':
            return members.length > 0 ? `${tName}: ${members.join(', ')}` : tName;
          case 'team_size_badge':
            return `${tName} (${mCount} ${mCount === 1 ? 'student' : 'students'})`;
          case 'member_nodes':
            return members.length > 0 ? `${tName}\n${members.map(m => `• ${m}`).join('\n')}` : tName;
          default:
            return members.length > 0 ? `${tName} (${members.join(', ')})` : tName;
        }
      }

      case 'grades-term':
      case 'grades-test':
      case 'grades-skills': {
        const studentName = _resolveReadableStudentName(item.studentId || raw.studentId || item.title, item.title);
        const score = item.badge || raw.score || raw.val || '';
        const detail = item.subtitle || '';
        switch (fieldChoice) {
          case 'student_grade':
          case 'student_score':
          case 'student_skill':
            return score ? `${studentName} — ${score}` : studentName;
          case 'score_percentage':
            return raw.percentage ? `${studentName} (${raw.percentage}%)` : (score ? `${studentName} — ${score}` : studentName);
          default:
            return detail ? `${studentName} — ${detail}` : (score ? `${studentName} — ${score}` : studentName);
        }
      }

      case 'pt-summary':
      case 'pt-notes':
      case 'pt-rules': {
        const title = item.title || '';
        const sub = item.subtitle || '';
        const badge = item.badge || '';
        switch (fieldChoice) {
          case 'session_headline': return title;
          case 'student_note': return sub || title;
          case 'note_with_class': return sub ? `${title}: ${sub}` : title;
          case 'rule_label': return title;
          case 'rule_points': return badge ? `${title} (${badge})` : title;
          default: return sub ? `${title} — ${sub}` : title;
        }
      }

      default: {
        const primaryTitle = item.title || '';
        const secondaryText = (item.subtitle || '').trim();
        switch (fieldChoice) {
          case 'subtitle': return secondaryText || primaryTitle;
          case 'both_dash': return secondaryText ? `${primaryTitle} — ${secondaryText}` : primaryTitle;
          case 'both_paren': return secondaryText ? `${primaryTitle} (${secondaryText})` : primaryTitle;
          case 'both_newline': return secondaryText ? `${primaryTitle}\n${secondaryText}` : primaryTitle;
          case 'title':
          default:
            return primaryTitle;
        }
      }
    }
  }


  // ---------------------------------------------------------------------------
  // Canonical URN Generator for Items
  // ---------------------------------------------------------------------------
  function getItemUrn(item) {
    if (!item) return '';
    if (item.urn) return item.urn;

    const subType = item.subType || '';
    const id = item.id || '';
    const file = item.fileSet || 'default';

    switch (subType) {
      case 'wordbanks':
        return `cmt:vocab:${encodeURIComponent(item.title || id)}`;
      case 'quizzes':
        return `cmt:quiz:${file}#${id}`;
      case 'quotebanks':
        return `cmt:quote:${encodeURIComponent(id || item.title)}`;
      case 'dictations':
        return `cmt:dictation:${encodeURIComponent(id || item.title)}`;
      case 'grammarbanks':
        return `cmt:grammar:${file}#${id}`;
      case 'gapfillbanks':
        return `cmt:gapfill:${file}#${id}`;
      case 'errorbanks':
        return `cmt:error:${file}#${id}`;
      case 'sentencebanks':
        return `cmt:sentence:${file}#${id}`;
      case 'storybanks':
        return `cmt:story:${file}#${id}`;
      case 'testbanks':
        return `cmt:exercise:${file}#${id}`;
      case 'competences':
        return `cmt:competence:${item.raw?.code || id}`;
      case 'phases':
        return `cmt:phase:${file}#${id}`;
      case 'criteria':
        return `cmt:criteria:${encodeURIComponent(item.raw?.name || id)}`;
      case 'scales':
        return `cmt:scale:${encodeURIComponent(item.raw?.scaleName || id)}`;
      case 'chips':
        return `cmt:chip:${file}#${id}`;
      case 'roster':
        return `cmt:student:${id}`;
      case 'seating':
        return `cmt:plan:${id}`;
      case 'teams':
        return `cmt:group:${id}`;
      case 'grades-term':
        return `cmt:gradesheet:${item.level || 'all'}:term:${id}`;
      case 'grades-test':
        return `cmt:gradesheet:${item.level || 'all'}:test:${id}`;
      case 'grades-skills':
        return `cmt:gradesheet:${item.level || 'all'}:skill:${id}`;
      case 'pt-summary':
        return `cmt:participation:${id}`;
      case 'pt-notes':
        return `cmt:participation_note:${id}`;
      case 'pt-rules':
        return `cmt:participation_rule:${id}`;
      default:
        return `cmt:${subType || 'item'}:${id}`;
    }
  }

  // ---------------------------------------------------------------------------
  // Configuration: 5 Domains & Sub-Source Definitions
  // ---------------------------------------------------------------------------
  const DOMAINS = [
    { id: 'learning', label: 'Learning Content', icon: 'book.svg' },
    { id: 'assessment', label: 'Assessment & Curriculum', icon: 'award.svg' },
    { id: 'class', label: 'Class & Rosters', icon: 'groups.svg' },
    { id: 'grades', label: 'Grade Sheet', icon: 'table.svg' },
    { id: 'participation', label: 'Participation Tracker', icon: 'participation-tracker.svg' }
  ];

  const SUB_SOURCES = [
    // 1. Learning Content
    { id: 'wordbanks', domain: 'learning', label: 'Word Banks', icon: 'book.svg', target: 'customWordbanks', subFolder: 'wordbanks', defaultVar: 'customVocabBank', defaultFiles: ['wordDb.js', 'words.js'] },
    { id: 'quizzes', domain: 'learning', label: 'Quizzes', icon: 'quiz.svg', target: 'customQuizzes', subFolder: 'quizzes', defaultVar: 'customQuizBank', defaultFiles: ['quiz.js'] },
    { id: 'quotebanks', domain: 'learning', label: 'Quotes', icon: 'quote.svg', target: 'customQuotes', subFolder: 'quotebanks', defaultVar: 'customQuoteBank', defaultFiles: ['quoteBank.js', 'quote.js'] },
    { id: 'dictations', domain: 'learning', label: 'Dictations', icon: 'dictation.svg', target: 'customDictations', subFolder: 'dictations', defaultVar: 'customDictationBank', defaultFiles: ['dictation.js'] },
    { id: 'grammarbanks', domain: 'learning', label: 'Grammar', icon: 'grammar.svg', target: 'customGrammarbanks', subFolder: 'grammarbanks', defaultVar: 'customGrammarBank', defaultFiles: ['grammar.js'] },
    { id: 'gapfillbanks', domain: 'learning', label: 'Gap Fill', icon: 'gapfill.svg', target: 'customGapfillbanks', subFolder: 'gapfillbanks', defaultVar: 'customGapFillBank', defaultFiles: ['gapFill.js', 'gapfill.js'] },
    { id: 'errorbanks', domain: 'learning', label: 'Error Banks', icon: 'error.svg', target: 'customErrorbanks', subFolder: 'errorbanks', defaultVar: 'customErrorBank', defaultFiles: ['errorBank.js', 'error.js'] },
    { id: 'sentencebanks', domain: 'learning', label: 'Sentences', icon: 'sentence.svg', target: 'customSentences', subFolder: 'sentencebanks', defaultVar: 'customSentenceBank', defaultFiles: ['orderSentences.js', 'sentence.js'] },
    { id: 'storybanks', domain: 'learning', label: 'Stories', icon: 'book.svg', target: 'customStorybanks', subFolder: 'storybanks', defaultVar: 'customStoryBank', defaultFiles: ['chooseStory.js', 'story.js'] },

    // 2. Assessment & Curriculum
    { id: 'testbanks', domain: 'assessment', label: 'Test Banks', icon: 'award.svg', target: 'customExercises', subFolder: 'exercises', defaultVar: 'customExerciseBank', defaultFiles: ['exercises.json'] },
    { id: 'competences', domain: 'assessment', label: 'Competences', icon: 'award.svg', target: 'customCompetences', subFolder: 'competences', defaultVar: 'customCompetenceBank', defaultFiles: ['lesson-competences.json', 'descriptors.json'] },
    { id: 'phases', domain: 'assessment', label: 'Lesson Phases', icon: 'zap.svg', target: 'customPhases', subFolder: 'phases', defaultVar: 'customPhaseBank', defaultFiles: ['phases.json'] },
    { id: 'criteria', domain: 'assessment', label: 'Criteria Rubrics', icon: 'check.svg', target: 'customCriteria', subFolder: 'criteria', defaultVar: 'XLSM_CRITERIA', defaultFiles: ['correction-criteria.js', 'criteria.json'] },
    { id: 'scales', domain: 'assessment', label: 'Grading Scales', icon: 'award.svg', target: 'customScales', subFolder: 'scales', defaultVar: 'XLSM_SCALE_MODELS', defaultFiles: ['grade-scale-models.js', 'scales.json'] },
    { id: 'chips', domain: 'assessment', label: 'Observation Chips', icon: 'speech-bubbles.svg', target: 'customChips', subFolder: 'chips', defaultVar: 'OBSERVATION_CHECKLIST_GROUPS', defaultFiles: ['chips.json', 'correction-criteria.js'] },

    // 3. Class & Rosters
    { id: 'roster', domain: 'class', label: 'Class Rosters', icon: 'groups.svg', special: 'roster' },
    { id: 'seating', domain: 'class', label: 'Seating Plans', icon: 'table.svg', special: 'seating' },
    { id: 'teams', domain: 'class', label: 'Teams & Groups', icon: 'group.svg', special: 'teams' },

    // 4. Grade Sheet
    { id: 'grades-term', domain: 'grades', label: 'Term Evaluations', icon: 'table.svg', special: 'grades-term' },
    { id: 'grades-test', domain: 'grades', label: 'Test Scores', icon: 'file-text.svg', special: 'grades-test' },
    { id: 'grades-skills', domain: 'grades', label: 'Competence Masteries', icon: 'award.svg', special: 'grades-skills' },

    // 5. Participation Tracker
    { id: 'pt-summary', domain: 'participation', label: 'Session Stats', icon: 'participation-tracker.svg', special: 'pt-summary' },
    { id: 'pt-notes', domain: 'participation', label: 'Student Notes', icon: 'file-text.svg', special: 'pt-notes' },
    { id: 'pt-rules', domain: 'participation', label: 'Grading Rules', icon: 'gear.svg', special: 'pt-rules' }
  ];

  // ---------------------------------------------------------------------------
  // Module State & In-Memory Cache
  // ---------------------------------------------------------------------------
  const _cache = {
    recordsBySubType: new Map(), // subTypeId -> Array of normalized UniversalImportItem
    fileSetsBySubType: new Map(), // subTypeId -> Array of { filename, count, records }
    classes: null,
    loaded: false,
    loadPromise: null
  };

  const _state = {
    activeDomain: 'learning',
    activeSubType: 'wordbanks',
    host: 'board', // 'board' | 'document-editor' | 'custom'
    hostUrn: null, // Host URN for link graph
    autoLink: true,
    classContext: null,
    selectedItems: new Set(), // Set of item.id
    lastFilteredItems: [],
    displayLimit: 100,
    searchQuery: '',
    fileFilter: 'all',
    levelFilter: '',
    themeFilter: '',
    starredOnly: false,
    nameDisplayMode: 'full',
    importField: 'title',
    outputFormat: 'tray',
    allowedOutputFormats: [],
    onInsertCallback: null
  };

  let _searchDebounceTimer = null;

  // ---------------------------------------------------------------------------
  // Data Loaders & Normalizers
  // ---------------------------------------------------------------------------
  function _parseJsOrJson(content, defaultVar) {
    if (!content || typeof content !== 'string') return null;
    const trimmed = content.trim();

    // 1. Direct JSON attempt
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parsed;
      } catch (_) {}
    }

    // 2. Safe Function evaluation for JS assignments
    try {
      const code = trimmed + `\n; return {
        result: (typeof ${defaultVar} !== 'undefined' ? ${defaultVar} : (typeof window !== 'undefined' && window.${defaultVar} ? window.${defaultVar} : null)),
        windowResult: (typeof window !== 'undefined' ? window : null)
      };`;
      const evaluated = (new Function(code))();
      if (evaluated && evaluated.result != null) return evaluated.result;
    } catch (_) {}

    // 3. Fallback evaluation
    try {
      const evalAll = (new Function(`var window = {}; ${trimmed}; return window;`))();
      if (evalAll && typeof evalAll === 'object') {
        if (defaultVar && evalAll[defaultVar] != null) return evalAll[defaultVar];
        const keys = Object.keys(evalAll);
        if (keys.length > 0) return evalAll[keys[0]];
      }
    } catch (_) {}

    return null;
  }

  function _normalizeRecord(raw, subTypeId, domainId, fileSetName, idx) {
    if (!raw || typeof raw !== 'object') {
      const cleanTitle = String(raw || `Item #${idx + 1}`);
      const fallbackItem = {
        id: `${subTypeId}_${idx}`,
        domain: domainId,
        subType: subTypeId,
        fileSet: fileSetName || 'default',
        title: cleanTitle,
        subtitle: '',
        level: '',
        theme: '',
        badge: '',
        starred: false,
        raw
      };
      fallbackItem.urn = getItemUrn(fallbackItem);
      return fallbackItem;
    }

    const id = raw.id || raw.uuid || raw.code || raw.word || raw.question || `${subTypeId}_${fileSetName}_${idx}`;
    let title = '';
    let subtitle = '';
    let level = raw.level || raw.cefr || raw.tier || '';
    let theme = raw.theme || raw.category || raw.domain || raw.group || '';
    let badge = raw.pos || raw.type || raw.weight || '';
    let starred = !!raw.starred || !!raw.pinned;

    switch (subTypeId) {
      case 'wordbanks':
        title = raw.word || raw.text || '';
        subtitle = [raw.ipa ? `[${raw.ipa}]` : '', raw.translation || raw.definition || ''].filter(Boolean).join(' — ');
        badge = raw.pos || '';
        break;
      case 'quizzes':
        title = raw.question || raw.prompt || '';
        subtitle = Array.isArray(raw.options) ? raw.options.join(' | ') : (raw.explanation || '');
        break;
      case 'quotebanks':
        title = raw.quote || raw.text || '';
        subtitle = raw.author ? `— ${raw.author}${raw.source ? ` (${raw.source})` : ''}` : (raw.translation || '');
        break;
      case 'dictations':
        title = raw.title || raw.text || `Dictation #${idx + 1}`;
        subtitle = raw.text ? (raw.text.length > 80 ? raw.text.slice(0, 80) + '…' : raw.text) : '';
        break;
      case 'grammarbanks':
        title = raw.rule || raw.category || raw.title || `Grammar Rule #${idx + 1}`;
        subtitle = raw.explanation || raw.structure || (Array.isArray(raw.examples) ? raw.examples[0] : '');
        break;
      case 'gapfillbanks':
      case 'sentencebanks':
        title = raw.sentence || raw.text || raw.original || '';
        subtitle = raw.translation || raw.target || (Array.isArray(raw.answers) ? `Answer: ${raw.answers.join(', ')}` : '');
        break;
      case 'errorbanks':
        title = raw.incorrect || raw.sentence || '';
        subtitle = raw.correct ? `Correct: ${raw.correct}` : (raw.explanation || '');
        break;
      case 'storybanks':
        title = raw.title || `Story #${idx + 1}`;
        subtitle = raw.passage ? (raw.passage.slice(0, 90) + '…') : '';
        break;
      case 'testbanks':
        title = raw.title || raw.prompt || `Exercise #${idx + 1}`;
        subtitle = raw.exerciseType ? `[${raw.exerciseType}] ${raw.prompt || ''}` : (raw.prompt || '');
        badge = raw.points ? `${raw.points} pts` : '';
        break;
      case 'competences':
        title = raw.code ? `[${raw.code}] ${raw.title || raw.domain || ''}` : (raw.title || raw.domain || '');
        subtitle = raw.description || raw.descriptor || '';
        break;
      case 'phases':
        title = raw.phase || raw.title || `Phase #${idx + 1}`;
        subtitle = raw.objective || raw.activities || '';
        badge = raw.duration ? `${raw.duration} min` : '';
        break;
      case 'criteria':
        title = raw.name || raw.code || `Criterion #${idx + 1}`;
        subtitle = raw.description || (raw.scale ? `Scale: ${raw.scale}` : '');
        badge = raw.weight ? `Weight: ${raw.weight}` : '';
        break;
      case 'scales':
        title = raw.scaleName || raw.name || `Scale Model #${idx + 1}`;
        subtitle = Array.isArray(raw.steps) ? raw.steps.map(s => s.label || s).join(', ') : '';
        break;
      case 'chips':
        title = raw.chipText || raw.text || raw.label || `Observation Chip #${idx + 1}`;
        subtitle = raw.group ? `Group: ${raw.group}` : '';
        badge = raw.polarity || '';
        break;
      case 'roster':
        title = raw.name || raw.fullName || raw.displayName || (raw.id && !isUuid(raw.id) ? _resolveReadableStudentName(raw.id) : '') || `Student #${idx + 1}`;
        subtitle = raw.className ? `Class: ${raw.className}` : (raw.email || '');
        break;
      case 'seating':
        title = raw.name || raw.title || (raw.id && !isUuid(raw.id) ? String(raw.id).replace(/^plan_/i, '').replace(/[-_]/g, ' ') : `Seating Plan #${idx + 1}`);
        if (isUuid(title)) title = `Seating Plan (${raw.className || 'Class'})`;
        subtitle = raw.className ? `Class: ${raw.className}${raw.layout ? ` | Layout: ${raw.layout}` : ''}` : (raw.layout ? `Layout: ${raw.layout}` : '');
        break;
      case 'teams':
        title = raw.teamName || raw.name || `Team #${idx + 1}`;
        if (isUuid(title)) title = `Team ${idx + 1}`;
        subtitle = Array.isArray(raw.members) ? raw.members.map(m => _resolveReadableStudentName(m)).join(', ') : '';
        break;
      case 'grades-term':
        title = _resolveReadableStudentName(raw.studentId || raw.id, raw.studentName || raw.name || raw.title);
        subtitle = raw.subtitle || (raw.score != null ? `Score: ${raw.score} / ${raw.maxScore || 20}` : (raw.details || ''));
        badge = raw.badge || raw.grade || '';
        break;
      case 'grades-test': {
        const sName = _resolveReadableStudentName(raw.studentId || raw.id, raw.studentName || raw.name);
        const tTitle = raw.testName || raw.testTitle || raw.title || 'Test';
        title = `${sName} — ${tTitle}`;
        subtitle = raw.subtitle || (raw.score != null ? `Score: ${raw.score} / ${raw.maxScore || 20}` : '');
        badge = raw.badge || (raw.score != null ? `${raw.score} pts` : '');
        break;
      }
      case 'grades-skills': {
        const sName = _resolveReadableStudentName(raw.studentId, raw.studentName);
        title = `${raw.critName || 'Criterion'} — ${sName}`;
        subtitle = raw.subtitle || `Result: ${raw.val ?? '-'}`;
        badge = raw.badge || String(raw.val || '');
        break;
      }
      case 'pt-summary':
        title = raw.title || raw.sessionTitle || `${raw.activeGroup || 'Class'} Session`;
        subtitle = raw.subtitle || raw.notes || (raw.interactions != null ? `${raw.interactions} interactions` : '');
        badge = raw.badge || (raw.grade ? `Mark: ${raw.grade}` : '');
        break;
      case 'pt-notes':
        title = _resolveReadableStudentName(raw.studentId || raw.name || raw.id, raw.title);
        subtitle = raw.subtitle || raw.notes || raw.noteText || '';
        break;
      case 'pt-rules':
        title = raw.title || raw.ruleName || `Rule #${idx + 1}`;
        subtitle = raw.subtitle || `Points: ${raw.points || 1}`;
        badge = raw.badge || (raw.points ? `${raw.points} pts` : '');
        break;
      default:
        title = raw.title || raw.name || raw.text || raw.word || raw.question || `Item #${idx + 1}`;
        subtitle = raw.description || raw.subtitle || raw.translation || '';
        break;
    }

    const normalized = {
      id: String(id),
      domain: domainId,
      subType: subTypeId,
      fileSet: fileSetName || 'default',
      title: title || `Item #${idx + 1}`,
      subtitle: subtitle || '',
      level: level ? String(level).toUpperCase().trim() : '',
      theme: theme ? String(theme).trim() : '',
      badge: badge ? String(badge).trim() : '',
      starred,
      raw
    };

    normalized.urn = getItemUrn(normalized);
    return normalized;
  }

  // ---------------------------------------------------------------------------
  // Asynchronous Domain Data Indexer
  // ---------------------------------------------------------------------------
  async function _loadAllData(forceRefresh = false) {
    if (_cache.loaded && !forceRefresh) return _cache;
    if (_cache.loadPromise && !forceRefresh) return _cache.loadPromise;

    _cache.loadPromise = (async () => {
      const isEl = typeof window !== 'undefined' && window.Desktop && typeof window.Desktop.isElectron === 'function' && window.Desktop.isElectron();

      // 1. Index Custom Database Files (Learning & Assessment)
      for (const src of SUB_SOURCES) {
        if (src.special) continue; // Handled separately below

        const loadedFileSets = [];
        const combinedRecords = [];
        const filesToTry = new Set();

        if (isEl && typeof window.Desktop.listFiles === 'function') {
          try {
            const listRes = await window.Desktop.listFiles(src.target, { extensions: ['.js', '.json'] });
            const files = listRes?.files || (Array.isArray(listRes) ? listRes : []);
            files.forEach(f => {
              const name = typeof f === 'string' ? f : f.filename;
              if (name && !name.toLowerCase().endsWith('.bak') && !name.toLowerCase().endsWith('.zip')) {
                filesToTry.add(name);
              }
            });
          } catch (_) {}
        }

        // If list is empty or non-electron, try default files
        (src.defaultFiles || []).forEach(f => filesToTry.add(f));

        for (const filename of filesToTry) {
          let content = '';
          if (isEl && typeof window.Desktop.readText === 'function') {
            try {
              const r = await window.Desktop.readText(src.target, filename);
              if (r?.ok && r.content) content = r.content;
            } catch (_) {}
            if (!content && typeof window.Desktop.readByPath === 'function') {
              try {
                const r2 = await window.Desktop.readByPath('customData', `${src.subFolder}/${filename}`);
                if (r2?.ok && r2.content) content = r2.content;
              } catch (_) {}
            }
            // Check in root user folder for criteria / scale models
            if (!content && (filename === 'correction-criteria.js' || filename === 'grade-scale-models.js')) {
              try {
                const r3 = await window.Desktop.readText('user', filename);
                if (r3?.ok && r3.content) content = r3.content;
              } catch (_) {}
            }
          } else if (!isEl && typeof fetch === 'function') {
            const urls = [
              `user/custom-data/${src.subFolder}/${filename}`,
              `user/${filename}`,
              `data/${filename}`
            ];
            for (const url of urls) {
              try {
                const res = await fetch(url, { cache: 'no-store' });
                if (res.ok) {
                  content = await res.text();
                  break;
                }
              } catch (_) {}
            }
          }

          // Check in-memory globals if content not on disk
          let rawList = null;
          if (content) {
            const parsed = _parseJsOrJson(content, src.defaultVar);
            if (Array.isArray(parsed)) {
              rawList = parsed;
            } else if (parsed && typeof parsed === 'object') {
              for (const key of ['records', 'words', 'items', 'questions', 'exercises', 'competences', 'descriptors', 'phases', 'scales', 'chips', 'criteria']) {
                if (Array.isArray(parsed[key])) {
                  rawList = parsed[key];
                  break;
                }
              }
              if (!rawList) rawList = [parsed];
            }
          } else if (typeof window !== 'undefined' && src.defaultVar && window[src.defaultVar]) {
            const g = window[src.defaultVar];
            rawList = Array.isArray(g) ? g : (typeof g === 'object' ? Object.values(g) : null);
          }

          if (Array.isArray(rawList) && rawList.length > 0) {
            const normalized = rawList.map((item, idx) => _normalizeRecord(item, src.id, src.domain, filename, idx));
            loadedFileSets.push({
              filename,
              count: normalized.length,
              records: normalized
            });
            normalized.forEach(item => combinedRecords.push(item));
          }
        }

        _cache.fileSetsBySubType.set(src.id, loadedFileSets);
        _cache.recordsBySubType.set(src.id, combinedRecords);
      }

      // 2. Index Class & Roster Data
      try {
        let rawRosterData = null;
        let rawMeta = null;
        let rawStudentRoster = null;

        // Ensure LinksService has loaded its roster cache if present
        if (typeof window !== 'undefined' && window.LinksService && typeof window.LinksService.ensureRosterLoaded === 'function') {
          try { await window.LinksService.ensureRosterLoaded().catch(() => {}); } catch (_) {}
        }

        // Check in-scope / window variables safely
        try {
          if (typeof CLASS_GROUPS_DATA !== 'undefined' && CLASS_GROUPS_DATA) rawRosterData = CLASS_GROUPS_DATA;
          else if (typeof CLASS_GROUPS !== 'undefined' && CLASS_GROUPS) rawRosterData = CLASS_GROUPS;
          else if (typeof window !== 'undefined' && window.CLASS_GROUPS_DATA) rawRosterData = window.CLASS_GROUPS_DATA;
          else if (typeof window !== 'undefined' && window.CLASS_GROUPS) rawRosterData = window.CLASS_GROUPS;
          else if (typeof window !== 'undefined' && window.CLASS_MANAGEMENT_CONFIG && window.CLASS_MANAGEMENT_CONFIG.classGroups) rawRosterData = window.CLASS_MANAGEMENT_CONFIG.classGroups;
          else if (typeof window !== 'undefined' && window.appState && window.appState.classes) rawRosterData = window.appState.classes;

          if (typeof CLASS_GROUPS_META !== 'undefined' && CLASS_GROUPS_META) rawMeta = CLASS_GROUPS_META;
          else if (typeof window !== 'undefined' && window.CLASS_GROUPS_META) rawMeta = window.CLASS_GROUPS_META;
          else if (rawRosterData && rawRosterData.classGroupsMeta) rawMeta = rawRosterData.classGroupsMeta;

          if (typeof STUDENTS_ROSTER !== 'undefined' && Array.isArray(STUDENTS_ROSTER)) rawStudentRoster = STUDENTS_ROSTER;
          else if (typeof window !== 'undefined' && Array.isArray(window.STUDENTS_ROSTER)) rawStudentRoster = window.STUDENTS_ROSTER;
        } catch (_) {}

        // A. Load user/students.js to populate _studentLookupMap with master roster
        if (isEl && typeof window.Desktop.readText === 'function') {
          const stRes = await window.Desktop.readText('user', 'students.js').catch(() => null);
          if (stRes?.ok && stRes.content) {
            try {
              const fnSt = new Function('var window = {}; ' + stRes.content + '; return typeof STUDENTS_ROSTER !== "undefined" ? STUDENTS_ROSTER : (window.STUDENTS_ROSTER || []);');
              const arr = fnSt();
              if (Array.isArray(arr) && arr.length > 0) rawStudentRoster = arr;
            } catch (_) {}
          }
          if (!rawStudentRoster && typeof window.Desktop.readByPath === 'function') {
            const stRes2 = await window.Desktop.readByPath('user', 'students.js').catch(() => null);
            if (stRes2?.ok && stRes2.content) {
              try {
                const fnSt2 = new Function('var window = {}; ' + stRes2.content + '; return typeof STUDENTS_ROSTER !== "undefined" ? STUDENTS_ROSTER : (window.STUDENTS_ROSTER || []);');
                const arr2 = fnSt2();
                if (Array.isArray(arr2) && arr2.length > 0) rawStudentRoster = arr2;
              } catch (_) {}
            }
          }
        } else if (!isEl && typeof fetch === 'function') {
          const stUrls = ['../user/students.js', 'user/students.js', '../data/students.js', 'data/students.js'];
          for (const u of stUrls) {
            try {
              const res = await fetch(u, { cache: 'no-store' });
              if (res.ok) {
                const txt = await res.text();
                if (txt) {
                  const fnSt = new Function('var window = {}; ' + txt + '; return typeof STUDENTS_ROSTER !== "undefined" ? STUDENTS_ROSTER : (window.STUDENTS_ROSTER || []);');
                  const arr = fnSt();
                  if (Array.isArray(arr) && arr.length > 0) {
                    rawStudentRoster = arr;
                    break;
                  }
                }
              }
            } catch (_) {}
          }
        }

        if (Array.isArray(rawStudentRoster)) {
          rawStudentRoster.forEach(s => {
            if (s && (s.uuid || s.id)) {
              const sname = ([s.firstName, s.lastName].filter(Boolean).join(' ') || s.customName || s.name || s.displayName || '').trim();
              if (sname) {
                if (s.uuid) _studentLookupMap.set(s.uuid, sname);
                if (s.id) _studentLookupMap.set(s.id, sname);
              }
            }
          });
        }

        // B. Load user/class-groups.js from disk if not already fully populated
        if (isEl && typeof window.Desktop.readText === 'function') {
          const r = await window.Desktop.readText('user', 'class-groups.js').catch(() => null);
          if (r?.ok && r.content) {
            try {
              const fn = new Function('var window = {}; ' + r.content + '; return { cgd: (typeof CLASS_GROUPS_DATA !== "undefined" ? CLASS_GROUPS_DATA : window.CLASS_GROUPS_DATA), cg: (typeof CLASS_GROUPS !== "undefined" ? CLASS_GROUPS : window.CLASS_GROUPS), meta: (typeof CLASS_GROUPS_META !== "undefined" ? CLASS_GROUPS_META : window.CLASS_GROUPS_META), stRoster: (typeof STUDENTS_ROSTER !== "undefined" ? STUDENTS_ROSTER : window.STUDENTS_ROSTER) };');
              const parsed = fn();
              if (parsed.cgd || parsed.cg) rawRosterData = parsed.cgd || parsed.cg;
              if (parsed.meta) rawMeta = parsed.meta;
              if (parsed.stRoster && Array.isArray(parsed.stRoster)) {
                parsed.stRoster.forEach(s => {
                  if (s && (s.id || s.uuid)) {
                    const sname = ([s.firstName, s.lastName].filter(Boolean).join(' ') || s.customName || s.name || '').trim();
                    if (sname) {
                      if (s.uuid) _studentLookupMap.set(s.uuid, sname);
                      if (s.id) _studentLookupMap.set(s.id, sname);
                    }
                  }
                });
              }
            } catch (_) {}
          }
          if (!rawRosterData && typeof window.Desktop.readByPath === 'function') {
            const r2 = await window.Desktop.readByPath('user', 'class-groups.js').catch(() => null);
            if (r2?.ok && r2.content) {
              try {
                const fn2 = new Function('var window = {}; ' + r2.content + '; return { cgd: (typeof CLASS_GROUPS_DATA !== "undefined" ? CLASS_GROUPS_DATA : window.CLASS_GROUPS_DATA), cg: (typeof CLASS_GROUPS !== "undefined" ? CLASS_GROUPS : window.CLASS_GROUPS), meta: (typeof CLASS_GROUPS_META !== "undefined" ? CLASS_GROUPS_META : window.CLASS_GROUPS_META), stRoster: (typeof STUDENTS_ROSTER !== "undefined" ? STUDENTS_ROSTER : window.STUDENTS_ROSTER) };');
                const parsed2 = fn2();
                if (parsed2.cgd || parsed2.cg) rawRosterData = parsed2.cgd || parsed2.cg;
                if (parsed2.meta) rawMeta = parsed2.meta;
              } catch (_) {}
            }
          }
        } else if (!isEl && typeof fetch === 'function') {
          const urls = ['../user/class-groups.js', 'user/class-groups.js', '../data/class-groups.js', 'data/class-groups.js'];
          for (const u of urls) {
            try {
              const res = await fetch(u, { cache: 'no-store' });
              if (res.ok) {
                const txt = await res.text();
                if (txt) {
                  const fn = new Function('var window = {}; ' + txt + '; return { cgd: (typeof CLASS_GROUPS_DATA !== "undefined" ? CLASS_GROUPS_DATA : window.CLASS_GROUPS_DATA), cg: (typeof CLASS_GROUPS !== "undefined" ? CLASS_GROUPS : window.CLASS_GROUPS), meta: (typeof CLASS_GROUPS_META !== "undefined" ? CLASS_GROUPS_META : window.CLASS_GROUPS_META), stRoster: (typeof STUDENTS_ROSTER !== "undefined" ? STUDENTS_ROSTER : window.STUDENTS_ROSTER) };');
                  const parsed = fn();
                  if (parsed.cgd || parsed.cg) rawRosterData = parsed.cgd || parsed.cg;
                  if (parsed.meta) rawMeta = parsed.meta;
                  if (rawRosterData) break;
                }
              }
            } catch (_) {}
          }
        }

        const rosterRecords = [];
        const teamRecords = [];
        const rosterFileSets = [];
        const teamFileSets = [];

        const IGNORED_CLASS_KEYS = new Set([
          'classgroupsmeta', 'activeyear', 'activesemester', 'activesemesterstart',
          'activesemesterend', 'activeterm', 'activedate', 'activeclass', 'activegroup',
          'settings', 'archived', 'history', '_version', 'version',
          'classplans', 'savedclassroomlayouts', 'saved_class_plans'
        ]);

        // Current Group Editor format (single source of truth):
        //   CLASS_GROUPS_DATA = { activeYear, ..., classGroupsMeta: { <groupUuid>: { name, level, year, semester, students: [<studentUuid>, ...] } } }
        //   Student names live in students.js (STUDENTS_ROSTER: [{ uuid, firstName, lastName, customName, ... }]).
        // Convert it into the array-of-classes shape handled below, resolving student UUIDs to roster objects.
        const hasLegacyGroupArrays = !!(rawRosterData && (
          (rawRosterData.classGroups && typeof rawRosterData.classGroups === 'object' && Object.keys(rawRosterData.classGroups).length > 0) ||
          (rawRosterData.groups && typeof rawRosterData.groups === 'object') ||
          Array.isArray(rawRosterData.classes) ||
          Array.isArray(rawRosterData) ||
          (typeof rawRosterData === 'object' && Object.entries(rawRosterData).some(([k, v]) => Array.isArray(v) && v.length > 0 && !IGNORED_CLASS_KEYS.has(String(k).toLowerCase())))
        ));
        const metaHasStudents = !!(rawMeta && typeof rawMeta === 'object' &&
          Object.values(rawMeta).some(m => m && Array.isArray(m.students) && m.students.length > 0));

        if (metaHasStudents && !hasLegacyGroupArrays) {
          const rosterObjById = new Map();
          if (Array.isArray(rawStudentRoster)) {
            rawStudentRoster.forEach(s => {
              if (!s || typeof s !== 'object') return;
              if (s.uuid) rosterObjById.set(s.uuid, s);
              if (s.id) rosterObjById.set(s.id, s);
            });
          }
          rawRosterData = Object.entries(rawMeta)
            .filter(([, m]) => m && !m.archived && Array.isArray(m.students) && m.students.length > 0)
            .map(([groupKey, m]) => ({
              id: groupKey,
              name: (m.name && String(m.name).trim()) || groupKey,
              level: m.level,
              year: m.year,
              semester: m.semester,
              students: m.students.map(sid => {
                if (typeof sid !== 'string') return sid;
                const obj = rosterObjById.get(sid);
                return obj ? { ...obj, id: obj.uuid || obj.id || sid } : sid;
              })
            }));
        }

        if (rawRosterData) {
          // Normalize various object shapes:
          let classDict = null;
          let isExplicitDict = false;

          if (rawRosterData.classGroups && typeof rawRosterData.classGroups === 'object') {
            classDict = rawRosterData.classGroups;
            isExplicitDict = true;
          } else if (rawRosterData.groups && typeof rawRosterData.groups === 'object') {
            classDict = rawRosterData.groups;
            isExplicitDict = true;
          } else if (Array.isArray(rawRosterData.classes)) {
            rawRosterData = rawRosterData.classes;
          } else if (!Array.isArray(rawRosterData) && typeof rawRosterData === 'object') {
            classDict = rawRosterData;
          }

          if (classDict && typeof classDict === 'object' && !Array.isArray(classDict)) {
            Object.entries(classDict).forEach(([className, students]) => {
              if (!className || typeof className !== 'string') return;
              const lowerKey = className.toLowerCase().trim();
              if (className.startsWith('_')) return;
              if (!isExplicitDict && IGNORED_CLASS_KEYS.has(lowerKey)) return;

              const meta = (rawMeta && rawMeta[className]) || {};
              let stList = [];
              if (Array.isArray(students)) {
                stList = students;
              } else if (students && typeof students === 'object' && Array.isArray(students.students)) {
                stList = students.students;
              } else if (meta && Array.isArray(meta.students)) {
                stList = meta.students;
              } else {
                return;
              }

              if (stList.length === 0) return;

              const classRosterItems = [];

              stList.forEach((st, idx) => {
                let stName = '';
                let stId = '';

                if (typeof st === 'string') {
                  stId = st.trim();
                  stName = _resolveReadableStudentName(stId, stId);
                } else if (st && typeof st === 'object') {
                  stId = st.id || st.uuid || `st_${className}_${idx}`;
                  stName = ([st.firstName, st.lastName].filter(Boolean).join(' ') || st.customName || st.name || st.displayName || '').trim();
                  if (!stName || isUuid(stName)) {
                    stName = _resolveReadableStudentName(stId, stName);
                  }
                }

                if (stId && stName && !isUuid(stName)) {
                  _studentLookupMap.set(stId, stName);
                }

                const item = _normalizeRecord({
                  id: isUuid(stId) ? stId : `${className}_${stId || idx}`,
                  name: stName || `Student #${idx + 1}`,
                  className: className,
                  level: meta.level != null && meta.level !== '' ? String(meta.level) : '',
                  theme: className,
                  badge: meta.year || (meta.semester ? `S${meta.semester}` : ''),
                  rawStudent: typeof st === 'object' ? st : { id: stId, name: stName, className }
                }, 'roster', 'class', className, idx);

                classRosterItems.push(item);
                rosterRecords.push(item);
              });

              if (classRosterItems.length > 0) {
                rosterFileSets.push({
                  filename: className,
                  count: classRosterItems.length,
                  records: classRosterItems
                });
              }

              // Create team record
              const memberNames = stList.map((s, sIdx) => {
                const sid = typeof s === 'string' ? s : (s.id || s.uuid || s.name || `st_${sIdx}`);
                return _resolveReadableStudentName(sid, typeof s === 'object' ? (s.name || sid) : sid);
              });

              const teamItem = _normalizeRecord({
                id: `team_${className}`,
                name: className,
                teamName: className,
                className: className,
                level: meta.level != null && meta.level !== '' ? String(meta.level) : '',
                theme: className,
                badge: `${stList.length} students`,
                members: memberNames
              }, 'teams', 'class', className, teamRecords.length);

              teamRecords.push(teamItem);
              teamFileSets.push({
                filename: className,
                count: 1,
                records: [teamItem]
              });
            });
          } else if (Array.isArray(rawRosterData)) {
            rawRosterData.forEach((cls, cIdx) => {
              if (!cls) return;
              const cName = cls.name || cls.title || cls.className || cls.id || `Class ${cIdx + 1}`;
              const meta = (rawMeta && (rawMeta[cName] || (cls.id && rawMeta[cls.id]))) || (typeof cls === 'object' ? cls : {});
              const stList = Array.isArray(cls.students) ? cls.students : (Array.isArray(cls) ? cls : (Array.isArray(meta.students) ? meta.students : []));
              if (!Array.isArray(stList) || stList.length === 0) return;

              const classRosterItems = [];
              stList.forEach((st, idx) => {
                let stName = '';
                let stId = '';
                if (typeof st === 'string') {
                  stId = st.trim();
                  stName = _resolveReadableStudentName(stId, stId);
                } else if (st && typeof st === 'object') {
                  stId = st.id || st.uuid || `st_${cName}_${idx}`;
                  stName = ([st.firstName, st.lastName].filter(Boolean).join(' ') || st.customName || st.name || '').trim();
                  if (!stName || isUuid(stName)) stName = _resolveReadableStudentName(stId, stName);
                }
                if (stId && stName && !isUuid(stName)) _studentLookupMap.set(stId, stName);

                const item = _normalizeRecord({
                  id: isUuid(stId) ? stId : `${cName}_${stId || idx}`,
                  name: stName || `Student #${idx + 1}`,
                  className: cName,
                  level: meta.level != null && meta.level !== '' ? String(meta.level) : '',
                  theme: cName,
                  badge: meta.year || (meta.semester ? `S${meta.semester}` : ''),
                  rawStudent: typeof st === 'object' ? st : { id: stId, name: stName, className: cName }
                }, 'roster', 'class', cName, idx);
                classRosterItems.push(item);
                rosterRecords.push(item);
              });

              if (classRosterItems.length > 0) {
                rosterFileSets.push({
                  filename: cName,
                  count: classRosterItems.length,
                  records: classRosterItems
                });
              }

              const memberNames = stList.map((s, sIdx) => {
                const sid = typeof s === 'string' ? s : (s.id || s.uuid || s.name || `st_${sIdx}`);
                return _resolveReadableStudentName(sid, typeof s === 'object' ? (s.name || sid) : sid);
              });

              const tItem = _normalizeRecord({
                id: `team_${cName}`,
                name: cName,
                teamName: cName,
                className: cName,
                level: meta.level != null && meta.level !== '' ? String(meta.level) : '',
                theme: cName,
                badge: `${stList.length} students`,
                members: memberNames
              }, 'teams', 'class', cName, teamRecords.length);

              teamRecords.push(tItem);
              teamFileSets.push({
                filename: cName,
                count: 1,
                records: [tItem]
              });
            });
          }
        }

        _cache.recordsBySubType.set('roster', rosterRecords);
        _cache.fileSetsBySubType.set('roster', rosterFileSets);
        _cache.recordsBySubType.set('teams', teamRecords);
        _cache.fileSetsBySubType.set('teams', teamFileSets);
      } catch (_) {}

      // 3. Index Seating Plans (Strictly from classPlans/plans.js and SAVED_CLASS_PLANS)
      try {
        const seatingRecords = [];
        const seatingFileSets = [];

        // A. Check in-memory global variables
        let globalPlans = null;
        if (typeof window !== 'undefined') {
          globalPlans = window.SAVED_CLASS_PLANS || window.SAVED_CLASSROOM_LAYOUTS || window.classPlans || (window.CLASS_MANAGEMENT_CONFIG && window.CLASS_MANAGEMENT_CONFIG.classPlans);
        }

        // B. Read from filesystem classPlans target
        if (isEl && typeof window.Desktop.readText === 'function') {
          const pRes = await window.Desktop.readText('classPlans', 'plans.js').catch(() => null);
          if (pRes?.ok && pRes.content) {
            const parsed = _parseJsOrJson(pRes.content, 'SAVED_CLASS_PLANS') || _parseJsOrJson(pRes.content, 'classPlans') || _parseJsOrJson(pRes.content, 'SAVED_CLASSROOM_LAYOUTS');
            if (parsed && typeof parsed === 'object') {
              globalPlans = Object.assign({}, globalPlans || {}, parsed);
            }
          }
          if (!globalPlans && typeof window.Desktop.readByPath === 'function') {
            const pRes2 = await window.Desktop.readByPath('user', 'class-plans/plans.js').catch(() => null);
            if (pRes2?.ok && pRes2.content) {
              const parsed2 = _parseJsOrJson(pRes2.content, 'SAVED_CLASS_PLANS') || _parseJsOrJson(pRes2.content, 'classPlans');
              if (parsed2 && typeof parsed2 === 'object') {
                globalPlans = Object.assign({}, globalPlans || {}, parsed2);
              }
            }
          }
        } else if (!isEl && typeof fetch === 'function') {
          const planUrls = ['../user/class-plans/plans.js', 'user/class-plans/plans.js', '../data/class-plans/plans.js'];
          for (const pu of planUrls) {
            try {
              const pFetch = await fetch(pu, { cache: 'no-store' });
              if (pFetch.ok) {
                const pTxt = await pFetch.text();
                const pParsed = _parseJsOrJson(pTxt, 'SAVED_CLASS_PLANS') || _parseJsOrJson(pTxt, 'classPlans');
                if (pParsed && typeof pParsed === 'object') {
                  globalPlans = Object.assign({}, globalPlans || {}, pParsed);
                  break;
                }
              }
            } catch (_) {}
          }
        }

        // Ingest dictionary format { [className]: [plans...] }
        if (globalPlans && typeof globalPlans === 'object') {
          Object.entries(globalPlans).forEach(([cName, plans]) => {
            if (cName.startsWith('_')) return;
            const pList = Array.isArray(plans) ? plans : [plans];
            const classPlanItems = [];

            pList.forEach((p, pIdx) => {
              if (!p || typeof p !== 'object') return;
              const hasSeats = Array.isArray(p.seats) && p.seats.length > 0;
              const hasLayout = !!(p.layoutType || p.layout || (p.rows && p.cols) || p.grid);
              const isPlan = hasSeats || hasLayout || (p.id && String(p.id).startsWith('plan_'));
              if (!isPlan) return;

              const planTitle = p.name || p.title || (p.id && !isUuid(p.id) ? String(p.id).replace(/^plan_/i, '').replace(/[-_]/g, ' ') : `${cName} Plan #${pIdx + 1}`);
              const planLayout = (p.layoutType || p.layout || 'GRID').toUpperCase();
              const seatCount = Array.isArray(p.seats) ? p.seats.length : (p.rows && p.cols ? p.rows * p.cols : 0);

              const item = _normalizeRecord({
                id: p.id || `plan_${cName}_${pIdx}`,
                name: planTitle,
                title: planTitle,
                className: cName,
                level: cName,
                theme: planLayout,
                badge: seatCount ? `${seatCount} seats` : planLayout,
                subtitle: `Class: ${cName} | Layout: ${planLayout} (${seatCount} seats)`,
                rawPlan: p
              }, 'seating', 'class', cName, seatingRecords.length);

              classPlanItems.push(item);
              seatingRecords.push(item);
            });

            if (classPlanItems.length > 0) {
              seatingFileSets.push({
                filename: cName,
                count: classPlanItems.length,
                records: classPlanItems
              });
            }
          });
        }

        _cache.recordsBySubType.set('seating', seatingRecords);
        _cache.fileSetsBySubType.set('seating', seatingFileSets);
      } catch (_) {}

      // 4. Index Grade Sheet Files (Structured recursive & in-memory)
      try {
        const termRecords = [];
        const testRecords = [];
        const skillRecords = [];
        const termFileSets = new Map();
        const testFileSets = new Map();
        const skillFileSets = new Map();

        if (isEl && typeof window.Desktop.listByPath === 'function') {
          const gList = await window.Desktop.listByPath('grades', '', { recursive: true, extensions: ['.js', '.json'] }).catch(() => null);
          const files = gList?.files || (Array.isArray(gList) ? gList : []);
          
          const classMetadataList = [];
          const testFileList = [];
          const classStudentScores = new Map(); // classSlug -> studentId -> { sem1: number[], sem2: number[] }

          for (const f of files) {
            const relPath = typeof f === 'string' ? f : (f.relativePath || f.filename);
            if (!relPath) continue;
            const fn = typeof f === 'string' ? f : (f.filename || relPath);
            if (fn === '_class.js') {
              classMetadataList.push({ file: f, relPath, fn });
            } else {
              testFileList.push({ file: f, relPath, fn });
            }
          }

          // Ingest test files first to collect student scores and compute real averages
          for (const tf of testFileList) {
            const r = await window.Desktop.readByPath('grades', tf.relPath).catch(() => null);
            if (!r || !r.ok || !r.content) continue;
            const classSlug = tf.relPath.includes('/') ? tf.relPath.split('/')[0] : '';

            try {
              const fnTest = new Function('var window = {}; ' + r.content + '; return (typeof GRADE_TEST_DATA !== "undefined" ? GRADE_TEST_DATA : (typeof GRADE_SHEET !== "undefined" ? GRADE_SHEET : window.GRADE_TEST_DATA));');
              const testData = fnTest();
              if (testData && Array.isArray(testData.results)) {
                const cfg = testData.testConfig || {};
                const testTitle = cfg.testName || tf.fn.replace(/\.js$/i, '').replace(/[-_]/g, ' ');
                const sem = String(testData.semester || 'sem1').toLowerCase();

                if (!classStudentScores.has(classSlug)) {
                  classStudentScores.set(classSlug, new Map());
                }
                const stScoreMap = classStudentScores.get(classSlug);

                testData.results.forEach((res, idx) => {
                  if (!res) return;
                  const stId = res.studentId || `st_${idx}`;
                  if (res.score != null && !isNaN(Number(res.score))) {
                    if (!stScoreMap.has(stId)) {
                      stScoreMap.set(stId, { sem1: [], sem2: [] });
                    }
                    const rec = stScoreMap.get(stId);
                    if (sem.includes('2')) rec.sem2.push(Number(res.score));
                    else rec.sem1.push(Number(res.score));
                  }

                  const stName = _resolveReadableStudentName(stId, res.name || res.studentName);
                  if (stId && stName && !isUuid(stName)) _studentLookupMap.set(stId, stName);

                  const testItem = _normalizeRecord({
                    id: `test_${testData.classId || classSlug}_${testData.semester || ''}_${testData.testIndex || idx}_${stId}`,
                    studentId: stId,
                    studentName: stName,
                    testTitle: testTitle,
                    title: `${stName} — ${testTitle}`,
                    subtitle: `Class: ${testData.classId || classSlug} (${testData.semester || 'Test'}) | Score: ${res.score != null ? res.score : '-'} / ${cfg.maxPoints || 20}`,
                    badge: res.score != null ? `${res.score} pts` : '',
                    level: testData.classId || classSlug,
                    theme: testTitle,
                    rawResult: res
                  }, 'grades-test', 'grades', testTitle, testRecords.length);

                  testRecords.push(testItem);

                  const tKey = testTitle || classSlug || 'default';
                  if (!testFileSets.has(tKey)) {
                    testFileSets.set(tKey, { filename: tKey, count: 0, records: [] });
                  }
                  const tSet = testFileSets.get(tKey);
                  tSet.count++;
                  tSet.records.push(testItem);

                  if (res.criteriaResults && typeof res.criteriaResults === 'object') {
                    Object.entries(res.criteriaResults).forEach(([critName, val]) => {
                      const skillItem = _normalizeRecord({
                        id: `skill_${testData.classId || classSlug}_${stId}_${critName}`,
                        studentId: stId,
                        studentName: stName,
                        critName: critName,
                        val: val,
                        title: `${critName} — ${stName}`,
                        subtitle: `Test: ${testTitle} | Result: ${val}`,
                        badge: String(val || ''),
                        level: testData.classId || classSlug,
                        theme: critName,
                        rawSkill: { critName, val, studentId: stId }
                      }, 'grades-skills', 'grades', critName, skillRecords.length);

                      skillRecords.push(skillItem);

                      if (!skillFileSets.has(critName)) {
                        skillFileSets.set(critName, { filename: critName, count: 0, records: [] });
                      }
                      const skSet = skillFileSets.get(critName);
                      skSet.count++;
                      skSet.records.push(skillItem);
                    });
                  }
                });
              }
            } catch (_) {}
          }

          // Process class metadata files and calculate live averages
          for (const cf of classMetadataList) {
            const r = await window.Desktop.readByPath('grades', cf.relPath).catch(() => null);
            if (!r || !r.ok || !r.content) continue;
            const classSlug = cf.relPath.includes('/') ? cf.relPath.split('/')[0] : '';

            try {
              const fnClass = new Function('var window = {}; ' + r.content + '; return (typeof GRADE_CLASS !== "undefined" ? GRADE_CLASS : window.GRADE_CLASS);');
              const classData = fnClass();
              if (classData && Array.isArray(classData.students)) {
                const className = classData.className || classData.classId || classSlug;
                const stScoreMap = classStudentScores.get(classSlug) || new Map();

                classData.students.forEach((st, idx) => {
                  const stName = ([st.firstName, st.lastName].filter(Boolean).join(' ') || st.customName || st.name || st.displayName || _resolveReadableStudentName(st.id)).trim();
                  if (st.id && stName && !isUuid(stName)) _studentLookupMap.set(st.id, stName);

                  const studentScores = stScoreMap.get(st.id) || { sem1: [], sem2: [] };
                  const s1Avg = studentScores.sem1.length > 0
                    ? (studentScores.sem1.reduce((a, b) => a + b, 0) / studentScores.sem1.length).toFixed(1)
                    : (st.sem1Avg != null ? String(st.sem1Avg) : '-');
                  const s2Avg = studentScores.sem2.length > 0
                    ? (studentScores.sem2.reduce((a, b) => a + b, 0) / studentScores.sem2.length).toFixed(1)
                    : (st.sem2Avg != null ? String(st.sem2Avg) : '-');
                  const allScores = [...studentScores.sem1, ...studentScores.sem2];
                  const annualAvg = allScores.length > 0
                    ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)
                    : (st.annualAvg != null ? String(st.annualAvg) : (s1Avg !== '-' ? s1Avg : '-'));

                  const termItem = _normalizeRecord({
                    id: `term_${classData.classId || classSlug}_${st.id || idx}`,
                    studentId: st.id,
                    studentName: stName,
                    title: stName,
                    subtitle: `Class: ${className} | S1 Avg: ${s1Avg} | S2 Avg: ${s2Avg}`,
                    badge: `Annual: ${annualAvg}`,
                    level: className,
                    theme: className,
                    rawGrade: { ...st, s1Avg, s2Avg, annualAvg }
                  }, 'grades-term', 'grades', className, termRecords.length);

                  termRecords.push(termItem);

                  if (!termFileSets.has(className)) {
                    termFileSets.set(className, { filename: className, count: 0, records: [] });
                  }
                  const cSet = termFileSets.get(className);
                  cSet.count++;
                  cSet.records.push(termItem);
                });
              }
            } catch (_) {}
          }
        }

        _cache.recordsBySubType.set('grades-term', termRecords);
        _cache.recordsBySubType.set('grades-test', testRecords);
        _cache.recordsBySubType.set('grades-skills', skillRecords);
        _cache.fileSetsBySubType.set('grades-term', Array.from(termFileSets.values()));
        _cache.fileSetsBySubType.set('grades-test', Array.from(testFileSets.values()));
        _cache.fileSetsBySubType.set('grades-skills', Array.from(skillFileSets.values()));
      } catch (_) {}

      // 5. Index Participation Tracker Data (Session logs, Notes & Rules)
      try {
        const ptSummaries = [];
        const ptNotes = [];
        const ptRules = [];
        const ptSummaryFileSets = new Map();
        const ptNotesFileSets = new Map();

        if (isEl && typeof window.Desktop.listByPath === 'function') {
          // A. Read session files from groupParticipation subfolders with fallback
          let listRes = await window.Desktop.listByPath('groupParticipation', '.', { recursive: true, extensions: ['.js', '.json'] }).catch(() => null);
          let files = listRes?.files || (Array.isArray(listRes) ? listRes : []);
          
          if (files.length === 0 && typeof window.Desktop.listByPath === 'function') {
            const fallbackList = await window.Desktop.listByPath('user', 'log/group-participation', { recursive: true, extensions: ['.js', '.json'] }).catch(() => null);
            if (fallbackList?.files && fallbackList.files.length > 0) {
              files = fallbackList.files;
            }
          }

          for (const f of files) {
            const relPath = typeof f === 'string' ? f : (f.relativePath || f.filename);
            if (!relPath) continue;
            const fn = typeof f === 'string' ? f : (f.filename || relPath);

            // Skip helper rule/note files in session parser
            if (fn === 'pt-rules.js' || fn === 'pt-notes.js' || fn === 'pt-deleted.js' || fn === 'pt-presets.js') continue;

            const r = await window.Desktop.readByPath('groupParticipation', relPath).catch(() => null);
            if (!r || !r.ok || !r.content) continue;

            try {
              const fnSess = new Function('var window = {}; ' + r.content + '; return (typeof CMS_CLASS_SESSIONS !== "undefined" ? CMS_CLASS_SESSIONS : (typeof CMS_SESSIONS !== "undefined" ? CMS_SESSIONS : (typeof DB_EXPORT !== "undefined" ? DB_EXPORT : window.CMS_CLASS_SESSIONS || window.DB_EXPORT)));');
              const sessions = fnSess();
              const sessList = Array.isArray(sessions) ? sessions : (sessions && typeof sessions === 'object' ? Object.values(sessions) : []);
              
              sessList.forEach((sess, idx) => {
                if (!sess) return;
                const sessId = sess.id || `sess_${relPath}_${idx}`;
                const grpName = sess.activeGroup || sess.className || 'Class';
                const count = sess.totalInteractions || (Array.isArray(sess.history) ? sess.history.length : 0);
                
                let dateStr = '';
                try {
                  const parsedD = new Date(sess.date);
                  dateStr = !isNaN(parsedD.getTime()) ? parsedD.toLocaleDateString() : String(sess.date || '');
                } catch (_) {
                  dateStr = String(sess.date || '');
                }

                const sumItem = _normalizeRecord({
                  id: sessId,
                  title: `${sess.title || grpName} Session ${dateStr ? `(${dateStr})` : ''}`,
                  subtitle: `Class: ${grpName} | ${count} interactions | Duration: ${sess.duration || 0}m`,
                  badge: `${count} pts`,
                  level: grpName,
                  theme: grpName,
                  rawSession: sess
                }, 'pt-summary', 'participation', grpName, ptSummaries.length);

                ptSummaries.push(sumItem);

                if (!ptSummaryFileSets.has(grpName)) {
                  ptSummaryFileSets.set(grpName, { filename: grpName, count: 0, records: [] });
                }
                const pSet = ptSummaryFileSets.get(grpName);
                pSet.count++;
                pSet.records.push(sumItem);

                // Extract student notes inside session
                if (sess.groups && typeof sess.groups === 'object') {
                  Object.values(sess.groups).forEach(students => {
                    if (Array.isArray(students)) {
                      students.forEach(st => {
                        if (st && st.notes) {
                          const sName = _resolveReadableStudentName(st.id || st.name);
                          const noteItem = _normalizeRecord({
                            id: `note_${st.id || st.name}_${sessId}`,
                            studentId: st.id,
                            studentName: sName,
                            title: sName,
                            subtitle: `[${grpName}] ${st.notes}`,
                            level: grpName,
                            theme: grpName,
                            rawNote: { student: st, session: sess }
                          }, 'pt-notes', 'participation', grpName, ptNotes.length);

                          ptNotes.push(noteItem);

                          if (!ptNotesFileSets.has(grpName)) {
                            ptNotesFileSets.set(grpName, { filename: grpName, count: 0, records: [] });
                          }
                          const nSet = ptNotesFileSets.get(grpName);
                          nSet.count++;
                          nSet.records.push(noteItem);
                        }
                      });
                    }
                  });
                }
              });
            } catch (_) {}
          }

          // B. Read pt-notes.js
          const notesRes = await window.Desktop.readText('groupParticipation', 'pt-notes.js').catch(() => null);
          if (notesRes?.ok && notesRes.content) {
            try {
              const fnNotes = new Function('var window = {}; ' + notesRes.content + '; return (typeof CMS_NOTES_PATCH !== "undefined" ? CMS_NOTES_PATCH : (typeof CMS_PARTICIPATION_NOTES !== "undefined" ? CMS_PARTICIPATION_NOTES : window.CMS_NOTES_PATCH));');
              const patch = fnNotes();
              if (patch && typeof patch === 'object') {
                Object.entries(patch).forEach(([key, val], idx) => {
                  if (typeof val === 'object' && val !== null) {
                    Object.entries(val).forEach(([stName, noteText]) => {
                      const cleanStName = _resolveReadableStudentName(stName);
                      const pItem = _normalizeRecord({
                        id: `pt_patch_${key}_${stName}`,
                        studentName: cleanStName,
                        title: cleanStName,
                        subtitle: String(noteText || ''),
                        level: key,
                        theme: key,
                        rawNote: { key, stName, noteText }
                      }, 'pt-notes', 'participation', key || 'pt-notes.js', ptNotes.length);

                      ptNotes.push(pItem);

                      const setKey = key || 'pt-notes.js';
                      if (!ptNotesFileSets.has(setKey)) {
                        ptNotesFileSets.set(setKey, { filename: setKey, count: 0, records: [] });
                      }
                      const nSet = ptNotesFileSets.get(setKey);
                      nSet.count++;
                      nSet.records.push(pItem);
                    });
                  } else {
                    const cleanTitle = _resolveReadableStudentName(key);
                    const pItem = _normalizeRecord({
                      id: `pt_patch_${key}`,
                      title: cleanTitle,
                      subtitle: String(val || ''),
                      rawNote: { key, val }
                    }, 'pt-notes', 'participation', 'pt-notes.js', idx);

                    ptNotes.push(pItem);

                    if (!ptNotesFileSets.has('pt-notes.js')) {
                      ptNotesFileSets.set('pt-notes.js', { filename: 'pt-notes.js', count: 0, records: [] });
                    }
                    const nSet = ptNotesFileSets.get('pt-notes.js');
                    nSet.count++;
                    nSet.records.push(pItem);
                  }
                });
              }
            } catch (_) {}
          }

          // C. Read pt-rules.js
          const rulesRes = await window.Desktop.readText('groupParticipation', 'pt-rules.js').catch(() => null);
          if (rulesRes?.ok && rulesRes.content) {
            try {
              const fnRules = new Function('var window = {}; ' + rulesRes.content + '; return (typeof CMS_PARTICIPATION_RULES !== "undefined" ? CMS_PARTICIPATION_RULES : (typeof CMS_RULES !== "undefined" ? CMS_RULES : window.CMS_PARTICIPATION_RULES));');
              const rulesObj = fnRules();
              if (rulesObj && typeof rulesObj === 'object') {
                Object.entries(rulesObj).forEach(([rKey, rVal], idx) => {
                  const rName = (rVal && (rVal.label || rVal.name)) || rKey;
                  const pts = (rVal && (rVal.points ?? rVal.weight)) ?? 1;
                  ptRules.push(_normalizeRecord({
                    id: `rule_${rKey}`,
                    title: rName,
                    subtitle: `Points: ${pts > 0 ? '+' : ''}${pts} | Type: ${rVal?.type || 'rule'}`,
                    badge: `${pts > 0 ? '+' : ''}${pts} pts`,
                    rawRule: rVal
                  }, 'pt-rules', 'participation', 'pt-rules.js', idx));
                });
              }
            } catch (_) {}
          }
        }

        // Check in-memory fallback for Participation
        if (ptSummaries.length === 0 && typeof window !== 'undefined' && Array.isArray(window.DB_EXPORT) && window.DB_EXPORT.length > 0) {
          window.DB_EXPORT.forEach((sess, idx) => {
            const count = sess.totalInteractions || (Array.isArray(sess.history) ? sess.history.length : 0);
            let dateStr = '';
            try {
              const parsedD = new Date(sess.date);
              dateStr = !isNaN(parsedD.getTime()) ? parsedD.toLocaleDateString() : String(sess.date || '');
            } catch (_) {
              dateStr = String(sess.date || '');
            }
            ptSummaries.push(_normalizeRecord({
              id: sess.id || `sess_${idx}`,
              title: `${sess.title || sess.activeGroup || 'Session'} ${dateStr ? `(${dateStr})` : ''}`,
              subtitle: `Class: ${sess.activeGroup || 'All'} | ${count} interactions`,
              badge: `${count} pts`,
              level: sess.activeGroup || '',
              theme: sess.activeGroup || '',
              rawSession: sess
            }, 'pt-summary', 'participation', sess.activeGroup || 'Session', idx));
          });
        }

        _cache.recordsBySubType.set('pt-summary', ptSummaries);
        _cache.recordsBySubType.set('pt-notes', ptNotes);
        _cache.recordsBySubType.set('pt-rules', ptRules);
        _cache.fileSetsBySubType.set('pt-summary', Array.from(ptSummaryFileSets.values()));
        _cache.fileSetsBySubType.set('pt-notes', Array.from(ptNotesFileSets.values()));
        _cache.fileSetsBySubType.set('pt-rules', [{ filename: 'pt-rules.js', count: ptRules.length, records: ptRules }]);
      } catch (_) {}

      _cache.loaded = true;
      return _cache;
    })();

    return _cache.loadPromise;
  }

  // ---------------------------------------------------------------------------
  // Field Options Registry for 24 Sub-Sources
  // ---------------------------------------------------------------------------
  function _getFieldOptionsForSubType(subType, host = 'board') {
    const isBoard = (host === 'board');
    switch (subType) {
      case 'wordbanks':
        return [
          { value: 'word_only', label: 'Word Only', i18nKey: 'uimpFieldWordOnly' },
          { value: 'word_trans', label: 'Word — Translation', i18nKey: 'uimpFieldWordTrans' },
          { value: 'word_ipa_trans', label: 'Word [IPA] — Translation', i18nKey: 'uimpFieldWordIpaTrans' },
          { value: 'trans_only', label: 'Translation / Definition Only', i18nKey: 'uimpFieldTransOnly' },
          { value: 'definition', label: 'Definition Only', i18nKey: 'uimpFieldDefinition' },
          { value: 'example', label: 'Example Sentence', i18nKey: 'uimpFieldExample' },
          ...(isBoard ? [{ value: 'both_nodes', label: 'Two Connected Nodes (Word ➔ Translation)', i18nKey: 'uimpFieldBothNodes' }] : [])
        ];
      case 'quizzes':
        return [
          { value: 'question_only', label: 'Question Prompt Only', i18nKey: 'uimpFieldQuestionOnly' },
          { value: 'question_answer', label: 'Question — Correct Answer', i18nKey: 'uimpFieldQuestionAnswer' },
          { value: 'full_mcq', label: 'Full MCQ Card (Question + Options)', i18nKey: 'uimpFieldFullMcq' },
          { value: 'question_explanation', label: 'Question + Explanation', i18nKey: 'uimpFieldQuestionExplanation' },
          ...(isBoard ? [{ value: 'both_nodes', label: 'Two Connected Nodes (Question ➔ Answer)', i18nKey: 'uimpFieldBothNodes' }] : [])
        ];
      case 'quotebanks':
        return [
          { value: 'quote_only', label: 'Quote Text Only', i18nKey: 'uimpFieldQuoteOnly' },
          { value: 'quote_author', label: 'Quote — Author', i18nKey: 'uimpFieldQuoteAuthor' },
          { value: 'quote_author_source', label: 'Quote — Author (Source)', i18nKey: 'uimpFieldQuoteAuthorSource' },
          { value: 'author_only', label: 'Author Only', i18nKey: 'uimpFieldAuthorOnly' }
        ];
      case 'dictations':
        return [
          { value: 'title_only', label: 'Title Only', i18nKey: 'uimpFieldTitle' },
          { value: 'transcript_full', label: 'Full Audio Transcript', i18nKey: 'uimpFieldStoryBody' },
          { value: 'prompt_audio', label: 'Audio Prompt Trigger', i18nKey: 'uimpFieldPromptPoints' }
        ];
      case 'grammarbanks':
        return [
          { value: 'rule_title', label: 'Rule Title', i18nKey: 'uimpFieldRuleTitle' },
          { value: 'structure', label: 'Structure / Formula', i18nKey: 'uimpFieldStructure' },
          { value: 'explanation', label: 'Explanation', i18nKey: 'uimpFieldExplanation' },
          { value: 'rule_examples', label: 'Rule + Example', i18nKey: 'uimpFieldRuleExamples' }
        ];
      case 'gapfillbanks':
        return [
          { value: 'sentence_blank', label: 'Sentence (with Blank)', i18nKey: 'uimpFieldSentenceBlank' },
          { value: 'sentence_solved', label: 'Solved Sentence', i18nKey: 'uimpFieldSentenceSolved' },
          { value: 'answers_only', label: 'Answer / Solution Only', i18nKey: 'uimpFieldAnswersOnly' },
          ...(isBoard ? [{ value: 'both_nodes', label: 'Two Connected Nodes (Sentence ➔ Answer)', i18nKey: 'uimpFieldBothNodes' }] : [])
        ];
      case 'errorbanks':
        return [
          { value: 'erroneous', label: 'Erroneous Sentence', i18nKey: 'uimpFieldErroneous' },
          { value: 'corrected', label: 'Corrected Sentence', i18nKey: 'uimpFieldCorrected' },
          { value: 'error_correction_pair', label: 'Error + Correction Pair', i18nKey: 'uimpFieldErrorCorrectionPair' },
          ...(isBoard ? [{ value: 'both_nodes', label: 'Two Connected Nodes (Error ➔ Correction)', i18nKey: 'uimpFieldBothNodes' }] : [])
        ];
      case 'sentencebanks':
        return [
          { value: 'scrambled', label: 'Scrambled Sentence', i18nKey: 'uimpFieldScrambled' },
          { value: 'ordered', label: 'Ordered Sentence', i18nKey: 'uimpFieldOrdered' },
          ...(isBoard ? [{ value: 'both_nodes', label: 'Two Connected Nodes (Scrambled ➔ Target)', i18nKey: 'uimpFieldBothNodes' }] : [])
        ];
      case 'storybanks':
        return [
          { value: 'story_title', label: 'Story Title', i18nKey: 'uimpFieldStoryTitle' },
          { value: 'story_body', label: 'Full Story Passage', i18nKey: 'uimpFieldStoryBody' }
        ];
      case 'testbanks':
        return [
          { value: 'exercise_title', label: 'Exercise Title', i18nKey: 'uimpFieldTitle' },
          { value: 'exercise_prompt', label: 'Exercise Prompt', i18nKey: 'uimpFieldExercisePrompt' },
          { value: 'prompt_points', label: 'Prompt + Points Badge', i18nKey: 'uimpFieldPromptPoints' }
        ];
      case 'competences':
        return [
          { value: 'code_only', label: 'Competence Code', i18nKey: 'uimpFieldCompetenceCode' },
          { value: 'title_only', label: 'Competence Title', i18nKey: 'uimpFieldCompetenceTitle' },
          { value: 'code_title', label: 'Code + Title', i18nKey: 'uimpFieldCodeTitle' },
          { value: 'full_descriptor', label: 'Full Descriptor', i18nKey: 'uimpFieldFullDescriptor' }
        ];
      case 'phases':
        return [
          { value: 'phase_name', label: 'Phase Name', i18nKey: 'uimpFieldTitle' },
          { value: 'phase_duration', label: 'Phase + Duration', i18nKey: 'uimpFieldPhaseDuration' },
          { value: 'phase_objectives', label: 'Phase + Objectives', i18nKey: 'uimpFieldPhaseObjectives' }
        ];
      case 'criteria':
        return [
          { value: 'criterion_name', label: 'Criterion Name', i18nKey: 'uimpFieldTitle' },
          { value: 'name_weight', label: 'Criterion + Weight', i18nKey: 'uimpFieldCriterionWeight' },
          { value: 'rubric_descriptor', label: 'Rubric Descriptors', i18nKey: 'uimpFieldRubricDescriptor' }
        ];
      case 'scales':
        return [
          { value: 'scale_name', label: 'Scale Name', i18nKey: 'uimpFieldTitle' },
          { value: 'boundaries', label: 'Grade Boundaries', i18nKey: 'uimpFieldSubtitle' }
        ];
      case 'chips':
        return [
          { value: 'chip_label', label: 'Feedback Chip Only', i18nKey: 'uimpFieldTitle' },
          { value: 'label_category', label: 'Category + Feedback Chip', i18nKey: 'uimpFieldChipCategory' },
          { value: 'label_points', label: 'Chip + Points', i18nKey: 'uimpFieldChipPoints' }
        ];
      case 'roster':
        return [
          { value: 'full', label: 'Full Name (First Last)', i18nKey: 'uimpNameFull' },
          { value: 'first', label: 'First Name Only', i18nKey: 'uimpNameFirst' },
          { value: 'last', label: 'Last Name Only', i18nKey: 'uimpNameLast' },
          { value: 'last_first', label: 'Last, First', i18nKey: 'uimpNameLastFirst' },
          { value: 'name_email', label: 'Name (Email / ID)', i18nKey: 'uimpFieldBothParen' },
          { value: 'student_card', label: 'Student Card [Class]', i18nKey: 'uimpFieldStudentCard' }
        ];
      case 'seating':
        return [
          { value: 'plan_title', label: 'Plan Name / Title', i18nKey: 'uimpFieldPlanTitle' },
          { value: 'plan_full_details', label: 'Plan Name & Layout Details', i18nKey: 'uimpFieldPlanDetails' },
          { value: 'desk_matrix', label: 'Desk & Seat Grid Matrix', i18nKey: 'uimpFieldDeskMatrix' },
          { value: 'assigned_list', label: 'Assigned Students List', i18nKey: 'uimpFieldAssignedList' }
        ];
      case 'teams':
        return [
          { value: 'team_name', label: 'Team / Group Name', i18nKey: 'uimpFieldTeamName' },
          { value: 'team_with_members', label: 'Team + Member List', i18nKey: 'uimpFieldTeamMembers' },
          { value: 'team_size_badge', label: 'Team Name (Student Count)', i18nKey: 'uimpFieldTeamCount' },
          ...(isBoard ? [{ value: 'member_nodes', label: 'Individual Member Concept Nodes', i18nKey: 'uimpFieldMemberNodes' }] : [])
        ];
      case 'grades-term':
      case 'grades-test':
      case 'grades-skills':
        return [
          { value: 'student_grade', label: 'Student — Grade / Score', i18nKey: 'uimpFieldStudentGrade' },
          { value: 'score_percentage', label: 'Student (Percentage %)', i18nKey: 'uimpFieldScorePercentage' },
          { value: 'student_skill', label: 'Student — Skill Mastery', i18nKey: 'uimpFieldStudentSkill' }
        ];
      case 'pt-summary':
      case 'pt-notes':
      case 'pt-rules':
        return [
          { value: 'session_headline', label: 'Session Headline', i18nKey: 'uimpFieldSessionHeadline' },
          { value: 'student_note', label: 'Student Note', i18nKey: 'uimpFieldStudentNote' },
          { value: 'note_with_class', label: '[Class] Student: Note', i18nKey: 'uimpFieldNoteWithClass' },
          { value: 'rule_label', label: 'Rule Label', i18nKey: 'uimpFieldRuleTitle' },
          { value: 'rule_points', label: 'Rule + Point Value', i18nKey: 'uimpFieldRulePoints' }
        ];
      default:
        return [
          { value: 'title', label: 'Primary Title / Item', i18nKey: 'uimpFieldTitle' },
          { value: 'subtitle', label: 'Secondary Details / Subtitle', i18nKey: 'uimpFieldSubtitle' },
          { value: 'both_dash', label: 'Both (Title — Details)', i18nKey: 'uimpFieldBothDash' },
          { value: 'both_paren', label: 'Both (Title (Details))', i18nKey: 'uimpFieldBothParen' },
          { value: 'both_newline', label: 'Both (Multiline)', i18nKey: 'uimpFieldBothNewline' },
          ...(isBoard ? [{ value: 'both_nodes', label: 'Two Connected Nodes', i18nKey: 'uimpFieldBothNodes' }] : [])
        ];
    }
  }

  // ---------------------------------------------------------------------------
  // UI Dialog Template Construction
  // ---------------------------------------------------------------------------
  function _ensureModalDom() {
    let overlay = document.getElementById('universal-importer-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'universal-importer-overlay';
    overlay.innerHTML = `
      <div id="universal-importer-modal" role="dialog" aria-modal="true">
        <!-- Header -->
        <div class="uimp-header">
          <div class="uimp-header-title">
            ${renderSvgIcon('import.svg')}
            <span data-i18n="uimpModalTitle">Universal Import</span>
          </div>
          <button type="button" class="uimp-close-btn" onclick="UniversalImporter.close()" aria-label="Close">
            ${renderSvgIcon('close.svg')}
          </button>
        </div>

        <!-- Domain Tabs -->
        <div class="uimp-domain-tabs" id="uimp-domain-tabs-bar"></div>

        <!-- Subtype Carousel -->
        <div class="uimp-subtype-bar" id="uimp-subtype-pills-bar"></div>

        <!-- Filter Bar -->
        <div class="uimp-filter-bar">
          <div class="uimp-filter-group" id="uimp-fg-fileset">
            <label class="uimp-filter-label" data-i18n="uimpFilterSource">Source / Set:</label>
            <select id="uimp-filter-fileset" class="uimp-select" onchange="UniversalImporter._onFilterChange('fileset')"></select>
          </div>
          <div class="uimp-filter-group" id="uimp-fg-level">
            <label class="uimp-filter-label" data-i18n="uimpFilterLevel">Level:</label>
            <select id="uimp-filter-level" class="uimp-select" onchange="UniversalImporter._onFilterChange('level')"></select>
          </div>
          <div class="uimp-filter-group" id="uimp-fg-theme">
            <label class="uimp-filter-label" data-i18n="uimpFilterTheme">Theme / Category:</label>
            <select id="uimp-filter-theme" class="uimp-select" onchange="UniversalImporter._onFilterChange('theme')"></select>
          </div>
          <div class="uimp-filter-group" style="flex:2; min-width:180px;">
            <label class="uimp-filter-label" data-i18n="uimpFilterSearch">Search:</label>
            <input type="search" id="uimp-filter-search" class="uimp-input" placeholder="Filter items..." oninput="UniversalImporter._onSearchInput(this.value)" />
          </div>
          <div style="display:flex; align-items:flex-end; padding-bottom:4px;">
            <label class="uimp-checkbox-label">
              <input type="checkbox" id="uimp-filter-starred" onchange="UniversalImporter._onFilterChange('starred')" />
              <span>★ Starred</span>
            </label>
          </div>
        </div>

        <!-- Action Controls Bar -->
        <div class="uimp-action-bar">
          <div style="display:flex; gap:6px; align-items:center;">
            <button type="button" class="uimp-btn-sm" onclick="UniversalImporter.selectAll(true)">
              ${renderSvgIcon('check.svg')} <span data-i18n="uimpBtnSelectAll">Select All</span>
            </button>
            <button type="button" class="uimp-btn-sm" onclick="UniversalImporter.selectAll(false)">
              ${renderSvgIcon('close.svg')} <span data-i18n="uimpBtnDeselectAll">Clear</span>
            </button>
            <button type="button" class="uimp-btn-sm" onclick="UniversalImporter.invertSelection()">
              ${renderSvgIcon('refresh.svg')} <span data-i18n="uimpBtnInvert">Invert</span>
            </button>
          </div>
          <span id="uimp-counter-text" style="font-size:0.78rem; font-weight:800; color:#64748b;">0 items available</span>
        </div>

        <!-- Items Grid Container -->
        <div class="uimp-items-wrap" id="uimp-items-container"></div>

        <!-- Footer -->
        <div class="uimp-footer">
          <div class="uimp-footer-left">
            <span id="uimp-total-selected-badge" style="font-weight:900; font-size:0.85rem; color:#0f172a;">0 items selected</span>
            <div id="uimp-output-format-wrap" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;"></div>
            <div id="uimp-field-preview-box" class="uimp-field-preview-box" title="Live Preview of Selected Field Output">
              <span class="uimp-preview-label" data-i18n="uimpPreviewLabel">Preview:</span>
              <span id="uimp-field-preview-text" class="uimp-preview-text">—</span>
            </div>
            <label class="uimp-checkbox-label" id="uimp-autolink-label" title="Automatically create bidirectional links in CMT Link Graph" style="margin-left:4px;">
              <input type="checkbox" id="uimp-autolink-checkbox" checked />
              <span data-i18n="uimpAutoLinkGraph">Auto-link in Graph</span>
            </label>
          </div>
          <div class="uimp-footer-right">
            <button type="button" class="uimp-btn-secondary" onclick="UniversalImporter.close()" data-i18n="btnCancel">Cancel</button>
            <button type="button" class="uimp-btn-secondary" onclick="UniversalImporter.openExportDialog()">
              ${renderSvgIcon('export.svg')} <span data-i18n="uimpBtnExportFile">Export to File…</span>
            </button>
            <button type="button" class="uimp-btn-primary" onclick="UniversalImporter.confirmInsert()">
              ${renderSvgIcon('plus.svg')} <span id="uimp-insert-btn-label" data-i18n="uimpBtnInsert">＋ Insert</span>
            </button>
          </div>
        </div>

        <!-- Sub-Dialog: Export to File -->
        <div id="uimp-export-dialog">
          <div class="uimp-export-box">
            <div class="uimp-header">
              <div class="uimp-header-title">
                ${renderSvgIcon('export.svg')}
                <span>Export Selected Items to File</span>
              </div>
              <button type="button" class="uimp-close-btn" onclick="UniversalImporter.closeExportDialog()">
                ${renderSvgIcon('close.svg')}
              </button>
            </div>
            <div style="padding:10px 16px; font-size:0.82rem; font-weight:700; color:#475569; background:#fafaf7; border-bottom:1.5px solid #d1d5db;">
              Choose an export format for <strong id="uimp-export-selected-count" style="color:#0f172a;">0 items</strong>:
            </div>
            <div class="uimp-export-formats-grid" id="uimp-export-formats-container"></div>
            <div style="padding:10px 16px; display:flex; justify-content:flex-end; gap:8px; background:#f5f5f0; border-top:2px solid var(--uimp-border);">
              <button type="button" class="uimp-btn-secondary" onclick="UniversalImporter.closeExportDialog()">Cancel</button>
              <button type="button" class="uimp-btn-primary" onclick="UniversalImporter.executeExport()">
                ${renderSvgIcon('download.svg')} <span>Export Now</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
  }

  // ---------------------------------------------------------------------------
  // View Rendering & Controller Methods
  // ---------------------------------------------------------------------------
  function _renderDomainTabs() {
    const tabsBar = document.getElementById('uimp-domain-tabs-bar');
    if (!tabsBar) return;

    tabsBar.innerHTML = DOMAINS.map(d => `
      <button type="button" class="uimp-domain-tab ${d.id === _state.activeDomain ? 'active' : ''}" onclick="UniversalImporter.switchDomain('${d.id}')">
        ${renderSvgIcon(d.icon)}
        <span>${escHtml(d.label)}</span>
      </button>
    `).join('');
  }

  function _renderSubtypePills() {
    const pillsBar = document.getElementById('uimp-subtype-pills-bar');
    if (!pillsBar) return;

    const subTypes = SUB_SOURCES.filter(s => s.domain === _state.activeDomain);
    pillsBar.innerHTML = subTypes.map(st => {
      const records = _cache.recordsBySubType.get(st.id) || [];
      const count = records.length;
      return `
        <button type="button" class="uimp-pill-btn ${st.id === _state.activeSubType ? 'active' : ''}" onclick="UniversalImporter.switchSubType('${st.id}')">
          ${renderSvgIcon(st.icon)}
          <span>${escHtml(st.label)}</span>
          <span class="uimp-pill-count">${count}</span>
        </button>
      `;
    }).join('');
  }

  function _renderFilterOptions() {
    const setSelect = document.getElementById('uimp-filter-fileset');
    const lvlSelect = document.getElementById('uimp-filter-level');
    const thmSelect = document.getElementById('uimp-filter-theme');

    const fileSets = _cache.fileSetsBySubType.get(_state.activeSubType) || [];
    const allRecords = _cache.recordsBySubType.get(_state.activeSubType) || [];

    // 1. Compute Available File Sets
    if (setSelect) {
      setSelect.innerHTML = `<option value="all">All Sources / Sets (${allRecords.length})</option>` +
        fileSets.map(fs => `<option value="${escHtml(fs.filename)}">${escHtml(fs.filename)} (${fs.count})</option>`).join('');
      setSelect.value = _state.fileFilter || 'all';
    }

    // 2. Compute Cascaded Levels based on chosen fileSet
    const matchingFileRecords = allRecords.filter(r => _state.fileFilter === 'all' || r.fileSet === _state.fileFilter);
    const levelCounts = new Map();
    matchingFileRecords.forEach(r => {
      if (r.level) {
        levelCounts.set(r.level, (levelCounts.get(r.level) || 0) + 1);
      }
    });

    if (lvlSelect) {
      // If current levelFilter is no longer valid in cascade, reset it
      if (_state.levelFilter && !levelCounts.has(_state.levelFilter)) {
        _state.levelFilter = '';
      }
      let lvlHtml = `<option value="">All Levels (${matchingFileRecords.length})</option>`;
      Array.from(levelCounts.keys()).sort().forEach(lvl => {
        lvlHtml += `<option value="${escHtml(lvl)}">${escHtml(lvl)} (${levelCounts.get(lvl)})</option>`;
      });
      lvlSelect.innerHTML = lvlHtml;
      lvlSelect.value = _state.levelFilter;
    }

    // 3. Compute Cascaded Themes based on chosen fileSet AND level
    const matchingLevelRecords = matchingFileRecords.filter(r => !_state.levelFilter || r.level === _state.levelFilter);
    const themeCounts = new Map();
    matchingLevelRecords.forEach(r => {
      if (r.theme) {
        themeCounts.set(r.theme, (themeCounts.get(r.theme) || 0) + 1);
      }
    });

    if (thmSelect) {
      // If current themeFilter is no longer valid in cascade, reset it
      if (_state.themeFilter && !themeCounts.has(_state.themeFilter)) {
        _state.themeFilter = '';
      }
      let thmHtml = `<option value="">All Themes (${matchingLevelRecords.length})</option>`;
      Array.from(themeCounts.keys()).sort((a, b) => a.localeCompare(b)).forEach(thm => {
        thmHtml += `<option value="${escHtml(thm)}">${escHtml(thm)} (${themeCounts.get(thm)})</option>`;
      });
      thmSelect.innerHTML = thmHtml;
      thmSelect.value = _state.themeFilter;
    }
  }

  function _updateFieldPreview() {
    const previewTextEl = document.getElementById('uimp-field-preview-text');
    if (!previewTextEl) return;

    const allRecords = _cache.recordsBySubType.get(_state.activeSubType) || [];
    let sampleItem = null;

    // Use first selected item, or first filtered item, or first record
    if (_state.selectedItems.size > 0) {
      const firstId = _state.selectedItems.values().next().value;
      sampleItem = allRecords.find(r => r.id === firstId);
    }
    if (!sampleItem && _state.lastFilteredItems && _state.lastFilteredItems.length > 0) {
      sampleItem = _state.lastFilteredItems[0];
    }
    if (!sampleItem && allRecords.length > 0) {
      sampleItem = allRecords[0];
    }

    if (!sampleItem) {
      previewTextEl.textContent = '—';
      return;
    }

    const rendered = getItemText(sampleItem, _state.importField || 'title', _state.nameDisplayMode || 'full');
    previewTextEl.textContent = rendered.replace(/\n/g, ' ↵ ') || '—';
    previewTextEl.title = rendered;
  }

  function _getBoardOutputFormatsForSubType(subType) {
    switch (subType) {
      case 'seating':
        return [
          { value: 'classplan', label: 'Class Plan Visual Card', i18nKey: 'uimpFormatClassPlan' },
          { value: 'table', label: 'Editable Table Grid', i18nKey: 'uimpFormatTable' },
          { value: 'note', label: 'Sticky Note / Checklist Card', i18nKey: 'uimpFormatNote' },
          { value: 'nodes', label: 'Individual Concept Nodes', i18nKey: 'uimpFormatNodes' }
        ];
      case 'quizzes':
      case 'dictations':
      case 'grammarbanks':
      case 'gapfillbanks':
      case 'errorbanks':
      case 'sentencebanks':
      case 'storybanks':
        return [
          { value: 'launcher', label: 'Interactive Activity Launcher Card', i18nKey: 'uimpFormatLauncher' },
          { value: 'table', label: 'Editable Table Grid', i18nKey: 'uimpFormatTable' },
          { value: 'note', label: 'Sticky Note / Checklist Card', i18nKey: 'uimpFormatNote' },
          { value: 'tray', label: 'Drag & Drop Staging Tray', i18nKey: 'uimpFormatTray' },
          { value: 'nodes', label: 'Individual Concept Nodes', i18nKey: 'uimpFormatNodes' },
          { value: 'mindmap', label: 'Mindmap Radial Cluster', i18nKey: 'uimpFormatMindmap' }
        ];
      case 'wordbanks':
      case 'quotebanks':
        return [
          { value: 'tray', label: 'Drag & Drop Staging Tray', i18nKey: 'uimpFormatTray' },
          { value: 'nodes', label: 'Individual Concept Nodes', i18nKey: 'uimpFormatNodes' },
          { value: 'launcher', label: 'Interactive Activity Launcher Card', i18nKey: 'uimpFormatLauncher' },
          { value: 'mindmap', label: 'Mindmap Radial Cluster', i18nKey: 'uimpFormatMindmap' },
          { value: 'note', label: 'Sticky Note / Checklist Card', i18nKey: 'uimpFormatNote' },
          { value: 'table', label: 'Editable Table Grid', i18nKey: 'uimpFormatTable' }
        ];
      case 'roster':
      case 'teams':
        return [
          { value: 'nodes', label: 'Individual Student Nodes', i18nKey: 'uimpFormatNodes' },
          { value: 'tray', label: 'Drag & Drop Staging Tray', i18nKey: 'uimpFormatTray' },
          { value: 'note', label: 'Sticky Note / Checklist Card', i18nKey: 'uimpFormatNote' },
          { value: 'table', label: 'Editable Table Grid', i18nKey: 'uimpFormatTable' }
        ];
      case 'testbanks':
      case 'competences':
      case 'phases':
      case 'criteria':
      case 'scales':
      case 'chips':
      case 'grades-term':
      case 'grades-test':
      case 'grades-skills':
      case 'pt-summary':
      case 'pt-notes':
      case 'pt-rules':
      default:
        return [
          { value: 'table', label: 'Editable Table Grid', i18nKey: 'uimpFormatTable' },
          { value: 'note', label: 'Sticky Note / Checklist Card', i18nKey: 'uimpFormatNote' },
          { value: 'nodes', label: 'Individual Concept Nodes', i18nKey: 'uimpFormatNodes' }
        ];
    }
  }

  function _renderOutputFormats() {
    const wrap = document.getElementById('uimp-output-format-wrap');
    if (!wrap) return;

    const isBoard = (_state.host === 'board');

    let formatHtml = '';
    if (_state.host === 'document-editor') {
      formatHtml = `
        <div style="display:flex; align-items:center; gap:6px;">
          <label style="font-size:0.75rem; font-weight:800; color:#475569;" data-i18n="uimpFormatLabel">Format:</label>
          <select id="uimp-output-format-select" class="uimp-select" style="padding:4px 6px; font-size:0.78rem;" onchange="UniversalImporter._onFormatChange()">
            <option value="md-table">Markdown Table</option>
            <option value="worksheet">Student Worksheet (MCQ/Blanks)</option>
            <option value="checklist">Task Checklist (- [ ])</option>
            <option value="blockquote">Callout Blockquote</option>
          </select>
        </div>
      `;
    } else {
      const boardFormats = _getBoardOutputFormatsForSubType(_state.activeSubType);
      const validFormats = boardFormats.map(f => f.value);
      if (!validFormats.includes(_state.outputFormat)) {
        _state.outputFormat = validFormats[0] || 'nodes';
      }

      const boardFormatOptionsHtml = boardFormats.map(opt => `
        <option value="${escHtml(opt.value)}" ${opt.value === _state.outputFormat ? 'selected' : ''} ${opt.i18nKey ? `data-i18n="${opt.i18nKey}"` : ''}>
          ${escHtml(opt.label)}
        </option>
      `).join('');

      formatHtml = `
        <div style="display:flex; align-items:center; gap:6px;">
          <label style="font-size:0.75rem; font-weight:800; color:#475569;" data-i18n="uimpFormatLabel">Format:</label>
          <select id="uimp-output-format-select" class="uimp-select" style="padding:4px 6px; font-size:0.78rem;" onchange="UniversalImporter._onFormatChange()">
            ${boardFormatOptionsHtml}
          </select>
        </div>
      `;
    }

    // Dynamic Database-Aware Field Options
    const fieldOptions = _getFieldOptionsForSubType(_state.activeSubType, _state.host);
    const validFieldValues = fieldOptions.map(o => o.value);
    if (!validFieldValues.includes(_state.importField)) {
      _state.importField = fieldOptions[0]?.value || 'title';
      if (['full', 'first', 'last', 'last_first'].includes(_state.importField)) {
        _state.nameDisplayMode = _state.importField;
      }
    }

    const fieldOptionsHtml = fieldOptions.map(opt => `
      <option value="${escHtml(opt.value)}" ${opt.value === _state.importField ? 'selected' : ''} ${opt.i18nKey ? `data-i18n="${opt.i18nKey}"` : ''}>
        ${escHtml(opt.label)}
      </option>
    `).join('');

    const fieldHtml = `
      <div style="display:flex; align-items:center; gap:6px;" id="uimp-field-select-wrap">
        <label style="font-size:0.75rem; font-weight:800; color:#475569;" data-i18n="uimpImportField">Field to Import:</label>
        <select id="uimp-field-select" class="uimp-select" style="padding:4px 6px; font-size:0.78rem;" onchange="UniversalImporter._onFieldChange()">
          ${fieldOptionsHtml}
        </select>
      </div>
    `;

    let placementHtml = '';
    if (isBoard) {
      placementHtml = `
        <div style="display:flex; align-items:center; gap:6px;">
          <label style="font-size:0.75rem; font-weight:800; color:#475569;" data-i18n="uimpPlacementLabel">Placement:</label>
          <select id="uimp-insert-placement-select" class="uimp-select" style="padding:4px 6px; font-size:0.78rem;">
            <option value="click" selected>At Click / Cursor Position</option>
            <option value="center">Center of Board View</option>
          </select>
        </div>
      `;
    }

    wrap.innerHTML = `
      ${formatHtml}
      ${fieldHtml}
      ${placementHtml}
    `;

    _updateFieldPreview();

    if (typeof window !== 'undefined' && window.i18n && typeof window.i18n.applyTranslations === 'function') {
      try { window.i18n.applyTranslations(); } catch (_) {}
    }
  }

  function _renderItemsList() {
    const listEl = document.getElementById('uimp-items-container');
    const counterEl = document.getElementById('uimp-counter-text');
    if (!listEl) return;

    const allRecords = _cache.recordsBySubType.get(_state.activeSubType) || [];
    const query = (_state.searchQuery || '').toLowerCase().trim();

    let filtered = allRecords.filter(item => {
      if (_state.fileFilter !== 'all' && item.fileSet !== _state.fileFilter) return false;
      if (_state.levelFilter && item.level !== _state.levelFilter) return false;
      if (_state.themeFilter && item.theme !== _state.themeFilter) return false;
      if (_state.starredOnly && !item.starred) return false;
      if (query) {
        const text = `${item.title} ${item.subtitle} ${item.theme} ${item.level} ${item.badge}`.toLowerCase();
        return text.includes(query);
      }
      return true;
    });

    _state.lastFilteredItems = filtered;

    if (counterEl) {
      counterEl.textContent = `${filtered.length} items available (${_state.selectedItems.size} selected)`;
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="uimp-empty-state">
          ${renderSvgIcon('search.svg')}
          <div>No records match the current filters.</div>
        </div>
      `;
      _updateFieldPreview();
      return;
    }

    const visible = filtered.slice(0, _state.displayLimit);
    let html = visible.map(item => {
      const isSelected = _state.selectedItems.has(item.id);
      return `
        <div class="uimp-card ${isSelected ? 'selected' : ''}" data-id="${escHtml(item.id)}" onclick="UniversalImporter.toggleItem('${escHtml(item.id)}')">
          <input type="checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); UniversalImporter.toggleItem('${escHtml(item.id)}')" />
          <div class="uimp-card-body">
            <div class="uimp-card-top">
              <span class="uimp-card-title">${escHtml(item.title)}</span>
              <div class="uimp-card-badges">
                ${item.level ? `<span class="uimp-badge uimp-badge-level">${escHtml(item.level)}</span>` : ''}
                ${item.theme ? `<span class="uimp-badge uimp-badge-theme">${escHtml(item.theme)}</span>` : ''}
                ${item.badge ? `<span class="uimp-badge uimp-badge-pos">${escHtml(item.badge)}</span>` : ''}
              </div>
            </div>
            ${item.subtitle ? `<div class="uimp-card-sub">${escHtml(item.subtitle)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    if (filtered.length > _state.displayLimit) {
      html += `
        <div class="uimp-load-more">
          <span style="font-size:0.8rem; font-weight:700; color:#475569;">Showing ${_state.displayLimit} of ${filtered.length} items</span>
          <button type="button" class="uimp-btn-sm" onclick="UniversalImporter.showMore()" style="font-weight:900;">Show More (+100)</button>
        </div>
      `;
    }

    listEl.innerHTML = html;
    _updateSelectedCounter();
    _updateFieldPreview();
  }


  function _updateSelectedCounter() {
    const totalEl = document.getElementById('uimp-total-selected-badge');
    if (totalEl) {
      const count = _state.selectedItems.size;
      totalEl.textContent = `${count} ${count === 1 ? 'item' : 'items'} selected`;
    }
  }

  // ---------------------------------------------------------------------------
  // Markdown Serializer Engine
  // ---------------------------------------------------------------------------
  function toMarkdown(items, format = 'md-table', options = {}) {
    if (!Array.isArray(items) || items.length === 0) return '';

    const importField = options.importField || 'title';
    const nameMode = options.nameDisplayMode || 'full';

    if (format === 'checklist') {
      return items.map(it => {
        const lineText = getItemText(it, importField, nameMode);
        return `- [ ] **${lineText}**`;
      }).join('\n') + '\n';
    }

    if (format === 'blockquote') {
      return items.map(it => {
        if (importField === 'subtitle') {
          return `> *${it.subtitle || it.title}*\n`;
        } else if (importField === 'title') {
          const t = getItemText(it, 'title', nameMode);
          return `> **${t}**\n`;
        } else {
          const t = getItemText(it, 'title', nameMode);
          return `> **${t}**\n> *${it.subtitle}*\n`;
        }
      }).join('\n') + '\n';
    }

    if (format === 'worksheet') {
      return items.map((it, idx) => {
        const titleText = getItemText(it, 'title', nameMode);
        let block = `### Exercise ${idx + 1}: ${titleText}\n`;
        if (it.raw?.options && Array.isArray(it.raw.options)) {
          const letters = ['A', 'B', 'C', 'D', 'E'];
          block += it.raw.options.map((opt, i) => `- **${letters[i] || i + 1})** ${opt}`).join('\n') + '\n';
        } else if (it.subtitle) {
          block += `_${it.subtitle}_\n`;
        }
        return block;
      }).join('\n') + '\n';
    }

    // Default: Markdown Table
    if (importField === 'subtitle') {
      const headers = ['#', 'Details / Translation / Answer', 'Category / Theme', 'Level'];
      let md = `| ${headers.join(' | ')} |\n`;
      md += `| ${headers.map(() => '---').join(' | ')} |\n`;
      items.forEach((it, idx) => {
        const row = [
          idx + 1,
          (it.subtitle || it.title || '').replace(/\|/g, '\\|'),
          (it.theme || '').replace(/\|/g, '\\|'),
          (it.level || '').replace(/\|/g, '\\|')
        ];
        md += `| ${row.join(' | ')} |\n`;
      });
      return md + '\n';
    } else if (importField === 'title') {
      const headers = ['#', 'Item / Title', 'Category / Theme', 'Level'];
      let md = `| ${headers.join(' | ')} |\n`;
      md += `| ${headers.map(() => '---').join(' | ')} |\n`;
      items.forEach((it, idx) => {
        const t = getItemText(it, 'title', nameMode);
        const row = [
          idx + 1,
          (t || '').replace(/\|/g, '\\|'),
          (it.theme || '').replace(/\|/g, '\\|'),
          (it.level || '').replace(/\|/g, '\\|')
        ];
        md += `| ${row.join(' | ')} |\n`;
      });
      return md + '\n';
    } else {
      const headers = ['#', 'Title / Item', 'Details / Translation', 'Category / Theme', 'Level'];
      let md = `| ${headers.join(' | ')} |\n`;
      md += `| ${headers.map(() => '---').join(' | ')} |\n`;
      items.forEach((it, idx) => {
        const t = getItemText(it, 'title', nameMode);
        const row = [
          idx + 1,
          (t || '').replace(/\|/g, '\\|'),
          (it.subtitle || '').replace(/\|/g, '\\|'),
          (it.theme || '').replace(/\|/g, '\\|'),
          (it.level || '').replace(/\|/g, '\\|')
        ];
        md += `| ${row.join(' | ')} |\n`;
      });
      return md + '\n';
    }
  }

  // ---------------------------------------------------------------------------
  // Direct Multi-Format Export Engine
  // ---------------------------------------------------------------------------
  const EXPORT_FORMATS = [
    { id: 'html', label: 'HTML (Editable)', icon: 'file-text.svg' },
    { id: 'html-filter', label: 'HTML (Filterable)', icon: 'search.svg' },
    { id: 'pdf', label: 'Print PDF', icon: 'printer.svg' },
    { id: 'md', label: 'Markdown (.MD)', icon: 'document-editor.svg' },
    { id: 'csv', label: 'CSV File', icon: 'download.svg' },
    { id: 'xlsx', label: 'Excel (.XLSX)', icon: 'table.svg' },
    { id: 'docx', label: 'Word (.DOCX)', icon: 'document-editor.svg' }
  ];

  let _selectedExportFormat = 'html';

  function openExportDialog() {
    const dialog = document.getElementById('uimp-export-dialog');
    const container = document.getElementById('uimp-export-formats-container');
    const countEl = document.getElementById('uimp-export-selected-count');
    if (!dialog || !container) return;

    const count = _state.selectedItems.size;
    if (count === 0) {
      if (typeof window.showToast === 'function') window.showToast('Please select at least one item to export.', true);
      return;
    }

    if (countEl) countEl.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;

    container.innerHTML = EXPORT_FORMATS.map(f => `
      <div class="uimp-format-card ${f.id === _selectedExportFormat ? 'selected' : ''}" onclick="UniversalImporter._setExportFormat('${f.id}')">
        ${renderSvgIcon(f.icon)}
        <span>${escHtml(f.label)}</span>
      </div>
    `).join('');

    dialog.classList.add('active');
  }

  function closeExportDialog() {
    const dialog = document.getElementById('uimp-export-dialog');
    if (dialog) dialog.classList.remove('active');
  }

  async function executeExport() {
    const allRecords = _cache.recordsBySubType.get(_state.activeSubType) || [];
    const selected = allRecords.filter(it => _state.selectedItems.has(it.id));
    if (selected.length === 0) return;

    closeExportDialog();

    const format = _selectedExportFormat;
    const baseName = `export_${_state.activeSubType}_${Date.now()}`;
    const nameMode = _state.nameDisplayMode || 'full';
    const importField = _state.importField || 'title';

    if (format === 'md') {
      const content = toMarkdown(selected, 'md-table', { importField, nameDisplayMode: nameMode });
      if (window.Desktop && typeof window.Desktop.saveText === 'function') {
        const res = await window.Desktop.saveText('doceditor', `${baseName}.md`, content).catch(() => null);
        const savedPath = res?.path || `${baseName}.md`;
        if (typeof window.showExportSuccessPopup === 'function') {
          window.showExportSuccessPopup(savedPath, `${baseName}.md`);
        }
      }
    } else if (format === 'csv') {
      let csv = 'Index,ID,Title,Subtitle,Theme,Level,Badge\n';
      selected.forEach((it, idx) => {
        const titleText = getItemText(it, importField, nameMode);
        csv += `"${idx + 1}","${(it.id || '').replace(/"/g, '""')}","${(titleText || '').replace(/"/g, '""')}","${(it.subtitle || '').replace(/"/g, '""')}","${(it.theme || '').replace(/"/g, '""')}","${(it.level || '').replace(/"/g, '""')}","${(it.badge || '').replace(/"/g, '""')}"\n`;
      });
      if (window.Desktop && typeof window.Desktop.saveText === 'function') {
        const res = await window.Desktop.saveText('user', `${baseName}.csv`, csv).catch(() => null);
        const savedPath = res?.path || `${baseName}.csv`;
        if (typeof window.showExportSuccessPopup === 'function') {
          window.showExportSuccessPopup(savedPath, `${baseName}.csv`);
        }
      }
    } else if (format === 'html' || format === 'html-filter' || format === 'pdf') {
      const subTypeName = SUB_SOURCES.find(s => s.id === _state.activeSubType)?.label || _state.activeSubType;
      const rowsHtml = selected.map((it, idx) => {
        const titleText = escHtml(getItemText(it, importField, nameMode));
        const subText = escHtml(it.subtitle || '');
        const themeText = escHtml(it.theme || '');
        const levelText = escHtml(it.level || '');
        const badgeText = escHtml(it.badge || '');
        return `
          <tr class="export-row" data-search="${escHtml((titleText + ' ' + subText + ' ' + themeText + ' ' + levelText).toLowerCase())}">
            <td class="col-num">${idx + 1}</td>
            <td class="col-title"><strong>${titleText}</strong>${subText ? `<div class="sub-text">${subText}</div>` : ''}</td>
            <td class="col-theme">${themeText ? `<span class="badge badge-theme">${themeText}</span>` : '—'}</td>
            <td class="col-level">${levelText ? `<span class="badge badge-level">${levelText}</span>` : '—'}</td>
            <td class="col-badge">${badgeText ? `<span class="badge badge-pos">${badgeText}</span>` : '—'}</td>
          </tr>
        `;
      }).join('\n');

      const filterBarHtml = (format === 'html-filter') ? `
        <div class="filter-controls no-print">
          <input type="search" id="export-search-input" class="search-input" placeholder="Live filter records..." oninput="filterExportTable(this.value)" />
          <span id="export-match-counter" class="match-counter">${selected.length} items</span>
        </div>
        <script>
          function filterExportTable(query) {
            const q = (query || '').toLowerCase().trim();
            const rows = document.querySelectorAll('.export-row');
            let count = 0;
            rows.forEach(r => {
              const text = r.getAttribute('data-search') || '';
              const match = !q || text.includes(q);
              r.style.display = match ? '' : 'none';
              if (match) count++;
            });
            const counter = document.getElementById('export-match-counter');
            if (counter) counter.textContent = count + ' of ${selected.length} items';
          }
        <\/script>
      ` : '';

      const printScript = (format === 'pdf') ? `<script>window.addEventListener('load', () => setTimeout(() => window.print(), 350));<\/script>` : '';

      const htmlDocument = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(subTypeName)} Export (${selected.length} items)</title>
  <style>
    :root {
      --bg: #f5f5f0;
      --card-bg: #ffffff;
      --text: #1e293b;
      --border: #333333;
      --shadow: 3px 3px 0 #555555;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Lexend', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 24px;
    }
    .export-container {
      max-width: 1040px;
      margin: 0 auto;
      background: var(--card-bg);
      border: 2px solid var(--border);
      border-radius: 10px;
      box-shadow: var(--shadow);
      padding: 24px;
    }
    .export-header {
      border-bottom: 2px solid var(--border);
      padding-bottom: 16px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .export-title {
      font-size: 1.45rem;
      font-weight: 900;
      margin: 0;
      color: #0f172a;
    }
    .export-meta {
      font-size: 0.85rem;
      font-weight: 700;
      color: #64748b;
    }
    .filter-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .search-input {
      padding: 8px 14px;
      font-size: 0.88rem;
      font-weight: 700;
      border: 2px solid var(--border);
      border-radius: 6px;
      width: 100%;
      max-width: 320px;
      outline: none;
    }
    .search-input:focus {
      box-shadow: 2px 2px 0 #555555;
    }
    .match-counter {
      font-size: 0.82rem;
      font-weight: 800;
      color: #475569;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }
    .data-table th, .data-table td {
      border: 1.5px solid #e2e8f0;
      padding: 10px 12px;
      text-align: left;
      vertical-align: top;
    }
    .data-table th {
      background: #f1f5f9;
      font-weight: 800;
      color: #334155;
      border-bottom: 2px solid var(--border);
    }
    .col-num { width: 44px; text-align: center; font-weight: 800; color: #94a3b8; }
    .col-title { font-weight: 600; }
    .sub-text { font-size: 0.78rem; font-weight: 500; color: #64748b; margin-top: 4px; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      font-size: 0.74rem;
      font-weight: 800;
      border-radius: 4px;
      border: 1.5px solid var(--border);
    }
    .badge-theme { background: #dbeafe; color: #1e40af; }
    .badge-level { background: #fef3c7; color: #92400e; }
    .badge-pos { background: #dcfce7; color: #166534; }
    @media print {
      body { background: #fff; padding: 0; }
      .export-container { border: none; box-shadow: none; padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="export-container">
    <div class="export-header">
      <div>
        <h1 class="export-title">${escHtml(subTypeName)}</h1>
        <div class="export-meta">Class Management Tools • Exported ${new Date().toLocaleDateString()}</div>
      </div>
      <div class="export-meta"><strong>${selected.length} items</strong></div>
    </div>
    ${filterBarHtml}
    <table class="data-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Item / Title</th>
          <th>Theme / Category</th>
          <th>Level</th>
          <th>Details / Points</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </div>
  ${printScript}
</body>
</html>`;

      const fileName = `${baseName}.html`;
      if (window.Desktop && typeof window.Desktop.saveText === 'function') {
        const res = await window.Desktop.saveText('doceditor', fileName, htmlDocument).catch(() => null);
        const savedPath = res?.path || fileName;
        if (typeof window.showExportSuccessPopup === 'function') {
          window.showExportSuccessPopup(savedPath, fileName);
        }
      }
    } else if (format === 'xlsx') {
      if (typeof window !== 'undefined' && window.XLSX) {
        const headers = ['#', 'ID', 'Title', 'Subtitle', 'Theme', 'Level', 'Badge'];
        const data = [headers];
        selected.forEach((it, idx) => {
          const titleText = getItemText(it, importField, nameMode);
          data.push([
            idx + 1,
            it.id || '',
            titleText || '',
            it.subtitle || '',
            it.theme || '',
            it.level || '',
            it.badge || ''
          ]);
        });
        const ws = window.XLSX.utils.aoa_to_sheet(data);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, 'Export');
        const wbout = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        if (window.Desktop && typeof window.Desktop.saveBlob === 'function') {
          const res = await window.Desktop.saveBlob('user', `${baseName}.xlsx`, blob).catch(() => null);
          const savedPath = res?.path || `${baseName}.xlsx`;
          if (typeof window.showExportSuccessPopup === 'function') {
            window.showExportSuccessPopup(savedPath, `${baseName}.xlsx`);
          }
        }
      } else {
        // Fallback to CSV if XLSX engine is not loaded
        let csv = 'Index,ID,Title,Subtitle,Theme,Level,Badge\n';
        selected.forEach((it, idx) => {
          const titleText = getItemText(it, importField, nameMode);
          csv += `"${idx + 1}","${(it.id || '').replace(/"/g, '""')}","${(titleText || '').replace(/"/g, '""')}","${(it.subtitle || '').replace(/"/g, '""')}","${(it.theme || '').replace(/"/g, '""')}","${(it.level || '').replace(/"/g, '""')}","${(it.badge || '').replace(/"/g, '""')}"\n`;
        });
        if (window.Desktop && typeof window.Desktop.saveText === 'function') {
          const res = await window.Desktop.saveText('user', `${baseName}.csv`, csv).catch(() => null);
          const savedPath = res?.path || `${baseName}.csv`;
          if (typeof window.showExportSuccessPopup === 'function') {
            window.showExportSuccessPopup(savedPath, `${baseName}.csv`);
          }
        }
      }
    } else {
      if (typeof window.showToast === 'function') {
        window.showToast(`Exported ${selected.length} items to ${format.toUpperCase()}`);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Public Interface & Actions
  // ---------------------------------------------------------------------------
  return {
    getItemUrn,

    async open(options = {}) {
      _state.host = options.host || 'board';
      _state.hostUrn = options.hostUrn || null;
      _state.autoLink = options.autoLink !== false;
      _state.activeDomain = options.initialDomain || 'learning';
      _state.activeSubType = options.initialSubType || (options.initialDomain === 'class' ? 'roster' : (options.initialDomain === 'grades' ? 'grades-term' : 'wordbanks'));
      if (options.initialSubType) {
        const found = SUB_SOURCES.find(s => s.id === options.initialSubType);
        if (found && found.domain) _state.activeDomain = found.domain;
      }
      _state.classContext = options.classContext || null;
      _state.insertPosition = options.insertPosition || null;
      _state.onInsertCallback = typeof options.onInsert === 'function' ? options.onInsert : null;
      _state.selectedItems.clear();
      _state.displayLimit = 100;
      _state.searchQuery = '';
      _state.starredOnly = false;

      _ensureModalDom();
      const overlay = document.getElementById('universal-importer-overlay');
      if (overlay) overlay.classList.add('active');

      const autolinkCb = document.getElementById('uimp-autolink-checkbox');
      if (autolinkCb) autolinkCb.checked = _state.autoLink;
      const searchInput = document.getElementById('uimp-filter-search');
      if (searchInput) searchInput.value = '';
      const starredCb = document.getElementById('uimp-filter-starred');
      if (starredCb) starredCb.checked = false;

      await _loadAllData();

      _renderDomainTabs();
      _renderSubtypePills();
      _renderFilterOptions();
      _renderOutputFormats();
      _renderItemsList();
    },

    close() {
      const overlay = document.getElementById('universal-importer-overlay');
      if (overlay) overlay.classList.remove('active');
    },

    async switchDomain(domainId) {
      if (!_cache.loaded) {
        await _loadAllData();
      }
      _state.activeDomain = domainId;
      const subTypes = SUB_SOURCES.filter(s => s.domain === domainId);
      _state.activeSubType = subTypes[0]?.id || 'wordbanks';
      _state.fileFilter = 'all';
      _state.levelFilter = '';
      _state.themeFilter = '';
      _state.searchQuery = '';
      _state.starredOnly = false;
      _state.displayLimit = 100;
      _state.selectedItems.clear();

      const searchInput = document.getElementById('uimp-filter-search');
      if (searchInput) searchInput.value = '';
      const starredCb = document.getElementById('uimp-filter-starred');
      if (starredCb) starredCb.checked = false;

      _renderDomainTabs();
      _renderSubtypePills();
      _renderFilterOptions();
      _renderOutputFormats();
      _renderItemsList();
      _updateFieldPreview();
    },

    async switchSubType(subTypeId) {
      _ensureModalDom();
      const overlay = document.getElementById('universal-importer-overlay');
      if (overlay && !overlay.classList.contains('active')) {
        overlay.classList.add('active');
      }

      // If data is not loaded yet or if target subType currently has 0 records cached, force refresh
      const cachedRecords = _cache.recordsBySubType.get(subTypeId);
      if (!_cache.loaded || !cachedRecords || cachedRecords.length === 0) {
        await _loadAllData(true);
      }

      // Synchronize domain tab if switching to a subType from another domain (e.g. roster in class domain)
      const subDef = SUB_SOURCES.find(s => s.id === subTypeId);
      if (subDef && subDef.domain) {
        _state.activeDomain = subDef.domain;
      }

      _state.activeSubType = subTypeId;
      _state.fileFilter = 'all';
      _state.levelFilter = '';
      _state.themeFilter = '';
      _state.searchQuery = '';
      _state.starredOnly = false;
      _state.displayLimit = 100;
      _state.selectedItems.clear();

      const searchInput = document.getElementById('uimp-filter-search');
      if (searchInput) searchInput.value = '';
      const starredCb = document.getElementById('uimp-filter-starred');
      if (starredCb) starredCb.checked = false;

      _renderDomainTabs();
      _renderSubtypePills();
      _renderFilterOptions();
      _renderOutputFormats();
      _renderItemsList();
      _updateFieldPreview();
    },

    toggleItem(itemId) {
      if (_state.selectedItems.has(itemId)) {
        _state.selectedItems.delete(itemId);
      } else {
        _state.selectedItems.add(itemId);
      }
      const card = document.querySelector(`.uimp-card[data-id="${CSS.escape(itemId)}"]`);
      if (card) {
        const isSel = _state.selectedItems.has(itemId);
        card.classList.toggle('selected', isSel);
        const cb = card.querySelector('input[type="checkbox"]');
        if (cb) cb.checked = isSel;
      }
      _updateSelectedCounter();
      _updateFieldPreview();
    },

    selectAll(select) {
      _state.lastFilteredItems.forEach(item => {
        if (select) _state.selectedItems.add(item.id);
        else _state.selectedItems.delete(item.id);
      });
      _renderItemsList();
      _updateFieldPreview();
    },

    invertSelection() {
      _state.lastFilteredItems.forEach(item => {
        if (_state.selectedItems.has(item.id)) _state.selectedItems.delete(item.id);
        else _state.selectedItems.add(item.id);
      });
      _renderItemsList();
      _updateFieldPreview();
    },

    showMore() {
      _state.displayLimit += 100;
      _renderItemsList();
    },

    _onFilterChange(triggerSource = 'all') {
      const setSelect = document.getElementById('uimp-filter-fileset');
      const lvlSelect = document.getElementById('uimp-filter-level');
      const thmSelect = document.getElementById('uimp-filter-theme');
      const starCb = document.getElementById('uimp-filter-starred');

      if (triggerSource === 'fileset' && setSelect) {
        _state.fileFilter = setSelect.value || 'all';
        _renderFilterOptions(); // Re-calculates and re-renders cascaded Levels and Themes
      } else if (triggerSource === 'level' && lvlSelect) {
        _state.levelFilter = lvlSelect.value || '';
        _renderFilterOptions(); // Re-calculates and re-renders cascaded Themes
      } else if (triggerSource === 'theme' && thmSelect) {
        _state.themeFilter = thmSelect.value || '';
      } else {
        _state.fileFilter = setSelect ? setSelect.value : 'all';
        _state.levelFilter = lvlSelect ? lvlSelect.value : '';
        _state.themeFilter = thmSelect ? thmSelect.value : '';
      }

      _state.starredOnly = starCb ? !!starCb.checked : false;
      _state.displayLimit = 100;

      _renderItemsList();
      _updateFieldPreview();
    },

    _onSearchInput(val) {
      clearTimeout(_searchDebounceTimer);
      _searchDebounceTimer = setTimeout(() => {
        _state.searchQuery = val || '';
        _state.displayLimit = 100;
        _renderItemsList();
        _updateFieldPreview();
      }, 180);
    },

    openExportDialog,
    closeExportDialog,
    _setExportFormat(fmtId) {
      _selectedExportFormat = fmtId;
      document.querySelectorAll('.uimp-format-card').forEach(c => c.classList.remove('selected'));
      const activeCard = Array.from(document.querySelectorAll('.uimp-format-card')).find(c => c.textContent.includes(fmtId));
      if (activeCard) activeCard.classList.add('selected');
    },
    executeExport,

    toMarkdown,

    async confirmInsert() {
      const allRecords = _cache.recordsBySubType.get(_state.activeSubType) || [];
      const selected = allRecords.filter(it => _state.selectedItems.has(it.id));

      if (selected.length === 0) {
        if (typeof window.showToast === 'function') window.showToast('Please select at least one item.', true);
        return;
      }

      const formatSel = document.getElementById('uimp-output-format-select');
      const placementSel = document.getElementById('uimp-insert-placement-select');
      const fieldSel = document.getElementById('uimp-field-select');
      const chosenFormat = formatSel ? formatSel.value : 'default';
      const insertPlacement = placementSel ? placementSel.value : 'click';
      const rawChosenField = fieldSel ? fieldSel.value : (_state.importField || 'title');

      let importField = rawChosenField;
      let nameDisplayMode = _state.nameDisplayMode || 'full';
      if (['full', 'first', 'last', 'last_first'].includes(rawChosenField)) {
        nameDisplayMode = rawChosenField;
        importField = 'title';
      }

      const autolinkCb = document.getElementById('uimp-autolink-checkbox');
      const autoLinkEnabled = autolinkCb ? autolinkCb.checked : _state.autoLink;

      // Automatic Link Graph Registration
      if (autoLinkEnabled && typeof window !== 'undefined' && window.LinksService) {
        try {
          for (const item of selected) {
            const itemUrn = getItemUrn(item);
            item.urn = itemUrn;

            await window.LinksService.registerEntity(itemUrn, {
              title: item.title,
              subtitle: item.subtitle,
              type: item.subType,
              domain: item.domain,
              badge: item.badge
            });

            if (_state.hostUrn) {
              await window.LinksService.addLink(_state.hostUrn, itemUrn, {
                relation: 'contains',
                source: _state.host,
                timestamp: Date.now()
              });
            }
          }
        } catch (err) {
          console.warn('[UniversalImporter] Link graph auto-linking notice:', err);
        }
      }

      if (typeof _state.onInsertCallback === 'function') {
        _state.onInsertCallback(selected, chosenFormat, {
          domain: _state.activeDomain,
          subType: _state.activeSubType,
          importField,
          nameDisplayMode,
          insertPlacement,
          insertPos: _state.insertPosition,
          hostUrn: _state.hostUrn,
          autoLink: autoLinkEnabled
        });
      }

      UniversalImporter.close();
    },

    _onFieldChange() {
      const fieldSel = document.getElementById('uimp-field-select');
      if (fieldSel) {
        const val = fieldSel.value;
        if (['full', 'first', 'last', 'last_first'].includes(val)) {
          _state.nameDisplayMode = val;
          _state.importField = 'title';
        } else {
          _state.importField = val;
        }
        _updateFieldPreview();
      }
    },

    _onFormatChange() {
      const formatSel = document.getElementById('uimp-output-format-select');
      if (formatSel) {
        _state.outputFormat = formatSel.value;
      }
    },

    getItemText,
    formatStudentName
  };

}));


