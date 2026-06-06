import { useState, useRef, useCallback } from "react";

// ── All 15 fields from kaikki.org / wiktextract ─────────────────
const FIELDS = [
  { id: "word",          label: "Word",           desc: "The headword" },
  { id: "pos",           label: "Part of Speech", desc: "noun, verb, adj…" },
  { id: "language",      label: "Language",        desc: "Entry language name" },
  { id: "etymology",     label: "Etymology",       desc: "Origin / etymology text" },
  { id: "definitions",   label: "Definitions",     desc: "Gloss strings" },
  { id: "examples",      label: "Examples",        desc: "Usage example sentences" },
  { id: "synonyms",      label: "Synonyms",        desc: "Synonym words" },
  { id: "antonyms",      label: "Antonyms",        desc: "Antonym words" },
  { id: "hypernyms",     label: "Hypernyms",       desc: "Broader/parent categories" },
  { id: "hyponyms",      label: "Hyponyms",        desc: "Narrower/child categories" },
  { id: "translations",  label: "Translations",    desc: "{lang: [words]}" },
  { id: "pronunciation", label: "Pronunciation",   desc: "IPA strings" },
  { id: "audio",         label: "Audio",           desc: "mp3/ogg URLs" },
  { id: "forms",         label: "Forms",           desc: "Inflected forms + tags" },
  { id: "tags",          label: "Tags",            desc: "Semantic/grammatical tags" },
];

// ── Extract all fields from a kaikki.org JSONL entry ────────────
function extractEntry(e, fieldConfig) {
  const record = {};

  for (const { id, alias, active } of fieldConfig) {
    if (!active) continue;
    const key = alias.trim() || id;
    let value = null;

    switch (id) {
      case "word":
        value = e.word ?? null; break;

      case "pos":
        value = e.pos ?? null; break;

      case "language":
        value = e.lang || e.lang_code || null; break;

      case "etymology":
        value = e.etymology_text || null; break;

      case "definitions": {
        const defs = [];
        for (const s of (e.senses || [])) {
          for (const g of (s.glosses || s.raw_glosses || [])) {
            const t = g.trim();
            if (t && !defs.includes(t)) defs.push(t);
          }
        }
        value = defs.length ? defs : null; break;
      }

      case "examples": {
        const exs = [];
        for (const s of (e.senses || [])) {
          for (const ex of (s.examples || [])) {
            const t = (ex.text || "").trim();
            if (t && !exs.includes(t)) exs.push(t);
          }
        }
        value = exs.length ? exs : null; break;
      }

      case "synonyms":
      case "antonyms":
      case "hypernyms":
      case "hyponyms": {
        const words = [];
        for (const item of (e[id] || [])) {
          const w = (item.word || "").trim();
          if (w && !words.includes(w)) words.push(w);
        }
        for (const s of (e.senses || [])) {
          for (const item of (s[id] || [])) {
            const w = (item.word || "").trim();
            if (w && !words.includes(w)) words.push(w);
          }
        }
        value = words.length ? words : null; break;
      }

      case "translations": {
        const trans = {};
        for (const t of (e.translations || [])) {
          const lang = t.lang || t.code || "unknown";
          const w = (t.word || "").trim();
          if (w) {
            trans[lang] = trans[lang] || [];
            if (!trans[lang].includes(w)) trans[lang].push(w);
          }
        }
        value = Object.keys(trans).length ? trans : null; break;
      }

      case "pronunciation": {
        const ipa = [];
        for (const p of (e.sounds || [])) {
          const s = (p.ipa || "").trim();
          if (s && !ipa.includes(s)) ipa.push(s);
        }
        value = ipa.length ? ipa : null; break;
      }

      case "audio": {
        const files = [];
        for (const p of (e.sounds || [])) {
          const entry = {};
          if (p.mp3_url) entry.mp3 = p.mp3_url;
          if (p.ogg_url) entry.ogg = p.ogg_url;
          if (Object.keys(entry).length) files.push(entry);
        }
        value = files.length ? files : null; break;
      }

      case "forms": {
        const forms = [];
        for (const f of (e.forms || [])) {
          const form = (f.form || "").trim();
          if (form) forms.push(f.tags?.length ? { form, tags: f.tags } : { form });
        }
        value = forms.length ? forms : null; break;
      }

      case "tags": {
        const tags = new Set();
        for (const s of (e.senses || [])) {
          for (const t of (s.tags || [])) tags.add(t);
        }
        value = tags.size ? [...tags].sort() : null; break;
      }
    }

    if (value !== null) record[key] = value;
  }

  return Object.keys(record).length ? record : null;
}

