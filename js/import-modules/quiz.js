window.IMPORT_MODULE_QUIZ = {
  id: 'quiz',
  i18nKey: 'importDestQuiz',
  hasGroupStep: false,
  hasWbStep: true,
  target: 'customQuizzes',
  varName: 'quizBank',
  filePickerLabelKey: 'importQuizPickLabel',
  fields: [
    {
      key: 'question',
      i18nKey: 'importQuizFieldQuestion',
      required: true,
      autoMatch: ['question', 'frage', 'domanda', 'q', 'prompt', 'quiz question', 'stem']
    },
    {
      key: 'answer1',
      i18nKey: 'importQuizFieldA1',
      required: false,
      autoMatch: ['answer 1', 'answer1', 'a1', 'choice 1', 'choice1', 'option 1', 'option1', 'réponse 1', 'antwort 1', 'risposta 1']
    },
    {
      key: 'answer2',
      i18nKey: 'importQuizFieldA2',
      required: false,
      autoMatch: ['answer 2', 'answer2', 'a2', 'choice 2', 'choice2', 'option 2', 'option2', 'réponse 2', 'antwort 2', 'risposta 2']
    },
    {
      key: 'answer3',
      i18nKey: 'importQuizFieldA3',
      required: false,
      autoMatch: ['answer 3', 'answer3', 'a3', 'choice 3', 'choice3', 'option 3', 'option3', 'réponse 3', 'antwort 3', 'risposta 3']
    },
    {
      key: 'answer4',
      i18nKey: 'importQuizFieldA4',
      required: false,
      autoMatch: ['answer 4', 'answer4', 'a4', 'choice 4', 'choice4', 'option 4', 'option4', 'réponse 4', 'antwort 4', 'risposta 4']
    },
    {
      key: 'correctAnswer',
      i18nKey: 'importQuizFieldCorrect',
      required: false,
      autoMatch: ['correct answer', 'correctanswer', 'correct', 'right answer', 'solution', 'bonne réponse', 'richtige antwort', 'risposta corretta', 'answer', 'réponse']
    },
    {
      key: 'theme',
      i18nKey: 'importQuizFieldTheme',
      required: false,
      autoMatch: ['theme', 'thème', 'thema', 'tema', 'topic', 'category', 'catégorie', 'kategorie', 'categoria', 'subject', 'type']
    },
    {
      key: 'keyword',
      i18nKey: 'importQuizFieldKeyword',
      required: false,
      autoMatch: ['keyword', 'key word', 'mot-clé', 'mot clé', 'schlüsselwort', 'parola chiave', 'tag', 'subtopic', 'focus']
    }
  ],
  conflictKey: function (row) {
    return (row.question || '').trim().toLowerCase();
  },
  write: async function (mappedRows, conflictDecisions, options) {
    var existing = Array.isArray(options.existingWords) ? options.existingWords.slice() : [];
    var existingByKey = {};
    existing.forEach(function (q, i) {
      var k = (q.question || '').trim().toLowerCase();
      if (k) existingByKey[k] = i;
    });

    var added = 0, updated = 0, skipped = 0;

    mappedRows.forEach(function (row, i) {
      var questionRaw = (row.question || '').trim();
      if (!questionRaw) return;
      var k = questionRaw.toLowerCase();
      var existIdx = existingByKey[k];
      var isConflict = existIdx !== undefined;
      var decision = isConflict ? (conflictDecisions[i] || 'skip') : 'new';

      if (decision === 'skip') { skipped++; return; }

      // Map answer1–4 back to "answer 1"–"answer 4" (the format used in the file)
      var quizObj = { question: questionRaw };
      if (row.answer1 !== undefined && row.answer1 !== '') quizObj['answer 1'] = row.answer1;
      if (row.answer2 !== undefined && row.answer2 !== '') quizObj['answer 2'] = row.answer2;
      if (row.answer3 !== undefined && row.answer3 !== '') quizObj['answer 3'] = row.answer3;
      if (row.answer4 !== undefined && row.answer4 !== '') quizObj['answer 4'] = row.answer4;
      if (row.correctAnswer !== undefined && row.correctAnswer !== '') quizObj.correctAnswer = row.correctAnswer;
      if (row.theme !== undefined && row.theme !== '') quizObj.theme = row.theme;
      if (row.keyword !== undefined && row.keyword !== '') quizObj.keyword = row.keyword;

      if (decision === 'overwrite' && isConflict) {
        existing[existIdx] = Object.assign({}, existing[existIdx], quizObj);
        updated++;
      } else {
        existing.push(quizObj);
        if (!isConflict) existingByKey[k] = existing.length - 1;
        added++;
      }
    });

    var content = 'const quizBank = ' + JSON.stringify(existing, null, 2) + ';\n';
    var saveResult = await Desktop.saveText(options.target || 'customQuizzes', options.targetFile, content);
    if (!saveResult || !saveResult.ok) {
      return { ok: false, error: 'Save failed' };
    }
    return { ok: true, added: added, updated: updated, skipped: skipped };
  }
};
