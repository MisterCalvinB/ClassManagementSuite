'use strict';
/**
 * Quick Dictionary worker.
 *
 * Runs in a worker_thread (spawned by js/dictionary-service.js). It owns the in-memory index of the
 * selected word banks so parsing multi-megabyte bank files and scanning them never blocks the
 * Electron main process or the renderer.
 *
 * Protocol (parentPort messages):
 *   in  { type:'sync',   id, banks:[{ name, path }] }                 -> out { type:'synced', id, loaded:{name:count}, errors:{name:msg} }
 *   in  { type:'search', id, q, scope, banks:[name], limit }          -> out { type:'result', id, results, total, suggestions, ms }
 * Banks absent from a `sync` payload are dropped from memory immediately.
 */
const { parentPort } = require('worker_threads');
const fs = require('fs');
const vm = require('vm');

/** name -> { entries: SlimEntry[] } */
const banks = new Map();
let syncChain = Promise.resolve();

function fold(value) {
  return String(value == null ? '' : value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v == null ? '' : v).trim()).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

/** Extract the array literal out of a word bank JS file (JSON-compatible fast path, vm fallback). */
function parseBankText(text) {
  let source = String(text || '').replace(/^\uFEFF/, '');
  let match;
  while ((match = /^\s*(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/)/.exec(source))) {
    source = source.slice(match[0].length);
  }
  const start = source.indexOf('[');
  const end = source.lastIndexOf(']');
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(source.slice(start, end + 1));
      if (Array.isArray(parsed)) return parsed;
    } catch (_) { /* fall through to sandboxed evaluation */ }
  }
  const sandbox = { window: {}, module: { exports: {} }, exports: {} };
  const context = vm.createContext(sandbox);
  const completion = vm.runInContext(
    source + '\n;(typeof customVocabBank!=="undefined"?customVocabBank:undefined)',
    context,
    { timeout: 8000 }
  );
  if (Array.isArray(completion)) return completion;
  if (Array.isArray(sandbox.module.exports)) return sandbox.module.exports;
  for (const key of Object.keys(sandbox.window)) {
    if (Array.isArray(sandbox.window[key])) return sandbox.window[key];
  }
  return [];
}

function slimEntry(raw, bankName) {
  if (!raw || typeof raw !== 'object') return null;
  const word = String(raw.word || raw.term || raw.title || '').trim();
  if (!word) return null;
  const rawDefinition = raw.definition != null ? raw.definition : raw.meaning;
  return {
    bank: bankName,
    word,
    ipa: String(raw.ipa || ''),
    pos: String(raw.partOfSpeech || raw.pos || ''),
    level: String(raw.level || ''),
    theme: String(raw.theme || ''),
    definition: Array.isArray(rawDefinition) ? rawDefinition.join('; ') : String(rawDefinition || ''),
    examples: toStringArray(raw.exampleSentence != null ? raw.exampleSentence : raw.examples),
    synonyms: toStringArray(raw.synonyms),
    antonyms: toStringArray(raw.antonyms),
    forms: toStringArray(raw.otherForms),
    _w: fold(word),
    _f: null, // lazily folded other forms
    _s: null, // lazily folded synonyms + antonyms
    _t: null  // lazily folded definition + examples
  };
}

async function loadBank(descriptor) {
  const text = await fs.promises.readFile(descriptor.path, 'utf8');
  const rawEntries = parseBankText(text);
  const entries = [];
  for (let i = 0; i < rawEntries.length; i++) {
    const slim = slimEntry(rawEntries[i], descriptor.name);
    if (slim) entries.push(slim);
  }
  return entries;
}

function syncBanks(descriptors) {
  syncChain = syncChain.then(async () => {
    const wanted = new Set(descriptors.map((d) => d.name));
    for (const name of Array.from(banks.keys())) {
      if (!wanted.has(name)) banks.delete(name);
    }
    const errors = {};
    for (const descriptor of descriptors) {
      if (banks.has(descriptor.name)) continue;
      try {
        banks.set(descriptor.name, { entries: await loadBank(descriptor) });
      } catch (error) {
        errors[descriptor.name] = String((error && error.message) || error);
      }
    }
    const loaded = {};
    banks.forEach((bank, name) => { loaded[name] = bank.entries.length; });
    return { loaded, errors };
  });
  return syncChain;
}