// ── Parse JSONL text and build word index ─────────────────────
function buildIndex(text) {
  const index = {};  // word.toLowerCase() -> [raw entry, ...]
  const lines = text.split("\n");
  let parsed = 0;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    try {
      const entry = JSON.parse(t);
      const w = (entry.word || "").toLowerCase();
      if (w) {
        index[w] = index[w] || [];
        index[w].push(entry);
        parsed++;
      }
    } catch {}
  }
  return { index, count: parsed };
}

// ────────────────────────────────────────────────────────────────
const mono  = "'Courier New', monospace";
const serif = "'Georgia', 'Times New Roman', serif";

const baseInput = {
  background: "#13131a", border: "1px solid #2a2a35", borderRadius: "4px",
  color: "#e8e6df", fontFamily: mono, fontSize: "12px", padding: "6px 10px",
  outline: "none", width: "100%", boxSizing: "border-box",
};

const pill = (color, bg, border) => ({
  fontSize: "9px", fontFamily: mono, letterSpacing: "0.05em",
  color, background: bg, border: `1px solid ${border}`,
  borderRadius: "2px", padding: "1px 4px", flexShrink: 0,
});

export default function App() {
  const [dbState,     setDbState]     = useState("idle"); // idle | loading | ready
  const [dbInfo,      setDbInfo]      = useState(null);   // { count, filename }
  const [dbIndex,     setDbIndex]     = useState(null);
  const [loadProgress,setLoadProgress]= useState("");

  const [input,       setInput]       = useState("");
  const [fieldConfig, setFieldConfig] = useState(
    FIELDS.map(f => ({
      id: f.id, alias: "", active: ["word","pos","definitions","synonyms","antonyms"].includes(f.id)
    }))
  );
  const [results,   setResults]   = useState(null);
  const [errors,    setErrors]    = useState({});
  const [loading,   setLoading]   = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [statusLog, setStatusLog] = useState([]);

  const fileInputRef = useRef(null);
  const textareaRef  = useRef(null);

  // ── Load JSONL/JSON file ────────────────────────────────────
  const handleFileLoad = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDbState("loading");
    setLoadProgress("Reading file…");
    setDbIndex(null);
    setDbInfo(null);
    setResults(null);
    setErrors({});

    const reader = new FileReader();
    reader.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const pct = Math.round((ev.loaded / ev.total) * 100);
        setLoadProgress(`Reading… ${pct}%`);
      }
    };
    reader.onload = (ev) => {
      setLoadProgress("Parsing & indexing…");
      // Defer to avoid blocking render
      setTimeout(() => {
        try {
          const { index, count } = buildIndex(ev.target.result);
          setDbIndex(index);
          setDbInfo({ count, filename: file.name, words: Object.keys(index).length });
          setDbState("ready");
          setLoadProgress("");
        } catch (err) {
          setDbState("idle");
          setLoadProgress(`Error: ${err.message}`);
        }
      }, 50);
    };
    reader.onerror = () => {
      setDbState("idle");
      setLoadProgress("Failed to read file.");
    };
    reader.readAsText(file);
  }, []);

  const toggleField = id =>
    setFieldConfig(prev => prev.map(f => f.id === id ? { ...f, active: !f.active } : f));
  const setAlias = (id, alias) =>
    setFieldConfig(prev => prev.map(f => f.id === id ? { ...f, alias } : f));

  const activeFields = fieldConfig.filter(f => f.active);

  // ── Lookup ───────────────────────────────────────────────────
  const handleLookup = () => {
    if (!dbIndex) return;
    const words = input.split(",").map(w => w.trim()).filter(Boolean);
    if (!words.length || !activeFields.length) return;

    setLoading(true);
    setResults(null);
    setErrors({});
    setStatusLog([]);

    setTimeout(() => {
      const allResults = [];
      const newErrors  = {};
      const log        = [];

      for (const word of words) {
        const entries = dbIndex[word.toLowerCase()];
        if (!entries || entries.length === 0) {
          newErrors[word] = "Not found in database";
          log.push(`✗ ${word} — not in database`);
          continue;
        }
        const extracted = entries.map(e => extractEntry(e, fieldConfig)).filter(Boolean);
        if (extracted.length) {
          allResults.push(...extracted);
          log.push(`✓ ${word} — ${extracted.length} entr${extracted.length > 1 ? "ies" : "y"}`);
        } else {
          newErrors[word] = "No data for selected fields";
          log.push(`⚡ ${word} — no data for selected fields`);
        }
      }

      setResults(allResults);
      setErrors(newErrors);
      setStatusLog(log);
      setLoading(false);
    }, 20);
  };

  const handleCopy = () => {
    if (!results) return;
    navigator.clipboard.writeText(JSON.stringify(results, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!results) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
    Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob), download: "words.json"
    }).click();
  };

  const jsonString = results ? JSON.stringify(results, null, 2) : "";
  const ready      = dbState === "ready";

  return (
    <div style={{ minHeight: "100vh", background: "#0c0c0f", color: "#e8e6df", fontFamily: serif }}>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #2a2a35", padding: "16px 28px 13px", display: "flex", alignItems: "center", gap: "14px" }}>
        <span style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#6b6b7a", fontFamily: mono }}>Wiktionary</span>
        <h1 style={{ margin: 0, fontSize: "21px", fontWeight: 400, letterSpacing: "-0.02em" }}>Word Extractor</h1>
        <span style={{ marginLeft: "auto", fontSize: "10px", color: "#3d3d50", fontFamily: mono }}>offline · kaikki.org JSONL</span>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 54px)" }}>

        {/* ── Left panel ────────────────────────────────────────── */}
        <div style={{ width: "354px", flexShrink: 0, borderRight: "1px solid #2a2a35", padding: "20px 17px", display: "flex", flexDirection: "column", gap: "18px", overflowY: "auto" }}>

          {/* DB loader */}
          <div>
            <label style={{ display: "block", fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#6b6b7a", marginBottom: "8px", fontFamily: mono }}>
              Wiktionary Database
            </label>

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `1px dashed ${ready ? "#3d5c3d" : "#3a3a50"}`,
                borderRadius: "6px",
                background: ready ? "#0f1a0f" : "#0e0e18",
                padding: "14px 14px",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.15s",
              }}
            >
              {dbState === "idle" && (
                <>
                  <div style={{ fontSize: "22px", marginBottom: "6px", color: "#3a3a55" }}>⬆</div>
                  <div style={{ fontSize: "11px", fontFamily: mono, color: "#5a5a7a", lineHeight: 1.6 }}>
                    Click to load JSONL / JSON dump<br/>
                    <span style={{ color: "#3a3a50", fontSize: "10px" }}>kaikki.org-dictionary-English.json</span>
                  </div>
                </>
              )}
              {dbState === "loading" && (
                <div style={{ fontSize: "11px", fontFamily: mono, color: "#7a7a5a", animation: "pulse 1.2s infinite" }}>
                  {loadProgress}
                </div>
              )}
              {dbState === "ready" && (
                <div style={{ fontSize: "11px", fontFamily: mono, color: "#6a9a6a", lineHeight: 1.7 }}>
                  <div style={{ fontSize: "16px", marginBottom: "4px" }}>✓</div>
                  <div style={{ color: "#8aba8a" }}>{dbInfo.filename}</div>
                  <div style={{ color: "#4a7a4a", fontSize: "10px" }}>
                    {dbInfo.words.toLocaleString()} headwords · {dbInfo.count.toLocaleString()} entries
                  </div>
                  <div style={{ color: "#3a5a3a", fontSize: "10px", marginTop: "3px" }}>click to reload</div>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".json,.jsonl,.gz" onChange={handleFileLoad} style={{ display: "none" }} />

            {/* Download hint */}
            {dbState === "idle" && (
              <div style={{ marginTop: "8px", fontSize: "10px", fontFamily: mono, color: "#3d3d50", lineHeight: 1.6 }}>
                Download from{" "}
                <a href="https://kaikki.org/dictionary/" target="_blank" rel="noreferrer"
                  style={{ color: "#5a5a8a", textDecoration: "none" }}>kaikki.org/dictionary</a>
                {" "}→ choose a language → download the JSON file.
              </div>
            )}
          </div>

          {/* Word input */}
          <div>
            <label style={{ display: "block", fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: ready ? "#6b6b7a" : "#3a3a50", marginBottom: "7px", fontFamily: mono }}>
              Words (comma-separated)
            </label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleLookup(); }}
              placeholder={ready ? "life, dog, beautiful…" : "Load a database first…"}
              disabled={!ready}
              rows={3}
              style={{ ...baseInput, resize: "vertical", lineHeight: "1.6", fontSize: "13px", padding: "9px 11px", opacity: ready ? 1 : 0.35 }}
            />
            <div style={{ fontSize: "10px", color: "#3d3d50", marginTop: "4px", fontFamily: mono }}>⌘↵ · Ctrl+↵ to run</div>
          </div>

          {/* Fields */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "9px" }}>
              <label style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#6b6b7a", fontFamily: mono }}>Fields</label>
              <span style={{ fontSize: "10px", color: "#3d3d50", fontFamily: mono }}>rename key →</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {fieldConfig.map(({ id, alias, active }) => {
                const field   = FIELDS.find(f => f.id === id);
                const renamed = alias.trim() !== "";
                return (
                  <div key={id} style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    background: active ? "#13131e" : "transparent",
                    border: active ? "1px solid #2a2a42" : "1px solid transparent",
                    borderRadius: "4px", padding: "4px 7px", transition: "all 0.12s",
                  }}>
                    <button onClick={() => toggleField(id)} style={{
                      width: "13px", height: "13px", flexShrink: 0,
                      border: active ? "1px solid #6b6baa" : "1px solid #3a3a50",
                      borderRadius: "2px", background: active ? "#6b6baa" : "transparent",
                      cursor: "pointer", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: "8px", color: "#0c0c0f", padding: 0,
                    }}>{active ? "✓" : ""}</button>

                    <span
                      title={field.desc}
                      style={{
                        fontSize: "11px", fontFamily: mono, letterSpacing: "0.03em",
                        color: active ? "#c8c4f0" : "#4a4a60",
                        width: "80px", flexShrink: 0, cursor: "default",
                      }}>{field.label}</span>

                    <span style={{ fontSize: "10px", color: active ? "#4a4a7a" : "#2a2a40", flexShrink: 0 }}>→</span>

                    <input
                      type="text"
                      value={alias}
                      onChange={e => setAlias(id, e.target.value)}
                      placeholder={id}
                      disabled={!active}
                      style={{
                        ...baseInput, padding: "2px 6px", fontSize: "11px",
                        opacity: active ? 1 : 0.2,
                        color: renamed && active ? "#e8c86a" : "#e8e6df",
                        border: renamed && active ? "1px solid #5a4a20" : "1px solid #2a2a35",
                        background: renamed && active ? "#181410" : "#13131a",
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: "10px", color: "#3d3d50", fontFamily: mono, marginTop: "5px" }}>
              Hover field name for description. Leave rename blank to keep original key.
            </div>
          </div>

          {/* Extract button */}
          <button
            onClick={handleLookup}
            disabled={loading || !input.trim() || !ready}
            style={{
              background: loading ? "#1a1a28" : ready && input.trim() ? "#5a5aaa" : "#1a1a28",
              border: "none", borderRadius: "4px",
              color: loading ? "#4a4a60" : ready && input.trim() ? "#e8e6ff" : "#3a3a55",
              padding: "11px 20px", cursor: (loading || !input.trim() || !ready) ? "not-allowed" : "pointer",
              fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: mono,
            }}
          >
            {loading ? "Extracting…" : "Extract Words →"}
          </button>

          {/* Status log */}
          {statusLog.length > 0 && (
            <div style={{ background: "#0d0d14", border: "1px solid #2a2a35", borderRadius: "4px", padding: "8px 10px" }}>
              {statusLog.map((line, i) => (
                <div key={i} style={{
                  fontSize: "10px", fontFamily: mono, lineHeight: "1.7",
                  color: line.startsWith("✓") ? "#6a9a6a" : line.startsWith("⚡") ? "#9a8a4a" : "#9a5a5a",
                }}>{line}</div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right panel ───────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

          {results && (
            <div style={{ borderBottom: "1px solid #2a2a35", padding: "8px 18px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", fontFamily: mono, color: "#6b6b7a", flexShrink: 0 }}>
                {results.length} record{results.length !== 1 ? "s" : ""}
                {Object.keys(errors).length > 0 && <span style={{ color: "#aa5a5a", marginLeft: "10px" }}>· {Object.keys(errors).length} error{Object.keys(errors).length !== 1 ? "s" : ""}</span>}
              </span>
              <div style={{ display: "flex", gap: "4px", flex: 1, flexWrap: "wrap" }}>
                {activeFields.map(({ id, alias }) => (
                  <span key={id} style={{
                    fontSize: "10px", fontFamily: mono,
                    background: alias ? "#181410" : "#13131e",
                    border: alias ? "1px solid #5a4a20" : "1px solid #2a2a42",
                    borderRadius: "3px", padding: "1px 5px",
                    color: alias ? "#e8c86a" : "#6b6b9a",
                  }}>
                    {alias ? <>{id}<span style={{ color: "#4a4060" }}> → </span>{alias}</> : id}
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                <button onClick={handleCopy} style={{ background: "transparent", border: "1px solid #2a2a35", borderRadius: "3px", color: copied ? "#6baa6b" : "#6b6b7a", padding: "4px 10px", cursor: "pointer", fontSize: "11px", fontFamily: mono }}>
                  {copied ? "Copied ✓" : "Copy JSON"}
                </button>
                <button onClick={handleDownload} style={{ background: "#1a1a28", border: "1px solid #3d3d5c", borderRadius: "3px", color: "#c8c4f0", padding: "4px 10px", cursor: "pointer", fontSize: "11px", fontFamily: mono }}>
                  ↓ Download
                </button>
              </div>
            </div>
          )}

          {Object.keys(errors).length > 0 && (
            <div style={{ padding: "7px 18px", borderBottom: "1px solid #2a2a35" }}>
              {Object.entries(errors).map(([word, msg]) => (
                <span key={word} style={{ display: "inline-block", background: "#1a0f0f", border: "1px solid #3d1a1a", borderRadius: "3px", color: "#aa6060", fontSize: "11px", fontFamily: mono, padding: "2px 7px", marginRight: "6px", marginBottom: "3px" }}>
                  "{word}": {msg}
                </span>
              ))}
            </div>
          )}

          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            {!results && !loading && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "14px", color: "#2a2a3a" }}>
                {dbState === "idle" && <>
                  <div style={{ fontSize: "32px" }}>📂</div>
                  <div style={{ fontSize: "12px", fontFamily: mono, letterSpacing: "0.08em", textAlign: "center", lineHeight: 1.8 }}>
                    Load a kaikki.org JSONL database<br/>
                    <span style={{ color: "#222235", fontSize: "11px" }}>then enter words to extract</span>
                  </div>
                </>}
                {dbState === "ready" && <>
                  <div style={{ fontSize: "32px" }}>{ }</div>
                  <div style={{ fontSize: "12px", fontFamily: mono, letterSpacing: "0.08em" }}>Enter words and click Extract</div>
                </>}
              </div>
            )}
            {loading && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#4a4a6a", fontFamily: mono, fontSize: "13px", letterSpacing: "0.1em" }}>
                <span style={{ animation: "pulse 1.2s ease-in-out infinite" }}>Extracting from database…</span>
              </div>
            )}
            {results && (
              <textarea
                ref={textareaRef}
                readOnly
                value={jsonString}
                style={{
                  position: "absolute", inset: 0, width: "100%", height: "100%",
                  background: "#0a0a0d", border: "none", color: "#8aaa8a",
                  fontFamily: mono, fontSize: "12px", lineHeight: "1.7",
                  padding: "20px", resize: "none", outline: "none",
                  boxSizing: "border-box", overflowY: "auto",
                }}
              />
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
        * { box-sizing: border-box; }
        textarea::placeholder, input::placeholder { color: #3a3a50 !important; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a40; border-radius: 3px; }
        a:hover { color: #8a8aba !important; }
      `}</style>
    </div>
  );
}
