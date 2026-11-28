'use strict';

const { test, expect } = require('../fixtures/electron');

test.use({
  electronArgs: ['group-editor'],
  seedFiles: {
    'class-groups.js': 'const CLASS_GROUPS_DATA = ' + JSON.stringify({
      activeYear: '2025-2026',
      activeSemester: 1,
      classGroupsMeta: {}
    }, null, 2) + ';\nvar CLASS_GROUPS_META = CLASS_GROUPS_DATA.classGroupsMeta;\n'
  }
});

test.describe('Group Editor', () => {
  test('creates a new class group with students and persists to user/class-groups.js', async ({ page, readUserFile }) => {
    await expect(page.locator('#ge-open-add-modal-btn')).toBeVisible();
    await page.locator('#ge-open-add-modal-btn').click();

    await expect(page.locator('#new-group-name')).toBeVisible();
    await page.locator('#new-group-name').fill('4B-PW');
    await page.locator('#new-group-year').fill('2025-2026');
    await page.locator('#new-group-semester').selectOption('1');
    await page.locator('#new-group-students').fill('Alice Smith\nBob Jones');

    await page.locator('#ge-add-group-modal [data-geev-26="1"]').click();

    // Verify modal closes, click File -> Save, and confirm class-groups.js persists to disk
    await expect(page.locator('#ge-add-group-modal')).not.toHaveClass(/open/);
    await page.locator('[data-i18n="menuFile"]').click();
    await page.locator('#ge-save-btn').click();
    await expect.poll(() => readUserFile('class-groups.js')).toContain('4B-PW');

    const saved = readUserFile('class-groups.js');
    expect(saved).toContain('"name":"4B-PW"');
    expect(saved.match(/st-[0-9a-f]+/g)?.length).toBe(2);
  });
});
