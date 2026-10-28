/**
 * Lesson Creator Service — Shared logic, descriptor presets, schema validation,
 * Constellation Board generator, curriculum coverage compiler, and sound alerts.
 */
(function (global) {
  'use strict';

  var LessonCreatorService = {};

  // ── 1. Default Activity Types ──────────────────────────────────────────────
  LessonCreatorService.DEFAULT_ACTIVITY_TYPES = [
    {
      id: 'warm_up',
      name: 'Warm-up / Bell Ringer',
      shortName: 'Warm-up',
      name_fr: 'Mise en route / Échauffement',
      shortName_fr: 'Mise en route',
      desc: 'Quick starter task (3–5 min) at the beginning of the lesson to engage students, review prior learning, and settle the classroom into a focused mindset.',
      desc_fr: 'Courte activité de démarrage (3 à 5 min) en début de séance pour mobiliser les élèves, réactiver les prérequis et installer un climat propice au travail.',
      desc_de: 'Kurze Einstiegsaufgabe (3–5 Min.) zu Beginn der Stunde zur Aktivierung des Vorwissens und Einstimmung der Klasse.',
      desc_it: 'Breve attività di apertura (3–5 min) per stimolare l\'attenzione degli studenti, ripassare i prerequisiti e avviare la lezione.',
      when: 'First 5 minutes; entrance ticket, retrieval practice, settling the class.',
      icon: 'zap.svg',
      color: '#b45309',
      bg: '#fef3c7'
    },
    {
      id: 'direct_instruction',
      name: 'Direct Instruction / Mini-Lesson',
      shortName: 'Direct Instruction',
      name_fr: 'Enseignement explicite / Cours',
      shortName_fr: 'Cours',
      desc: 'Explicit teacher presentation of new concepts, worked examples, rules, or procedural modeling. Kept concise (10–15 min) to prevent cognitive overload.',
      desc_fr: 'Présentation explicite de nouvelles notions par l\'enseignant, modélisation de démarches, règles ou exemples guidés (10 à 15 min).',
      desc_de: 'Explizite Vermittlung neuer Inhalte durch die Lehrkraft, Demonstration von Lösungswegen oder Erläuterung von Konzepten (10–15 Min.).',
      desc_it: 'Presentazione esplicita di nuovi concetti da parte del docente, esempi guidati, regole o modellamento di procedure (10–15 min).',
      when: 'Introducing new learning targets, formulas, methods, or key concepts.',
      icon: 'presentation.svg',
      color: '#1d4ed8',
      bg: '#dbeafe'
    },
    {
      id: 'guided_practice',
      name: 'Guided Practice',
      shortName: 'Guided Practice',
      name_fr: 'Pratique guidée',
      shortName_fr: 'Pratique guidée',
      desc: 'Students practice the new skill with active teacher scaffolding, step-by-step guidance, and immediate feedback (\'I do, We do, You do\').',
      desc_fr: 'Les élèves s\'exercent avec l\'accompagnement direct de l\'enseignant, un étayage progressif et des rétroactions immédiates (« Je fais, Nous faisons, Tu fais »).',
      desc_de: 'Schüler üben die neue Fertigkeit unter direkter Anleitung der Lehrkraft mit Zwischenschritten und sofortiger Rückmeldung.',
      desc_it: 'Gli studenti applicano le conoscenze appena apprese con il supporto diretto del docente, schemi guida e riscontri immediati (\'Io faccio, Noi facciamo, Tu fai\').',
      when: 'Directly following instruction to build confidence and catch errors early.',
      icon: 'user-check.svg',
      color: '#047857',
      bg: '#d1fae5'
    },
    {
      id: 'independent_work',
      name: 'Independent Practice',
      shortName: 'Independent',
      name_fr: 'Travail autonome',
      shortName_fr: 'Autonome',
      desc: 'Students apply learning autonomously on exercises, reading, writing, or problem-solving at their own pace without teacher intervention.',
      desc_fr: 'Les élèves appliquent les notions individuellement en autonomie sur des exercices, lectures ou productions sans aide directe.',
      desc_de: 'Schüler bearbeiten Aufgaben, Texte oder Übungen eigenständig im eigenen Tempo ohne ständige Lehrkrafthilfe.',
      desc_it: 'Gli studenti svolgono compiti, esercizi o produzioni scritte in autonomia e al proprio ritmo, senza interventi del docente.',
      when: 'After guided practice once concepts are secure; allows teacher to circulate and differentiate.',
      icon: 'file-text.svg',
      color: '#4338ca',
      bg: '#e0e7ff'
    },
    {
      id: 'group_activity',
      name: 'Group Task / Cooperative Task',
      shortName: 'Group Task',
      name_fr: 'Travail de groupe / Coopératif',
      shortName_fr: 'Travail de groupe',
      desc: 'Collaborative peer task where students solve complex problems, build projects, conduct experiments, or share assigned roles.',
      desc_fr: 'Tâche collective où les élèves résolvent un problème complexe, mènent un projet ou enquêtent avec des rôles définis au sein du groupe.',
      desc_de: 'Kooperative Teamaufgabe zur Lösung komplexer Aufgaben, Erarbeitung von Projekten oder Experimenten mit verteilten Rollen.',
      desc_it: 'Attività collaborativa in cui gli studenti risolvono problemi complessi, realizzano progetti o svolgono ricerche con ruoli definiti.',
      when: 'Multi-step investigations, jigsaw tasks, project-based work, and creative problem solving.',
      icon: 'people-group.svg',
      color: '#6d28d9',
      bg: '#ede9fe'
    },
    {
      id: 'discussion',
      name: 'Class Discussion / Socratic',
      shortName: 'Discussion',
      name_fr: 'Discussion / Débat collectif',
      shortName_fr: 'Discussion',
      desc: 'Structured dialogue, Socratic seminar, debate, or fishbowl where students articulate ideas, evaluate claims, and justify viewpoints.',
      desc_fr: 'Échange collectif structuré, cercle socratique ou débat où les élèves expriment leurs arguments, écoutent et confrontent leurs opinions.',
      desc_de: 'Strukturierter Meinungsaustausch, Debatte oder sokratischer Dialog zur Argumentation, Reflexion und Urteilsbildung.',
      desc_it: 'Dialogo guidato, cerchio socratico o dibattito in cui gli studenti argomentano idee, ascoltano e confrontano punti di vista.',
      when: 'Analyzing dilemmas, evaluating arguments, exploring controversies, and developing oral fluency.',
      icon: 'speech-bubbles.svg',
      color: '#be185d',
      bg: '#fce7f3'
    },
    {
      id: 'assessment',
      name: 'Formative Check / Quiz',
      shortName: 'Quiz / Check',
      name_fr: 'Évaluation formative / Quiz',
      shortName_fr: 'Quiz',
      desc: 'Formative check for understanding (exit quiz, mini-whiteboards, digital poll) to evaluate student mastery and diagnose gaps.',
      desc_fr: 'Vérification formative rapide de la compréhension (quiz éclair, ardoises, sondage) pour mesurer les acquis et diagnostiquer les besoins.',
      desc_de: 'Kurze formative Lernstandserhebung (z. B. Mini-Whiteboards, Blitzquiz), um das Verständnis vor dem Weiterschreiten zu prüfen.',
      desc_it: 'Verifica formativa rapida (quiz lampo, lavagnette, sondaggio) per valutare il livello di comprensione e colmare eventuali lacune.',
      when: 'Mid-lesson checkpoint, pre-transition assessment, or diagnosing remediation needs.',
      icon: 'quiz.svg',
      color: '#b91c1c',
      bg: '#fee2e2'
    },
    {
      id: 'plenary',
      name: 'Plenary / Exit Ticket',
      shortName: 'Plenary',
      name_fr: 'Bilan / Billet de sortie',
      shortName_fr: 'Bilan',
      desc: 'Lesson synthesis (5–10 min) to review core takeaways, revisit initial learning goals, and collect student reflections or exit tickets.',
      desc_fr: 'Conclusion de la séance (5 à 10 min) pour récapituler les points essentiels, vérifier l\'atteinte des objectifs et recueillir un billet de sortie.',
      desc_de: 'Stundenabschluss (5–10 Min.) zur Sicherung der Kernergebnisse, Reflexion des Lernziels und Erhebung von Exit-Tickets.',
      desc_it: 'Conclusione della lezione (5–10 min) per sintetizzare i punti chiave, verificare l\'obiettivo e raccogliere i biglietti di uscita.',
      when: 'Final 5–10 minutes of class to lock in learning and inform the next lesson plan.',
      icon: 'check.svg',
      color: '#0f766e',
      bg: '#ccfbf1'
    }
  ];

  // ── 2. Default Student Interaction Types ────────────────────────────────────
  LessonCreatorService.DEFAULT_INTERACTION_TYPES = [
    {
      id: 'whole_class',
      name: 'Whole Class',
      shortName: 'Whole Class',
      name_fr: 'Classe entière',
      shortName_fr: 'Classe entière',
      desc: 'All students participate together as a single collective audience (e.g. read-aloud, shared video, group brainstorming, or community circle).',
      desc_fr: 'Tous les élèves participent simultanément en tant que groupe unique (ex. lecture offerte, document partagé, remue-méninges collectif).',
      desc_de: 'Alle Schüler arbeiten gemeinsam als eine Gesamtgruppe (z. B. gemeinsames Lesen, Einstiegsimpuls, Plenum-Brainstorming).',
      desc_it: 'Tutti gli studenti partecipano insieme come un\'unica comunità (es. lettura condivisa, visione di filmati, brainstorming plenario).',
      when: 'Shared community focus, class instructions, common cultural or media reference.',
      icon: 'people-group.svg'
    },
    {
      id: 'teacher_led',
      name: 'Teacher-Led',
      shortName: 'Teacher-Led',
      name_fr: 'Frontal / Magistral',
      shortName_fr: 'Frontal',
      desc: 'Teacher leads from the front at the board or screen, explaining, orchestrating questioning, and modeling procedures.',
      desc_fr: 'L\'enseignant pilote la séance au tableau ou à l\'écran, explicite les notions, pose des questions et orchestre les interventions.',
      desc_de: 'Lehrkraft steuert das Geschehen an der Tafel oder am Beamer, erklärt Zusammenhänge und moderiert Beiträge.',
      desc_it: 'Il docente conduce l\'attività alla cattedra o alla lavagna, spiegando i concetti e guidando le interazioni.',
      when: 'Direct instruction, explaining complex concepts, demonstrating worked examples.',
      icon: 'presentation.svg'
    },
    {
      id: 'individual',
      name: 'Individual (Solo)',
      shortName: 'Solo',
      name_fr: 'Travail individuel (Solo)',
      shortName_fr: 'Solo',
      desc: 'Each student works independently and silently at their own desk, building deep focus and individual accountability.',
      desc_fr: 'Chaque élève travaille seul et en silence à sa place, favorisant une concentration soutenue et l\'autonomie personnelle.',
      desc_de: 'Jeder Schüler arbeitet still und für sich allein am eigenen Platz zur Förderung von Konzentration und Eigenständigkeit.',
      desc_it: 'Ogni studente lavora singolarmente e in silenzio al proprio posto, favorendo concentrazione e responsabilità individuale.',
      when: 'Silent reading, individual writing, formative tests, practice exercises.',
      icon: 'user-check.svg'
    },
    {
      id: 'pairs',
      name: 'Pair Work (Turn & Talk)',
      shortName: 'Pairs',
      name_fr: 'En binôme (Pair-work)',
      shortName_fr: 'Binômes',
      desc: 'Students collaborate in pairs (Turn & Talk, peer review, dialoguing). Maximizes oral participation and low-anxiety peer support.',
      desc_fr: 'Les élèves collaborent en binômes (« Penser-Échanger-Partager », relecture croisée, dialogues). Maximise le temps de parole en confiance.',
      desc_de: 'Zwei Schüler arbeiten als Tandem zusammen (Think-Pair-Share, Partnerkorrektur, Dialoge). Maximiert die Sprechzeit aller.',
      desc_it: 'Gli studenti collaborano a coppie (Think-Pair-Share, revisione tra pari, dialoghi). Massimizza il tempo di produzione verbale.',
      when: 'Turn and talk, peer feedback, vocabulary drills, practicing foreign language dialogue.',
      icon: 'group.svg'
    },
    {
      id: 'small_groups',
      name: 'Small Groups (3-4)',
      shortName: 'Small Groups',
      name_fr: 'En petits groupes (3-4)',
      shortName_fr: 'Groupes',
      desc: 'Small teams of 3 to 4 students work cooperatively with structured roles (spokesperson, timekeeper, recorder, facilitator).',
      desc_fr: 'Équipes restreintes de 3 à 4 élèves coopérant avec des rôles distribués (porte-parole, gestionnaire du temps, secrétaire, animateur).',
      desc_de: 'Teams von 3 bis 4 Lernenden arbeiten kooperativ mit festen Rollen (Sprecher, Zeitwächter, Protokollant, Moderator).',
      desc_it: 'Piccoli gruppi di 3-4 studenti collaborano con ruoli attribuiti (portavoce, custode del tempo, verbalizzatore, coordinatore).',
      when: 'Project tasks, collaborative problem solving, complex inquiries, cooperative teams.',
      icon: 'groups.svg'
    },
    {
      id: 'stations',
      name: 'Stations / Carousel',
      shortName: 'Stations',
      name_fr: 'Ateliers / Carrousel',
      shortName_fr: 'Ateliers',
      desc: 'Classroom is split into timed activity centers or learning stations; small groups circulate from station to station.',
      desc_fr: 'La classe est organisée en ateliers ou îlots thématiques minutés ; les groupes circulent d\'une station à l\'autre.',
      desc_de: 'Der Raum ist in Lernstationen unterteilt; die Schüler wechseln zeitgesteuert zwischen verschiedenen Arbeitsbereichen.',
      desc_it: 'L\'aula è divisa in postazioni di lavoro temporizzate; i gruppi ruotano da una stazione all\'altra.',
      when: 'Multi-modal learning, science lab circuits, differentiated skill stations, art/reading corners.',
      icon: 'refresh.svg'
    }
  ];

  // ── 3. Default Year Levels & Semesters ──────────────────────────────────────
  LessonCreatorService.DEFAULT_YEAR_LEVELS = [
    { id: 'all', name: 'All Years / Levels', short: 'All' },
    { id: 'y7', name: 'Year 7 / 6ème', short: 'Y7 / 6e' },
    { id: 'y8', name: 'Year 8 / 5ème', short: 'Y8 / 5e' },
    { id: 'y9', name: 'Year 9 / 4ème', short: 'Y9 / 4e' },
    { id: 'y10', name: 'Year 10 / 3ème', short: 'Y10 / 3e' },
    { id: 'y11', name: 'Year 11 / 2nde', short: 'Y11 / 2nde' },
    { id: 'y12', name: 'Year 12 / 1ère', short: 'Y12 / 1re' },
    { id: 'y13', name: 'Year 13 / Terminale', short: 'Y13 / Term' }
  ];

  LessonCreatorService.DEFAULT_SEMESTERS = [
    { id: 'all', name: 'Full Year (All Terms)', short: 'Full' },
    { id: 's1', name: 'Semester 1 / Terms 1-2', short: 'S1' },
    { id: 's2', name: 'Semester 2 / Terms 3-4', short: 'S2' }
  ];

  // ── 4. Default Subjects & Rich Descriptor Bank ─────────────────────────────
  LessonCreatorService.DEFAULT_SUBJECTS = [
    { id: 'English', name: 'English', icon: 'book.svg', color: '#2563eb' },
    { id: 'French', name: 'French', icon: 'french.svg', color: '#7c3aed' },
    { id: 'Science', name: 'Science & STEM', icon: 'lightbulb.svg', color: '#d97706' },
    { id: 'Mathematics', name: 'Mathematics', icon: 'table.svg', color: '#059669' },
    { id: 'History', name: 'History', icon: 'flag.svg', color: '#dc2626' },
    { id: 'Geography', name: 'Geography', icon: 'flag.svg', color: '#0891b2' },
    { id: 'Art', name: 'Art', icon: 'award.svg', color: '#e11d48' },
    { id: 'Music', name: 'Music', icon: 'award.svg', color: '#9333ea' },
    { id: 'Physical Education', name: 'Physical Education', icon: 'award.svg', color: '#16a34a' },
    { id: 'Spanish', name: 'Spanish', icon: 'flag.svg', color: '#ea580c' },
    { id: 'German', name: 'German', icon: 'flag.svg', color: '#b45309' },
    // Backwards compatibility
    { id: 'english', name: 'English Language Arts', icon: 'book.svg', color: '#2563eb' },
    { id: 'languages', name: 'Modern Languages (CEFR)', icon: 'french.svg', color: '#7c3aed' },
    { id: 'science', name: 'Science & STEM', icon: 'lightbulb.svg', color: '#d97706' },
    { id: 'math', name: 'Mathematics', icon: 'table.svg', color: '#059669' },
    { id: 'social_studies', name: 'History & Geography', icon: 'flag.svg', color: '#dc2626' },
    { id: 'blooms', name: "Bloom's Taxonomy (Cognitive)", icon: 'award.svg', color: '#4b5563' }
  ];

  LessonCreatorService.DEFAULT_COMPETENCES = [];
  LessonCreatorService.DEFAULT_DESCRIPTORS = LessonCreatorService.DEFAULT_COMPETENCES;

  // ── 5. Pedagogical Lesson Templates ─────────────────────────────────────────
  LessonCreatorService.LESSON_TEMPLATES = [
    {
      id: 'three_part',
      name: 'Standard 3-Part Lesson (Starter - Main - Plenary)',
      description: 'Classic bell-to-bell structure with warm-up, core investigation, and exit check.',
      targetDuration: 60,
      sections: [
        {
          id: 'sec-1',
          title: 'Starter / Hook & Retrieval',
          duration: 10,
          activityTypeId: 'warm_up',
          interactionTypeId: 'pairs',
          objective: 'Activate prior knowledge and engage curiosity.',
          teacherAction: 'Display retrieval quiz / image prompt; circulate and check whiteboards.',
          studentAction: 'Answer retrieval prompts in pairs; write key terms on whiteboards.',
          resources: 'Mini whiteboards, projector prompt',
          assessmentStrategy: 'Quick visual scan of whiteboards',
          differentiation: 'Provide word bank with hints'
        },
        {
          id: 'sec-2',
          title: 'Direct Instruction & Concept Modeling',
          duration: 15,
          activityTypeId: 'direct_instruction',
          interactionTypeId: 'teacher_led',
          objective: 'Explicitly explain and model core concept/procedure.',
          teacherAction: 'Model step-by-step example on board; ask check-for-understanding questions.',
          studentAction: 'Take guided notes; participate in coral/choral responses.',
          resources: 'Board slides, guided notes scaffold',
          assessmentStrategy: 'Cold-call questioning and thumbs check'
        },
        {
          id: 'sec-3',
          title: 'Guided & Collaborative Task',
          duration: 25,
          activityTypeId: 'group_activity',
          interactionTypeId: 'small_groups',
          objective: 'Apply newly modeled concept in cooperative teams.',
          teacherAction: 'Circulate, monitor group roles, provide targeted scaffolding.',
          studentAction: 'Work in teams to solve practice problems / build artifact.',
          resources: 'Activity worksheet / task cards',
          assessmentStrategy: 'Targeted spot-checking of struggling groups'
        },
        {
          id: 'sec-4',
          title: 'Plenary & Exit Ticket',
          duration: 10,
          activityTypeId: 'plenary',
          interactionTypeId: 'individual',
          objective: 'Assess individual student mastery against learning target.',
          teacherAction: 'Collect exit tickets; summarize key takeaway of the lesson.',
          studentAction: 'Complete 2-question exit ticket independently.',
          resources: 'Exit ticket slips',
          assessmentStrategy: '100% exit ticket collection'
        }
      ]
    },
    {
      id: 'five_e',
      name: '5E Inquiry Instructional Model (Engage-Explore-Explain-Elaborate-Evaluate)',
      description: 'Constructivist STEM inquiry model guiding students through exploratory learning.',
      targetDuration: 60,
      sections: [
        {
          id: 'sec-1',
          title: '1. Engage (Hook & Provocation)',
          duration: 8,
          activityTypeId: 'warm_up',
          interactionTypeId: 'whole_class',
          objective: 'Spark interest and elicit student preconceptions.',
          teacherAction: 'Present anomalous phenomenon or demonstration video.',
          studentAction: 'Observe, record initial wonderings and questions in notebooks.',
          resources: 'Demonstration video clip'
        },
        {
          id: 'sec-2',
          title: '2. Explore (Hands-on Investigation)',
          duration: 18,
          activityTypeId: 'group_activity',
          interactionTypeId: 'small_groups',
          objective: 'Explore phenomenon and collect empirical observations.',
          teacherAction: 'Facilitate inquiry without giving away conclusions; ask probing questions.',
          studentAction: 'Work in teams with lab equipment/simulations; record data tables.',
          resources: 'Lab equipment / digital simulation'
        },
        {
          id: 'sec-3',
          title: '3. Explain (Concept Formalization)',
          duration: 14,
          activityTypeId: 'direct_instruction',
          interactionTypeId: 'teacher_led',
          objective: 'Synthesize student findings and introduce formal scientific terminology.',
          teacherAction: 'Call upon student groups to share findings; formalize scientific laws/terms.',
          studentAction: 'Connect observations to new vocabulary; annotate conceptual diagrams.',
          resources: 'Board conceptual diagram'
        },
        {
          id: 'sec-4',
          title: '4. Elaborate (Novel Application)',
          duration: 12,
          activityTypeId: 'guided_practice',
          interactionTypeId: 'pairs',
          objective: 'Extend understanding to a new real-world scenario.',
          teacherAction: 'Introduce secondary problem scenario; clarify constraints.',
          studentAction: 'Apply newly formalized concept to solve novel scenario in pairs.',
          resources: 'Application prompt sheet'
        },
        {
          id: 'sec-5',
          title: '5. Evaluate (Self & Formative Check)',
          duration: 8,
          activityTypeId: 'plenary',
          interactionTypeId: 'individual',
          objective: 'Evaluate individual comprehension and conceptual change.',
          teacherAction: 'Collect evaluation slips; address any remaining misconceptions.',
          studentAction: 'Reflect on initial vs final understanding in written exit reflection.',
          resources: 'Reflection slips'
        }
      ]
    },
    {
      id: 'language_ppp',
      name: 'Language Acquisition PPP (Presentation - Practice - Production)',
      description: 'Communicative language framework transitioning from controlled accuracy to free fluency.',
      targetDuration: 55,
      sections: [
        {
          id: 'sec-1',
          title: 'Warm-up & Context Setting',
          duration: 7,
          activityTypeId: 'warm_up',
          interactionTypeId: 'whole_class',
          objective: 'Establish conversational context and activate target vocabulary.',
          teacherAction: 'Show situational picture prompt; elicit vocabulary from students.',
          studentAction: 'Brainstorm words related to the topic in quick open forum.'
        },
        {
          id: 'sec-2',
          title: 'Presentation (Form, Meaning, Pronunciation)',
          duration: 13,
          activityTypeId: 'direct_instruction',
          interactionTypeId: 'teacher_led',
          objective: 'Present target grammatical structure / dialogue with clear modeling.',
          teacherAction: 'Model dialogue; highlight form on board; conduct choral drilling.',
          studentAction: 'Repeat phrases for pronunciation; identify grammatical markers.'
        },
        {
          id: 'sec-3',
          title: 'Controlled Practice',
          duration: 15,
          activityTypeId: 'guided_practice',
          interactionTypeId: 'pairs',
          objective: 'Achieve accuracy with structured prompts (gap-fills, substitution drills).',
          teacherAction: 'Listen to pair exchanges; correct accuracy mistakes on the spot.',
          studentAction: 'Complete paired substitution dialogue using prompt cards.'
        },
        {
          id: 'sec-4',
          title: 'Free Production (Communicative Task)',
          duration: 15,
          activityTypeId: 'group_activity',
          interactionTypeId: 'small_groups',
          objective: 'Demonstrate fluency in realistic communicative exchange.',
          teacherAction: 'Monitor silently without interrupting; note errors for delayed correction.',
          studentAction: 'Engage in open role-play or debate using target language.'
        },
        {
          id: 'sec-5',
          title: 'Plenary & Delayed Error Correction',
          duration: 5,
          activityTypeId: 'plenary',
          interactionTypeId: 'whole_class',
          objective: 'Review common language errors and celebrate successful exchanges.',
          teacherAction: 'Write 3 anonymous student errors on board; guide class to correct them.',
          studentAction: 'Collaborate to fix board errors; record correct forms.'
        }
      ]
    }
  ];

  // ── 6. ID Generator ────────────────────────────────────────────────────────
  LessonCreatorService.generateId = function (prefix) {
    prefix = prefix || 'lp';
    return prefix + '-' + Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  };

  // ── 7. Schema Factory: Blank Lesson Plan ───────────────────────────────────
  LessonCreatorService.createBlankLessonPlan = function (opts) {
    opts = opts || {};
    var now = new Date();
    var dateStr = now.toISOString().slice(0, 10);
    var isBlank = opts.blank !== undefined ? !!opts.blank : (opts.empty !== undefined ? !!opts.empty : true);
    return {
      _version: 1,
      id: opts.id || LessonCreatorService.generateId('lp'),
      sequenceId: opts.sequenceId || '',
      sequenceIndex: opts.sequenceIndex || 1,
      title: opts.title !== undefined ? opts.title : (isBlank ? '' : 'Untitled Lesson Plan'),
      subjectId: opts.subjectId || 'science',
      classId: opts.classId || '',
      yearLevel: opts.yearLevel || 'all',
      semester: opts.semester || 'all',
      date: opts.date || dateStr,
      targetDuration: Number(opts.targetDuration) || 60,
      totalDuration: 0,
      unitTopic: opts.unitTopic || '',
      bigIdea: opts.bigIdea || '',
      tags: Array.isArray(opts.tags) ? opts.tags.slice() : [],
      linkedLessons: {
        previousLessonId: opts.previousLessonId || '',
        nextLessonId: opts.nextLessonId || '',
        relatedLessonIds: []
      },
      learningObjectives: opts.learningObjectives || [],
      descriptorIds: opts.descriptorIds || [],
      materials: opts.materials || [],
      senAccommodations: opts.senAccommodations || '',
      soundAlert: {
        preset: opts.soundPreset || 'chime',
        customFile: opts.soundCustomFile || '',
        volume: 90
      },
      teamConfig: {
        enabled: !!opts.teamsEnabled,
        teamSize: opts.teamSize || 4,
        groupFormation: 'mixed_ability',
        roles: [
          { role: 'Leader / Facilitator', explanation: 'Guides team discussion and keeps focus.' },
          { role: 'Scribe / Recorder', explanation: 'Takes notes and writes down team consensus.' },
          { role: 'Resource Manager', explanation: 'Collects and manages materials and worksheets.' },
          { role: 'Checker / Reporter', explanation: 'Verifies everyone understands and presents results.' }
        ]
      },
      sections: opts.sections || (isBlank ? [] : [
        {
          id: LessonCreatorService.generateId('sec'),
          title: 'Starter / Hook',
          duration: 10,
          activityTypeId: 'warm_up',
          interactionTypeId: 'pairs',
          objective: '',
          teacherAction: '',
          studentAction: '',
          descriptorIds: [],
          resources: '',
          assessmentStrategy: '',
          differentiation: ''
        },
        {
          id: LessonCreatorService.generateId('sec'),
          title: 'Direct Instruction & Modeling',
          duration: 15,
          activityTypeId: 'direct_instruction',
          interactionTypeId: 'teacher_led',
          objective: '',
          teacherAction: '',
          studentAction: '',
          descriptorIds: [],
          resources: '',
          assessmentStrategy: '',
          differentiation: ''
        },
        {
          id: LessonCreatorService.generateId('sec'),
          title: 'Guided & Group Task',
          duration: 25,
          activityTypeId: 'group_activity',
          interactionTypeId: 'small_groups',
          objective: '',
          teacherAction: '',
          studentAction: '',
          descriptorIds: [],
          resources: '',
          assessmentStrategy: '',
          differentiation: ''
        },
        {
          id: LessonCreatorService.generateId('sec'),
          title: 'Plenary & Exit Ticket',
          duration: 10,
          activityTypeId: 'plenary',
          interactionTypeId: 'individual',
          objective: '',
          teacherAction: '',
          studentAction: '',
          descriptorIds: [],
          resources: '',
          assessmentStrategy: '',
          differentiation: ''
        }
      ]),
      homework: opts.homework || '',
      notes: opts.notes || ''
    };
  };

  // ── 8. Schema Factory: Blank Multi-Lesson Sequence ─────────────────────────
  LessonCreatorService.createBlankSequence = function (opts) {
    opts = opts || {};
    return {
      _version: 1,
      id: opts.id || LessonCreatorService.generateId('seq'),
      title: opts.title || 'Untitled Unit Sequence',
      subjectId: opts.subjectId || 'science',
      classId: opts.classId || '',
      yearLevel: opts.yearLevel || 'all',
      semester: opts.semester || 'all',
      totalLessons: opts.totalLessons || 3,
      estimatedHours: Number(opts.estimatedHours) || 3.0,
      tags: Array.isArray(opts.tags) ? opts.tags.slice() : [],
      description: opts.description || '',
      lessons: Array.isArray(opts.lessons) ? opts.lessons : []
    };
  };

  // ── 9. Calculation & Timing Breakdown ──────────────────────────────────────
  LessonCreatorService.recalculateDuration = function (lessonPlan) {
    if (!lessonPlan || !Array.isArray(lessonPlan.sections)) return 0;
    var sum = 0;
    lessonPlan.sections.forEach(function (sec) {
      sum += Number(sec.duration) || 0;
    });
    lessonPlan.totalDuration = sum;
    return sum;
  };

  // ── 10. Curriculum Coverage & Compilation Matrix ───────────────────────────
  LessonCreatorService.compileCurriculumCoverage = function (allLessonPlans, allDescriptors, filterOptions) {
    filterOptions = filterOptions || {};
    allLessonPlans = Array.isArray(allLessonPlans) ? allLessonPlans : [];
    allDescriptors = Array.isArray(allDescriptors) ? allDescriptors : [];

    // Filter descriptors matching criteria
    var filteredDescriptors = allDescriptors.filter(function (d) {
      if (filterOptions.subjectId && filterOptions.subjectId !== 'all' && d.subjectId !== filterOptions.subjectId) return false;
      if (filterOptions.yearLevel && filterOptions.yearLevel !== 'all' && d.yearLevel && d.yearLevel !== 'all' && d.yearLevel !== filterOptions.yearLevel) return false;
      if (filterOptions.semester && filterOptions.semester !== 'all' && d.semester && d.semester !== 'all' && d.semester !== filterOptions.semester) return false;
      return true;
    });

    var coverageMap = {};
    filteredDescriptors.forEach(function (d) {
      coverageMap[d.id] = {
        descriptor: d,
        count: 0,
        lessons: [],
        isTicked: false
      };
    });

    allLessonPlans.forEach(function (plan) {
      if (!plan) return;
      if (filterOptions.classId && filterOptions.classId !== 'all' && plan.classId && plan.classId !== filterOptions.classId) return;

      var planDescSet = new Set();
      (plan.descriptorIds || []).forEach(function (id) { planDescSet.add(id); });
      (plan.sections || []).forEach(function (sec) {
        (sec.descriptorIds || []).forEach(function (id) { planDescSet.add(id); });
      });

      planDescSet.forEach(function (descId) {
        if (coverageMap[descId]) {
          coverageMap[descId].count++;
          coverageMap[descId].lessons.push({
            id: plan.id,
            title: plan.title || 'Untitled',
            date: plan.date || '',
            classId: plan.classId || ''
          });
        }
      });
    });

    var totalDescriptors = filteredDescriptors.length;
    var coveredCount = 0;
    var categoriesMap = {};

    Object.keys(coverageMap).forEach(function (descId) {
      var item = coverageMap[descId];
      if (item.count > 0 || item.isTicked) {
        coveredCount++;
      }
      var cat = item.descriptor.category || 'General';
      var sub = item.descriptor.subCategory || 'Other';

      if (!categoriesMap[cat]) {
        categoriesMap[cat] = {
          name: cat,
          total: 0,
          covered: 0,
          subCategories: {}
        };
      }
      categoriesMap[cat].total++;
      if (item.count > 0 || item.isTicked) categoriesMap[cat].covered++;

      if (!categoriesMap[cat].subCategories[sub]) {
        categoriesMap[cat].subCategories[sub] = {
          name: sub,
          total: 0,
          covered: 0,
          items: []
        };
      }
      categoriesMap[cat].subCategories[sub].total++;
      if (item.count > 0 || item.isTicked) categoriesMap[cat].subCategories[sub].covered++;
      categoriesMap[cat].subCategories[sub].items.push(item);
    });

    var percentage = totalDescriptors > 0 ? Math.round((coveredCount / totalDescriptors) * 100) : 0;

    return {
      stats: {
        total: totalDescriptors,
        covered: coveredCount,
        remaining: totalDescriptors - coveredCount,
        percentage: percentage
      },
      categories: categoriesMap,
      coverageMap: coverageMap
    };
  };

  // ── 11. Constellation Board Builder (Export as New or Merge) ───────────────
  LessonCreatorService.buildConstellationSession = function (lessonPlan, opts) {
    opts = opts || {};
    var now = Date.now();
    var plan = lessonPlan || LessonCreatorService.createBlankLessonPlan();
    var isMerge = !!opts.isMerge && opts.existingSession;
    var targetSession = isMerge ? JSON.parse(JSON.stringify(opts.existingSession)) : {
      _type: 'constellation',
      _version: 1,
      _createdAt: now,
      _savedAt: now,
      _plannerEntryId: plan.id || '',
      _classGroup: String(plan.classId || ''),
      dateCreated: new Date(now).toISOString(),
      title: plan.title || 'Lesson Plan',
      attachments: [],
      currentPage: 0,
      nodes: [],
      edges: [],
      groups: [],
      masks: [],
      notes: [],
      drawings: [],
      shapes: [],
      tables: [],
      media: [],
      boardBg: null,
      boardBgColor: null,
      boardBackgroundColor: null
    };

    var startX = 200;
    var startY = 200;
    if (isMerge && Array.isArray(targetSession.nodes) && targetSession.nodes.length > 0) {
      var maxX = 0;
      targetSession.nodes.forEach(function (n) {
        var nx = Number(n.x) || 0;
        if (nx > maxX) maxX = nx;
      });
      startX = maxX + 400;
    }

    var newNodes = [];
    var newEdges = [];

    // Central Root Node: Lesson Title & Objectives
    var rootNodeId = 'node-' + LessonCreatorService.generateId('n');
    var rootObjText = (plan.learningObjectives || []).filter(Boolean).join('\n• ');
    var rootNode = {
      id: rootNodeId,
      text: (plan.title || 'Lesson Plan') + (rootObjText ? '\n\nObjectives:\n• ' + rootObjText : ''),
      x: startX,
      y: startY,
      width: 320,
      height: 160,
      color: '#1e293b',
      bgColor: '#f1f5f9',
      textColor: '#0f172a',
      fontSize: 16,
      shape: 'roundRect',
      isPinned: true
    };
    newNodes.push(rootNode);

    // Team Role Node if enabled
    if (plan.teamConfig && plan.teamConfig.enabled) {
      var teamNodeId = 'node-' + LessonCreatorService.generateId('n');
      var rolesText = (plan.teamConfig.roles || []).map(function (r) {
        return '• ' + r.role + ': ' + r.explanation;
      }).join('\n');
      var teamNode = {
        id: teamNodeId,
        text: 'Teams of ' + plan.teamConfig.teamSize + '\n' + rolesText,
        x: startX,
        y: startY - 180,
        width: 280,
        height: 120,
        bgColor: '#ede9fe',
        textColor: '#5b21b6',
        fontSize: 14,
        shape: 'roundRect'
      };
      newNodes.push(teamNode);
      newEdges.push({
        id: 'edge-' + LessonCreatorService.generateId('e'),
        from: rootNodeId,
        to: teamNodeId,
        color: '#8b5cf6',
        style: 'dashed'
      });
    }

    // Section Phase Nodes arranged horizontally
    var currentX = startX + 380;
    var sections = Array.isArray(plan.sections) ? plan.sections : [];

    sections.forEach(function (sec, idx) {
      var secNodeId = 'node-' + LessonCreatorService.generateId('n');
      var actName = sec.activityTypeId ? sec.activityTypeId.replace(/_/g, ' ').toUpperCase() : 'ACTIVITY';
      var modeName = sec.interactionTypeId ? sec.interactionTypeId.replace(/_/g, ' ') : '';
      
      var secText = 'Phase ' + (idx + 1) + ': ' + (sec.title || 'Phase') + ' (' + (sec.duration || 0) + 'm)\n' +
        '[' + actName + (modeName ? ' | ' + modeName : '') + ']\n\n' +
        (sec.objective ? 'Objective: ' + sec.objective + '\n' : '') +
        (sec.studentAction ? 'Student: ' + sec.studentAction + '\n' : '') +
        (sec.teacherAction ? 'Teacher: ' + sec.teacherAction : '');

      var secNode = {
        id: secNodeId,
        text: secText.trim(),
        x: currentX,
        y: startY + (idx % 2 === 0 ? -40 : 60),
        width: 300,
        height: 180,
        bgColor: idx === 0 ? '#fef3c7' : (idx === sections.length - 1 ? '#ccfbf1' : '#e0e7ff'),
        textColor: '#111111',
        fontSize: 14,
        shape: 'roundRect'
      };
      newNodes.push(secNode);

      newEdges.push({
        id: 'edge-' + LessonCreatorService.generateId('e'),
        from: rootNodeId,
        to: secNodeId,
        color: '#64748b',
        arrow: true
      });

      if (idx > 0 && newNodes[newNodes.length - 2]) {
        newEdges.push({
          id: 'edge-seq-' + LessonCreatorService.generateId('e'),
          from: newNodes[newNodes.length - 2].id,
          to: secNodeId,
          color: '#3b82f6',
          style: 'solid',
          arrow: true
        });
      }

      currentX += 360;
    });

    if (isMerge) {
      targetSession.nodes = (targetSession.nodes || []).concat(newNodes);
      targetSession.edges = (targetSession.edges || []).concat(newEdges);
      targetSession._savedAt = now;
      return targetSession;
    }

    targetSession.nodes = newNodes;
    targetSession.edges = newEdges;
    return targetSession;
  };

  // ── 12. Audio Synthesizer & Sound Player ───────────────────────────────────
  LessonCreatorService.playPresetSound = function (presetName, volumePercent) {
    try {
      var AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      var ctx = new AudioContext();
      var vol = Math.max(0, Math.min(100, Number(volumePercent) || 90)) / 100;
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.3, ctx.currentTime);
      gain.connect(ctx.destination);

      var now = ctx.currentTime;

      if (presetName === 'chime' || !presetName) {
        [523.25, 659.25, 783.99, 1046.5].forEach(function (freq, i) {
          var osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          osc.connect(gain);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.6);
        });
      } else if (presetName === 'bell') {
        var osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.connect(gain);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
        osc.start(now);
        osc.stop(now + 1.8);
      } else if (presetName === 'marimba') {
        [329.63, 440, 554.37, 659.25].forEach(function (freq, i) {
          var osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.06);
          osc.connect(gain);
          osc.start(now + i * 0.06);
          osc.stop(now + i * 0.06 + 0.3);
        });
      } else if (presetName === 'gavel') {
        [150, 120].forEach(function (freq, i) {
          var osc = ctx.createOscillator();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now + i * 0.12);
          osc.connect(gain);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 0.08);
        });
      } else {
        [880, 880].forEach(function (freq, i) {
          var osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.15);
          osc.connect(gain);
          osc.start(now + i * 0.15);
          osc.stop(now + i * 0.15 + 0.1);
        });
      }
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  };

  // ── 13. Unit Sequence Multi-Document Exporter Engine ───────────────────────
  function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  LessonCreatorService.createUnitArchiveBundle = function (unitSeq, fullLessons, fullTests) {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      type: 'cmt_unit_sequence_bundle',
      unitSequence: {
        id: unitSeq.id || ('unit_' + Date.now()),
        title: unitSeq.title || 'Untitled Unit Sequence',
        subject: unitSeq.subject || (fullLessons[0] && fullLessons[0].subjectId) || '',
        classId: unitSeq.classId || (fullLessons[0] && fullLessons[0].classId) || '',
        totalItems: (unitSeq.lessons || []).length,
        items: unitSeq.lessons || []
      },
      lessons: fullLessons || [],
      tests: fullTests || []
    };
  };

  LessonCreatorService.exportSequenceToHtml = function (unitSeq, fullLessons, fullTests, options) {
    options = options || {};
    var title = (unitSeq && unitSeq.title) || 'Unit Curriculum Booklet';
    var subject = (unitSeq && unitSeq.subject) || (fullLessons[0] && (fullLessons[0].subject || fullLessons[0].subjectId)) || '';
    var className = (unitSeq && unitSeq.classId) || (fullLessons[0] && fullLessons[0].classId) || '';
    var items = (unitSeq && Array.isArray(unitSeq.lessons)) ? unitSeq.lessons : [];

    var totalLessonMinutes = 0;
    (fullLessons || []).forEach(function (l) {
      if (l && l.sections) {
        l.sections.forEach(function (s) { totalLessonMinutes += (Number(s.duration) || 0); });
      }
    });

    var totalExamPoints = 0;
    (fullTests || []).forEach(function (t) {
      if (t && t.exercises) {
        t.exercises.forEach(function (e) { totalExamPoints += (Number(e.points) || 0); });
      }
    });

    var cssTheme = options.cssTheme || options.theme || 'neobrutalist';
    var testCompetencesMode = options.testCompetencesMode || 'compact';
    var testCriteriaMode = options.testCriteriaMode || 'compact';
    var includeGradingScale = options.includeGradingScale !== false;
    var includeAnswerKeys = !!options.includeAnswerKeys;

    function getThemeCss(theme) {
      if (theme === 'classic') {
        return '* { box-sizing: border-box; }\n' +
          'body {\n' +
          '  font-family: "Times New Roman", "Garamond", "Georgia", "Liberation Serif", serif;\n' +
          '  background: #ffffff;\n' +
          '  color: #111111;\n' +
          '  margin: 0;\n' +
          '  padding: 28px;\n' +
          '  line-height: 1.6;\n' +
          '  font-size: 11pt;\n' +
          '}\n' +
          '.unit-container { max-width: 860px; margin: 0 auto; }\n' +
          '.unit-hero {\n' +
          '  border: 1px solid #111111;\n' +
          '  border-top: 4px solid #111111;\n' +
          '  padding: 20px;\n' +
          '  margin-bottom: 24px;\n' +
          '  background: #ffffff;\n' +
          '  text-align: center;\n' +
          '}\n' +
          '.unit-hero-badge {\n' +
          '  font-size: 0.8rem;\n' +
          '  font-weight: bold;\n' +
          '  text-transform: uppercase;\n' +
          '  letter-spacing: 2px;\n' +
          '  display: block;\n' +
          '  margin-bottom: 8px;\n' +
          '  color: #333333;\n' +
          '}\n' +
          '.unit-title { font-size: 1.9rem; font-weight: normal; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px; }\n' +
          '.unit-meta-grid { display: flex; justify-content: center; flex-wrap: wrap; gap: 14px; margin-top: 10px; border-top: 1px solid #ddd; padding-top: 8px; }\n' +
          '.unit-meta-pill { font-size: 0.85rem; font-style: italic; color: #222; }\n' +
          '.unit-meta-pill strong { font-style: normal; }\n' +
          '.unit-toc { border: 1px solid #111111; padding: 18px; margin-bottom: 24px; background: #ffffff; }\n' +
          '.unit-toc-title { font-size: 1.05rem; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px 0; border-bottom: 1px solid #111; padding-bottom: 4px; text-align: center; }\n' +
          '.unit-toc-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }\n' +
          '.unit-toc-table th, .unit-toc-table td { border: 1px solid #333; padding: 6px 10px; text-align: left; }\n' +
          '.unit-toc-table th { background: #f4f4f4; font-weight: bold; text-transform: uppercase; font-size: 0.8rem; }\n' +
          '.unit-item-badge { font-size: 0.75rem; font-weight: bold; text-transform: uppercase; }\n' +
          '.unit-item-badge.lesson { color: #1e3a8a; }\n' +
          '.unit-item-badge.test { color: #831843; }\n' +
          '.unit-lesson-card { border: 1px solid #111111; margin-bottom: 24px; padding: 18px; background: #ffffff; }\n' +
          '.unit-card-hdr { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1.5px solid #111; padding-bottom: 8px; margin-bottom: 12px; }\n' +
          '.unit-card-title { font-size: 1.3rem; font-weight: bold; margin: 0; }\n' +
          '.phase-row { border-bottom: 1px solid #ddd; padding: 10px 0; margin-bottom: 6px; }\n' +
          '.phase-row:last-child { border-bottom: none; }\n' +
          '.phase-hdr { display: flex; justify-content: space-between; font-weight: bold; font-size: 0.95rem; margin-bottom: 4px; }\n' +
          '.phase-obj { font-size: 0.9rem; margin-bottom: 6px; }\n' +
          '.phase-actions { display: flex; gap: 12px; font-size: 0.85rem; margin-top: 6px; }\n' +
          '.action-box { border-left: 2px solid #333; padding-left: 8px; flex: 1 1 0; min-width: 0; }\n' +
          '.action-tag { font-size: 0.75rem; font-weight: bold; text-transform: uppercase; display: block; margin-bottom: 2px; color: #444; }\n' +
          '.comp-tag-chip { border: 1px solid #666; padding: 1px 5px; font-size: 0.75rem; display: inline-block; margin: 2px 3px 2px 0; background: #f9f9f9; }\n' +
          '.unit-comp-matrix { margin-top: 18px; border: 1px solid #111; padding: 14px; background: #fafafa; }\n' +
          '.unit-comp-matrix-hdr { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }\n' +
          '.unit-comp-matrix-title { font-size: 0.95rem; font-weight: bold; text-transform: uppercase; }\n' +
          '.unit-comp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 8px; }\n' +
          '.unit-comp-card { border: 1px solid #ccc; padding: 6px 8px; background: #fff; }\n' +
          '.test-comp-section { margin-top: 8px; padding-top: 6px; border-top: 1px solid #ddd; }\n' +
          '.test-comp-label { font-size: 0.8rem; font-weight: bold; text-transform: uppercase; color: #333; margin-bottom: 4px; display: block; }\n' +
          '.test-comp-cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 6px; margin-top: 4px; }\n' +
          '.test-comp-card { border: 1px solid #bbb; padding: 6px 8px; background: #fff; }\n' +
          '.test-criteria-section { margin-top: 8px; padding-top: 6px; border-top: 1px solid #ddd; }\n' +
          '.test-criteria-label { font-size: 0.8rem; font-weight: bold; text-transform: uppercase; color: #333; margin-bottom: 4px; display: block; }\n' +
          '.test-criteria-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 4px; }\n' +
          '.test-criteria-table th, .test-criteria-table td { border: 1px solid #333; padding: 4px 8px; text-align: left; }\n' +
          '.test-criteria-table th { background: #f4f4f4; font-weight: bold; }\n' +
          '.test-criterion-card { border: 1px solid #ccc; padding: 6px 8px; margin-bottom: 4px; }\n' +
          '.unit-exam-card { border: 1px solid #111; margin-bottom: 24px; padding: 18px; background: #ffffff; }\n' +
          '.ex-item-card { border: 1px solid #999; padding: 10px; margin-bottom: 10px; }\n' +
          '.unit-page-break { page-break-before: always; }\n' +
          '@media print {\n' +
          '  body { padding: 0 !important; font-size: 10.5pt !important; }\n' +
          '  .unit-container { max-width: 100% !important; margin: 0 !important; }\n' +
          '  .unit-hero, .unit-toc, .unit-lesson-card, .unit-exam-card { page-break-inside: avoid; }\n' +
          '  .unit-page-break { page-break-before: always !important; }\n' +
          '  @page { margin: 15mm 12mm; size: A4 portrait; }\n' +
          '}\n';
      }

      if (theme === 'modern') {
        return '* { box-sizing: border-box; }\n' +
          'body {\n' +
          '  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\n' +
          '  background: #f8fafc;\n' +
          '  color: #0f172a;\n' +
          '  margin: 0;\n' +
          '  padding: 24px;\n' +
          '  line-height: 1.55;\n' +
          '  font-size: 14px;\n' +
          '}\n' +
          '.unit-container { max-width: 900px; margin: 0 auto; }\n' +
          '.unit-hero {\n' +
          '  background: #ffffff;\n' +
          '  border: 1px solid #e2e8f0;\n' +
          '  border-radius: 12px;\n' +
          '  box-shadow: 0 1px 3px rgba(0,0,0,0.05);\n' +
          '  padding: 24px;\n' +
          '  margin-bottom: 24px;\n' +
          '}\n' +
          '.unit-hero-badge {\n' +
          '  background: #e0e7ff;\n' +
          '  color: #3730a3;\n' +
          '  font-size: 0.72rem;\n' +
          '  font-weight: 700;\n' +
          '  text-transform: uppercase;\n' +
          '  letter-spacing: 0.5px;\n' +
          '  padding: 3px 10px;\n' +
          '  display: inline-block;\n' +
          '  margin-bottom: 10px;\n' +
          '  border-radius: 9999px;\n' +
          '}\n' +
          '.unit-title { font-size: 1.7rem; font-weight: 800; margin: 0 0 8px 0; color: #0f172a; letter-spacing: -0.02em; }\n' +
          '.unit-meta-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }\n' +
          '.unit-meta-pill { background: #f1f5f9; color: #334155; padding: 4px 10px; font-size: 0.8rem; font-weight: 600; border-radius: 6px; }\n' +
          '.unit-meta-pill.highlight { background: #e0f2fe; color: #0369a1; }\n' +
          '.unit-toc { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); padding: 20px; margin-bottom: 24px; }\n' +
          '.unit-toc-title { font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0 0 14px 0; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }\n' +
          '.unit-toc-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }\n' +
          '.unit-toc-table th, .unit-toc-table td { border-bottom: 1px solid #e2e8f0; padding: 9px 12px; text-align: left; }\n' +
          '.unit-toc-table th { background: #f8fafc; color: #475569; font-weight: 600; font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.5px; }\n' +
          '.unit-item-badge { font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 9999px; display: inline-block; }\n' +
          '.unit-item-badge.lesson { background: #e0e7ff; color: #3730a3; }\n' +
          '.unit-item-badge.test { background: #fee2e2; color: #991b1b; }\n' +
          '.unit-lesson-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 24px; padding: 20px; }\n' +
          '.unit-card-hdr { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 14px; flex-wrap: wrap; gap: 8px; }\n' +
          '.unit-card-title { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0; }\n' +
          '.phase-row { border: 1px solid #f1f5f9; border-radius: 8px; padding: 12px; margin-bottom: 10px; background: #fafafa; }\n' +
          '.phase-hdr { display: flex; justify-content: space-between; font-weight: 600; font-size: 0.88rem; color: #1e293b; margin-bottom: 6px; }\n' +
          '.phase-obj { font-size: 0.84rem; color: #334155; margin-bottom: 6px; }\n' +
          '.phase-actions { display: flex; gap: 10px; font-size: 0.82rem; margin-top: 6px; }\n' +
          '.action-box { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; flex: 1 1 0; min-width: 0; }\n' +
          '.action-tag { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 3px; }\n' +
          '.comp-tag-chip { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 2px 7px; font-size: 0.72rem; font-weight: 600; display: inline-block; margin: 2px 4px 2px 0; border-radius: 9999px; }\n' +
          '.comp-tag-chip.test { background: #fef2f2; color: #991b1b; border-color: #fecaca; }\n' +
          '.unit-comp-matrix { margin-top: 16px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; }\n' +
          '.unit-comp-matrix-hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }\n' +
          '.unit-comp-matrix-title { font-size: 0.88rem; font-weight: 700; color: #0f172a; text-transform: uppercase; }\n' +
          '.unit-comp-matrix-badge { background: #475569; color: #fff; font-size: 0.7rem; font-weight: 600; padding: 2px 8px; border-radius: 9999px; }\n' +
          '.unit-comp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 8px; }\n' +
          '.unit-comp-card { background: #ffffff; border: 1px solid #e2e8f0; padding: 8px 10px; border-radius: 6px; }\n' +
          '.test-comp-section { margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0; }\n' +
          '.test-comp-label { font-size: 0.74rem; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px; display: block; }\n' +
          '.test-comp-cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 6px; margin-top: 4px; }\n' +
          '.test-comp-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; }\n' +
          '.test-criteria-section { margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0; }\n' +
          '.test-criteria-label { font-size: 0.74rem; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px; display: block; }\n' +
          '.test-criteria-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; margin-top: 4px; }\n' +
          '.test-criteria-table th, .test-criteria-table td { border-bottom: 1px solid #e2e8f0; padding: 5px 8px; text-align: left; }\n' +
          '.test-criteria-table th { background: #f8fafc; color: #475569; font-weight: 600; font-size: 0.74rem; }\n' +
          '.test-criterion-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; margin-bottom: 6px; }\n' +
          '.unit-exam-card { background: #ffffff; border: 1px solid #fecaca; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 24px; padding: 20px; }\n' +
          '.ex-item-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 10px; }\n' +
          '.unit-page-break { page-break-before: always; }\n' +
          '@media print {\n' +
          '  body { background: #fff !important; padding: 0 !important; font-size: 10pt !important; }\n' +
          '  .unit-container { max-width: 100% !important; margin: 0 !important; }\n' +
          '  .unit-hero, .unit-toc, .unit-lesson-card { box-shadow: none !important; border: 1px solid #cbd5e1 !important; page-break-inside: avoid; }\n' +
          '  .unit-exam-card { box-shadow: none !important; border: 1px solid #cbd5e1 !important; page-break-inside: auto; }\n' +
          '  .unit-page-break { page-break-before: always !important; }\n' +
          '  @page { margin: 12mm 10mm; size: A4 portrait; }\n' +
          '}\n';
      }

      if (theme === 'horizontal_table') {
        return '* { box-sizing: border-box; }\n' +
          'body {\n' +
          '  font-family: "Lexend", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\n' +
          '  background: #ffffff;\n' +
          '  color: #111111;\n' +
          '  margin: 0;\n' +
          '  padding: 16px;\n' +
          '  line-height: 1.45;\n' +
          '  font-size: 13px;\n' +
          '}\n' +
          '.unit-container { width: 100%; max-width: 100%; margin: 0 auto; }\n' +
          '.unit-hero {\n' +
          '  background: #f8fafc;\n' +
          '  border: 2px solid #222222;\n' +
          '  box-shadow: 3px 3px 0 #333333;\n' +
          '  border-radius: 6px;\n' +
          '  padding: 14px 18px;\n' +
          '  margin-bottom: 16px;\n' +
          '}\n' +
          '.unit-hero-badge {\n' +
          '  background: #222222;\n' +
          '  color: #ffffff;\n' +
          '  font-size: 0.72rem;\n' +
          '  font-weight: 900;\n' +
          '  text-transform: uppercase;\n' +
          '  padding: 2px 7px;\n' +
          '  display: inline-block;\n' +
          '  margin-bottom: 6px;\n' +
          '  border-radius: 3px;\n' +
          '}\n' +
          '.unit-title { font-size: 1.5rem; font-weight: 900; margin: 0 0 6px 0; text-transform: uppercase; }\n' +
          '.unit-meta-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }\n' +
          '.unit-meta-pill { background: #ffffff; border: 1.5px solid #222222; padding: 2px 8px; font-size: 0.78rem; font-weight: 700; border-radius: 4px; }\n' +
          '.unit-meta-pill.highlight { background: #fef08a; }\n' +
          '.unit-toc { background: #ffffff; border: 2px solid #222; box-shadow: 3px 3px 0 #333; border-radius: 6px; padding: 14px; margin-bottom: 16px; }\n' +
          '.unit-toc-title { font-size: 0.95rem; font-weight: 900; text-transform: uppercase; margin: 0 0 10px 0; border-bottom: 2px solid #222; padding-bottom: 4px; }\n' +
          '.unit-toc-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }\n' +
          '.unit-toc-table th, .unit-toc-table td { border: 1.5px solid #222; padding: 6px 8px; text-align: left; }\n' +
          '.unit-toc-table th { background: #e2e8f0; font-weight: 900; }\n' +
          '.unit-item-badge { font-size: 0.7rem; font-weight: 900; padding: 1px 5px; border: 1.5px solid #222; display: inline-block; text-transform: uppercase; border-radius: 3px; }\n' +
          '.unit-item-badge.lesson { background: #dbeafe; }\n' +
          '.unit-item-badge.test { background: #fce7f3; color: #9d174d; }\n' +
          '.unit-lesson-card { background: #ffffff; border: 2px solid #222; box-shadow: 3px 3px 0 #333; border-radius: 6px; margin-bottom: 16px; padding: 14px; }\n' +
          '.unit-card-hdr { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #222; padding-bottom: 8px; margin-bottom: 10px; flex-wrap: wrap; gap: 8px; }\n' +
          '.unit-card-title { font-size: 1.15rem; font-weight: 900; margin: 0; }\n' +
          '.landscape-lesson-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; margin-top: 6px; }\n' +
          '.landscape-lesson-table th, .landscape-lesson-table td { border: 1.5px solid #222; padding: 6px 8px; vertical-align: top; }\n' +
          '.landscape-lesson-table th { background: #e2e8f0; font-weight: 900; font-size: 0.76rem; text-transform: uppercase; }\n' +
          '.landscape-pacing { font-weight: 800; font-size: 0.8rem; text-align: center; background: #f8fafc; }\n' +
          '.landscape-phase-title { font-weight: 900; font-size: 0.82rem; color: #000; margin-bottom: 4px; }\n' +
          '.comp-tag-chip { background: #fef08a; border: 1.5px solid #222; padding: 1px 5px; font-size: 0.68rem; font-weight: 800; display: inline-block; margin: 1px 2px 1px 0; border-radius: 3px; }\n' +
          '.comp-tag-chip.test { background: #fce7f3; color: #9d174d; }\n' +
          '.toc-comp-pills { display: flex; flex-wrap: wrap; gap: 3px; align-items: center; margin-top: 3px; }\n' +
          '.unit-comp-matrix { margin-top: 14px; background: #f8fafc; border: 1.5px solid #222; padding: 10px 12px; border-radius: 4px; }\n' +
          '.unit-comp-matrix-hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1.5px dashed #222; }\n' +
          '.unit-comp-matrix-title { font-size: 0.85rem; font-weight: 900; text-transform: uppercase; }\n' +
          '.unit-comp-matrix-badge { background: #222; color: #fff; font-size: 0.7rem; font-weight: 900; padding: 2px 8px; border-radius: 3px; }\n' +
          '.unit-comp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 6px; }\n' +
          '.unit-comp-card { background: #ffffff; border: 1.5px solid #222; padding: 6px 8px; border-radius: 3px; }\n' +
          '.test-comp-section { margin-top: 8px; padding-top: 6px; border-top: 1px dashed #64748b; }\n' +
          '.test-comp-label { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: #334155; margin-bottom: 4px; display: block; }\n' +
          '.test-comp-chips { display: flex; flex-wrap: wrap; gap: 4px; }\n' +
          '.test-comp-cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 6px; margin-top: 4px; }\n' +
          '.test-comp-card { background: #ffffff; border: 1.5px solid #222; border-radius: 4px; padding: 6px 8px; }\n' +
          '.test-criteria-section { margin-top: 8px; padding-top: 6px; border-top: 1px dashed #64748b; }\n' +
          '.test-criteria-label { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: #334155; margin-bottom: 4px; display: block; }\n' +
          '.test-criteria-table { width: 100%; border-collapse: collapse; font-size: 0.76rem; margin-top: 4px; background: #fff; }\n' +
          '.test-criteria-table th, .test-criteria-table td { border: 1px solid #222; padding: 3px 6px; text-align: left; }\n' +
          '.test-criteria-table th { background: #f1f5f9; font-weight: 800; }\n' +
          '.test-criterion-card { background: #ffffff; border: 1.5px solid #222; border-radius: 4px; padding: 6px 8px; margin-bottom: 4px; }\n' +
          '.unit-exam-card { background: #fff8f8; border: 2px solid #222; box-shadow: 3px 3px 0 #333; border-radius: 6px; margin-bottom: 16px; padding: 14px; }\n' +
          '.ex-item-card { background: #ffffff; border: 1.5px solid #222; padding: 10px; margin-bottom: 8px; border-radius: 4px; }\n' +
          '.unit-page-break { page-break-before: always; }\n' +
          '@media print {\n' +
          '  body { background: #fff !important; padding: 0 !important; font-size: 9.5pt !important; }\n' +
          '  .unit-container { width: 100% !important; max-width: 100% !important; margin: 0 !important; }\n' +
          '  .unit-hero, .unit-toc, .unit-lesson-card, .unit-exam-card { box-shadow: none !important; border: 1.5px solid #000 !important; page-break-inside: avoid; }\n' +
          '  .unit-lesson-card, .unit-exam-card { page-break-after: always !important; }\n' +
          '  .unit-page-break { page-break-before: always !important; }\n' +
          '  @page { margin: 10mm 8mm; size: A4 landscape; }\n' +
          '}\n';
      }

      // Default Light Neobrutalist
      return ':root {\n' +
        '  --neo-border: 2px solid #222222;\n' +
        '  --neo-shadow: 3px 3px 0px #333333;\n' +
        '  --neo-bg: #ffffff;\n' +
        '  --neo-canvas: #f5f5f0;\n' +
        '  --neo-accent: #fef08a;\n' +
        '  --neo-blue: #dbeafe;\n' +
        '  --neo-pink: #fce7f3;\n' +
        '  --neo-radius: 8px;\n' +
        '  --neo-radius-sm: 4px;\n' +
        '}\n' +
        '* { box-sizing: border-box; }\n' +
        'body {\n' +
        '  font-family: "Lexend", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\n' +
        '  background: var(--neo-canvas);\n' +
        '  color: #111111;\n' +
        '  margin: 0;\n' +
        '  padding: 24px;\n' +
        '  line-height: 1.5;\n' +
        '}\n' +
        '.unit-container { max-width: 920px; margin: 0 auto; }\n' +
        '.unit-hero {\n' +
        '  background: var(--neo-bg);\n' +
        '  border: var(--neo-border);\n' +
        '  box-shadow: 4px 4px 0px #333333;\n' +
        '  border-radius: var(--neo-radius);\n' +
        '  padding: 20px;\n' +
        '  margin-bottom: 24px;\n' +
        '}\n' +
        '.unit-hero-badge {\n' +
        '  background: #222222;\n' +
        '  color: #ffffff;\n' +
        '  font-size: 0.75rem;\n' +
        '  font-weight: 900;\n' +
        '  text-transform: uppercase;\n' +
        '  letter-spacing: 0.5px;\n' +
        '  padding: 3px 8px;\n' +
        '  display: inline-block;\n' +
        '  margin-bottom: 8px;\n' +
        '  border-radius: 3px;\n' +
        '}\n' +
        '.unit-title { font-size: 1.75rem; font-weight: 900; margin: 0 0 10px 0; text-transform: uppercase; }\n' +
        '.unit-meta-grid {\n' +
        '  display: flex;\n' +
        '  flex-wrap: wrap;\n' +
        '  gap: 8px;\n' +
        '  margin-top: 10px;\n' +
        '}\n' +
        '.unit-meta-pill {\n' +
        '  background: #ffffff;\n' +
        '  border: 1.5px solid #222222;\n' +
        '  padding: 4px 10px;\n' +
        '  font-size: 0.8rem;\n' +
        '  font-weight: 700;\n' +
        '  border-radius: 4px;\n' +
        '  box-shadow: 2px 2px 0 #444444;\n' +
        '}\n' +
        '.unit-meta-pill.highlight { background: var(--neo-accent); }\n' +
        '.unit-toc {\n' +
        '  background: #ffffff;\n' +
        '  border: var(--neo-border);\n' +
        '  box-shadow: var(--neo-shadow);\n' +
        '  border-radius: var(--neo-radius);\n' +
        '  padding: 18px;\n' +
        '  margin-bottom: 24px;\n' +
        '}\n' +
        '.unit-toc-title { font-size: 1rem; font-weight: 900; text-transform: uppercase; margin: 0 0 12px 0; border-bottom: 2px solid #222; padding-bottom: 6px; }\n' +
        '.unit-toc-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }\n' +
        '.unit-toc-table th, .unit-toc-table td { border: 1.5px solid #222; padding: 7px 10px; text-align: left; }\n' +
        '.unit-toc-table th { background: #e2e8f0; font-weight: 900; }\n' +
        '.unit-item-badge {\n' +
        '  font-size: 0.72rem;\n' +
        '  font-weight: 900;\n' +
        '  padding: 2px 6px;\n' +
        '  border: 1.5px solid #222;\n' +
        '  display: inline-block;\n' +
        '  text-transform: uppercase;\n' +
        '  border-radius: 3px;\n' +
        '}\n' +
        '.unit-item-badge.lesson { background: var(--neo-blue); }\n' +
        '.unit-item-badge.test { background: var(--neo-pink); color: #9d174d; }\n' +
        '.unit-lesson-card {\n' +
        '  background: #ffffff;\n' +
        '  border: var(--neo-border);\n' +
        '  box-shadow: var(--neo-shadow);\n' +
        '  border-radius: var(--neo-radius);\n' +
        '  margin-bottom: 24px;\n' +
        '  padding: 18px;\n' +
        '}\n' +
        '.unit-card-hdr {\n' +
        '  display: flex;\n' +
        '  justify-content: space-between;\n' +
        '  align-items: center;\n' +
        '  border-bottom: 2px solid #222;\n' +
        '  padding-bottom: 10px;\n' +
        '  margin-bottom: 12px;\n' +
        '  flex-wrap: wrap;\n' +
        '  gap: 8px;\n' +
        '}\n' +
        '.unit-card-title { font-size: 1.25rem; font-weight: 900; margin: 0; }\n' +
        '.phase-row {\n' +
        '  border: 1.5px solid #222;\n' +
        '  border-radius: var(--neo-radius-sm);\n' +
        '  padding: 12px;\n' +
        '  margin-bottom: 10px;\n' +
        '  background: #fafafa;\n' +
        '}\n' +
        '.phase-hdr { display: flex; justify-content: space-between; font-weight: 800; font-size: 0.9rem; margin-bottom: 6px; border-bottom: 1px dashed #444; padding-bottom: 4px; }\n' +
        '.phase-obj { font-size: 0.85rem; margin-bottom: 6px; }\n' +
        '.phase-actions { display: flex; gap: 8px; font-size: 0.8rem; margin-top: 6px; }\n' +
        '.action-box { background: #ffffff; border: 1.5px solid #222; border-radius: 4px; padding: 8px; flex: 1 1 0; min-width: 0; }\n' +
        '.action-tag { font-size: 0.7rem; font-weight: 900; text-transform: uppercase; display: block; margin-bottom: 3px; color: #222; }\n' +
        '.comp-tag-chip { background: var(--neo-accent, #fef08a); border: 1.5px solid #222; padding: 2px 6px; font-size: 0.72rem; font-weight: 800; display: inline-block; margin: 2px 3px 2px 0; border-radius: 4px; box-shadow: 1px 1px 0 #222; }\n' +
        '.comp-tag-chip.test { background: #fce7f3; color: #9d174d; }\n' +
        '.toc-comp-pills { display: flex; flex-wrap: wrap; gap: 3px; align-items: center; margin-top: 3px; }\n' +
        '.unit-comp-matrix { margin-top: 16px; background: #ffffff; border: var(--neo-border); padding: 14px; border-radius: var(--neo-radius-sm); box-shadow: 2px 2px 0 #333; }\n' +
        '.unit-comp-matrix-hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1.5px dashed #222; }\n' +
        '.unit-comp-matrix-title { font-size: 0.9rem; font-weight: 900; text-transform: uppercase; }\n' +
        '.unit-comp-matrix-badge { background: #222; color: #fff; font-size: 0.72rem; font-weight: 900; padding: 2px 8px; border-radius: 3px; }\n' +
        '.unit-comp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 8px; }\n' +
        '.unit-comp-card { background: #fdfdfd; border: 1.5px solid #222; padding: 8px 10px; border-radius: 4px; box-shadow: 2px 2px 0 #555; }\n' +
        '.unit-comp-card-top { display: flex; align-items: baseline; gap: 6px; margin-bottom: 4px; }\n' +
        '.unit-comp-card-name { font-size: 0.78rem; font-weight: 800; color: #1e293b; }\n' +
        '.unit-comp-card-links { font-size: 0.72rem; color: #475569; }\n' +
        '.unit-comp-card-links strong { color: #0f172a; }\n' +
        '.test-comp-section { margin-top: 8px; padding-top: 6px; border-top: 1px dashed #64748b; }\n' +
        '.test-comp-label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #334155; margin-bottom: 4px; display: block; }\n' +
        '.test-comp-chips { display: flex; flex-wrap: wrap; gap: 4px; }\n' +
        '.test-comp-cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 6px; margin-top: 4px; }\n' +
        '.test-comp-card { background: #ffffff; border: 1.5px solid #222; border-radius: 4px; padding: 6px 8px; box-shadow: 2px 2px 0 #555; }\n' +
        '.test-comp-card-top { display: flex; align-items: baseline; gap: 4px; flex-wrap: wrap; margin-bottom: 2px; }\n' +
        '.test-comp-card-title { font-size: 0.78rem; font-weight: 800; color: #0f172a; }\n' +
        '.test-comp-level-badge { font-size: 0.68rem; font-weight: 800; background: #e0e7ff; color: #3730a3; padding: 1px 4px; border-radius: 3px; }\n' +
        '.test-comp-cat-badge { font-size: 0.68rem; font-weight: 800; background: #f1f5f9; color: #475569; padding: 1px 4px; border-radius: 3px; }\n' +
        '.test-comp-card-desc { font-size: 0.72rem; color: #334155; line-height: 1.35; }\n' +
        '.test-criteria-section { margin-top: 8px; padding-top: 6px; border-top: 1px dashed #64748b; }\n' +
        '.test-criteria-label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #334155; margin-bottom: 4px; display: block; }\n' +
        '.test-criteria-table { width: 100%; border-collapse: collapse; font-size: 0.78rem; margin-top: 4px; background: #ffffff; }\n' +
        '.test-criteria-table th, .test-criteria-table td { border: 1.5px solid #222; padding: 4px 8px; text-align: left; }\n' +
        '.test-criteria-table th { background: #e2e8f0; font-weight: 900; font-size: 0.74rem; text-transform: uppercase; }\n' +
        '.test-criteria-list { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }\n' +
        '.test-criterion-card { background: #ffffff; border: 1.5px solid #222; border-radius: 4px; padding: 6px 8px; box-shadow: 2px 2px 0 #555; }\n' +
        '.test-criterion-top { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 4px; margin-bottom: 3px; }\n' +
        '.test-criterion-title { font-size: 0.82rem; font-weight: 800; color: #000; }\n' +
        '.test-criterion-meta { display: flex; align-items: center; gap: 6px; font-size: 0.72rem; font-weight: 700; color: #475569; }\n' +
        '.test-criterion-desc { font-size: 0.74rem; color: #334155; margin-bottom: 3px; line-height: 1.35; }\n' +
        '.test-criterion-scale { display: flex; flex-wrap: wrap; gap: 4px; font-size: 0.7rem; color: #475569; background: #f8fafc; padding: 4px 6px; border-radius: 3px; border: 1px dashed #cbd5e1; }\n' +
        '.landscape-lesson-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; margin-top: 8px; background: #fff; }\n' +
        '.landscape-lesson-table th, .landscape-lesson-table td { border: 1.5px solid #222; padding: 6px 8px; vertical-align: top; text-align: left; }\n' +
        '.landscape-lesson-table th { background: #e2e8f0; font-weight: 900; font-size: 0.75rem; text-transform: uppercase; }\n' +
        '.landscape-pacing { font-weight: 800; font-size: 0.8rem; text-align: center !important; background: #f8fafc; white-space: nowrap; }\n' +
        '.landscape-phase-title { font-weight: 900; font-size: 0.82rem; color: #000; margin-bottom: 4px; }\n' +
        '.lesson-meta-bar { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }\n' +
        '.lesson-meta-chip { background: #f8fafc; border: 1.5px solid #333; border-radius: 4px; padding: 2px 8px; font-size: 0.75rem; font-weight: 700; color: #1e293b; }\n' +
        '.lesson-meta-chip.teams { background: #f5f3ff; border-color: #6d28d9; color: #5b21b6; }\n' +
        '.lesson-meta-chip.tag { background: #fef9c3; border-color: #854d0e; color: #713f12; }\n' +
        '.phase-subbox { font-size: 0.78rem; margin-top: 6px; padding: 6px 8px; border: 1.5px solid #333; border-radius: 4px; background: #fff; }\n' +
        '.phase-subbox.diff { background: #fdf4ff; border-color: #86198f; }\n' +
        '.phase-subbox.assess { background: #ecfdf5; border-color: #065f46; }\n' +
        '.phase-subbox.resources { background: #fffbeb; border-color: #92400e; }\n' +
        '.unit-vocab-card { background: #ffffff; border: 2px solid #222; box-shadow: 3px 3px 0 #333; border-radius: 8px; padding: 18px; margin-bottom: 24px; }\n' +
        '.unit-vocab-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 8px; margin-top: 10px; }\n' +
        '.unit-vocab-item { border: 1.5px solid #333; border-radius: 4px; padding: 6px 8px; background: #fafaf7; font-size: 0.8rem; }\n' +
        '.unit-exam-card {\n' +
        '  background: #fffbfb;\n' +
        '  border: var(--neo-border);\n' +
        '  box-shadow: var(--neo-shadow);\n' +
        '  border-radius: var(--neo-radius);\n' +
        '  margin-bottom: 24px;\n' +
        '  padding: 18px;\n' +
        '}\n' +
        '.ex-item-card {\n' +
        '  background: #ffffff;\n' +
        '  border: 1.5px solid #222;\n' +
        '  border-radius: var(--neo-radius-sm);\n' +
        '  padding: 12px;\n' +
        '  margin-bottom: 10px;\n' +
        '}\n' +
        '.unit-page-break { page-break-before: always; }\n' +
        '@media print {\n' +
        '  body { background: #fff !important; padding: 0 !important; font-size: 10pt !important; }\n' +
        '  .unit-container { max-width: 100% !important; margin: 0 !important; }\n' +
        '  .unit-hero, .unit-toc, .unit-lesson-card { box-shadow: none !important; border: 1.5px solid #000 !important; page-break-inside: avoid; }\n' +
          '  .unit-exam-card { box-shadow: none !important; border: 1.5px solid #000 !important; page-break-inside: auto; }\n' +
        '  .unit-hero, .unit-toc, .unit-lesson-card, .unit-vocab-card { box-shadow: none !important; border: 1.5px solid #000 !important; page-break-inside: avoid; }\n' +
        '  .unit-exam-card { box-shadow: none !important; border: 1.5px solid #000 !important; page-break-inside: auto; }\n' +
        '  .unit-comp-matrix { box-shadow: none !important; border: 1.5px solid #000 !important; page-break-inside: avoid; }\n' +
        '  .unit-page-break { page-break-before: always !important; }\n' +
        '  @page { margin: 12mm 10mm; size: A4 portrait; }\n' +
        '}\n';
    }

    var css = getThemeCss(cssTheme);
    if (typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.getThemeCss === 'function') {
      var tcThemeMap = {
        'neobrutalist': 'neobrutalist',
        'horizontal_table': 'neobrutalist',
        'classic': 'academic',
        'editorial': 'academic',
        'modern': 'modern',
        'minimal': 'plain'
      };
      var tcMappedTheme = tcThemeMap[cssTheme] || 'neobrutalist';
      var tcBaseCss = TestCreatorService.getThemeCss(tcMappedTheme) || '';
      // Strip body rule from TestCreatorService CSS so it doesn't override unit booklet body padding/bg
      tcBaseCss = tcBaseCss.replace(/body\s*\{[^}]*\}/g, '');
      css += '\n/* TestCreatorService Embedded Styles */\n' + tcBaseCss + '\n' +
        '.landscape-lesson-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; margin-top: 8px; background: #fff; }\n' +
        '.landscape-lesson-table th, .landscape-lesson-table td { border: 1.5px solid #222; padding: 6px 8px; vertical-align: top; text-align: left; }\n' +
        '.landscape-lesson-table th { background: #e2e8f0; font-weight: 900; font-size: 0.75rem; text-transform: uppercase; }\n' +
        '.landscape-pacing { font-weight: 800; font-size: 0.8rem; text-align: center !important; background: #f8fafc; white-space: nowrap; }\n' +
        '.landscape-phase-title { font-weight: 900; font-size: 0.82rem; color: #000; margin-bottom: 4px; }\n' +
        '.lesson-meta-bar { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }\n' +
        '.lesson-meta-chip { background: #f8fafc; border: 1.5px solid #333; border-radius: 4px; padding: 2px 8px; font-size: 0.75rem; font-weight: 700; color: #1e293b; }\n' +
        '.lesson-meta-chip.teams { background: #f5f3ff; border-color: #6d28d9; color: #5b21b6; }\n' +
        '.lesson-meta-chip.tag { background: #fef9c3; border-color: #854d0e; color: #713f12; }\n' +
        '.phase-subbox { font-size: 0.78rem; margin-top: 6px; padding: 6px 8px; border: 1.5px solid #333; border-radius: 4px; background: #fff; }\n' +
        '.phase-subbox.diff { background: #fdf4ff; border-color: #86198f; }\n' +
        '.phase-subbox.assess { background: #ecfdf5; border-color: #065f46; }\n' +
        '.phase-subbox.resources { background: #fffbeb; border-color: #92400e; }\n' +
        '.unit-vocab-card { background: #ffffff; border: 2px solid #222; box-shadow: 3px 3px 0 #333; border-radius: 8px; padding: 18px; margin-bottom: 24px; }\n' +
        '.unit-vocab-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 8px; margin-top: 10px; }\n' +
        '.unit-vocab-item { border: 1.5px solid #333; border-radius: 4px; padding: 6px 8px; background: #fafaf7; font-size: 0.8rem; }\n';
    }

    // Helper: Competence Lookup & Extraction
    var compLookup = {};
    if (Array.isArray(options.allCompetences)) {
      options.allCompetences.forEach(function (c) {
        if (c && (c.id || c.code)) {
          if (c.id) compLookup[c.id] = c;
          if (c.code) compLookup[c.code] = c;
          if (c.id) {
            compLookup[c.id] = c;
            compLookup[String(c.id).toLowerCase().trim()] = c;
          }
          if (c.code) {
            compLookup[c.code] = c;
            compLookup[String(c.code).toLowerCase().trim()] = c;
          }
        }
      });
    }

    function lookupCompInfo(idOrCode) {
      if (!idOrCode) return {};
      if (typeof idOrCode === 'object') return idOrCode;
      var raw = String(idOrCode).trim();
      return compLookup[raw] || compLookup[raw.toLowerCase()] || {};
    }

    function resolveActivityLabel(aId) {
      if (!aId) return '';
      if (Array.isArray(LessonCreatorService.DEFAULT_ACTIVITY_TYPES)) {
        var found = LessonCreatorService.DEFAULT_ACTIVITY_TYPES.find(function (a) { return a.id === aId; });
        if (found) return found.name || found.shortName || aId;
      }
      return String(aId).charAt(0).toUpperCase() + String(aId).slice(1).replace(/_/g, ' ');
    }

    function resolveInteractionLabel(iId) {
      if (!iId) return '';
      if (Array.isArray(LessonCreatorService.DEFAULT_INTERACTION_TYPES)) {
        var found = LessonCreatorService.DEFAULT_INTERACTION_TYPES.find(function (i) { return i.id === iId; });
        if (found) return found.name || found.shortName || iId;
      }
      return String(iId).charAt(0).toUpperCase() + String(iId).slice(1).replace(/_/g, ' ');
    }

    function extractItemCompetences(it) {
      var set = new Set();
      var isTest = (it.type === 'test' || it.category === 'test' || it.category === 'summative');
      if (!isTest) {
        var matchL = (fullLessons || []).find(function (fl) { return fl.id === it.id; });
        if (matchL) {
          if (Array.isArray(matchL.descriptorIds)) matchL.descriptorIds.forEach(function (id) { if (id) set.add(String(id).trim()); });
          if (Array.isArray(matchL.competences)) {
            matchL.competences.forEach(function (c) {
              var cid = (typeof c === 'object' && c) ? (c.id || c.code || c.title) : c;
              if (cid) set.add(String(cid).trim());
            });
          }
          (matchL.sections || []).forEach(function (sec) {
            if (Array.isArray(sec.descriptorIds)) sec.descriptorIds.forEach(function (id) { if (id) set.add(String(id).trim()); });
            if (Array.isArray(sec.competences)) {
              sec.competences.forEach(function (c) {
                var cid = (typeof c === 'object' && c) ? (c.id || c.code || c.title) : c;
                if (cid) set.add(String(cid).trim());
              });
            }
          });
        }
      } else {
        var matchT = (fullTests || []).find(function (ft) { return ft.id === it.id; });
        if (matchT) {
          if (Array.isArray(matchT.descriptorIds)) matchT.descriptorIds.forEach(function (id) { if (id) set.add(String(id).trim()); });
          if (Array.isArray(matchT.linkedCompetenceIds)) matchT.linkedCompetenceIds.forEach(function (id) { if (id) set.add(String(id).trim()); });
          if (Array.isArray(matchT.linkedCompetences)) {
            matchT.linkedCompetences.forEach(function (c) {
              var cid = (typeof c === 'object' && c) ? (c.id || c.code || c.title) : c;
              if (cid) set.add(String(cid).trim());
            });
          }
          if (Array.isArray(matchT.competences)) {
            matchT.competences.forEach(function (c) {
              var cid = (typeof c === 'object' && c) ? (c.id || c.code || c.title) : c;
              if (cid) set.add(String(cid).trim());
            });
          }
          (matchT.exercises || []).forEach(function (ex) {
            if (Array.isArray(ex.descriptorIds)) ex.descriptorIds.forEach(function (id) { if (id) set.add(String(id).trim()); });
            if (Array.isArray(ex.linkedCompetenceIds)) ex.linkedCompetenceIds.forEach(function (id) { if (id) set.add(String(id).trim()); });
            if (Array.isArray(ex.linkedCompetences)) {
              ex.linkedCompetences.forEach(function (c) {
                var cid = (typeof c === 'object' && c) ? (c.id || c.code || c.title) : c;
                if (cid) set.add(String(cid).trim());
              });
            }
            if (Array.isArray(ex.competenceIds)) ex.competenceIds.forEach(function (id) { if (id) set.add(String(id).trim()); });
            if (Array.isArray(ex.competences)) {
              ex.competences.forEach(function (c) {
                var cid = (typeof c === 'object' && c) ? (c.id || c.code || c.title) : c;
                if (cid) set.add(String(cid).trim());
              });
            }
          });
        }
      }
      return Array.from(set).sort(function (a, b) {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
      });
    }

    var compLayout = options.competenceLayout || 'column';
    var showColumn = (compLayout === 'column' || compLayout === 'both');
    var showSubrow = (compLayout === 'subrow');
    var showMatrix = (compLayout === 'matrix' || compLayout === 'both');

    var testCriteriaMode = options.testCriteriaMode || 'compact'; // 'none' | 'compact' | 'detailed'
    var testCompetencesMode = options.testCompetencesMode || 'compact'; // 'none' | 'compact' | 'detailed'
    var tocCols = Object.assign({
      showType: true,
      showDate: false,
      showDuration: true,
      showObjectives: false
    }, options.tocCols || {});

    var lessonLayout = options.lessonLayout || (cssTheme === 'horizontal_table' ? 'horizontal_table' : 'cards');
    if (lessonLayout === 'auto') {
      lessonLayout = (cssTheme === 'horizontal_table') ? 'horizontal_table' : 'cards';
    }
    var lessonToggles = Object.assign({
      metaHeader: true,
      metaDate: true,
      metaDuration: true,
      metaSequence: true,
      metaTags: true,
      metaTeams: true,
      phaseTitle: true,
      phaseDuration: true,
      phaseActivity: true,
      phaseObjective: true,
      phaseTeacher: true,
      phaseStudent: true,
      phaseResources: true,
      phaseDescriptors: true,
      phaseDescText: false,
      phaseDiff: true,
      phaseAssess: true,
      phaseCustomFields: true
    }, options.lessonToggles || {});

    var testRenderMode = options.testRenderMode || 'full_exam'; // 'full_exam' | 'summary_cards'
    var testVariant = options.testVariant || 'A'; // 'A' | 'B' | 'both'
    var testNumberedLines = options.testNumberedLines !== undefined ? options.testNumberedLines : 'inherit';
    var testHeaderToggles = Object.assign({
      showHeader: true,
      showStudentName: true,
      showClass: true,
      showDate: true,
      showTeacher: true,
      showDuration: true,
      showTotalPoints: true,
      showMaterials: true,
      showScope: true,
      showInstructions: true
    }, options.testHeaderToggles || {});

    var testCriteriaMode = options.testCriteriaMode || 'compact'; // 'none' | 'compact' | 'detailed' | 'matrix' | 'table' | 'badges' | 'list' | 'use_test'
    var testCompetencesMode = options.testCompetencesMode || 'compact'; // 'none' | 'compact' | 'detailed' | 'table' | 'badges' | 'list' | 'use_test'
    var includeGradingScale = (options.includeGradingScale !== false);
    var testScaleDisplayMode = options.testScaleDisplayMode || 'table'; // 'use_test' | 'table' | 'inline_grades' | 'inline'
    var includeAnswerKeys = !!options.includeAnswerKeys;

    var testCompCols = Object.assign({
      showCodeCol: true,
      showTitleCol: true,
      showDescriptions: (testCompetencesMode === 'detailed' || testCompetencesMode === 'table'),
      showLevelCol: true,
      showScoreCol: false,
      showCommentsCol: false,
      separatePage: false,
      pageOrientation: 'portrait'
    }, options.testCompCols || {});

    var testCritCols = Object.assign({
      showCriterionCol: true,
      showLevelsCol: true,
      showDescriptions: (testCriteriaMode === 'detailed' || testCriteriaMode === 'matrix' || testCriteriaMode === 'table'),
      showMaxCol: true,
      showScoreCol: true,
      showCommentsCol: true,
      separatePage: false,
      pageOrientation: 'portrait'
    }, options.testCritCols || {});

    // Coverage aggregation map
    var sequenceCoverageMap = {};

    var html =
      '<!DOCTYPE html>\n' +
      '<html lang="en">\n' +
      '<head>\n' +
      '  <meta charset="UTF-8">\n' +
      '  <title>' + escapeHtml(title) + '</title>\n' +
      '  <style>\n' + css + '  </style>\n' +
      '</head>\n' +
      '<body>\n' +
      '  <div class="unit-container">\n' +
      '    <!-- ── 1. Unit Cover / Hero ── -->\n' +
      '    <div class="unit-hero">\n' +
      '      <span class="unit-hero-badge">[UNIT CURRICULUM SEQUENCE]</span>\n' +
      '      <h1 class="unit-title">' + escapeHtml(title) + '</h1>\n' +
      '      <div class="unit-meta-grid">\n' +
      (subject ? '        <span class="unit-meta-pill highlight"><strong>Subject:</strong> ' + escapeHtml(subject) + '</span>\n' : '') +
      (className ? '        <span class="unit-meta-pill"><strong>Class:</strong> ' + escapeHtml(className) + '</span>\n' : '') +
      '        <span class="unit-meta-pill"><strong>Total Lessons:</strong> ' + (fullLessons || []).length + ' (' + totalLessonMinutes + ' min)</span>\n' +
      (fullTests && fullTests.length > 0 ? '        <span class="unit-meta-pill highlight"><strong>Attached Assessments:</strong> ' + fullTests.length + ' (' + totalExamPoints + ' pts)</span>\n' : '') +
      '        <span class="unit-meta-pill"><strong>Generated:</strong> ' + new Date().toLocaleDateString() + '</span>\n' +
      '      </div>\n' +
      '    </div>\n' +
      '\n' +
      '    <!-- ── 2. Unit Table of Contents ── -->\n' +
      '    <div class="unit-toc">\n' +
      '      <h3 class="unit-toc-title">Sequence Structure &amp; Progression</h3>\n' +
      '      <table class="unit-toc-table">\n' +
      '        <thead>\n' +
      '          <tr>\n' +
      '            <th style="width:40px;">#</th>\n' +
      '            <th style="width:90px;">Type</th>\n' +
      '            <th>Title / Topic</th>\n' +
      (showColumn ? '            <th style="min-width:140px;">Competences / Standards</th>\n' : '') +
      '            <th style="width:100px;">Duration/Pts</th>\n' +
      '          </tr>\n' +
      '        </thead>\n' +
      '        <tbody>\n';
      '    </div>\n';

    var rowIdx = 1;
    items.forEach(function (it) {
    // Populate sequenceCoverageMap even if TOC is hidden
    var tocRowsData = [];
    items.forEach(function (it, idx) {
      var rIdx = idx + 1;
      var isTest = (it.type === 'test' || it.category === 'test' || it.category === 'summative');
      var badgeClass = isTest ? 'unit-item-badge test' : 'unit-item-badge lesson';
      var badgeText = isTest ? '[TEST / EXAM]' : '[LESSON ' + rowIdx + ']';
      var itemLabel = isTest ? ('Assessment ' + rowIdx) : ('Lesson ' + rowIdx);
      var badgeText = isTest ? '[TEST / EXAM]' : '[LESSON ' + rIdx + ']';
      var itemLabel = isTest ? ('Assessment ' + rIdx) : ('Lesson ' + rIdx);
      var durOrPts = isTest ? 'Exam' : 'Lesson';
      var itemDate = it.date || '';
      var itemObjSummary = '';

      if (!isTest) {
        var matchL = (fullLessons || []).find(function (fl) { return fl.id === it.id; });
        if (matchL) {
          var lDur = (matchL.sections || []).reduce(function (sum, s) { return sum + (Number(s.duration) || 0); }, 0);
          durOrPts = (lDur || matchL.targetDuration || 60) + ' min';
          if (matchL.date) itemDate = matchL.date;
          var objs = (matchL.sections || []).map(function (s) { return s.objective; }).filter(Boolean);
          itemObjSummary = objs.join(' • ');
        }
      } else {
        var matchT = (fullTests || []).find(function (ft) { return ft.id === it.id; });
        if (matchT) {
          var tPts = (matchT.exercises || []).reduce(function (sum, e) { return sum + (Number(e.points) || 0); }, 0);
          durOrPts = tPts + ' pts';
          if (matchT.date) itemDate = matchT.date;
          itemObjSummary = matchT.scope || ((matchT.exercises || []).length + ' exercises');
        }
      }

      var itemComps = extractItemCompetences(it);
      itemComps.forEach(function (cId) {
        if (!sequenceCoverageMap[cId]) {
          var compInfo = compLookup[cId] || {};
          sequenceCoverageMap[cId] = {
            code: cId,
            title: compInfo.title || compInfo.name || cId,
        var compInfo = lookupCompInfo(cId);
        var normCode = compInfo.code || cId;
        if (!sequenceCoverageMap[normCode]) {
          sequenceCoverageMap[normCode] = {
            code: normCode,
            title: compInfo.title || compInfo.name || normCode,
            description: compInfo.description || compInfo.statement || '',
            category: compInfo.category || compInfo.theme || '',
            level: compInfo.level || compInfo.tier || '',
            targets: []
          };
        }
        sequenceCoverageMap[cId].targets.push({
        sequenceCoverageMap[normCode].targets.push({
          label: itemLabel,
          title: it.title || 'Untitled',
          isTest: isTest
        });
      });

      var compChipsHtml = '';
      if (itemComps.length > 0) {
        compChipsHtml = itemComps.map(function (cId) {
          var compInfo = compLookup[cId] || {};
          var chipTitle = (compInfo.title ? (cId + ': ' + compInfo.title) : cId);
          return '<span class="comp-tag-chip' + (isTest ? ' test' : '') + '" title="' + escapeHtml(chipTitle) + '">' + escapeHtml(cId) + '</span>';
        }).join('');
      }
      tocRowsData.push({
        rowNum: rIdx,
        isTest: isTest,
        badgeClass: badgeClass,
        badgeText: badgeText,
        title: it.title || 'Untitled',
        date: itemDate,
        objectives: itemObjSummary,
        durOrPts: durOrPts,
        itemComps: itemComps
      });
    });

    if (options.includeSummary !== false) {
      html +=
        '\n    <!-- ── 2. Unit Table of Contents ── -->\n' +
        '    <div class="unit-toc">\n' +
        '      <h3 class="unit-toc-title">Sequence Structure &amp; Progression</h3>\n' +
        '      <table class="unit-toc-table">\n' +
        '        <thead>\n' +
        '          <tr>\n' +
        '            <td><strong>' + (rowIdx++) + '</strong></td>\n' +
        '            <td><span class="' + badgeClass + '">' + badgeText + '</span></td>\n' +
        '            <td>\n' +
        '              <strong>' + escapeHtml(it.title || 'Untitled') + '</strong>\n' +
        (showSubrow && compChipsHtml ? ('              <div class="toc-comp-pills">' + compChipsHtml + '</div>\n') : '') +
        '            </td>\n' +
        (showColumn ? ('            <td>' + (compChipsHtml ? ('<div class="toc-comp-pills">' + compChipsHtml + '</div>') : '<span style="color:#94a3b8;font-size:0.75rem;">—</span>') + '</td>\n') : '') +
        '            <td>' + escapeHtml(durOrPts) + '</td>\n' +
        '          </tr>\n';
    });
        '            <th style="width:40px;">#</th>\n' +
        (tocCols.showType !== false ? '            <th style="width:95px;">Type</th>\n' : '') +
        '            <th>Title / Topic</th>\n' +
        (tocCols.showDate ? '            <th style="width:95px;">Date</th>\n' : '') +
        (tocCols.showObjectives ? '            <th>Key Objectives / Scope</th>\n' : '') +
        (showColumn ? '            <th style="min-width:140px;">Competences / Standards</th>\n' : '') +
        (tocCols.showDuration !== false ? '            <th style="width:100px;">Duration/Pts</th>\n' : '') +
        '          </tr>\n' +
        '        </thead>\n' +
        '        <tbody>\n';

    html +=
      '        </tbody>\n' +
      '      </table>\n';
      tocRowsData.forEach(function (r) {
        var compChipsHtml = '';
        if (r.itemComps.length > 0) {
          compChipsHtml = r.itemComps.map(function (cId) {
            var compInfo = lookupCompInfo(cId);
            var dispCode = compInfo.code || cId;
            var chipTitle = (compInfo.title ? (dispCode + ': ' + compInfo.title) : dispCode);
            return '<span class="comp-tag-chip' + (r.isTest ? ' test' : '') + '" title="' + escapeHtml(chipTitle) + '">' + escapeHtml(dispCode) + '</span>';
          }).join('');
        }

    // Competence Coverage Summary Matrix block
    if (showMatrix) {
      var covKeys = Object.keys(sequenceCoverageMap).sort(function (a, b) {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        html +=
          '          <tr>\n' +
          '            <td><strong>' + r.rowNum + '</strong></td>\n' +
          (tocCols.showType !== false ? '            <td><span class="' + r.badgeClass + '">' + r.badgeText + '</span></td>\n' : '') +
          '            <td>\n' +
          '              <strong>' + escapeHtml(r.title) + '</strong>\n' +
          (showSubrow && compChipsHtml ? ('              <div class="toc-comp-pills">' + compChipsHtml + '</div>\n') : '') +
          '            </td>\n' +
          (tocCols.showDate ? '            <td>' + (r.date ? escapeHtml(r.date) : '<span style="color:#94a3b8;">—</span>') + '</td>\n' : '') +
          (tocCols.showObjectives ? '            <td style="font-size:0.78rem;color:#334155;">' + (r.objectives ? escapeHtml(r.objectives) : '<span style="color:#94a3b8;">—</span>') + '</td>\n' : '') +
          (showColumn ? ('            <td>' + (compChipsHtml ? ('<div class="toc-comp-pills">' + compChipsHtml + '</div>') : '<span style="color:#94a3b8;font-size:0.75rem;">—</span>') + '</td>\n') : '') +
          (tocCols.showDuration !== false ? '            <td>' + escapeHtml(r.durOrPts) + '</td>\n' : '') +
          '          </tr>\n';
      });
      if (covKeys.length > 0) {
        html +=
          '      <div class="unit-comp-matrix">\n' +
          '        <div class="unit-comp-matrix-hdr">\n' +
          '          <span class="unit-comp-matrix-title">Curriculum Competences &amp; Coverage</span>\n' +
          '          <span class="unit-comp-matrix-badge">' + covKeys.length + ' Targeted Competence' + (covKeys.length > 1 ? 's' : '') + '</span>\n' +
          '        </div>\n' +
          '        <div class="unit-comp-grid">\n';

        covKeys.forEach(function (cId) {
          var cov = sequenceCoverageMap[cId];
          var targetsHtml = cov.targets.map(function (tg) {
            return '<span style="font-weight:700;color:' + (tg.isTest ? '#9d174d' : '#1e40af') + ';">' + escapeHtml(tg.label) + '</span>';
          }).join(', ');
      html +=
        '        </tbody>\n' +
        '      </table>\n';

      // Competence Coverage Summary Matrix block
      if (showMatrix) {
        var covKeys = Object.keys(sequenceCoverageMap).sort(function (a, b) {
          return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });
        if (covKeys.length > 0) {
          html +=
            '          <div class="unit-comp-card">\n' +
            '            <div class="unit-comp-card-top">\n' +
            '              <span class="comp-tag-chip">' + escapeHtml(cov.code) + '</span>\n' +
            '              <span class="unit-comp-card-name">' + escapeHtml(cov.title) + '</span>\n' +
            '            </div>\n' +
            '            <div class="unit-comp-card-links"><strong>Addressed in:</strong> ' + targetsHtml + '</div>\n' +
            '          </div>\n';
            '      <div class="unit-comp-matrix">\n' +
            '        <div class="unit-comp-matrix-hdr">\n' +
            '          <span class="unit-comp-matrix-title">Curriculum Competences &amp; Coverage</span>\n' +
            '          <span class="unit-comp-matrix-badge">' + covKeys.length + ' Targeted Competence' + (covKeys.length > 1 ? 's' : '') + '</span>\n' +
            '        </div>\n' +
            '        <div class="unit-comp-grid">\n';

          covKeys.forEach(function (cId) {
            var cov = sequenceCoverageMap[cId];
            var targetsHtml = cov.targets.map(function (tg) {
              return '<span style="font-weight:700;color:' + (tg.isTest ? '#9d174d' : '#1e40af') + ';">' + escapeHtml(tg.label) + '</span>';
            }).join(', ');

            html +=
              '          <div class="unit-comp-card">\n' +
              '            <div class="unit-comp-card-top">\n' +
              '              <span class="comp-tag-chip">' + escapeHtml(cov.code) + '</span>\n' +
              '              <span class="unit-comp-card-name">' + escapeHtml(cov.title) + '</span>\n' +
              '            </div>\n' +
              (lessonToggles.phaseDescText && cov.description ? '            <div style="font-size:0.72rem;color:#475569;margin-bottom:4px;">' + escapeHtml(cov.description) + '</div>\n' : '') +
              '            <div class="unit-comp-card-links"><strong>Addressed in:</strong> ' + targetsHtml + '</div>\n' +
              '          </div>\n';
          });

          html +=
            '        </div>\n' +
            '      </div>\n';
        }
      }

      html += '    </div>\n';
    }

    // ── 2b. Aggregated Unit Vocabulary & Key Concepts ──
    if (options.includeVocab !== false) {
      var vocabEntries = [];
      var vocabSeen = new Set();
      function addVocabEntry(term, def, sourceLabel) {
        var cleanTerm = String(term || '').trim();
        if (!cleanTerm) return;
        var key = cleanTerm.toLowerCase();
        if (vocabSeen.has(key)) return;
        vocabSeen.add(key);
        vocabEntries.push({
          term: cleanTerm,
          def: String(def || '').trim(),
          source: sourceLabel || ''
        });
      }

      if (Array.isArray(unitSeq && unitSeq.vocabulary)) {
        unitSeq.vocabulary.forEach(function (v) {
          if (typeof v === 'string') addVocabEntry(v, '', 'Unit');
          else if (v && typeof v === 'object') addVocabEntry(v.word || v.term || v.title, v.definition || v.translation || v.desc || '', 'Unit');
        });
      }

      (fullLessons || []).forEach(function (plan, lIdx) {
        var lSrc = 'Lesson ' + (lIdx + 1);
        if (Array.isArray(plan.vocabulary)) {
          plan.vocabulary.forEach(function (v) {
            if (typeof v === 'string') addVocabEntry(v, '', lSrc);
            else if (v && typeof v === 'object') addVocabEntry(v.word || v.term, v.definition || v.translation || '', lSrc);
          });
        }
        (plan.sections || []).forEach(function (sec) {
          var texts = [sec.studentAction || '', sec.teacherAction || '', sec.resources || ''];
          texts.forEach(function (txt) {
            String(txt).split(/\r?\n/).forEach(function (line) {
              var m = line.match(/^\s*[•\-\*]\s*([^:：\n]{2,45})\s*:\s*(.+)$/);
              if (m) {
                addVocabEntry(m[1], m[2], lSrc);
              }
            });
          });
        });
      });

      (fullTests || []).forEach(function (tst, tIdx) {
        var tSrc = 'Test ' + (tIdx + 1);
        (tst.exercises || []).forEach(function (ex) {
          if (ex.type === 'matching' && ex.content && Array.isArray(ex.content.pairs)) {
            ex.content.pairs.forEach(function (pr) {
              if (pr && pr.left) addVocabEntry(pr.left, pr.right || '', tSrc);
            });
          } else if (ex.type === 'picture_description' && ex.options && ex.options.targetVocab) {
            String(ex.options.targetVocab).split(',').forEach(function (w) {
              addVocabEntry(w, 'Target vocabulary', tSrc);
            });
          } else if (ex.type === 'cloze' && ex.content) {
            var cItems = Array.isArray(ex.content.items) ? ex.content.items : (ex.content.text ? [{ text: ex.content.text }] : []);
            cItems.forEach(function (it) {
              var regex = /\[([^\]]+)\]/g;
              var m;
              while ((m = regex.exec(it.text || '')) !== null) {
                addVocabEntry(m[1], 'Key term (Cloze)', tSrc);
              }
            });
          }
        });
      });

      if (vocabEntries.length > 0) {
        html +=
          '        </div>\n' +
          '      </div>\n';
          '    <div class="unit-vocab-card">\n' +
          '      <div class="unit-card-hdr" style="margin-bottom:8px;">\n' +
          '        <h3 class="unit-toc-title" style="margin:0;border:none;padding:0;">Aggregated Unit Vocabulary &amp; Key Concepts</h3>\n' +
          '        <span class="unit-item-badge lesson">' + vocabEntries.length + ' Terms</span>\n' +
          '      </div>\n' +
          '      <div class="unit-vocab-grid">\n';
        vocabEntries.forEach(function (v) {
          html +=
            '        <div class="unit-vocab-item">\n' +
            '          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:4px;">\n' +
            '            <strong style="color:#0f172a;">' + escapeHtml(v.term) + '</strong>\n' +
            (v.source ? '            <span style="font-size:0.65rem;color:#64748b;font-weight:700;">' + escapeHtml(v.source) + '</span>\n' : '') +
            '          </div>\n' +
            (v.def ? '          <div style="font-size:0.74rem;color:#475569;margin-top:2px;">' + escapeHtml(v.def) + '</div>\n' : '') +
            '        </div>\n';
        });
        html +=
          '      </div>\n' +
          '    </div>\n';
      }
    }

    html += '    </div>\n';

    // ── 3. Full Lesson Plans in Order ──
    if (options.includePhases !== false) {
      (fullLessons || []).forEach(function (plan, lIdx) {
        var planDur = (plan.sections || []).reduce(function (sum, s) { return sum + (Number(s.duration) || 0); }, 0);
        html +=
          '    <div class="unit-lesson-card unit-page-break">\n' +
          '      <div class="unit-card-hdr">\n' +
          '        <div>\n' +
          '          <span class="unit-item-badge lesson">[LESSON ' + (lIdx + 1) + ']</span>\n' +
          '          <h2 class="unit-card-title">' + escapeHtml(plan.title || 'Lesson Plan') + '</h2>\n' +
          '        </div>\n' +
          '        <div style="font-weight:800;font-size:0.85rem;">' + (planDur || plan.targetDuration || 60) + ' min' + (plan.date ? (' • ' + escapeHtml(plan.date)) : '') + '</div>\n' +
          '      </div>\n';
        var planSub = plan.subject || plan.subjectId || subject || '';
        var planCls = plan.className || plan.classId || className || '';

        if (cssTheme === 'horizontal_table') {
        html += '    <div class="unit-lesson-card unit-page-break' + (lessonLayout === 'horizontal_table' ? ' page-orientation-landscape' : '') + '">\n';

        // A. Lesson Header & Metadata Toggles
        if (lessonToggles.metaHeader !== false || lessonToggles.metaDuration !== false || lessonToggles.metaDate !== false) {
          html += '      <div class="unit-card-hdr">\n';
          html += '        <div>\n';
          if (lessonToggles.metaSequence !== false) {
            html += '          <span class="unit-item-badge lesson">[LESSON ' + (lIdx + 1) + ' OF ' + (fullLessons || []).length + ']</span>\n';
          } else {
            html += '          <span class="unit-item-badge lesson">[LESSON ' + (lIdx + 1) + ']</span>\n';
          }
          if (lessonToggles.metaHeader !== false) {
            html += '          <h2 class="unit-card-title">' + escapeHtml(plan.title || 'Lesson Plan') + '</h2>\n';
          }
          html += '        </div>\n';
          var rightHdrBits = [];
          if (lessonToggles.metaDuration !== false) {
            rightHdrBits.push((planDur || plan.targetDuration || 60) + ' min' + (plan.targetDuration ? (' (Target: ' + plan.targetDuration + 'm)') : ''));
          }
          if (lessonToggles.metaDate !== false && plan.date) {
            rightHdrBits.push(escapeHtml(plan.date));
          }
          if (rightHdrBits.length > 0) {
            html += '        <div style="font-weight:800;font-size:0.85rem;">' + rightHdrBits.join(' • ') + '</div>\n';
          }
          html += '      </div>\n';
        }

        // Metadata chips bar (Subject, Class, Year Level, Semester, Teams, Tags)
        var metaChips = [];
        if (lessonToggles.metaHeader !== false) {
          if (planSub) metaChips.push('<span class="lesson-meta-chip"><strong>Subject:</strong> ' + escapeHtml(planSub) + '</span>');
          if (planCls) metaChips.push('<span class="lesson-meta-chip"><strong>Class:</strong> ' + escapeHtml(planCls) + '</span>');
        }
        if (lessonToggles.metaDate !== false) {
          if (plan.yearLevel && plan.yearLevel !== 'all') metaChips.push('<span class="lesson-meta-chip"><strong>Year:</strong> ' + escapeHtml(plan.yearLevel) + '</span>');
          if (plan.semester && plan.semester !== 'all') metaChips.push('<span class="lesson-meta-chip"><strong>Semester:</strong> ' + escapeHtml(String(plan.semester).toUpperCase()) + '</span>');
        }
        if (lessonToggles.metaTeams !== false && plan.teamConfig && plan.teamConfig.enabled) {
          var rolesStr = (plan.teamConfig.roles || []).map(function (r) { return r.name || r; }).filter(Boolean).join(', ');
          metaChips.push('<span class="lesson-meta-chip teams"><strong>Teams:</strong> Size ' + escapeHtml(plan.teamConfig.teamSize || 4) + (rolesStr ? (' (' + escapeHtml(rolesStr) + ')') : '') + '</span>');
        }
        if (lessonToggles.metaTags !== false && Array.isArray(plan.tags) && plan.tags.length > 0) {
          plan.tags.forEach(function (tg) {
            if (tg) metaChips.push('<span class="lesson-meta-chip tag">#' + escapeHtml(tg) + '</span>');
          });
        }
        if (metaChips.length > 0) {
          html += '      <div class="lesson-meta-bar">' + metaChips.join('') + '</div>\n';
        }

        // Helper to extract sorted competences for a phase
        function getPhaseCompetences(sec) {
          var secComps = [];
          var sSet = new Set();
          if (Array.isArray(sec.descriptorIds)) sec.descriptorIds.forEach(function (id) { if (id) sSet.add(String(id).trim()); });
          if (Array.isArray(sec.competences)) {
            sec.competences.forEach(function (c) {
              var cid = (typeof c === 'object' && c) ? (c.id || c.code || c.title) : c;
              if (cid) sSet.add(String(cid).trim());
            });
          }
          sSet.forEach(function (cid) {
            var info = lookupCompInfo(cid);
            secComps.push({
              code: info.code || cid,
              title: info.title || info.name || cid,
              description: info.description || info.statement || info.desc || ''
            });
          });
          secComps.sort(function (a, b) {
            return String(a.code || a.title).localeCompare(String(b.code || b.title), undefined, { numeric: true, sensitivity: 'base' });
          });
          return secComps;
        }

        if (lessonLayout === 'horizontal_table') {
          var customColTitles = [];
          if (lessonToggles.phaseCustomFields !== false) {
            (plan.sections || []).forEach(function (sec) {
              if (Array.isArray(sec.customFields)) {
                sec.customFields.forEach(function (cf) {
                  var t = (cf && cf.title ? String(cf.title).trim() : '');
                  if (t && customColTitles.indexOf(t) === -1) customColTitles.push(t);
                });
              }
            });
          }

          html +=
            '      <table class="landscape-lesson-table">\n' +
            '        <thead>\n' +
            '          <tr>\n' +
            '            <th style="width:75px;text-align:center;">Pacing</th>\n' +
            '            <th style="width:160px;">Phase &amp; Activity</th>\n' +
            '            <th style="width:20%;">Objectives</th>\n' +
            '            <th style="width:22%;">Teacher Actions</th>\n' +
            '            <th style="width:22%;">Student Actions</th>\n' +
            '            <th style="min-width:130px;">Competences &amp; Materials</th>\n' +
            (lessonToggles.phaseDuration !== false ? '            <th style="width:70px;text-align:center;">Pacing</th>\n' : '') +
            ((lessonToggles.phaseTitle !== false || lessonToggles.phaseActivity !== false) ? '            <th style="min-width:140px;">Phase &amp; Activity</th>\n' : '') +
            (lessonToggles.phaseObjective !== false ? '            <th>Objectives</th>\n' : '') +
            (lessonToggles.phaseTeacher !== false ? '            <th>Teacher Actions</th>\n' : '') +
            (lessonToggles.phaseStudent !== false ? '            <th>Student Tasks</th>\n' : '') +
            (lessonToggles.phaseResources !== false ? '            <th>Resources &amp; Materials</th>\n' : '') +
            (lessonToggles.phaseDescriptors !== false ? '            <th>Competences</th>\n' : '') +
            (lessonToggles.phaseDiff !== false ? '            <th>Differentiation</th>\n' : '') +
            (lessonToggles.phaseAssess !== false ? '            <th>Assessment</th>\n' : '') +
            customColTitles.map(function (ct) { return '            <th>' + escapeHtml(ct) + '</th>\n'; }).join('') +
            '          </tr>\n' +
            '        </thead>\n' +
            '        <tbody>\n';

          (plan.sections || []).forEach(function (sec, pIdx) {
            var secDur = (Number(sec.duration) || 10);
            var hasTeacher = !!(sec.teacherAction && String(sec.teacherAction).trim());
            var hasStudent = !!(sec.studentAction && String(sec.studentAction).trim());
            var secComps = getPhaseCompetences(sec);

            var secComps = [];
            var sSet = new Set();
            if (Array.isArray(sec.descriptorIds)) sec.descriptorIds.forEach(function (id) { if (id) sSet.add(String(id).trim()); });
            if (Array.isArray(sec.competences)) {
              sec.competences.forEach(function (c) {
                var cid = (typeof c === 'object' && c) ? (c.id || c.code || c.title) : c;
                if (cid) sSet.add(String(cid).trim());
              });
            }
            sSet.forEach(function (cid) {
              var info = compLookup[cid] || {};
              secComps.push({ code: cid, title: info.title || info.name || cid });
            });

            var compChips = secComps.map(function (c) {
              return '<span class="comp-tag-chip" title="' + escapeHtml(c.title ? (c.code + ': ' + c.title) : c.code) + '">' + escapeHtml(c.code) + '</span>';
              var chipHtml = '<span class="comp-tag-chip" title="' + escapeHtml(c.title ? (c.code + ': ' + c.title) : c.code) + '">' + escapeHtml(c.code) + (c.title && c.title !== c.code ? (' — ' + escapeHtml(c.title)) : '') + '</span>';
              if (lessonToggles.phaseDescText && c.description) {
                chipHtml += '<div style="font-size:0.7rem;color:#334155;margin:2px 0 4px 2px;">' + escapeHtml(c.description) + '</div>';
              }
              return chipHtml;
            }).join('');

            var actBadge = sec.activityType ? ('<span class="unit-item-badge lesson" style="font-size:0.68rem;margin-top:2px;">' + escapeHtml(sec.activityType) + '</span>') : '';
            var modeBadge = sec.interactionMode ? ('<span class="unit-item-badge" style="font-size:0.68rem;background:#f1f5f9;margin-top:2px;">' + escapeHtml(sec.interactionMode) + '</span>') : '';
            var actName = sec.activityType || resolveActivityLabel(sec.activityTypeId);
            var modeName = sec.interactionMode || resolveInteractionLabel(sec.interactionTypeId);
            var actBadge = (lessonToggles.phaseActivity !== false && actName) ? ('<span class="unit-item-badge lesson" style="font-size:0.68rem;margin-top:2px;">' + escapeHtml(actName) + '</span>') : '';
            var modeBadge = (lessonToggles.phaseActivity !== false && modeName) ? ('<span class="unit-item-badge" style="font-size:0.68rem;background:#f1f5f9;margin-top:2px;">' + escapeHtml(modeName) + '</span>') : '';

            html +=
              '          <tr>\n' +
              '            <td class="landscape-pacing">' + secDur + ' min</td>\n' +
              '            <td>\n' +
              '              <div class="landscape-phase-title">Phase ' + (pIdx + 1) + ': ' + escapeHtml(sec.title || 'Activity') + '</div>\n' +
              '              <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:2px;">' + actBadge + (actBadge && modeBadge ? ' ' : '') + modeBadge + '</div>\n' +
              '            </td>\n' +
              '            <td>' + (sec.objective ? escapeHtml(sec.objective) : '<span style="color:#94a3b8;">—</span>') + '</td>\n' +
              '            <td>' + (hasTeacher ? escapeHtml(sec.teacherAction) : '<span style="color:#94a3b8;">—</span>') + '</td>\n' +
              '            <td>' + (hasStudent ? escapeHtml(sec.studentAction) : '<span style="color:#94a3b8;">—</span>') + '</td>\n' +
              '            <td>\n' +
              (compChips ? ('              <div style="display:flex;flex-wrap:wrap;gap:2px;margin-bottom:3px;">' + compChips + '</div>\n') : '') +
              (sec.resources ? ('              <div style="font-size:0.72rem;color:#475569;"><strong>Mat:</strong> ' + escapeHtml(sec.resources) + '</div>\n') : (!compChips ? '<span style="color:#94a3b8;">—</span>\n' : '')) +
              '            </td>\n' +
              '          </tr>\n';
            html += '          <tr>\n';
            if (lessonToggles.phaseDuration !== false) {
              html += '            <td class="landscape-pacing">' + secDur + ' min</td>\n';
            }
            if (lessonToggles.phaseTitle !== false || lessonToggles.phaseActivity !== false) {
              html += '            <td>\n';
              if (lessonToggles.phaseTitle !== false) {
                html += '              <div class="landscape-phase-title">Phase ' + (pIdx + 1) + ': ' + escapeHtml(sec.title || 'Activity') + '</div>\n';
              }
              if (actBadge || modeBadge) {
                html += '              <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:2px;">' + actBadge + (actBadge && modeBadge ? ' ' : '') + modeBadge + '</div>\n';
              }
              html += '            </td>\n';
            }
            if (lessonToggles.phaseObjective !== false) {
              html += '            <td>' + (sec.objective ? escapeHtml(sec.objective).replace(/\n/g, '<br>') : '<span style="color:#94a3b8;">—</span>') + '</td>\n';
            }
            if (lessonToggles.phaseTeacher !== false) {
              html += '            <td>' + (hasTeacher ? escapeHtml(sec.teacherAction).replace(/\n/g, '<br>') : '<span style="color:#94a3b8;">—</span>') + '</td>\n';
            }
            if (lessonToggles.phaseStudent !== false) {
              html += '            <td>' + (hasStudent ? escapeHtml(sec.studentAction).replace(/\n/g, '<br>') : '<span style="color:#94a3b8;">—</span>') + '</td>\n';
            }
            if (lessonToggles.phaseResources !== false) {
              html += '            <td>' + (sec.resources ? escapeHtml(sec.resources).replace(/\n/g, '<br>') : '<span style="color:#94a3b8;">—</span>') + '</td>\n';
            }
            if (lessonToggles.phaseDescriptors !== false) {
              html += '            <td>' + (compChips ? ('<div style="display:flex;flex-wrap:wrap;gap:2px;">' + compChips + '</div>') : '<span style="color:#94a3b8;">—</span>') + '</td>\n';
            }
            if (lessonToggles.phaseDiff !== false) {
              html += '            <td>' + (sec.differentiation ? escapeHtml(sec.differentiation).replace(/\n/g, '<br>') : '<span style="color:#94a3b8;">—</span>') + '</td>\n';
            }
            if (lessonToggles.phaseAssess !== false) {
              html += '            <td>' + (sec.assessmentStrategy ? escapeHtml(sec.assessmentStrategy).replace(/\n/g, '<br>') : '<span style="color:#94a3b8;">—</span>') + '</td>\n';
            }
            if (lessonToggles.phaseCustomFields !== false) {
              customColTitles.forEach(function (ct) {
                var matchCf = Array.isArray(sec.customFields) ? sec.customFields.find(function (f) { return f && String(f.title || '').trim().toLowerCase() === ct.toLowerCase(); }) : null;
                html += '            <td>' + (matchCf && matchCf.content ? escapeHtml(matchCf.content).replace(/\n/g, '<br>') : '<span style="color:#94a3b8;">—</span>') + '</td>\n';
              });
            }
            html += '          </tr>\n';
          });

          html +=
            '        </tbody>\n' +
            '      </table>\n';
        } else {
          (plan.sections || []).forEach(function (sec, pIdx) {
            var hasTeacher = !!(sec.teacherAction && String(sec.teacherAction).trim());
            var hasStudent = !!(sec.studentAction && String(sec.studentAction).trim());
            var hasTeacher = (lessonToggles.phaseTeacher !== false) && !!(sec.teacherAction && String(sec.teacherAction).trim());
            var hasStudent = (lessonToggles.phaseStudent !== false) && !!(sec.studentAction && String(sec.studentAction).trim());
            var actName = sec.activityType || resolveActivityLabel(sec.activityTypeId);
            var modeName = sec.interactionMode || resolveInteractionLabel(sec.interactionTypeId);
            var secComps = (lessonToggles.phaseDescriptors !== false) ? getPhaseCompetences(sec) : [];

            html +=
              '      <div class="phase-row">\n' +
              '        <div class="phase-hdr">\n' +
              '          <span>Phase ' + (pIdx + 1) + ': ' + escapeHtml(sec.title || 'Activity') + '</span>\n' +
              '          <span>' + (Number(sec.duration) || 10) + ' min</span>\n' +
              '        </div>\n' +
              (sec.objective ? '        <div class="phase-obj"><strong>Objective:</strong> ' + escapeHtml(sec.objective) + '</div>\n' : '');
            html += '      <div class="phase-row">\n';
            if (lessonToggles.phaseTitle !== false || lessonToggles.phaseDuration !== false || lessonToggles.phaseActivity !== false) {
              html += '        <div class="phase-hdr" style="align-items:center;flex-wrap:wrap;gap:6px;">\n';
              html += '          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;">\n';
              if (lessonToggles.phaseTitle !== false) {
                html += '            <span>Phase ' + (pIdx + 1) + ': ' + escapeHtml(sec.title || 'Activity') + '</span>\n';
              }
              if (lessonToggles.phaseActivity !== false && actName) {
                html += '            <span class="unit-item-badge lesson" style="font-size:0.68rem;">' + escapeHtml(actName) + '</span>\n';
              }
              if (lessonToggles.phaseActivity !== false && modeName) {
                html += '            <span class="unit-item-badge" style="font-size:0.68rem;background:#f1f5f9;">' + escapeHtml(modeName) + '</span>\n';
              }
              html += '          </div>\n';
              if (lessonToggles.phaseDuration !== false) {
                html += '          <span>' + (Number(sec.duration) || 10) + ' min</span>\n';
              }
              html += '        </div>\n';
            }

            if (lessonToggles.phaseObjective !== false && sec.objective) {
              html += '        <div class="phase-obj"><strong>Objective:</strong> ' + escapeHtml(sec.objective).replace(/\n/g, '<br>') + '</div>\n';
            }

            if (hasTeacher || hasStudent) {
              html += '        <div class="phase-actions">\n';
              if (hasTeacher) {
                html += '          <div class="action-box"><span class="action-tag">Teacher Actions</span>' + escapeHtml(sec.teacherAction) + '</div>\n';
                html += '          <div class="action-box"><span class="action-tag">Teacher Actions</span>' + escapeHtml(sec.teacherAction).replace(/\n/g, '<br>') + '</div>\n';
              }
              if (hasStudent) {
                html += '          <div class="action-box"><span class="action-tag">Student Actions</span>' + escapeHtml(sec.studentAction) + '</div>\n';
                html += '          <div class="action-box"><span class="action-tag">Student Tasks</span>' + escapeHtml(sec.studentAction).replace(/\n/g, '<br>') + '</div>\n';
              }
              html += '        </div>\n';
            }

            if (sec.resources) {
              html += '        <div style="font-size:0.75rem;margin-top:4px;"><strong>Materials:</strong> ' + escapeHtml(sec.resources) + '</div>\n';
            if (lessonToggles.phaseResources !== false && sec.resources) {
              html += '        <div class="phase-subbox resources"><strong>Resources &amp; Materials:</strong> ' + escapeHtml(sec.resources).replace(/\n/g, '<br>') + '</div>\n';
            }
            if (Array.isArray(sec.customFields) && sec.customFields.length > 0) {
            if (lessonToggles.phaseDiff !== false && sec.differentiation) {
              html += '        <div class="phase-subbox diff"><strong>Differentiation &amp; Support:</strong> ' + escapeHtml(sec.differentiation).replace(/\n/g, '<br>') + '</div>\n';
            }
            if (lessonToggles.phaseAssess !== false && sec.assessmentStrategy) {
              html += '        <div class="phase-subbox assess"><strong>Formative Assessment:</strong> ' + escapeHtml(sec.assessmentStrategy).replace(/\n/g, '<br>') + '</div>\n';
            }
            if (lessonToggles.phaseCustomFields !== false && Array.isArray(sec.customFields) && sec.customFields.length > 0) {
              sec.customFields.forEach(function (cf) {
                var cfTitle = (cf && cf.title) ? String(cf.title).trim() : '';
                var cfContent = (cf && cf.content) ? String(cf.content).trim() : '';
                if (!cfTitle && !cfContent) return;
                html += '        <div style="font-size:0.75rem;margin-top:4px;"><strong>' + escapeHtml(cfTitle || 'Field') + ':</strong> ' + escapeHtml(cfContent).replace(/\n/g, '<br>') + '</div>\n';
                html += '        <div class="phase-subbox"><strong>' + escapeHtml(cfTitle || 'Custom Field') + ':</strong> ' + escapeHtml(cfContent).replace(/\n/g, '<br>') + '</div>\n';
              });
            }
            if (lessonToggles.phaseDescriptors !== false && secComps.length > 0) {
              html += '        <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;align-items:center;">\n';
              secComps.forEach(function (c) {
                html += '          <span class="comp-tag-chip" title="' + escapeHtml(c.title || c.code) + '">' + escapeHtml(c.code) + (c.title && c.title !== c.code ? (' — ' + escapeHtml(c.title)) : '') + '</span>\n';
                if (lessonToggles.phaseDescText && c.description) {
                  html += '          <div style="width:100%;font-size:0.74rem;color:#334155;padding-left:6px;border-left:2px solid #eab308;margin-bottom:3px;">' + escapeHtml(c.description) + '</div>\n';
                }
              });
              html += '        </div>\n';
            }
            html += '      </div>\n';
          });
        }

        html += '    </div>\n';
      });
    }

    // ── 4. Attached Tests in Sequence ──
    if (options.includeTests !== false) {
      (fullTests || []).forEach(function (test, tIdx) {
        var tPts = (test.exercises || []).reduce(function (sum, e) { return sum + (Number(e.points) || 0); }, 0);
        var hasSectionComps = (test.exercises || []).some(function (e) { return e && e.type === 'section_competences'; });
        var hasSectionCrits = (test.exercises || []).some(function (e) { return e && e.type === 'section_criteria'; });
        var hasSectionScale = (test.exercises || []).some(function (e) { return e && e.type === 'section_grading_scale'; });
      var variantsToRender = (testVariant === 'both') ? ['A', 'B'] : [testVariant === 'B' ? 'B' : 'A'];

        html +=
          '    <div class="unit-exam-card unit-page-break">\n' +
          '      <div class="unit-card-hdr">\n' +
          '        <div>\n' +
          '          <span class="unit-item-badge test">[ASSESSMENT / EXAM]</span>\n' +
          '          <h2 class="unit-card-title">' + escapeHtml(test.title || 'Unit Examination') + '</h2>\n' +
          '        </div>\n' +
          '        <div style="font-weight:800;font-size:0.85rem;color:#9d174d;">' + tPts + ' pts • ' + (test.duration || 45) + ' min</div>\n' +
          '      </div>\n';
      (fullTests || []).forEach(function (origTest) {
        variantsToRender.forEach(function (activeVar) {
          var test = JSON.parse(JSON.stringify(origTest));
          if (activeVar === 'B' && typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.generateVariant === 'function') {
            test = TestCreatorService.generateVariant(test, 'B');
          } else {
            test.variant = activeVar;
          }

        // 4a. Test-Wide Competences (if not placed as an in-flow section block)
        if (!hasSectionComps && testCompetencesMode !== 'none') {
          var testWideComps = (Array.isArray(test.linkedCompetences) && test.linkedCompetences.length)
          // Enrich test-level linkedCompetences with full objects from compLookup
          var rawTestComps = (Array.isArray(test.linkedCompetences) && test.linkedCompetences.length)
            ? test.linkedCompetences
            : (Array.isArray(test.linkedCompetenceIds) ? test.linkedCompetenceIds : []);
          if (testWideComps.length > 0) {
            testWideComps = testWideComps.slice().sort(function (a, b) {
              var ca = (a && (a.code || a.id)) || String(a || '');
              var cb = (b && (b.code || b.id)) || String(b || '');
              return ca.localeCompare(cb, undefined, { numeric: true, sensitivity: 'base' });
          if (!rawTestComps.length && Array.isArray(test.descriptorIds)) {
            rawTestComps = test.descriptorIds.slice();
          }
          if (rawTestComps.length > 0) {
            test.linkedCompetences = rawTestComps.map(function (c) {
              if (c && typeof c === 'object' && (c.description || c.descriptors)) return c;
              var cId = (c && typeof c === 'object') ? (c.code || c.id || c.title) : String(c || '').trim();
              var info = lookupCompInfo(cId);
              return {
                id: info.id || cId,
                code: info.code || cId,
                title: (c && c.title) || info.title || info.name || cId,
                description: (c && c.description) || info.description || info.statement || info.desc || '',
                level: (c && c.level) || info.level || info.tier || '',
                domain: (c && c.domain) || info.category || info.domain || ''
              };
            });
            if (typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.renderCompetencesHtml === 'function') {
              var tcSt = (test.headerConfig && test.headerConfig.competencesStyle) || {};
              html += '      <div style="margin-bottom:12px;">' + TestCreatorService.renderCompetencesHtml(test, {
                displayMode: tcSt.displayMode || (testCompetencesMode === 'detailed' ? 'table' : 'badges'),
                title: tcSt.title || 'Competences & Curriculum Objectives',
                showDescriptions: tcSt.showDescriptions !== false,
                showCodeCol: tcSt.showCodeCol !== false,
                showTitleCol: tcSt.showTitleCol !== false,
                showLevelCol: tcSt.showLevelCol !== false,
                showScoreCol: !!tcSt.showScoreCol,
                showCommentsCol: !!tcSt.showCommentsCol,
                background: tcSt.background || 'default',
                border: tcSt.border || 'solid',
                padding: tcSt.padding || 'standard',
                separatePage: !!tcSt.separatePage,
                pageOrientation: tcSt.pageOrientation || 'portrait'
              }) + '</div>\n';
            } else {
              html += '      <div class="test-comp-section" style="margin-bottom:12px;">\n';
              html += '        <span class="test-comp-label">Test-Wide Competences:</span>\n';
              html += '        <div class="test-comp-chips">\n';
              testWideComps.forEach(function (c) {
                var cTitle = (c && c.title) || (c && c.code) || c;
                html += '          <span class="comp-tag-chip test">' + escapeHtml(String(cTitle)) + '</span>\n';
              });
              html += '        </div>\n';
              html += '      </div>\n';
            }
          }
        }

        // 4b. Test-Wide Assessment Criteria (if not placed as an in-flow section block)
        if (!hasSectionCrits && testCriteriaMode !== 'none') {
          var testWideCrits = (Array.isArray(test.criteria) && test.criteria.length)
            ? test.criteria
            : (Array.isArray(test.linkedCriteria) ? test.linkedCriteria : []);
          if (testWideCrits.length > 0) {
            if (typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.renderCriteriaHtml === 'function') {
              var tcrSt = (test.headerConfig && test.headerConfig.criteriaStyle) || {};
              html += '      <div style="margin-bottom:12px;">' + TestCreatorService.renderCriteriaHtml(test, {
                displayMode: tcrSt.displayMode || (testCriteriaMode === 'detailed' ? 'matrix' : 'compact'),
                title: tcrSt.title || 'Assessment Criteria & Evaluation Rubric',
                showDescriptions: tcrSt.showDescriptions !== false,
                showCriterionCol: tcrSt.showCriterionCol !== false,
                showLevelsCol: tcrSt.showLevelsCol !== false,
                showMaxCol: tcrSt.showMaxCol !== false,
                showScoreCol: tcrSt.showScoreCol !== false,
                showCommentsCol: tcrSt.showCommentsCol !== false,
                background: tcrSt.background || 'default',
                border: tcrSt.border || 'solid',
                padding: tcrSt.padding || 'standard',
                separatePage: !!tcrSt.separatePage,
                pageOrientation: tcrSt.pageOrientation || 'portrait'
              }) + '</div>\n';
            } else {
              html += '      <div class="test-criteria-section" style="margin-bottom:12px;">\n';
              html += '        <span class="test-criteria-label">Test Assessment Criteria:</span>\n';
              html += '        <table class="test-criteria-table">\n';
              html += '          <thead><tr><th>Criterion</th><th style="width:60px;text-align:center;">Max</th><th style="width:60px;text-align:center;">Weight</th></tr></thead>\n';
              html += '          <tbody>\n';
              testWideCrits.forEach(function (cr) {
                var crTitle = (cr && (cr.title || cr.name)) || 'Criterion';
                var crMax = (cr && (cr.maxPoints || cr.points)) || 1;
                var crWeight = (cr && cr.weight) || 1;
                html += '            <tr><td><strong>' + escapeHtml(crTitle) + '</strong></td><td style="text-align:center;">/' + crMax + '</td><td style="text-align:center;">' + crWeight + 'x</td></tr>\n';
              });
              html += '          </tbody>\n';
              html += '        </table>\n';
              html += '      </div>\n';
            }
          var tPts = (typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.calculateTotalTestPoints === 'function')
            ? TestCreatorService.calculateTotalTestPoints(test)
            : (test.exercises || []).reduce(function (sum, e) { return sum + (Number(e.points) || 0); }, 0);

          // Apply header & layout overrides to cloned test
          if (typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.ensureHeaderConfig === 'function') {
            TestCreatorService.ensureHeaderConfig(test);
          } else if (!test.headerConfig) {
            test.headerConfig = {};
          }
        }
          var hc = test.headerConfig;
          hc.showStudentName = testHeaderToggles.showStudentName !== false;
          hc.showClass = testHeaderToggles.showClass !== false;
          hc.showDate = testHeaderToggles.showDate !== false;
          hc.showTeacher = testHeaderToggles.showTeacher !== false;
          hc.showDuration = testHeaderToggles.showDuration !== false;
          hc.showTotalPoints = testHeaderToggles.showTotalPoints !== false;
          hc.showMaterials = testHeaderToggles.showMaterials !== false;
          hc.showScope = testHeaderToggles.showScope !== false;
          hc.showInstructions = testHeaderToggles.showInstructions !== false;
          if (testVariant === 'both' || testVariant === 'B') {
            hc.showVariantBadge = true;
          }

        // 4c. Test Grading Scale & Conversion (if not placed as an in-flow section block)
        if (!hasSectionScale && includeGradingScale && (test.scaleModel || test.scaleModelId) && test.scaleModelId !== 'none') {
          if (typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.renderGradingScaleHtml === 'function') {
            html += '      <div style="margin-bottom:12px;">' + TestCreatorService.renderGradingScaleHtml(test, { totalPoints: tPts }) + '</div>\n';
          // Grading Scale config
          hc.showGradingScale = includeGradingScale;
          if (!hc.gradingScaleStyle) hc.gradingScaleStyle = {};
          if (testScaleDisplayMode && testScaleDisplayMode !== 'use_test') {
            hc.gradingScaleStyle.displayMode = testScaleDisplayMode;
          }
        }

        // 4d. Exercises and In-flow Section Blocks
        var questionCounter = 0;
        (test.exercises || []).forEach(function (ex, eIdx) {
          if (ex.type === 'section_competences') {
            var blockComps = (Array.isArray(ex.linkedCompetences) && ex.linkedCompetences.length)
              ? ex.linkedCompetences
              : (Array.isArray(ex.linkedCompetenceIds) && ex.linkedCompetenceIds.length ? ex.linkedCompetenceIds : []);
            var cContext = blockComps.length ? { linkedCompetences: blockComps, exercises: [] } : test;
            if (typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.renderCompetencesHtml === 'function') {
              var cpOpts = ex.options || {};
              html += '      <div style="margin-bottom:12px;">' + TestCreatorService.renderCompetencesHtml(cContext, {
                title: cpOpts.title || ex.title || 'Competences & Curriculum Objectives',
                displayMode: cpOpts.displayMode || 'table',
                showDescriptions: cpOpts.showDescriptions !== false,
                showCodeCol: cpOpts.showCodeCol !== false,
                showTitleCol: cpOpts.showTitleCol !== false,
                showLevelCol: cpOpts.showLevelCol !== false,
                showScoreCol: !!cpOpts.showScoreCol,
                showCommentsCol: !!cpOpts.showCommentsCol,
                background: cpOpts.background || 'default',
                border: cpOpts.border || 'solid',
                padding: cpOpts.padding || 'standard',
                separatePage: !!cpOpts.separatePage,
                pageOrientation: cpOpts.pageOrientation || 'portrait',
                includeExerciseCompetences: blockComps.length === 0
              }) + '</div>\n';
            } else {
              var sComps = (Array.isArray(cContext.linkedCompetences) && cContext.linkedCompetences.length) ? cContext.linkedCompetences : (Array.isArray(cContext.linkedCompetenceIds) ? cContext.linkedCompetenceIds : []);
              sComps = sComps.slice().sort(function (a, b) {
                var ca = (a && (a.code || a.id)) || String(a || '');
                var cb = (b && (b.code || b.id)) || String(b || '');
                return ca.localeCompare(cb, undefined, { numeric: true, sensitivity: 'base' });
              });
              html += '      <div class="test-comp-section" style="margin-bottom:14px;border:1.5px solid #2563eb;border-radius:4px;padding:10px;background:#eff6ff;">\n';
              html += '        <div style="font-weight:900;font-size:0.88rem;color:#1e40af;margin-bottom:6px;text-transform:uppercase;">' + escapeHtml(ex.title || 'Competences & Curriculum Objectives') + '</div>\n';
              if (ex.instructions) html += '        <div style="font-size:0.8rem;color:#3b82f6;margin-bottom:6px;font-style:italic;">' + escapeHtml(ex.instructions) + '</div>\n';
              html += '        <div class="test-comp-chips">\n';
              sComps.forEach(function (c) {
                var cTitle = (c && c.title) || (c && c.code) || c;
                html += '          <span class="comp-tag-chip test">' + escapeHtml(String(cTitle)) + '</span>\n';
              });
              html += '        </div>\n      </div>\n';
            }
            return;
          // Competences style & columns config
          if (!hc.competencesStyle) hc.competencesStyle = {};
          var resolvedCompDisplayMode = hc.competencesStyle.displayMode || 'table';
          if (testCompetencesMode !== 'use_test') {
            if (testCompetencesMode === 'compact' || testCompetencesMode === 'badges') resolvedCompDisplayMode = 'badges';
            else if (testCompetencesMode === 'detailed' || testCompetencesMode === 'table') resolvedCompDisplayMode = 'table';
            else if (testCompetencesMode === 'list') resolvedCompDisplayMode = 'list';
          }
          if (ex.type === 'section_criteria') {
            var blockCrits = (Array.isArray(ex.criteria) && ex.criteria.length)
              ? ex.criteria
              : ((Array.isArray(ex.markingRubric) && ex.markingRubric.length) ? ex.markingRubric : ((Array.isArray(ex.linkedCriteria) && ex.linkedCriteria.length) ? ex.linkedCriteria : []));
            var crContext = blockCrits.length ? { criteria: blockCrits, exercises: [] } : test;
            var crOpts = ex.options || {};
            if (typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.renderCriteriaHtml === 'function') {
              html += '      <div style="margin-bottom:12px;">' + TestCreatorService.renderCriteriaHtml(crContext, {
                title: crOpts.rubricTitle || ex.title || 'Assessment Criteria & Evaluation Rubric',
                displayMode: crOpts.displayMode || crOpts.rubricDisplayMode || 'matrix',
                showDescriptions: crOpts.showDescriptions !== undefined ? crOpts.showDescriptions : (crOpts.showRubricDescriptions !== false),
                showCriterionCol: crOpts.showCriterionCol !== false,
                showLevelsCol: crOpts.showLevelsCol !== false,
                showMaxCol: crOpts.showMaxCol !== false,
                showScoreCol: crOpts.showScoreCol !== false,
                showCommentsCol: crOpts.showCommentsCol !== false,
                background: crOpts.background || crOpts.rubricBg || 'default',
                border: crOpts.border || crOpts.rubricBorder || 'solid',
                padding: crOpts.padding || crOpts.rubricPadding || 'standard',
                separatePage: crOpts.separatePage !== undefined ? !!crOpts.separatePage : !!crOpts.rubricSeparatePage,
                pageOrientation: crOpts.pageOrientation || crOpts.rubricPageOrientation || 'portrait',
                includeExerciseCriteria: blockCrits.length === 0
              }) + '</div>\n';
            } else {
              var sCrits = (Array.isArray(crContext.criteria) && crContext.criteria.length) ? crContext.criteria : (Array.isArray(crContext.linkedCriteria) ? crContext.linkedCriteria : []);
              html += '      <div class="test-criteria-section" style="margin-bottom:14px;border:1.5px solid #059669;border-radius:4px;padding:10px;background:#ecfdf5;">\n';
              html += '        <div style="font-weight:900;font-size:0.88rem;color:#065f46;margin-bottom:6px;text-transform:uppercase;">' + escapeHtml(ex.title || 'Assessment Criteria & Evaluation Rubric') + '</div>\n';
              if (ex.instructions) html += '        <div style="font-size:0.8rem;color:#059669;margin-bottom:6px;font-style:italic;">' + escapeHtml(ex.instructions) + '</div>\n';
              html += '        <table class="test-criteria-table">\n          <thead><tr><th>Criterion</th><th style="width:60px;text-align:center;">Max</th><th style="width:60px;text-align:center;">Weight</th></tr></thead>\n          <tbody>\n';
              sCrits.forEach(function (cr) {
                var crTitle = (cr && (cr.title || cr.name)) || 'Criterion';
                var crMax = (cr && (cr.maxPoints || cr.points)) || 1;
                var crWeight = (cr && cr.weight) || 1;
                html += '            <tr><td><strong>' + escapeHtml(crTitle) + '</strong></td><td style="text-align:center;">/' + crMax + '</td><td style="text-align:center;">' + crWeight + 'x</td></tr>\n';
              });
              html += '          </tbody>\n        </table>\n      </div>\n';
            }
            return;
          hc.competencesStyle = Object.assign({}, hc.competencesStyle, {
            displayMode: resolvedCompDisplayMode,
            showCodeCol: testCompCols.showCodeCol !== false,
            showTitleCol: testCompCols.showTitleCol !== false,
            showDescriptions: testCompCols.showDescriptions !== false,
            showLevelCol: testCompCols.showLevelCol !== false,
            showScoreCol: !!testCompCols.showScoreCol,
            showCommentsCol: !!testCompCols.showCommentsCol,
            separatePage: !!testCompCols.separatePage,
            pageOrientation: testCompCols.pageOrientation || 'portrait'
          });
          // In full_exam mode, let renderHeaderHtml or explicit block handle test competences
          hc.showCompetences = false;

          // Criteria style & columns config
          if (!hc.criteriaStyle) hc.criteriaStyle = {};
          var resolvedCritDisplayMode = hc.criteriaStyle.displayMode || 'matrix';
          if (testCriteriaMode !== 'use_test') {
            if (testCriteriaMode === 'detailed' || testCriteriaMode === 'matrix') resolvedCritDisplayMode = 'matrix';
            else if (testCriteriaMode === 'table') resolvedCritDisplayMode = 'table';
            else if (testCriteriaMode === 'compact') resolvedCritDisplayMode = 'compact';
            else if (testCriteriaMode === 'badges') resolvedCritDisplayMode = 'badges';
            else if (testCriteriaMode === 'list') resolvedCritDisplayMode = 'list';
          }
          if (ex.type === 'section_grading_scale') {
            if (typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.renderGradingScaleHtml === 'function') {
              html += '      <div style="margin-bottom:12px;">' + TestCreatorService.renderGradingScaleHtml(test, { title: ex.title || 'Grading Scale & Score Conversion', totalPoints: tPts }) + '</div>\n';
            } else {
              var sModel = test.scaleModel;
              html += '      <div style="margin-bottom:14px;border:1.5px solid #d97706;border-radius:4px;padding:10px;background:#fffbeb;">\n';
              html += '        <div style="font-weight:900;font-size:0.88rem;color:#92400e;margin-bottom:6px;text-transform:uppercase;">' + escapeHtml(ex.title || 'Grading Scale & Score Conversion') + '</div>\n';
              if (ex.instructions) html += '        <div style="font-size:0.8rem;color:#b45309;margin-bottom:6px;font-style:italic;">' + escapeHtml(ex.instructions) + '</div>\n';
              if (sModel && Array.isArray(sModel.intervals) && sModel.intervals.length > 0) {
                html += '        <div style="display:flex;flex-wrap:wrap;gap:6px;">\n';
                sModel.intervals.forEach(function (it) {
                  html += '          <span style="background:#fff;border:1px solid #d97706;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:800;color:#92400e;"><strong>' + escapeHtml(it.grade) + '</strong>: ' + (it.minPoints != null ? (it.minPoints + '–' + it.maxPoints + ' pts') : (it.pct + '%')) + '</span>\n';
                });
                html += '        </div>\n';
              }
              html += '      </div>\n';
            }
            return;
          hc.criteriaStyle = Object.assign({}, hc.criteriaStyle, {
            displayMode: resolvedCritDisplayMode,
            showCriterionCol: testCritCols.showCriterionCol !== false,
            showLevelsCol: testCritCols.showLevelsCol !== false,
            showDescriptions: testCritCols.showDescriptions !== false,
            showMaxCol: testCritCols.showMaxCol !== false,
            showScoreCol: testCritCols.showScoreCol !== false,
            showCommentsCol: testCritCols.showCommentsCol !== false,
            separatePage: !!testCritCols.separatePage,
            pageOrientation: testCritCols.pageOrientation || 'portrait'
          });
          hc.showCriteria = false;

          // Global exportStyle overrides (e.g. numberedLines)
          if (!test.exportStyle) test.exportStyle = {};
          if (testNumberedLines === 'true' || testNumberedLines === true) {
            test.exportStyle.numberedLines = true;
          } else if (testNumberedLines === 'false' || testNumberedLines === false) {
            test.exportStyle.numberedLines = false;
          }

          questionCounter++;
          var hasSectionComps = (test.exercises || []).some(function (e) { return e && e.type === 'section_competences'; });
          var hasSectionCrits = (test.exercises || []).some(function (e) { return e && e.type === 'section_criteria'; });
          var hasSectionScale = (test.exercises || []).some(function (e) { return e && e.type === 'section_grading_scale'; });

          html +=
            '      <div class="ex-item-card">\n' +
            '        <div style="display:flex;justify-content:space-between;font-weight:800;font-size:0.9rem;border-bottom:1.5px solid #000;padding-bottom:4px;margin-bottom:6px;">\n' +
            '          <span>Exercise ' + questionCounter + ': ' + escapeHtml(ex.title || (ex.type ? ex.type.toUpperCase() : 'Task')) + '</span>\n' +
            '          <span>/' + (ex.points || 1) + ' pts</span>\n' +
            '    <div class="unit-exam-card unit-page-break">\n' +
            '      <div class="unit-card-hdr">\n' +
            '        <div>\n' +
            '          <span class="unit-item-badge test">[ASSESSMENT / EXAM' + (testVariant === 'both' || activeVar === 'B' ? (' — GROUP ' + activeVar) : '') + (includeAnswerKeys ? ' — TEACHER KEY' : '') + ']</span>\n' +
            '          <h2 class="unit-card-title">' + escapeHtml(test.title || 'Unit Examination') + '</h2>\n' +
            '        </div>\n' +
            (ex.instructions ? '        <div style="font-size:0.85rem;font-style:italic;margin-bottom:6px;">' + escapeHtml(ex.instructions) + '</div>\n' : '');
            '        <div style="font-weight:800;font-size:0.85rem;color:#9d174d;">' + tPts + ' pts • ' + (test.durationMinutes || test.duration || 45) + ' min</div>\n' +
            '      </div>\n';

          if (ex.type === 'cloze' && ex.content && ex.content.text) {
            html += '        <div style="font-size:0.85rem;white-space:pre-line;line-height:1.6;">' + escapeHtml(ex.content.text) + '</div>\n';
          } else if (ex.type === 'matching' && ex.content && Array.isArray(ex.content.pairs)) {
            html += '        <ul style="font-size:0.85rem;margin:4px 0;padding-left:20px;">' +
              ex.content.pairs.map(function (p) { return '<li>' + escapeHtml(p.left) + ' → ' + escapeHtml(p.right) + '</li>'; }).join('') +
              '</ul>\n';
          } else if (ex.type === 'open_question' && ex.content && Array.isArray(ex.content.questions)) {
            html += '        <ol style="font-size:0.85rem;margin:4px 0;padding-left:20px;">' +
              ex.content.questions.map(function (q) { return '<li>' + escapeHtml(q.prompt) + ' (' + (q.points || 1) + ' pts)</li>'; }).join('') +
              '</ol>\n';
          } else if (ex.type === 'composition' && ex.content && Array.isArray(ex.content.prompts)) {
            html += '        <ul style="font-size:0.85rem;margin:4px 0;padding-left:20px;">' +
              ex.content.prompts.map(function (p) { return '<li>' + escapeHtml(p.title || p.text || p) + '</li>'; }).join('') +
              '</ul>\n';
          } else if ((ex.type === 'mcq' || ex.type === 'qcm') && ex.content && Array.isArray(ex.content.questions)) {
            html += '        <ol style="font-size:0.85rem;margin:4px 0;padding-left:20px;">' +
              ex.content.questions.map(function (q) {
                var opts = Array.isArray(q.options) ? q.options.map(function(o){ return '<span style="margin-right:12px;">◻ ' + escapeHtml(o.text || o) + '</span>'; }).join('') : '';
                return '<li style="margin-bottom:6px;"><div>' + escapeHtml(q.prompt || q.text || '') + '</div><div style="margin-top:2px;">' + opts + '</div></li>';
              }).join('') +
              '</ol>\n';
          } else if (ex.type === 'transformation' && ex.content && Array.isArray(ex.content.items)) {
            html += '        <ol style="font-size:0.85rem;margin:4px 0;padding-left:20px;">' +
              ex.content.items.map(function (it) { return '<li style="margin-bottom:4px;"><div>' + escapeHtml(it.sentence || it.text || '') + '</div><div style="font-style:italic;color:#64748b;">→ ' + escapeHtml(it.prompt || '') + '</div></li>'; }).join('') +
              '</ol>\n';
          } else if (ex.type === 'translation' && ex.content && Array.isArray(ex.content.sentences)) {
            html += '        <ol style="font-size:0.85rem;margin:4px 0;padding-left:20px;">' +
              ex.content.sentences.map(function (s) { return '<li style="margin-bottom:4px;">' + escapeHtml(s.source || s.text || s) + '</li>'; }).join('') +
              '</ol>\n';
          } else if (ex.type === 'picture_description' && ex.content) {
            html += '        <div style="font-size:0.85rem;margin:4px 0;">' +
              (ex.content.prompt ? '<div>' + escapeHtml(ex.content.prompt) + '</div>' : '') +
              (ex.content.guidingQuestions ? '<ul style="padding-left:20px;margin-top:4px;">' + ex.content.guidingQuestions.map(function (g) { return '<li>' + escapeHtml(g) + '</li>'; }).join('') + '</ul>' : '') +
              '</div>\n';
          } else if (ex.type === 'odd_one_out' && ex.content && Array.isArray(ex.content.items)) {
            html += '        <ol style="font-size:0.85rem;margin:4px 0;padding-left:20px;">' +
              ex.content.items.map(function (it) {
                var wList = Array.isArray(it.words) ? it.words.join(' • ') : (it.words || '');
                return '<li style="margin-bottom:4px;">' + escapeHtml(wList) + '</li>';
              }).join('') +
              '</ol>\n';
          } else if (ex.type === 'reading_comprehension' && ex.content) {
            html += '        <div style="font-size:0.85rem;line-height:1.6;background:#f8fafc;padding:8px 10px;border-left:3px solid #3b82f6;margin-bottom:8px;">' +
              escapeHtml(ex.content.text || ex.content.passage || '') +
              '</div>\n';
            if (Array.isArray(ex.content.subQuestions) && ex.content.subQuestions.length > 0) {
              html += '        <ol style="font-size:0.85rem;margin:4px 0;padding-left:20px;">' +
                ex.content.subQuestions.map(function (sq) { return '<li style="margin-bottom:4px;">' + escapeHtml(sq.prompt || sq.text || '') + ' (' + (sq.points || 1) + ' pts)</li>'; }).join('') +
                '</ol>\n';
          // Full Exam Header Box (when enabled and TestCreatorService is loaded)
          var renderedScaleInHeader = false;
          if (testHeaderToggles.showHeader !== false && typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.renderHeaderHtml === 'function') {
            html += TestCreatorService.renderHeaderHtml(test, includeAnswerKeys, activeVar, '', test.className || className || '', tPts) + '\n';
            renderedScaleInHeader = (includeGradingScale && !hasSectionScale);
          }

          // 4a. Test-Wide Competences (if not placed as an in-flow section block)
          if (!hasSectionComps && testCompetencesMode !== 'none') {
            var testWideComps = (Array.isArray(test.linkedCompetences) && test.linkedCompetences.length)
              ? test.linkedCompetences
              : (Array.isArray(test.linkedCompetenceIds) ? test.linkedCompetenceIds : []);
            if (testWideComps.length > 0) {
              if (typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.renderCompetencesHtml === 'function') {
                html += '      <div style="margin-bottom:12px;">' + TestCreatorService.renderCompetencesHtml(test, {
                  displayMode: hc.competencesStyle.displayMode,
                  title: hc.competencesStyle.title || 'Competences & Curriculum Objectives',
                  showDescriptions: hc.competencesStyle.showDescriptions,
                  showCodeCol: hc.competencesStyle.showCodeCol,
                  showTitleCol: hc.competencesStyle.showTitleCol,
                  showLevelCol: hc.competencesStyle.showLevelCol,
                  showScoreCol: hc.competencesStyle.showScoreCol,
                  showCommentsCol: hc.competencesStyle.showCommentsCol,
                  background: hc.competencesStyle.background || 'default',
                  border: hc.competencesStyle.border || 'solid',
                  padding: hc.competencesStyle.padding || 'standard',
                  separatePage: hc.competencesStyle.separatePage,
                  pageOrientation: hc.competencesStyle.pageOrientation
                }) + '</div>\n';
              } else {
                html += '      <div class="test-comp-section" style="margin-bottom:12px;">\n';
                html += '        <span class="test-comp-label">Test-Wide Competences:</span>\n';
                html += '        <div class="test-comp-chips">\n';
                testWideComps.forEach(function (c) {
                  var cTitle = (c && c.title) || (c && c.code) || c;
                  html += '          <span class="comp-tag-chip test">' + escapeHtml(String(cTitle)) + '</span>\n';
                });
                html += '        </div>\n      </div>\n';
              }
            }
          }

          // Optional Teacher Solution Key
          if (includeAnswerKeys && ex.solution) {
            html += '        <div style="margin-top:6px;padding:6px 8px;background:#fef3c7;border:1px dashed #d97706;border-radius:4px;font-size:0.8rem;color:#92400e;"><strong>Teacher Solution Key:</strong> ' + escapeHtml(typeof ex.solution === 'string' ? ex.solution : JSON.stringify(ex.solution)) + '</div>\n';
          // 4b. Test-Wide Assessment Criteria (if not placed as an in-flow section block)
          if (!hasSectionCrits && testCriteriaMode !== 'none') {
            var testWideCrits = (Array.isArray(test.criteria) && test.criteria.length)
              ? test.criteria
              : (Array.isArray(test.linkedCriteria) ? test.linkedCriteria : []);
            if (testWideCrits.length > 0) {
              if (typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.renderCriteriaHtml === 'function') {
                html += '      <div style="margin-bottom:12px;">' + TestCreatorService.renderCriteriaHtml(test, {
                  displayMode: hc.criteriaStyle.displayMode,
                  title: hc.criteriaStyle.title || 'Assessment Criteria & Evaluation Rubric',
                  showDescriptions: hc.criteriaStyle.showDescriptions,
                  showCriterionCol: hc.criteriaStyle.showCriterionCol,
                  showLevelsCol: hc.criteriaStyle.showLevelsCol,
                  showMaxCol: hc.criteriaStyle.showMaxCol,
                  showScoreCol: hc.criteriaStyle.showScoreCol,
                  showCommentsCol: hc.criteriaStyle.showCommentsCol,
                  background: hc.criteriaStyle.background || 'default',
                  border: hc.criteriaStyle.border || 'solid',
                  padding: hc.criteriaStyle.padding || 'standard',
                  separatePage: hc.criteriaStyle.separatePage,
                  pageOrientation: hc.criteriaStyle.pageOrientation
                }) + '</div>\n';
              } else {
                html += '      <div class="test-criteria-section" style="margin-bottom:12px;">\n';
                html += '        <span class="test-criteria-label">Test Assessment Criteria:</span>\n';
                html += '        <table class="test-criteria-table">\n';
                html += '          <thead><tr><th>Criterion</th><th style="width:60px;text-align:center;">Max</th><th style="width:60px;text-align:center;">Weight</th></tr></thead>\n';
                html += '          <tbody>\n';
                testWideCrits.forEach(function (cr) {
                  var crTitle = (cr && (cr.title || cr.name)) || 'Criterion';
                  var crMax = (cr && (cr.maxPoints || cr.points)) || 1;
                  var crWeight = (cr && cr.weight) || 1;
                  html += '            <tr><td><strong>' + escapeHtml(crTitle) + '</strong></td><td style="text-align:center;">/' + crMax + '</td><td style="text-align:center;">' + crWeight + 'x</td></tr>\n';
                });
                html += '          </tbody>\n        </table>\n      </div>\n';
              }
            }
          }

          // Exercise Competences Rendering
          if (testCompetencesMode !== 'none') {
            var exComps = [];
            var cSet = new Set();
            if (Array.isArray(ex.descriptorIds)) ex.descriptorIds.forEach(function (id) { if (id) cSet.add(String(id).trim()); });
            if (Array.isArray(ex.linkedCompetenceIds)) ex.linkedCompetenceIds.forEach(function (id) { if (id) cSet.add(String(id).trim()); });
            if (Array.isArray(ex.linkedCompetences)) {
              ex.linkedCompetences.forEach(function (c) {
                var cid = (typeof c === 'object' && c) ? (c.id || c.code || c.title) : c;
                if (cid) cSet.add(String(cid).trim());
              });
          // 4c. Test Grading Scale & Conversion (if not already rendered in header or as an in-flow section block)
          if (!renderedScaleInHeader && !hasSectionScale && includeGradingScale && (test.scaleModel || test.scaleModelId) && test.scaleModelId !== 'none') {
            if (typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.renderGradingScaleHtml === 'function') {
              html += '      <div style="margin-bottom:12px;">' + TestCreatorService.renderGradingScaleHtml(test, {
                totalPoints: tPts,
                displayMode: hc.gradingScaleStyle.displayMode
              }) + '</div>\n';
            }
            if (Array.isArray(ex.competenceIds)) ex.competenceIds.forEach(function (id) { if (id) cSet.add(String(id).trim()); });
            if (Array.isArray(ex.competences)) {
              ex.competences.forEach(function (c) {
                var cid = (typeof c === 'object' && c) ? (c.id || c.code || c.title) : c;
                if (cid) cSet.add(String(cid).trim());
              });
            }
            cSet.forEach(function (cid) {
              var info = compLookup[cid] || {};
              exComps.push({
                code: cid,
                title: info.title || info.name || cid,
                description: info.description || info.desc || '',
                category: info.category || info.theme || '',
                level: info.level || info.tier || ''
              });
            });
          }

            exComps.sort(function (a, b) {
              return String(a.code || a.title).localeCompare(String(b.code || b.title), undefined, { numeric: true, sensitivity: 'base' });
            });
          // 4d. Exercises and In-flow Section Blocks
          var questionCounter = 0;
          var exList = test.exercises || [];
          exList.forEach(function (ex, eIdx) {
            var isSecBlock = (ex.type === 'section_competences' || ex.type === 'section_criteria' || ex.type === 'section_grading_scale' || ex.type === 'section_custom' || ex.type === 'custom_block');
            if (!isSecBlock) questionCounter++;

            if (exComps.length > 0) {
              if (testCompetencesMode === 'compact') {
                html += '        <div class="test-comp-section">\n';
                html += '          <span class="test-comp-label">Targeted Competences:</span>\n';
                html += '          <div class="test-comp-chips">\n';
                exComps.forEach(function (c) {
                  html += '            <span class="comp-tag-chip test" title="' + escapeHtml(c.title ? (c.code + ': ' + c.title) : c.code) + '">' + escapeHtml(c.code) + (c.title && c.title !== c.code ? (' — ' + escapeHtml(c.title)) : '') + '</span>\n';
                });
                html += '          </div>\n';
                html += '        </div>\n';
              } else if (testCompetencesMode === 'detailed') {
                html += '        <div class="test-comp-section">\n';
                html += '          <span class="test-comp-label">Targeted Standards &amp; Descriptors:</span>\n';
                html += '          <div class="test-comp-cards-grid">\n';
                exComps.forEach(function (c) {
                  html += '            <div class="test-comp-card">\n';
                  html += '              <div class="test-comp-card-top">\n';
                  html += '                <span class="comp-tag-chip test">' + escapeHtml(c.code) + '</span>\n';
                  html += '                <span class="test-comp-card-title">' + escapeHtml(c.title) + '</span>\n';
                  if (c.level) html += '                <span class="test-comp-level-badge">' + escapeHtml(c.level) + '</span>\n';
                  if (c.category) html += '                <span class="test-comp-cat-badge">' + escapeHtml(c.category) + '</span>\n';
                  html += '              </div>\n';
                  if (c.description) html += '              <div class="test-comp-card-desc">' + escapeHtml(c.description) + '</div>\n';
                  html += '            </div>\n';
                });
                html += '          </div>\n';
                html += '        </div>\n';
            // Apply competence/criteria column overrides to section blocks & exercise rubrics if not 'use_test'
            if (ex.type === 'section_competences') {
              if (testCompetencesMode === 'none') return;
              if (!ex.options) ex.options = {};
              if (testCompetencesMode !== 'use_test') {
                ex.options.displayMode = hc.competencesStyle.displayMode;
                ex.options.showCodeCol = hc.competencesStyle.showCodeCol;
                ex.options.showTitleCol = hc.competencesStyle.showTitleCol;
                ex.options.showDescriptions = hc.competencesStyle.showDescriptions;
                ex.options.showLevelCol = hc.competencesStyle.showLevelCol;
                ex.options.showScoreCol = hc.competencesStyle.showScoreCol;
                ex.options.showCommentsCol = hc.competencesStyle.showCommentsCol;
                ex.options.separatePage = hc.competencesStyle.separatePage;
                ex.options.pageOrientation = hc.competencesStyle.pageOrientation;
              }
            } else if (ex.type === 'section_criteria') {
              if (testCriteriaMode === 'none') return;
              if (!ex.options) ex.options = {};
              if (testCriteriaMode !== 'use_test') {
                ex.options.displayMode = hc.criteriaStyle.displayMode;
                ex.options.rubricDisplayMode = hc.criteriaStyle.displayMode;
                ex.options.showCriterionCol = hc.criteriaStyle.showCriterionCol;
                ex.options.showLevelsCol = hc.criteriaStyle.showLevelsCol;
                ex.options.showDescriptions = hc.criteriaStyle.showDescriptions;
                ex.options.showRubricDescriptions = hc.criteriaStyle.showDescriptions;
                ex.options.showMaxCol = hc.criteriaStyle.showMaxCol;
                ex.options.showScoreCol = hc.criteriaStyle.showScoreCol;
                ex.options.showCommentsCol = hc.criteriaStyle.showCommentsCol;
                ex.options.separatePage = hc.criteriaStyle.separatePage;
                ex.options.pageOrientation = hc.criteriaStyle.pageOrientation;
              }
            } else if (ex.type === 'section_grading_scale') {
              if (!includeGradingScale) return;
              if (!ex.options) ex.options = {};
              if (testScaleDisplayMode && testScaleDisplayMode !== 'use_test') {
                ex.options.displayMode = testScaleDisplayMode;
              }
            } else {
              if (!ex.options) ex.options = {};
              if (testCriteriaMode === 'none') {
                ex.options.showRubric = false;
              } else if (testCriteriaMode !== 'use_test') {
                ex.options.rubricDisplayMode = hc.criteriaStyle.displayMode;
                ex.options.showCriterionCol = hc.criteriaStyle.showCriterionCol;
                ex.options.showLevelsCol = hc.criteriaStyle.showLevelsCol;
                ex.options.showRubricDescriptions = hc.criteriaStyle.showDescriptions;
                ex.options.showMaxCol = hc.criteriaStyle.showMaxCol;
                ex.options.showScoreCol = hc.criteriaStyle.showScoreCol;
                ex.options.showCommentsCol = hc.criteriaStyle.showCommentsCol;
              }
            }
          }

          // Exercise Criteria / Rubric Rendering
          if (testCriteriaMode !== 'none') {
            var exRubrics = Array.isArray(ex.markingRubric) ? ex.markingRubric : (Array.isArray(ex.criteria) ? ex.criteria : (Array.isArray(ex.correctionCriteria) ? ex.correctionCriteria : []));
            if (exRubrics.length > 0) {
              if (testCriteriaMode === 'compact') {
                html += '        <div class="test-criteria-section">\n';
                html += '          <span class="test-criteria-label">Assessment &amp; Rubric Criteria:</span>\n';
                html += '          <table class="test-criteria-table">\n';
                html += '            <thead><tr><th>Criterion</th><th style="width:55px;text-align:center;">Max</th><th style="width:55px;text-align:center;">Weight</th><th style="width:55px;text-align:center;">Score</th></tr></thead>\n';
                html += '            <tbody>\n';
                exRubrics.forEach(function (r) {
                  var rTitle = (typeof r === 'object' && r) ? (r.title || r.name || 'Criterion') : String(r);
                  var rMax = (typeof r === 'object' && r && (r.maxPoints != null || r.points != null)) ? (r.maxPoints != null ? r.maxPoints : r.points) : 1;
                  var rWeight = (typeof r === 'object' && r && r.weight != null) ? r.weight : 1;
                  html += '              <tr><td><strong>' + escapeHtml(rTitle) + '</strong></td><td style="text-align:center;">/' + rMax + '</td><td style="text-align:center;">' + rWeight + 'x</td><td></td></tr>\n';
                });
                html += '            </tbody>\n';
                html += '          </table>\n';
                html += '        </div>\n';
              } else if (testCriteriaMode === 'detailed') {
                html += '        <div class="test-criteria-section">\n';
                html += '          <span class="test-criteria-label">Detailed Correction Rubric:</span>\n';
                html += '          <div class="test-criteria-list">\n';
                exRubrics.forEach(function (r) {
                  var rTitle = (typeof r === 'object' && r) ? (r.title || r.name || 'Criterion') : String(r);
                  var rMax = (typeof r === 'object' && r && (r.maxPoints != null || r.points != null)) ? (r.maxPoints != null ? r.maxPoints : r.points) : 1;
                  var rWeight = (typeof r === 'object' && r && r.weight != null) ? r.weight : 1;
                  var rDesc = (typeof r === 'object' && r) ? (r.description || r.desc || '') : '';
                  var rLevel = (typeof r === 'object' && r) ? (r.level || r.tier || '') : '';
                  var rScale = (typeof r === 'object' && r && Array.isArray(r.scale)) ? r.scale : (Array.isArray(r.levels) ? r.levels : null);
            // Full Printable Exam Exercise Rendering via TestCreatorService
            if (testRenderMode !== 'summary_cards' && typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.renderExerciseHtml === 'function') {
              var renderedExHtml = TestCreatorService.renderExerciseHtml(ex, eIdx, includeAnswerKeys, {
                exportStyle: test.exportStyle || {},
                test: test,
                totalPoints: tPts,
                exerciseNumber: isSecBlock ? 0 : questionCounter,
                hasNextExercise: eIdx < (exList.length - 1)
              });
              html += '      ' + renderedExHtml + '\n';
              return;
            }

                  html += '            <div class="test-criterion-card">\n';
                  html += '              <div class="test-criterion-top">\n';
                  html += '                <span class="test-criterion-title">' + escapeHtml(rTitle) + '</span>\n';
                  html += '                <div class="test-criterion-meta">\n';
                  if (rLevel) html += '                  <span class="test-comp-level-badge">' + escapeHtml(rLevel) + '</span>\n';
                  html += '                  <span>Max: /' + rMax + ' pts (' + rWeight + 'x)</span>\n';
                  html += '                </div>\n';
                  html += '              </div>\n';
                  if (rDesc) html += '              <div class="test-criterion-desc">' + escapeHtml(rDesc) + '</div>\n';
                  if (rScale && rScale.length > 0) {
                    html += '              <div class="test-criterion-scale">\n';
                    rScale.forEach(function (sc) {
                      var scScore = (typeof sc === 'object' && sc) ? (sc.score != null ? sc.score : (sc.points != null ? sc.points : '')) : '';
                      var scText = (typeof sc === 'object' && sc) ? (sc.desc || sc.title || sc.label || '') : String(sc);
                      html += '                <span><strong>' + (scScore !== '' ? (scScore + ' pts: ') : '') + '</strong>' + escapeHtml(scText) + '</span>\n';
                    });
                    html += '              </div>\n';
                  }
                  html += '            </div>\n';
                });
                html += '          </div>\n';
                html += '        </div>\n';
            // Fallback / Compact Summary Cards Mode
            if (ex.type === 'section_competences' || ex.type === 'section_criteria' || ex.type === 'section_grading_scale') {
              return;
            }
            html +=
              '      <div class="ex-item-card">\n' +
              '        <div style="display:flex;justify-content:space-between;font-weight:800;font-size:0.9rem;border-bottom:1.5px solid #000;padding-bottom:4px;margin-bottom:6px;">\n' +
              '          <span>Exercise ' + questionCounter + ': ' + escapeHtml(ex.title || (ex.type ? ex.type.toUpperCase() : 'Task')) + '</span>\n' +
              '          <span>/' + (ex.points || 1) + ' pts</span>\n' +
              '        </div>\n' +
              (ex.instructions ? '        <div style="font-size:0.85rem;font-style:italic;margin-bottom:6px;">' + escapeHtml(ex.instructions) + '</div>\n' : '');

            if (ex.type === 'cloze' && ex.content && (ex.content.text || Array.isArray(ex.content.items))) {
              var cList = Array.isArray(ex.content.items) ? ex.content.items.map(function (it) { return it.text; }).join('\n') : ex.content.text;
              html += '        <div style="font-size:0.85rem;white-space:pre-line;line-height:1.6;">' + escapeHtml(cList) + '</div>\n';
            } else if (ex.type === 'matching' && ex.content && Array.isArray(ex.content.pairs)) {
              html += '        <ul style="font-size:0.85rem;margin:4px 0;padding-left:20px;">' +
                ex.content.pairs.map(function (p) { return '<li>' + escapeHtml(p.left) + (includeAnswerKeys ? (' → <strong>' + escapeHtml(p.right) + '</strong>') : (' — ' + escapeHtml(p.right))) + '</li>'; }).join('') +
                '</ul>\n';
            } else if (ex.type === 'open_question' && ex.content) {
              var oQs = Array.isArray(ex.content.items) ? ex.content.items : (Array.isArray(ex.content.questions) ? ex.content.questions : []);
              html += '        <ol style="font-size:0.85rem;margin:4px 0;padding-left:20px;">' +
                oQs.map(function (q) { return '<li>' + escapeHtml(q.prompt) + ' (' + (q.points || 1) + ' pts)' + (includeAnswerKeys && q.sampleAnswer ? (' <div style="color:#b91c1c;font-weight:700;">Key: ' + escapeHtml(q.sampleAnswer) + '</div>') : '') + '</li>'; }).join('') +
                '</ol>\n';
            } else if (ex.type === 'composition' && ex.content) {
              var cPrompts = Array.isArray(ex.content.items) ? ex.content.items : (Array.isArray(ex.content.prompts) ? ex.content.prompts : []);
              html += '        <ul style="font-size:0.85rem;margin:4px 0;padding-left:20px;">' +
                cPrompts.map(function (p) { return '<li>' + escapeHtml(p.prompt || p.title || p.text || p) + '</li>'; }).join('') +
                '</ul>\n';
            } else if ((ex.type === 'mcq' || ex.type === 'qcm') && ex.content && Array.isArray(ex.content.questions)) {
              html += '        <ol style="font-size:0.85rem;margin:4px 0;padding-left:20px;">' +
                ex.content.questions.map(function (q) {
                  var opts = Array.isArray(q.options) ? q.options.map(function (o, oIdx) {
                    var isCor = includeAnswerKeys && Array.isArray(q.correctIndices) && q.correctIndices.indexOf(oIdx) !== -1;
                    return '<span style="margin-right:12px;' + (isCor ? 'color:#b91c1c;font-weight:800;' : '') + '">' + (isCor ? '☑ ' : '◻ ') + escapeHtml(o.text || o) + '</span>';
                  }).join('') : '';
                  return '<li style="margin-bottom:6px;"><div>' + escapeHtml(q.prompt || q.text || '') + '</div><div style="margin-top:2px;">' + opts + '</div></li>';
                }).join('') +
                '</ol>\n';
            } else if ((ex.type === 'transformation' || ex.type === 'sentence_transformation') && ex.content && Array.isArray(ex.content.items)) {
              html += '        <ol style="font-size:0.85rem;margin:4px 0;padding-left:20px;">' +
                ex.content.items.map(function (it) { return '<li style="margin-bottom:4px;"><div>' + escapeHtml(it.original || it.sentence || it.text || '') + (it.keyword ? (' <strong>[' + escapeHtml(it.keyword) + ']</strong>') : '') + '</div><div style="font-style:italic;color:#64748b;">→ ' + escapeHtml(it.targetPrefix || it.prompt || '') + ' ' + (includeAnswerKeys && it.solution ? ('<strong style="color:#b91c1c;">' + escapeHtml(it.solution) + '</strong>') : '______') + ' ' + escapeHtml(it.targetSuffix || '') + '</div></li>'; }).join('') +
                '</ol>\n';
            } else if (ex.type === 'translation' && ex.content) {
              var trList = Array.isArray(ex.content.items) ? ex.content.items : (Array.isArray(ex.content.sentences) ? ex.content.sentences : []);
              html += '        <ol style="font-size:0.85rem;margin:4px 0;padding-left:20px;">' +
                trList.map(function (s) { return '<li style="margin-bottom:4px;">' + escapeHtml(s.sourceText || s.source || s.text || s) + (includeAnswerKeys && s.modelTranslation ? (' <div style="color:#b91c1c;font-weight:700;">→ ' + escapeHtml(s.modelTranslation) + '</div>') : '') + '</li>'; }).join('') +
                '</ol>\n';
            } else if (ex.type === 'picture_description' && ex.content) {
              var pItems = Array.isArray(ex.content.items) ? ex.content.items : [ex.content];
              html += '        <div style="font-size:0.85rem;margin:4px 0;">' +
                pItems.map(function (it) { return '<div>' + escapeHtml(it.prompt || '') + '</div>'; }).join('') +
                '</div>\n';
            } else if (ex.type === 'odd_one_out' && ex.content && Array.isArray(ex.content.items)) {
              html += '        <ol style="font-size:0.85rem;margin:4px 0;padding-left:20px;">' +
                ex.content.items.map(function (it) {
                  var wList = Array.isArray(it.words) ? it.words.join(' • ') : (it.words || '');
                  return '<li style="margin-bottom:4px;">' + escapeHtml(wList) + (includeAnswerKeys && it.intruder ? (' <strong style="color:#b91c1c;">(Intruder: ' + escapeHtml(it.intruder) + ')</strong>') : '') + '</li>';
                }).join('') +
                '</ol>\n';
            } else if (ex.type === 'reading_comprehension' && ex.content) {
              html += '        <div style="font-size:0.85rem;line-height:1.6;background:#f8fafc;padding:8px 10px;border-left:3px solid #3b82f6;margin-bottom:8px;">' +
                escapeHtml(ex.content.passageText || ex.content.text || ex.content.passage || '') +
                '</div>\n';
              if (Array.isArray(ex.content.subQuestions) && ex.content.subQuestions.length > 0) {
                html += '        <ol style="font-size:0.85rem;margin:4px 0;padding-left:20px;">' +
                  ex.content.subQuestions.map(function (sq) { return '<li style="margin-bottom:4px;">' + escapeHtml(sq.prompt || sq.text || '') + ' (' + (sq.points || 1) + ' pts)' + (includeAnswerKeys && sq.solution ? (' <strong style="color:#b91c1c;">→ ' + escapeHtml(sq.solution) + '</strong>') : '') + '</li>'; }).join('') +
                  '</ol>\n';
              }
            }
          }

          html += '      </div>\n';
            if (includeAnswerKeys && (ex.solution || ex.answerKey)) {
              var solText = ex.solution || ex.answerKey;
              html += '        <div style="margin-top:6px;padding:6px 8px;background:#fef3c7;border:1px dashed #d97706;border-radius:4px;font-size:0.8rem;color:#92400e;"><strong>Teacher Solution Key:</strong> ' + escapeHtml(typeof solText === 'string' ? solText : JSON.stringify(solText)) + '</div>\n';
            }

            html += '      </div>\n';
          });

          html += '    </div>\n';
        });

        html += '    </div>\n';
      });
    }

    html +=
      '  </div>\n' +
      '</body>\n' +
      '</html>';

    return html;
  };

  LessonCreatorService.exportSequenceToDocxHtml = function (unitSeq, fullLessons, fullTests, options) {
    var inner = LessonCreatorService.exportSequenceToHtml(unitSeq, fullLessons, fullTests, options);
    var title = (unitSeq && unitSeq.title) || 'Unit Curriculum Booklet';
    var wordHeader = [
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">',
      '<head><meta charset="utf-8"><title>' + escapeHtml(title) + '</title>',
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
    return inner.replace('<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>' + escapeHtml(title) + '</title>', wordHeader);
  };

  LessonCreatorService.exportSequenceToMarkdown = function (unitSeq, fullLessons, fullTests, options) {
    options = options || {};
    var title = (unitSeq && unitSeq.title) || 'Unit Curriculum Sequence';
    var subject = (unitSeq && unitSeq.subject) || (fullLessons[0] && (fullLessons[0].subject || fullLessons[0].subjectId)) || '';
    var className = (unitSeq && unitSeq.classId) || (fullLessons[0] && fullLessons[0].classId) || '';
    var compLayout = options.competenceLayout || 'column';
    var testCriteriaMode = options.testCriteriaMode || 'compact';
    var testCompetencesMode = options.testCompetencesMode || 'compact';
    var testCriteriaMode = options.testCriteriaMode || 'use_test';
    var testCompetencesMode = options.testCompetencesMode || 'use_test';
    var includeGradingScale = (options.includeGradingScale !== false);
    var includeAnswerKeys = !!options.includeAnswerKeys;
    var includeSummary = (options.includeSummary !== false);
    var includeVocab = (options.includeVocab !== false);

    var tocColsOpt = options.tocCols || {};
    var tocCols = {
      showType: tocColsOpt.showType !== false,
      showDate: !!tocColsOpt.showDate,
      showDuration: tocColsOpt.showDuration !== false,
      showObjectives: tocColsOpt.showObjectives !== false
    };

    var lessonLayout = options.lessonLayout || (options.cssTheme === 'horizontal_table' ? 'horizontal_table' : 'cards');
    var ltOpt = options.lessonToggles || {};
    var lessonToggles = {
      metaHeader: ltOpt.metaHeader !== false,
      metaDate: ltOpt.metaDate !== false,
      metaDuration: ltOpt.metaDuration !== false,
      metaSequence: ltOpt.metaSequence !== false,
      metaTags: ltOpt.metaTags !== false,
      metaTeams: ltOpt.metaTeams !== false,
      phaseTitle: ltOpt.phaseTitle !== false,
      phaseDuration: ltOpt.phaseDuration !== false,
      phaseActivity: ltOpt.phaseActivity !== false,
      phaseObjective: ltOpt.phaseObjective !== false,
      phaseTeacher: ltOpt.phaseTeacher !== false,
      phaseStudent: ltOpt.phaseStudent !== false,
      phaseResources: ltOpt.phaseResources !== false,
      phaseDescriptors: ltOpt.phaseDescriptors !== false,
      phaseDescText: ltOpt.phaseDescText !== false,
      phaseDiff: ltOpt.phaseDiff !== false,
      phaseAssess: ltOpt.phaseAssess !== false,
      phaseCustomFields: ltOpt.phaseCustomFields !== false
    };

    var testCompColsOpt = options.testCompCols || {};
    var testCompCols = {
      showCodeCol: testCompColsOpt.showCodeCol !== false,
      showTitleCol: testCompColsOpt.showTitleCol !== false,
      showDescriptions: testCompColsOpt.showDescriptions !== false,
      showLevelCol: testCompColsOpt.showLevelCol !== false,
      showScoreCol: testCompColsOpt.showScoreCol !== false,
      showCommentsCol: !!testCompColsOpt.showCommentsCol
    };

    var testCritColsOpt = options.testCritCols || {};
    var testCritCols = {
      showCriterionCol: testCritColsOpt.showCriterionCol !== false,
      showLevelsCol: testCritColsOpt.showLevelsCol !== false,
      showDescriptions: testCritColsOpt.showDescriptions !== false,
      showMaxCol: testCritColsOpt.showMaxCol !== false,
      showScoreCol: testCritColsOpt.showScoreCol !== false,
      showCommentsCol: !!testCritColsOpt.showCommentsCol
    };

    var md = '# ' + title + '\n\n';
    md += '**Subject:** ' + (subject || 'General') + ' | **Class:** ' + (className || 'N/A') + ' | **Total Lessons:** ' + (fullLessons || []).length + '\n\n';
    md += '## Sequence Structure\n\n';
    if (includeSummary) {
      md += '**Subject:** ' + (subject || 'General') + ' | **Class:** ' + (className || 'N/A') + ' | **Total Lessons:** ' + (fullLessons || []).length + ' | **Assessments:** ' + (fullTests || []).length + '\n\n';
      if (unitSeq && (unitSeq.description || unitSeq.summary || unitSeq.objectives)) {
        md += '> ' + String(unitSeq.description || unitSeq.summary || unitSeq.objectives).trim() + '\n\n';
      }
    }

    var compLookup = {};
    if (Array.isArray(options.allCompetences)) {
      options.allCompetences.forEach(function (c) {
        if (c && (c.id || c.code)) {
          if (c.id) compLookup[c.id] = c;
          if (c.code) compLookup[c.code] = c;
        }
      });
    }

    var sequenceCoverageMap = {};

    (unitSeq.lessons || []).forEach(function (it, idx) {
      var isTest = (it.type === 'test' || it.category === 'test');
      var itemLabel = isTest ? ('Assessment ' + (idx + 1)) : ('Lesson ' + (idx + 1));
      var set = new Set();
      if (!isTest) {
        var matchL = (fullLessons || []).find(function (fl) { return fl.id === it.id; });
        if (matchL) {
          if (Array.isArray(matchL.descriptorIds)) matchL.descriptorIds.forEach(function (id) { if (id) set.add(String(id).trim()); });
          (matchL.sections || []).forEach(function (sec) {
            if (Array.isArray(sec.descriptorIds)) sec.descriptorIds.forEach(function (id) { if (id) set.add(String(id).trim()); });
          });
        }
      } else {
        var matchT = (fullTests || []).find(function (ft) { return ft.id === it.id; });
        if (matchT) {
          if (Array.isArray(matchT.descriptorIds)) matchT.descriptorIds.forEach(function (id) { if (id) set.add(String(id).trim()); });
          if (Array.isArray(matchT.linkedCompetenceIds)) matchT.linkedCompetenceIds.forEach(function (id) { if (id) set.add(String(id).trim()); });
          if (Array.isArray(matchT.linkedCompetences)) {
            matchT.linkedCompetences.forEach(function (c) {
              var cid = (typeof c === 'object' && c) ? (c.id || c.code || c.title) : c;
              if (cid) set.add(String(cid).trim());
    if (includeSummary) {
      md += '## Sequence Structure & Table of Contents\n\n';
      var tocHeaderParts = ['#'];
      if (tocCols.showType) tocHeaderParts.push('Type');
      tocHeaderParts.push('Title');
      if (tocCols.showDate) tocHeaderParts.push('Date');
      if (tocCols.showObjectives) tocHeaderParts.push('Objectives / Focus');
      if (compLayout === 'column' || compLayout === 'both') tocHeaderParts.push('Competences');
      if (tocCols.showDuration) tocHeaderParts.push('Duration / Pts');

      md += '| ' + tocHeaderParts.join(' | ') + ' |\n';
      md += '| ' + tocHeaderParts.map(function () { return ':---'; }).join(' | ') + ' |\n';

      (unitSeq.lessons || []).forEach(function (it, idx) {
        var isTest = (it.type === 'test' || it.category === 'test');
        var itemLabel = isTest ? ('Assessment ' + (idx + 1)) : ('Lesson ' + (idx + 1));
        var set = new Set();
        var itemDate = it.date || '';
        var itemObj = '';
        var itemDur = '';

        if (!isTest) {
          var matchL = (fullLessons || []).find(function (fl) { return fl.id === it.id; });
          if (matchL) {
            if (!itemDate && matchL.date) itemDate = matchL.date;
            var durSum = (matchL.sections || []).reduce(function (s, sec) { return s + (Number(sec.duration) || 0); }, 0);
            itemDur = (durSum || it.duration || 45) + ' min';
            var objs = (matchL.sections || []).map(function (s) { return s.objective; }).filter(Boolean);
            itemObj = objs.slice(0, 2).join('; ');
            if (Array.isArray(matchL.descriptorIds)) matchL.descriptorIds.forEach(function (id) { if (id) set.add(String(id).trim()); });
            (matchL.sections || []).forEach(function (sec) {
              if (Array.isArray(sec.descriptorIds)) sec.descriptorIds.forEach(function (id) { if (id) set.add(String(id).trim()); });
            });
          } else {
            itemDur = (it.duration || 45) + ' min';
          }
          (matchT.exercises || []).forEach(function (ex) {
            if (Array.isArray(ex.descriptorIds)) ex.descriptorIds.forEach(function (id) { if (id) set.add(String(id).trim()); });
            if (Array.isArray(ex.linkedCompetenceIds)) ex.linkedCompetenceIds.forEach(function (id) { if (id) set.add(String(id).trim()); });
            if (Array.isArray(ex.linkedCompetences)) {
              ex.linkedCompetences.forEach(function (c) {
        } else {
          var matchT = (fullTests || []).find(function (ft) { return ft.id === it.id; });
          if (matchT) {
            if (!itemDate && matchT.date) itemDate = matchT.date;
            var ptsSum = (matchT.exercises || []).reduce(function (s, ex) { return s + (Number(ex.points) || 0); }, 0);
            itemDur = (ptsSum || it.points || 20) + ' pts';
            itemObj = (matchT.exercises || []).length + ' exercises';
            if (Array.isArray(matchT.descriptorIds)) matchT.descriptorIds.forEach(function (id) { if (id) set.add(String(id).trim()); });
            if (Array.isArray(matchT.linkedCompetenceIds)) matchT.linkedCompetenceIds.forEach(function (id) { if (id) set.add(String(id).trim()); });
            if (Array.isArray(matchT.linkedCompetences)) {
              matchT.linkedCompetences.forEach(function (c) {
                var cid = (typeof c === 'object' && c) ? (c.id || c.code || c.title) : c;
                if (cid) set.add(String(cid).trim());
              });
            }
            if (Array.isArray(ex.competenceIds)) ex.competenceIds.forEach(function (id) { if (id) set.add(String(id).trim()); });
          });
            (matchT.exercises || []).forEach(function (ex) {
              if (Array.isArray(ex.descriptorIds)) ex.descriptorIds.forEach(function (id) { if (id) set.add(String(id).trim()); });
              if (Array.isArray(ex.linkedCompetenceIds)) ex.linkedCompetenceIds.forEach(function (id) { if (id) set.add(String(id).trim()); });
              if (Array.isArray(ex.linkedCompetences)) {
                ex.linkedCompetences.forEach(function (c) {
                  var cid = (typeof c === 'object' && c) ? (c.id || c.code || c.title) : c;
                  if (cid) set.add(String(cid).trim());
                });
              }
              if (Array.isArray(ex.competenceIds)) ex.competenceIds.forEach(function (id) { if (id) set.add(String(id).trim()); });
            });
          } else {
            itemDur = (it.points || 20) + ' pts';
          }
        }
      }
      var comps = Array.from(set).sort(function (a, b) {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        var comps = Array.from(set).sort(function (a, b) {
          return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });
        comps.forEach(function (cId) {
          if (!sequenceCoverageMap[cId]) {
            var compInfo = compLookup[cId] || {};
            sequenceCoverageMap[cId] = {
              code: cId,
              title: compInfo.title || compInfo.name || cId,
              targets: []
            };
          }
          sequenceCoverageMap[cId].targets.push(itemLabel);
        });

        var rowParts = [String(idx + 1)];
        if (tocCols.showType) rowParts.push('**' + (isTest ? 'TEST' : 'LESSON') + '**');
        rowParts.push((it.title || 'Untitled').replace(/\|/g, '\\|'));
        if (tocCols.showDate) rowParts.push(itemDate || '—');
        if (tocCols.showObjectives) rowParts.push((itemObj || '—').replace(/\|/g, '\\|').replace(/\n+/g, ' '));
        if (compLayout === 'column' || compLayout === 'both') rowParts.push(comps.length ? comps.map(function (c) { return '`' + c + '`'; }).join(', ') : '—');
        if (tocCols.showDuration) rowParts.push(itemDur || '—');

        md += '| ' + rowParts.join(' | ') + ' |\n';
      });
      comps.forEach(function (cId) {
        if (!sequenceCoverageMap[cId]) {
          var compInfo = compLookup[cId] || {};
          sequenceCoverageMap[cId] = {
            code: cId,
            title: compInfo.title || compInfo.name || cId,
            targets: []
          };
        }
        sequenceCoverageMap[cId].targets.push(itemLabel);
      });
      md += '\n';

      var compSuffix = '';
      if (compLayout !== 'none' && comps.length > 0) {
        compSuffix = ' — *[' + comps.join(', ') + ']*';
      if ((compLayout === 'matrix' || compLayout === 'both') && Object.keys(sequenceCoverageMap).length > 0) {
        md += '### Curriculum Competence Coverage Matrix\n\n';
        md += '| Competence Code | Title / Descriptor | Addressed in |\n';
        md += '| :--- | :--- | :--- |\n';
        Object.keys(sequenceCoverageMap).sort(function (a, b) {
          return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        }).forEach(function (cId) {
          var cov = sequenceCoverageMap[cId];
          md += '| **`' + cov.code + '`** | ' + (cov.title || cov.code) + ' | ' + cov.targets.join(', ') + ' |\n';
        });
        md += '\n';
      }
    }

      md += (idx + 1) + '. **[' + (isTest ? 'TEST' : 'LESSON') + ']** ' + (it.title || 'Untitled') + compSuffix + '\n';
    });
    md += '\n';

    if ((compLayout === 'matrix' || compLayout === 'both') && Object.keys(sequenceCoverageMap).length > 0) {
      md += '### Curriculum Competence Coverage Matrix\n\n';
      md += '| Competence Code | Title / Descriptor | Addressed in |\n';
      md += '| :--- | :--- | :--- |\n';
      Object.keys(sequenceCoverageMap).sort(function (a, b) {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
      }).forEach(function (cId) {
        var cov = sequenceCoverageMap[cId];
        md += '| **`' + cov.code + '`** | ' + (cov.title || cov.code) + ' | ' + cov.targets.join(', ') + ' |\n';
    if (includeVocab) {
      var unitVocabSet = new Set();
      if (unitSeq && Array.isArray(unitSeq.vocabulary)) {
        unitSeq.vocabulary.forEach(function (v) { if (v) unitVocabSet.add(typeof v === 'object' ? (v.word || v.term || v.title || '') : String(v)); });
      }
      (fullLessons || []).forEach(function (fl) {
        if (Array.isArray(fl.tags)) fl.tags.forEach(function (tg) { if (tg) unitVocabSet.add(String(tg).trim()); });
        if (Array.isArray(fl.vocabulary)) fl.vocabulary.forEach(function (v) { if (v) unitVocabSet.add(typeof v === 'object' ? (v.word || v.term || '') : String(v)); });
      });
      md += '\n';
      var vocabArr = Array.from(unitVocabSet).filter(Boolean);
      if (vocabArr.length > 0) {
        md += '### Unit Key Concepts, Tags & Vocabulary\n\n';
        md += vocabArr.map(function (v) { return '`' + v + '`'; }).join(' • ') + '\n\n';
      }
    }

    md += '---\n\n';

    if (options.includePhases !== false) {
      (fullLessons || []).forEach(function (l, idx) {
        md += '## Lesson ' + (idx + 1) + ': ' + (l.title || 'Untitled') + '\n\n';
        if (l.date) md += '*Date: ' + l.date + '*\n\n';
        (l.sections || []).forEach(function (s, sIdx) {
          md += '### Phase ' + (sIdx + 1) + ': ' + (s.title || 'Activity') + ' (' + (s.duration || 10) + ' min)\n\n';
          if (s.objective && String(s.objective).trim()) md += '- **Objective:** ' + s.objective.trim() + '\n';
          if (s.teacherAction && String(s.teacherAction).trim()) md += '- **Teacher:** ' + s.teacherAction.trim() + '\n';
          if (s.studentAction && String(s.studentAction).trim()) md += '- **Students:** ' + s.studentAction.trim() + '\n';
          if (s.resources && String(s.resources).trim()) md += '- **Materials:** ' + s.resources.trim() + '\n';
          if (Array.isArray(s.customFields) && s.customFields.length > 0) {
            s.customFields.forEach(function (cf) {
              var cfTitle = (cf && cf.title) ? String(cf.title).trim() : 'Custom Field';
              var cfContent = (cf && cf.content) ? String(cf.content).trim() : '';
              if (cfTitle || cfContent) {
                md += '- **' + cfTitle + ':** ' + cfContent.replace(/\n+/g, ' ') + '\n';
              }
            });
        if (lessonToggles.metaHeader) {
          md += '## Lesson ' + (idx + 1) + ': ' + (l.title || 'Untitled') + '\n\n';
          var metaLine = [];
          if (lessonToggles.metaDate && l.date) metaLine.push('**Date:** ' + l.date);
          if (lessonToggles.metaDuration) {
            var lDur = (l.sections || []).reduce(function (acc, s) { return acc + (Number(s.duration) || 0); }, 0);
            metaLine.push('**Duration:** ' + lDur + ' min');
          }
          if (lessonToggles.metaSequence && l.sequence) metaLine.push('**Unit:** ' + l.sequence);
          if (lessonToggles.metaTags && Array.isArray(l.tags) && l.tags.length) metaLine.push('**Tags:** ' + l.tags.join(', '));
          if (metaLine.length) md += '*' + metaLine.join(' | ') + '*\n\n';
        }

        if (lessonLayout === 'horizontal_table') {
          var cols = ['#'];
          if (lessonToggles.phaseTitle) cols.push('Phase');
          if (lessonToggles.phaseDuration) cols.push('Time');
          if (lessonToggles.phaseActivity) cols.push('Activity / Mode');
          if (lessonToggles.phaseObjective) cols.push('Objective');
          if (lessonToggles.phaseTeacher) cols.push('Teacher Actions');
          if (lessonToggles.phaseStudent) cols.push('Student Tasks');
          if (lessonToggles.phaseResources) cols.push('Materials');
          if (lessonToggles.phaseDescriptors) cols.push('Competences');
          if (lessonToggles.phaseDiff || lessonToggles.phaseAssess) cols.push('Diff. / Assessment');
          if (lessonToggles.phaseCustomFields) cols.push('Custom Fields');

          md += '| ' + cols.join(' | ') + ' |\n';
          md += '| ' + cols.map(function () { return ':---'; }).join(' | ') + ' |\n';

          (l.sections || []).forEach(function (s, sIdx) {
            var r = [String(sIdx + 1)];
            if (lessonToggles.phaseTitle) r.push((s.title || 'Activity').replace(/\|/g, '\\|'));
            if (lessonToggles.phaseDuration) r.push((s.duration || 10) + ' min');
            if (lessonToggles.phaseActivity) r.push([s.activityTypeId || '', s.interactionTypeId || ''].filter(Boolean).join(' / ') || '—');
            if (lessonToggles.phaseObjective) r.push((s.objective || '—').replace(/\|/g, '\\|').replace(/\n+/g, ' '));
            if (lessonToggles.phaseTeacher) r.push((s.teacherAction || '—').replace(/\|/g, '\\|').replace(/\n+/g, ' '));
            if (lessonToggles.phaseStudent) r.push((s.studentAction || '—').replace(/\|/g, '\\|').replace(/\n+/g, ' '));
            if (lessonToggles.phaseResources) r.push((s.resources || '—').replace(/\|/g, '\\|').replace(/\n+/g, ' '));
            if (lessonToggles.phaseDescriptors) {
              var dStr = (s.descriptorIds || []).map(function (id) {
                var ci = compLookup[id];
                return ci && lessonToggles.phaseDescText ? (id + ': ' + (ci.title || '')) : id;
              }).join(', ');
              r.push((dStr || '—').replace(/\|/g, '\\|'));
            }
            if (lessonToggles.phaseDiff || lessonToggles.phaseAssess) {
              var da = [];
              if (lessonToggles.phaseDiff && s.differentiation) da.push('Diff: ' + s.differentiation);
              if (lessonToggles.phaseAssess && s.assessmentStrategy) da.push('Assess: ' + s.assessmentStrategy);
              r.push((da.join('; ') || '—').replace(/\|/g, '\\|').replace(/\n+/g, ' '));
            }
            if (lessonToggles.phaseCustomFields) {
              var cfs = (s.customFields || []).map(function (cf) { return (cf.title || 'Note') + ': ' + (cf.content || ''); }).join('; ');
              r.push((cfs || '—').replace(/\|/g, '\\|').replace(/\n+/g, ' '));
            }
            md += '| ' + r.join(' | ') + ' |\n';
          });
          md += '\n';
        });
        } else {
          (l.sections || []).forEach(function (s, sIdx) {
            var pHead = '### Phase ' + (sIdx + 1);
            if (lessonToggles.phaseTitle) pHead += ': ' + (s.title || 'Activity');
            if (lessonToggles.phaseDuration) pHead += ' (' + (s.duration || 10) + ' min)';
            md += pHead + '\n\n';
            if (lessonToggles.phaseActivity && (s.activityTypeId || s.interactionTypeId)) {
              md += '- **Activity / Interaction:** ' + [s.activityTypeId, s.interactionTypeId].filter(Boolean).join(' • ') + '\n';
            }
            if (lessonToggles.phaseObjective && s.objective && String(s.objective).trim()) md += '- **Objective:** ' + s.objective.trim() + '\n';
            if (lessonToggles.phaseTeacher && s.teacherAction && String(s.teacherAction).trim()) md += '- **Teacher:** ' + s.teacherAction.trim() + '\n';
            if (lessonToggles.phaseStudent && s.studentAction && String(s.studentAction).trim()) md += '- **Students:** ' + s.studentAction.trim() + '\n';
            if (lessonToggles.phaseResources && s.resources && String(s.resources).trim()) md += '- **Materials:** ' + s.resources.trim() + '\n';
            if (lessonToggles.phaseDescriptors && Array.isArray(s.descriptorIds) && s.descriptorIds.length > 0) {
              var cItems = s.descriptorIds.map(function (id) {
                var ci = compLookup[id];
                return '`' + id + '`' + (lessonToggles.phaseDescText && ci && ci.title ? (' (' + ci.title + ')') : '');
              });
              md += '- **Competences:** ' + cItems.join(', ') + '\n';
            }
            if (lessonToggles.phaseDiff && s.differentiation && String(s.differentiation).trim()) md += '- **Differentiation:** ' + s.differentiation.trim() + '\n';
            if (lessonToggles.phaseAssess && s.assessmentStrategy && String(s.assessmentStrategy).trim()) md += '- **Assessment:** ' + s.assessmentStrategy.trim() + '\n';
            if (lessonToggles.phaseCustomFields && Array.isArray(s.customFields) && s.customFields.length > 0) {
              s.customFields.forEach(function (cf) {
                var cfTitle = (cf && cf.title) ? String(cf.title).trim() : 'Custom Field';
                var cfContent = (cf && cf.content) ? String(cf.content).trim() : '';
                if (cfTitle || cfContent) {
                  md += '- **' + cfTitle + ':** ' + cfContent.replace(/\n+/g, ' ') + '\n';
                }
              });
            }
            md += '\n';
          });
        }
        md += '---\n\n';
      });
    }

    if (options.includeTests !== false) {
      (fullTests || []).forEach(function (t, idx) {
        var tPts = (t.exercises || []).reduce(function (sum, e) { return sum + (Number(e.points) || 0); }, 0);
        md += '## Assessment: ' + (t.title || 'Unit Exam') + '\n\n';
        md += '*Duration: ' + (t.duration || 45) + ' min | Total Points: ' + tPts + ' pts*\n\n';

        // Test-wide Competences in Markdown
        if (testCompetencesMode !== 'none') {
          var tComps = (Array.isArray(t.linkedCompetences) && t.linkedCompetences.length)
            ? t.linkedCompetences
            : (Array.isArray(t.linkedCompetenceIds) ? t.linkedCompetenceIds : []);
          if (tComps.length > 0) {
            tComps = tComps.slice().sort(function (a, b) {
              var ca = (a && (a.code || a.id)) || String(a || '');
              var cb = (b && (b.code || b.id)) || String(b || '');
              return ca.localeCompare(cb, undefined, { numeric: true, sensitivity: 'base' });
            });
            md += '### Test-Wide Objectives & Competences\n\n';
            tComps.forEach(function (c) {
              var cCode = (c && c.code) || (c && c.id) || c;
              var cTitle = (c && c.title) || '';
              var cDesc = (c && (c.description || c.descriptors)) || '';
              md += '- **`' + cCode + '`**' + (cTitle && cTitle !== cCode ? (' ' + cTitle) : '') + (cDesc ? (' — ' + cDesc) : '') + '\n';
            });
            md += '\n';
            if (testCompetencesMode === 'detailed') {
              var cHeaders = [];
              if (testCompCols.showCodeCol) cHeaders.push('Code');
              if (testCompCols.showTitleCol) cHeaders.push('Title');
              if (testCompCols.showLevelCol) cHeaders.push('Level');
              if (testCompCols.showDescriptions) cHeaders.push('Description');
              if (testCompCols.showScoreCol) cHeaders.push('Score');
              if (testCompCols.showCommentsCol) cHeaders.push('Comments');
              if (cHeaders.length > 0) {
                md += '| ' + cHeaders.join(' | ') + ' |\n';
                md += '| ' + cHeaders.map(function () { return ':---'; }).join(' | ') + ' |\n';
                tComps.forEach(function (c) {
                  var cCode = (c && c.code) || (c && c.id) || c;
                  var info = compLookup[cCode] || {};
                  var cTitle = (c && c.title) || info.title || '';
                  var cDesc = (c && (c.description || c.descriptors)) || info.description || '';
                  var cLevel = (c && c.level) || info.level || '—';
                  var r = [];
                  if (testCompCols.showCodeCol) r.push('**`' + cCode + '`**');
                  if (testCompCols.showTitleCol) r.push(cTitle || '—');
                  if (testCompCols.showLevelCol) r.push(cLevel);
                  if (testCompCols.showDescriptions) r.push(cDesc || '—');
                  if (testCompCols.showScoreCol) r.push('___');
                  if (testCompCols.showCommentsCol) r.push('___');
                  md += '| ' + r.join(' | ') + ' |\n';
                });
                md += '\n';
              }
            } else {
              tComps.forEach(function (c) {
                var cCode = (c && c.code) || (c && c.id) || c;
                var cTitle = (c && c.title) || '';
                var cDesc = (c && (c.description || c.descriptors)) || '';
                md += '- **`' + cCode + '`**' + (cTitle && cTitle !== cCode ? (' ' + cTitle) : '') + (cDesc ? (' — ' + cDesc) : '') + '\n';
              });
              md += '\n';
            }
          }
        }

        // Test-wide Criteria in Markdown
        if (testCriteriaMode !== 'none') {
          var tCrits = (Array.isArray(t.criteria) && t.criteria.length)
            ? t.criteria
            : (Array.isArray(t.linkedCriteria) ? t.linkedCriteria : []);
          if (tCrits.length > 0) {
            md += '### Test Assessment Criteria\n\n';
            md += '| Criterion | Max Points | Weight | Description |\n';
            md += '| :--- | :--- | :--- | :--- |\n';
            tCrits.forEach(function (cr) {
              var crTitle = (cr && (cr.title || cr.name)) || 'Criterion';
              var crMax = (cr && (cr.maxPoints || cr.points)) || 1;
              var crWeight = (cr && cr.weight) || 1;
              var crDesc = (cr && (cr.description || cr.desc || cr.domain)) || '—';
              md += '| ' + crTitle + ' | /' + crMax + ' | ' + crWeight + 'x | ' + crDesc + ' |\n';
            });
            md += '\n';
            var crHeaders = [];
            if (testCritCols.showCriterionCol) crHeaders.push('Criterion');
            if (testCritCols.showLevelsCol) crHeaders.push('Levels / Weight');
            if (testCritCols.showDescriptions) crHeaders.push('Description');
            if (testCritCols.showMaxCol) crHeaders.push('Max Points');
            if (testCritCols.showScoreCol) crHeaders.push('Score');
            if (testCritCols.showCommentsCol) crHeaders.push('Comments');
            if (crHeaders.length > 0) {
              md += '| ' + crHeaders.join(' | ') + ' |\n';
              md += '| ' + crHeaders.map(function () { return ':---'; }).join(' | ') + ' |\n';
              tCrits.forEach(function (cr) {
                var crTitle = (cr && (cr.title || cr.name)) || 'Criterion';
                var crMax = (cr && (cr.maxPoints || cr.points)) || 1;
                var crWeight = (cr && cr.weight) || 1;
                var crDesc = (cr && (cr.description || cr.desc || cr.domain)) || '—';
                var r = [];
                if (testCritCols.showCriterionCol) r.push('**' + crTitle + '**');
                if (testCritCols.showLevelsCol) r.push(crWeight + 'x');
                if (testCritCols.showDescriptions) r.push(crDesc);
                if (testCritCols.showMaxCol) r.push('/' + crMax);
                if (testCritCols.showScoreCol) r.push('___');
                if (testCritCols.showCommentsCol) r.push('___');
                md += '| ' + r.join(' | ') + ' |\n';
              });
              md += '\n';
            }
          }
        }

        // Test Grading Scale in Markdown
        if (includeGradingScale && (t.scaleModel || t.scaleModelId) && t.scaleModelId !== 'none' && typeof TestCreatorService !== 'undefined') {
          var tableData = TestCreatorService.calculateGradeConversionTable(t.scaleModel || t.scaleModelId, tPts);
          if (tableData && tableData.rows && tableData.rows.length) {
            md += '### Grading Scale (' + (tableData.scaleName || t.scaleModelId) + ')\n\n';
            md += '| Grade | Threshold | Required Points | Notes |\n';
            md += '| :--- | :--- | :--- | :--- |\n';
            tableData.rows.forEach(function (r) {
              md += '| **' + r.grade + '** | ' + r.thresholdStr + ' | ' + r.pointsStr + ' | ' + (r.desc || '—') + ' |\n';
            });
            md += '\n';
          }
        }

        (t.exercises || []).forEach(function (e, eIdx) {
          if (e.type === 'section_competences' || e.type === 'section_criteria' || e.type === 'section_grading_scale') {
            md += '### Section: ' + (e.title || 'Exam Section') + '\n\n';
            return;
          }

          md += '### Exercise ' + (eIdx + 1) + ': ' + (e.title || e.type || 'Task') + ' (' + (e.points || 1) + ' pts)\n\n';
          if (e.instructions) md += '>' + e.instructions + '\n\n';
          if (e.type === 'cloze' && e.content && e.content.text) {
            md += '```\n' + e.content.text + '\n```\n\n';
          }

          // Exercise Competences in Markdown
          if (testCompetencesMode !== 'none') {
            var exComps = [];
            var cSet = new Set();
            if (Array.isArray(e.descriptorIds)) e.descriptorIds.forEach(function (id) { if (id) cSet.add(String(id).trim()); });
            if (Array.isArray(e.linkedCompetenceIds)) e.linkedCompetenceIds.forEach(function (id) { if (id) cSet.add(String(id).trim()); });
            if (Array.isArray(e.linkedCompetences)) {
              e.linkedCompetences.forEach(function (c) {
                var cid = (typeof c === 'object' && c) ? (c.id || c.code || c.title) : c;
                if (cid) cSet.add(String(cid).trim());
              });
            }
            if (Array.isArray(e.competenceIds)) e.competenceIds.forEach(function (id) { if (id) cSet.add(String(id).trim()); });
            cSet.forEach(function (cid) {
              var info = compLookup[cid] || {};
              exComps.push({ code: cid, title: info.title || info.name || cid, description: info.description || info.desc || '', level: info.level || '' });
            });
            exComps.sort(function (a, b) {
              return String(a.code || a.title).localeCompare(String(b.code || b.title), undefined, { numeric: true, sensitivity: 'base' });
            });
            if (exComps.length > 0) {
              if (testCompetencesMode === 'compact') {
                md += '- **Competences:** ' + exComps.map(function (c) { return '`' + c.code + '`' + (c.title && c.title !== c.code ? (' (' + c.title + ')') : ''); }).join(', ') + '\n\n';
              } else if (testCompetencesMode === 'detailed') {
                md += '#### Competence Descriptors\n\n';
                md += '| Code | Title | Level | Description |\n';
                md += '| :--- | :--- | :--- | :--- |\n';
                exComps.forEach(function (c) {
                  md += '| **`' + c.code + '`** | ' + c.title + ' | ' + (c.level || '—') + ' | ' + (c.description || '—') + ' |\n';
                });
                md += '\n';
              }
            }
          }

          // Exercise Criteria in Markdown
          if (testCriteriaMode !== 'none') {
            var exRubrics = Array.isArray(e.markingRubric) ? e.markingRubric : (Array.isArray(e.criteria) ? e.criteria : (Array.isArray(e.correctionCriteria) ? e.correctionCriteria : []));
            if (exRubrics.length > 0) {
              if (testCriteriaMode === 'compact') {
                md += '#### Assessment Criteria\n\n';
                md += '| Criterion | Max Points | Weight |\n';
                md += '| :--- | :--- | :--- |\n';
                exRubrics.forEach(function (r) {
                  var rTitle = (typeof r === 'object' && r) ? (r.title || r.name || 'Criterion') : String(r);
                  var rMax = (typeof r === 'object' && r && (r.maxPoints != null || r.points != null)) ? (r.maxPoints != null ? r.maxPoints : r.points) : 1;
                  var rWeight = (typeof r === 'object' && r && r.weight != null) ? r.weight : 1;
                  md += '| ' + rTitle + ' | /' + rMax + ' | ' + rWeight + 'x |\n';
                });
                md += '\n';
              } else if (testCriteriaMode === 'detailed') {
              } else {
                md += '#### Detailed Rubric\n\n';
                md += '| Criterion | Level | Max Points | Description |\n';
                md += '| :--- | :--- | :--- | :--- |\n';
                exRubrics.forEach(function (r) {
                  var rTitle = (typeof r === 'object' && r) ? (r.title || r.name || 'Criterion') : String(r);
                  var rMax = (typeof r === 'object' && r && (r.maxPoints != null || r.points != null)) ? (r.maxPoints != null ? r.maxPoints : r.points) : 1;
                  var rWeight = (typeof r === 'object' && r && r.weight != null) ? r.weight : 1;
                  var rDesc = (typeof r === 'object' && r) ? (r.description || r.desc || '—') : '—';
                  var rLevel = (typeof r === 'object' && r) ? (r.level || '—') : '—';
                  md += '| **' + rTitle + '** | ' + rLevel + ' | /' + rMax + ' (' + rWeight + 'x) | ' + rDesc + ' |\n';
                });
                md += '\n';
              }
            }
          }

          if (includeAnswerKeys && e.solution) {
            md += '**Solution:** ' + (typeof e.solution === 'string' ? e.solution : JSON.stringify(e.solution)) + '\n\n';
          if (includeAnswerKeys && (e.solution || e.answerKey)) {
            var solVal = e.solution || e.answerKey;
            md += '**Solution:** ' + (typeof solVal === 'string' ? solVal : JSON.stringify(solVal)) + '\n\n';
          }
        });
        md += '---\n\n';
      });
    }

    return md;
  };

  /**
   * Build a multi-sheet SheetJS workbook for a whole Unit Sequence (used by both XLSX and ODS exports)
   * Respects TOC columns, Lesson phase column toggles, and Test competence/criteria/key options.
   */
  LessonCreatorService.buildSequenceWorkbook = function (unitSeq, fullLessons, fullTests, options) {
    if (typeof XLSX === 'undefined') return null;
    options = options || {};
    var wb = XLSX.utils.book_new();
    var descList = Array.isArray(options.allCompetences) ? options.allCompetences : [];

    var tocColsOpt = options.tocCols || {};
    var tocCols = {
      showType: tocColsOpt.showType !== false,
      showDate: !!tocColsOpt.showDate,
      showDuration: tocColsOpt.showDuration !== false,
      showObjectives: tocColsOpt.showObjectives !== false
    };

    var ltOpt = options.lessonToggles || {};
    var lessonToggles = {
      phaseTitle: ltOpt.phaseTitle !== false,
      phaseDuration: ltOpt.phaseDuration !== false,
      phaseActivity: ltOpt.phaseActivity !== false,
      phaseObjective: ltOpt.phaseObjective !== false,
      phaseTeacher: ltOpt.phaseTeacher !== false,
      phaseStudent: ltOpt.phaseStudent !== false,
      phaseResources: ltOpt.phaseResources !== false,
      phaseDescriptors: ltOpt.phaseDescriptors !== false,
      phaseDescText: ltOpt.phaseDescText !== false,
      phaseDiff: ltOpt.phaseDiff !== false,
      phaseAssess: ltOpt.phaseAssess !== false,
      phaseCustomFields: ltOpt.phaseCustomFields !== false
    };

    function getCleanDescText(id, withText) {
      var tId = String(id || '').toLowerCase().trim();
      var d = descList.find(function (item) {
        return item && (String(item.id || '').toLowerCase().trim() === tId || String(item.code || '').toLowerCase().trim() === tId);
      });
      if (!d) return String(id || '');
      if (withText === false) return d.code || d.id || String(id || '');
      return (d.code ? (d.code + ': ') : '') + (d.title || d.id || '');
    }

    function getSortedDescString(ids, withText) {
      if (!Array.isArray(ids) || ids.length === 0) return '';
      var sorted = ids.slice().sort(function (a, b) {
        return String(a || '').localeCompare(String(b || ''), undefined, { numeric: true, sensitivity: 'base' });
      });
      return sorted.map(function (id) { return getCleanDescText(id, withText); }).join(';\n');
    }

    var getActLabel = typeof options.getActivityLabel === 'function' ? options.getActivityLabel : function (id) { return id || ''; };
    var getIntLabel = typeof options.getInteractionLabel === 'function' ? options.getInteractionLabel : function (id) { return id || ''; };

    // Sheet 1: Unit Overview
    if (options.includeSummary !== false) {
      var aoaOverview = [];
      aoaOverview.push(['UNIT CURRICULUM SEQUENCE', ((unitSeq && unitSeq.title) || 'Untitled Sequence').toUpperCase()]);
      var subLabel = options.subjectLabel || (unitSeq && unitSeq.subject) || (fullLessons[0] && (fullLessons[0].subject || fullLessons[0].subjectId)) || 'All';
      var clsLabel = options.classLabel || (unitSeq && unitSeq.classId) || (fullLessons[0] && fullLessons[0].classId) || 'All';
      aoaOverview.push(['Subject', subLabel, 'Class', clsLabel]);
      aoaOverview.push(['Total Items', ((unitSeq && unitSeq.lessons) || []).length, 'Lessons', (fullLessons || []).length, 'Tests / Assessments', (fullTests || []).length]);
      aoaOverview.push([]);

      var overviewHeaders = ['#'];
      if (tocCols.showType) overviewHeaders.push('Item Type');
      overviewHeaders.push('Title');
      if (tocCols.showDate) overviewHeaders.push('Date');
      if (tocCols.showDuration) overviewHeaders.push('Duration / Points');
      if (tocCols.showObjectives) overviewHeaders.push('Key Objectives / Details');
      if (options.competenceLayout !== 'none') overviewHeaders.push('Tagged Competences');
      aoaOverview.push(overviewHeaders);

      ((unitSeq && unitSeq.lessons) || []).forEach(function (it, idx) {
        var isTest = (it.type === 'test' || it.category === 'test');
        var typeLabel = isTest ? 'Assessment / Test' : 'Lesson Plan';
        var itemTitle = it.title || (isTest ? ('Test ' + (idx + 1)) : ('Lesson ' + (idx + 1)));
        var itemDate = it.date || '';
        var durPoints = '';
        var details = '';
        var descIds = [];

        if (isTest) {
          var matchTest = (fullTests || []).find(function (t) { return t.id === it.id; });
          if (matchTest) {
            if (!itemDate && matchTest.date) itemDate = matchTest.date;
            var pts = (matchTest.exercises || []).reduce(function (sum, e) { return sum + (Number(e.points) || 0); }, 0);
            durPoints = pts + ' pts';
            details = (matchTest.exercises || []).length + ' exercises';
            if (Array.isArray(matchTest.descriptorIds)) descIds = descIds.concat(matchTest.descriptorIds);
            if (Array.isArray(matchTest.linkedCompetenceIds)) descIds = descIds.concat(matchTest.linkedCompetenceIds);
            (matchTest.exercises || []).forEach(function (ex) {
              if (Array.isArray(ex.descriptorIds)) descIds = descIds.concat(ex.descriptorIds);
              if (Array.isArray(ex.linkedCompetenceIds)) descIds = descIds.concat(ex.linkedCompetenceIds);
              if (Array.isArray(ex.competenceIds)) descIds = descIds.concat(ex.competenceIds);
            });
          } else {
            durPoints = (it.points || 0) + ' pts';
          }
        } else {
          var matchPlan = (fullLessons || []).find(function (l) { return l.id === it.id; });
          if (matchPlan) {
            if (!itemDate && matchPlan.date) itemDate = matchPlan.date;
            var dur = (matchPlan.sections || []).reduce(function (sum, s) { return sum + (Number(s.duration) || 0); }, 0);
            durPoints = dur + ' min';
            var objs = (matchPlan.sections || []).map(function (s) { return s.objective; }).filter(Boolean);
            details = objs.join('; ');
            if (Array.isArray(matchPlan.descriptorIds)) descIds = descIds.concat(matchPlan.descriptorIds);
            (matchPlan.sections || []).forEach(function (s) {
              if (Array.isArray(s.descriptorIds)) descIds = descIds.concat(s.descriptorIds);
            });
          } else {
            durPoints = (it.duration || 0) + ' min';
          }
        }
        var row = [idx + 1];
        if (tocCols.showType) row.push(typeLabel);
        row.push(itemTitle);
        if (tocCols.showDate) row.push(itemDate);
        if (tocCols.showDuration) row.push(durPoints);
        if (tocCols.showObjectives) row.push(details);
        if (options.competenceLayout !== 'none') row.push(getSortedDescString(Array.from(new Set(descIds)), true));
        aoaOverview.push(row);
      });

      var wsOverview = XLSX.utils.aoa_to_sheet(aoaOverview);
      wsOverview['!cols'] = overviewHeaders.map(function (h) {
        if (h === '#') return { wch: 6 };
        if (h === 'Title') return { wch: 30 };
        if (h === 'Key Objectives / Details' || h === 'Tagged Competences') return { wch: 40 };
        return { wch: 18 };
      });
      XLSX.utils.book_append_sheet(wb, wsOverview, 'Unit Overview');
    }

    // Sheet 2: Lesson Plans & Phases
    if (options.includePhases !== false && (fullLessons || []).length > 0) {
      var aoaPhases = [];
      var phaseHeaders = ['Lesson #', 'Lesson Title', 'Phase #'];
      if (lessonToggles.phaseTitle) phaseHeaders.push('Phase Title');
      if (lessonToggles.phaseDuration) phaseHeaders.push('Duration (min)');
      if (lessonToggles.phaseActivity) {
        phaseHeaders.push('Activity Type');
        phaseHeaders.push('Interaction Mode');
      }
      if (lessonToggles.phaseObjective) phaseHeaders.push('Learning Objective');
      if (lessonToggles.phaseTeacher) phaseHeaders.push('Teacher Actions');
      if (lessonToggles.phaseStudent) phaseHeaders.push('Student Tasks');
      if (lessonToggles.phaseResources) phaseHeaders.push('Resources');
      if (lessonToggles.phaseDescriptors) phaseHeaders.push('Tagged Competences');
      if (lessonToggles.phaseDiff) phaseHeaders.push('Differentiation');
      if (lessonToggles.phaseAssess) phaseHeaders.push('Assessment');
      if (lessonToggles.phaseCustomFields) phaseHeaders.push('Custom Fields');
      aoaPhases.push(phaseHeaders);

      (fullLessons || []).forEach(function (plan, lIdx) {
        var lNum = lIdx + 1;
        var lTitle = plan.title || ('Lesson ' + lNum);
        (plan.sections || []).forEach(function (sec, pIdx) {
          var pRow = [lNum, lTitle, pIdx + 1];
          if (lessonToggles.phaseTitle) pRow.push(sec.title || ('Phase ' + (pIdx + 1)));
          if (lessonToggles.phaseDuration) pRow.push(Number(sec.duration) || 0);
          if (lessonToggles.phaseActivity) {
            pRow.push(getActLabel(sec.activityTypeId) || '');
            pRow.push(getIntLabel(sec.interactionTypeId) || '');
          }
          if (lessonToggles.phaseObjective) pRow.push(sec.objective || '');
          if (lessonToggles.phaseTeacher) pRow.push(sec.teacherAction || '');
          if (lessonToggles.phaseStudent) pRow.push(sec.studentAction || '');
          if (lessonToggles.phaseResources) pRow.push(sec.resources || '');
          if (lessonToggles.phaseDescriptors) pRow.push(getSortedDescString(sec.descriptorIds, lessonToggles.phaseDescText));
          if (lessonToggles.phaseDiff) pRow.push(sec.differentiation || '');
          if (lessonToggles.phaseAssess) pRow.push(sec.assessmentStrategy || '');
          if (lessonToggles.phaseCustomFields) {
            var cfStr = Array.isArray(sec.customFields)
              ? sec.customFields.map(function (cf) { return (cf.title || 'Field') + ': ' + (cf.content || ''); }).join(';\n')
              : '';
            pRow.push(cfStr);
          }
          aoaPhases.push(pRow);
        });
      });

      var wsPhases = XLSX.utils.aoa_to_sheet(aoaPhases);
      wsPhases['!cols'] = phaseHeaders.map(function (h) {
        if (h.indexOf('#') !== -1) return { wch: 10 };
        if (h.indexOf('Objective') !== -1 || h.indexOf('Actions') !== -1 || h.indexOf('Tasks') !== -1) return { wch: 35 };
        return { wch: 24 };
      });
      XLSX.utils.book_append_sheet(wb, wsPhases, 'Lessons & Phases');
    }

    // Sheet 3: Assessments & Tests
    if (options.includeTests !== false && (fullTests || []).length > 0) {
      var aoaTests = [];
      var testHeaders = ['Test #', 'Test Title', 'Exercise #', 'Exercise Title', 'Points', 'Instructions'];
      if (options.testCriteriaMode !== 'none') testHeaders.push('Correction Criteria');
      if (options.testCompetencesMode !== 'none') testHeaders.push('Tagged Competences');
      if (options.includeAnswerKeys) testHeaders.push('Answer Key / Solution');
      aoaTests.push(testHeaders);

      (fullTests || []).forEach(function (tst, tIdx) {
        var tNum = tIdx + 1;
        var tTitle = tst.title || ('Assessment ' + tNum);
        (tst.exercises || []).forEach(function (ex, eIdx) {
          var exDescIds = (ex.descriptorIds || []).concat(ex.linkedCompetenceIds || []).concat(ex.competenceIds || []);
          var rubList = Array.isArray(ex.markingRubric) ? ex.markingRubric : (Array.isArray(ex.criteria) ? ex.criteria : []);
          var row = [
            tNum,
            tTitle,
            eIdx + 1,
            ex.title || ('Exercise ' + (eIdx + 1)),
            Number(ex.points) || 0,
            ex.instructions || ex.instruction || (ex.content && typeof ex.content === 'string' ? ex.content : '') || ex.question || ''
          ];
          if (options.testCriteriaMode !== 'none') {
            row.push(rubList.map(function (c) { return (c.title || c.name || '') + ' (' + (c.maxPoints || c.points || 0) + ' pts)'; }).join('; '));
          }
          if (options.testCompetencesMode !== 'none') {
            row.push(getSortedDescString(Array.from(new Set(exDescIds)), true));
          }
          if (options.includeAnswerKeys) {
            var sol = ex.solution || ex.answerKey || ex.answer || '';
            row.push(typeof sol === 'string' ? sol : JSON.stringify(sol));
          }
          aoaTests.push(row);
        });
      });

      var wsTests = XLSX.utils.aoa_to_sheet(aoaTests);
      wsTests['!cols'] = testHeaders.map(function (h) {
        if (h.indexOf('#') !== -1 || h === 'Points') return { wch: 10 };
        if (h === 'Instructions' || h.indexOf('Answer Key') !== -1) return { wch: 38 };
        return { wch: 28 };
      });
      XLSX.utils.book_append_sheet(wb, wsTests, 'Assessments & Tests');
    }

    // Sheet 4: Competences Coverage
    if (options.competenceLayout !== 'none') {
      var usedDescMap = new Map();
      (fullLessons || []).forEach(function (plan, lIdx) {
        var lLabel = 'Lesson ' + (lIdx + 1);
        (plan.sections || []).forEach(function (sec) {
          (sec.descriptorIds || []).forEach(function (id) {
            var tId = String(id || '').toLowerCase().trim();
            var d = descList.find(function (item) { return item && (String(item.id || '').toLowerCase().trim() === tId || String(item.code || '').toLowerCase().trim() === tId); });
            var key = d ? (d.code || d.id) : id;
            if (!usedDescMap.has(key)) {
              usedDescMap.set(key, {
                code: d ? (d.code || '') : key,
                title: d ? (d.title || d.id) : id,
                description: d ? (d.description || d.statement || '') : '',
                category: d ? (d.category || d.subCategory || '') : '',
                subject: d ? (d.subjectId || '') : '',
                targets: new Set()
              });
            }
            usedDescMap.get(key).targets.add(lLabel);
          });
        });
      });

      (fullTests || []).forEach(function (tst, tIdx) {
        var tLabel = 'Test ' + (tIdx + 1);
        (tst.exercises || []).forEach(function (ex) {
          var exIds = (ex.descriptorIds || []).concat(ex.linkedCompetenceIds || []).concat(ex.competenceIds || []);
          exIds.forEach(function (id) {
            var tId = String(id || '').toLowerCase().trim();
            var d = descList.find(function (item) { return item && (String(item.id || '').toLowerCase().trim() === tId || String(item.code || '').toLowerCase().trim() === tId); });
            var key = d ? (d.code || d.id) : id;
            if (!usedDescMap.has(key)) {
              usedDescMap.set(key, {
                code: d ? (d.code || '') : key,
                title: d ? (d.title || d.id) : id,
                description: d ? (d.description || d.statement || '') : '',
                category: d ? (d.category || d.subCategory || '') : '',
                subject: d ? (d.subjectId || '') : '',
                targets: new Set()
              });
            }
            usedDescMap.get(key).targets.add(tLabel);
          });
        });
      });

      if (usedDescMap.size > 0) {
        var compRows = [['Code', 'Standard / Competence Title', 'Description / Text', 'Category', 'Subject', 'Covered In']];
        Array.from(usedDescMap.values()).sort(function (a, b) {
          return String(a.code || a.title).localeCompare(String(b.code || b.title), undefined, { numeric: true, sensitivity: 'base' });
        }).forEach(function (val) {
          compRows.push([val.code, val.title, val.description, val.category, val.subject, Array.from(val.targets).join(', ')]);
        });
        var wsComp = XLSX.utils.aoa_to_sheet(compRows);
        wsComp['!cols'] = [{ wch: 14 }, { wch: 32 }, { wch: 50 }, { wch: 20 }, { wch: 18 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, wsComp, 'Competences Coverage');
      }
    }

    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      var wsFallback = XLSX.utils.aoa_to_sheet([['Unit Sequence', (unitSeq && unitSeq.title) || 'Untitled']]);
      XLSX.utils.book_append_sheet(wb, wsFallback, 'Overview');
    }

    return wb;
  };

  /**
   * Build CSV string for a whole Unit Sequence respecting lesson/test column toggles
   */
  LessonCreatorService.exportSequenceToCsv = function (unitSeq, fullLessons, fullTests, options) {
    options = options || {};
    var descList = Array.isArray(options.allCompetences) ? options.allCompetences : [];
    var ltOpt = options.lessonToggles || {};
    var lessonToggles = {
      phaseTitle: ltOpt.phaseTitle !== false,
      phaseDuration: ltOpt.phaseDuration !== false,
      phaseActivity: ltOpt.phaseActivity !== false,
      phaseObjective: ltOpt.phaseObjective !== false,
      phaseTeacher: ltOpt.phaseTeacher !== false,
      phaseStudent: ltOpt.phaseStudent !== false,
      phaseResources: ltOpt.phaseResources !== false,
      phaseDescriptors: ltOpt.phaseDescriptors !== false,
      phaseDescText: ltOpt.phaseDescText !== false,
      phaseDiff: ltOpt.phaseDiff !== false,
      phaseAssess: ltOpt.phaseAssess !== false,
      phaseCustomFields: ltOpt.phaseCustomFields !== false
    };

    var getActLabel = typeof options.getActivityLabel === 'function' ? options.getActivityLabel : function (id) { return id || ''; };
    var getIntLabel = typeof options.getInteractionLabel === 'function' ? options.getInteractionLabel : function (id) { return id || ''; };

    function escCsv(val) {
      var s = String(val === null || val === undefined ? '' : val);
      if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1 || s.indexOf('\r') !== -1) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }

    function getDescStrCsv(ids, withText) {
      if (!Array.isArray(ids) || ids.length === 0) return '';
      return ids.map(function (id) {
        var tId = String(id || '').toLowerCase().trim();
        var d = descList.find(function (item) {
          return item && (String(item.id || '').toLowerCase().trim() === tId || String(item.code || '').toLowerCase().trim() === tId);
        });
        if (!d) return id;
        if (withText === false) return d.code || d.id || id;
        return (d.code ? (d.code + ': ') : '') + (d.title || d.id);
      }).join('; ');
    }

    var csvRows = [];
    var subLabel = options.subjectLabel || (unitSeq && unitSeq.subject) || (fullLessons[0] && (fullLessons[0].subject || fullLessons[0].subjectId)) || 'All';
    var clsLabel = options.classLabel || (unitSeq && unitSeq.classId) || (fullLessons[0] && fullLessons[0].classId) || 'All';

    if (options.includeSummary !== false) {
      csvRows.push(['# UNIT SEQUENCE', (unitSeq && unitSeq.title) || 'Untitled Sequence'].map(escCsv).join(','));
      csvRows.push(['# Subject', subLabel, '# Class', clsLabel].map(escCsv).join(','));
      csvRows.push(['# Total Lessons', (fullLessons || []).length, '# Total Tests', (fullTests || []).length].map(escCsv).join(','));
      csvRows.push([]);
    }

    var csvHeaders = ['Sequence Item #', 'Item Type', 'Item Title', 'Phase / Exercise #'];
    if (lessonToggles.phaseTitle) csvHeaders.push('Phase / Exercise Title');
    if (lessonToggles.phaseDuration) csvHeaders.push('Duration (min) / Points');
    if (lessonToggles.phaseActivity) csvHeaders.push('Activity / Mode');
    if (lessonToggles.phaseObjective) csvHeaders.push('Learning Objective / Instructions');
    if (lessonToggles.phaseTeacher) csvHeaders.push('Teacher Actions');
    if (lessonToggles.phaseStudent) csvHeaders.push('Student Tasks / Key');
    if (lessonToggles.phaseResources) csvHeaders.push('Resources');
    if (lessonToggles.phaseDescriptors) csvHeaders.push('Tagged Competences');
    if (lessonToggles.phaseDiff || lessonToggles.phaseAssess) csvHeaders.push('Differentiation / Assessment / Criteria');
    if (lessonToggles.phaseCustomFields) csvHeaders.push('Custom Fields');
    csvRows.push(csvHeaders.map(escCsv).join(','));

    ((unitSeq && unitSeq.lessons) || []).forEach(function (it, idx) {
      var isTest = (it.type === 'test' || it.category === 'test');
      var itemNum = idx + 1;
      var itemType = isTest ? 'Assessment' : 'Lesson';
      var itemTitle = it.title || (isTest ? ('Test ' + itemNum) : ('Lesson ' + itemNum));

      if (!isTest) {
        if (options.includePhases === false) return;
        var matchPlan = (fullLessons || []).find(function (l) { return l.id === it.id; });
        var sections = (matchPlan && matchPlan.sections) ? matchPlan.sections : [];
        if (sections.length > 0) {
          sections.forEach(function (sec, pIdx) {
            var r = [itemNum, itemType, itemTitle, pIdx + 1];
            if (lessonToggles.phaseTitle) r.push(sec.title || ('Phase ' + (pIdx + 1)));
            if (lessonToggles.phaseDuration) r.push(Number(sec.duration) || 0);
            if (lessonToggles.phaseActivity) r.push((getActLabel(sec.activityTypeId) || '') + (sec.interactionTypeId ? (' (' + getIntLabel(sec.interactionTypeId) + ')') : ''));
            if (lessonToggles.phaseObjective) r.push(sec.objective || '');
            if (lessonToggles.phaseTeacher) r.push(sec.teacherAction || '');
            if (lessonToggles.phaseStudent) r.push(sec.studentAction || '');
            if (lessonToggles.phaseResources) r.push(sec.resources || '');
            if (lessonToggles.phaseDescriptors) r.push(getDescStrCsv(sec.descriptorIds, lessonToggles.phaseDescText));
            if (lessonToggles.phaseDiff || lessonToggles.phaseAssess) {
              var da = [];
              if (lessonToggles.phaseDiff && sec.differentiation) da.push(sec.differentiation);
              if (lessonToggles.phaseAssess && sec.assessmentStrategy) da.push(sec.assessmentStrategy);
              r.push(da.join(' | '));
            }
            if (lessonToggles.phaseCustomFields) {
              var cfStr = Array.isArray(sec.customFields)
                ? sec.customFields.map(function (cf) { return (cf.title || 'Field') + ': ' + (cf.content || ''); }).join('; ')
                : '';
              r.push(cfStr);
            }
            csvRows.push(r.map(escCsv).join(','));
          });
        } else {
          var emptyRow = [itemNum, itemType, itemTitle, ''];
          while (emptyRow.length < csvHeaders.length) emptyRow.push('');
          csvRows.push(emptyRow.map(escCsv).join(','));
        }
      } else {
        if (options.includeTests === false) return;
        var matchTest = (fullTests || []).find(function (t) { return t.id === it.id; });
        var exercises = (matchTest && matchTest.exercises) ? matchTest.exercises : [];
        if (exercises.length > 0) {
          exercises.forEach(function (ex, eIdx) {
            var exIds = (ex.descriptorIds || []).concat(ex.linkedCompetenceIds || []).concat(ex.competenceIds || []);
            var rubList = Array.isArray(ex.markingRubric) ? ex.markingRubric : (Array.isArray(ex.criteria) ? ex.criteria : []);
            var r = [itemNum, itemType, itemTitle, eIdx + 1];
            if (lessonToggles.phaseTitle) r.push(ex.title || ('Exercise ' + (eIdx + 1)));
            if (lessonToggles.phaseDuration) r.push((Number(ex.points) || 0) + ' pts');
            if (lessonToggles.phaseActivity) r.push('Assessment');
            if (lessonToggles.phaseObjective) r.push(ex.instructions || ex.instruction || (ex.content && typeof ex.content === 'string' ? ex.content : '') || ex.question || '');
            if (lessonToggles.phaseTeacher) r.push('');
            if (lessonToggles.phaseStudent) {
              var sol = options.includeAnswerKeys ? (ex.solution || ex.answerKey || '') : '';
              r.push(typeof sol === 'string' ? sol : JSON.stringify(sol));
            }
            if (lessonToggles.phaseResources) r.push('');
            if (lessonToggles.phaseDescriptors) r.push(options.testCompetencesMode !== 'none' ? getDescStrCsv(Array.from(new Set(exIds)), true) : '');
            if (lessonToggles.phaseDiff || lessonToggles.phaseAssess) {
              r.push(options.testCriteriaMode !== 'none' ? rubList.map(function (c) { return (c.title || c.name || '') + ' (' + (c.maxPoints || c.points || 0) + ' pts)'; }).join('; ') : '');
            }
            if (lessonToggles.phaseCustomFields) r.push('');
            csvRows.push(r.map(escCsv).join(','));
          });
        } else {
          var emptyTRow = [itemNum, itemType, itemTitle, ''];
          while (emptyTRow.length < csvHeaders.length) emptyTRow.push('');
          csvRows.push(emptyTRow.map(escCsv).join(','));
        }
      }
    });

    return csvRows.join('\r\n');
  };

  // Expose to global namespace
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LessonCreatorService;
  }
  global.LessonCreatorService = LessonCreatorService;

})(typeof window !== 'undefined' ? window : global);
