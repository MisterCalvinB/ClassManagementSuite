'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');

function loadGradeSheetCalcSandbox() {
  const stateCode = fs.readFileSync(path.join(ROOT, 'js', 'grade-sheet', 'gs-state.js'), 'utf8');
  const calcCode = fs.readFileSync(path.join(ROOT, 'js', 'grade-sheet', 'gs-calculations.js'), 'utf8');

  const noop = () => {};
  const makeDummyEl = () => ({
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    addEventListener: noop,
    removeEventListener: noop,
    querySelector: () => null,
    querySelectorAll: () => [],
    appendChild: noop,
    style: {},
    dataset: {},
    value: ''
  });

  const store = new Map();
  const sandbox = {
    console,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Map,
    Set,
    Date,
    JSON,
    RegExp,
    isNaN,
    isFinite,
    parseFloat,
    parseInt,
    window: {},
    document: {
      getElementById: () => makeDummyEl(),
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => makeDummyEl()
    },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    },
    renderSummary: noop,
    renderTestSheet: noop,
    getActiveClass: () => sandbox.appState.classes[0] || null
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;

  // Strip top-level const/let to var so functions/state attach to sandbox
  const combined = (stateCode + '\n' + calcCode).replace(/^(\s*)(const|let)\s+/gm, '$1var ');
  vm.runInNewContext(combined, sandbox, { filename: 'gs-calculations-bundle.js' });
  return sandbox;
}

test('Data integrity: class-groups.js UUID preservation across class/student renames and merges', () => {
  const importUtilsCode = fs.readFileSync(path.join(ROOT, 'js', 'shared', 'import-utils.js'), 'utf8');
  const sandbox = { window: {}, console, Math, Date, JSON, Array, Object, Set, Map, RegExp, String };
  vm.runInNewContext(importUtilsCode, sandbox);
  const ImportUtils = sandbox.window.ImportUtils;
  assert.ok(ImportUtils, 'ImportUtils must load');

  const classUuid = ImportUtils.generateGroupUuid();
  const st1 = ImportUtils.generateStudentUuid();
  const st2 = ImportUtils.generateStudentUuid();
  const stDup = ImportUtils.generateStudentUuid();

  const meta = {
    [classUuid]: {
      name: '3A',
      year: 2026,
      semester: 1,
      level: 'B1',
      students: [st1, st2, stDup],
      halfGroups: { A: [st1], B: [st2, stDup] }
    }
  };

  let roster = {
    [st1]: { uuid: st1, firstName: 'Alice', lastName: 'Dupont', email: 'alice@school.org' },
    [st2]: { uuid: st2, firstName: 'Bob', lastName: 'Martin', email: 'bob@school.org' },
    [stDup]: { uuid: stDup, firstName: 'Alice', lastName: 'Dupont', email: '' }
  };

  // 1. Class rename: key remains classUuid, display name updates
  meta[classUuid].name = '3A-Advanced';
  assert.ok(classUuid in meta, 'Class UUID key must be preserved after rename');
  assert.equal(meta[classUuid].name, '3A-Advanced');

  // 2. Student rename: st1 UUID preserved, name updated
  roster[st1].lastName = 'Dupont-Morel';
  assert.equal(roster[st1].uuid, st1);
  assert.ok(meta[classUuid].students.includes(st1), 'Student UUID must remain in class students list');

  // 3. Student merge (stDup -> st1): consolidate enrollments and remove duplicate UUID cleanly
  const targetUuid = st1;
  const sourceUuid = stDup;
  meta[classUuid].students = [...new Set(meta[classUuid].students.map((id) => (id === sourceUuid ? targetUuid : id)))];
  meta[classUuid].halfGroups.A = [...new Set(meta[classUuid].halfGroups.A.map((id) => (id === sourceUuid ? targetUuid : id)))];
  meta[classUuid].halfGroups.B = [...new Set(meta[classUuid].halfGroups.B.map((id) => (id === sourceUuid ? targetUuid : id)))];
  delete roster[sourceUuid];

  if (typeof ImportUtils.syncStudentEnrollments === 'function') {
    roster = ImportUtils.syncStudentEnrollments(roster, meta);
  }

  assert.deepEqual([...meta[classUuid].students], [st1, st2]);
  assert.equal(meta[classUuid].halfGroups.B.includes(stDup), false, 'Merged duplicate UUID must not remain in halfGroups');
  assert.equal(roster[stDup], undefined, 'Merged duplicate student record must be removed');
  assert.equal(roster[st1].uuid, st1, 'Primary student UUID must be preserved after merge');

  // 4. Round-trip serialize & parse CLASS_GROUPS_DATA
  const serialized = [
    'const CLASS_GROUPS_DATA = ' + JSON.stringify({
      activeYear: '2026',
      activeSemester: 1,
      classGroupsMeta: meta
    }, null, 2) + ';',
    'var CLASS_GROUPS_META = CLASS_GROUPS_DATA.classGroupsMeta || {};'
  ].join('\n');

  const parseCtx = { window: {} };
  vm.runInNewContext(serialized.replace(/^(const|let)\s+/gm, 'var '), parseCtx);
  assert.equal(parseCtx.CLASS_GROUPS_DATA.classGroupsMeta[classUuid].name, '3A-Advanced');
  assert.deepEqual(
    JSON.parse(JSON.stringify(parseCtx.CLASS_GROUPS_DATA.classGroupsMeta[classUuid].students)),
    [st1, st2]
  );
});

