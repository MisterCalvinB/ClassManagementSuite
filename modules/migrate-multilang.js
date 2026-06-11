// migrate-multilang.js
// One-time script to add english, german, italian, sourceLanguage fields to all word bank files.
// Run with: node migrate-multilang.js
// Safe to re-run — already-migrated entries are left unchanged.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const wordbanksDir = path.join(__dirname, 'user', 'custom-data', 'wordbanks');

function parseJsFile(content) {
  const match = content.match(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*[[\{]/);
  if (!match) return null;
  const varName = match[1];
  try {
    const data = (new Function(content + '\n;return (typeof ' + varName + ' !== "undefined" ? ' + varName + ' : null);'))();
    if (data === null) return null;
    return { varName, data };
  } catch (e) {
    return null;
  }
}

function migrateEntry(entry) {
  if (typeof entry !== 'object' || !entry || !entry.word) return entry;
  const out = Object.assign({}, entry);
  if (out.sourceLanguage === undefined) out.sourceLanguage = 'en';
  if (out.english === undefined) out.english = out.word;
  if (out.german === undefined) out.german = '';
  if (out.italian === undefined) out.italian = '';
  return out;
}

const files = fs.readdirSync(wordbanksDir).filter(f => f.endsWith('.js'));
let totalFiles = 0, totalEntries = 0;

for (const filename of files) {
  const filepath = path.join(wordbanksDir, filename);
  const content = fs.readFileSync(filepath, 'utf8');

  const parsed = parseJsFile(content);
  if (!parsed) {
    console.log(`  SKIP ${filename} — could not parse`);
    continue;
  }

  if (!Array.isArray(parsed.data)) {
    console.log(`  SKIP ${filename} — not an array`);
    continue;
  }

  const updated = parsed.data.map(migrateEntry);
  const alreadyMigrated = parsed.data.filter(e => e && e.sourceLanguage !== undefined).length;
  const newlyMigrated = updated.length - alreadyMigrated;

  const newContent = `// ${filename}\nconst ${parsed.varName} = ${JSON.stringify(updated, null, 2)};\n`;
  fs.writeFileSync(filepath, newContent, 'utf8');
  console.log(`  OK   ${filename} — ${updated.length} entries (${newlyMigrated} newly migrated)`);
  totalFiles++;
  totalEntries += updated.length;
}

console.log(`\nDone. Updated ${totalFiles} file(s), ${totalEntries} total entries.`);
