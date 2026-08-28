/**
 * Lesson Creator Service — Shared logic, descriptor presets, schema validation,
 * Constellation Board generator, curriculum coverage compiler, and sound alerts.
 */
(function (global) {
  'use strict';

  var LessonCreatorService = {};

  // ── 1. Default Activity Types ──────────────────────────────────────────────
  LessonCreatorService.DEFAULT_ACTIVITY_TYPES = [
    { id: 'warm_up', name: 'Warm-up / Bell Ringer', icon: 'zap.svg', color: '#f59e0b', bg: '#fef3c7' },
    { id: 'direct_instruction', name: 'Direct Instruction / Mini-Lesson', icon: 'presentation.svg', color: '#2563eb', bg: '#dbeafe' },
    { id: 'guided_practice', name: 'Guided Practice', icon: 'user-check.svg', color: '#059669', bg: '#d1fae5' },
    { id: 'independent_work', name: 'Independent Practice', icon: 'file-text.svg', color: '#4f46e5', bg: '#e0e7ff' },
    { id: 'group_activity', name: 'Group Task / Cooperative Task', icon: 'people-group.svg', color: '#7c3aed', bg: '#ede9fe' },
    { id: 'discussion', name: 'Class Discussion / Socratic', icon: 'speech-bubbles.svg', color: '#db2777', bg: '#fce7f3' },
    { id: 'assessment', name: 'Formative Check / Quiz', icon: 'quiz.svg', color: '#dc2626', bg: '#fee2e2' },
    { id: 'plenary', name: 'Plenary / Exit Ticket', icon: 'check.svg', color: '#0d9488', bg: '#ccfbf1' }
  ];

  // ── 2. Default Student Interaction Types ────────────────────────────────────
  LessonCreatorService.DEFAULT_INTERACTION_TYPES = [
    { id: 'whole_class', name: 'Whole Class', icon: 'people-group.svg' },
    { id: 'teacher_led', name: 'Teacher-Led', icon: 'presentation.svg' },
    { id: 'individual', name: 'Individual (Solo)', icon: 'user-check.svg' },
    { id: 'pairs', name: 'Pair Work (Turn & Talk)', icon: 'group.svg' },
    { id: 'small_groups', name: 'Small Groups (3-4)', icon: 'groups.svg' },
    { id: 'stations', name: 'Stations / Carousel', icon: 'refresh.svg' }
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
    { id: 'science', name: 'Science & STEM', icon: 'lightbulb.svg', color: '#d97706' },
    { id: 'languages', name: 'Modern Languages (CEFR)', icon: 'french.svg', color: '#7c3aed' },
    { id: 'english', name: 'English Language Arts', icon: 'book.svg', color: '#2563eb' },
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

  // Expose to global namespace
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LessonCreatorService;
  }
  global.LessonCreatorService = LessonCreatorService;

})(typeof window !== 'undefined' ? window : global);
