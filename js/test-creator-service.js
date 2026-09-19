/**
 * Test Creator Service — Class Management Tools (CMT)
 *
 * Provides data modeling, exercise builders, points calculation, Group A/B variant generation,
 * student variant assignment (alternating, seating plan, manual matrix),
 * exercise database auto-saving, Grade Sheet evaluation serialization,
 * Competence Portfolio syncing, and multi-format exporters (HTML, Markdown, DOCX, Print/PDF).
 */

(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TestCreatorService = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var TestCreatorService = {};

  // ── 1. Default Subjects & Options ──────────────────────────────────────────
  TestCreatorService.DEFAULT_SUBJECTS = [
    { id: 'English', name: 'English', icon: 'book.svg', color: '#2563eb' },
    { id: 'French', name: 'French', icon: 'french.svg', color: '#7c3aed' },
    { id: 'Science', name: 'Science', icon: 'lightbulb.svg', color: '#d97706' },
    { id: 'Mathematics', name: 'Mathematics', icon: 'table.svg', color: '#059669' },
    { id: 'History', name: 'History', icon: 'flag.svg', color: '#dc2626' },
    { id: 'Geography', name: 'Geography', icon: 'flag.svg', color: '#0891b2' },
    { id: 'Art', name: 'Art', icon: 'award.svg', color: '#e11d48' },
    { id: 'Music', name: 'Music', icon: 'award.svg', color: '#9333ea' },
    { id: 'Physical Education', name: 'Physical Education', icon: 'award.svg', color: '#16a34a' },
    { id: 'Spanish', name: 'Spanish', icon: 'flag.svg', color: '#ea580c' },
    { id: 'German', name: 'German', icon: 'flag.svg', color: '#b45309' }
  ];

  TestCreatorService.DEFAULT_MATERIALS = [
    'Pen & Pencil only',
    'Bilingual Dictionary allowed',
    'Monolingual Dictionary allowed',
    'Scientific Calculator allowed',
    'Basic Calculator allowed',
    'Formula Sheet provided',
    'Open Book / Course Notes',
    'Rough Paper / Draft provided',
    'No electronic devices allowed'
  ];

  TestCreatorService.DEFAULT_SCALES = [
    { id: 'pts_20', name: 'French Scale (0 to 20)', max: 20 },
    { id: 'pts_100', name: 'Percentage (0 to 100%)', max: 100 },
    { id: 'pts_6', name: 'Swiss / German Scale (1 to 6)', max: 6 },
    { id: 'letter_af', name: 'Letter Grades (A+ to F)', max: 100 },
    { id: 'pts_total', name: 'Exact Points Total', max: 0 }
  ];

  // ── 2. Supported Exercise Types ───────────────────────────────────────────
  TestCreatorService.EXERCISE_TYPES = [
    { id: 'cloze', name: 'Cloze / Gap Fill', icon: 'gapfill.svg', desc: 'Fill in the missing words or phrases' },
    { id: 'mcq', name: 'Multiple Choice (MCQ)', icon: 'quiz.svg', desc: 'Single or multiple correct answers' },
    { id: 'open_question', name: 'Open Question', icon: 'file-text.svg', desc: 'Short or long answer with lines or grid' },
    { id: 'composition', name: 'Composition / Essay', icon: 'document-editor.svg', desc: 'Writing prompt with word count & rubric' },
    { id: 'matching', name: 'Matching / Pairing', icon: 'merge.svg', desc: 'Connect Column A items to Column B' },
    { id: 'transformation', name: 'Sentence Transformation', icon: 'refresh.svg', desc: 'Rewrite sentence using a clue keyword' },
    { id: 'translation', name: 'Translation', icon: 'book.svg', desc: 'Translate sentences or short texts' },
    { id: 'picture_description', name: 'Picture Description', icon: 'board.svg', desc: 'Analyze or describe an embedded image' },
    { id: 'table_completion', name: 'Table Completion', icon: 'table.svg', desc: 'Interactive grid with fillable blank cells' },
    { id: 'odd_one_out', name: 'Odd One Out', icon: 'clear.svg', desc: 'Identify the intruder and justify choice' },
    { id: 'reading_comprehension', name: 'Reading Comprehension', icon: 'book.svg', desc: 'Source passage followed by sub-questions' }
  ];

  // ── 2b. Default Header Configuration & Typography ─────────────────────────
  TestCreatorService.DEFAULT_HEADER_CONFIG = {
    // Visibility
    showTitle: true,
    showSubtitle: false,
    subtitleText: '',
    showStudentName: true,
    showClass: true,
    showDate: true,
    showTeacher: true,
    showDuration: true,
    showMaterials: true,
    showScope: true,
    showTotalPoints: true,
    showVariantBadge: true,
    showInstructions: false,
    instructionsText: 'Answer all questions clearly. Write legibly and respect time constraints.',
    // Custom labels
    studentNameLabel: 'Student Name:',
    classLabel: 'Class / Group:',
    dateLabel: 'Date:',
    teacherLabel: 'Teacher:',
    durationLabel: 'Duration:',
    materialsLabel: 'Materials Allowed:',
    scopeLabel: 'Scope / Topic:',
    pointsLabel: 'Total Points:',
    // Section and metadata ordering
    sectionOrder: ['title', 'subtitle', 'metadata', 'instructions'],
    metaOrder: ['studentName', 'class', 'date', 'teacher', 'duration', 'materials', 'scope', 'points'],
    // Formats & typography per element: { bold, italic, underline, uppercase, size, align }
    titleStyle: { bold: true, italic: false, underline: false, uppercase: true, size: '18pt', align: 'left' },
    subtitleStyle: { bold: false, italic: true, underline: false, size: '11pt', align: 'left' },
    studentNameStyle: { bold: true, italic: false, underline: false, lineStyle: 'line' }, // 'line' | 'dotted' | 'box'
    classStyle: { bold: true, italic: false, underline: false },
    dateStyle: { bold: true, italic: false, underline: false },
    teacherStyle: { bold: true, italic: false, underline: false },
    durationStyle: { bold: true, italic: false, underline: false },
    materialsStyle: { bold: true, italic: false, underline: false, displayMode: 'inline' }, // 'inline' | 'badges'
    scopeStyle: { bold: true, italic: false, underline: false },
    pointsStyle: { bold: true, italic: false, underline: false },
    instructionsStyle: { bold: false, italic: true, underline: false, border: 'box' }, // 'box' | 'quote' | 'tint'
    // Header box layout & border
    layout: '3-columns', // '3-columns' | '2-columns' | 'compact' | 'table'
    borderStyle: 'double', // 'double' | 'neobrutalist' | 'solid' | 'dashed' | 'minimal' | 'none'
    backgroundTint: 'ivory', // 'white' | 'ivory' | 'light_gray'
    padding: 'standard' // 'compact' | 'standard' | 'spacious'
  };

  // ── 2b2. Universal Multi-Unit Dimension Parser ────────────────────────────
  TestCreatorService.parseUnitValue = function (val, defaultUnit) {
    var defUnit = defaultUnit || 'px';
    if (val === undefined || val === null || val === '') {
      return { value: '', unit: defUnit, css: '' };
    }
    if (typeof val === 'number') {
      return { value: val, unit: defUnit, css: val + defUnit };
    }
    var s = String(val).trim();
    if (!s) return { value: '', unit: defUnit, css: '' };
    var m = s.match(/^([+-]?(?:\d*\.)?\d+)\s*(px|pt|cm|mm|em|rem|in|%)?$/i);
    if (m) {
      var num = parseFloat(m[1]);
      var u = m[2] ? m[2].toLowerCase() : defUnit;
      return { value: num, unit: u, css: num + u };
    }
    return { value: parseFloat(s) || 0, unit: defUnit, css: s };
  };

  TestCreatorService.ensureHeaderConfig = function (test) {
    if (!test) return JSON.parse(JSON.stringify(TestCreatorService.DEFAULT_HEADER_CONFIG));
    if (!test.headerConfig || typeof test.headerConfig !== 'object') {
      test.headerConfig = {};
    }
    var hc = test.headerConfig;
    var d = TestCreatorService.DEFAULT_HEADER_CONFIG;
    for (var k in d) {
      if (d.hasOwnProperty(k)) {
        if (hc[k] === undefined) {
          if (Array.isArray(d[k])) {
            hc[k] = d[k].slice();
          } else if (typeof d[k] === 'object' && d[k] !== null) {
            hc[k] = Object.assign({}, d[k]);
          } else {
            hc[k] = d[k];
          }
        } else if (Array.isArray(d[k])) {
          if (!Array.isArray(hc[k])) {
            hc[k] = d[k].slice();
          } else {
            d[k].forEach(function (item) {
              if (hc[k].indexOf(item) === -1) hc[k].push(item);
            });
          }
        } else if (typeof d[k] === 'object' && d[k] !== null) {
          hc[k] = Object.assign({}, d[k], hc[k]);
        }
      }
    }
    return hc;
  };

  // ── 2c. Safe Rich Text Formatting Parser ──────────────────────────────────
  TestCreatorService.formatRichText = function (str) {
    if (str === undefined || str === null) return '';
    var s = String(str);
    if (!s) return '';

    // Tokenize allowed safe inline HTML tags & styles before escaping
    var tokenMap = {};
    var tokenCounter = 0;
    function makeToken(htmlChunk) {
      var key = '___TCR_TAG_' + (tokenCounter++) + '___';
      tokenMap[key] = htmlChunk;
      return key;
    }

    // Preserve <br>, <br/>, <br />
    s = s.replace(/<br\s*\/?>/gi, function () {
      return makeToken('<br>');
    });

    // Match safe HTML tags: <tag attr="..."> and </tag>
    var safeTagPattern = /<\/?(b|strong|i|em|u|ins|s|del|strike|sub|sup|mark|small|code|kbd|var|abbr|span|font)(\s+[^>]*)?>/gi;
    s = s.replace(safeTagPattern, function (match, tagName, attrs) {
      var isClosing = match.charAt(1) === '/';
      var tagLower = tagName.toLowerCase();
      if (isClosing) {
        return makeToken('</' + tagLower + '>');
      }
      // Sanitize attributes if opening tag
      var sanitizedAttrs = '';
      if (attrs) {
        var attrList = [];
        // Match style="..."
        var styleMatch = attrs.match(/\bstyle\s*=\s*(["'])(.*?)\1/i);
        if (styleMatch) {
          var cleanStyle = styleMatch[2]
            .replace(/javascript\s*:/gi, '')
            .replace(/expression\s*\(/gi, '')
            .replace(/url\s*\(/gi, '')
            .replace(/"/g, '&quot;');
          attrList.push('style="' + cleanStyle + '"');
        }
        // Match class="..."
        var classMatch = attrs.match(/\bclass\s*=\s*(["'])(.*?)\1/i);
        if (classMatch) {
          var cleanClass = classMatch[2].replace(/[^a-zA-Z0-9_\-\s]/g, '');
          attrList.push('class="' + cleanClass + '"');
        }
        // Match color="..." (font tag)
        var colorMatch = attrs.match(/\bcolor\s*=\s*(["'])(.*?)\1/i);
        if (colorMatch) {
          var cleanCol = colorMatch[2].replace(/[^a-zA-Z0-9#,\(\)\.\s]/g, '');
          attrList.push('color="' + cleanCol + '"');
        }
        // Match face="..."
        var faceMatch = attrs.match(/\bface\s*=\s*(["'])(.*?)\1/i);
        if (faceMatch) {
          var cleanFace = faceMatch[2].replace(/[^a-zA-Z0-9,\-\s]/g, '');
          attrList.push('face="' + cleanFace + '"');
        }
        // Match size="..."
        var sizeMatch = attrs.match(/\bsize\s*=\s*(["'])(.*?)\1/i);
        if (sizeMatch) {
          var cleanSize = sizeMatch[2].replace(/[^a-zA-Z0-9\-\+]/g, '');
          attrList.push('size="' + cleanSize + '"');
        }
        // Match title="..."
        var titleMatch = attrs.match(/\btitle\s*=\s*(["'])(.*?)\1/i);
        if (titleMatch) {
          var cleanTitle = titleMatch[2].replace(/"/g, '&quot;').replace(/</g, '&lt;');
          attrList.push('title="' + cleanTitle + '"');
        }
        if (attrList.length > 0) {
          sanitizedAttrs = ' ' + attrList.join(' ');
        }
      }
      return makeToken('<' + tagLower + sanitizedAttrs + '>');
    });

    // Escape any remaining raw <, >, &, " for safety
    s = s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    // Markdown Bold: **bold** or __bold__
    s = s.replace(/(\*\*|__)([\s\S]*?)\1/g, '<strong>$2</strong>');

    // Markdown Strikethrough: ~~strike~~
    s = s.replace(/~~([\s\S]*?)~~/g, '<del>$1</del>');

    // Markdown Highlight: ==mark==
    s = s.replace(/==([\s\S]*?)==/g, '<mark>$1</mark>');

    // Markdown Superscript: ^sup^
    s = s.replace(/\^([^\^\s]+)\^/g, '<sup>$1</sup>');

    // Markdown Subscript: ~sub~
    s = s.replace(/~([^~\s]+)~/g, '<sub>$1</sub>');

    // Markdown Italic: *italic* or _italic_
    s = s.replace(/(^|[^\*])\*([^\*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    s = s.replace(/(^|[^a-zA-Z0-9_])_([^_]+)_(?![a-zA-Z0-9_])/g, '$1<em>$2</em>');

    // Markdown Inline code: `code`
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Restore safe HTML tokens
    for (var k in tokenMap) {
      if (tokenMap.hasOwnProperty(k)) {
        s = s.replace(new RegExp(k, 'g'), tokenMap[k]);
      }
    }

    return s;
  };

  // ── 3. Factory Helpers ───────────────────────────────────────────────────
  function generateUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 't-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
  }

  TestCreatorService.createEmptyTest = function () {
    return {
      id: generateUUID(),
      title: '',
      subject: 'English',
      classId: '',
      className: '',
      teacher: '',
      date: new Date().toISOString().split('T')[0],
      durationMinutes: 45,
      scope: '',
      materialsAllowed: ['Pen & Pencil only'],
      headerConfig: JSON.parse(JSON.stringify(TestCreatorService.DEFAULT_HEADER_CONFIG)),
      scaleModelId: 'pts_20',
      targetPoints: 20,
      linkedCompetenceIds: [],
      tags: [],
      exportStyle: {
        fontSize: '11pt',
        lineHeight: 1.5,
        padding: '14px',
        numberedLines: false
      },
      exercises: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  };

  TestCreatorService.createEmptyExercise = function (type) {
    var ex = {
      id: generateUUID(),
      type: type || 'cloze',
      title: '',
      instructions: '',
      points: 2,
      pointsPerItem: 1,
      forcePageBreak: false,
      autoSaveToDb: false,
      linkedCompetenceIds: [],
      markingRubric: [], // [{ id, title, maxPoints, weight, comment }]
      answerKey: '',
      exportStyle: {
        fontSize: '',
        lineHeight: '',
        padding: '',
        numberedLines: null
      },
      options: {},
      content: {}
    };

    switch (ex.type) {
      case 'cloze':
        ex.title = 'Fill in the blanks';
        ex.instructions = 'Complete the sentences with the missing words.';
        ex.content = {
          items: [
            { id: generateUUID(), text: 'The weather today is [sunny] and the sky is [blue].' }
          ],
          text: 'The weather today is [sunny] and the sky is [blue].',
          showWordBank: true,
          caseSensitive: false
        };
        ex.pointsPerItem = 1;
        ex.points = 2;
        break;

      case 'mcq':
        ex.title = 'Multiple Choice';
        ex.instructions = 'Choose the correct option for each question.';
        ex.content = {
          questions: [
            {
              id: generateUUID(),
              prompt: 'What is the capital of France?',
              options: ['Paris', 'London', 'Berlin', 'Madrid'],
              correctIndices: [0],
              points: 1
            }
          ]
        };
        ex.points = 1;
        break;

      case 'open_question':
        ex.title = 'Short Answer';
        ex.instructions = 'Answer the following question clearly and concisely.';
        ex.content = {
          items: [
            {
              id: generateUUID(),
              prompt: 'Explain the main cause of the event described in the lesson.',
              lineStyle: 'lines', // 'lines' | 'dotted' | 'grid' | 'box'
              lineCount: 4,
              sampleAnswer: '',
              points: 3
            }
          ],
          prompt: 'Explain the main cause of the event described in the lesson.',
          lineStyle: 'lines',
          lineCount: 4,
          sampleAnswer: ''
        };
        ex.points = 3;
        break;

      case 'composition':
        ex.title = 'Writing / Essay';
        ex.instructions = 'Write a well-structured essay respecting the guidelines below.';
        ex.content = {
          items: [
            {
              id: generateUUID(),
              label: 'Writing Task',
              prompt: 'Write a persuasive article on the importance of learning foreign languages.',
              targetWordCount: 150,
              minWordCount: 120,
              maxWordCount: 180,
              lineCount: 18,
              lineStyle: 'solid',
              lineHeight: 28,
              lineThickness: 1
            }
          ],
          prompt: 'Write a persuasive article on the importance of learning foreign languages.',
          targetWordCount: 150,
          minWordCount: 120,
          maxWordCount: 180,
          lineCount: 18,
          lineStyle: 'solid',
          lineHeight: 28,
          lineThickness: 1
        };
        ex.points = 10;
        ex.markingRubric = [
          { id: generateUUID(), title: 'Grammar & Syntax', maxPoints: 3, weight: 1 },
          { id: generateUUID(), title: 'Vocabulary Variety', maxPoints: 3, weight: 1 },
          { id: generateUUID(), title: 'Coherence & Structure', maxPoints: 2, weight: 1 },
          { id: generateUUID(), title: 'Task Completion', maxPoints: 2, weight: 1 }
        ];
        break;

      case 'matching':
        ex.title = 'Matching';
        ex.instructions = 'Match each item in Column A with its corresponding item in Column B.';
        ex.content = {
          pairs: [
            { id: generateUUID(), left: 'Bonjour', right: 'Hello' },
            { id: generateUUID(), left: 'Merci', right: 'Thank you' },
            { id: generateUUID(), left: 'Au revoir', right: 'Goodbye' }
          ]
        };
        ex.pointsPerItem = 1;
        ex.points = 3;
        break;

      case 'transformation':
      case 'sentence_transformation':
        ex.title = 'Sentence Transformation';
        ex.instructions = 'Complete the second sentence so that it has a similar meaning to the first, using the clue word in capitals.';
        ex.content = {
          items: [
            {
              id: generateUUID(),
              original: 'He started working here two years ago.',
              keyword: 'FOR',
              targetPrefix: 'He has worked here',
              targetSuffix: 'two years.',
              solution: 'for'
            }
          ]
        };
        ex.pointsPerItem = 1;
        ex.points = 1;
        break;

      case 'translation':
        ex.title = 'Translation';
        ex.instructions = 'Translate the following sentences into the target language.';
        ex.content = {
          items: [
            {
              id: generateUUID(),
              sourceText: 'Where is the nearest train station?',
              modelTranslation: 'Où se trouve la gare la plus proche ?',
              allocatedLines: 2
            }
          ]
        };
        ex.pointsPerItem = 2;
        ex.points = 2;
        break;

      case 'picture_description':
        ex.title = 'Picture Description';
        ex.instructions = 'Observe the image carefully and answer the questions below.';
        ex.content = {
          items: [
            {
              id: generateUUID(),
              imagePath: '',
              imageCaption: '',
              prompt: 'Describe the scene depicted in the image. Use at least 4 descriptive adjectives and 3 prepositions of place.',
              lineStyle: 'lines',
              lineCount: 8,
              modelAnswer: '',
              points: 4
            }
          ],
          imagePath: '',
          imageCaption: '',
          prompt: 'Describe the scene depicted in the image. Use at least 4 descriptive adjectives and 3 prepositions of place.',
          lineStyle: 'lines',
          lineCount: 8,
          modelAnswer: ''
        };
        ex.points = 4;
        break;

      case 'table_completion':
        ex.title = 'Table Completion';
        ex.instructions = 'Fill in the blank cells in the table below.';
        ex.content = {
          headers: ['Infinitive', 'Simple Past', 'Past Participle', 'Translation'],
          rows: [
            [
              { text: 'to speak', isBlank: false },
              { text: 'spoke', isBlank: false },
              { text: 'spoken', isBlank: true },
              { text: 'parler', isBlank: false }
            ],
            [
              { text: 'to write', isBlank: false },
              { text: 'wrote', isBlank: true },
              { text: 'written', isBlank: false },
              { text: 'écrire', isBlank: false }
            ]
          ]
        };
        ex.pointsPerItem = 1;
        ex.points = 2;
        break;

      case 'odd_one_out':
        ex.title = 'Odd One Out';
        ex.instructions = 'For each line, circle the intruder (the word that does not belong) and explain your reasoning.';
        ex.content = {
          items: [
            {
              id: generateUUID(),
              words: ['Apple', 'Banana', 'Carrot', 'Orange'],
              intruder: 'Carrot',
              justificationKey: 'Carrot is a vegetable while the others are fruits.',
              pointsIntruder: 1,
              pointsJustification: 1
            }
          ]
        };
        ex.points = 2;
        break;

      case 'reading_comprehension':
        ex.title = 'Reading Comprehension';
        ex.instructions = 'Read the passage carefully and answer the questions that follow.';
        ex.content = {
          passageTitle: 'The Discovery of Penicillin',
          passageText: 'In 1928, Alexander Fleming returned to his laboratory at St. Mary\'s Hospital in London after a holiday...',
          subQuestions: [
            {
              id: generateUUID(),
              prompt: 'In what year was penicillin discovered?',
              answerType: 'short',
              solution: '1928',
              points: 1
            },
            {
              id: generateUUID(),
              prompt: 'Who made this accidental breakthrough?',
              answerType: 'short',
              solution: 'Alexander Fleming',
              points: 1
            }
          ]
        };
        ex.points = 2;
        break;
    }

    TestCreatorService.ensureExerciseOptions(ex);
    return ex;
  };

  // ── 3a. Exercise Customisation Options Initializer ───────────────────────
  TestCreatorService.ensureExerciseOptions = function (ex) {
    if (!ex) return {};
    if (!ex.options || typeof ex.options !== 'object') {
      ex.options = {};
    }
    var o = ex.options;
    switch (ex.type) {
      case 'cloze':
        if (o.blankStyle === undefined) o.blankStyle = 'underline'; // 'underline' | 'bracketed_box' | 'length_dots'
        if (o.showFirstLetter === undefined) o.showFirstLetter = false;
        if (o.wordBankDistractors === undefined) o.wordBankDistractors = '';
        if (o.wordBankOrder === undefined) o.wordBankOrder = 'shuffled'; // 'shuffled' | 'alphabetical'
        break;

      case 'mcq':
        if (o.layout === undefined) o.layout = '2-columns'; // '2-columns' | '1-column' | 'inline'
        if (o.markerStyle === undefined) o.markerStyle = 'letters'; // 'letters' | 'checkbox' | 'circle' | 'numbers'
        if (o.shuffleOptions === undefined) o.shuffleOptions = false;
        break;

      case 'open_question':
        if (o.answerPrefix === undefined) o.answerPrefix = '';
        if (o.lengthGuidance === undefined) o.lengthGuidance = '';
        if (o.lineStyle === undefined) o.lineStyle = 'lines'; // 'lines' | 'dotted' | 'grid' | 'box'
        break;

      case 'composition':
        if (o.textGenre === undefined) o.textGenre = '';
        if (o.showGenreBadge === undefined) o.showGenreBadge = !!o.textGenre;
        if (o.showPrompts === undefined) o.showPrompts = true;
        if (o.showWritingLines === undefined) o.showWritingLines = true;
        if (o.showRubric === undefined) o.showRubric = true;
        if (o.wordCountMin === undefined) o.wordCountMin = 120;
        if (o.wordCountMax === undefined) o.wordCountMax = 180;
        if (o.lineStyle === undefined) o.lineStyle = 'solid'; // 'solid' | 'dashed' | 'dotted'
        if (o.lineHeight === undefined) o.lineHeight = 28; // in px
        if (o.lineThickness === undefined) o.lineThickness = 1; // in px
        if (o.showDraftBox === undefined) o.showDraftBox = false;
        if (o.draftStyle === undefined) o.draftStyle = 'box'; // 'box' | 'lines' | 'dotted' | 'grid'
        if (o.draftLines === undefined) o.draftLines = 6;
        if (o.draftHeight === undefined) o.draftHeight = 100;
        if (o.draftTitle === undefined) o.draftTitle = '';
        if (o.draftNote === undefined) o.draftNote = '';
        if (o.draftPlacement === undefined) o.draftPlacement = 'before'; // 'before' | 'after'
        if (o.showChecklist === undefined) o.showChecklist = false;
        if (o.checklistTitle === undefined) o.checklistTitle = '';
        if (o.checklistLayout === undefined) o.checklistLayout = 'inline'; // 'inline' | 'columns' | 'stacked'
        if (o.checklistItems === undefined) {
          o.checklistItems = [
            'Structure & Paragraphs',
            'Spelling & Verb Tenses',
            'Punctuation & Capitalization',
            'Word Count Verified'
          ];
        }
        if (!Array.isArray(o.componentOrder) || o.componentOrder.length === 0) {
          o.componentOrder = ['genreBadge', 'prompts', 'draftBox', 'writingLines', 'checklist', 'rubric'];
        }
        break;

      case 'matching':
        if (o.presentation === undefined) o.presentation = 'letter_boxes'; // 'letter_boxes' | 'connecting_lines' | 'table'
        if (o.colALabel === undefined) o.colALabel = 'Column A';
        if (o.colBLabel === undefined) o.colBLabel = 'Column B';
        if (o.distractors === undefined) o.distractors = '';
        break;

      case 'transformation':
      case 'sentence_transformation':
        if (o.wordConstraint === undefined) o.wordConstraint = 'Use between 2 and 5 words, including the word given.';
        if (o.allowContractionsNote === undefined) o.allowContractionsNote = true;
        if (o.keywordStyle === undefined) o.keywordStyle = 'capital_block'; // 'capital_block' | 'bracketed'
        break;

      case 'translation':
        if (o.direction === undefined) o.direction = 'English → French';
        if (o.showHints === undefined) o.showHints = true;
        if (o.lineStyle === undefined) o.lineStyle = 'lines';
        break;

      case 'picture_description':
        if (o.layout === undefined) o.layout = 'stacked'; // 'stacked' | 'side_by_side'
        if (o.imageSize === undefined) o.imageSize = 'medium'; // 'small' | 'medium' | 'large'
        if (o.targetVocab === undefined) o.targetVocab = '';
        if (o.figureLabel === undefined) o.figureLabel = 'Figure 1';
        break;

      case 'table_completion':
        if (o.tableStyle === undefined) o.tableStyle = 'grid'; // 'grid' | 'zebra' | 'scientific'
        if (o.textAlign === undefined) o.textAlign = 'left'; // 'left' | 'center'
        if (o.showWordBank === undefined) o.showWordBank = false;
        break;

      case 'odd_one_out':
        if (o.taskMode === undefined) o.taskMode = 'circle_and_justify'; // 'circle_and_justify' | 'circle_only' | 'cross_out'
        if (o.displayStyle === undefined) o.displayStyle = 'pill_chips'; // 'pill_chips' | 'plain_separated'
        break;

      case 'reading_comprehension':
        if (o.passageLayout === undefined) o.passageLayout = 'full_width'; // 'full_width' | 'two_columns'
        if (o.defaultLineCount === undefined) o.defaultLineCount = 2;
        if (o.vocabularyFootnotes === undefined) o.vocabularyFootnotes = '';
        break;
    }
    return o;
  };

  // ── 3b. Backward-Compatible Exercise Normalizer ──────────────────────────
  TestCreatorService.normalizeExerciseItems = function (ex) {
    if (!ex || !ex.content) return;
    if (ex.type === 'cloze') {
      if (!Array.isArray(ex.content.items) || ex.content.items.length === 0) {
        var txt = typeof ex.content.text === 'string' ? ex.content.text : 'The weather today is [sunny] and the sky is [blue].';
        ex.content.items = [{ id: generateUUID(), text: txt }];
      }
    } else if (ex.type === 'open_question') {
      if (!Array.isArray(ex.content.items) || ex.content.items.length === 0) {
        ex.content.items = [{
          id: generateUUID(),
          prompt: ex.content.prompt || ex.prompt || 'Answer the following question clearly and concisely.',
          lineStyle: ex.content.lineStyle || 'lines',
          lineCount: Number(ex.content.lineCount) || 4,
          sampleAnswer: ex.content.sampleAnswer || ex.expectedAnswer || '',
          points: Number(ex.points) || 3
        }];
      }
    } else if (ex.type === 'composition') {
      if (!Array.isArray(ex.content.items) || ex.content.items.length === 0) {
        ex.content.items = [{
          id: generateUUID(),
          label: 'Writing Task',
          prompt: ex.content.prompt || 'Write a well-structured essay respecting the guidelines below.',
          targetWordCount: Number(ex.content.targetWordCount) || 150,
          minWordCount: Number(ex.content.minWordCount) || 120,
          maxWordCount: Number(ex.content.maxWordCount) || 180,
          lineCount: Number(ex.content.lineCount) || 18,
          lineStyle: ex.content.lineStyle || 'lines'
        }];
      }
    } else if (ex.type === 'picture_description') {
      if (!Array.isArray(ex.content.items) || ex.content.items.length === 0) {
        ex.content.items = [{
          id: generateUUID(),
          imagePath: ex.content.imagePath || '',
          imageCaption: ex.content.imageCaption || '',
          prompt: ex.content.prompt || 'Describe the scene depicted in the image.',
          lineStyle: ex.content.lineStyle || 'lines',
          lineCount: Number(ex.content.lineCount) || 8,
          modelAnswer: ex.content.modelAnswer || '',
          points: Number(ex.points) || 4
        }];
      }
    } else if (ex.type === 'mcq') {
      if (!Array.isArray(ex.content.questions) || ex.content.questions.length === 0) {
        if (Array.isArray(ex.content.options) && ex.content.options.length > 0) {
          var opts = ex.content.options.map(function (o) { return typeof o === 'string' ? o : (o.text || ''); });
          var corrects = [];
          ex.content.options.forEach(function (o, idx) {
            if (o && (o.isCorrect || o.correct)) corrects.push(idx);
          });
          if (corrects.length === 0 && ex.content.correctIndex !== undefined) corrects.push(ex.content.correctIndex);
          ex.content.questions = [{
            id: generateUUID(),
            prompt: ex.content.prompt || ex.prompt || 'Choose the correct answer:',
            options: opts,
            correctIndices: corrects,
            points: Number(ex.points) || 1
          }];
        } else {
          ex.content.questions = [{
            id: generateUUID(),
            prompt: 'Choose the correct answer:',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndices: [0],
            points: 1
          }];
        }
      }
    } else if (ex.type === 'transformation' || ex.type === 'sentence_transformation') {
      if (!Array.isArray(ex.content.items) || ex.content.items.length === 0) {
        ex.content.items = [{
          id: generateUUID(),
          original: ex.content.original || ex.content.leadIn || 'He started working here two years ago.',
          keyword: ex.content.keyword || 'FOR',
          targetPrefix: ex.content.targetPrefix || ex.content.startOfSentence || 'He has worked here',
          targetSuffix: ex.content.targetSuffix || 'two years.',
          solution: ex.content.solution || ex.expectedAnswer || 'for'
        }];
      }
    } else if (ex.type === 'translation') {
      if (!Array.isArray(ex.content.items) || ex.content.items.length === 0) {
        ex.content.items = [{
          id: generateUUID(),
          sourceText: ex.content.sourceText || 'Where is the nearest train station?',
          modelTranslation: ex.content.modelTranslation || 'Où se trouve la gare la plus proche ?',
          allocatedLines: Number(ex.content.allocatedLines) || 2
        }];
      }
    } else if (ex.type === 'odd_one_out') {
      if (!Array.isArray(ex.content.items) || ex.content.items.length === 0) {
        ex.content.items = [{
          id: generateUUID(),
          words: ['Apple', 'Banana', 'Carrot', 'Orange'],
          intruder: 'Carrot',
          justificationKey: 'Carrot is a vegetable while the others are fruits.',
          pointsIntruder: 1,
          pointsJustification: 1
        }];
      }
    } else if (ex.type === 'reading_comprehension') {
      if (!Array.isArray(ex.content.subQuestions) || ex.content.subQuestions.length === 0) {
        ex.content.subQuestions = [{
          id: generateUUID(),
          prompt: 'Comprehension Question',
          answerType: 'short',
          solution: '',
          points: 1
        }];
      }
    }
  };

  // ── 4. Points Calculation Engine ──────────────────────────────────────────
  TestCreatorService.extractClozeBlanks = function (text) {
    if (!text || typeof text !== 'string') return [];
    var regex = /\[([^\]]+)\]/g;
    var blanks = [];
    var match;
    while ((match = regex.exec(text)) !== null) {
      blanks.push(match[1].trim());
    }
    return blanks;
  };

  TestCreatorService.calculateExercisePoints = function (ex) {
    if (!ex) return 0;
    var pts = 0;
    var ppi = Number(ex.pointsPerItem) || 1;

    switch (ex.type) {
      case 'cloze':
        var ppb = Number(ex.pointsPerBlank || ex.pointsPerItem) || 1;
        if (Array.isArray(ex.content && ex.content.items) && ex.content.items.length > 0) {
          pts = ex.content.items.reduce(function (sum, it) {
            if (it.points != null && !isNaN(Number(it.points)) && Number(it.points) > 0) {
              return sum + Number(it.points);
            }
            var bCount = TestCreatorService.extractClozeBlanks(it.text).length;
            return sum + (bCount > 0 ? bCount * ppb : ppb);
          }, 0);
        } else {
          var blanksCount = TestCreatorService.extractClozeBlanks(ex.content && ex.content.text).length;
          pts = blanksCount > 0 ? blanksCount * ppb : Number(ex.points) || 1;
        }
        break;

      case 'mcq':
        var questions = (ex.content && ex.content.questions) || [];
        if ((!questions || !questions.length) && ex.content && Array.isArray(ex.content.options)) {
          pts = Number(ex.points) || 1;
        } else {
          pts = questions.reduce(function (sum, q) {
            return sum + (Number(q.points) || 1);
          }, 0);
          if (!questions.length) pts = Number(ex.points) || 1;
        }
        break;

      case 'open_question':
        if (Array.isArray(ex.content && ex.content.items) && ex.content.items.length > 0) {
          pts = ex.content.items.reduce(function (sum, it) {
            return sum + (Number(it.points) || 1);
          }, 0);
        } else {
          pts = Number(ex.points) || 3;
        }
        break;

      case 'composition':
        var rubric = ex.markingRubric || [];
        if (rubric.length > 0) {
          pts = rubric.reduce(function (sum, r) {
            var w = Number(r.weight) || 1;
            return sum + ((Number(r.maxPoints) || 0) * w);
          }, 0);
        } else if (Array.isArray(ex.content && ex.content.items) && ex.content.items.length > 1) {
          pts = (Number(ex.points) || 10) * ex.content.items.length;
        } else {
          pts = Number(ex.points) || 10;
        }
        break;

      case 'matching':
        var pairs = (ex.content && ex.content.pairs) || [];
        pts = pairs.length * ppi;
        break;

      case 'transformation':
      case 'sentence_transformation':
        var tItems = (ex.content && ex.content.items) || [];
        pts = tItems.length * ppi;
        break;

      case 'translation':
        var trItems = (ex.content && ex.content.items) || [];
        pts = trItems.length * ppi;
        break;

      case 'table_completion':
        var rows = (ex.content && ex.content.rows) || [];
        var blankCount = 0;
        rows.forEach(function (r) {
          (r || []).forEach(function (cell) {
            if (cell && cell.isBlank) blankCount++;
          });
        });
        pts = blankCount * ppi;
        break;

      case 'odd_one_out':
        var oItems = (ex.content && ex.content.items) || [];
        pts = oItems.reduce(function (sum, item) {
          return sum + (Number(item.pointsIntruder) || 1) + (Number(item.pointsJustification) || 1);
        }, 0);
        break;

      case 'reading_comprehension':
        var subQs = (ex.content && ex.content.subQuestions) || [];
        pts = subQs.reduce(function (sum, q) {
          return sum + (Number(q.points) || 1);
        }, 0);
        break;

      case 'picture_description':
        if (Array.isArray(ex.content && ex.content.items) && ex.content.items.length > 0) {
          pts = ex.content.items.reduce(function (sum, it) {
            return sum + (Number(it.points) || 1);
          }, 0);
        } else {
          pts = Number(ex.points) || 4;
        }
        break;

      default:
        pts = Number(ex.points) || 1;
        break;
    }

    ex.points = Math.round(pts * 10) / 10;
    return ex.points;
  };

  TestCreatorService.calculateTotalTestPoints = function (test) {
    if (!test || !Array.isArray(test.exercises)) return 0;
    var total = 0;
    test.exercises.forEach(function (ex) {
      total += TestCreatorService.calculateExercisePoints(ex);
    });
    return Math.round(total * 10) / 10;
  };

  // ── 5. Variant Generator (Group A / Group B) ──────────────────────────────
  function shuffleArray(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  TestCreatorService.generateVariant = function (test, variantLetter) {
    var vLetter = (variantLetter || 'A').toUpperCase();
    var clone = JSON.parse(JSON.stringify(test));
    clone.variant = vLetter;

    if (vLetter === 'A') {
      return clone;
    }

    // For Group B: Scramble options and pairs within exercises
    clone.exercises.forEach(function (ex) {
      if (ex.type === 'mcq' && ex.content && Array.isArray(ex.content.questions)) {
        ex.content.questions.forEach(function (q) {
          if (Array.isArray(q.options) && q.options.length > 1) {
            var correctTexts = (q.correctIndices || []).map(function (idx) {
              return q.options[idx];
            });
            q.options = shuffleArray(q.options);
            // Re-map correct indices
            q.correctIndices = [];
            correctTexts.forEach(function (txt) {
              var newIdx = q.options.indexOf(txt);
              if (newIdx !== -1) q.correctIndices.push(newIdx);
            });
          }
        });
      } else if (ex.type === 'matching' && ex.content && Array.isArray(ex.content.pairs)) {
        ex.content.pairs = shuffleArray(ex.content.pairs);
      } else if (ex.type === 'odd_one_out' && ex.content && Array.isArray(ex.content.items)) {
        ex.content.items.forEach(function (item) {
          if (Array.isArray(item.words)) {
            item.words = shuffleArray(item.words);
          }
        });
      } else if (ex.type === 'translation' && ex.content && Array.isArray(ex.content.items)) {
        ex.content.items = shuffleArray(ex.content.items);
      } else if (ex.type === 'transformation' && ex.content && Array.isArray(ex.content.items)) {
        ex.content.items = shuffleArray(ex.content.items);
      } else if (ex.type === 'cloze' && ex.content && Array.isArray(ex.content.items) && ex.content.items.length > 1) {
        ex.content.items = shuffleArray(ex.content.items);
      } else if (ex.type === 'open_question' && ex.content && Array.isArray(ex.content.items) && ex.content.items.length > 1) {
        ex.content.items = shuffleArray(ex.content.items);
      } else if (ex.type === 'picture_description' && ex.content && Array.isArray(ex.content.items) && ex.content.items.length > 1) {
        ex.content.items = shuffleArray(ex.content.items);
      }
    });

    return clone;
  };

  // ── 6. Student Variant Assignment Algorithms ──────────────────────────────
  TestCreatorService.assignVariantsToStudents = function (students, mode, options) {
    if (!Array.isArray(students)) return {};
    var assignments = {}; // studentId -> 'A' | 'B'
    var opts = options || {};

    if (mode === 'seating' && opts.classPlan && Array.isArray(opts.classPlan.desks)) {
      var deskMap = {};
      opts.classPlan.desks.forEach(function (d) {
        if (d.studentId) deskMap[d.studentId] = d;
      });

      students.forEach(function (st, idx) {
        var desk = deskMap[st.id];
        if (desk && typeof desk.row === 'number' && typeof desk.col === 'number') {
          assignments[st.id] = (desk.row + desk.col) % 2 === 0 ? 'A' : 'B';
        } else {
          assignments[st.id] = idx % 2 === 0 ? 'A' : 'B';
        }
      });
    } else if (mode === 'manual' && opts.manualMap) {
      students.forEach(function (st, idx) {
        assignments[st.id] = opts.manualMap[st.id] || (idx % 2 === 0 ? 'A' : 'B');
      });
    } else {
      // Default: Alternating roster
      students.forEach(function (st, idx) {
        assignments[st.id] = idx % 2 === 0 ? 'A' : 'B';
      });
    }

    return assignments;
  };

  // ── 7. Database Auto-Saver Helper ─────────────────────────────────────────
  TestCreatorService.saveExerciseToDatabase = async function (exercise, subject) {
    if (!exercise || !window.Desktop || !window.Desktop.isElectron) return false;
    try {
      var filename = 'custom-test-exercises.json';
      var existing = await window.Desktop.readJson('customExercises', filename);
      var records = (existing && existing.ok && Array.isArray(existing.data)) ? existing.data : [];

      var entry = {
        id: exercise.id || generateUUID(),
        title: exercise.title || 'Exercise',
        type: exercise.type || 'cloze',
        subject: subject || 'general',
        instructions: exercise.instructions || '',
        points: exercise.points || 2,
        pointsPerItem: exercise.pointsPerItem || 1,
        content: exercise.content || {},
        markingRubric: exercise.markingRubric || [],
        answerKey: exercise.answerKey || '',
        linkedCompetenceIds: exercise.linkedCompetenceIds || [],
        savedAt: Date.now()
      };

      var existingIdx = records.findIndex(function (r) { return r.id === entry.id; });
      if (existingIdx !== -1) {
        records[existingIdx] = entry;
      } else {
        records.unshift(entry);
      }

      await window.Desktop.saveJson('customExercises', filename, records);
      return true;
    } catch (e) {
      console.warn('TestCreatorService: Failed to save exercise to database:', e);
      return false;
    }
  };

  // ── 8. Grade Sheet & Competence Portfolio Integrations ─────────────────────
  TestCreatorService.prepareGradeSheetEvaluation = function (test) {
    if (!test) return null;
    var totalPts = TestCreatorService.calculateTotalTestPoints(test);
    var subCriteria = (test.exercises || []).map(function (ex, idx) {
      return {
        id: ex.id || generateUUID(),
        title: (ex.title || ('Exercise ' + (idx + 1))) + ' (' + (ex.type || 'task') + ')',
        maxPoints: Number(ex.points) || 1,
        pointCoefficient: 1,
        linkedCompetenceIds: ex.linkedCompetenceIds || []
      };
    });

    return {
      id: generateUUID(),
      name: test.title || 'Test Evaluation',
      type: 'test',
      date: test.date || new Date().toISOString().split('T')[0],
      maxScore: totalPts,
      coefficient: 1,
      scaleModelId: test.scaleModelId || 'pts_20',
      term: 't1',
      criteria: subCriteria,
      linkedTestId: test.id
    };
  };

  TestCreatorService.registerInGradeSheet = async function (test, classId, termId) {
    if (!window.Desktop || !window.Desktop.isElectron || !test || !classId) {
      return { ok: false, error: 'Desktop bridge or parameters missing' };
    }
    try {
      var fileName = classId + '.json';
      var readRes = await window.Desktop.readJson('grades', fileName);
      var gradeData = (readRes && readRes.ok && readRes.data) ? readRes.data : { evaluations: [] };
      if (!Array.isArray(gradeData.evaluations)) gradeData.evaluations = [];

      var evalObj = TestCreatorService.prepareGradeSheetEvaluation(test);
      if (termId) evalObj.term = termId;

      var existingIdx = gradeData.evaluations.findIndex(function (e) {
        return e.linkedTestId === test.id || (e.name === test.title && e.date === test.date);
      });

      if (existingIdx !== -1) {
        gradeData.evaluations[existingIdx] = evalObj;
      } else {
        gradeData.evaluations.push(evalObj);
      }

      await window.Desktop.saveJson('grades', fileName, gradeData);
      return { ok: true, evaluation: evalObj };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  };

  TestCreatorService.registerCompetencesInPortfolio = async function (test) {
    if (!test || !Array.isArray(test.linkedCompetenceIds) || !test.linkedCompetenceIds.length) {
      return false;
    }
    try {
      if (root.CompetenceAggregatorService && typeof root.CompetenceAggregatorService.clearCache === 'function') {
        root.CompetenceAggregatorService.clearCache();
      }
      return true;
    } catch (e) {
      return false;
    }
  };

  // ── 9. HTML & Print Multi-Format Exporter ──────────────────────────────────
  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  TestCreatorService.getThemeCss = function (themeName) {
    var theme = themeName || 'academic';
    var css = '';

    if (theme === 'neobrutalist') {
      css = [
        'body { font-family: "Lexend", system-ui, sans-serif; color: #000; background: #fff; margin: 0; padding: 20px; font-size: 11pt; line-height: 1.45; }',
        '.exam-sheet { max-width: 800px; margin: 0 auto; }',
        '.exam-header { border: 3px solid #000; box-shadow: 4px 4px 0px #000; padding: 14px 18px; margin-bottom: 24px; background: #fafafa; }',
        '.exam-title { font-size: 18pt; font-weight: 900; margin: 0 0 10px; text-transform: uppercase; letter-spacing: -0.5px; border-bottom: 2px solid #000; padding-bottom: 6px; }',
        '.header-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 10pt; font-weight: 700; }',
        '.header-item { padding: 4px 0; }',
        '.header-item span.lbl { text-transform: uppercase; font-size: 8pt; color: #444; display: block; }',
        '.score-badge-box { grid-column: span 3; display: flex; justify-content: space-between; align-items: center; border-top: 2px dashed #000; margin-top: 8px; padding-top: 8px; font-weight: 800; font-size: 11pt; }',
        '.exercise-card { border: 2.5px solid #000; box-shadow: 3px 3px 0px #000; padding: 14px 16px; margin-bottom: 20px; background: #fff; page-break-inside: avoid; }',
        '.exercise-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1.5px solid #000; padding-bottom: 6px; margin-bottom: 10px; }',
        '.exercise-title { font-size: 12pt; font-weight: 900; text-transform: uppercase; }',
        '.exercise-points { background: #111; color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 9pt; font-weight: 800; }',
        '.exercise-instructions { font-style: italic; font-size: 10pt; color: #333; margin-bottom: 12px; }',
        '.cloze-text { font-size: 11pt; line-height: 2.2; }',
        '.cloze-blank { display: inline-block; min-width: 90px; border-bottom: 2px solid #000; text-align: center; font-weight: 700; color: #000; padding: 0 4px; }',
        '.cloze-blank.teacher-key { color: #b91c1c; border-color: #b91c1c; }',
        '.word-bank-pool { display: flex; flex-wrap: wrap; gap: 6px; border: 1.5px dashed #000; padding: 8px; margin-bottom: 12px; background: #f4f4f5; font-size: 9.5pt; font-weight: 700; }',
        '.word-chip { background: #fff; border: 1px solid #000; padding: 2px 8px; border-radius: 3px; }',
        '.mcq-item { margin-bottom: 12px; font-size: 10.5pt; }',
        '.mcq-prompt { font-weight: 700; margin-bottom: 6px; }',
        '.mcq-options { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding-left: 10px; }',
        '.mcq-option { display: flex; align-items: center; gap: 8px; font-size: 10pt; }',
        '.mcq-box { width: 14px; height: 14px; border: 1.5px solid #000; display: inline-block; }',
        '.mcq-option.correct .mcq-box { background: #b91c1c; border-color: #b91c1c; }',
        '.mcq-option.correct { color: #b91c1c; font-weight: 800; }',
        '.writing-lines { margin-top: 8px; }',
        '.writing-lines.dotted-lines .writing-line, .writing-line.dotted { border-bottom-style: dotted; }',
        '.writing-lines.dashed-lines .writing-line, .writing-line.dashed { border-bottom-style: dashed; }',
        '.writing-lines.solid-lines .writing-line, .writing-line.solid { border-bottom-style: solid; }',
        '.writing-line { border-bottom: 1px solid #777; height: 26px; }',
        '.writing-grid { height: 120px; border: 1px solid #000; background-size: 20px 20px; background-image: linear-gradient(to right, #e5e5e5 1px, transparent 1px), linear-gradient(to bottom, #e5e5e5 1px, transparent 1px); }',
        '.writing-box { min-height: 90px; border: 1.5px solid #000; margin-top: 8px; padding: 8px; }',
        '.table-exercise { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10pt; }',
        '.table-exercise th, .table-exercise td { border: 1.5px solid #000; padding: 6px 10px; text-align: left; }',
        '.table-exercise th { background: #f0f0f0; font-weight: 800; }',
        '.table-blank-cell { background: #fff; color: #000; min-height: 24px; }',
        '.table-blank-cell.teacher-key { color: #b91c1c; font-weight: 800; }',
        '.matching-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px dashed #ccc; font-size: 10.5pt; }',
        '.matching-box { width: 34px; height: 22px; border: 1.5px solid #000; text-align: center; line-height: 22px; font-weight: 800; }',
        '.rubric-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9pt; }',
        '.rubric-table th, .rubric-table td { border: 1px solid #000; padding: 4px 8px; }',
        '.rubric-table th { background: #f3f4f6; }',
        '.page-break-before { page-break-before: always; }',
        '@media print { body { padding: 0; } .exercise-card { box-shadow: none; border-color: #000; } }'
      ].join('\n');
    } else if (theme === 'dyslexic') {
      css = [
        'body { font-family: "OpenDyslexic", "Lexend", sans-serif; color: #111; background: #fff; margin: 0; padding: 24px; font-size: 12pt; line-height: 1.8; letter-spacing: 0.6px; word-spacing: 2px; }',
        '.exam-sheet { max-width: 820px; margin: 0 auto; }',
        '.exam-header { border: 2px solid #222; border-radius: 8px; padding: 16px; margin-bottom: 24px; background: #fdfdf6; }',
        '.exam-title { font-size: 19pt; font-weight: 900; margin: 0 0 12px; }',
        '.header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11pt; }',
        '.exercise-card { border: 2px solid #444; border-radius: 8px; padding: 18px; margin-bottom: 24px; background: #fafafa; page-break-inside: avoid; }',
        '.exercise-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #555; padding-bottom: 8px; margin-bottom: 12px; }',
        '.exercise-title { font-size: 13pt; font-weight: 900; }',
        '.exercise-points { background: #333; color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 10pt; font-weight: 700; }',
        '.cloze-blank { display: inline-block; min-width: 100px; border-bottom: 2.5px solid #222; text-align: center; font-weight: 700; background: #f0f0e8; padding: 2px 6px; border-radius: 4px; }',
        '.cloze-blank.teacher-key { color: #dc2626; border-color: #dc2626; }',
        '.writing-line { border-bottom: 1.5px solid #888; height: 32px; }',
        '.page-break-before { page-break-before: always; }'
      ].join('\n');
    } else {
      // Academic Classic (default)
      css = [
        'body { font-family: "Times New Roman", Times, Georgia, serif; color: #000; background: #fff; margin: 0; padding: 30px; font-size: 11pt; line-height: 1.5; }',
        '.exam-sheet { max-width: 820px; margin: 0 auto; }',
        '.exam-header { border: 2px double #000; padding: 14px 18px; margin-bottom: 24px; }',
        '.exam-title { font-size: 16pt; font-weight: bold; text-align: center; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px; }',
        '.header-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 10pt; }',
        '.header-item span.lbl { font-weight: bold; margin-right: 4px; }',
        '.score-badge-box { grid-column: span 3; display: flex; justify-content: space-between; border-top: 1px solid #000; margin-top: 8px; padding-top: 8px; font-weight: bold; }',
        '.exercise-card { margin-bottom: 24px; page-break-inside: avoid; }',
        '.exercise-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 8px; }',
        '.exercise-title { font-size: 11.5pt; font-weight: bold; }',
        '.exercise-points { font-size: 9.5pt; font-style: italic; }',
        '.exercise-instructions { font-style: italic; font-size: 10pt; margin-bottom: 10px; }',
        '.cloze-text { font-size: 11pt; line-height: 2.2; }',
        '.cloze-blank { display: inline-block; min-width: 90px; border-bottom: 1px solid #000; text-align: center; font-weight: bold; }',
        '.cloze-blank.teacher-key { color: #b91c1c; font-weight: bold; }',
        '.word-bank-pool { border: 1px solid #444; padding: 6px 10px; margin-bottom: 10px; font-size: 9.5pt; text-align: center; }',
        '.word-chip { display: inline-block; margin: 2px 6px; }',
        '.mcq-item { margin-bottom: 12px; }',
        '.mcq-prompt { font-weight: bold; margin-bottom: 4px; }',
        '.mcq-options { padding-left: 15px; }',
        '.mcq-option { margin-bottom: 4px; font-size: 10.5pt; }',
        '.mcq-box { display: inline-block; width: 12px; height: 12px; border: 1px solid #000; margin-right: 6px; vertical-align: middle; }',
        '.mcq-option.correct { color: #b91c1c; font-weight: bold; }',
        '.mcq-option.correct .mcq-box { background: #b91c1c; }',
        '.writing-lines { margin-top: 6px; }',
        '.writing-line { border-bottom: 1px solid #999; height: 26px; }',
        '.writing-box { min-height: 90px; border: 1px solid #000; margin-top: 6px; padding: 6px; }',
        '.table-exercise { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10pt; }',
        '.table-exercise th, .table-exercise td { border: 1px solid #000; padding: 5px 8px; text-align: left; }',
        '.table-exercise th { background: #f5f5f5; }',
        '.table-blank-cell.teacher-key { color: #b91c1c; font-weight: bold; }',
        '.matching-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 10.5pt; }',
        '.matching-box { width: 26px; height: 20px; border: 1px solid #000; text-align: center; line-height: 20px; font-weight: bold; }',
        '.rubric-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9pt; }',
        '.rubric-table th, .rubric-table td { border: 1px solid #000; padding: 4px 6px; }',
        '.page-break-before { page-break-before: always; }',
        '@media print { body { padding: 0; } }'
      ].join('\n');
    }

    var commonNumberedLineCss = [
      '.numbered-lines { counter-reset: writing-line-counter; }',
      '.writing-line-numbered { display: flex; align-items: flex-end; gap: 8px; }',
      '.writing-line-numbered::before { counter-increment: writing-line-counter; content: counter(writing-line-counter); font-size: 8pt; font-weight: 700; color: #64748b; width: 22px; text-align: right; flex-shrink: 0; user-select: none; line-height: 1; padding-bottom: 2px; }',
      '.writing-line-numbered .writing-line { flex: 1; width: 100%; }',
      '.passage-line-numbered { display: flex; align-items: baseline; gap: 8px; line-height: 1.6; }',
      '.passage-line-num { font-size: 8pt; font-weight: 700; color: #64748b; width: 22px; text-align: right; flex-shrink: 0; user-select: none; }',
      '.passage-line-text { flex: 1; }'
    ].join('\n');

    var commonHeaderAndQuestionCss = [
      '/* Header Customisation Layouts & Borders */',
      '.header-border-double { border: 2px double #000; }',
      '.header-border-neobrutalist { border: 3px solid #000; box-shadow: 4px 4px 0px #000; border-radius: 4px; }',
      '.header-border-solid { border: 2px solid #000; border-radius: 4px; }',
      '.header-border-dashed { border: 2px dashed #444; border-radius: 4px; }',
      '.header-border-minimal { border-top: 2px solid #000; border-bottom: 2px solid #000; border-left: none; border-right: none; padding-left: 0; padding-right: 0; }',
      '.header-border-none { border: none; box-shadow: none; padding: 0; }',
      '.header-bg-white { background: #ffffff; }',
      '.header-bg-ivory { background: #fdfdf6; }',
      '.header-bg-light_gray { background: #f8fafc; }',
      '.header-pad-compact { padding: 8px 12px; margin-bottom: 16px; }',
      '.header-pad-standard { padding: 14px 18px; margin-bottom: 24px; }',
      '.header-pad-spacious { padding: 20px 24px; margin-bottom: 30px; }',
      '.header-grid.header-layout-3-columns { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 10pt; }',
      '.header-grid.header-layout-2-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 10.5pt; }',
      '.header-grid.header-layout-compact { display: flex; flex-wrap: wrap; gap: 10px 18px; font-size: 9.5pt; }',
      '.header-table-layout { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10pt; }',
      '.header-table-layout td { padding: 4px 8px; vertical-align: middle; border: 1px solid #ddd; }',
      '.name-box { display: inline-block; width: 150px; height: 18px; border: 1px solid #000; vertical-align: middle; background: #fff; }',
      '.name-dotted { display: inline-block; min-width: 150px; border-bottom: 1px dotted #000; }',
      '.exam-title-row { margin-bottom: 10px; }',
      '.exam-subtitle-row { margin-top: -6px; margin-bottom: 10px; color: #475569; }',
      '.exam-variant-badge { float: right; background: #000; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 10pt; letter-spacing: 1px; font-weight: 800; }',
      '.teacher-key-badge { color: #dc2626; font-weight: bold; font-size: 10pt; margin-left: 8px; }',
      '.exam-instructions-box { margin-top: 10px; padding: 8px 12px; font-size: 9pt; }',
      '.exam-instructions-box.instructions-style-box { border: 1.5px solid #000; border-radius: 4px; background: #fafafa; }',
      '.exam-instructions-box.instructions-style-quote { border-left: 4px solid #2563eb; background: #f0f7ff; padding-left: 10px; }',
      '.exam-instructions-box.instructions-style-tint { background: #fef9c3; border: 1px solid #facc15; border-radius: 4px; }',
      '.exam-instructions-title { font-weight: 800; text-transform: uppercase; font-size: 8pt; margin-bottom: 2px; color: #333; }',
      '.materials-badges-wrap { display: inline-flex; flex-wrap: wrap; gap: 4px; vertical-align: middle; }',
      '.mat-badge { display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 1px 6px; border-radius: 3px; font-size: 8.5pt; font-weight: 600; }',
      '.score-badge-box { grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; border-top: 1.5px dashed #000; margin-top: 8px; padding-top: 6px; font-weight: 800; font-size: 10.5pt; }',
      '/* Exercise & Question Styling Overrides */',
      '.card-border-neobrutalist { border: 2.5px solid #000 !important; box-shadow: 3px 3px 0 #000 !important; }',
      '.card-border-minimal { border: 1px solid #cbd5e1 !important; box-shadow: none !important; }',
      '.card-border-borderless { border: none !important; box-shadow: none !important; border-bottom: 1.5px solid #000 !important; border-radius: 0 !important; padding-left: 0 !important; padding-right: 0 !important; }',
      '.q-spacing-compact .mcq-item, .q-spacing-compact .exercise-subitem-card { margin-bottom: 6px !important; }',
      '.q-spacing-relaxed .mcq-item, .q-spacing-relaxed .exercise-subitem-card { margin-bottom: 18px !important; }'
    ].join('\n');

    return css + '\n' + commonNumberedLineCss + '\n' + commonHeaderAndQuestionCss;
  };

  // ── 3c. Modular Customizable Header Renderer ─────────────────────────────
  TestCreatorService.renderHeaderHtml = function (test, isTeacherKey, variant, studentName, className, totalPts) {
    var hc = TestCreatorService.ensureHeaderConfig(test);
    var v = variant || test.variant || 'A';
    var tPts = (totalPts !== undefined) ? totalPts : TestCreatorService.calculateTotalTestPoints(test);
    var mats = Array.isArray(test.materialsAllowed) ? test.materialsAllowed : [];

    var borderCls = 'header-border-' + (hc.borderStyle || 'double');
    var layoutCls = 'header-layout-' + (hc.layout || '3-columns');
    var bgCls = 'header-bg-' + (hc.backgroundTint || 'ivory');
    var padCls = 'header-pad-' + (hc.padding || 'standard');

    var out = [];
    out.push('    <div class="exam-header ' + borderCls + ' ' + bgCls + ' ' + padCls + '">');

    // Variant badge & key badge
    var variantBadgeHtml = '';
    if (hc.showVariantBadge) {
      variantBadgeHtml = '<span class="exam-variant-badge">GROUP ' + escapeHtml(v) + '</span>';
    }
    var keyBadgeHtml = isTeacherKey ? ' <span class="teacher-key-badge">[TEACHER SOLUTION KEY]</span>' : '';

    // Helper for formatting an element item
    function formatItemHtml(lbl, val, styleObj, customCss) {
      var st = styleObj || {};
      var lblCss = [];
      if (st.bold) lblCss.push('font-weight: bold;');
      if (st.italic) lblCss.push('font-style: italic;');
      if (st.underline) lblCss.push('text-decoration: underline;');

      var valCss = [];
      if (st.valBold) valCss.push('font-weight: bold;');
      if (st.valItalic) valCss.push('font-style: italic;');
      if (st.valUnderline) valCss.push('text-decoration: underline;');

      var extra = customCss ? ' style="' + customCss + '"' : '';
      return '<div class="header-item"' + extra + '><span class="lbl" style="' + lblCss.join(' ') + '">' + TestCreatorService.formatRichText(lbl) + '</span> <span class="val" style="' + valCss.join(' ') + '">' + val + '</span></div>';
    }

    // Section builders
    function buildTitleHtml() {
      if (!hc.showTitle) {
        if (variantBadgeHtml) return '      <div style="overflow:hidden;margin-bottom:8px;">' + variantBadgeHtml + '</div>';
        return '';
      }
      var tSt = hc.titleStyle || {};
      var tCss = [];
      if (tSt.bold) tCss.push('font-weight: 900;');
      if (tSt.italic) tCss.push('font-style: italic;');
      if (tSt.underline) tCss.push('text-decoration: underline;');
      if (tSt.uppercase) tCss.push('text-transform: uppercase;');
      if (tSt.size) {
        var tSizeObj = TestCreatorService.parseUnitValue(tSt.size, 'pt');
        if (tSizeObj.css) tCss.push('font-size: ' + tSizeObj.css + ';');
      }
      if (tSt.align) tCss.push('text-align: ' + tSt.align + ';');

      var titleText = test.title || 'Class Examination';
      var tOut = [];
      tOut.push('      <div class="exam-title-row" style="' + tCss.join(' ') + '">');
      if (variantBadgeHtml && tSt.align !== 'center') {
        tOut.push('        ' + variantBadgeHtml);
      }
      tOut.push('        <span class="exam-title-text">' + TestCreatorService.formatRichText(titleText) + '</span>' + keyBadgeHtml);
      if (variantBadgeHtml && tSt.align === 'center') {
        tOut.push('        <div style="margin-top:4px;">' + variantBadgeHtml + '</div>');
      }
      tOut.push('      </div>');
      return tOut.join('\n');
    }

    function buildSubtitleHtml() {
      if (!hc.showSubtitle || !hc.subtitleText) return '';
      var subSt = hc.subtitleStyle || {};
      var subCss = [];
      if (subSt.bold) subCss.push('font-weight: bold;');
      if (subSt.italic) subCss.push('font-style: italic;');
      if (subSt.underline) subCss.push('text-decoration: underline;');
      if (subSt.size) {
        var subSizeObj = TestCreatorService.parseUnitValue(subSt.size, 'pt');
        if (subSizeObj.css) subCss.push('font-size: ' + subSizeObj.css + ';');
      }
      if (subSt.align) subCss.push('text-align: ' + subSt.align + ';');
      return '      <div class="exam-subtitle-row" style="' + subCss.join(' ') + '">' + TestCreatorService.formatRichText(hc.subtitleText) + '</div>';
    }

    function buildMetadataHtml() {
      var metaItemsMap = {};
      if (hc.showStudentName) {
        var sVal = studentName ? escapeHtml(studentName) : (hc.studentNameStyle && hc.studentNameStyle.lineStyle === 'box' ? '<span class="name-box"></span>' : (hc.studentNameStyle && hc.studentNameStyle.lineStyle === 'dotted' ? '<span class="name-dotted"></span>' : '___________________________'));
        metaItemsMap['studentName'] = formatItemHtml(hc.studentNameLabel || 'Student Name:', sVal, hc.studentNameStyle);
      }
      if (hc.showClass) {
        metaItemsMap['class'] = formatItemHtml(hc.classLabel || 'Class / Group:', TestCreatorService.formatRichText(className || test.className || '__________'), hc.classStyle);
      }
      if (hc.showDate) {
        metaItemsMap['date'] = formatItemHtml(hc.dateLabel || 'Date:', TestCreatorService.formatRichText(test.date || '__________'), hc.dateStyle);
      }
      if (hc.showTeacher) {
        metaItemsMap['teacher'] = formatItemHtml(hc.teacherLabel || 'Teacher:', TestCreatorService.formatRichText(test.teacher || '__________'), hc.teacherStyle);
      }
      if (hc.showDuration) {
        metaItemsMap['duration'] = formatItemHtml(hc.durationLabel || 'Duration:', (test.durationMinutes || 45) + ' min', hc.durationStyle);
      }
      if (hc.showMaterials) {
        var mMode = (hc.materialsStyle && hc.materialsStyle.displayMode) || 'inline';
        var matHtml = '';
        if (mMode === 'badges') {
          matHtml = '<div class="materials-badges-wrap">' + (mats.length ? mats.map(function (m) { return '<span class="mat-badge">' + TestCreatorService.formatRichText(m) + '</span>'; }).join(' ') : '<span class="mat-badge">Standard</span>') + '</div>';
        } else {
          matHtml = mats.length ? mats.map(function (m) { return TestCreatorService.formatRichText(m); }).join(', ') : 'Standard';
        }
        metaItemsMap['materials'] = formatItemHtml(hc.materialsLabel || 'Materials:', matHtml, hc.materialsStyle);
      }
      if (hc.showScope) {
        metaItemsMap['scope'] = formatItemHtml(hc.scopeLabel || 'Scope / Topic:', TestCreatorService.formatRichText(test.scope || 'Curriculum Evaluation'), hc.scopeStyle);
      }
      if (hc.showTotalPoints) {
        metaItemsMap['points'] = formatItemHtml(hc.pointsLabel || 'Total Points:', '____ / ' + tPts + ' pts', hc.pointsStyle);
      }

      var metaOrder = (Array.isArray(hc.metaOrder) && hc.metaOrder.length)
        ? hc.metaOrder
        : ['studentName', 'class', 'date', 'teacher', 'duration', 'materials', 'scope', 'points'];

      var orderedItems = [];
      metaOrder.forEach(function (k) {
        if (metaItemsMap[k]) orderedItems.push({ key: k, html: metaItemsMap[k] });
      });

      if (!orderedItems.length) return '';

      var mOut = [];
      if (hc.layout === 'table') {
        mOut.push('      <table class="header-table-layout"><tbody>');
        for (var r = 0; r < orderedItems.length; r += 3) {
          mOut.push('        <tr>');
          for (var c = 0; c < 3; c++) {
            var itm = orderedItems[r + c];
            if (itm) {
              mOut.push('          <td>' + itm.html + '</td>');
            } else {
              mOut.push('          <td></td>');
            }
          }
          mOut.push('        </tr>');
        }
        mOut.push('      </tbody></table>');
      } else {
        mOut.push('      <div class="header-grid ' + layoutCls + '">');
        orderedItems.forEach(function (itm) {
          if (itm.key === 'scope' || itm.key === 'points') {
            mOut.push('        <div class="header-item-score-wrap">' + itm.html + '</div>');
          } else {
            mOut.push('        ' + itm.html);
          }
        });
        mOut.push('      </div>');
      }
      return mOut.join('\n');
    }

    function buildInstructionsHtml() {
      if (!hc.showInstructions || !hc.instructionsText) return '';
      var iSt = hc.instructionsStyle || {};
      var iBoxCss = [];
      if (iSt.bold) iBoxCss.push('font-weight: bold;');
      if (iSt.italic) iBoxCss.push('font-style: italic;');
      if (iSt.underline) iBoxCss.push('text-decoration: underline;');
      var iBoxCls = 'exam-instructions-box instructions-style-' + (iSt.border || 'box');
      var iOut = [];
      iOut.push('      <div class="' + iBoxCls + '" style="' + iBoxCss.join(' ') + '">');
      iOut.push('        <div class="exam-instructions-title">Instructions &amp; Guidelines:</div>');
      iOut.push('        <div>' + TestCreatorService.formatRichText(hc.instructionsText) + '</div>');
      iOut.push('      </div>');
      return iOut.join('\n');
    }

    // Dynamic Section Ordering
    var sectionOrder = (Array.isArray(hc.sectionOrder) && hc.sectionOrder.length)
      ? hc.sectionOrder
      : ['title', 'subtitle', 'metadata', 'instructions'];

    sectionOrder.forEach(function (secKey) {
      var sHtml = '';
      if (secKey === 'title') sHtml = buildTitleHtml();
      else if (secKey === 'subtitle') sHtml = buildSubtitleHtml();
      else if (secKey === 'metadata') sHtml = buildMetadataHtml();
      else if (secKey === 'instructions') sHtml = buildInstructionsHtml();
      if (sHtml) out.push(sHtml);
    });

    out.push('    </div>');
    return out.join('\n');
  };

  TestCreatorService.renderExerciseHtml = function (ex, index, isTeacherKey, options) {
    if (!ex) return '';
    var opts = options || {};
    var num = index + 1;
    var html = [];
    var pageBreakClass = ex.forcePageBreak ? ' page-break-before' : '';
    var exOpts = TestCreatorService.ensureExerciseOptions(ex);

    var effectiveNumberedLines = false;
    if (ex.exportStyle && ex.exportStyle.numberedLines !== null && ex.exportStyle.numberedLines !== undefined) {
      effectiveNumberedLines = !!ex.exportStyle.numberedLines;
    } else if (opts.exportStyle && opts.exportStyle.numberedLines) {
      effectiveNumberedLines = !!opts.exportStyle.numberedLines;
    }

    var borderClass = '';
    if (ex.exportStyle && ex.exportStyle.cardBorderStyle && ex.exportStyle.cardBorderStyle !== 'academic') {
      borderClass = ' card-border-' + ex.exportStyle.cardBorderStyle;
    }
    var spacingClass = '';
    if (ex.exportStyle && ex.exportStyle.itemSpacing && ex.exportStyle.itemSpacing !== 'standard') {
      spacingClass = ' q-spacing-' + ex.exportStyle.itemSpacing;
    }

    function buildWritingLinesHtml(count, style, lineOpts) {
      var lineSt = style || (lineOpts && (lineOpts.lineStyle || lineOpts.lineType)) || 'solid';
      if (lineSt === 'box') {
        return '    <div class="writing-box"></div>';
      }
      if (lineSt === 'grid') {
        return '    <div class="writing-grid"></div>';
      }
      var lineType = (lineSt === 'dotted') ? 'dotted' : ((lineSt === 'dashed') ? 'dashed' : 'solid');
      var isDotted = (lineType === 'dotted');
      var isDashed = (lineType === 'dashed');

      var wrapClass = effectiveNumberedLines ? 'writing-lines numbered-lines' : 'writing-lines';
      if (isDotted) wrapClass += ' dotted-lines';
      else if (isDashed) wrapClass += ' dashed-lines';
      else wrapClass += ' solid-lines';

      var lHeightObj = lineOpts && lineOpts.lineHeight ? TestCreatorService.parseUnitValue(lineOpts.lineHeight, 'px') : null;
      var lThicknessObj = lineOpts && lineOpts.lineThickness ? TestCreatorService.parseUnitValue(lineOpts.lineThickness, 'px') : null;

      var styleRules = [];
      if (lHeightObj && lHeightObj.css) {
        styleRules.push('height:' + lHeightObj.css);
      }
      if (lThicknessObj && lThicknessObj.css) {
        styleRules.push('border-bottom-width:' + lThicknessObj.css);
      }
      if (isDashed) {
        styleRules.push('border-bottom-style:dashed');
      } else if (isDotted) {
        styleRules.push('border-bottom-style:dotted');
      } else {
        styleRules.push('border-bottom-style:solid');
      }

      var inlineStyleAttr = styleRules.length ? ' style="' + styleRules.join(';') + ';"' : '';
      var lineClass = 'writing-line' + (isDotted ? ' dotted' : (isDashed ? ' dashed' : ' solid'));

      var out = [];
      out.push('    <div class="' + wrapClass + '">');
      for (var i = 0; i < count; i++) {
        if (effectiveNumberedLines) {
          out.push('      <div class="writing-line-numbered"><div class="' + lineClass + '"' + inlineStyleAttr + '></div></div>');
        } else {
          out.push('      <div class="' + lineClass + '"' + inlineStyleAttr + '></div>');
        }
      }
      out.push('    </div>');
      return out.join('\n');
    }

    html.push('<div class="exercise-card' + pageBreakClass + borderClass + spacingClass + '" id="ex-' + ex.id + '">');
    html.push('  <div class="exercise-header">');
    html.push('    <span class="exercise-title">Exercise ' + num + ': ' + TestCreatorService.formatRichText(ex.title) + '</span>');
    html.push('    <span class="exercise-points">/' + (ex.points || 0) + ' pts</span>');
    html.push('  </div>');

    if (ex.instructions) {
      html.push('  <div class="exercise-instructions">' + TestCreatorService.formatRichText(ex.instructions) + '</div>');
    }

    switch (ex.type) {
      case 'cloze':
        TestCreatorService.normalizeExerciseItems(ex);
        var cItems = (ex.content && ex.content.items) || [];
        if (ex.content && ex.content.showWordBank) {
          var allBlanks = [];
          cItems.forEach(function (it) {
            allBlanks = allBlanks.concat(TestCreatorService.extractClozeBlanks(it.text));
          });
          if (exOpts.wordBankDistractors) {
            var dists = String(exOpts.wordBankDistractors).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
            allBlanks = allBlanks.concat(dists);
          }
          var chips = (exOpts.wordBankOrder === 'alphabetical')
            ? allBlanks.slice().sort(function (a, b) { return a.localeCompare(b); })
            : shuffleArray(allBlanks);
          html.push('  <div class="word-bank-pool"><strong>Word Bank:</strong> ');
          chips.forEach(function (w) {
            html.push('    <span class="word-chip">' + TestCreatorService.formatRichText(w) + '</span>');
          });
          html.push('  </div>');
        }

        cItems.forEach(function (it, itIdx) {
          var raw = it.text || '';
          var blanks = [];
          var placeholderText = raw.replace(/\[([^\]]+)\]/g, function (match, word) {
            var bId = '___CLOZE_BLANK_' + blanks.length + '___';
            blanks.push(word);
            return bId;
          });
          var formattedSegment = TestCreatorService.formatRichText(placeholderText);
          var renderedText = formattedSegment.replace(/___CLOZE_BLANK_(\d+)___/g, function (_, bIdxStr) {
            var word = blanks[Number(bIdxStr)] || '';
            if (isTeacherKey) {
              return '<span class="cloze-blank teacher-key">' + escapeHtml(word) + '</span>';
            }
            var bClass = 'cloze-blank';
            var inner = '&nbsp;';
            if (exOpts.blankStyle === 'bracketed_box') {
              bClass += ' boxed';
              inner = '[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]';
            } else if (exOpts.blankStyle === 'length_dots') {
              bClass += ' dotted';
              inner = word.split('').map(function () { return '·'; }).join('&nbsp;');
            }
            if (exOpts.showFirstLetter && word.length > 1) {
              var hintLetter = escapeHtml(word.charAt(0));
              if (exOpts.blankStyle === 'length_dots') {
                inner = '<strong>' + hintLetter + '</strong>&nbsp;' + word.slice(1).split('').map(function () { return '·'; }).join('&nbsp;');
              } else {
                inner = '<strong>' + hintLetter + '</strong>_______';
              }
            }
            return '<span class="' + bClass + '">' + inner + '</span>';
          });
          var prefix = cItems.length > 1 ? '<strong>' + (itIdx + 1) + '.</strong> ' : '';
          html.push('  <div class="cloze-text" style="margin-bottom:8px;">' + prefix + renderedText + '</div>');
        });
        break;

      case 'mcq':
        var questions = (ex.content && ex.content.questions) || [];
        if ((!questions || !questions.length) && ex.content && Array.isArray(ex.content.options) && ex.content.options.length > 0) {
          var optsList = ex.content.options.map(function (o) { return typeof o === 'string' ? o : (o.text || ''); });
          var corrects = [];
          ex.content.options.forEach(function (o, idx) {
            if (o && (o.isCorrect || o.correct)) corrects.push(idx);
          });
          if (corrects.length === 0 && ex.content.correctIndex !== undefined) corrects.push(ex.content.correctIndex);
          questions = [{
            prompt: ex.content.prompt || ex.prompt || 'Choose the correct answer:',
            options: optsList,
            correctIndices: corrects,
            points: ex.points || 1
          }];
        }
        var mcqLayoutClass = 'mcq-layout-' + (exOpts.layout || '2-columns');
        questions.forEach(function (q, qIdx) {
          html.push('  <div class="mcq-item">');
          html.push('    <div class="mcq-prompt">' + (qIdx + 1) + '. ' + TestCreatorService.formatRichText(q.prompt) + ' (' + (q.points || 1) + ' pt)</div>');
          html.push('    <div class="mcq-options ' + mcqLayoutClass + '">');
          var rawOpts = (q.options || []).map(function (optText, oIdx) {
            return {
              text: optText,
              origIdx: oIdx,
              isCorrect: (q.correctIndices || []).indexOf(oIdx) !== -1
            };
          });
          var displayOpts = rawOpts;
          if (exOpts.shuffleOptions && !isTeacherKey) {
            displayOpts = shuffleArray(rawOpts);
          }
          displayOpts.forEach(function (optItem, dIdx) {
            var cls = (isTeacherKey && optItem.isCorrect) ? 'mcq-option correct' : 'mcq-option';
            var markerHtml = '<span class="mcq-box"></span>';
            if (exOpts.markerStyle === 'letters') {
              markerHtml = '<strong class="mcq-marker-letter">' + String.fromCharCode(65 + dIdx) + '.</strong>';
            } else if (exOpts.markerStyle === 'numbers') {
              markerHtml = '<strong class="mcq-marker-letter">' + (dIdx + 1) + '.</strong>';
            } else if (exOpts.markerStyle === 'circle') {
              markerHtml = '<span class="mcq-circle"></span>';
            }
            html.push('      <div class="' + cls + '">' + markerHtml + ' ' + TestCreatorService.formatRichText(optItem.text) + '</div>');
          });
          html.push('    </div>');
          html.push('  </div>');
        });
        break;

      case 'open_question':
        TestCreatorService.normalizeExerciseItems(ex);
        var oItems = (ex.content && ex.content.items) || [];
        oItems.forEach(function (it, itIdx) {
          var prefix = oItems.length > 1 ? (itIdx + 1) + '. ' : '';
          var ptsLabel = it.points ? ' (' + it.points + ' pt' + (it.points === 1 ? '' : 's') + ')' : '';
          var guidance = it.lengthGuidance || exOpts.lengthGuidance;
          var guidanceLabel = guidance ? ' <span class="open-length-hint">(' + TestCreatorService.formatRichText(guidance) + ')</span>' : '';
          html.push('  <div style="margin-bottom:14px;">');
          html.push('    <div class="open-prompt"><strong>' + prefix + '</strong>' + TestCreatorService.formatRichText(it.prompt || '') + guidanceLabel + ptsLabel + '</div>');
          var starter = it.answerPrefix || exOpts.answerPrefix;
          if (starter) {
            html.push('    <div class="open-starter-prefix"><em>Starter: ' + TestCreatorService.formatRichText(starter) + '</em></div>');
          }
          if (isTeacherKey && it.sampleAnswer) {
            html.push('    <div style="color:#b91c1c;font-size:10pt;font-weight:bold;margin:6px 0;">Sample Answer: ' + TestCreatorService.formatRichText(it.sampleAnswer) + '</div>');
          }
          var lCount = Number(it.lineCount) || 4;
          var lSt = it.lineStyle || exOpts.lineStyle || 'lines';
          html.push(buildWritingLinesHtml(lCount, lSt));
          html.push('  </div>');
        });
        break;

      case 'composition':
        TestCreatorService.normalizeExerciseItems(ex);
        var compItems = (ex.content && ex.content.items) || [];

        var draftTitle = TestCreatorService.formatRichText(exOpts.draftTitle || 'Draft & Rough Work (Not graded)');
        var draftNoteHtml = exOpts.draftNote ? '<div class="draft-note">' + TestCreatorService.formatRichText(exOpts.draftNote) + '</div>' : '';
        var draftStyle = exOpts.draftStyle || 'box';
        var draftLines = Number(exOpts.draftLines) || 6;
        var draftHeightObj = TestCreatorService.parseUnitValue(exOpts.draftHeight || 100, 'px');
        var draftHeightCss = draftHeightObj.css || '100px';

        function buildDraftBlockHtml() {
          if (!exOpts.showDraftBox) return '';
          var dOut = [];
          if (draftStyle === 'box') {
            dOut.push('    <div class="draft-work-box" style="min-height:' + draftHeightCss + ';"><div class="draft-title">' + draftTitle + '</div>' + draftNoteHtml + '</div>');
          } else if (draftStyle === 'lines' || draftStyle === 'dotted') {
            dOut.push('    <div class="draft-work-box draft-ruled"><div class="draft-title">' + draftTitle + '</div>' + draftNoteHtml);
            dOut.push(buildWritingLinesHtml(draftLines, draftStyle));
            dOut.push('    </div>');
          } else if (draftStyle === 'grid') {
            dOut.push('    <div class="draft-work-box draft-grid-box"><div class="draft-title">' + draftTitle + '</div>' + draftNoteHtml);
            dOut.push('      <div class="writing-grid" style="height:' + draftHeightCss + ';margin-top:6px;"></div>');
            dOut.push('    </div>');
          }
          return dOut.join('\n');
        }

        // Sub-component builders for dynamic reordering
        function renderCompGenre() {
          if (exOpts.showGenreBadge === false || !exOpts.textGenre) return '';
          return '  <div class="composition-genre-tag">Format / Genre: <strong>' + TestCreatorService.formatRichText(exOpts.textGenre) + '</strong></div>';
        }

        function renderCompPrompts() {
          if (exOpts.showPrompts === false) return '';
          var pOut = [];
          compItems.forEach(function (it, itIdx) {
            var taskHeader = compItems.length > 1 ? (it.label || ('Option ' + String.fromCharCode(65 + itIdx))) + ': ' : '';
            var wcStr = (exOpts.wordCountMin && exOpts.wordCountMax)
              ? (exOpts.wordCountMin + ' – ' + exOpts.wordCountMax + ' words')
              : ('~' + (it.targetWordCount || exOpts.wordCountMax || 150) + ' words');
            pOut.push('  <div class="composition-task-block" style="margin-bottom:12px;">');
            pOut.push('    <div class="composition-prompt"><strong>' + TestCreatorService.formatRichText(taskHeader) + '</strong>' + TestCreatorService.formatRichText(it.prompt || '') + '</div>');
            pOut.push('    <div style="font-size:9.5pt;font-style:italic;margin:4px 0 8px;">Target word count: ' + wcStr + '</div>');
            pOut.push('  </div>');
          });
          return pOut.join('\n');
        }

        function renderCompDraft() {
          return buildDraftBlockHtml();
        }

        function renderCompLines() {
          if (exOpts.showWritingLines === false) return '';
          var lOut = [];
          compItems.forEach(function (it, itIdx) {
            if (compItems.length > 1) {
              var tLbl = it.label || ('Task ' + (itIdx + 1));
              lOut.push('  <div style="font-size:9pt;font-weight:700;color:#64748b;margin-top:8px;">' + TestCreatorService.formatRichText(tLbl) + ' — Response Lines:</div>');
            }
            var cLines = Number(it.lineCount) || 14;
            var cStyle = it.lineStyle || exOpts.lineStyle || 'solid';
            var cHeight = it.lineHeight || exOpts.lineHeight || 28;
            var cThickness = it.lineThickness || exOpts.lineThickness || 1;
            lOut.push(buildWritingLinesHtml(cLines, cStyle, { lineHeight: cHeight, lineThickness: cThickness, lineType: cStyle }));
          });
          return lOut.join('\n');
        }

        function renderCompChecklist() {
          if (!exOpts.showChecklist) return '';
          var clTitle = TestCreatorService.formatRichText(exOpts.checklistTitle || 'Student Proofreading Checklist:');
          var clItems = (Array.isArray(exOpts.checklistItems) && exOpts.checklistItems.length)
            ? exOpts.checklistItems
            : ['Structure & Paragraphs', 'Spelling & Verb Tenses', 'Punctuation & Capitalization', 'Word Count Verified'];
          var clLayout = exOpts.checklistLayout || 'inline';
          var layoutCls = clLayout === 'columns' ? ' checklist-columns' : (clLayout === 'stacked' ? ' checklist-stacked' : ' checklist-inline');
          var cOut = [];
          cOut.push('  <div class="composition-checklist' + layoutCls + '"><div class="checklist-title">' + clTitle + '</div><div class="checklist-items">');
          clItems.forEach(function (cItem) {
            cOut.push('<span>☐ ' + TestCreatorService.formatRichText(cItem) + '</span>');
          });
          cOut.push('</div></div>');
          return cOut.join('\n');
        }

        function renderCompRubric() {
          if (exOpts.showRubric === false || !Array.isArray(ex.markingRubric) || ex.markingRubric.length === 0) return '';
          var rOut = [];
          rOut.push('  <table class="rubric-table">');
          rOut.push('    <thead><tr><th>Assessment Criteria</th><th style="width:70px;">Max</th><th style="width:70px;">Score</th><th>Feedback</th></tr></thead>');
          rOut.push('    <tbody>');
          ex.markingRubric.forEach(function (r) {
            rOut.push('      <tr><td>' + TestCreatorService.formatRichText(r.title) + '</td><td>/' + (r.maxPoints || 0) + '</td><td></td><td></td></tr>');
          });
          rOut.push('    </tbody>');
          rOut.push('  </table>');
          return rOut.join('\n');
        }

        var compOrder = (Array.isArray(exOpts.componentOrder) && exOpts.componentOrder.length)
          ? exOpts.componentOrder
          : ['genreBadge', 'prompts', 'draftBox', 'writingLines', 'checklist', 'rubric'];

        compOrder.forEach(function (cmpKey) {
          var res = '';
          if (cmpKey === 'genreBadge') res = renderCompGenre();
          else if (cmpKey === 'prompts') res = renderCompPrompts();
          else if (cmpKey === 'draftBox') res = renderCompDraft();
          else if (cmpKey === 'writingLines') res = renderCompLines();
          else if (cmpKey === 'checklist') res = renderCompChecklist();
          else if (cmpKey === 'rubric') res = renderCompRubric();
          if (res) html.push(res);
        });
        break;

      case 'matching':
        var pairs = (ex.content && ex.content.pairs) || [];
        var lefts = pairs.map(function (pr) { return pr.left; });
        var rights = pairs.map(function (pr) { return pr.right; });
        if (exOpts.distractors) {
          var distArr = String(exOpts.distractors).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          rights = rights.concat(distArr);
        }
        var shuffledRights = shuffleArray(rights);
        var colA = TestCreatorService.formatRichText(exOpts.colALabel || 'Column A');
        var colB = TestCreatorService.formatRichText(exOpts.colBLabel || 'Column B');

        html.push('  <div class="matching-container" style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">');
        html.push('    <div><strong>' + colA + '</strong>');
        lefts.forEach(function (l, idx) {
          var matchingLetter = '';
          if (isTeacherKey) {
            var correctRight = pairs[idx].right;
            var letterIdx = shuffledRights.indexOf(correctRight);
            matchingLetter = (letterIdx !== -1) ? String.fromCharCode(65 + letterIdx) : '';
          }
          var rightIndicator = (exOpts.presentation === 'connecting_lines')
            ? '<span class="matching-dot-right">●</span>'
            : '<span class="matching-box">' + matchingLetter + '</span>';
          html.push('      <div class="matching-row"><span>' + (idx + 1) + '. ' + TestCreatorService.formatRichText(l) + '</span>' + rightIndicator + '</div>');
        });
        html.push('    </div>');

        html.push('    <div><strong>' + colB + '</strong>');
        shuffledRights.forEach(function (r, idx) {
          var letter = String.fromCharCode(65 + idx);
          var leftIndicator = (exOpts.presentation === 'connecting_lines') ? '<span class="matching-dot-left">●</span> ' : '';
          html.push('      <div class="matching-row"><span>' + leftIndicator + '<strong>' + letter + '.</strong> ' + TestCreatorService.formatRichText(r) + '</span></div>');
        });
        html.push('    </div>');
        html.push('  </div>');

        if (exOpts.presentation === 'table') {
          html.push('  <table class="table-exercise" style="margin-top:12px;max-width:400px;">');
          html.push('    <thead><tr>' + lefts.map(function (_, i) { return '<th>' + (i + 1) + '</th>'; }).join('') + '</tr></thead>');
          html.push('    <tbody><tr>' + lefts.map(function (_, i) {
            var solLetter = '';
            if (isTeacherKey) {
              var cR = pairs[i].right;
              var lI = shuffledRights.indexOf(cR);
              solLetter = (lI !== -1) ? String.fromCharCode(65 + lI) : '';
            }
            return '<td>' + (isTeacherKey ? '<span class="teacher-key">' + solLetter + '</span>' : '&nbsp;') + '</td>';
          }).join('') + '</tr></tbody>');
          html.push('  </table>');
        }
        break;

      case 'transformation':
      case 'sentence_transformation':
        var transItems = (ex.content && ex.content.items) || [];
        if ((!transItems || !transItems.length) && ex.content && (ex.content.leadIn || ex.content.original)) {
          transItems = [{
            original: ex.content.leadIn || ex.content.original || '',
            keyword: ex.content.keyword || 'REWRITE',
            targetPrefix: ex.content.startOfSentence || ex.content.targetPrefix || '',
            targetSuffix: ex.content.targetSuffix || '',
            solution: ex.expectedAnswer || ex.content.solution || ''
          }];
        }
        if (exOpts.wordConstraint) {
          html.push('  <div class="trans-constraint"><em>' + TestCreatorService.formatRichText(exOpts.wordConstraint) + '</em></div>');
        }
        if (exOpts.allowContractionsNote) {
          html.push('  <div class="trans-note">*(Contractions count as two words)*</div>');
        }
        transItems.forEach(function (item, idx) {
          html.push('  <div style="margin-bottom:12px;font-size:10.5pt;">');
          html.push('    <div>' + (idx + 1) + '. ' + TestCreatorService.formatRichText(item.original) + '</div>');
          if (exOpts.keywordStyle === 'bracketed') {
            html.push('    <div style="padding-left:20px;margin:2px 0;"><strong>[' + TestCreatorService.formatRichText(item.keyword || '') + ']</strong></div>');
          } else {
            html.push('    <div style="font-weight:bold;margin:2px 0 2px 20px;letter-spacing:1px;color:#2563eb;">' + TestCreatorService.formatRichText(item.keyword || '') + '</div>');
          }
          if (isTeacherKey && item.solution) {
            html.push('    <div style="color:#b91c1c;font-weight:bold;padding-left:20px;">' + TestCreatorService.formatRichText(item.targetPrefix || '') + ' <u>' + TestCreatorService.formatRichText(item.solution) + '</u> ' + TestCreatorService.formatRichText(item.targetSuffix || '') + '</div>');
          } else {
            html.push('    <div style="padding-left:20px;">' + TestCreatorService.formatRichText(item.targetPrefix || '') + ' ___________________________________ ' + TestCreatorService.formatRichText(item.targetSuffix || '') + '</div>');
          }
          html.push('  </div>');
        });
        break;

      case 'translation':
        var trItems = (ex.content && ex.content.items) || [];
        if (exOpts.direction) {
          html.push('  <div class="translation-direction-badge">' + TestCreatorService.formatRichText(exOpts.direction) + '</div>');
        }
        trItems.forEach(function (item, idx) {
          html.push('  <div style="margin-bottom:12px;font-size:10.5pt;">');
          html.push('    <div>' + (idx + 1) + '. ' + TestCreatorService.formatRichText(item.sourceText) + '</div>');
          if (exOpts.showHints && item.hint) {
            html.push('    <div class="translation-hint"><em>Hint: ' + TestCreatorService.formatRichText(item.hint) + '</em></div>');
          }
          if (isTeacherKey && item.modelTranslation) {
            html.push('    <div style="color:#b91c1c;font-weight:bold;margin:4px 0;">&rarr; ' + TestCreatorService.formatRichText(item.modelTranslation) + '</div>');
          }
          var lines = Number(item.allocatedLines) || 2;
          html.push(buildWritingLinesHtml(lines, item.lineStyle || exOpts.lineStyle || 'lines'));
          html.push('  </div>');
        });
        break;

      case 'picture_description':
        TestCreatorService.normalizeExerciseItems(ex);
        var pItems = (ex.content && ex.content.items) || [];
        if (exOpts.targetVocab) {
          var vChips = String(exOpts.targetVocab).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          if (vChips.length) {
            html.push('  <div class="pic-vocab-pool"><strong>Target Vocabulary:</strong> ' + vChips.map(function (c) { return '<span class="word-chip">' + TestCreatorService.formatRichText(c) + '</span>'; }).join(' ') + '</div>');
          }
        }
        var imgMaxH = (exOpts.imageSize === 'small') ? '120px' : (exOpts.imageSize === 'large' ? '250px' : '180px');
        var isSideBySide = (exOpts.layout === 'side_by_side');
        pItems.forEach(function (it, itIdx) {
          var figLabel = exOpts.figureLabel ? (TestCreatorService.formatRichText(exOpts.figureLabel) + (pItems.length > 1 ? ' (' + (itIdx + 1) + ')' : '') + ': ') : '';
          var ptsLabel = it.points ? ' (' + it.points + ' pt' + (it.points === 1 ? '' : 's') + ')' : '';
          var itemWrapClass = isSideBySide ? 'pic-desc-item side-by-side' : 'pic-desc-item stacked';
          html.push('  <div class="' + itemWrapClass + '" style="margin-bottom:18px;">');
          if (isSideBySide) {
            html.push('    <div style="display:flex;gap:18px;align-items:flex-start;">');
            if (it.imagePath) {
              html.push('      <div style="flex: 0 0 40%;max-width:40%;">');
              html.push('        <img src="' + escapeHtml(it.imagePath) + '" style="width:100%;max-height:' + imgMaxH + ';object-fit:contain;border:1.5px solid #000;border-radius:4px;" alt="Prompt Image" />');
              if (it.imageCaption) {
                html.push('        <div style="font-size:8.5pt;color:#475569;font-style:italic;margin-top:2px;">' + figLabel + TestCreatorService.formatRichText(it.imageCaption) + '</div>');
              }
              html.push('      </div>');
            }
            html.push('      <div style="flex:1;">');
            html.push('        <div style="margin-bottom:8px;"><strong>' + figLabel + '</strong>' + TestCreatorService.formatRichText(it.prompt || '') + ptsLabel + '</div>');
            if (isTeacherKey && it.modelAnswer) {
              html.push('        <div style="color:#b91c1c;font-size:10pt;font-weight:bold;margin-bottom:6px;">Sample Answer: ' + TestCreatorService.formatRichText(it.modelAnswer) + '</div>');
            }
            var pLines = Number(it.lineCount) || 6;
            html.push(buildWritingLinesHtml(pLines, it.lineStyle || 'lines'));
            html.push('      </div>');
            html.push('    </div>');
          } else {
            // Stacked
            if (it.imagePath) {
              html.push('    <div style="margin-bottom:10px;">');
              html.push('      <img src="' + escapeHtml(it.imagePath) + '" style="max-height:' + imgMaxH + ';border:1.5px solid #000;border-radius:4px;object-fit:contain;" alt="Prompt Image" />');
              if (it.imageCaption) {
                html.push('      <div style="font-size:8.5pt;color:#475569;font-style:italic;margin-top:2px;">' + figLabel + TestCreatorService.formatRichText(it.imageCaption) + '</div>');
              }
              html.push('    </div>');
            }
            html.push('    <div style="margin-bottom:8px;"><strong>' + figLabel + '</strong>' + TestCreatorService.formatRichText(it.prompt || '') + ptsLabel + '</div>');
            if (isTeacherKey && it.modelAnswer) {
              html.push('    <div style="color:#b91c1c;font-size:10pt;font-weight:bold;margin-bottom:6px;">Sample Answer: ' + TestCreatorService.formatRichText(it.modelAnswer) + '</div>');
            }
            var pLines = Number(it.lineCount) || 6;
            html.push(buildWritingLinesHtml(pLines, it.lineStyle || 'lines'));
          }
          html.push('  </div>');
        });
        break;

      case 'table_completion':
        var headers = (ex.content && ex.content.headers) || [];
        var rows = (ex.content && ex.content.rows) || [];
        if (exOpts.showWordBank) {
          var blankCells = [];
          rows.forEach(function (r) {
            (r || []).forEach(function (cell) {
              if (cell && cell.isBlank && cell.text) blankCells.push(cell.text);
            });
          });
          if (blankCells.length) {
            html.push('  <div class="word-bank-pool"><strong>Word Bank:</strong> ' + shuffleArray(blankCells).map(function (w) { return '<span class="word-chip">' + TestCreatorService.formatRichText(w) + '</span>'; }).join(' ') + '</div>');
          }
        }
        var tblClass = 'table-exercise';
        if (exOpts.tableStyle === 'zebra') tblClass += ' table-zebra';
        else if (exOpts.tableStyle === 'scientific') tblClass += ' table-scientific';
        var cellAlignStyle = (exOpts.textAlign === 'center') ? 'text-align:center;' : 'text-align:left;';

        html.push('  <table class="' + tblClass + '">');
        if (headers.length) {
          html.push('    <thead><tr>');
          headers.forEach(function (h) {
            html.push('      <th style="' + cellAlignStyle + '">' + TestCreatorService.formatRichText(h) + '</th>');
          });
          html.push('    </tr></thead>');
        }
        html.push('    <tbody>');
        rows.forEach(function (r) {
          html.push('      <tr>');
          (r || []).forEach(function (cell) {
            if (cell && cell.isBlank) {
              var cellVal = isTeacherKey ? '<span class="table-blank-cell teacher-key">' + TestCreatorService.formatRichText(cell.text) + '</span>' : '&nbsp;';
              html.push('        <td style="' + cellAlignStyle + '">' + cellVal + '</td>');
            } else {
              html.push('        <td style="' + cellAlignStyle + '">' + TestCreatorService.formatRichText(cell ? cell.text : '') + '</td>');
            }
          });
          html.push('      </tr>');
        });
        html.push('    </tbody>');
        html.push('  </table>');
        break;

      case 'odd_one_out':
        var oddItems = (ex.content && ex.content.items) || [];
        var isCircleOnly = (exOpts.taskMode === 'circle_only');
        var isCrossOut = (exOpts.taskMode === 'cross_out');
        var isPill = (exOpts.displayStyle !== 'plain_separated');

        oddItems.forEach(function (item, idx) {
          html.push('  <div style="margin-bottom:14px;font-size:10.5pt;">');
          var renderedWords = (item.words || []).map(function (w) {
            var isIntruder = (item.intruder || '').trim().toLowerCase() === w.trim().toLowerCase();
            if (isTeacherKey && isIntruder) {
              return isPill
                ? '<span class="odd-pill correct" style="color:#b91c1c;font-weight:bold;border-color:#b91c1c;background:#fee2e2;">' + TestCreatorService.formatRichText(w) + '</span>'
                : '<span style="color:#b91c1c;font-weight:bold;text-decoration:underline;">' + TestCreatorService.formatRichText(w) + '</span>';
            }
            return isPill ? '<span class="odd-pill">' + TestCreatorService.formatRichText(w) + '</span>' : TestCreatorService.formatRichText(w);
          });
          var sep = isPill ? ' ' : ' &nbsp;|&nbsp; ';
          html.push('    <div><strong>' + (idx + 1) + '.</strong> ' + renderedWords.join(sep) + '</div>');
          if (isTeacherKey && item.justificationKey && !isCircleOnly) {
            html.push('    <div style="color:#b91c1c;font-size:9.5pt;margin-top:2px;">&rarr; <strong>Justification:</strong> ' + TestCreatorService.formatRichText(item.justificationKey) + '</div>');
          }
          if (isCrossOut) {
            html.push('    <div style="font-size:9pt;font-style:italic;color:#64748b;margin-top:4px;">(Cross out the intruder with an X)</div>');
          } else if (isCircleOnly) {
            html.push('    <div style="font-size:9pt;font-style:italic;color:#64748b;margin-top:4px;">(Circle the word that does not belong)</div>');
          } else {
            html.push('    <div style="margin-top:6px;display:flex;gap:10px;align-items:center;">');
            html.push('      <span style="font-size:9pt;font-weight:bold;">Intruder:</span> <span style="display:inline-block;width:140px;border-bottom:1px solid #000;"></span>');
            html.push('      <span style="font-size:9pt;font-weight:bold;">Why?</span> <span style="flex:1;border-bottom:1px solid #000;"></span>');
            html.push('    </div>');
          }
          html.push('  </div>');
        });
        break;

      case 'reading_comprehension':
        var rcTitle = (ex.content && ex.content.passageTitle) || '';
        var rcPassage = (ex.content && ex.content.passageText) || '';
        var subQuestions = (ex.content && ex.content.subQuestions) || [];
        var passageWrapClass = (exOpts.passageLayout === 'two_columns') ? 'passage-box passage-2col' : 'passage-box';

        html.push('  <div class="' + passageWrapClass + '" style="border:1.5px solid #333;padding:12px;background:#fbfbfb;margin-bottom:14px;font-size:10pt;line-height:1.6;">');
        if (rcTitle) {
          html.push('    <div style="font-weight:bold;margin-bottom:6px;text-align:center;text-decoration:underline;">' + TestCreatorService.formatRichText(rcTitle) + '</div>');
        }
        if (effectiveNumberedLines && rcPassage) {
          var pLines = rcPassage.split('\n');
          var numberedPassage = pLines.map(function (ln, lIdx) {
            return '<div class="passage-line-numbered"><span class="passage-line-num">' + (lIdx + 1) + '</span><span class="passage-line-text">' + (TestCreatorService.formatRichText(ln) || '&nbsp;') + '</span></div>';
          }).join('');
          html.push('    <div>' + numberedPassage + '</div>');
        } else {
          html.push('    <div>' + TestCreatorService.formatRichText(rcPassage).replace(/\n/g, '<br>') + '</div>');
        }
        if (exOpts.vocabularyFootnotes) {
          html.push('    <div class="passage-footnotes" style="margin-top:10px;padding-top:6px;border-top:1px dashed #94a3b8;font-size:8.5pt;color:#334155;"><strong>Glossary:</strong> ' + TestCreatorService.formatRichText(exOpts.vocabularyFootnotes).replace(/\n/g, '<br>') + '</div>');
        }
        html.push('  </div>');

        subQuestions.forEach(function (sq, sIdx) {
          var sqPts = (sq.points || 1);
          var sqLines = Number(sq.lineCount) || Number(exOpts.defaultLineCount) || 1;
          var sqGuidance = sq.lengthGuidance ? ' <span class="open-length-hint">(' + TestCreatorService.formatRichText(sq.lengthGuidance) + ')</span>' : '';
          html.push('  <div style="margin-bottom:10px;font-size:10.5pt;">');
          html.push('    <div><strong>' + (sIdx + 1) + '.</strong> ' + TestCreatorService.formatRichText(sq.prompt) + sqGuidance + ' (' + sqPts + ' pt' + (sqPts === 1 ? '' : 's') + ')</div>');
          if (sq.answerPrefix) {
            html.push('    <div class="open-starter-prefix"><em>Starter: ' + TestCreatorService.formatRichText(sq.answerPrefix) + '</em></div>');
          }
          if (sq.answerType === 'true_false_justify') {
            var tfKey = (isTeacherKey && sq.solution) ? (' &nbsp; (Key: ' + TestCreatorService.formatRichText(sq.solution) + ')') : '';
            html.push('    <div style="margin:4px 0 6px 14px;font-size:9.5pt;font-weight:bold;">[ &nbsp; ] True &nbsp;&nbsp;&nbsp; [ &nbsp; ] False' + tfKey + '</div>');
            html.push('    <div style="font-size:9pt;font-style:italic;margin-left:14px;margin-bottom:4px;">Quote line from text to justify:</div>');
            html.push(buildWritingLinesHtml(sqLines, 'lines'));
          } else {
            if (isTeacherKey && sq.solution) {
              html.push('    <div style="color:#b91c1c;font-weight:bold;margin:2px 0;">&rarr; Answer: ' + TestCreatorService.formatRichText(sq.solution) + '</div>');
            }
            html.push(buildWritingLinesHtml(sqLines, sq.lineStyle || 'lines'));
          }
          html.push('  </div>');
        });
        break;
    }

    html.push('</div>');
    return html.join('\n');
  };

  TestCreatorService.exportToHtml = function (test, options) {
    var opts = options || {};
    var isTeacherKey = !!opts.isTeacherKey;
    var variant = opts.variant || test.variant || 'A';
    var themeName = opts.stylesheetTheme || 'academic';
    var studentName = opts.studentName || '';
    var className = opts.className || test.className || '';
    var totalPts = TestCreatorService.calculateTotalTestPoints(test);

    var globalStyle = Object.assign({
      fontSize: '11pt',
      lineHeight: 1.5,
      padding: '14px',
      numberedLines: false
    }, (test && test.exportStyle) || {}, opts.exportStyle || {});

    var customCssRules = [];
    if (globalStyle.fontSize) {
      customCssRules.push('.exam-sheet { font-size: ' + globalStyle.fontSize + '; }');
    }
    if (globalStyle.lineHeight) {
      customCssRules.push('.exam-sheet, .cloze-text, .composition-prompt { line-height: ' + globalStyle.lineHeight + '; }');
    }
    if (globalStyle.padding) {
      customCssRules.push('.exercise-card { padding: ' + globalStyle.padding + '; }');
    }

    // Per-exercise style overrides
    (test.exercises || []).forEach(function (ex) {
      if (!ex || !ex.id) return;
      var es = ex.exportStyle;
      if (!es) return;
      var exRules = [];
      if (es.fontSize) exRules.push('font-size: ' + es.fontSize + ' !important;');
      if (es.lineHeight) exRules.push('line-height: ' + es.lineHeight + ' !important;');
      if (es.padding) exRules.push('padding: ' + es.padding + ' !important;');
      if (exRules.length > 0) {
        customCssRules.push('#ex-' + ex.id + ' { ' + exRules.join(' ') + ' }');
      }

      if (es.titleStyle) {
        var tRules = [];
        if (es.titleStyle.bold !== undefined) tRules.push('font-weight: ' + (es.titleStyle.bold ? '900' : 'normal') + ' !important;');
        if (es.titleStyle.italic !== undefined) tRules.push('font-style: ' + (es.titleStyle.italic ? 'italic' : 'normal') + ' !important;');
        if (es.titleStyle.underline !== undefined) tRules.push('text-decoration: ' + (es.titleStyle.underline ? 'underline' : 'none') + ' !important;');
        if (es.titleStyle.uppercase !== undefined) tRules.push('text-transform: ' + (es.titleStyle.uppercase ? 'uppercase' : 'none') + ' !important;');
        if (es.titleStyle.size) tRules.push('font-size: ' + es.titleStyle.size + ' !important;');
        if (es.titleStyle.align) tRules.push('text-align: ' + es.titleStyle.align + ' !important;');
        if (tRules.length) customCssRules.push('#ex-' + ex.id + ' .exercise-title { ' + tRules.join(' ') + ' }');
      }
      if (es.instructionsStyle) {
        var iRules = [];
        if (es.instructionsStyle.bold !== undefined) iRules.push('font-weight: ' + (es.instructionsStyle.bold ? 'bold' : 'normal') + ' !important;');
        if (es.instructionsStyle.italic !== undefined) iRules.push('font-style: ' + (es.instructionsStyle.italic ? 'italic' : 'normal') + ' !important;');
        if (es.instructionsStyle.underline !== undefined) iRules.push('text-decoration: ' + (es.instructionsStyle.underline ? 'underline' : 'none') + ' !important;');
        if (es.instructionsStyle.size) iRules.push('font-size: ' + es.instructionsStyle.size + ' !important;');
        if (es.instructionsStyle.align) iRules.push('text-align: ' + es.instructionsStyle.align + ' !important;');
        if (iRules.length) customCssRules.push('#ex-' + ex.id + ' .exercise-instructions { ' + iRules.join(' ') + ' }');
      }
      if (es.promptStyle) {
        var pRules = [];
        if (es.promptStyle.bold !== undefined) pRules.push('font-weight: ' + (es.promptStyle.bold ? 'bold' : 'normal') + ' !important;');
        if (es.promptStyle.size) pRules.push('font-size: ' + es.promptStyle.size + ' !important;');
        if (pRules.length) customCssRules.push('#ex-' + ex.id + ' .mcq-prompt, #ex-' + ex.id + ' .open-prompt, #ex-' + ex.id + ' .composition-prompt { ' + pRules.join(' ') + ' }');
      }
    });

    var html = [];
    html.push('<!DOCTYPE html>');
    html.push('<html lang="en">');
    html.push('<head>');
    html.push('  <meta charset="UTF-8">');
    html.push('  <title>' + escapeHtml(test.title || 'Test') + (isTeacherKey ? ' (Teacher Solution Key)' : '') + '</title>');
    html.push('  <style>');
    html.push(TestCreatorService.getThemeCss(themeName));
    if (customCssRules.length > 0) {
      html.push('/* Custom Export Styling */');
      html.push(customCssRules.join('\n'));
    }
    html.push('  </style>');
    html.push('</head>');
    html.push('<body>');
    html.push('  <div class="exam-sheet">');

    // Header section
    html.push(TestCreatorService.renderHeaderHtml(test, isTeacherKey, variant, studentName, className, totalPts));

    // Exercises
    (test.exercises || []).forEach(function (ex, idx) {
      html.push(TestCreatorService.renderExerciseHtml(ex, idx, isTeacherKey, { exportStyle: globalStyle }));
    });

    html.push('  </div>');
    html.push('</body>');
    html.push('</html>');

    return html.join('\n');
  };

  TestCreatorService.exportToMarkdown = function (test, options) {
    var opts = options || {};
    var isTeacherKey = !!opts.isTeacherKey;
    var variant = opts.variant || test.variant || 'A';
    var totalPts = TestCreatorService.calculateTotalTestPoints(test);
    var hc = TestCreatorService.ensureHeaderConfig(test);

    var md = [];
    var titleLine = '# ' + (test.title || 'Exam') + (isTeacherKey ? ' — [TEACHER SOLUTION KEY]' : '');
    if (hc.showVariantBadge) {
      titleLine += ' (Group ' + variant + ')';
    }
    md.push(titleLine);
    if (hc.showSubtitle && hc.subtitleText) {
      md.push('### ' + hc.subtitleText);
    }
    md.push('');

    var metaBits = [];
    if (hc.showClass) metaBits.push('**' + (hc.classLabel || 'Class:') + '** ' + (test.className || '______'));
    if (hc.showDate) metaBits.push('**' + (hc.dateLabel || 'Date:') + '** ' + (test.date || '______'));
    if (hc.showTeacher) metaBits.push('**' + (hc.teacherLabel || 'Teacher:') + '** ' + (test.teacher || '______'));
    if (hc.showDuration) metaBits.push('**' + (hc.durationLabel || 'Duration:') + '** ' + (test.durationMinutes || 45) + ' min');
    if (hc.showTotalPoints) metaBits.push('**' + (hc.pointsLabel || 'Total:') + '** ' + totalPts + ' pts');
    if (metaBits.length > 0) {
      md.push('> ' + metaBits.join(' | '));
    }
    if (hc.showMaterials && test.materialsAllowed && test.materialsAllowed.length) {
      md.push('> **' + (hc.materialsLabel || 'Materials Allowed:') + '** ' + test.materialsAllowed.join(', '));
    }
    if (hc.showScope && test.scope) {
      md.push('> **' + (hc.scopeLabel || 'Scope / Topic:') + '** ' + test.scope);
    }
    if (hc.showInstructions && hc.instructionsText) {
      md.push('');
      md.push('> *Instructions:* ' + hc.instructionsText);
    }
    md.push('');
    md.push('---');
    md.push('');

    (test.exercises || []).forEach(function (ex, idx) {
      var num = idx + 1;
      md.push('## Exercise ' + num + ': ' + (ex.title || 'Question') + ' (' + (ex.points || 0) + ' pts)');
      if (ex.instructions) md.push('*' + ex.instructions + '*\n');

      switch (ex.type) {
        case 'cloze':
          TestCreatorService.normalizeExerciseItems(ex);
          var cItems = (ex.content && ex.content.items) || [];
          cItems.forEach(function (it, itIdx) {
            var prefix = cItems.length > 1 ? (itIdx + 1) + '. ' : '';
            var txt = it.text || '';
            if (isTeacherKey) {
              md.push(prefix + txt.replace(/\[([^\]]+)\]/g, '**[$1]**'));
            } else {
              md.push(prefix + txt.replace(/\[([^\]]+)\]/g, '_______'));
            }
            md.push('');
          });
          break;

        case 'mcq':
          var qs = (ex.content && ex.content.questions) || [];
          qs.forEach(function (q, qIdx) {
            md.push('**' + (qIdx + 1) + '. ' + q.prompt + '** (' + (q.points || 1) + ' pt)');
            (q.options || []).forEach(function (opt, oIdx) {
              var isCorrect = (q.correctIndices || []).indexOf(oIdx) !== -1;
              if (isTeacherKey && isCorrect) {
                md.push('- [x] **' + opt + '** *(Correct)*');
              } else {
                md.push('- [ ] ' + opt);
              }
            });
            md.push('');
          });
          break;

        case 'open_question':
          TestCreatorService.normalizeExerciseItems(ex);
          var oItems = (ex.content && ex.content.items) || [];
          oItems.forEach(function (it, itIdx) {
            var guidance = it.lengthGuidance || exOpts.lengthGuidance;
            var gStr = guidance ? ' *(' + guidance + ')*' : '';
            md.push('**' + (itIdx + 1) + '. ' + (it.prompt || 'Question') + '**' + gStr + ' (' + (it.points || 1) + ' pts)');
            var starter = it.answerPrefix || exOpts.answerPrefix;
            if (starter) {
              md.push('> *Starter: ' + starter + '*');
            }
            if (isTeacherKey && it.sampleAnswer) {
              md.push('> *Sample Answer:* ' + it.sampleAnswer);
            }
            md.push('');
          });
          break;

        case 'composition':
          TestCreatorService.normalizeExerciseItems(ex);
          var compItems = (ex.content && ex.content.items) || [];
          if (exOpts.showGenreBadge !== false && exOpts.textGenre) {
            md.push('*Format / Genre: ' + exOpts.textGenre + '*\n');
          }
          if (exOpts.showPrompts !== false) {
            compItems.forEach(function (it, itIdx) {
              var label = compItems.length > 1 ? (it.label || ('Task ' + (itIdx + 1))) + ': ' : '';
              md.push('**' + label + '** ' + (it.prompt || ''));
              md.push('*Target word count: ~' + (it.targetWordCount || 150) + ' words*');
              md.push('');
            });
          }
          if (exOpts.showDraftBox) {
            md.push('> **' + (exOpts.draftTitle || 'Draft & Rough Work (Not graded)') + '**');
            if (exOpts.draftNote) md.push('> *' + exOpts.draftNote + '*');
            md.push('');
          }
          if (exOpts.showChecklist) {
            md.push('**' + (exOpts.checklistTitle || 'Student Proofreading Checklist:') + '**');
            var cItems = (Array.isArray(exOpts.checklistItems) && exOpts.checklistItems.length)
              ? exOpts.checklistItems
              : ['Structure & Paragraphs', 'Spelling & Verb Tenses', 'Punctuation & Capitalization', 'Word Count Verified'];
            cItems.forEach(function (ci) {
              md.push('- [ ] ' + ci);
            });
            md.push('');
          }
          if (exOpts.showRubric !== false && Array.isArray(ex.markingRubric) && ex.markingRubric.length) {
            md.push('| Criteria | Max Points | Score |');
            md.push('|---|---|---|');
            ex.markingRubric.forEach(function (r) {
              md.push('| ' + r.title + ' | /' + (r.maxPoints || 0) + ' | |');
            });
            md.push('');
          }
          break;

        case 'picture_description':
          TestCreatorService.normalizeExerciseItems(ex);
          var pItems = (ex.content && ex.content.items) || [];
          pItems.forEach(function (it, itIdx) {
            md.push('**Picture ' + (itIdx + 1) + ':** ' + (it.prompt || ''));
            if (it.imageCaption) md.push('*' + it.imageCaption + '*');
            if (isTeacherKey && it.modelAnswer) {
              md.push('> *Sample Answer:* ' + it.modelAnswer);
            }
            md.push('');
          });
          break;

        default:
          if (ex.content && ex.content.prompt) md.push(ex.content.prompt);
          break;
      }

      md.push('');
      md.push('---');
      md.push('');
    });

    return md.join('\n');
  };

  TestCreatorService.exportToDocxHtml = function (test, options) {
    var inner = TestCreatorService.exportToHtml(test, options);
    var wordHeader = [
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">',
      '<head><meta charset="utf-8"><title>' + escapeHtml(test.title) + '</title>',
      '<!--[if gte mso 9]>',
      '<xml>',
      ' <w:WordDocument>',
      '  <w:View>Print</w:View>',
      '  <w:Zoom>100</w:Zoom>',
      '  <w:DoNotOptimizeForBrowser/>',
      ' </w:WordDocument>',
      '</xml>',
      '<![endif]-->'
    ].join('\n');

    return inner.replace('<!DOCTYPE html>\n<html lang="en">', wordHeader);
  };

  TestCreatorService.exportClassBatch = function (test, students, variantAssignments, options) {
    var opts = options || {};
    var themeName = opts.stylesheetTheme || 'academic';
    var isTeacherKey = !!opts.isTeacherKey;

    var compiledSheets = [];
    (students || []).forEach(function (st, idx) {
      var assignedVariant = (variantAssignments && variantAssignments[st.id]) || (idx % 2 === 0 ? 'A' : 'B');
      var variantTest = TestCreatorService.generateVariant(test, assignedVariant);

      var sheetOpts = Object.assign({}, opts, {
        studentName: (st.name || st.firstName + ' ' + st.lastName || 'Student ' + (idx + 1)),
        className: test.className || '',
        variant: assignedVariant,
        isTeacherKey: isTeacherKey,
        stylesheetTheme: themeName
      });

      var sheetHtml = TestCreatorService.exportToHtml(variantTest, sheetOpts);
      var bodyContent = sheetHtml.match(/<div class="exam-sheet">[\s\S]*<\/div>\s*<\/body>/);
      if (bodyContent) {
        var cleanBody = bodyContent[0].replace('</body>', '');
        var pageBreak = idx > 0 ? '<div style="page-break-before: always; height: 1px;"></div>' : '';
        compiledSheets.push(pageBreak + cleanBody);
      }
    });

    return [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head><meta charset="UTF-8"><title>' + escapeHtml(test.title || 'Class Exam Set') + '</title>',
      '<style>',
      TestCreatorService.getThemeCss(themeName),
      '</style>',
      '</head>',
      '<body>',
      compiledSheets.join('\n'),
      '</body></html>'
    ].join('\n');
  };

  return TestCreatorService;
});
