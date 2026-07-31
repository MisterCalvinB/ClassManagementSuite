/**
 * MailpostingService - Mail merge and class field replacement service for Document Editor.
 */
(function (global) {
  'use strict';

  const MailpostingService = {
    /**
     * Standard tags available for quick insertion
     */
    AVAILABLE_TAGS: [
      { id: 'student.fullName', label: 'Student Full Name', tag: '{{student.fullName}}', category: 'Student' },
      { id: 'student.firstName', label: 'Student First Name', tag: '{{student.firstName}}', category: 'Student' },
      { id: 'student.lastName', label: 'Student Last Name', tag: '{{student.lastName}}', category: 'Student' },
      { id: 'student.email', label: 'Student Email', tag: '{{student.email}}', category: 'Student' },
      { id: 'student.id', label: 'Student ID', tag: '{{student.id}}', category: 'Student' },
      { id: 'class.name', label: 'Class Name', tag: '{{class.name}}', category: 'Class' },
      { id: 'class.roster', label: 'Full Roster (Comma-separated)', tag: '{{class.roster}}', category: 'Class' },
      { id: 'class.rosterList', label: 'Full Roster (Line-by-line)', tag: '{{class.rosterList}}', category: 'Class' },
      { id: 'date', label: 'Current Date', tag: '{{date}}', category: 'General' }
    ],

    studentRoster: {},
    classesMeta: {},

    /**
     * Fetch class data from window.CLASS_GROUPS_META, Desktop.readText, localStorage, or fallbacks
     */
    async loadClassGroups() {
      let rawMeta = null;
      let roster = (typeof global.STUDENT_ROSTER !== 'undefined' && global.STUDENT_ROSTER) ? { ...global.STUDENT_ROSTER } : {};

      if (typeof global.STUDENTS_ROSTER !== 'undefined' && Array.isArray(global.STUDENTS_ROSTER)) {
        global.STUDENTS_ROSTER.forEach(s => {
          if (s && (s.uuid || s.id)) roster[s.uuid || s.id] = s;
        });
      }

      // 0. Try loading user/students.js to resolve UUIDs to names
      if (global.Desktop && typeof global.Desktop.readText === 'function') {
        try {
          const res = await global.Desktop.readText('user', 'students.js');
          if (res && res.ok && res.content) {
            const fn = new Function(res.content + '\nreturn (typeof STUDENTS_ROSTER !== "undefined") ? STUDENTS_ROSTER : [];');
            const arr = fn();
            if (Array.isArray(arr)) {
              arr.forEach(s => {
                if (s && (s.uuid || s.id)) roster[s.uuid || s.id] = s;
              });
            }
          }
        } catch (e) {
          console.warn('[MailpostingService] Could not read user/students.js:', e);
        }
      }

      // 1. Check window globals if already loaded via script tags
      if (typeof global.CLASS_GROUPS_META !== 'undefined' && global.CLASS_GROUPS_META && Object.keys(global.CLASS_GROUPS_META).length > 0) {
        rawMeta = global.CLASS_GROUPS_META;
      } else if (typeof global.CLASS_GROUPS_DATA !== 'undefined' && global.CLASS_GROUPS_DATA && global.CLASS_GROUPS_DATA.classGroupsMeta) {
        rawMeta = global.CLASS_GROUPS_DATA.classGroupsMeta;
      } else if (typeof global.CLASS_GROUPS !== 'undefined' && global.CLASS_GROUPS && Object.keys(global.CLASS_GROUPS).length > 0) {
        rawMeta = global.CLASS_GROUPS;
      }

      // 2. Read from user/class-groups.js via Desktop.readText
      if (!rawMeta && global.Desktop && typeof global.Desktop.readText === 'function') {
        try {
          const res = await global.Desktop.readText('user', 'class-groups.js');
          if (res && res.ok && res.content) {
            const fn = new Function(res.content + '\nreturn (typeof CLASS_GROUPS_DATA !== "undefined") ? CLASS_GROUPS_DATA : { classGroupsMeta: (typeof CLASS_GROUPS_META !== "undefined" ? CLASS_GROUPS_META : {}) };');
            const parsed = fn();
            if (parsed && (parsed.classGroupsMeta || parsed.classGroups)) {
              rawMeta = parsed.classGroupsMeta || parsed.classGroups;
            }
          }
        } catch (e) {
          console.warn('[MailpostingService] Failed to load user/class-groups.js:', e);
        }
      }

      // 3. Read from user/config.js via Desktop.readText
      if (!rawMeta && global.Desktop && typeof global.Desktop.readText === 'function') {
        try {
          const res = await global.Desktop.readText('user', 'config.js');
          if (res && res.ok && res.content) {
            const fn = new Function(res.content + '\nreturn (typeof CLASS_MANAGEMENT_CONFIG !== "undefined") ? CLASS_MANAGEMENT_CONFIG : {};');
            const parsed = fn();
            if (parsed && (parsed.classGroupsMeta || parsed.classGroups)) {
              rawMeta = parsed.classGroupsMeta || parsed.classGroups;
            }
          }
        } catch (e) {
          console.warn('[MailpostingService] Failed to load user/config.js:', e);
        }
      }

      // 4. Check localStorage sources (cmt-general-config, cms-class-plans, cmt-class-groups, etc.)
      if (!rawMeta && typeof localStorage !== 'undefined') {
        const lsKeys = ['cmt-general-config', 'cmt-class-groups', 'classGroupsMeta', 'CLASS_GROUPS_META', 'cms-class-plans'];
        for (const k of lsKeys) {
          try {
            const raw = localStorage.getItem(k);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed && parsed.classGroupsMeta && Object.keys(parsed.classGroupsMeta).length > 0) {
                rawMeta = parsed.classGroupsMeta;
                break;
              } else if (parsed && parsed.classGroups && Object.keys(parsed.classGroups).length > 0) {
                rawMeta = parsed.classGroups;
                break;
              } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length > 0) {
                rawMeta = parsed;
                break;
              }
            }
          } catch (e) {}
        }
      }

      // 5. Check grade sheet data in localStorage if present
      if (!rawMeta && typeof localStorage !== 'undefined') {
        try {
          const gsRaw = localStorage.getItem('gs-data') || localStorage.getItem('cmt-grade-sheet');
          if (gsRaw) {
            const parsed = JSON.parse(gsRaw);
            if (parsed && parsed.classes && Array.isArray(parsed.classes)) {
              rawMeta = {};
              parsed.classes.forEach(c => {
                const cId = c.id || c.name || 'Class';
                rawMeta[cId] = {
                  name: c.name || cId,
                  students: Array.isArray(c.students) ? c.students : []
                };
              });
            }
          }
        } catch (e) {}
      }

      // 6. If still no class is found, provide default sample class so user can test immediately
      if (!rawMeta || Object.keys(rawMeta).length === 0) {
        rawMeta = {
          'Class_101': {
            name: 'Class 101 (Sample Roster)',
            students: [
              { id: 'st-1', firstName: 'Alex', lastName: 'Smith', email: 'alex.smith@school.edu' },
              { id: 'st-2', firstName: 'Emma', lastName: 'Johnson', email: 'emma.johnson@school.edu' },
              { id: 'st-3', firstName: 'Lucas', lastName: 'Brown', email: 'lucas.brown@school.edu' }
            ]
          }
        };
      }

      // Filter out archived classes
      const meta = {};
      Object.keys(rawMeta).forEach(k => {
        const c = rawMeta[k];
        if (c && !c.archived && !c.isArchived) {
          meta[k] = c;
        }
      });

      global.CLASS_GROUPS_META = meta;
      this.studentRoster = roster || {};
      this.classesMeta = meta || {};

      return {
        meta: meta || {},
        roster: roster || {}
      };
    },

    /**
     * Normalize raw student data into a structured key-value map, resolving UUIDs to real names
     */
    normalizeStudent(rawStudent, index = 0, roster = null) {
      const activeRoster = (roster && typeof roster === 'object' && Object.keys(roster).length > 0)
        ? roster
        : ((this.studentRoster && Object.keys(this.studentRoster).length > 0)
          ? this.studentRoster
          : ((global.mpState && global.mpState.studentRoster && Object.keys(global.mpState.studentRoster).length > 0)
            ? global.mpState.studentRoster
            : ((typeof global.STUDENT_ROSTER !== 'undefined' && global.STUDENT_ROSTER)
              ? global.STUDENT_ROSTER
              : ((typeof global.STUDENTS_ROSTER !== 'undefined' && Array.isArray(global.STUDENTS_ROSTER))
                ? Object.fromEntries(global.STUDENTS_ROSTER.filter(s => s && (s.uuid || s.id)).map(s => [s.uuid || s.id, s]))
                : {}))));

      if (!rawStudent) {
        return {
          id: `st-${index + 1}`,
          firstName: `Student`,
          lastName: `${index + 1}`,
          fullName: `Student ${index + 1}`,
          email: ''
        };
      }

      // Case A: rawStudent is a string (UUID like "st-1684729104" or plain name "John Doe")
      if (typeof rawStudent === 'string') {
        const key = rawStudent.trim();

        // 1. Resolve UUID in roster dictionary
        if (activeRoster[key]) {
          const s = activeRoster[key];
          const fn = (s.firstName || s.first_name || '').trim();
          const ln = (s.lastName || s.last_name || '').trim();
          const full = s.fullName || s.full_name || ((fn && ln) ? `${fn} ${ln}` : (fn || ln || `Student ${index + 1}`));
          return {
            id: s.uuid || s.id || key,
            firstName: fn || full,
            lastName: ln,
            fullName: full,
            email: s.email || s.mail || '',
            ...s
          };
        }

        // 2. If it's a UUID string ('st-...') without roster entry, construct readable fallback name
        if (key.startsWith('st-')) {
          return {
            id: key,
            firstName: `Student`,
            lastName: `${index + 1}`,
            fullName: `Student ${index + 1}`,
            email: ''
          };
        }

        // 3. Otherwise treat as a plain name string ("Jane Doe")
        const parts = key.split(/\s+/);
        const fn = parts[0] || key;
        const ln = parts.slice(1).join(' ') || '';
        return {
          id: `st-${index + 1}`,
          firstName: fn,
          lastName: ln,
          fullName: key,
          email: ''
        };
      }

      // Case B: rawStudent is an object
      let targetObj = { ...rawStudent };
      const targetId = rawStudent.uuid || rawStudent.id || rawStudent.studentId;

      if (targetId && activeRoster[targetId]) {
        targetObj = { ...activeRoster[targetId], ...rawStudent };
      }

      const fn = (targetObj.firstName || targetObj.first_name || targetObj.name || '').trim();
      const ln = (targetObj.lastName || targetObj.last_name || '').trim();
      let full = targetObj.fullName || targetObj.full_name;

      if (!full || typeof full !== 'string' || full.startsWith('st-')) {
        full = (fn && ln) ? `${fn} ${ln}` : (fn || ln || (targetId && !targetId.startsWith('st-') ? targetId : `Student ${index + 1}`));
      }

      return {
        id: targetId || `st-${index + 1}`,
        firstName: fn || full,
        lastName: ln,
        fullName: full,
        email: targetObj.email || targetObj.mail || '',
        grade: targetObj.grade || targetObj.score || '',
        comment: targetObj.comment || targetObj.comments || '',
        ...targetObj
      };
    },

    /**
     * Replace tag placeholders in a template with student and class variables
     */
    renderTemplate(templateText, student = {}, classInfo = {}, options = {}) {
      if (typeof templateText !== 'string') return '';

      const today = options.date || new Date().toLocaleDateString();
      const className = (classInfo && classInfo.name) ? classInfo.name : (options.className || '');
      const isHtml = !!(options.isHtml || options.isHtmlMode);

      const rosterMap = (options.roster && Object.keys(options.roster).length > 0)
        ? options.roster
        : (this.studentRoster || (global.mpState && global.mpState.studentRoster) || {});

      let rawStudents = (classInfo && Array.isArray(classInfo.students) && classInfo.students.length > 0)
        ? classInfo.students
        : (Array.isArray(options.students) && options.students.length > 0
          ? options.students
          : (classInfo && classInfo.id && this.classesMeta && this.classesMeta[classInfo.id] && Array.isArray(this.classesMeta[classInfo.id].students)
            ? this.classesMeta[classInfo.id].students
            : []));

      let rosterNames = [];
      if (rawStudents.length > 0) {
        rosterNames = rawStudents.map((st, idx) => {
          const norm = this.normalizeStudent(st, idx, rosterMap);
          return norm.fullName || norm.name || `${norm.firstName} ${norm.lastName}`.trim();
        }).filter(Boolean);
      }

      const rosterCommaStr = rosterNames.join(', ');
      const rosterListStr = isHtml
        ? rosterNames.map(n => `• ${n}`).join('<br>')
        : rosterNames.map(n => `• ${n}`).join('\n');

      const dict = {
        'student.fullname': student.fullName || '',
        'student.name': student.fullName || '',
        'name': student.fullName || '',
        'student.firstname': student.firstName || '',
        'firstname': student.firstName || '',
        'student.lastname': student.lastName || '',
        'lastname': student.lastName || '',
        'student.email': student.email || '',
        'email': student.email || '',
        'student.id': student.id || '',
        'id': student.id || '',
        'student.grade': student.grade || '',
        'grade': student.grade || '',
        'student.comment': student.comment || '',
        'comment': student.comment || '',
        'class.name': className,
        'classname': className,
        'class': className,
        'class.roster': rosterCommaStr,
        'roster': rosterCommaStr,
        'class.rosterlist': rosterListStr,
        'rosterlist': rosterListStr,
        'date': today,
        'teacher.name': options.teacherName || ''
      };

      // Custom attributes on student object
      Object.keys(student).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (!dict.hasOwnProperty(`student.${lowerKey}`)) {
          dict[`student.${lowerKey}`] = String(student[key] ?? '');
        }
        if (!dict.hasOwnProperty(lowerKey)) {
          dict[lowerKey] = String(student[key] ?? '');
        }
      });

      return templateText.replace(/{{\s*([\w.-]+)\s*}}/gi, function (match, tagKey) {
        const key = tagKey.trim().toLowerCase();
        if (dict.hasOwnProperty(key)) {
          return dict[key];
        }
        return match; // keep tag if unresolved or option missing
      });
    },

    /**
     * Generate HTML for batch combined export (single document with page breaks)
     */
    renderBatchCombinedHtml(templateText, isHtmlMode, studentsList, classInfo, parseMdFn, options = {}) {
      if (!Array.isArray(studentsList) || studentsList.length === 0) {
        return '';
      }

      const opts = { ...options, isHtml: isHtmlMode, isHtmlMode: isHtmlMode };

      const pagesHtml = studentsList.map((student, idx) => {
        const renderedText = this.renderTemplate(templateText, student, classInfo, opts);
        let pageBody = '';
        if (isHtmlMode) {
          pageBody = renderedText;
        } else if (typeof parseMdFn === 'function') {
          pageBody = parseMdFn(renderedText);
        } else {
          pageBody = renderedText;
        }

        const isLast = idx === studentsList.length - 1;
        const pageBreakStyle = isLast ? '' : 'style="page-break-after: always; break-after: page;"';

        return `<div class="mailposting-student-page" ${pageBreakStyle}>\n${pageBody}\n</div>`;
      });

      return pagesHtml.join('\n\n<hr class="mailposting-page-break-hr" style="page-break-after: always; break-after: page; border: none; margin: 0; padding: 0;">\n\n');
    },

    /**
     * Generate individual document objects for separate files export
     */
    renderBatchIndividualDocs(templateText, isHtmlMode, studentsList, classInfo, docTitle = 'document', parseMdFn = null, options = {}) {
      if (!Array.isArray(studentsList)) return [];

      const opts = { ...options, isHtml: isHtmlMode, isHtmlMode: isHtmlMode };

      const cleanDocTitle = (docTitle || 'document').replace(/[/\\?%*:|"<>]/g, '_');
      const cleanClassName = ((classInfo && classInfo.name) ? classInfo.name : 'class').replace(/[/\\?%*:|"<>]/g, '_');

      return studentsList.map((student, idx) => {
        const renderedText = this.renderTemplate(templateText, student, classInfo, opts);
        const studentName = (student.fullName || `Student_${idx + 1}`).replace(/[/\\?%*:|"<>]/g, '_');
        const filename = `${cleanClassName}_${studentName}_${cleanDocTitle}`;

        let processedContent = renderedText;
        if (!isHtmlMode && typeof parseMdFn === 'function') {
          processedContent = parseMdFn(renderedText);
        }

        return {
          student,
          filename,
          rawRenderedText: renderedText,
          processedContent
        };
      });
    }
  };

  global.MailpostingService = MailpostingService;

})(typeof window !== 'undefined' ? window : this);
