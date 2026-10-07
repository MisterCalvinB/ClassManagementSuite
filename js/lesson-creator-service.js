/**
 * Lesson Creator Service — Shared logic, descriptor presets, schema validation,
 * Constellation Board generator, curriculum coverage compiler, and sound alerts.
 */
(function (global) {
  'use strict';

  var LessonCreatorService = {};

  // ── 1. Default Activity Types ──────────────────────────────────────────────
  LessonCreatorService.DEFAULT_ACTIVITY_TYPES = [
    { id: 'warm_up', name: 'Warm-up / Bell Ringer', shortName: 'Warm-up', name_fr: 'Mise en route / Échauffement', shortName_fr: 'Mise en route', icon: 'zap.svg', color: '#b45309', bg: '#fef3c7' },
    { id: 'direct_instruction', name: 'Direct Instruction / Mini-Lesson', shortName: 'Direct Instruction', name_fr: 'Enseignement explicite / Cours', shortName_fr: 'Cours', icon: 'presentation.svg', color: '#1d4ed8', bg: '#dbeafe' },
    { id: 'guided_practice', name: 'Guided Practice', shortName: 'Guided Practice', name_fr: 'Pratique guidée', shortName_fr: 'Pratique guidée', icon: 'user-check.svg', color: '#047857', bg: '#d1fae5' },
    { id: 'independent_work', name: 'Independent Practice', shortName: 'Independent', name_fr: 'Travail autonome', shortName_fr: 'Autonome', icon: 'file-text.svg', color: '#4338ca', bg: '#e0e7ff' },
    { id: 'group_activity', name: 'Group Task / Cooperative Task', shortName: 'Group Task', name_fr: 'Travail de groupe / Coopératif', shortName_fr: 'Travail de groupe', icon: 'people-group.svg', color: '#6d28d9', bg: '#ede9fe' },
    { id: 'discussion', name: 'Class Discussion / Socratic', shortName: 'Discussion', name_fr: 'Discussion / Débat collectif', shortName_fr: 'Discussion', icon: 'speech-bubbles.svg', color: '#be185d', bg: '#fce7f3' },
    { id: 'assessment', name: 'Formative Check / Quiz', shortName: 'Quiz / Check', name_fr: 'Évaluation formative / Quiz', shortName_fr: 'Quiz', icon: 'quiz.svg', color: '#b91c1c', bg: '#fee2e2' },
    { id: 'plenary', name: 'Plenary / Exit Ticket', shortName: 'Plenary', name_fr: 'Bilan / Billet de sortie', shortName_fr: 'Bilan', icon: 'check.svg', color: '#0f766e', bg: '#ccfbf1' }
  ];

  // ── 2. Default Student Interaction Types ────────────────────────────────────
  LessonCreatorService.DEFAULT_INTERACTION_TYPES = [
    { id: 'whole_class', name: 'Whole Class', shortName: 'Whole Class', name_fr: 'Classe entière', shortName_fr: 'Classe entière', icon: 'people-group.svg' },
    { id: 'teacher_led', name: 'Teacher-Led', shortName: 'Teacher-Led', name_fr: 'Frontal / Magistral', shortName_fr: 'Frontal', icon: 'presentation.svg' },
    { id: 'individual', name: 'Individual (Solo)', shortName: 'Solo', name_fr: 'Travail individuel (Solo)', shortName_fr: 'Solo', icon: 'user-check.svg' },
    { id: 'pairs', name: 'Pair Work (Turn & Talk)', shortName: 'Pairs', name_fr: 'En binôme (Pair-work)', shortName_fr: 'Binômes', icon: 'group.svg' },
    { id: 'small_groups', name: 'Small Groups (3-4)', shortName: 'Small Groups', name_fr: 'En petits groupes (3-4)', shortName_fr: 'Groupes', icon: 'groups.svg' },
    { id: 'stations', name: 'Stations / Carousel', shortName: 'Stations', name_fr: 'Ateliers / Carrousel', shortName_fr: 'Ateliers', icon: 'refresh.svg' }
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
          '  .unit-hero, .unit-toc, .unit-lesson-card, .unit-exam-card { box-shadow: none !important; border: 1px solid #cbd5e1 !important; page-break-inside: avoid; }\n' +
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
        '  .unit-hero, .unit-toc, .unit-lesson-card, .unit-exam-card { box-shadow: none !important; border: 1.5px solid #000 !important; page-break-inside: avoid; }\n' +
        '  .unit-comp-matrix { box-shadow: none !important; border: 1.5px solid #000 !important; page-break-inside: avoid; }\n' +
        '  .unit-page-break { page-break-before: always !important; }\n' +
        '  @page { margin: 12mm 10mm; size: A4 portrait; }\n' +
        '}\n';
    }

    var css = getThemeCss(cssTheme);

    // Helper: Competence Lookup & Extraction
    var compLookup = {};
    if (Array.isArray(options.allCompetences)) {
      options.allCompetences.forEach(function (c) {
        if (c && (c.id || c.code)) {
          if (c.id) compLookup[c.id] = c;
          if (c.code) compLookup[c.code] = c;
        }
      });
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
    var includeGradingScale = (options.includeGradingScale !== false);
    var includeAnswerKeys = !!options.includeAnswerKeys;

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

    var rowIdx = 1;
    items.forEach(function (it) {
      var isTest = (it.type === 'test' || it.category === 'test' || it.category === 'summative');
      var badgeClass = isTest ? 'unit-item-badge test' : 'unit-item-badge lesson';
      var badgeText = isTest ? '[TEST / EXAM]' : '[LESSON ' + rowIdx + ']';
      var itemLabel = isTest ? ('Assessment ' + rowIdx) : ('Lesson ' + rowIdx);
      var durOrPts = isTest ? 'Exam' : 'Lesson';

      if (!isTest) {
        var matchL = (fullLessons || []).find(function (fl) { return fl.id === it.id; });
        if (matchL) {
          var lDur = (matchL.sections || []).reduce(function (sum, s) { return sum + (Number(s.duration) || 0); }, 0);
          durOrPts = (lDur || matchL.targetDuration || 60) + ' min';
        }
      } else {
        var matchT = (fullTests || []).find(function (ft) { return ft.id === it.id; });
        if (matchT) {
          var tPts = (matchT.exercises || []).reduce(function (sum, e) { return sum + (Number(e.points) || 0); }, 0);
          durOrPts = tPts + ' pts';
        }
      }

      var itemComps = extractItemCompetences(it);
      itemComps.forEach(function (cId) {
        if (!sequenceCoverageMap[cId]) {
          var compInfo = compLookup[cId] || {};
          sequenceCoverageMap[cId] = {
            code: cId,
            title: compInfo.title || compInfo.name || cId,
            category: compInfo.category || compInfo.theme || '',
            level: compInfo.level || compInfo.tier || '',
            targets: []
          };
        }
        sequenceCoverageMap[cId].targets.push({
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

      html +=
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
            '            <div class="unit-comp-card-links"><strong>Addressed in:</strong> ' + targetsHtml + '</div>\n' +
            '          </div>\n';
        });

        html +=
          '        </div>\n' +
          '      </div>\n';
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

        if (cssTheme === 'horizontal_table') {
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
            '          </tr>\n' +
            '        </thead>\n' +
            '        <tbody>\n';

          (plan.sections || []).forEach(function (sec, pIdx) {
            var secDur = (Number(sec.duration) || 10);
            var hasTeacher = !!(sec.teacherAction && String(sec.teacherAction).trim());
            var hasStudent = !!(sec.studentAction && String(sec.studentAction).trim());

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
            }).join('');

            var actBadge = sec.activityType ? ('<span class="unit-item-badge lesson" style="font-size:0.68rem;margin-top:2px;">' + escapeHtml(sec.activityType) + '</span>') : '';
            var modeBadge = sec.interactionMode ? ('<span class="unit-item-badge" style="font-size:0.68rem;background:#f1f5f9;margin-top:2px;">' + escapeHtml(sec.interactionMode) + '</span>') : '';

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
          });

          html +=
            '        </tbody>\n' +
            '      </table>\n';
        } else {
          (plan.sections || []).forEach(function (sec, pIdx) {
            var hasTeacher = !!(sec.teacherAction && String(sec.teacherAction).trim());
            var hasStudent = !!(sec.studentAction && String(sec.studentAction).trim());

            html +=
              '      <div class="phase-row">\n' +
              '        <div class="phase-hdr">\n' +
              '          <span>Phase ' + (pIdx + 1) + ': ' + escapeHtml(sec.title || 'Activity') + '</span>\n' +
              '          <span>' + (Number(sec.duration) || 10) + ' min</span>\n' +
              '        </div>\n' +
              (sec.objective ? '        <div class="phase-obj"><strong>Objective:</strong> ' + escapeHtml(sec.objective) + '</div>\n' : '');

            if (hasTeacher || hasStudent) {
              html += '        <div class="phase-actions">\n';
              if (hasTeacher) {
                html += '          <div class="action-box"><span class="action-tag">Teacher Actions</span>' + escapeHtml(sec.teacherAction) + '</div>\n';
              }
              if (hasStudent) {
                html += '          <div class="action-box"><span class="action-tag">Student Actions</span>' + escapeHtml(sec.studentAction) + '</div>\n';
              }
              html += '        </div>\n';
            }

            if (sec.resources) {
              html += '        <div style="font-size:0.75rem;margin-top:4px;"><strong>Materials:</strong> ' + escapeHtml(sec.resources) + '</div>\n';
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

        html +=
          '    <div class="unit-exam-card unit-page-break">\n' +
          '      <div class="unit-card-hdr">\n' +
          '        <div>\n' +
          '          <span class="unit-item-badge test">[ASSESSMENT / EXAM]</span>\n' +
          '          <h2 class="unit-card-title">' + escapeHtml(test.title || 'Unit Examination') + '</h2>\n' +
          '        </div>\n' +
          '        <div style="font-weight:800;font-size:0.85rem;color:#9d174d;">' + tPts + ' pts • ' + (test.duration || 45) + ' min</div>\n' +
          '      </div>\n';

        // 4a. Test-Wide Competences (if not placed as an in-flow section block)
        if (!hasSectionComps && testCompetencesMode !== 'none') {
          var testWideComps = (Array.isArray(test.linkedCompetences) && test.linkedCompetences.length)
            ? test.linkedCompetences
            : (Array.isArray(test.linkedCompetenceIds) ? test.linkedCompetenceIds : []);
          if (testWideComps.length > 0) {
            testWideComps = testWideComps.slice().sort(function (a, b) {
              var ca = (a && (a.code || a.id)) || String(a || '');
              var cb = (b && (b.code || b.id)) || String(b || '');
              return ca.localeCompare(cb, undefined, { numeric: true, sensitivity: 'base' });
            });
            if (typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.renderCompetencesHtml === 'function') {
              html += '      <div style="margin-bottom:12px;">' + TestCreatorService.renderCompetencesHtml(test, { displayMode: testCompetencesMode === 'detailed' ? 'table' : 'badges' }) + '</div>\n';
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
              html += '      <div style="margin-bottom:12px;">' + TestCreatorService.renderCriteriaHtml(test, { displayMode: testCriteriaMode === 'detailed' ? 'table' : 'compact' }) + '</div>\n';
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
          }
        }

        // 4c. Test Grading Scale & Conversion (if not placed as an in-flow section block)
        if (!hasSectionScale && includeGradingScale && (test.scaleModel || test.scaleModelId) && test.scaleModelId !== 'none') {
          if (typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.renderGradingScaleHtml === 'function') {
            html += '      <div style="margin-bottom:12px;">' + TestCreatorService.renderGradingScaleHtml(test, { totalPoints: tPts }) + '</div>\n';
          }
        }

        // 4d. Exercises and In-flow Section Blocks
        var questionCounter = 0;
        (test.exercises || []).forEach(function (ex, eIdx) {
          if (ex.type === 'section_competences') {
            if (typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.renderCompetencesHtml === 'function') {
              html += '      <div style="margin-bottom:12px;">' + TestCreatorService.renderCompetencesHtml(test, { title: ex.title || 'Competences & Curriculum Objectives', displayMode: (ex.options && ex.options.displayMode) || 'table' }) + '</div>\n';
            } else {
              var sComps = (Array.isArray(test.linkedCompetences) && test.linkedCompetences.length) ? test.linkedCompetences : (Array.isArray(test.linkedCompetenceIds) ? test.linkedCompetenceIds : []);
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
          }
          if (ex.type === 'section_criteria') {
            if (typeof TestCreatorService !== 'undefined' && typeof TestCreatorService.renderCriteriaHtml === 'function') {
              html += '      <div style="margin-bottom:12px;">' + TestCreatorService.renderCriteriaHtml(test, { title: ex.title || 'Assessment Criteria & Evaluation Rubric', displayMode: (ex.options && ex.options.displayMode) || 'table' }) + '</div>\n';
            } else {
              var sCrits = (Array.isArray(test.criteria) && test.criteria.length) ? test.criteria : (Array.isArray(test.linkedCriteria) ? test.linkedCriteria : []);
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
          }

          questionCounter++;
          html +=
            '      <div class="ex-item-card">\n' +
            '        <div style="display:flex;justify-content:space-between;font-weight:800;font-size:0.9rem;border-bottom:1.5px solid #000;padding-bottom:4px;margin-bottom:6px;">\n' +
            '          <span>Exercise ' + questionCounter + ': ' + escapeHtml(ex.title || (ex.type ? ex.type.toUpperCase() : 'Task')) + '</span>\n' +
            '          <span>/' + (ex.points || 1) + ' pts</span>\n' +
            '        </div>\n' +
            (ex.instructions ? '        <div style="font-size:0.85rem;font-style:italic;margin-bottom:6px;">' + escapeHtml(ex.instructions) + '</div>\n' : '');

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
            }
          }

          // Optional Teacher Solution Key
          if (includeAnswerKeys && ex.solution) {
            html += '        <div style="margin-top:6px;padding:6px 8px;background:#fef3c7;border:1px dashed #d97706;border-radius:4px;font-size:0.8rem;color:#92400e;"><strong>Teacher Solution Key:</strong> ' + escapeHtml(typeof ex.solution === 'string' ? ex.solution : JSON.stringify(ex.solution)) + '</div>\n';
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

            exComps.sort(function (a, b) {
              return String(a.code || a.title).localeCompare(String(b.code || b.title), undefined, { numeric: true, sensitivity: 'base' });
            });

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
              }
            }
          }

          html += '      </div>\n';
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

  LessonCreatorService.exportSequenceToMarkdown = function (unitSeq, fullLessons, fullTests, options) {
    options = options || {};
    var title = (unitSeq && unitSeq.title) || 'Unit Curriculum Sequence';
    var subject = (unitSeq && unitSeq.subject) || (fullLessons[0] && (fullLessons[0].subject || fullLessons[0].subjectId)) || '';
    var className = (unitSeq && unitSeq.classId) || (fullLessons[0] && fullLessons[0].classId) || '';
    var compLayout = options.competenceLayout || 'column';
    var testCriteriaMode = options.testCriteriaMode || 'compact';
    var testCompetencesMode = options.testCompetencesMode || 'compact';
    var includeGradingScale = (options.includeGradingScale !== false);
    var includeAnswerKeys = !!options.includeAnswerKeys;

    var md = '# ' + title + '\n\n';
    md += '**Subject:** ' + (subject || 'General') + ' | **Class:** ' + (className || 'N/A') + ' | **Total Lessons:** ' + (fullLessons || []).length + '\n\n';
    md += '## Sequence Structure\n\n';

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
          });
        }
      }
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

      var compSuffix = '';
      if (compLayout !== 'none' && comps.length > 0) {
        compSuffix = ' — *[' + comps.join(', ') + ']*';
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
      });
      md += '\n';
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
          md += '\n';
        });
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
          }
        });
        md += '---\n\n';
      });
    }

    return md;
  };

  // Expose to global namespace
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LessonCreatorService;
  }
  global.LessonCreatorService = LessonCreatorService;

})(typeof window !== 'undefined' ? window : global);