/** Lower score = better. Returns -1 when the entry does not match for the given scope. */
function scoreEntry(entry, query, level) {
  const word = entry._w;
  if (word === query) return 0;
  if (word.startsWith(query)) return 1;
  if (word.includes(query)) return 3;
  if (level < 1) return -1;

  if (!entry._f) entry._f = entry.forms.map(fold);
  for (let i = 0; i < entry._f.length; i++) {
    const form = entry._f[i];
    if (form === query) return 2;
    if (form.startsWith(query)) return 2.5;
  }
  if (level < 2) return -1;

  if (!entry._s) entry._s = entry.synonyms.concat(entry.antonyms).map(fold);
  for (let i = 0; i < entry._s.length; i++) {
    const other = entry._s[i];
    if (other === query) return 4;
    if (other.includes(query)) return 4.5;
  }
  if (level < 3) return -1;

  if (entry._t === null) entry._t = fold(entry.definition + ' ' + entry.examples.join(' '));
  return entry._t.includes(query) ? 5 : -1;
}

const SCOPE_LEVEL = { word: 0, forms: 1, syn: 2, all: 3 };

/** Bounded Levenshtein distance; returns max+1 when the distance exceeds max. */
function boundedDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    const swap = prev; prev = curr; curr = swap;
  }
  return prev[b.length];
}

function suggest(query, names) {
  if (query.length < 3) return [];
  const found = new Map();
  for (const name of names) {
    const bank = banks.get(name);
    if (!bank) continue;
    for (const entry of bank.entries) {
      const dist = boundedDistance(query, entry._w, 2);
      if (dist > 2) continue;
      const prior = found.get(entry._w);
      if (!prior || dist < prior.dist) found.set(entry._w, { word: entry.word, dist });
    }
  }
  return Array.from(found.values())
    .sort((a, b) => a.dist - b.dist || a.word.length - b.word.length)
    .slice(0, 8)
    .map((item) => item.word);
}

function toResult(entry) {
  return {
    bank: entry.bank,
    word: entry.word,
    ipa: entry.ipa,
    pos: entry.pos,
    level: entry.level,
    theme: entry.theme,
    definition: entry.definition,
    examples: entry.examples,
    synonyms: entry.synonyms,
    antonyms: entry.antonyms,
    forms: entry.forms
  };
}

function runSearch(message) {
  const started = Date.now();
  const query = fold(String(message.q || '').trim());
  const limit = Math.max(1, Math.min(200, Number(message.limit) || 50));
  const level = SCOPE_LEVEL[message.scope] != null ? SCOPE_LEVEL[message.scope] : 0;
  const names = Array.isArray(message.banks) ? message.banks : Array.from(banks.keys());
  if (!query) return { results: [], total: 0, suggestions: [], ms: 0 };

  const hits = [];
  for (const name of names) {
    const bank = banks.get(name);
    if (!bank) continue;
    const entries = bank.entries;
    for (let i = 0; i < entries.length; i++) {
      const score = scoreEntry(entries[i], query, level);
      if (score >= 0) hits.push({ score, entry: entries[i] });
    }
  }
  hits.sort((a, b) => a.score - b.score || a.entry._w.length - b.entry._w.length || (a.entry._w < b.entry._w ? -1 : a.entry._w > b.entry._w ? 1 : 0));
  const seen = new Set();
  const unique = [];
  for (let i = 0; i < hits.length; i++) {
    const entry = hits[i].entry;
    const key = entry._w + '|' + entry.pos + '|' + entry.definition;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(entry);
  }
  const results = unique.slice(0, limit).map(toResult);
  const suggestions = unique.length === 0 ? suggest(query, names) : [];
  return { results, total: unique.length, suggestions, ms: Date.now() - started };
}

if (parentPort) {
  parentPort.on('message', (message) => {
    if (!message || typeof message !== 'object') return;
    if (message.type === 'sync') {
      syncBanks(Array.isArray(message.banks) ? message.banks : [])
        .then((outcome) => parentPort.postMessage({ type: 'synced', id: message.id, loaded: outcome.loaded, errors: outcome.errors }))
        .catch((error) => parentPort.postMessage({ type: 'synced', id: message.id, loaded: {}, errors: { _: String((error && error.message) || error) } }));
    } else if (message.type === 'search') {
      try {
        parentPort.postMessage(Object.assign({ type: 'result', id: message.id }, runSearch(message)));
      } catch (error) {
        parentPort.postMessage({ type: 'result', id: message.id, results: [], total: 0, suggestions: [], ms: 0, error: String((error && error.message) || error) });
      }
    }
  });
}
