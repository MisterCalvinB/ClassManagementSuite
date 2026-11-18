/**
 * js/mdb-ai-service.js
 * Universal Schema-Driven AI Generation & Autofill Studio for Manage Database
 * Powered by local offline Small Language Models via window.SlmService (transformers.js).
 * Strictly follows Light Neobrutalist styling, electron-best-practices, and i18n-key-manager.
 */

(function (global) {
  'use strict';

  var _batchCancelRequested = false;
  var _isBatchRunning = false;
  var _isStudioGenerating = false;
  var _studioMode = 'topic'; // 'topic' | 'text'
  var _generatedRecords = [];

  // Studio Generation Timer & Speed State
  var _timerInterval = null;
  var _genStartTime = 0;
  var _firstTokenTime = 0;
  var _tokenCount = 0;
  var _targetTokenEstimate = 120;
  var _lastMeasuredSpeed = 18.0; // tokens/sec
  var _currentSpeed = 18.0;
  var _estRemainingSec = 0;
  var _elapsedSec = 0;
  var _warmupEstimateSec = 0.8;

  // ═════════════════════════════════════════════════════════════════════════
  // TYPE-SPECIFIC TAILORED AI CONFIGURATIONS & PRESETS (17 DATABASE TYPES)
  // ═════════════════════════════════════════════════════════════════════════
  var MDB_AI_TYPE_CONFIGS = {
    wordbanks: {
      title: 'Vocabulary Word Banks',
      badge: 'Lexicon & Definitions',
      badgeColor: '#5b8fcc',
      guide: 'Generates rich vocabulary entries with IPA phonetic transcription, CEFR level (A1-C2), pedagogical definitions, illustrative in-context sentences, translations (FR/DE/IT), synonyms, antonyms, and hypernyms.',
      topicLabel: 'Vocabulary Topic, Theme, or Seed Words',
      topicPlaceholder: 'e.g., Airport Travel & Security, Climate Change, Renewable Energy...',
      textLabel: 'Source Reading Passage or Transcript',
      textPlaceholder: 'Paste text or dialogue to extract and generate rich vocabulary entries from...',
      focusPlaceholder: 'e.g., Focus on phrasal verbs, British spelling, idioms, B2 exam vocabulary...',
      defaultCount: 5,
      showCefr: true,
      defaultCefr: 'B1',
      presets: [
        { label: 'Airport & Travel', val: 'Airport Travel, Security & Boarding' },
        { label: 'Climate & Ecology', val: 'Climate Change & Renewable Energy' },
        { label: 'Medicine & Health', val: 'Healthcare, Illness & Medical Treatments' },
        { label: 'Debate & Opinion', val: 'Persuasion, Rhetoric & Debate Vocab' }
      ],
      schemaInstructions: [
        'Each record MUST include: "word", "ipa", "partOfSpeech", "level", "theme", "french", "english", "german", "italian", "definition", "exampleSentence", "synonyms", "antonyms", "otherForms", "hypernym", "hyponym".',
        '"exampleSentence" must be a natural sentence illustrating the word without using the word itself.'
      ]
    },
    quotebanks: {
      title: 'Literary & Historical Quote Banks',
      badge: 'Quotes & Analysis',
      badgeColor: '#8b7cc2',
      guide: 'Generates curated quotations with speaker/author, source work, historical context, thematic tags, and analytical prompts for classroom discussion or literary analysis.',
      topicLabel: 'Author, Play, Novel, Historical Figure, or Theme',
      topicPlaceholder: "e.g., Shakespeare's Macbeth, George Orwell's 1984, Martin Luther King Jr...",
      textLabel: 'Literary Excerpt or Speech Transcript',
      textPlaceholder: 'Paste a chapter, speech, or poem to extract memorable quotations and discussion prompts...',
      focusPlaceholder: 'e.g., Focus on rhetorical questions, tragic flaws, moral dilemmas, poetic devices...',
      defaultCount: 3,
      showCefr: true,
      defaultCefr: 'B2',
      presets: [
        { label: 'Macbeth: Ambition', val: "Shakespeare's Macbeth: Ambition & Fate" },
        { label: '1984: Surveillance', val: "George Orwell's 1984: Surveillance & Truth" },
        { label: 'Civil Rights', val: 'Civil Rights Movement: Justice & Freedom' },
        { label: 'Romantic Poetry', val: 'Wordsworth & Keats: Nature & Emotion' }
      ],
      schemaInstructions: [
        'Each record MUST include: "quote", "author", "work", "year", "character", "theme", "context", "analysisPrompt", "tags".'
      ]
    },
    dictations: {
      title: 'Audio & Reading Dictation Passages',
      badge: 'Dictation & Phonetics',
      badgeColor: '#6abf8e',
      guide: 'Generates graded listening/spelling dictations divided into incremental pause segments with phonetic challenges, punctuation rules, and vocabulary previews.',
      topicLabel: 'Dictation Story Concept, Scene, or Grammatical Focus',
      topicPlaceholder: 'e.g., A Rainy Evening in Edinburgh, Preparing for an Arctic Expedition, The Clockmaker...',
      textLabel: 'Original Story or Prose to Convert into Dictation',
      textPlaceholder: 'Paste a prose story to calibrate and divide into pedagogical dictation segments...',
      focusPlaceholder: 'e.g., Emphasize past simple vs continuous, homophones, silent letters, contractions...',
      defaultCount: 2,
      showCefr: true,
      defaultCefr: 'A2',
      presets: [
        { label: 'Market Day', val: 'A Busy Morning at the City Market' },
        { label: 'Night Train', val: 'The Midnight Train to the Highlands' },
        { label: 'Space Mission', val: 'Preparing for an Astronaut Space Mission' },
        { label: 'Secret Garden', val: 'Discovering an Old Forgotten Garden' }
      ],
      schemaInstructions: [
        'Each record MUST include: "title", "level", "difficulty", "text", "segments", "phoneticFocus", "grammarPoints", "wordCount".',
        '"segments" must be an array of short audio-pause phrases (4-8 words each).'
      ]
    },
    grammarbanks: {
      title: 'Grammar Rules & Pattern Banks',
      badge: 'Grammar & Syntax',
      badgeColor: '#e2c96e',
      guide: 'Generates explicit grammatical rules with clear structural formulas, common learner pitfalls, contrastive examples, and practice prompts.',
      topicLabel: 'Grammar Target, Tense, or Syntactic Construction',
      topicPlaceholder: 'e.g., Third Conditional & Regrets, Relative Clauses, Passive Voice in Journalism...',
      textLabel: 'Reading Passage Illustrating Specific Grammar Structures',
      textPlaceholder: 'Paste text containing target structures to extract grammar rules and contextual examples...',
      focusPlaceholder: 'e.g., Contrast with French/German false friends, emphasize inversion, polite requests...',
      defaultCount: 3,
      showCefr: true,
      defaultCefr: 'B1',
      presets: [
        { label: 'Conditionals 2 & 3', val: 'Second vs Third Conditionals (Unreal Past)' },
        { label: 'Modals of Deduction', val: 'Must have, Might have, Cant have (Past Deduction)' },
        { label: 'Reported Speech', val: 'Reported Speech & Tense Backshift' },
        { label: 'Gerund vs Infinitive', val: 'Verbs followed by Gerund vs Infinitive with meaning change' }
      ],
      schemaInstructions: [
        'Each record MUST include: "rule", "formula", "level", "explanation", "examples", "commonMistakes", "notes".',
        '"examples" must be an array of positive, negative, and question example sentences.'
      ]
    },
    gapfillbanks: {
      title: 'Cloze & Gap-Fill Sentence Banks',
      badge: 'Cloze & Practice',
      badgeColor: '#5b8fcc',
      guide: 'Generates cloze exercise sentences with targeted blanks [___], distractors, answer keys, grammatical hints, and context cues.',
      topicLabel: 'Target Grammar, Collocation, or Vocabulary Set for Gap-Fill',
      topicPlaceholder: 'e.g., Phrasal Verbs with "Take", Dependent Prepositions, Present Perfect vs Past Simple...',
      textLabel: 'Passage to Convert into Cloze Exercises',
      textPlaceholder: 'Paste sentences or paragraphs to generate gap-fill challenges with answer keys...',
      focusPlaceholder: 'e.g., 4 multiple-choice options per blank, focus on academic vocabulary, tricky prepositions...',
      defaultCount: 5,
      showCefr: true,
      defaultCefr: 'B1',
      presets: [
        { label: 'Prepositions', val: 'Dependent Prepositions after Adjectives (fond of, interested in)' },
        { label: 'Phrasal Verbs', val: 'Phrasal Verbs with Look, Give, and Turn' },
        { label: 'Linking Words', val: 'Conjunctions & Linking Words (However, Despite, Although)' },
        { label: 'Past Tenses', val: 'Past Simple vs Past Continuous vs Past Perfect' }
      ],
      schemaInstructions: [
        'Each record MUST include: "sentence", "targetWord", "options", "hint", "level", "grammarTopic".',
        'In "sentence", replace the target word with [___].'
      ]
    },
    errorbanks: {
      title: 'Error Correction & Proofreading Banks',
      badge: 'Error Analysis',
      badgeColor: '#c96b6b',
      guide: 'Generates authentic student sentences containing common grammatical, spelling, or syntactic mistakes with corrected forms and explanatory feedback.',
      topicLabel: 'Target Error Category or Student Writing Level',
      topicPlaceholder: 'e.g., Subject-Verb Agreement, False Friends with French, Misplaced Apostrophes...',
      textLabel: 'Sample Student Drafts or Essays with Errors',
      textPlaceholder: 'Paste draft writing to analyze, detect errors, and structure into proofreading exercises...',
      focusPlaceholder: 'e.g., Subtle B2/C1 register errors, L1 language interference, comma splices...',
      defaultCount: 5,
      showCefr: true,
      defaultCefr: 'B1',
      presets: [
        { label: 'False Friends', val: 'French-English False Friends (sensible/sensitive, attend/wait)' },
        { label: 'Subject-Verb', val: 'Subject-Verb Agreement with Collective Nouns and Quantifiers' },
        { label: 'Tense Inconsistency', val: 'Incorrect Tense Switching in Narrative Writing' },
        { label: 'Preposition Errors', val: 'Common Misused Prepositions (discuss about, explain me)' }
      ],
      schemaInstructions: [
        'Each record MUST include: "sentence", "correction", "errorType", "explanation", "level".',
        '"sentence" must contain the realistic error; "correction" must be the fully corrected sentence.'
      ]
    },
    sentencebanks: {
      title: 'Exemplar Sentence & Pattern Banks',
      badge: 'Syntax & Patterns',
      badgeColor: '#6abf8e',
      guide: 'Generates exemplary model sentences demonstrating idiomatic collocations, sentence transformations, and stylistic variations.',
      topicLabel: 'Sentence Theme, Structure, or Rhetorical Device',
      topicPlaceholder: 'e.g., Inversion for Emphasis (Seldom have I...), Expressing Nuanced Opinions, Causal Connections...',
      textLabel: 'Passage to Model Sentences After',
      textPlaceholder: 'Paste source material to extract and rephrase into syntactic model sentences...',
      focusPlaceholder: 'e.g., Academic IELTS/Cambridge essay style, conversational debate phrases, formal email openers...',
      defaultCount: 5,
      showCefr: true,
      defaultCefr: 'B2',
      presets: [
        { label: 'Dramatic Inversion', val: 'Negative Inversions (Hardly had, Not only, Seldom)' },
        { label: 'Opinion & Nuance', val: 'Nuanced Academic Viewpoints and Counter-Arguments' },
        { label: 'Formal Email', val: 'Formal Business & Academic Correspondence Openers/Closers' },
        { label: 'Cause & Effect', val: 'Complex Cause, Effect & Consequence Constructions' }
      ],
      schemaInstructions: [
        'Each record MUST include: "sentence", "pattern", "level", "function", "tags", "translation".'
      ]
    },
    storybanks: {
      title: 'Graded Reader Stories & Short Passages',
      badge: 'Stories & Narrative',
      badgeColor: '#8b7cc2',
      guide: 'Generates engaging, graded short stories or dialogue narratives tailored with vocabulary targets, reading comprehension questions, and cultural contexts.',
      topicLabel: 'Story Theme, Genre, Setting, or Character Scenario',
      topicPlaceholder: 'e.g., Mystery on the Orient Express, A Lost Robot in Paris, An Unforgettable Summer Job...',
      textLabel: 'Story Outline or Source Concept',
      textPlaceholder: 'Paste a story outline or summary to expand into a complete graded pedagogical narrative...',
      focusPlaceholder: 'e.g., High dialogue ratio, target 250-350 words, rich sensory adjectives, cliffhanger ending...',
      defaultCount: 1,
      showCefr: true,
      defaultCefr: 'A2',
      presets: [
        { label: 'Clock Tower Mystery', val: 'The Mystery of the Abandoned Clock Tower' },
        { label: 'First Day Abroad', val: 'An Exchange Students First Day in London' },
        { label: 'Science Fair Mishap', val: 'The Great Chemistry Experiment Disaster' },
        { label: 'Island Adventure', val: 'Stranded on a Deserted Scottish Island' }
      ],
      schemaInstructions: [
        'Each record MUST include: "title", "content", "level", "genre", "wordCount", "vocabulary", "comprehensionQuestions".',
        '"comprehensionQuestions" must be an array of 3-4 text-based questions.'
      ]
    },
    quizzes: {
      title: 'Interactive Classroom Quizzes',
      badge: 'Quizzes & Multiple Choice',
      badgeColor: '#e2c96e',
      guide: 'Generates interactive quiz questions with 4 plausible options, designated correct index, explanations, point weights, and topic tags.',
      topicLabel: 'Quiz Subject, Curriculum Chapter, or Trivia Focus',
      topicPlaceholder: 'e.g., World Geography & Capitals, British Royal History, Environmental Science & Recycling...',
      textLabel: 'Lesson Material to Turn into Quiz Questions',
      textPlaceholder: 'Paste chapter text or fact sheet to automatically synthesize multiple-choice questions...',
      focusPlaceholder: 'e.g., Include tricky plausible distractors, fun trivia, avoid ambiguous phrasing...',
      defaultCount: 5,
      showCefr: true,
      defaultCefr: 'B1',
      presets: [
        { label: 'World Capitals', val: 'World Geography: Capitals, Flags & Landmarks' },
        { label: 'Solar System', val: 'Science: Planets, Stars & Space Missions' },
        { label: 'English Idioms', val: 'Idiomatic Expressions and Cultural Sayings' },
        { label: 'History Milestones', val: 'Major Inventions & Historical Revolutions' }
      ],
      schemaInstructions: [
        'Each record MUST include: "question", "options", "answerIndex", "explanation", "points", "category".',
        '"options" must be an array of exactly 4 strings; "answerIndex" must be 0, 1, 2, or 3.'
      ]
    },
    testbanks: {
      title: 'Curriculum Test & Assessment Banks',
      badge: 'Evaluations & Tests',
      badgeColor: '#5b8fcc',
      guide: 'Generates structured test modules (reading comprehension, listening prompts, language tasks) with point values, marking criteria, and grading rubrics.',
      topicLabel: 'Assessment Topic, Term Exam Unit, or Subject Area',
      topicPlaceholder: 'e.g., End-of-Term Reading Comprehension, Oral Exam Speaking Prompts on Technology...',
      textLabel: 'Test Source Material or Curriculum Specifications',
      textPlaceholder: 'Paste syllabus objectives or reading texts to formulate formal assessment items...',
      focusPlaceholder: 'e.g., Align with CEFR B1 certification standards, include scoring rubric points...',
      defaultCount: 3,
      showCefr: true,
      defaultCefr: 'B1',
      presets: [
        { label: 'Reading Comprehension', val: 'Reading Comprehension Test: Renewable Energy Future' },
        { label: 'Oral Speaking Prompts', val: 'Oral Exam Speaking Cue Cards: Society and Technology' },
        { label: 'Listening Cloze Task', val: 'Audio Listening Comprehension: Science Podcast Interview' },
        { label: 'Writing Essay Prompt', val: 'Formal Argumentative Essay: Artificial Intelligence in Schools' }
      ],
      schemaInstructions: [
        'Each record MUST include: "title", "instructions", "level", "maxPoints", "questions", "rubric".'
      ]
    },
    competences: {
      title: 'Curriculum Standards & Competences',
      badge: 'Curriculum Standards',
      badgeColor: '#6abf8e',
      guide: 'Generates curriculum competence standards (code, title, pedagogical description, subject domain, tags) linked directly to lesson planning and evaluation rubrics.',
      topicLabel: 'Curriculum Area, Educational Cycle, or Subject Standard',
      topicPlaceholder: 'e.g., Oral Communication & Spoken Interaction, Reading for In-Depth Understanding, Digital Literacy...',
      textLabel: 'Official Curriculum Framework or Syllabus Document',
      textPlaceholder: 'Paste official educational curriculum standards or guidelines to extract structured competence codes...',
      focusPlaceholder: 'e.g., Follow CEFR Companion Volume descriptors, align with French Socle Commun or European Key Competences...',
      defaultCount: 4,
      showCefr: true,
      defaultCefr: 'B1',
      presets: [
        { label: 'Spoken Interaction', val: 'Oral Spoken Interaction, Conversation & Debate' },
        { label: 'Critical Reading', val: 'Reading Comprehension, Inference & Critical Analysis' },
        { label: 'Written Expression', val: 'Written Production, Structuring & Creative Writing' },
        { label: 'Media & Digital', val: 'Digital Literacy, Media Analysis & Online Communication' }
      ],
      schemaInstructions: [
        'Each record MUST include: "code", "title", "description", "domain", "level", "tags".',
        '"code" should be a short reference like "OC.1", "RD.2", or "WR.3".'
      ]
    },
    descriptors: {
      title: 'CEFR Descriptors & Skill Rubrics',
      badge: 'CEFR Descriptors',
      badgeColor: '#6abf8e',
      guide: 'Generates granular "Can-Do" descriptors across listening, reading, spoken production, spoken interaction, and writing for benchmark assessment.',
      topicLabel: 'Target Skill Area or CEFR Activity Category',
      topicPlaceholder: 'e.g., Spoken Fluency in Unfamiliar Situations, Processing Written Information, Online Collaboration...',
      textLabel: 'Source Competence Standard or Performance Scale',
      textPlaceholder: 'Paste broader curriculum goals to decompose into graded "Can-Do" descriptor milestones...',
      focusPlaceholder: 'e.g., Use standard "Can understand...", "Can express...", action-oriented language...',
      defaultCount: 4,
      showCefr: true,
      defaultCefr: 'B2',
      presets: [
        { label: 'Can-Do: Speaking', val: 'Can-Do: Sustained Monologue Describing Experiences' },
        { label: 'Can-Do: Listening', val: 'Can-Do: Understanding Complex Broadcasts & News' },
        { label: 'Can-Do: Debate', val: 'Can-Do: Collaborative Argumentation & Nuanced Opinion' },
        { label: 'Can-Do: Writing', val: 'Can-Do: Synthesizing Information from Multiple Sources' }
      ],
      schemaInstructions: [
        'Each record MUST include: "code", "title", "level", "skill", "canDo", "indicators".',
        '"canDo" must be a concise action statement starting with "Can...".'
      ]
    },
    phases: {
      title: 'Lesson Phases & Activity Bank',
      badge: 'Lesson Creator Bank',
      badgeColor: '#e2c96e',
      guide: 'Generates reusable pedagogical lesson phases (Warm-up, Direct Instruction, Guided Practice, Group Task, Wrap-up) for Lesson Creator with duration, interaction pattern, and materials.',
      topicLabel: 'Lesson Stage, Teaching Methodology, or Activity Theme',
      topicPlaceholder: 'e.g., Interactive Warm-ups & Icebreakers, Think-Pair-Share Collaborative Routines, Exit Ticket Wrap-ups...',
      textLabel: 'Lesson Plan Draft or Methodological Guide',
      textPlaceholder: 'Paste a lesson plan draft or pedagogy notes to break down into reusable phase components...',
      focusPlaceholder: 'e.g., 5-15 minute durations, active student engagement, low prep requirement...',
      defaultCount: 4,
      showCefr: false,
      defaultCefr: 'Any',
      presets: [
        { label: '5-Min Warm-Ups', val: 'Dynamic 5-Minute Brainstorming & Icebreaker Warm-Ups' },
        { label: 'Think-Pair-Share', val: 'Think-Pair-Share Collaborative Discovery Routines' },
        { label: 'Vocab Games', val: 'Active Vocabulary Consolidation & Rapid Recall Games' },
        { label: 'Exit Tickets', val: 'Formative Exit Ticket Assessment & Reflection Routines' }
      ],
      schemaInstructions: [
        'Each record MUST include: "name", "type", "duration", "description", "pedagogicalGoal", "materials".',
        '"duration" must be an integer number of minutes (e.g. 5, 10, 15).'
      ]
    },
    criteria: {
      title: 'Evaluation Criteria & Rubrics',
      badge: 'Grade Sheet Rubrics',
      badgeColor: '#5b8fcc',
      guide: 'Generates multi-tiered evaluation criteria for Grade Sheet with min/max points, score intervals, performance level descriptions, and competence links.',
      topicLabel: 'Evaluation Skill, Project Type, or Oral Exam Rubric',
      topicPlaceholder: 'e.g., Oral Presentation Rubric (Pronunciation, Fluency, Content), Group Project Collaboration, Essay Writing...',
      textLabel: 'Assessment Guidelines or Rubric Description',
      textPlaceholder: 'Paste existing rubric descriptions or evaluation guidelines to convert into structured criteria models...',
      focusPlaceholder: 'e.g., 0-20 point scales, 4 clear performance tiers (Novice, Developing, Proficient, Exemplary)...',
      defaultCount: 4,
      showCefr: false,
      defaultCefr: 'Any',
      presets: [
        { label: 'Oral Presentation', val: 'Oral Presentation: Delivery, Pronunciation & Eye Contact' },
        { label: 'Essay Coherence', val: 'Written Essay: Structure, Argumentation & Coherence' },
        { label: 'Group Collaboration', val: 'Group Work: Team Contribution, Listening & Reliability' },
        { label: 'Grammar & Accuracy', val: 'Language Control: Grammatical Precision & Rich Vocabulary' }
      ],
      schemaInstructions: [
        'Each record MUST include: "name", "minPoints", "maxPoints", "interval", "grades", "comments".',
        '"grades" must be an array of tier labels (e.g. ["Insufficient", "Developing", "Satisfactory", "Exemplary"]).',
        '"comments" must be an array of matching descriptive expectations for each tier.'
      ]
    },
    scales: {
      title: 'Grading Scale Models',
      badge: 'Grading & Percentages',
      badgeColor: '#8b7cc2',
      guide: 'Generates grading scale definitions with point bounds, step intervals, and percentage-to-grade calculation thresholds for Grade Sheet.',
      topicLabel: 'Grading Scale Type or National System',
      topicPlaceholder: 'e.g., Standard 0-20 French Notation, European ECTS A-F Scale, Percentage Letter Grade (A, B, C, D, F)...',
      textLabel: 'Grading Policy or Institutional Guidelines',
      textPlaceholder: 'Paste institutional grading guidelines to extract threshold percentages and grade steps...',
      focusPlaceholder: 'e.g., Strict pass mark at 50% or 60%, linear vs bell-curve thresholds...',
      defaultCount: 1,
      showCefr: false,
      defaultCefr: 'Any',
      presets: [
        { label: 'French 0-20 Scale', val: 'French Standard 0-20 Grading Scale (Pass mark 10/20, step 0.5)' },
        { label: 'US Letter Grades', val: 'US Letter Grades A to F with + and - Percentage Thresholds' },
        { label: 'European ECTS', val: 'ECTS 5-Tier Conversion Scale (A: 90%+, B: 80%+, C: 65%+, D: 50%+, F: Fail)' },
        { label: 'UK 3-Tier System', val: 'UK University Honours: First, Upper Second, Lower Second, Third' }
      ],
      schemaInstructions: [
        'Each record MUST include: "key", "label", "minGrade", "maxGrade", "interval", "thresholds".',
        '"thresholds" must be a JSON object mapping grade levels to required percentage integers.'
      ]
    },
    chips: {
      title: 'Personalised Observation Chips',
      badge: 'Teacher Observations',
      badgeColor: '#6abf8e',
      guide: 'Generates quick-click observation phrases and checklist chips for Grade Sheet (e.g., "Volunteers readily", "Needs encouragement", "Excellent grammar") organized by category.',
      topicLabel: 'Observation Category, Behavioral Focus, or Skill Area',
      topicPlaceholder: 'e.g., Positive Classroom Engagement, Oral Participation & Confidence, Homework & Study Habits...',
      textLabel: 'Teacher Notes or Report Card Comments',
      textPlaceholder: 'Paste teacher report card comments or feedback notes to synthesize into reusable observation chips...',
      focusPlaceholder: 'e.g., Constructive formative tone, actionable student advice, concise 2-5 word phrases...',
      defaultCount: 4,
      showCefr: false,
      defaultCefr: 'Any',
      presets: [
        { label: 'Oral Confidence', val: 'Oral Participation, Eagerness & Speaking Confidence' },
        { label: 'Homework & Study', val: 'Homework Completion, Thoroughness & Autonomous Work' },
        { label: 'Peer Collaboration', val: 'Kindness, Teamwork, Active Listening & Helping Others' },
        { label: 'Attention & Focus', val: 'Concentration, Listening Skills & Minimizing Distraction' }
      ],
      schemaInstructions: [
        'Each record MUST include: "section", "type", "items".',
        '"section" should be "Teacher Observations".',
        '"type" is the category name (e.g. "Oral Skills", "Effort & Behavior").',
        '"items" must be an array of 4-8 concise observation phrase strings (2-6 words each).'
      ]
    },
    badgebanks: {
      title: 'Custom Classroom Badges',
      badge: 'Class Management Badges',
      badgeColor: '#e2c96e',
      guide: 'Generates gamified student reward badges for Class Management with icon/emoji, positive/negative tone, point coefficient, scope (individual/team), and pedagogical meaning.',
      topicLabel: 'Badge Theme, Character Strengths, or Class Culture',
      topicPlaceholder: 'e.g., Positive Learning Habits, Team Spirit & Kindness, Critical Thinking & Curiosity...',
      textLabel: 'Classroom Expectations or Reward System Rules',
      textPlaceholder: 'Paste class reward guidelines or values to convert into gamified award badges...',
      focusPlaceholder: 'e.g., Varied positive emojis (🌟, 💡, 🤝, 🚀), balanced coefficients (+1, +2, +3), motivating labels...',
      defaultCount: 5,
      showCefr: false,
      defaultCefr: 'Any',
      presets: [
        { label: 'Kindness & Teamwork', val: 'Kindness, Empathy, Sharing & Helping Classmates' },
        { label: 'Curiosity & Discovery', val: 'Curiosity, Asking Great Questions & Independent Research' },
        { label: 'Focus & Resilience', val: 'Perseverance, Grit, Overcoming Challenges & Staying Focused' },
        { label: 'Leadership & Spirit', val: 'Classroom Leadership, Good Sportsmanship & Positive Attitude' }
      ],
      schemaInstructions: [
        'Each record MUST include: "icon", "label", "tone", "meaning", "coefficient", "scope".',
        '"icon" must be a single emoji or max 8 chars (e.g. "🌟", "💡", "🤝").',
        '"tone" must be "positive" or "negative".',
        '"coefficient" must be an integer (e.g. 1, 2, 3, -1).',
        '"scope" must be "individual", "team", or "both".'
      ]
    },
    modebanks: {
      title: 'Class Management Working Modes',
      badge: 'Class Modes',
      badgeColor: '#8b7cc2',
      guide: 'Generates customized classroom working modes for Class Management with icons, visual animations, background audio, presentation display titles, and volume settings.',
      topicLabel: 'Classroom Dynamic, Activity Type, or Pedagogical Focus',
      topicPlaceholder: 'e.g., Silent Reading, Socratic Debate, Team Hackathon, Lab Safety, Mindfulness...',
      textLabel: 'Classroom Guidelines or Mode Behavioral Expectations',
      textPlaceholder: 'Paste classroom guidelines, volume expectations, or activity rules to convert into working modes...',
      focusPlaceholder: 'e.g., Focus on calm visual animations (pulse, bubbles), clear titles, appropriate audio (whitenoise, binaural)...',
      defaultCount: 3,
      showCefr: false,
      defaultCefr: 'Any',
      presets: [
        { label: 'Independent Deep Work', val: 'Silent individual study, focused writing, exam condition' },
        { label: 'Collaborative Workshop', val: 'Small team breakout, interactive workshop, science experiment' },
        { label: 'Socratic Discussion', val: 'Active seminar debate, structured speaking turns, fishbowl conversation' },
        { label: 'Quick Sprint & Review', val: 'Gamified speed challenge, team quiz race, energetic brain break' }
      ],
      schemaInstructions: [
        'Each record MUST include: "name", "icon", "shortcutKey", "title", "subtitle", "pictureType", "pictureAnim", "soundType", "soundVol".',
        '"icon" must be a single emoji or valid icon name (e.g. "🤫", "💬", "👥", "🔬", "🎯").',
        '"pictureType" must be one of: "emoji", "speech_bubbles", "group_icons", "custom_url", "custom_file".',
        '"pictureAnim" must be one of: "none", "pulse", "bounce", "rotate", "shush", "bubbles".',
        '"soundType" must be one of: "none", "whitenoise", "binaural", "custom_audio".',
        '"soundVol" must be an integer between 0 and 100.'
      ]
    }
  };

  function mdbGetTypeConfig(typeKey) {
    if (typeKey && MDB_AI_TYPE_CONFIGS[typeKey]) {
      return MDB_AI_TYPE_CONFIGS[typeKey];
    }
    return MDB_AI_TYPE_CONFIGS.wordbanks;
  }

  function _t(key, fallback) {
    if (global.i18n && typeof global.i18n.t === 'function') {
      var val = global.i18n.t(key);
      if (val && val !== key) return val;
    }
    return fallback || key;
  }

  function _escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _formatTimerDuration(totalSeconds) {
    var s = Math.max(0, Math.floor(totalSeconds));
    var mins = Math.floor(s / 60);
    var secs = s % 60;
    var mStr = mins < 10 ? ('0' + mins) : String(mins);
    var sStr = secs < 10 ? ('0' + secs) : String(secs);
    return mStr + ':' + sStr;
  }

  function _startTimer(targetTokens, barId, elapsedId, remainId, speedId, fillId) {
    if (_timerInterval) {
      clearInterval(_timerInterval);
      _timerInterval = null;
    }
    _genStartTime = performance.now();
    _firstTokenTime = 0;
    _tokenCount = 0;
    _targetTokenEstimate = Math.max(30, targetTokens || 120);

    var baseline = 18.0;
    try {
      var stModel = window.SlmService ? window.SlmService.getActiveModel() : '';
      if (stModel === 'slm-ultra') baseline = 30.0;
      else if (stModel === 'slm-fast') baseline = 22.0;
      else if (stModel === 'slm-deep') baseline = 5.0;
      else if (stModel === 'slm-balanced') baseline = 9.5;
    } catch (_) {}

    _currentSpeed = _lastMeasuredSpeed > 0 ? (0.6 * _lastMeasuredSpeed + 0.4 * baseline) : baseline;
    var estTotalSec = _warmupEstimateSec + (_targetTokenEstimate / _currentSpeed);
    _estRemainingSec = Math.max(1, Math.round(estTotalSec));
    _elapsedSec = 0;

    var bar = document.getElementById(barId || 'ai-studio-timer-bar');
    var elapsedEl = document.getElementById(elapsedId || 'ai-studio-timer-elapsed');
    var remainEl = document.getElementById(remainId || 'ai-studio-timer-remaining');
    var speedEl = document.getElementById(speedId || 'ai-studio-timer-speed');
    var fillEl = document.getElementById(fillId || 'ai-studio-progress-fill');

    if (bar) bar.style.display = 'flex';
    if (elapsedEl) elapsedEl.textContent = '00:00';
    if (remainEl) remainEl.textContent = '~' + _estRemainingSec + 's';
    if (speedEl) speedEl.textContent = '';
    if (fillEl) fillEl.style.width = '3%';

    _timerInterval = setInterval(function () {
      _tickTimer(elapsedId, remainId, speedId, fillId);
    }, 100);
  }

  function _tickTimer(elapsedId, remainId, speedId, fillId) {
    if (!_genStartTime) return;
    var now = performance.now();
    _elapsedSec = (now - _genStartTime) / 1000;

    var elapsedEl = document.getElementById(elapsedId || 'ai-studio-timer-elapsed');
    var remainEl = document.getElementById(remainId || 'ai-studio-timer-remaining');
    var speedEl = document.getElementById(speedId || 'ai-studio-timer-speed');
    var fillEl = document.getElementById(fillId || 'ai-studio-progress-fill');

    if (elapsedEl) elapsedEl.textContent = _formatTimerDuration(_elapsedSec);

    var pct = 0;
    if (_firstTokenTime > 0) {
      var streamSec = (now - _firstTokenTime) / 1000;
      if (streamSec > 0.25 && _tokenCount >= 2) {
        _currentSpeed = _tokenCount / streamSec;
        if (speedEl) speedEl.textContent = _currentSpeed.toFixed(1) + ' tok/s';
      }
      var remainingTokens = Math.max(0, _targetTokenEstimate - _tokenCount);
      _estRemainingSec = Math.max(0, Math.round(remainingTokens / Math.max(1, _currentSpeed)));
      if (remainEl) remainEl.textContent = '~' + _estRemainingSec + 's';

      pct = Math.min(95, Math.round((_tokenCount / _targetTokenEstimate) * 100));
      if (fillEl) fillEl.style.width = Math.max(4, pct) + '%';
    } else {
      var warmupRemain = Math.max(0, Math.round(_warmupEstimateSec - _elapsedSec));
      if (remainEl) remainEl.textContent = '~' + (warmupRemain + Math.round(_targetTokenEstimate / _currentSpeed)) + 's';
      pct = Math.min(15, Math.round((_elapsedSec / (_warmupEstimateSec || 1)) * 15));
      if (fillEl) fillEl.style.width = Math.max(2, pct) + '%';
    }
  }

  function _stopTimer(success, barId, fillId) {
    if (_timerInterval) {
      clearInterval(_timerInterval);
      _timerInterval = null;
    }
    if (_tokenCount >= 4 && _firstTokenTime > 0) {
      var streamSec = (performance.now() - _firstTokenTime) / 1000;
      if (streamSec > 0.2) _lastMeasuredSpeed = _tokenCount / streamSec;
    }
    var fillEl = document.getElementById(fillId || 'ai-studio-progress-fill');
    if (fillEl) fillEl.style.width = success ? '100%' : '0%';
    setTimeout(function () {
      var bar = document.getElementById(barId || 'ai-studio-timer-bar');
      if (bar) bar.style.display = 'none';
    }, success ? 400 : 0);
  }

  /**
   * Identify primary identifier field for any database type
   */
  function mdbGetPrimaryFieldKey(typeKey) {
    if (typeKey === 'wordbanks') return 'word';
    if (typeKey === 'quotebanks') return 'quote';
    if (typeKey === 'dictations') return 'title';
    if (typeKey === 'grammarbanks') return 'rule';
    if (typeKey === 'gapfillbanks') return 'sentence';
    if (typeKey === 'errorbanks') return 'sentence';
    if (typeKey === 'sentencebanks') return 'sentence';
    if (typeKey === 'storybanks') return 'title';
    if (typeKey === 'quizzes') return 'title';
    if (typeKey === 'testbanks') return 'title';
    if (typeKey === 'competences' || typeKey === 'descriptors') return 'title';
    if (typeKey === 'criteria') return 'name';
    if (typeKey === 'phases') return 'name';
    if (typeKey === 'chips') return 'label';
    if (typeKey === 'badgebanks') return 'name';
    if (typeKey === 'modebanks') return 'name';
    return 'title';
  }

  /**
   * Universal Schema-Driven Prompt Builder for missing fields
   */
  function mdbBuildPrompt(rec, typeKey, requestedFieldKeys, schema) {
    schema = schema || [];
    var primaryKey = mdbGetPrimaryFieldKey(typeKey);
    var primaryVal = rec[primaryKey] || rec.word || rec.title || rec.english || rec.name || rec.sentence || '';

    // Collect already filled non-empty fields
    var filledEntries = [];
    Object.keys(rec || {}).forEach(function (k) {
      if (k.startsWith('_')) return;
      var v = rec[k];
      if (v === undefined || v === null || v === '') return;
      if (Array.isArray(v) && v.length === 0) return;
      filledEntries.push(k + ': ' + (typeof v === 'object' ? JSON.stringify(v) : String(v)));
    });

    var fieldInstructions = [];
    var exampleObj = {};

    requestedFieldKeys.forEach(function (key) {
      var fieldDef = schema.find(function (f) { return f && f.key === key; }) || { key: key, type: 'string' };
      var typeDesc = fieldDef.type || 'string';
      var extra = '';
      if (Array.isArray(fieldDef.uniqueVals) && fieldDef.uniqueVals.length > 0) {
        extra = ' (Allowed choices: ' + fieldDef.uniqueVals.slice(0, 8).join(', ') + ')';
      }

      if (key === 'level' || key === 'cefr') {
        fieldInstructions.push('"' + key + '": CEFR level (one of A1, A2, B1, B2, C1, C2)');
        exampleObj[key] = 'B1';
      } else if (key === 'partOfSpeech' || key === 'pos') {
        fieldInstructions.push('"' + key + '": lowercase part of speech (noun, verb, adjective, adverb, preposition, conjunction, phrase)');
        exampleObj[key] = 'noun';
      } else if (key === 'ipa') {
        fieldInstructions.push('"' + key + '": standard IPA phonetic transcription');
        exampleObj[key] = '/.../';
      } else if (key === 'french' || key === 'german' || key === 'italian') {
        fieldInstructions.push('"' + key + '": natural translation in ' + key.toUpperCase());
        exampleObj[key] = 'traduction';
      } else if (key === 'definition') {
        fieldInstructions.push('"' + key + '": concise 1-sentence pedagogical definition');
        exampleObj[key] = fieldDef.type === 'array' ? ['Clear definition.'] : 'Clear definition.';
      } else if (key === 'exampleSentence') {
        fieldInstructions.push('"' + key + '": natural illustrative sentence using the word in context');
        exampleObj[key] = fieldDef.type === 'array' ? ['An example sentence.'] : 'An example sentence.';
      } else if (typeDesc === 'array') {
        fieldInstructions.push('"' + key + '": JSON array of strings' + extra);
        exampleObj[key] = ['item1', 'item2'];
      } else if (typeDesc === 'boolean') {
        fieldInstructions.push('"' + key + '": boolean (true/false)');
        exampleObj[key] = true;
      } else if (typeDesc === 'number') {
        fieldInstructions.push('"' + key + '": number');
        exampleObj[key] = 1;
      } else {
        fieldInstructions.push('"' + key + '": string' + extra);
        exampleObj[key] = 'value';
      }
    });

    var systemPrompt = [
      'You are an expert curriculum and language education AI assistant autofilling educational database records.',
      'Respond ONLY with a valid JSON object containing the requested target fields.',
      'Do not include markdown prose, conversational preamble, or explanations.',
      'Example response structure:',
      JSON.stringify(exampleObj, null, 2)
    ].join('\n');

    var userPrompt = [
      'Database Type: ' + typeKey,
      'Primary Item: ' + primaryVal,
      filledEntries.length > 0 ? ('Known Record Data:\n- ' + filledEntries.join('\n- ')) : '',
      'Target Fields to Generate (Output ONLY a JSON object with these keys):\n- ' + fieldInstructions.join('\n- '),
      '\nReturn ONLY the JSON object:'
    ].filter(Boolean).join('\n\n');

    return {
      systemPrompt: systemPrompt,
      userPrompt: userPrompt
    };
  }

  /**
   * Generate AI predictions for missing fields in a single record
   */
  async function mdbGenerateAiFields(rec, typeKey, requestedFieldKeys, schema) {
    if (!window.SlmService) {
      throw new Error('AI Service is unavailable.');
    }

    var promptData = mdbBuildPrompt(rec, typeKey, requestedFieldKeys, schema);

    var res = await window.SlmService.generateJson({
      systemPrompt: promptData.systemPrompt,
      userPrompt: promptData.userPrompt,
      assistantPrefix: '{',
      expectObject: true,
      temperature: 0.2,
      maxNewTokens: 480,
      promptDownloadIfMissing: true
    });

    if (res && res.aborted) {
      return { ok: false, aborted: true };
    }
    if (!res || !res.ok || !res.data) {
      throw new Error((res && res.error) || 'Could not parse AI response');
    }

    var data = res.data;
    if (Array.isArray(data)) {
      data = data[0] || {};
    }

    var cleanedResult = {};
    requestedFieldKeys.forEach(function (k) {
      if (data[k] !== undefined && data[k] !== null && data[k] !== '') {
        var fieldDef = (schema || []).find(function (f) { return f && f.key === k; });
        var val = data[k];
        if (fieldDef && fieldDef.type === 'array' && !Array.isArray(val)) {
          val = String(val).split(/,\s*|\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
        } else if (fieldDef && fieldDef.type === 'string' && Array.isArray(val)) {
          val = val.join(', ');
        }
        cleanedResult[k] = val;
      }
    });

    return {
      ok: true,
      data: cleanedResult,
      rawText: res.rawText
    };
  }

  /**
   * Single-field targeted generation
   */
  async function mdbGenerateSingleField(rec, fieldKey, schema, typeKey) {
    var res = await mdbGenerateAiFields(rec, typeKey || (window.S && window.S.typeKey) || 'wordbanks', [fieldKey], schema || (window.S && window.S.schema) || []);
    if (res && res.ok && res.data && res.data[fieldKey] !== undefined) {
      return res.data[fieldKey];
    }
    return null;
  }

  /**
   * Quick Field Autofill Trigger from form [✨ AI] button
   */
  async function mdbTriggerFieldAiAutofill(fieldKey) {
    var el = document.getElementById('ff-' + fieldKey);
    if (!el) return;

    var primaryKey = mdbGetPrimaryFieldKey(window.S ? window.S.typeKey : 'wordbanks');
    var primaryEl = document.getElementById('ff-' + primaryKey)
      || document.getElementById('ff-word')
      || document.getElementById('ff-title')
      || document.getElementById('ff-name')
      || document.querySelector('#edit-body input[type="text"]');

    var primaryVal = (primaryEl ? primaryEl.value : '').trim();
    if (!primaryVal && fieldKey !== primaryKey) {
      if (typeof window.showToast === 'function') {
        window.showToast(_t('mdbAiSeedRequired', 'Please enter a word or title first.'), true);
      }
      if (primaryEl) primaryEl.focus();
      return;
    }

    // Collect current values
    var formRec = {};
    var activeSchema = window._activeFormSchema || (window.S && window.S.schema) || [];
    activeSchema.forEach(function (f) {
      if (!f || !f.key) return;
      var inputEl = document.getElementById('ff-' + f.key);
      if (inputEl) {
        formRec[f.key] = inputEl.type === 'checkbox' ? !!inputEl.checked : inputEl.value.trim();
      }
    });

    var origPlaceholder = el.placeholder;
    el.placeholder = '✨ ' + _t('mdbAiGenerating', 'Generating…');
    el.disabled = true;

    try {
      var genVal = await mdbGenerateSingleField(formRec, fieldKey, activeSchema, window.S ? window.S.typeKey : 'wordbanks');
      if (genVal !== null && genVal !== undefined) {
        if (el.type === 'checkbox') {
          el.checked = Boolean(genVal);
        } else if (Array.isArray(genVal)) {
          el.value = genVal.join(', ');
        } else {
          el.value = String(genVal);
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.classList.add('ai-pulsing-input');
        setTimeout(function () { el.classList.remove('ai-pulsing-input'); }, 1400);

        if (typeof window.showToast === 'function') {
          window.showToast(_t('mdbAutofillApplied', '✓ Field completed by AI.'));
        }
      } else {
        if (typeof window.showToast === 'function') {
          window.showToast('AI could not determine a value for ' + fieldKey, true);
        }
      }
    } catch (err) {
      console.warn('[MdbAiService] Single field autofill error:', err);
      if (typeof window.showToast === 'function') {
        window.showToast('AI Autofill: ' + (err && err.message ? err.message : String(err)), true);
      }
    } finally {
      el.disabled = false;
      el.placeholder = origPlaceholder;
      el.focus();
    }
  }

  /**
   * Single-Record Autofill Trigger from Form (#edit-bg)
   */
  async function mdbTriggerFormAiAutofill() {
    var primaryKey = mdbGetPrimaryFieldKey(window.S ? window.S.typeKey : 'wordbanks');
    var primaryEl = document.getElementById('ff-' + primaryKey)
      || document.getElementById('ff-word')
      || document.getElementById('ff-title')
      || document.getElementById('ff-name')
      || document.getElementById('ff-sentence')
      || document.querySelector('#edit-body input[type="text"]');

    var primaryVal = (primaryEl ? primaryEl.value : '').trim();
    if (!primaryVal) {
      if (typeof window.showToast === 'function') {
        window.showToast(_t('mdbAiSeedRequired', 'Please enter a word, title, or seed term first.'), true);
      }
      if (primaryEl) primaryEl.focus();
      return;
    }

    var formRec = {};
    var activeSchema = window._activeFormSchema || (window.S && window.S.schema) || [];
    var missingKeys = [];

    activeSchema.forEach(function (f) {
      if (!f || !f.key || f.key.startsWith('_')) return;
      var el = document.getElementById('ff-' + f.key);
      if (el) {
        if (el.type === 'checkbox') {
          formRec[f.key] = !!el.checked;
        } else {
          var val = el.value.trim();
          formRec[f.key] = val;
          if (!val) missingKeys.push(f.key);
        }
      } else {
        missingKeys.push(f.key);
      }
    });

    if (missingKeys.length === 0) {
      if (typeof window.showToast === 'function') {
        window.showToast(_t('mdbAiAllFieldsFilled', 'All form fields are already filled!'));
      }
      return;
    }

    var btn = document.getElementById('mdb-ai-autofill-btn');
    var originalBtnHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<img src="../assets/icons/sparkles.svg" class="btn-icon btn-icon-xs" style="animation:spin 1s linear infinite;" alt="" /> ' + _t('mdbAiGenerating', 'Generating…');
    }

    try {
      var localHits = (typeof window.findAutofillHits === 'function') ? window.findAutofillHits(primaryVal) : [];
      var fieldSuggestions = {};
      var sources = new Set();

      localHits.forEach(function (hit) {
        sources.add(hit.filename);
        var r = hit.rec;
        Object.keys(r || {}).forEach(function (k) {
          if (k.startsWith('_') || k === primaryKey) return;
          var v = r[k];
          if (v === undefined || v === null || v === '') return;
          if (Array.isArray(v) && v.length === 0) return;
          if (!fieldSuggestions[k]) fieldSuggestions[k] = [];
          var vStr = JSON.stringify(v);
          if (!fieldSuggestions[k].some(function (ex) { return JSON.stringify(ex.val) === vStr; })) {
            fieldSuggestions[k].push({ val: v, filename: hit.filename, isAi: false });
          }
        });
      });

      var stillNeeded = missingKeys.filter(function (k) { return !fieldSuggestions[k] || fieldSuggestions[k].length === 0; });

      if (stillNeeded.length > 0) {
        var aiRes = await mdbGenerateAiFields(formRec, window.S ? window.S.typeKey : 'wordbanks', stillNeeded, activeSchema);
        if (aiRes && aiRes.ok && aiRes.data) {
          sources.add('✨ Offline AI (SLM)');
          Object.keys(aiRes.data).forEach(function (k) {
            var v = aiRes.data[k];
            if (v !== undefined && v !== null && v !== '') {
              if (!fieldSuggestions[k]) fieldSuggestions[k] = [];
              fieldSuggestions[k].push({ val: v, filename: '✨ AI Model', isAi: true });
            }
          });
        }
      }

      if (Object.keys(fieldSuggestions).length === 0) {
        if (typeof window.showToast === 'function') {
          window.showToast(_t('mdbAutofillNoMatches', 'No matches found.'), true);
        }
        return;
      }

      window._autofillPendingSuggestions = fieldSuggestions;
      window._autofillContext = { mode: 'form' };
      mdbRenderAutofillModalUi(localHits, sources, fieldSuggestions, null);
    } catch (err) {
      console.warn('[MdbAiService] Autofill error:', err);
      if (typeof window.showToast === 'function') {
        window.showToast('AI Autofill: ' + (err && err.message ? err.message : String(err)), true);
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalBtnHtml;
      }
    }
  }

  /**
   * Render the Suggestions Modal (#autofill-bg)
   */
  function mdbRenderAutofillModalUi(hits, sources, fieldSuggestions, rec) {
    var body = document.getElementById('autofill-body');
    if (!body) return;

    var sourcesArr = Array.from(sources);
    var html = [
      '<div style="font-size:0.83rem;color:#555;margin-bottom:12px;">',
      '  <div style="font-weight:700;color:#222;">' + (sourcesArr.length > 0 ? ('Sources: ' + _escapeHtml(sourcesArr.join(', '))) : '') + '</div>',
      '</div>',
      '<div style="font-size:0.82rem;font-weight:700;margin-bottom:8px;">' + _t('mdbAutofillSelectFields', 'Select fields to apply:') + '</div>',
      '<div style="display:flex;flex-direction:column;gap:10px;max-height:360px;overflow-y:auto;padding-right:4px;">'
    ];

    Object.keys(fieldSuggestions).forEach(function (fieldKey) {
      var candidateList = fieldSuggestions[fieldKey];
      var primaryCand = candidateList[0];
      var isAi = Boolean(primaryCand && primaryCand.isAi);

      var displayVal = '';
      if (Array.isArray(primaryCand.val)) {
        displayVal = primaryCand.val.join(', ');
      } else if (typeof primaryCand.val === 'object' && primaryCand.val !== null) {
        displayVal = JSON.stringify(primaryCand.val);
      } else {
        displayVal = String(primaryCand.val);
      }

      var badgeHtml = isAi
        ? '<span style="display:inline-flex;align-items:center;gap:3px;background:#8b7cc2;color:#ffffff;font-size:0.65rem;font-weight:800;padding:2px 6px;border-radius:4px;border:1px solid #333333;margin-left:6px;"><img src="../assets/icons/sparkles.svg" style="width:10px;height:10px;" alt="" /> AI</span>'
        : '<span style="display:inline-flex;align-items:center;gap:3px;background:#6abf8e;color:#ffffff;font-size:0.65rem;font-weight:800;padding:2px 6px;border-radius:4px;border:1px solid #333333;margin-left:6px;">DB (' + _escapeHtml(primaryCand.filename || 'local') + ')</span>';

      html.push([
        '<div style="border:1.5px solid #333333;border-radius:6px;padding:8px 10px;background:#ffffff;box-shadow:2px 2px 0 #555555;">',
        '  <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;margin-bottom:4px;">',
        '    <span style="font-weight:800;font-size:0.82rem;color:#1e1e1e;display:flex;align-items:center;">',
        '      <input type="checkbox" class="af-field-cb" data-field="' + _escapeHtml(fieldKey) + '" checked style="margin-right:8px;accent-color:#1e1e1e;" />',
        '      ' + _escapeHtml(fieldKey),
        '      ' + badgeHtml,
        '    </span>',
        '  </label>',
        '  <div style="font-size:0.78rem;color:#444444;background:#f5f5f0;padding:6px 8px;border-radius:4px;border:1px solid #ddd;word-break:break-word;font-family:inherit;">',
        '    ' + _escapeHtml(displayVal),
        '  </div>',
        '</div>'
      ].join('\n'));
    });

    html.push('</div>');
    body.innerHTML = html.join('\n');

    var modalBg = document.getElementById('autofill-bg');
    if (modalBg) modalBg.classList.remove('hidden');
  }

  /**
   * Row Context Menu Autofill Trigger (Hybrid Local DB + AI Fallback)
   */
  async function mdbTriggerRecordAutofill(fi, ri) {
    var file = window.S && window.S.files && window.S.files[fi];
    if (!file || !file.records[ri]) return;
    var rec = file.records[ri];
    var primaryKey = mdbGetPrimaryFieldKey(window.S.typeKey);
    var targetWord = rec[primaryKey] || rec.word || rec.title || rec.english || rec.name || rec.sentence || '';

    if (!targetWord) {
      if (typeof window.showToast === 'function') {
        window.showToast(_t('mdbAutofillNoWord', 'Please enter a word or title first.'), true);
      }
      return;
    }

    var activeSchema = (window.S && window.S.schema) || [];
    var missingKeys = [];
    activeSchema.forEach(function (f) {
      if (!f || !f.key || f.key.startsWith('_')) return;
      var v = rec[f.key];
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
        missingKeys.push(f.key);
      }
    });

    if (missingKeys.length === 0) {
      if (typeof window.showToast === 'function') {
        window.showToast(_t('mdbAiAllFieldsFilled', 'All fields are already filled!'));
      }
      return;
    }

    try {
      var localHits = (typeof window.findAutofillHits === 'function')
        ? window.findAutofillHits(targetWord).filter(function (h) { return !(h.filename === file.name && h.rec === rec); })
        : [];

      var fieldSuggestions = {};
      var sources = new Set();

      localHits.forEach(function (hit) {
        sources.add(hit.filename);
        var r = hit.rec;
        Object.keys(r || {}).forEach(function (k) {
          if (k.startsWith('_') || k === primaryKey) return;
          var v = r[k];
          if (v === undefined || v === null || v === '') return;
          if (Array.isArray(v) && v.length === 0) return;
          if (!fieldSuggestions[k]) fieldSuggestions[k] = [];
          var vStr = JSON.stringify(v);
          if (!fieldSuggestions[k].some(function (ex) { return JSON.stringify(ex.val) === vStr; })) {
            fieldSuggestions[k].push({ val: v, filename: hit.filename, isAi: false });
          }
        });
      });

      var stillNeeded = missingKeys.filter(function (k) { return !fieldSuggestions[k] || fieldSuggestions[k].length === 0; });

      if (stillNeeded.length > 0) {
        var aiRes = await mdbGenerateAiFields(rec, window.S.typeKey, stillNeeded, activeSchema);
        if (aiRes && aiRes.ok && aiRes.data) {
          sources.add('✨ Offline AI (SLM)');
          Object.keys(aiRes.data).forEach(function (k) {
            var v = aiRes.data[k];
            if (v !== undefined && v !== null && v !== '') {
              if (!fieldSuggestions[k]) fieldSuggestions[k] = [];
              fieldSuggestions[k].push({ val: v, filename: '✨ AI Model', isAi: true });
            }
          });
        }
      }

      if (Object.keys(fieldSuggestions).length === 0) {
        if (typeof window.showToast === 'function') {
          window.showToast(_t('mdbAutofillNoMatches', 'No matching data found.'), true);
        }
        return;
      }

      window._autofillPendingSuggestions = fieldSuggestions;
      window._autofillContext = { mode: 'record', fi: fi, ri: ri };
      mdbRenderAutofillModalUi(localHits, sources, fieldSuggestions, rec);
    } catch (err) {
      console.warn('[MdbAiService] Record autofill error:', err);
      if (typeof window.showToast === 'function') {
        window.showToast('Autofill error: ' + (err && err.message ? err.message : String(err)), true);
      }
    }
  }

  /**
   * Execute Batch Autofill across selected records
   */
  async function mdbRunBatchAutofill(targetItems, requestedFields, engineMode, options) {
    if (_isBatchRunning) return;
    _isBatchRunning = true;
    _batchCancelRequested = false;

    options = options || {};
    var onProgress = options.onProgress || function () {};
    var schema = (window.S && window.S.schema) || [];
    var typeKey = (window.S && window.S.typeKey) || 'wordbanks';

    var total = targetItems.length;
    var updatedRecordCount = 0;
    var filesToSave = new Set();

    for (var i = 0; i < total; i++) {
      if (_batchCancelRequested) break;

      var item = targetItems[i];
      var rec = item.rec;
      var file = item.file;
      var fi = item.fi;

      onProgress({
        current: i + 1,
        total: total,
        percent: Math.round(((i + 1) / total) * 100),
        status: 'Processing record ' + (i + 1) + ' of ' + total + '…'
      });

      var missing = requestedFields.filter(function (fKey) {
        var v = rec[fKey];
        return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
      });

      if (missing.length === 0) continue;

      var fieldValuesToApply = {};

      if (engineMode === 'local' || engineMode === 'hybrid') {
        var primaryKey = mdbGetPrimaryFieldKey(typeKey);
        var primaryVal = rec[primaryKey] || rec.word || rec.title || rec.english || '';
        if (primaryVal && typeof window.findAutofillHits === 'function') {
          var hits = window.findAutofillHits(primaryVal).filter(function (h) {
            return !(h.filename === file.name && h.rec === rec);
          });
          if (hits.length > 0) {
            var bestHit = hits[0].rec;
            missing.forEach(function (fKey) {
              if (bestHit[fKey] !== undefined && bestHit[fKey] !== null && bestHit[fKey] !== '') {
                fieldValuesToApply[fKey] = bestHit[fKey];
              }
            });
          }
        }
      }

      var remainingMissing = missing.filter(function (k) { return fieldValuesToApply[k] === undefined; });
      if ((engineMode === 'hybrid' || engineMode === 'ai_only') && remainingMissing.length > 0) {
        try {
          var aiRes = await mdbGenerateAiFields(rec, typeKey, remainingMissing, schema);
          if (aiRes && aiRes.ok && aiRes.data) {
            Object.keys(aiRes.data).forEach(function (k) {
              fieldValuesToApply[k] = aiRes.data[k];
            });
          }
        } catch (aiErr) {
          console.warn('[MdbAiBatch] Record AI generation skipped:', aiErr);
        }
      }

      var didUpdate = false;
      Object.keys(fieldValuesToApply).forEach(function (fKey) {
        var val = fieldValuesToApply[fKey];
        rec[fKey] = Array.isArray(val) ? val.slice() : (typeof val === 'object' && val !== null ? JSON.parse(JSON.stringify(val)) : val);
        didUpdate = true;
      });

      if (didUpdate) {
        updatedRecordCount++;
        filesToSave.add(fi);
      }
    }

    for (var fiIdx of filesToSave) {
      if (typeof window.saveFile === 'function') {
        await window.saveFile(fiIdx);
      }
    }

    _isBatchRunning = false;
    return {
      updatedCount: updatedRecordCount,
      cancelled: _batchCancelRequested
    };
  }

  function mdbCancelBatchAutofill() {
    _batchCancelRequested = true;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PHASE 2: AI GENERATION STUDIO SUITE (GENERATE FROM TOPIC / TEXT)
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Build prompt for generating N brand new records
   */
  function mdbBuildRecordGenerationPrompt(options) {
    options = options || {};
    var typeKey = options.typeKey || (window.S ? window.S.typeKey : 'wordbanks');
    var mode = options.mode || 'topic'; // 'topic' | 'text'
    var promptText = (options.prompt || '').trim();
    var count = Math.max(1, Math.min(20, Number(options.count) || 5));
    var cefrLevel = options.cefrLevel || 'Any';
    var extraFocus = (options.extraFocus || '').trim();
    var schema = options.schema || (window.S ? window.S.schema : []) || [];
    var typeCfg = mdbGetTypeConfig(typeKey);
    var typeTitle = (typeCfg && typeCfg.title) || typeKey;

    var promptTemplate = (window.AI_PROMPTS && window.AI_PROMPTS[typeKey]) || '';
    var useCefr = typeCfg.showCefr !== false && cefrLevel && cefrLevel !== 'Any';

    var systemPrompt = [
      'You are an expert language teacher and educational lexicographer.',
      'Your task is to generate exactly ' + count + ' structured ' + typeTitle + ' records in valid JSON format.',
      'CRITICAL INSTRUCTIONS:',
      '1. Respond ONLY with a valid JSON array of objects (starting with [ and ending with ]).',
      '2. Do NOT write conversational preamble, commentary, metadata, or markdown fences.',
      '3. Each object represents one real vocabulary word related to the topic. NEVER output the topic title itself as a word.',
      '4. NEVER output field names, language names, or instruction phrases as vocabulary words.',
      useCefr ? ('5. Ensure language difficulty and vocabulary match CEFR level ' + cefrLevel + '.') : ''
    ].filter(Boolean).join('\n');

    var schemaDescription = '';
    if (typeKey === 'wordbanks') {
      schemaDescription = [
        'Format Example (array of vocabulary objects with concrete values):',
        '[',
        '  {',
        '    "word": "affection",',
        '    "ipa": "əˈfek.ʃən",',
        '    "partOfSpeech": "noun",',
        '    "level": "' + (useCefr ? cefrLevel : 'B1') + '",',
        '    "theme": "' + (promptText || 'Topic') + '",',
        '    "definition": "A gentle feeling of fondness or liking.",',
        '    "exampleSentence": "They showed great tenderness and warmth toward each other.",',
        '    "french": "affection",',
        '    "english": "affection",',
        '    "german": "Zuneigung",',
        '    "italian": "affetto",',
        '    "synonyms": ["fondness", "warmth"],',
        '    "antonyms": ["coldness", "hostility"],',
        '    "otherForms": ["affectionate", "affectionately"],',
        '    "hypernym": ["feeling", "emotion"],',
        '    "hyponym": []',
        '  }',
        ']',
        '',
        'CRITICAL INSTRUCTIONS FOR WORDS:',
        '- Generate ' + count + ' DIFFERENT vocabulary words related to "' + (promptText || 'the topic') + '".',
        '- NEVER use "' + (promptText || 'the topic') + '" as a word itself.',
        '- NEVER use field names or instruction phrases (such as "exampleSentence", "English", "German", "French", "sentence") as words.',
        '- Each "word" MUST be an individual vocabulary term belonging to the topic (e.g. for "Romantic Relationships", use words like "affection", "commitment", "courtship", "infatuation", "passion").'
      ].join('\n');
    } else if (promptTemplate) {
      // Clean up human prompt instructions if present (e.g. "Give me a JSON array of vocabulary entries for: [PASTE WORDS HERE].")
      var cleanedTemplate = promptTemplate
        .replace(/Give me a JSON array of [^\n]+\n?/i, '')
        .replace(/Return ONLY valid JSON[^\n]+\n?/i, '')
        .replace(/\[PASTE WORDS HERE\]/gi, promptText)
        .trim();
      schemaDescription = cleanedTemplate;
    } else {
      var example = {};
      schema.forEach(function (f) {
        if (!f || !f.key || f.key.startsWith('_')) return;
        example[f.key] = f.type === 'array' ? ['example'] : (f.type === 'number' ? 1 : 'example');
      });
      schemaDescription = 'Format Example:\n' + JSON.stringify([example], null, 2);
    }

    if (typeKey !== 'wordbanks' && typeCfg.schemaInstructions && typeCfg.schemaInstructions.length > 0) {
      schemaDescription += '\n\nType-Specific Schema Requirements:\n- ' + typeCfg.schemaInstructions.join('\n- ');
    }

    var userPrompt = [
      'Target Database: ' + typeTitle,
      'Theme / Topic: ' + promptText,
      'Task: ' + (mode === 'text' ? 'Extract and generate ' + count + ' vocabulary records from the provided passage.' : 'Generate ' + count + ' distinct vocabulary words related to the topic "' + promptText + '". (Do NOT use "' + promptText + '" as a word).'),
      'Number of Records Requested: ' + count,
      useCefr ? ('Target CEFR Level: ' + cefrLevel) : '',
      extraFocus ? ('Special Instructions / Focus: ' + extraFocus) : '',
      mode === 'text' ? ('Source Passage / Notes:\n' + promptText) : ('Topic Seed:\n' + promptText),
      '\nExpected JSON Schema Format:\n' + schemaDescription,
      '\nReturn ONLY the JSON array starting with [ and ending with ]:'
    ].filter(Boolean).join('\n\n');

    return {
      systemPrompt: systemPrompt,
      userPrompt: userPrompt,
      targetTokens: Math.max(160, count * 140)
    };
  }

  /**
   * Execute Generation of N new records via SLM
   */
  async function mdbGenerateRecords(options) {
    if (!window.SlmService) {
      throw new Error('AI Service is unavailable.');
    }

    var typeKey = options.typeKey || (window.S ? window.S.typeKey : 'wordbanks');
    var promptData = mdbBuildRecordGenerationPrompt(options);

    _isStudioGenerating = true;
    var targetTokens = promptData.targetTokens;
    _startTimer(targetTokens, options.timerBarId, options.elapsedId, options.remainId, options.speedId, options.fillId);

    try {
      var res = await window.SlmService.generateJson({
        systemPrompt: promptData.systemPrompt,
        userPrompt: promptData.userPrompt,
        assistantPrefix: '[',
        temperature: 0.2,
        maxNewTokens: Math.min(2048, Math.max(768, targetTokens + 300)),
        stopOnJsonComplete: true,
        onToken: function (token, partialText, metrics) {
          _tokenCount = (metrics && metrics.tokenCount) || (_tokenCount + 1);
          if (!_firstTokenTime) _firstTokenTime = performance.now();
          if (typeof options.onToken === 'function') {
            options.onToken(token, partialText, metrics);
          }
        },
        promptDownloadIfMissing: true
      });

      if (res && res.aborted) {
        _stopTimer(false, options.timerBarId, options.fillId);
        _isStudioGenerating = false;
        return { ok: false, aborted: true };
      }

      if (!res || !res.ok || !res.data) {
        throw new Error((res && res.error) || 'Could not parse generated records as JSON.');
      }

      _stopTimer(true, options.timerBarId, options.fillId);
      _isStudioGenerating = false;

      var rawData = res.data;
      var recordsArray = [];

      if (Array.isArray(rawData)) {
        recordsArray = rawData;
      } else if (rawData && typeof rawData === 'object') {
        // Find first array property if returned inside { items: [...] } or { records: [...] }
        var arrProp = Object.keys(rawData).find(function (k) { return Array.isArray(rawData[k]); });
        if (arrProp) {
          recordsArray = rawData[arrProp];
        } else {
          recordsArray = [rawData];
        }
      }

      var schema = options.schema || (window.S ? window.S.schema : []) || [];
      var primaryKey = mdbGetPrimaryFieldKey(typeKey);
      var LANGUAGE_NAMES = new Set(['english', 'french', 'german', 'italian', 'spanish', 'portuguese', 'russian', 'chinese', 'japanese', 'latin']);
      var promptLower = (promptData.promptText || options.prompt || '').toLowerCase().trim();

      var cleanedRecords = recordsArray.filter(function (r) {
        if (!r || typeof r !== 'object' || Array.isArray(r)) return false;
        var keys = Object.keys(r).filter(function (k) { return !k.startsWith('_'); });
        if (keys.length === 0) return false;

        // Filter out accidental metadata-only objects
        var isMetadataOnly = keys.every(function (k) {
          return ['width', 'height', 'style', 'viewbox', 'version', 'type', 'database'].indexOf(k.toLowerCase()) !== -1;
        });
        if (isMetadataOnly) return false;

        if (primaryKey && r[primaryKey]) {
          var rawWord = String(r[primaryKey]).trim();
          var wordLower = rawWord.toLowerCase();

          // Reject if word is the exact topic name (e.g. "Romantic Relationships")
          if (promptLower && wordLower === promptLower) return false;

          // Reject if word is an instruction or placeholder sentence
          if (rawWord.split(/\s+/).length > 4 || rawWord.length > 35) return false;
          if (/example\s*sentence|illustrat|target\s*word|equivalent|translation/i.test(rawWord)) return false;

          // Reject if word is a metadata keyword or language name
          if (wordLower === 'title' || wordLower === 'width' || wordLower === 'height' || wordLower === 'database') return false;
          if (LANGUAGE_NAMES.has(wordLower) && (!r.ipa || r.ipa === '...')) return false;

          var defVal = String(r.definition || r.def || '').toLowerCase();
          if (defVal.includes('educational database') || defVal.includes('illustrating the word') || defVal.includes('pedagogical definition')) {
            return false;
          }
        }
        return true;
      }).map(function (rec) {
        var clean = {};
        Object.keys(rec).forEach(function (k) {
          if (k.startsWith('_')) return;
          var val = rec[k];
          var fieldDef = schema.find(function (f) { return f && f.key === k; });
          if (fieldDef && fieldDef.type === 'array' && !Array.isArray(val)) {
            val = String(val).split(/,\s*|\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
          }
          clean[k] = val;
        });
        return clean;
      });

      return {
        ok: true,
        records: cleanedRecords,
        rawText: res.rawText,
        tokenCount: _tokenCount,
        tokensPerSec: _currentSpeed,
        durationMs: (performance.now() - _genStartTime)
      };
    } catch (err) {
      _stopTimer(false, options.timerBarId, options.fillId);
      _isStudioGenerating = false;
      throw err;
    }
  }

  /**
   * Open AI Generation Studio Modal
   */
  async function mdbOpenAiStudio(options) {
    options = options || {};
    var modal = document.getElementById('ai-studio-bg');
    if (!modal) return;

    var typeKey = (window.S && window.S.typeKey) || 'wordbanks';
    var typeCfg = mdbGetTypeConfig(typeKey);

    var typeTitleEl = document.getElementById('ai-studio-type-title');
    if (typeTitleEl) {
      var typeLabel = typeCfg.title;
      if (!typeLabel && window.getTypeDef) {
        var def = window.getTypeDef(typeKey);
        typeLabel = def ? _t(def.labelKey, def.key) : typeKey;
      }
      typeTitleEl.textContent = typeLabel || typeKey;
    }

    var badgeEl = document.getElementById('ai-studio-type-badge');
    if (badgeEl) {
      badgeEl.textContent = typeCfg.badge || typeKey;
      badgeEl.style.backgroundColor = typeCfg.badgeColor || '#8b7cc2';
      badgeEl.style.display = 'inline-block';
    }

    var guideBannerEl = document.getElementById('ai-studio-guide-banner');
    if (guideBannerEl) {
      if (typeCfg.guide) {
        guideBannerEl.innerHTML = '<span style="font-weight:700;">' + _escapeHtml(typeCfg.title) + ' Guide:</span> ' + _escapeHtml(typeCfg.guide);
        guideBannerEl.style.display = 'block';
      } else {
        guideBannerEl.style.display = 'none';
      }
    }

    var topicLbl = document.getElementById('ai-studio-topic-lbl');
    if (topicLbl && typeCfg.topicLabel) {
      topicLbl.textContent = typeCfg.topicLabel;
    }

    var promptInput = document.getElementById('ai-studio-prompt-input');
    if (promptInput) {
      if (typeCfg.topicPlaceholder) promptInput.placeholder = typeCfg.topicPlaceholder;
      promptInput.value = options.initialPrompt || '';
    }

    var presetsEl = document.getElementById('ai-studio-presets');
    if (presetsEl) {
      if (typeCfg.presets && typeCfg.presets.length > 0) {
        presetsEl.innerHTML = typeCfg.presets.map(function (p) {
          return '<button type="button" class="ai-preset-chip" onclick="MdbAi.applyPreset(' + JSON.stringify(p.val) + ')">' + _escapeHtml(p.label) + '</button>';
        }).join('');
        presetsEl.style.display = 'flex';
      } else {
        presetsEl.innerHTML = '';
        presetsEl.style.display = 'none';
      }
    }

    var textLbl = document.getElementById('ai-studio-text-lbl');
    if (textLbl && typeCfg.textLabel) {
      textLbl.textContent = typeCfg.textLabel;
    }

    var textInput = document.getElementById('ai-studio-text-input');
    if (textInput && typeCfg.textPlaceholder) {
      textInput.placeholder = typeCfg.textPlaceholder;
    }

    var focusInput = document.getElementById('ai-studio-focus');
    if (focusInput && typeCfg.focusPlaceholder) {
      focusInput.placeholder = typeCfg.focusPlaceholder;
    }

    var countSel = document.getElementById('ai-studio-count');
    if (countSel && typeCfg.defaultCount) {
      countSel.value = String(typeCfg.defaultCount);
    }

    var cefrWrap = document.getElementById('ai-studio-cefr-wrap');
    if (cefrWrap) {
      cefrWrap.style.display = (typeCfg.showCefr !== false) ? 'block' : 'none';
    }

    var cefrSel = document.getElementById('ai-studio-cefr');
    if (cefrSel && typeCfg.defaultCefr && typeCfg.showCefr !== false) {
      cefrSel.value = typeCfg.defaultCefr;
    }

    // Populate target file selector
    var targetSel = document.getElementById('ai-studio-target-file');
    if (targetSel && window.S && window.S.files) {
      var activeFi = 0;
      var srcSet = (window.S.filters && window.S.filters._srcMulti instanceof Set) ? window.S.filters._srcMulti : null;
      if (srcSet && srcSet.size > 0) {
        var found = window.S.files.findIndex(function (f) { return srcSet.has(f.name); });
        if (found !== -1) activeFi = found;
      }
      targetSel.innerHTML = window.S.files.map(function (f, i) {
        return '<option value="' + i + '" ' + (i === activeFi ? 'selected' : '') + '>' + _escapeHtml(f.name) + '</option>';
      }).join('');
    }

    // Reset UI state
    _studioMode = options.mode || 'topic';
    mdbSwitchStudioMode(_studioMode);
    _generatedRecords = [];
    mdbRenderStudioPreview([]);

    var timerBar = document.getElementById('ai-studio-timer-bar');
    if (timerBar) timerBar.style.display = 'none';

    mdbRefreshStudioModelChip();
    modal.classList.remove('hidden');

    if (promptInput) setTimeout(function () { promptInput.focus(); }, 50);
  }

  function mdbCloseAiStudio() {
    if (_isStudioGenerating && window.SlmService) {
      window.SlmService.abort();
    }
    _stopTimer(false, 'ai-studio-timer-bar', 'ai-studio-progress-fill');
    _isStudioGenerating = false;

    var modal = document.getElementById('ai-studio-bg');
    if (modal) modal.classList.add('hidden');
  }

  function mdbApplyPreset(val, targetInputId) {
    var id = targetInputId || (_studioMode === 'text' ? 'ai-studio-text-input' : 'ai-studio-prompt-input');
    var inp = document.getElementById(id);
    if (!inp) inp = document.getElementById('ai-studio-prompt-input') || document.getElementById('add-tab-ai-prompt');
    if (inp) {
      inp.value = val;
      inp.focus();
      inp.classList.add('ai-pulsing-input');
      setTimeout(function () {
        inp.classList.remove('ai-pulsing-input');
      }, 1200);
    }
  }

  function mdbSwitchStudioMode(mode) {
    _studioMode = mode === 'text' ? 'text' : 'topic';
    var btnTopic = document.getElementById('ai-tab-topic');
    var btnText = document.getElementById('ai-tab-text');
    var rowTopic = document.getElementById('ai-studio-topic-row');
    var rowText = document.getElementById('ai-studio-text-row');

    if (btnTopic) btnTopic.classList.toggle('active', _studioMode === 'topic');
    if (btnText) btnText.classList.toggle('active', _studioMode === 'text');
    if (rowTopic) rowTopic.style.display = _studioMode === 'topic' ? 'block' : 'none';
    if (rowText) rowText.style.display = _studioMode === 'text' ? 'block' : 'none';
  }

  async function mdbRefreshStudioModelChip() {
    var chip = document.getElementById('ai-studio-model-chip');
    if (!chip) return;
    if (!window.SlmService) {
      chip.textContent = 'No SLM';
      return;
    }
    try {
      var st = await window.SlmService.getStatus();
      var activeId = st.activeModelId || st.activeModel;
      var activeSpec = (st.models || []).find(function (m) { return m.id === activeId; });
      if (activeSpec) {
        var isInstalled = Boolean(activeSpec.isInstalled || activeSpec.installed);
        var shortTier = activeSpec.id === 'slm-ultra' ? '360M Ultra' : (activeSpec.id === 'slm-fast' ? '0.5B Fast' : (activeSpec.id === 'slm-deep' ? '1.8B Deep' : '1.5B Balanced'));
        chip.innerHTML = '<img src="../assets/icons/brain.svg" style="width:12px;height:12px;" alt="" /> ' + shortTier + (isInstalled ? ' (Ready)' : ' (Download)');
      }
    } catch (_) {
      chip.textContent = 'Offline AI';
    }
  }

  /**
   * Run Generation in Studio Modal
   */
  async function mdbRunStudioGeneration() {
    if (_isStudioGenerating) return;

    var promptInput = _studioMode === 'text'
      ? document.getElementById('ai-studio-text-input')
      : document.getElementById('ai-studio-prompt-input');

    var promptVal = (promptInput ? promptInput.value : '').trim();
    if (!promptVal) {
      if (typeof window.showToast === 'function') {
        window.showToast(_t('mdbAiPromptOrTopicRequired', 'Please enter a topic or paste text first.'), true);
      }
      if (promptInput) promptInput.focus();
      return;
    }

    var countSel = document.getElementById('ai-studio-count');
    var count = countSel ? Number(countSel.value) : 5;

    var cefrSel = document.getElementById('ai-studio-cefr');
    var cefrLevel = cefrSel ? cefrSel.value : 'Any';

    var focusInput = document.getElementById('ai-studio-focus');
    var extraFocus = focusInput ? focusInput.value.trim() : '';

    var runBtn = document.getElementById('ai-studio-generate-btn');
    var originalRunBtnHtml = runBtn ? runBtn.innerHTML : '';
    if (runBtn) {
      runBtn.disabled = true;
      runBtn.innerHTML = '<img src="../assets/icons/sparkles.svg" class="btn-icon btn-icon-xs" style="animation:spin 1s linear infinite;" alt="" /> ' + _t('mdbAiBtnGenerating', 'Generating…');
    }

    try {
      var result = await mdbGenerateRecords({
        typeKey: window.S ? window.S.typeKey : 'wordbanks',
        mode: _studioMode,
        prompt: promptVal,
        count: count,
        cefrLevel: cefrLevel,
        extraFocus: extraFocus,
        schema: window.S ? window.S.schema : [],
        timerBarId: 'ai-studio-timer-bar',
        elapsedId: 'ai-studio-timer-elapsed',
        remainId: 'ai-studio-timer-remaining',
        speedId: 'ai-studio-timer-speed',
        fillId: 'ai-studio-progress-fill'
      });

      if (result && result.records && result.records.length > 0) {
        _generatedRecords = result.records;
        mdbRenderStudioPreview(_generatedRecords);
        if (typeof window.showToast === 'function') {
          window.showToast('✓ Generated ' + result.records.length + ' record(s). Review and insert below.');
        }
      } else if (!result.aborted) {
        if (typeof window.showToast === 'function') {
          window.showToast('No structured records could be extracted.', true);
        }
      }
    } catch (err) {
      console.warn('[MdbAiStudio] Generation error:', err);
      if (typeof window.showToast === 'function') {
        window.showToast('AI Generation failed: ' + (err && err.message ? err.message : String(err)), true);
      }
    } finally {
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerHTML = originalRunBtnHtml;
      }
    }
  }

  /**
   * Render Interactive Review Table in Studio
   */
  function mdbRenderStudioPreview(records) {
    var container = document.getElementById('ai-studio-review-container');
    var body = document.getElementById('ai-studio-review-body');
    var countEl = document.getElementById('ai-studio-review-count');
    var insertBtn = document.getElementById('ai-studio-insert-btn');

    if (!container || !body) return;

    if (!records || records.length === 0) {
      container.style.display = 'none';
      if (insertBtn) insertBtn.disabled = true;
      return;
    }

    container.style.display = 'flex';
    if (countEl) countEl.textContent = '(' + records.length + ' items)';
    if (insertBtn) insertBtn.disabled = false;

    var schema = (window.S && window.S.schema) || [];
    var visibleKeys = [];
    (schema || []).forEach(function (f) {
      if (f && f.key && !f.key.startsWith('_')) {
        if (records.some(function (r) { return r[f.key] !== undefined; })) {
          visibleKeys.push(f.key);
        }
      }
    });
    records.forEach(function (r) {
      Object.keys(r).forEach(function (k) {
        if (!k.startsWith('_') && visibleKeys.indexOf(k) === -1) {
          visibleKeys.push(k);
        }
      });
    });

    var html = [
      '<table class="ai-review-table">',
      '  <thead>',
      '    <tr>',
      '      <th class="ai-review-th" style="width:36px;text-align:center;">',
      '        <input type="checkbox" id="ai-review-check-all" checked onchange="MdbAi.studioSelectAll(this.checked)" style="accent-color:#111;" />',
      '      </th>',
      '      <th class="ai-review-th" style="width:32px;">#</th>'
    ];

    visibleKeys.forEach(function (k) {
      html.push('<th class="ai-review-th">' + _escapeHtml(k) + '</th>');
    });
    html.push('    </tr>', '  </thead>', '  <tbody>');

    records.forEach(function (rec, idx) {
      html.push('  <tr class="ai-review-row" data-idx="' + idx + '">');
      html.push('    <td class="ai-review-td" style="text-align:center;">');
      html.push('      <input type="checkbox" class="ai-item-cb" data-idx="' + idx + '" checked onchange="MdbAi.updateStudioSelectedCount()" style="accent-color:#111;" />');
      html.push('    </td>');
      html.push('    <td class="ai-review-td" style="font-weight:700;color:#888;">' + (idx + 1) + '</td>');

      visibleKeys.forEach(function (k) {
        var v = rec[k];
        var strVal = Array.isArray(v) ? v.join(', ') : (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v == null ? '' : v));
        html.push('    <td class="ai-review-td">');
        html.push('      <input type="text" class="ai-item-field-val" data-idx="' + idx + '" data-field="' + _escapeHtml(k) + '" value="' + _escapeHtml(strVal) + '" />');
        html.push('    </td>');
      });

      html.push('  </tr>');
    });

    html.push('  </tbody>', '</table>');
    body.innerHTML = html.join('\n');

    mdbUpdateStudioSelectedCount();
  }

  function mdbUpdateStudioSelectedCount() {
    var cbs = document.querySelectorAll('.ai-item-cb');
    var selectedCount = 0;
    cbs.forEach(function (cb) { if (cb.checked) selectedCount++; });

    var summaryEl = document.getElementById('ai-studio-selected-summary');
    if (summaryEl) {
      summaryEl.textContent = 'Selected: ' + selectedCount + ' / ' + cbs.length;
    }
    var insertBtn = document.getElementById('ai-studio-insert-btn');
    if (insertBtn) {
      insertBtn.disabled = selectedCount === 0;
    }
  }

  function mdbStudioSelectAll(selectAll) {
    var cbs = document.querySelectorAll('.ai-item-cb');
    cbs.forEach(function (cb) { cb.checked = !!selectAll; });
    mdbUpdateStudioSelectedCount();
  }

  /**
   * Insert checked records into target file and save
   */
  async function mdbInsertStudioRecords() {
    var targetSel = document.getElementById('ai-studio-target-file');
    var fi = targetSel ? Number(targetSel.value) : 0;

    if (!window.S || !window.S.files || !window.S.files[fi]) {
      if (typeof window.showToast === 'function') {
        window.showToast('No target file selected.', true);
      }
      return;
    }

    var targetFile = window.S.files[fi];
    if (targetFile.status === 'pending' && typeof window.loadFileContent === 'function' && window.getTypeDef) {
      await window.loadFileContent(fi, window.getTypeDef(window.S.typeKey));
    }

    // Collect edited values from the preview rows
    var selectedRecords = [];
    var rows = document.querySelectorAll('.ai-review-row');
    rows.forEach(function (row) {
      var cb = row.querySelector('.ai-item-cb');
      if (!cb || !cb.checked) return;

      var recObj = {};
      var fieldInputs = row.querySelectorAll('.ai-item-field-val');
      fieldInputs.forEach(function (inp) {
        var fKey = inp.getAttribute('data-field');
        var val = inp.value.trim();
        var fieldDef = (window.S.schema || []).find(function (f) { return f && f.key === fKey; });
        if (fieldDef && fieldDef.type === 'array') {
          recObj[fKey] = val ? val.split(/,\s*|\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean) : [];
        } else if (fieldDef && fieldDef.type === 'number') {
          recObj[fKey] = val ? Number(val) : 0;
        } else if (fieldDef && fieldDef.type === 'boolean') {
          recObj[fKey] = val === 'true' || val === '1';
        } else {
          recObj[fKey] = val;
        }
      });
      selectedRecords.push(recObj);
    });

    if (selectedRecords.length === 0) {
      if (typeof window.showToast === 'function') {
        window.showToast('No records selected for insertion.', true);
      }
      return;
    }

    targetFile.records.push(...selectedRecords);

    if (typeof window.saveFile === 'function') {
      var savedOk = await window.saveFile(fi);
      if (!savedOk) {
        targetFile.records.splice(-selectedRecords.length, selectedRecords.length);
        return;
      }
    }

    mdbCloseAiStudio();

    if (typeof window.buildSchema === 'function' && typeof window.getAllRecords === 'function') {
      window.S.schema = window.buildSchema(window.getAllRecords());
    }
    if (typeof window.renderAll === 'function') {
      window.renderAll();
    }

    if (typeof window.showToast === 'function') {
      var msg = _t('mdbAiSuccessInserted', 'Added {count} record(s) to {file}.')
        .replace('{count}', selectedRecords.length)
        .replace('{file}', targetFile.name);
      window.showToast(msg);
    }
  }

  /**
   * Copy Prompt Template to clipboard
   */
  async function mdbCopyPromptTemplate(btn) {
    var typeKey = (window.S && window.S.typeKey) || 'wordbanks';
    var template = (window.AI_PROMPTS && window.AI_PROMPTS[typeKey]) || '';
    if (!template && window.MdbAi) {
      var pd = mdbBuildRecordGenerationPrompt({ typeKey: typeKey, count: 5, prompt: '[PASTE TOPIC OR WORDS HERE]' });
      template = pd.userPrompt;
    }

    if (!template) {
      if (typeof window.showToast === 'function') {
        window.showToast('No prompt template available for this database type.', true);
      }
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(template);
      } else {
        var ta = document.createElement('textarea');
        ta.value = template;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      if (btn) {
        var orig = btn.innerHTML;
        btn.innerHTML = '<img src="../assets/icons/check.svg" class="btn-icon btn-icon-xs" alt="" /> ' + _t('mdbAiCopied', '✓ Copied!');
        setTimeout(function () { btn.innerHTML = orig; }, 1800);
      }
      if (typeof window.showToast === 'function') {
        window.showToast(_t('mdbAiCopied', '✓ Copied prompt template to clipboard!'));
      }
    } catch (e) {
      if (typeof window.showToast === 'function') {
        window.showToast('Could not copy to clipboard.', true);
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // ADD RECORD MODAL TAB 3 INTEGRATION ("✨ GENERATE WITH AI")
  // ═════════════════════════════════════════════════════════════════════════

  function mdbRenderAddAiTabContent(container) {
    if (!container) return;
    var typeKey = (window.S && window.S.typeKey) || 'wordbanks';
    var typeCfg = mdbGetTypeConfig(typeKey);
    var def = window.getTypeDef ? window.getTypeDef(typeKey) : null;
    var label = typeCfg.title || (def ? _t(def.labelKey, def.key) : typeKey);

    var presetChipsHtml = '';
    if (typeCfg.presets && typeCfg.presets.length > 0) {
      presetChipsHtml = [
        '<div class="ai-preset-chips" style="margin-top:6px;">',
        typeCfg.presets.map(function (p) {
          return '<button type="button" class="ai-preset-chip" onclick="MdbAi.applyPreset(' + JSON.stringify(p.val) + ', \'add-tab-ai-prompt\')">' + _escapeHtml(p.label) + '</button>';
        }).join(''),
        '</div>'
      ].join('');
    }

    var cefrStyle = (typeCfg.showCefr !== false) ? 'flex:1;min-width:110px;' : 'display:none;';
    var defaultCount = typeCfg.defaultCount || 3;
    var defaultCefr = typeCfg.defaultCefr || 'B1';

    var html = [
      '<div class="ai-studio-section" style="margin-top:4px;">',
      '  <div style="font-weight:800;font-size:0.85rem;color:#1e1e1e;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">',
      '    <span style="display:flex;align-items:center;gap:6px;">',
      '      <img src="../assets/icons/sparkles.svg" style="width:14px;height:14px;" alt="" />',
      '      ' + _t('mdbAiStudioTitle', 'AI Generation') + ' — ' + _escapeHtml(label),
      '      <span class="ai-type-badge-pill" style="background:' + (typeCfg.badgeColor || '#8b7cc2') + ';display:inline-block;">' + _escapeHtml(typeCfg.badge || typeKey) + '</span>',
      '    </span>',
      '    <button type="button" class="btn btn-secondary" style="font-size:0.72rem;padding:3px 7px;" onclick="if(typeof openSlmModelManager===\'function\')openSlmModelManager();">',
      '      <img src="../assets/icons/brain.svg" class="btn-icon btn-icon-xs" alt="" /> Model',
      '    </button>',
      '  </div>',
      typeCfg.guide ? ('  <div class="ai-type-guide-banner" style="display:block;margin-bottom:10px;"><span style="font-weight:700;">' + _escapeHtml(typeCfg.title) + ' Guide:</span> ' + _escapeHtml(typeCfg.guide) + '</div>') : '',
      '  <div class="form-field" style="margin-bottom:10px;">',
      '    <label class="form-lbl">' + _escapeHtml(typeCfg.topicLabel || _t('mdbAiModeTopic', 'Topic or Seed Concept')) + '</label>',
      '    <input type="text" id="add-tab-ai-prompt" placeholder="' + _escapeHtml(typeCfg.topicPlaceholder || _t('mdbAiTopicPlaceholder', 'e.g., Space Exploration, Airport Travel...')) + '" style="font-size:0.85rem;" />',
      presetChipsHtml,
      '  </div>',
      '  <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap;">',
      '    <div style="flex:1;min-width:110px;">',
      '      <label class="form-lbl">' + _t('mdbAiCountLabel', 'Record Count') + '</label>',
      '      <select id="add-tab-ai-count" style="width:100%;font-size:0.82rem;padding:5px 8px;border:2px solid #111;border-radius:5px;">',
      '        <option value="1"' + (defaultCount === 1 ? ' selected' : '') + '>1 item</option>',
      '        <option value="2"' + (defaultCount === 2 ? ' selected' : '') + '>2 items</option>',
      '        <option value="3"' + (defaultCount === 3 ? ' selected' : '') + '>3 items</option>',
      '        <option value="4"' + (defaultCount === 4 ? ' selected' : '') + '>4 items</option>',
      '        <option value="5"' + (defaultCount === 5 ? ' selected' : '') + '>5 items</option>',
      '        <option value="8"' + (defaultCount === 8 ? ' selected' : '') + '>8 items</option>',
      '      </select>',
      '    </div>',
      '    <div style="' + cefrStyle + '">',
      '      <label class="form-lbl">' + _t('mdbAiCefrLabel', 'Target Level') + '</label>',
      '      <select id="add-tab-ai-cefr" style="width:100%;font-size:0.82rem;padding:5px 8px;border:2px solid #111;border-radius:5px;">',
      '        <option value="Any">' + _t('mdbAiAnyCefr', 'Any / Mixed') + '</option>',
      '        <option value="A1"' + (defaultCefr === 'A1' ? ' selected' : '') + '>A1 (Beginner)</option>',
      '        <option value="A2"' + (defaultCefr === 'A2' ? ' selected' : '') + '>A2 (Elementary)</option>',
      '        <option value="B1"' + (defaultCefr === 'B1' ? ' selected' : '') + '>B1 (Intermediate)</option>',
      '        <option value="B2"' + (defaultCefr === 'B2' ? ' selected' : '') + '>B2 (Upper-Intermediate)</option>',
      '        <option value="C1"' + (defaultCefr === 'C1' ? ' selected' : '') + '>C1 (Advanced)</option>',
      '      </select>',
      '    </div>',
      '  </div>',
      '  <div id="add-tab-ai-timer-bar" class="ai-timer-bar" style="display:none;margin-bottom:10px;">',
      '    <span id="add-tab-ai-timer-elapsed">00:00</span>',
      '    <div class="ai-progress-track"><div id="add-tab-ai-progress-fill" class="ai-progress-fill"></div></div>',
      '    <span id="add-tab-ai-timer-remaining">~6s</span>',
      '    <span id="add-tab-ai-timer-speed" style="color:#666;font-size:0.72rem;"></span>',
      '    <button type="button" class="btn btn-secondary btn-sm" onclick="if(window.SlmService)window.SlmService.abort();" style="padding:2px 6px;font-size:0.7rem;">⏹ ' + _t('mdbAiStopGeneration', 'Stop') + '</button>',
      '  </div>',
      '  <div style="display:flex;gap:8px;">',
      '    <button type="button" class="btn btn-primary" id="add-tab-ai-gen-btn" onclick="MdbAi.runAddModalAiGeneration()" style="font-weight:800;background:#e2c96e;font-size:0.82rem;padding:6px 14px;">',
      '      <img src="../assets/icons/sparkles.svg" class="btn-icon btn-icon-xs" alt="" /> ' + _t('mdbAiBtnGenerate', 'Generate Records'),
      '    </button>',
      '    <button type="button" class="btn btn-secondary" onclick="MdbAi.copyPromptTemplate(this)" style="font-size:0.78rem;padding:6px 10px;">',
      '      <img src="../assets/icons/copy.svg" class="btn-icon btn-icon-xs" alt="" /> ' + _t('mdbAiBtnCopyPrompt', 'Copy Prompt'),
      '    </button>',
      '  </div>',
      '</div>',
      '<div id="add-tab-ai-results" style="display:none;margin-top:10px;">',
      '  <div style="font-size:0.82rem;font-weight:800;margin-bottom:6px;">' + _t('mdbAiPreviewTitle', 'Generated Records Preview') + ':</div>',
      '  <div id="add-tab-ai-preview-list" style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-right:4px;"></div>',
      '  <div style="margin-top:10px;display:flex;justify-content:flex-end;">',
      '    <button type="button" class="btn btn-primary" id="add-tab-ai-insert-btn" onclick="MdbAi.insertAddModalAiRecords()" style="font-weight:800;background:#6abf8e;font-size:0.82rem;padding:7px 16px;">',
      '      <img src="../assets/icons/save.svg" class="btn-icon btn-icon-xs" alt="" /> ' + _t('mdbAiBtnInsert', 'Insert into File'),
      '    </button>',
      '  </div>',
      '</div>'
    ];

    container.innerHTML = html.join('\n');
  }

  var _addModalPendingRecords = [];

  async function mdbRunAddModalAiGeneration() {
    var promptEl = document.getElementById('add-tab-ai-prompt');
    var promptVal = (promptEl ? promptEl.value : '').trim();
    if (!promptVal) {
      if (typeof window.showToast === 'function') {
        window.showToast(_t('mdbAiPromptOrTopicRequired', 'Please enter a topic first.'), true);
      }
      if (promptEl) promptEl.focus();
      return;
    }

    var typeKey = window.S ? window.S.typeKey : 'wordbanks';
    var typeCfg = mdbGetTypeConfig(typeKey);
    var count = Number(document.getElementById('add-tab-ai-count')?.value || typeCfg.defaultCount || 3);
    var cefrEl = document.getElementById('add-tab-ai-cefr');
    var cefr = (typeCfg.showCefr !== false && cefrEl) ? cefrEl.value : 'Any';

    var btn = document.getElementById('add-tab-ai-gen-btn');
    var origHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<img src="../assets/icons/sparkles.svg" class="btn-icon btn-icon-xs" style="animation:spin 1s linear infinite;" alt="" /> ' + _t('mdbAiBtnGenerating', 'Generating…');
    }

    try {
      var res = await mdbGenerateRecords({
        typeKey: window.S ? window.S.typeKey : 'wordbanks',
        mode: 'topic',
        prompt: promptVal,
        count: count,
        cefrLevel: cefr,
        schema: window.S ? window.S.schema : [],
        timerBarId: 'add-tab-ai-timer-bar',
        elapsedId: 'add-tab-ai-timer-elapsed',
        remainId: 'add-tab-ai-timer-remaining',
        speedId: 'add-tab-ai-timer-speed',
        fillId: 'add-tab-ai-progress-fill'
      });

      if (res && res.records && res.records.length > 0) {
        _addModalPendingRecords = res.records;
        var resWrap = document.getElementById('add-tab-ai-results');
        var listEl = document.getElementById('add-tab-ai-preview-list');
        if (resWrap && listEl) {
          resWrap.style.display = 'block';
          var primaryKey = mdbGetPrimaryFieldKey(window.S ? window.S.typeKey : 'wordbanks');
          listEl.innerHTML = res.records.map(function (r, i) {
            var title = r[primaryKey] || r.word || r.title || r.quote || r.sentence || ('Item ' + (i + 1));
            var sub = r.definition || r.explanation || r.level || r.theme || '';
            return [
              '<div style="border:1.5px solid #333;border-radius:6px;padding:8px 10px;background:#fff;box-shadow:2px 2px 0 #555;">',
              '  <div style="font-weight:800;font-size:0.82rem;color:#1e1e1e;">' + _escapeHtml(title) + '</div>',
              sub ? ('  <div style="font-size:0.75rem;color:#555;margin-top:2px;">' + _escapeHtml(sub) + '</div>') : '',
              '</div>'
            ].join('\n');
          }).join('\n');
        }
        if (typeof window.showToast === 'function') {
          window.showToast('✓ Generated ' + res.records.length + ' record(s). Ready to insert.');
        }
      }
    } catch (err) {
      console.warn('[MdbAiAddTab] Generation error:', err);
      if (typeof window.showToast === 'function') {
        window.showToast('Generation failed: ' + (err && err.message ? err.message : String(err)), true);
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    }
  }

  async function mdbInsertAddModalAiRecords() {
    if (!_addModalPendingRecords || _addModalPendingRecords.length === 0) return;

    var targetEl = document.getElementById('ff-_target');
    var fi = targetEl ? Number(targetEl.value) : 0;
    var targetFile = window.S && window.S.files && window.S.files[fi];
    if (!targetFile) return;

    if (targetFile.status === 'pending' && typeof window.loadFileContent === 'function' && window.getTypeDef) {
      await window.loadFileContent(fi, window.getTypeDef(window.S.typeKey));
    }

    targetFile.records.push(..._addModalPendingRecords);
    if (typeof window.saveFile === 'function') {
      var savedOk = await window.saveFile(fi);
      if (!savedOk) {
        targetFile.records.splice(-_addModalPendingRecords.length, _addModalPendingRecords.length);
        return;
      }
    }

    if (typeof window.closeEdit === 'function') {
      window.closeEdit();
    }
    if (typeof window.buildSchema === 'function' && typeof window.getAllRecords === 'function') {
      window.S.schema = window.buildSchema(window.getAllRecords());
    }
    if (typeof window.renderAll === 'function') {
      window.renderAll();
    }

    if (typeof window.showToast === 'function') {
      var msg = _t('mdbAiSuccessInserted', 'Added {count} record(s) to {file}.')
        .replace('{count}', _addModalPendingRecords.length)
        .replace('{file}', targetFile.name);
      window.showToast(msg);
    }
    _addModalPendingRecords = [];
  }

  // ═════════════════════════════════════════════════════════════════════════
  // GLOBAL EXPORTS
  // ═════════════════════════════════════════════════════════════════════════

  global.MdbAi = {
    getPrimaryFieldKey: mdbGetPrimaryFieldKey,
    buildPrompt: mdbBuildPrompt,
    generateAiFields: mdbGenerateAiFields,
    generateSingleField: mdbGenerateSingleField,
    triggerFieldAiAutofill: mdbTriggerFieldAiAutofill,
    triggerFormAiAutofill: mdbTriggerFormAiAutofill,
    triggerRecordAutofill: mdbTriggerRecordAutofill,
    buildRecordGenerationPrompt: mdbBuildRecordGenerationPrompt,
    generateRecords: mdbGenerateRecords,
    openAiStudio: mdbOpenAiStudio,
    closeAiStudio: mdbCloseAiStudio,
    applyPreset: mdbApplyPreset,
    getTypeConfig: mdbGetTypeConfig,
    TYPE_CONFIGS: MDB_AI_TYPE_CONFIGS,
    switchStudioMode: mdbSwitchStudioMode,
    runStudioGeneration: mdbRunStudioGeneration,
    studioSelectAll: mdbStudioSelectAll,
    updateStudioSelectedCount: mdbUpdateStudioSelectedCount,
    insertStudioRecords: mdbInsertStudioRecords,
    copyPromptTemplate: mdbCopyPromptTemplate,
    runBatchAutofill: mdbRunBatchAutofill,
    cancelBatchAutofill: mdbCancelBatchAutofill,
    isBatchRunning: function () { return _isBatchRunning; },
    isStudioGenerating: function () { return _isStudioGenerating; },
    renderAddAiTabContent: mdbRenderAddAiTabContent,
    runAddModalAiGeneration: mdbRunAddModalAiGeneration,
    insertAddModalAiRecords: mdbInsertAddModalAiRecords
  };

  global.mdbTriggerFormAiAutofill = mdbTriggerFormAiAutofill;
  global.mdbTriggerFieldAiAutofill = mdbTriggerFieldAiAutofill;
  global.mdbTriggerRecordAutofill = mdbTriggerRecordAutofill;
  global.openMdbAiStudio = mdbOpenAiStudio;
  global.closeMdbAiStudio = mdbCloseAiStudio;
  global.mdbApplyAiPreset = mdbApplyPreset;

})(typeof window !== 'undefined' ? window : this);