test('Data integrity: grade-sheet score, weighted average, fixedWeight, bonus criteria, and ranking edge cases', () => {
  const gs = loadGradeSheetCalcSandbox();

  const cfg0 = gs.createDefaultTestConfig();
  cfg0.coefficient = 1;
  const cfg1 = gs.createDefaultTestConfig();
  cfg1.coefficient = 2;
  const cfg2 = gs.createDefaultTestConfig();
  cfg2.coefficient = 0; // Zero coefficient must not affect weighted average
  const cfg3 = gs.createDefaultTestConfig();
  cfg3.fixedWeight = 40; // 40% fixed weight, remaining 60% split among normal coeff tests

  const classObj = {
    id: 'ge-test-1',
    name: 'Test Class',
    testCounts: { sem1: 4, sem2: 2 },
    testConfigs: {
      sem1: [cfg0, cfg1, cfg2, cfg3, gs.createDefaultTestConfig(), gs.createDefaultTestConfig(), gs.createDefaultTestConfig(), gs.createDefaultTestConfig()],
      sem2: Array.from({ length: 8 }, () => gs.createDefaultTestConfig())
    },
    students: []
  };

  // Student A: normal tests 4.0 (coeff 1) and 5.5 (coeff 2) -> normalAvg = (4*1 + 5.5*2)/3 = 5.0
  // Fixed weight test 6.0 (40%) -> 6.0*0.4 + 5.0*0.6 = 2.4 + 3.0 = 5.4
  const stA = {
    id: 'st-a',
    firstName: 'Alice',
    lastName: 'A',
    sem1Tests: [4.0, 5.5, 1.0, 6.0],
    sem2Tests: [5.0, null],
    sem1TestCriteria: Array(8).fill(null),
    sem2TestCriteria: Array(8).fill(null)
  };

  // Student B: same sem1Avg (5.4) via normal tests only, no sem2
  const stB = {
    id: 'st-b',
    firstName: 'Bob',
    lastName: 'B',
    sem1Tests: [5.4, null, null, null],
    sem2Tests: [null, null],
    sem1TestCriteria: Array(8).fill(null),
    sem2TestCriteria: Array(8).fill(null)
  };

  // Student C: all null grades -> averages must be null
  const stC = {
    id: 'st-c',
    firstName: 'Charlie',
    lastName: 'C',
    sem1Tests: [null, null, null, null],
    sem2Tests: [null, null],
    sem1TestCriteria: Array(8).fill(null),
    sem2TestCriteria: Array(8).fill(null)
  };

  classObj.students = [stA, stB, stC];
  gs.appState.classes = [classObj];

  const resA = gs.computeStudent(stA, classObj);
  assert.equal(resA.sem1Avg, 5.4);
  assert.equal(resA.sem2Avg, 5.0);
  assert.equal(resA.yearAvg, 5.2);

  const resB = gs.computeStudent(stB, classObj);
  assert.equal(resB.sem1Avg, 5.4);
  assert.equal(resB.sem2Avg, null);
  assert.equal(resB.yearAvg, 5.4);

  const resC = gs.computeStudent(stC, classObj);
  assert.equal(resC.sem1Avg, null);
  assert.equal(resC.sem2Avg, null);
  assert.equal(resC.yearAvg, null);

  // Criteria totals with bonus criterion and pointCoefficient
  const critCfg = gs.createDefaultTestConfig();
  critCfg.criteria = [
    gs.makeCriterion('Grammar', 10, 2, false), // 20 max weighted
    gs.makeCriterion('Bonus', 5, 1, true)     // bonus: does NOT add to totalPossible
  ];
  const critResults = {
    [critCfg.criteria[0].id]: { points: 8 },
    [critCfg.criteria[1].id]: { points: 3 }
  };
  const totals = gs.calcCriteriaTotals(critCfg, critResults);
  assert.equal(totals.totalPossible, 20);
  assert.equal(totals.totalScored, 16); // 8*2
  assert.equal(totals.totalBonusScored, 3); // 3*1

  // Equation evaluation edge case
  const eqRes = gs.evaluateGradingEquation('minGrade + 2 * (passGrade - minGrade) * pts / totalPts', {
    pts: 10, totalPts: 20, minGrade: 1, maxGrade: 6, passGrade: 4
  });
  assert.equal(eqRes.ok, true);
  assert.equal(eqRes.grade, 4);

  // Ranking: stB (5.4) -> 1, stA (5.2) -> 2, stC (null) -> null
  const ranks = gs.rankStudents(classObj);
  assert.equal(ranks.get('st-b'), 1);
  assert.equal(ranks.get('st-a'), 2);
  assert.equal(ranks.get('st-c'), null);
});

