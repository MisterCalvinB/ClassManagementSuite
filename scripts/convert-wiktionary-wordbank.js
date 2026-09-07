#!/usr/bin/env node
/**
 * convert-wiktionary-wordbank.js
 * 
 * High-performance streaming converter for Simple English Wiktionary (JSONL)
 * into custom word banks for Class Management Tools (CMT).
 * 
 * Usage:
 *   node scripts/convert-wiktionary-wordbank.js [options]
 * 
 * Options:
 *   --input <path>           Path to simple-extract.jsonl
 *   --output <path>          Output file or directory path
 *   --mode <mode>            'lemmas' (default, ~28k base words)
 *                            'core' (~13.5k words with examples & definitions)
 *                            'all' (all 53k+ words including pure inflections)
 *                            'split-pos' (split into nouns.js, verbs.js, adjectives.js, etc.)
 *                            'split-theme' (split into major thematic banks)
 *   --include-inflections    Include pure inflection pointers as standalone headwords
 *   --format <js|json|csv>   Output format (default: 'js')
 *   --min-examples <num>     Minimum number of examples required
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Standard Part-of-Speech mappings
const POS_MAP = {
  'noun': 'noun',
  'verb': 'verb',
  'adj': 'adjective',
  'adv': 'adverb',
  'name': 'proper noun',
  'pron': 'pronoun',
  'prep': 'preposition',
  'conj': 'conjunction',
  'det': 'determiner',
  'intj': 'interjection',
  'phrase': 'phrase',
  'abbrev': 'abbreviation',
  'prefix': 'prefix',
  'suffix': 'suffix',
  'contraction': 'contraction',
  'symbol': 'symbol'
};

// Structural/grammatical categories to filter out from themes
const GRAMMAR_CATEGORIES_EXCLUDE = new Set([
  'plurals', 'countable nouns', 'uncountable nouns',
  'past participles', 'past tense forms', 'present participles', 'third-person singular forms',
  'transitive verbs', 'intransitive verbs', 'verbs', 'auxiliary verbs', 'modal auxiliary verbs',
  'comparative forms', 'superlative forms',
  'given names', 'male given names', 'female given names', 'unisex given names', 'surnames',
  'compound terms', 'section stubs', 'other spellings', 'attributive modifiers',
  'indefinite determiners', 'count determiners', 'plural determiners', 'definite determiners',
  'english lemmas', 'english irregular plurals', 'english irregular past tense forms'
]);

// Regular expression to detect pure inflection pointers in definitions
const INFLECTION_GLOSS_REGEX = /^(?:the\s+)?(?:plural|past tense|past participle|present participle|comparative|superlative|third-person singular)(?:\s+and\s+(?:past participle|past tense))?\s+(?:form\s+)?of\s+([a-zA-Z'\-]+)/i;

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    input: 'c:/Users/arnau/Downloads/simple-extract.jsonl',
    output: null,
    mode: 'lemmas',
    includeInflections: false,
    format: 'js',
    minExamples: 0
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--input' && i + 1 < args.length) {
      options.input = args[++i];
    } else if (arg === '--output' && i + 1 < args.length) {
      options.output = args[++i];
    } else if (arg === '--mode' && i + 1 < args.length) {
      options.mode = args[++i].toLowerCase();
    } else if (arg === '--include-inflections') {
      options.includeInflections = true;
    } else if (arg === '--format' && i + 1 < args.length) {
      options.format = args[++i].toLowerCase();
    } else if (arg === '--min-examples' && i + 1 < args.length) {
      options.minExamples = parseInt(args[++i], 10) || 0;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  // If mode is 'all', automatically include inflections
  if (options.mode === 'all') {
    options.includeInflections = true;
  }

  return options;
}

function printHelp() {
  console.log(`
Simple English Wiktionary to CMT Custom Word Bank Converter
Usage: node scripts/convert-wiktionary-wordbank.js [options]

Options:
  --input <path>           Input JSONL file (default: c:/Users/arnau/Downloads/simple-extract.jsonl)
  --output <path>          Output file or directory path
  --mode <mode>            Conversion mode:
                             - 'lemmas'     (default: ~28,000 clean base words)
                             - 'core'       (~13,500 words with examples & definitions)
                             - 'all'        (all 53k+ words including pure inflections)
                             - 'split-pos'  (separate files for nouns, verbs, adjectives, etc.)
                             - 'split-theme'(separate files for major thematic topics)
  --include-inflections    Include pure inflection pointers as standalone words
  --format <js|json|csv>   Output format (default: 'js')
  --min-examples <num>     Filter words with at least N example sentences (e.g. 1)
  --help, -h               Show this help message
`);
}

// Clean and extract IPA pronunciation
function cleanIPA(sounds) {
  if (!Array.isArray(sounds) || sounds.length === 0) return '';
  // Prefer UK or US IPA
  let chosen = sounds.find(s => s.ipa && s.tags && (s.tags.includes('UK') || s.tags.includes('US')));
  if (!chosen) chosen = sounds.find(s => s.ipa);
  if (!chosen || !chosen.ipa) return '';
  return chosen.ipa.replace(/^\/+|\/+$/g, '').trim();
}

// Clean and extract Audio file
function cleanAudio(sounds) {
  if (!Array.isArray(sounds) || sounds.length === 0) return '';
  const chosen = sounds.find(s => s.audio);
  return chosen ? String(chosen.audio).trim() : '';
}

// Check if a sense definition is a pure inflection pointer
function isInflectionSense(sense) {
  if (!sense || !Array.isArray(sense.glosses) || sense.glosses.length === 0) return null;
  for (const gloss of sense.glosses) {
    const match = String(gloss).trim().match(INFLECTION_GLOSS_REGEX);
    if (match) {
      return { isInflection: true, targetLemma: match[1].toLowerCase() };
    }
  }
  return null;
}

// Format themes from categories
function extractThemes(categories) {
  if (!Array.isArray(categories)) return [];
  const themes = [];
  for (const cat of categories) {
    const lower = String(cat).trim().toLowerCase();
    if (GRAMMAR_CATEGORIES_EXCLUDE.has(lower)) continue;
    if (lower.startsWith('terms ') || lower.startsWith('english ')) continue;
    if (cat.length > 2 && !themes.includes(cat)) {
      themes.push(cat);
    }
  }
  return themes;
}

// Main conversion pipeline
async function run() {
  const options = parseArgs();

  if (!fs.existsSync(options.input)) {
    console.error(`[Error] Input file not found: ${options.input}`);
    process.exit(1);
  }

  console.log('===============================================================');
  console.log(' CMT Simple English Wiktionary Converter');
  console.log('===============================================================');
  console.log(` Input file:   ${options.input}`);
  console.log(` Mode:         ${options.mode}`);
  console.log(` Format:       ${options.format}`);
  console.log(` Inflections:  ${options.includeInflections ? 'Included as standalone words' : 'Omitted (saved in base otherForms)'}`);
  console.log(' Processing entries, please wait...\n');

  const startTime = Date.now();
  const wordMap = new Map();
  const inflectionRedirects = []; // [{ inflectedWord, targetLemma }]
  let totalRows = 0;
  let skippedRedirects = 0;
  let nonEnglish = 0;

  const fileStream = fs.createReadStream(options.input, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    totalRows++;

    let entry;
    try {
      entry = JSON.parse(line);
    } catch (e) {
      continue;
    }

    if (entry.pos === 'hard-redirect' || entry.redirect) {
      skippedRedirects++;
      continue;
    }

    if (entry.lang_code && entry.lang_code !== 'en') {
      nonEnglish++;
      continue;
    }

    const rawWord = String(entry.word || '').trim();
    if (!rawWord) continue;
    const lowerWord = rawWord.toLowerCase();

    // Map POS
    const mappedPos = POS_MAP[entry.pos] || entry.pos || 'noun';

    // Parse IPA & Audio
    const ipa = cleanIPA(entry.sounds);
    const audio = cleanAudio(entry.sounds);

    // Parse Forms
    const otherForms = [];
    if (Array.isArray(entry.forms)) {
      entry.forms.forEach(f => {
        if (f && f.form) {
          const cleanForm = String(f.form).trim();
          if (cleanForm && cleanForm.toLowerCase() !== lowerWord && !otherForms.includes(cleanForm)) {
            otherForms.push(cleanForm);
          }
        }
      });
    }

    // Parse Senses, Definitions, Examples, and Inflection detection
    const genuineDefinitions = [];
    const genuineExamples = [];
    const synonyms = [];
    const antonyms = [];
    const themes = extractThemes(entry.categories);

    let pureInflectionPointer = false;
    let targetLemma = null;

    if (Array.isArray(entry.senses) && entry.senses.length > 0) {
      let inflectionSensesCount = 0;

      entry.senses.forEach(s => {
        const infCheck = isInflectionSense(s);
        if (infCheck) {
          inflectionSensesCount++;
          if (!targetLemma) targetLemma = infCheck.targetLemma;
        } else {
          // Genuine definition
          if (Array.isArray(s.glosses)) {
            s.glosses.forEach(g => {
              const cleanG = String(g).trim();
              if (cleanG && !genuineDefinitions.includes(cleanG)) {
                genuineDefinitions.push(cleanG);
              }
            });
          }
        }

        // Examples
        if (Array.isArray(s.examples)) {
          s.examples.forEach(ex => {
            if (ex && ex.text) {
              const cleanEx = String(ex.text).trim();
              if (cleanEx && !genuineExamples.includes(cleanEx)) {
                genuineExamples.push(cleanEx);
              }
            }
          });
        }

        // Synonyms & Antonyms
        if (Array.isArray(s.synonyms)) {
          s.synonyms.forEach(syn => {
            const w = typeof syn === 'string' ? syn : (syn && syn.word);
            if (w && !synonyms.includes(w)) synonyms.push(w);
          });
        }
        if (Array.isArray(s.antonyms)) {
          s.antonyms.forEach(ant => {
            const w = typeof ant === 'string' ? ant : (ant && ant.word);
            if (w && !antonyms.includes(w)) antonyms.push(w);
          });
        }

        // Additional themes from sense categories
        if (Array.isArray(s.categories)) {
          extractThemes(s.categories).forEach(t => {
            if (!themes.includes(t)) themes.push(t);
          });
        }
      });

      // If ALL senses in this entry were purely inflection pointers
      if (inflectionSensesCount === entry.senses.length && genuineDefinitions.length === 0) {
        pureInflectionPointer = true;
      }
    }

    // Root-level synonyms/antonyms
    if (Array.isArray(entry.synonyms)) {
      entry.synonyms.forEach(s => {
        const w = typeof s === 'string' ? s : (s && s.word);
        if (w && !synonyms.includes(w)) synonyms.push(w);
      });
    }
    if (Array.isArray(entry.antonyms)) {
      entry.antonyms.forEach(a => {
        const w = typeof a === 'string' ? a : (a && a.word);
        if (w && !antonyms.includes(w)) antonyms.push(w);
      });
    }

    if (pureInflectionPointer && targetLemma) {
      inflectionRedirects.push({
        inflectedWord: rawWord,
        targetLemma: targetLemma
      });
    }

    // Record structure
    const recordData = {
      word: rawWord,
      lowerWord: lowerWord,
      posList: [mappedPos],
      ipa: ipa,
      audio: audio,
      definition: genuineDefinitions,
      exampleSentence: genuineExamples,
      otherForms: otherForms,
      synonyms: synonyms,
      antonyms: antonyms,
      themes: themes,
      isPureInflection: pureInflectionPointer
    };

    if (!wordMap.has(lowerWord)) {
      wordMap.set(lowerWord, recordData);
    } else {
      // Merge with existing record
      const existing = wordMap.get(lowerWord);

      if (!existing.posList.includes(mappedPos)) {
        existing.posList.push(mappedPos);
      }
      if (!existing.ipa && ipa) existing.ipa = ipa;
      if (!existing.audio && audio) existing.audio = audio;

      // Merge definitions
      genuineDefinitions.forEach(d => {
        if (!existing.definition.includes(d)) existing.definition.push(d);
      });

      // Merge examples
      genuineExamples.forEach(e => {
        if (!existing.exampleSentence.includes(e)) existing.exampleSentence.push(e);
      });

      // Merge forms
      otherForms.forEach(f => {
        if (!existing.otherForms.includes(f)) existing.otherForms.push(f);
      });

      // Merge synonyms & antonyms
      synonyms.forEach(s => {
        if (!existing.synonyms.includes(s)) existing.synonyms.push(s);
      });
      antonyms.forEach(a => {
        if (!existing.antonyms.includes(a)) existing.antonyms.push(a);
      });

      // Merge themes
      themes.forEach(t => {
        if (!existing.themes.includes(t)) existing.themes.push(t);
      });

      // If existing had no definitions but this merged one does, it's no longer a pure inflection
      if (existing.definition.length > 0) {
        existing.isPureInflection = false;
      }
    }
  }

  // Cross-link omitted pure inflections to target lemmas' otherForms
  let crossLinkedCount = 0;
  inflectionRedirects.forEach(redir => {
    const target = wordMap.get(redir.targetLemma);
    if (target) {
      if (!target.otherForms.includes(redir.inflectedWord) && redir.inflectedWord.toLowerCase() !== redir.targetLemma) {
        target.otherForms.push(redir.inflectedWord);
        crossLinkedCount++;
      }
    }
  });

  // Filter records based on mode & options
  let finalRecords = [];
  let omittedInflections = 0;

  for (const rec of wordMap.values()) {
    // If not including inflections and this entry is purely an inflection pointer
    if (!options.includeInflections && rec.isPureInflection && rec.definition.length === 0) {
      omittedInflections++;
      continue;
    }

    // Min examples filter
    if (options.minExamples > 0 && rec.exampleSentence.length < options.minExamples) {
      continue;
    }

    // Mode: core (requires both definition AND at least one example)
    if (options.mode === 'core') {
      if (rec.definition.length === 0 || rec.exampleSentence.length === 0) {
        continue;
      }
    }

    // Format CMT-compliant object
    const cmtRecord = {
      word: rec.word,
      ipa: rec.ipa || '',
      partOfSpeech: rec.posList.length === 1 ? rec.posList[0] : rec.posList,
      level: '',
      theme: rec.themes.length > 0 ? rec.themes.slice(0, 3).join(' / ') : '',
      definition: rec.definition.length === 1 ? rec.definition[0] : rec.definition,
      exampleSentence: rec.exampleSentence.length === 1 ? rec.exampleSentence[0] : rec.exampleSentence,
      synonyms: rec.synonyms,
      antonyms: rec.antonyms,
      otherForms: rec.otherForms,
      keywords: ['simple-wiktionary']
    };

    if (rec.audio) {
      cmtRecord.audio = rec.audio;
    }

    finalRecords.push(cmtRecord);
  }

  // Sort alphabetically
  finalRecords.sort((a, b) => a.word.localeCompare(b.word, 'en', { sensitivity: 'base' }));

  // Determine output path(s)
  const defaultOutputDir = path.resolve(process.cwd(), 'user/custom-data/wordbanks');
  if (!fs.existsSync(defaultOutputDir)) {
    fs.mkdirSync(defaultOutputDir, { recursive: true });
  }

  // Save according to mode
  if (options.mode === 'split-pos') {
    await writeSplitPos(finalRecords, options.output || defaultOutputDir, options.format);
  } else if (options.mode === 'split-theme') {
    await writeSplitTheme(finalRecords, options.output || defaultOutputDir, options.format);
  } else {
    let defaultFilename;
    if (options.mode === 'core') defaultFilename = 'simple-wiktionary-core';
    else if (options.mode === 'all') defaultFilename = 'simple-wiktionary-all';
    else defaultFilename = 'simple-wiktionary';

    const ext = options.format === 'json' ? '.json' : (options.format === 'csv' ? '.csv' : '.js');
    const outputPath = options.output || path.join(defaultOutputDir, defaultFilename + ext);
    await writeSingleFile(finalRecords, outputPath, options.format);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('---------------------------------------------------------------');
  console.log(' Conversion Summary');
  console.log('---------------------------------------------------------------');
  console.log(` Total raw rows processed:    ${totalRows}`);
  console.log(` Redirects skipped:           ${skippedRedirects}`);
  console.log(` Unique headwords parsed:     ${wordMap.size}`);
  console.log(` Pure inflections cross-linked: ${crossLinkedCount}`);
  console.log(` Pure inflections omitted:    ${omittedInflections}`);
  console.log(` Final entries written:       ${finalRecords.length}`);
  console.log(` Elapsed time:                ${durationSec}s`);
  console.log('===============================================================\n');
}

// Write a single wordbank file (JS, JSON, or CSV)
async function writeSingleFile(records, outputPath, format) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const leafName = path.basename(outputPath);

  if (format === 'json') {
    fs.writeFileSync(outputPath, JSON.stringify(records, null, 2), 'utf8');
  } else if (format === 'csv') {
    const csvContent = recordsToCSV(records);
    fs.writeFileSync(outputPath, csvContent, 'utf8');
  } else {
    // CMT standard JS custom wordbank
    const header = `// ${leafName}\n// Simple English Wiktionary Word Bank (${records.length} entries)\n`;
    const jsContent = header + `const customVocabBank = ${JSON.stringify(records, null, 2)};\n`;
    fs.writeFileSync(outputPath, jsContent, 'utf8');
  }

  const stat = fs.statSync(outputPath);
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
  console.log(` [Output] ${outputPath} (${sizeMb} MB, ${records.length} records)`);
}

// Split into separate wordbanks by Part of Speech
async function writeSplitPos(records, outputDir, format) {
  const posGroups = {
    'nouns': [],
    'verbs': [],
    'adjectives': [],
    'adverbs': [],
    'others': []
  };

  records.forEach(r => {
    const pos = Array.isArray(r.partOfSpeech) ? r.partOfSpeech[0] : r.partOfSpeech;
    if (pos === 'noun') posGroups.nouns.push(r);
    else if (pos === 'verb') posGroups.verbs.push(r);
    else if (pos === 'adjective') posGroups.adjectives.push(r);
    else if (pos === 'adverb') posGroups.adverbs.push(r);
    else posGroups.others.push(r);
  });

  for (const [key, list] of Object.entries(posGroups)) {
    if (list.length === 0) continue;
    const ext = format === 'json' ? '.json' : (format === 'csv' ? '.csv' : '.js');
    const filePath = path.join(outputDir, `simple-wiktionary-${key}${ext}`);
    await writeSingleFile(list, filePath, format);
  }
}

// Split into separate wordbanks by Major Themes
async function writeSplitTheme(records, outputDir, format) {
  const themeMap = new Map();

  records.forEach(r => {
    const mainTheme = r.theme ? r.theme.split('/')[0].trim() : 'General';
    if (!themeMap.has(mainTheme)) themeMap.set(mainTheme, []);
    themeMap.get(mainTheme).push(r);
  });

  for (const [theme, list] of themeMap.entries()) {
    if (list.length < 50) continue; // Skip tiny themes
    const slug = theme.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const ext = format === 'json' ? '.json' : (format === 'csv' ? '.csv' : '.js');
    const filePath = path.join(outputDir, `simple-wiktionary-theme-${slug}${ext}`);
    await writeSingleFile(list, filePath, format);
  }
}

// Helper: Convert records to CSV
function recordsToCSV(records) {
  const headers = ['word', 'ipa', 'partOfSpeech', 'level', 'theme', 'definition', 'exampleSentence', 'synonyms', 'antonyms', 'otherForms'];
  const lines = [headers.join(',')];

  records.forEach(r => {
    const row = headers.map(h => {
      let val = r[h] || '';
      if (Array.isArray(val)) val = val.join(' ; ');
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    });
    lines.push(row.join(','));
  });

  return lines.join('\n');
}

// Run the script
run().catch(err => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