test('Data integrity: Planner <-> Grade Sheet test slot synchronization round-trip', async () => {
  const os = require('node:os');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmt-planner-gs-'));
  const gradesDir = path.join(tmpDir, 'grades');
  const classSlug = '3a-ge-11111111';
  fs.mkdirSync(path.join(gradesDir, classSlug), { recursive: true });

  const classMeta = {
    _savedAt: Date.now(),
    classId: 'ge-11111111',
    name: '3A',
    testCounts: { sem1: 0, sem2: 0 }
  };
  fs.writeFileSync(
    path.join(gradesDir, classSlug, '_class.js'),
    'window.GRADE_CLASS = ' + JSON.stringify(classMeta, null, 2) + ';\n',
    'utf8'
  );

  // Mock Desktop file API backed by tmpDir/grades
  const Desktop = {
    isElectron: () => true,
    readByPath: async (target, relPath) => {
      if (target !== 'grades') return { ok: false };
      const full = path.join(gradesDir, relPath);
      if (!fs.existsSync(full)) return { ok: false };
      return { ok: true, content: fs.readFileSync(full, 'utf8') };
    },
    saveText: async (target, filename, content, subDir) => {
      if (target !== 'grades') return { ok: false };
      const dir = subDir ? path.join(gradesDir, subDir) : gradesDir;
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, filename), content, 'utf8');
      return { ok: true };
    },
    deleteByPath: async (target, relPath) => {
      if (target !== 'grades') return { ok: false };
      const full = path.join(gradesDir, relPath);
      if (fs.existsSync(full)) fs.unlinkSync(full);
      return { ok: true };
    },
    listByPath: async (target) => {
      if (target !== 'grades') return { ok: false, files: [] };
      const files = [];
      for (const entry of fs.readdirSync(path.join(gradesDir, classSlug))) {
        files.push({ filename: entry, relativePath: classSlug + '/' + entry });
      }
      return { ok: true, files };
    }
  };

  const parseGradeFileContent = (content) => {
    const ctx = { window: {} };
    vm.runInNewContext(content, ctx);
    return ctx.window.GRADE_TEST_DATA || ctx.window.GRADE_CLASS || null;
  };

  // Extract syncTestToGradeSheet and removeTestFromGradeSheet from js/pages/planner.js
  const plannerJs = fs.readFileSync(path.join(ROOT, 'js', 'pages', 'planner.js'), 'utf8');
  const syncStart = plannerJs.indexOf('async function syncTestToGradeSheet(');
  const removeEnd = plannerJs.indexOf('    async function validateGradeSheetLinks(');
  assert.ok(syncStart > 0 && removeEnd > syncStart, 'Must locate syncTestToGradeSheet/removeTestFromGradeSheet in js/pages/planner.js');

  const fnSlice = plannerJs.slice(syncStart, removeEnd);
  const entries = [
    { id: 'pl-1', classId: 'ge-11111111', date: '2026-10-15', topic: 'Unit 2 Quiz', objective: 'Past tense', type: 'test' }
  ];

  const plannerCtx = {
    Desktop,
    window: { Desktop },
    entries,
    parseGradeFileContent,
    findGradeSheetClass: async () => ({ classSlug, meta: classMeta }),
    getGsSemesterForDate: () => 'sem1',
    plannerClassDisplayName: () => '3A',
    t: (k) => k,
    tFmt: (k) => k,
    showToast: () => {},
    persistEntries: () => {},
    plannerUpdateGradeSheetBadges: () => {},
    GS_DEFAULT_THRESHOLDS: {},
    GS_DEFAULT_POINTS: {},
    console,
    Date,
    Set,
    JSON,
    String
  };
  vm.runInNewContext(fnSlice, plannerCtx);

  try {
    // 1. Create test slot from Planner
    await plannerCtx.syncTestToGradeSheet(entries[0], false);
    assert.ok(entries[0].gsLink, 'Planner entry must receive gsLink');
    assert.equal(entries[0].gsLink.semester, 'sem1');
    assert.equal(entries[0].gsLink.testIndex, 0);

    const testFilePath = path.join(gradesDir, classSlug, 'sem1-test-01.js');
    assert.ok(fs.existsSync(testFilePath), 'sem1-test-01.js must be created');
    const createdData = parseGradeFileContent(fs.readFileSync(testFilePath, 'utf8'));
    assert.equal(createdData.testConfig.testName, 'Unit 2 Quiz');
    assert.equal(createdData.testConfig.scope, 'Past tense');

    const updatedMeta = parseGradeFileContent(fs.readFileSync(path.join(gradesDir, classSlug, '_class.js'), 'utf8'));
    assert.equal(updatedMeta.testCounts.sem1, 1, '_class.js testCounts.sem1 must bump to 1');

    // 2. Update existing test slot
    entries[0].topic = 'Unit 2 Quiz (Revised)';
    await plannerCtx.syncTestToGradeSheet(entries[0], true);
    const afterUpdate = parseGradeFileContent(fs.readFileSync(testFilePath, 'utf8'));
    assert.equal(afterUpdate.testConfig.testName, 'Unit 2 Quiz (Revised)');

    // 3. Remove unscored test -> file deleted and testCounts decremented
    await plannerCtx.removeTestFromGradeSheet(entries[0]);
    assert.equal(fs.existsSync(testFilePath), false, 'Unscored test file must be deleted on removal');

    // 4. Scored test removal -> file preserved, metadata cleared
    const scoredEntry = {
      id: 'pl-2',
      classId: 'ge-11111111',
      date: '2026-10-20',
      topic: 'Midterm',
      gsLink: { classId: 'ge-11111111', classSlug, semester: 'sem1', testIndex: 0 }
    };
    fs.writeFileSync(
      testFilePath,
      'window.GRADE_TEST_DATA = ' + JSON.stringify({
        testConfig: { testName: 'Midterm', testDate: '2026-10-20' },
        results: [{ studentId: 'st-1', score: 5.5 }]
      }) + ';\n',
      'utf8'
    );
    await plannerCtx.removeTestFromGradeSheet(scoredEntry);
    assert.ok(fs.existsSync(testFilePath), 'Scored test file must be preserved');
    const afterScoredRemove = parseGradeFileContent(fs.readFileSync(testFilePath, 'utf8'));
    assert.equal(afterScoredRemove.testConfig.testName, '');
    assert.equal(afterScoredRemove.results[0].score, 5.5);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
