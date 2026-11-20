    // Splits a comment string into individual sentences.
    function splitIntoSentences(text) {
      const parts = text.match(/[^.!?]*[.!?]+(?:\s|$)/g);
      return parts ? parts.map(s => s.trim()).filter(Boolean) : [text.trim()];
    }

    function normalizeObservationKind(kind) {
      const v = String(kind || "").trim().toLowerCase();
      if (v === "goodpoints" || v === "good_points" || v === "good-points") return "goodPoints";
      if (v === "goodelements" || v === "good_elements" || v === "good-elements") return "goodPoints";
      if (v === "toremedy" || v === "to_remedy" || v === "to-remedy") return "toRemedy";
      return "";
    }

    function defaultObservationSections(bankFilename) {
      const bankSections = getObservationSectionsWithGroups(bankFilename);
      if (bankSections && bankSections.length > 0) {
        return bankSections.map(s => {
          const sLower = s.name.toLowerCase();
          let kind = 'custom';
          if (sLower === 'good points' || sLower === 'points forts' || sLower.includes('good')) kind = 'goodPoints';
          else if (sLower === 'to remedy' || sLower === 'to improve' || sLower.includes('remedy') || sLower.includes('improve')) kind = 'toRemedy';
          return {
            kind,
            label: s.name,
            text: '',
            checklist: []
          };
        });
      }
      return [
        { kind: "goodPoints", label: t('gsSectionGoodPoints', 'Good points'), text: "", checklist: [] },
        { kind: "toRemedy", label: t('gsSectionToImprove', 'To improve'), text: "", checklist: [] }
      ];
    }

    function splitUnescapedPipe(str) {
      const parts = [];
      let cur = '';
      for (let i = 0; i < str.length; i++) {
        if (str[i] === '\\' && i + 1 < str.length && str[i + 1] === '|') {
          cur += '|';
          i++;
        } else if (str[i] === '|') {
          parts.push(cur);
          cur = '';
        } else {
          cur += str[i];
        }
      }
      parts.push(cur);
      return parts;
    }

    function parseChipRemarksString(commentOrRemarks) {
      if (Array.isArray(commentOrRemarks)) {
        return commentOrRemarks.map(r => {
          if (r && typeof r === 'object') {
            return { num: String(r.num || '').trim(), text: String(r.text || '').trim() };
          }
          return { num: '', text: String(r || '').trim() };
        }).filter(r => r && (r.text || r.num));
      }
      const str = String(commentOrRemarks || '').trim();
      if (!str) return [];
      return splitUnescapedPipe(str).map(raw => {
        const part = raw.trim();
        if (!part) return null;
        const m = part.match(/^\[([^\]]+)\]\s*(.*)$/);
        if (m) {
          return { num: m[1].trim(), text: m[2].trim() };
        }
        return { num: '', text: part };
      }).filter(r => r && (r.text || r.num));
    }

    function formatChipRemarksString(remarksOrStr) {
      if (typeof remarksOrStr === 'string') return remarksOrStr.trim();
      if (!Array.isArray(remarksOrStr)) return '';
      return remarksOrStr
        .map(r => {
          const num = (r && typeof r === 'object') ? String(r.num || '').trim() : '';
          const text = (r && typeof r === 'object') ? String(r.text || '').trim() : String(r || '').trim();
          if (!text && !num) return '';
          if (!text) return `[${num}]`;
          const safeText = text.replace(/\|/g, '\\|');
          return num ? `[${num}] ${safeText}` : safeText;
        })
        .filter(Boolean)
        .join(' | ');
    }

    function getNextObservationRemarkNumber(sections, extraRemarks = []) {
      const used = new Set();
      if (Array.isArray(sections)) {
        sections.forEach(sec => {
          const checklist = typeof sectionChecklistSummary === 'function' ? sectionChecklistSummary(sec) : (sec && sec.checklist);
          if (!Array.isArray(checklist)) return;
          checklist.forEach(item => {
            const p = parseObservationChipItem(item);
            if (Array.isArray(p.remarks)) {
              p.remarks.forEach(r => {
                const n = parseInt(r.num, 10);
                if (!isNaN(n) && n > 0) used.add(n);
              });
            }
          });
        });
      }
      if (Array.isArray(extraRemarks)) {
        extraRemarks.forEach(r => {
          const n = parseInt(r && r.num, 10);
          if (!isNaN(n) && n > 0) used.add(n);
        });
      }
      let max = (typeof _studentModalDraft !== 'undefined' && _studentModalDraft && Number(_studentModalDraft.maxRemarkNum)) || 0;
      for (const n of used) {
        if (n > max) max = n;
      }
      return max + 1;
    }

    function createRemarkNumberAllocator(notes) {
      const reserved = new Set();
      const emitted = new Set();
      if (Array.isArray(notes)) {
        notes.forEach(sec => {
          const checklist = typeof sectionChecklistSummary === 'function' ? sectionChecklistSummary(sec) : (sec && sec.checklist);
          if (!Array.isArray(checklist)) return;
          checklist.forEach(item => {
            const p = parseObservationChipItem(item);
            if (Array.isArray(p.remarks)) {
              p.remarks.forEach(r => {
                if (r && r.num && r.num.trim()) {
                  reserved.add(r.num.trim());
                }
              });
            }
          });
        });
      }
      let cursor = 1;
      return {
        next(rem) {
          const raw = (rem && rem.num) ? String(rem.num).trim() : '';
          if (!raw) return '';
          if (!emitted.has(raw)) {
            emitted.add(raw);
            reserved.add(raw);
            return raw;
          }
          while (reserved.has(String(cursor)) || emitted.has(String(cursor))) {
            cursor++;
          }
          const assigned = String(cursor);
          reserved.add(assigned);
          emitted.add(assigned);
          cursor++;
          return assigned;
        }
      };
    }

    function getChipUnderlineThickness(count) {
      const c = Math.min(4, Math.max(0, Number(count) || 0));
      if (c === 2) return '1px';
      if (c === 3) return '2px';
      if (c >= 4) return '3px';
      return '0px';
    }

    function parseObservationChipItem(item) {
      if (!item) return { name: '', count: 1, comment: '', remarks: [] };
      if (typeof item === 'object') {
        const rawName = String(item.name || item.label || item.chipName || '').trim();
        const parsed = parseObservationChipItem(rawName);
        const count = Number(item.count) || parsed.count || 1;
        const remarks = Array.isArray(item.remarks) && item.remarks.length
          ? parseChipRemarksString(item.remarks)
          : parseChipRemarksString(item.comment || parsed.comment || '');
        const comment = formatChipRemarksString(remarks);
        return { name: parsed.name, count: Math.max(1, count), comment, remarks };
      }
      const str = String(item || '').trim();
      let comment = '';
      let chipPart = str;
      const colonIdx = str.indexOf(':');
      if (colonIdx !== -1) {
        chipPart = str.slice(0, colonIdx).trim();
        comment = str.slice(colonIdx + 1).trim();
      }
      const remarks = parseChipRemarksString(comment);
      const normalizedComment = formatChipRemarksString(remarks);
      const match = chipPart.match(/^(.*?)(?:\s*(?:\((?:x|×)?(\d+)\)|(?:x|×)(\d+)))$/i);
      if (match) {
        const baseName = (match[1] || '').trim();
        const count = parseInt(match[2] || match[3], 10) || 1;
        return { name: baseName || chipPart, count: Math.max(1, count), comment: normalizedComment, remarks };
      }
      return { name: chipPart, count: 1, comment: normalizedComment, remarks };
    }

    function formatObservationChipItem(name, count, commentOrRemarks) {
      const c = Math.max(1, Number(count) || 1);
      const n = String(name || '').trim();
      const comm = Array.isArray(commentOrRemarks)
        ? formatChipRemarksString(commentOrRemarks)
        : String(commentOrRemarks || '').trim();
      const countPart = c > 1 ? ` (x${c})` : '';
      if (comm) {
        return `${n}${countPart}: ${comm}`;
      }
      return `${n}${countPart}`;
    }

    function cloneObservationSection(section) {
      return {
        kind: normalizeObservationKind(section && section.kind) || "custom",
        label: String((section && section.label) || ""),
        text: String((section && section.text) || ""),
        checklist: Array.isArray(section && section.checklist)
          ? section.checklist.map(v => {
              if (v && typeof v === 'object' && v.name) {
                return formatObservationChipItem(v.name, v.count, v.comment);
              }
              return String(v || "").trim();
            }).filter(Boolean)
          : []
      };
    }

    function getObservationChecklistItems(bankFilename) {
      const groups = getObservationChecklistGroups(bankFilename);
      return groups.flatMap(g => g.items);
    }

    function getObservationChecklistGroups(bankFilename) {
      function normalizeGroupItems(items) {
        return Array.isArray(items)
          ? items.map(v => String(v || "").trim()).filter(Boolean)
          : [];
      }

      function normalizeRawGroups(raw) {
        if (!raw) return [];
        if (Array.isArray(raw)) {
          return raw
            .map(g => {
              const sec = String((g && (g.section || g.sectionName || g.sectionTitle)) || "").trim() || t('gsSectionGeneral', 'General Observations');
              const col = String((g && (g.color || g.sectionColor)) || "").trim();
              const cat = String((g && (g.type || g.category || g.name || g.label)) || "").trim();
              return {
                section: sec,
                color: col,
                sectionColor: col,
                type: cat || "Criteria",
                category: cat,
                items: normalizeGroupItems(g && g.items)
              };
            })
            .filter(g => g.items.length > 0);
        } else if (typeof raw === "object") {
          return Object.entries(raw)
            .map(([type, items]) => ({
              section: t('gsSectionGeneral', 'General Observations'),
              color: "",
              sectionColor: "",
              type: String(type || "").trim() || "Criteria",
              category: String(type || "").trim(),
              items: normalizeGroupItems(items)
            }))
            .filter(g => g.items.length > 0);
        }
        return [];
      }

      const targetBank = bankFilename || (typeof _activeChipBankFilename !== 'undefined' ? _activeChipBankFilename : null);
      if (targetBank && typeof _availableChipBanks !== 'undefined' && Array.isArray(_availableChipBanks)) {
        const b = _availableChipBanks.find(x =>
          x.filename === targetBank ||
          x.id === targetBank ||
          x.name === targetBank ||
          (x.filename && String(x.filename).replace(/\.(js|json)$/i, '') === String(targetBank).replace(/\.(js|json)$/i, ''))
        );
        if (b && Array.isArray(b.chips) && b.chips.length > 0) {
          const res = normalizeRawGroups(b.chips);
          if (res.length > 0) return res;
        }
      }

      if (typeof OBSERVATION_CHECKLIST_GROUPS !== "undefined" && OBSERVATION_CHECKLIST_GROUPS) {
        const res = normalizeRawGroups(OBSERVATION_CHECKLIST_GROUPS);
        if (res.length > 0) return res;
      }

      if (typeof OBSERVATION_CHECKLIST_ITEMS !== "undefined" && Array.isArray(OBSERVATION_CHECKLIST_ITEMS)) {
        const items = OBSERVATION_CHECKLIST_ITEMS
          .map(v => String(v || "").trim())
          .filter(Boolean);
        return items.length > 0 ? [{ section: t('gsSectionGeneral', 'General Observations'), color: "", sectionColor: "", type: "Criteria", category: "", items }] : [];
      }

      if (typeof _availableChipBanks !== 'undefined' && Array.isArray(_availableChipBanks) && _availableChipBanks.length > 0) {
        for (const b of _availableChipBanks) {
          if (b && Array.isArray(b.chips) && b.chips.length > 0) {
            const res = normalizeRawGroups(b.chips);
            if (res.length > 0) return res;
          }
        }
      }

      if (!Array.isArray(XLSM_CRITERIA)) return [];
      const out = [];
      const seen = new Set();
      XLSM_CRITERIA.forEach(c => {
        if (!c || typeof c.name !== "string") return;
        const name = c.name.trim();
        if (!name) return;
        if (/^custom\s*\d*$/i.test(name)) return;
        const hasComments = c.comments && typeof c.comments === "object" && Object.keys(c.comments).length > 0;
        if (!hasComments) return;
        const key = name.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        out.push(name);
      });
      return out.length > 0 ? [{ section: t('gsSectionGeneral', 'General Observations'), color: "", sectionColor: "", type: "Criteria", category: "", items: out }] : [];
    }

    function getObservationSectionsWithGroups(bankFilename) {
      const groups = getObservationChecklistGroups(bankFilename);
      const sectionsMap = new Map();

      groups.forEach(g => {
        const secName = g.section || t('gsSectionGeneral', 'General Observations');
        const secKey = secName.trim().toLowerCase();
        const rawColor = String(g.color || g.sectionColor || '').trim();

        if (!sectionsMap.has(secKey)) {
          sectionsMap.set(secKey, {
            name: secName,
            color: rawColor || '',
            explicitColor: rawColor || '',
            groups: []
          });
        }
        const secObj = sectionsMap.get(secKey);
        if (!secObj.explicitColor && rawColor) {
          secObj.explicitColor = rawColor;
          secObj.color = rawColor;
        }
        secObj.groups.push(g);
      });

      sectionsMap.forEach(secObj => {
        if (!secObj.color) {
          const secLower = secObj.name.toLowerCase();
          if (secLower.includes('good') || secLower.includes('fort') || secLower.includes('strength') || secLower.includes('bien') || secLower.includes('positif')) {
            secObj.color = '#16a34a';
          } else if (secLower.includes('remedy') || secLower.includes('improv') || secLower.includes('faible') || secLower.includes('amélio') || secLower.includes('difficul')) {
            secObj.color = '#dc2626';
          } else if (secLower.includes('action') || secLower.includes('plan') || secLower.includes('next') || secLower.includes('étape') || secLower.includes('conseil')) {
            secObj.color = '#d97706';
          } else {
            secObj.color = '#0284c7';
          }
        }
      });

      return Array.from(sectionsMap.values());
    }

    function ensureObservationChecklistSections(sections, bankFilename) {
      const list = Array.isArray(sections) ? sections.map(cloneObservationSection) : [];
      const bankSections = getObservationSectionsWithGroups(bankFilename);

      list.forEach(s => {
        if (s.kind) return;
        const label = s.label.trim().toLowerCase();
        if (label === "to remedy" || label === "to improve" || label === "a améliorer") s.kind = "toRemedy";
        else if (label === "good points" || label === "good elements" || label === "points forts") s.kind = "goodPoints";
        else s.kind = "custom";
      });

      const existingLabels = new Set(list.map(s => s.label.trim().toLowerCase()));

      if (list.length === 0) {
        return defaultObservationSections(bankFilename);
      }

      bankSections.forEach(bs => {
        if (!existingLabels.has(bs.name.trim().toLowerCase())) {
          const sLower = bs.name.toLowerCase();
          let kind = 'custom';
          if (sLower === 'good points' || sLower === 'points forts' || sLower.includes('good')) kind = 'goodPoints';
          else if (sLower === 'to remedy' || sLower === 'to improve' || sLower.includes('remedy') || sLower.includes('improve')) kind = 'toRemedy';
          list.push({
            kind,
            label: bs.name,
            text: '',
            checklist: []
          });
        }
      });

      return list;
    }

    function sectionChecklistSummary(section) {
      return Array.isArray(section && section.checklist)
        ? section.checklist.map(s => {
            if (s && typeof s === 'object' && s.name) {
              return formatObservationChipItem(s.name, s.count, s.comment);
            }
            return String(s || "").trim();
          }).filter(Boolean)
        : [];
    }

    function sectionDisplayText(section) {
      const checklist = sectionChecklistSummary(section);
      const text = String((section && section.text) || "").trim();
      if (checklist.length > 0 && text) return `${checklist.join(", ")} | ${text}`;
      if (checklist.length > 0) return checklist.join(", ");
      return text;
    }

    function sectionHasContent(section) {
      return !!sectionDisplayText(section).trim();
    }

    function applyObsCellTooltip(td, sections) {
      if (!td) return;
      td.removeAttribute('title');
      const blocks = (Array.isArray(sections) ? sections : []).map(s => {
        const checklist = sectionChecklistSummary(s);
        const text = String((s && s.text) || '').trim();
        if (checklist.length === 0 && !text) return '';
        const parts = [];
        if (s && s.label) parts.push(`{blue:**${s.label}:**}`);
        if (checklist.length > 0) parts.push(`{green:*•*} ${checklist.join(' · ')}`);
        if (text) parts.push(text);
        return parts.join('\n');
      }).filter(Boolean);
      if (blocks.length === 0) {
        td.removeAttribute('data-hover-help');
        td.removeAttribute('data-hover-help-title');
        td.removeAttribute('data-hover-help-accent');
        return;
      }
      td.setAttribute('data-hover-help-title', typeof t === 'function' ? (t('gsColObservations') || 'Observations') : 'Observations');
      td.setAttribute('data-hover-help', blocks.join('\n\n'));
      td.setAttribute('data-hover-help-accent', 'blue');
    }

    function resolveObservationSectionColor(secOrLabel, kind = '', bankFilename = null) {
      if (secOrLabel && typeof secOrLabel === 'object') {
        if (secOrLabel.color && String(secOrLabel.color).trim() && secOrLabel.color !== '#555555' && secOrLabel.color !== '#555') {
          return String(secOrLabel.color).trim();
        }
        if (!kind && secOrLabel.kind) kind = secOrLabel.kind;
        secOrLabel = secOrLabel.label || secOrLabel.name || '';
      }
      const label = String(secOrLabel || '').trim();
      const lblLower = label.toLowerCase();
      const k = String(kind || '').trim().toLowerCase();

      // Helper to search a specific chip bank for matching section or group color
      function findColorInBank(bankFn) {
        if (typeof getObservationSectionsWithGroups === 'function') {
          const bankSections = getObservationSectionsWithGroups(bankFn);
          if (Array.isArray(bankSections) && bankSections.length > 0) {
            // 1. Exact section name match
            const exactMatch = bankSections.find(bs => String(bs.name || '').trim().toLowerCase() === lblLower);
            if (exactMatch) {
              if (exactMatch.explicitColor) return exactMatch.explicitColor;
              if (exactMatch.color) return exactMatch.color;
            }

            // 2. Semantic match by kind or multilingual keywords
            const isGood = k === 'goodpoints' || lblLower.includes('good') || lblLower.includes('fort') || lblLower.includes('strength') || lblLower.includes('bien') || lblLower.includes('positif');
            const isRemedy = k === 'toremedy' || lblLower.includes('remedy') || lblLower.includes('improv') || lblLower.includes('amélio') || lblLower.includes('faible') || lblLower.includes('difficul') || lblLower.includes('lacune');
            const isAction = k === 'action' || lblLower.includes('action') || lblLower.includes('next') || lblLower.includes('étape') || lblLower.includes('conseil');

            if (isGood) {
              const goodSec = bankSections.find(bs => {
                const bName = String(bs.name || '').toLowerCase();
                return bName.includes('good') || bName.includes('fort') || bName.includes('strength') || bName.includes('bien') || bName.includes('positif');
              });
              if (goodSec && (goodSec.explicitColor || goodSec.color)) return goodSec.explicitColor || goodSec.color;
            } else if (isRemedy) {
              const remedySec = bankSections.find(bs => {
                const bName = String(bs.name || '').toLowerCase();
                return bName.includes('remedy') || bName.includes('improv') || bName.includes('amélio') || bName.includes('faible') || bName.includes('difficul');
              });
              if (remedySec && (remedySec.explicitColor || remedySec.color)) return remedySec.explicitColor || remedySec.color;
            } else if (isAction) {
              const actionSec = bankSections.find(bs => {
                const bName = String(bs.name || '').toLowerCase();
                return bName.includes('action') || bName.includes('next') || bName.includes('étape') || bName.includes('conseil');
              });
              if (actionSec && (actionSec.explicitColor || actionSec.color)) return actionSec.explicitColor || actionSec.color;
            }
          }
        }

        if (typeof getObservationChecklistGroups === 'function') {
          const groups = getObservationChecklistGroups(bankFn);
          if (Array.isArray(groups)) {
            const gMatch = groups.find(g =>
              (g.section && String(g.section).trim().toLowerCase() === lblLower) ||
              (g.type && String(g.type).trim().toLowerCase() === lblLower)
            );
            if (gMatch && (gMatch.color || gMatch.sectionColor)) return gMatch.color || gMatch.sectionColor;
          }
        }
        return null;
      }

      // 1. Check specified bankFilename or active chip bank first
      const targetBank = bankFilename || (typeof _activeChipBankFilename !== 'undefined' ? _activeChipBankFilename : null);
      if (targetBank) {
        const found = findColorInBank(targetBank);
        if (found) return found;
      }

      // 2. Check all available custom chip banks if targetBank didn't match
      if (typeof _availableChipBanks !== 'undefined' && Array.isArray(_availableChipBanks)) {
        for (const b of _availableChipBanks) {
          if (b.filename && b.filename !== targetBank) {
            const found = findColorInBank(b.filename);
            if (found) return found;
          }
        }
      }

      // 3. Fallback to default Kind checks (standard application theme)
      if (k === 'goodpoints') return '#16a34a';
      if (k === 'toremedy') return '#dc2626';
      if (k === 'action') return '#d97706';

      // 4. Multilingual keyword matching fallbacks
      if (
        lblLower.includes('good') || lblLower.includes('bien') || lblLower.includes('fort') ||
        lblLower.includes('strength') || lblLower.includes('positif') || lblLower.includes('succès') ||
        lblLower.includes('stärk') || lblLower.includes('lob') || lblLower.includes('positi') ||
        lblLower.includes('ottim') || lblLower.includes('bene') || lblLower.includes('reussi') ||
        lblLower.includes('acquis') || lblLower.includes('maîtris')
      ) {
        return '#16a34a';
      }

      if (
        lblLower.includes('remedy') || lblLower.includes('remédi') || lblLower.includes('improv') ||
        lblLower.includes('amélio') || lblLower.includes('faible') || lblLower.includes('difficul') ||
        lblLower.includes('progress') || lblLower.includes('attention') || lblLower.includes('schwach') ||
        lblLower.includes('schwäch') || lblLower.includes('fehler') || lblLower.includes('criti') ||
        lblLower.includes('lacune') || lblLower.includes('manque')
      ) {
        return '#dc2626';
      }

      if (
        lblLower.includes('action') || lblLower.includes('plan') || lblLower.includes('next') ||
        lblLower.includes('étape') || lblLower.includes('conseil') || lblLower.includes('objectif') ||
        lblLower.includes('but') || lblLower.includes('ziel') || lblLower.includes('prossim')
      ) {
        return '#d97706';
      }

      if (
        lblLower.includes('gramm') || lblLower.includes('orthog') || lblLower.includes('vocab') ||
        lblLower.includes('lexiq') || lblLower.includes('lang') || lblLower.includes('syntax') ||
        lblLower.includes('sprach') || lblLower.includes('lingua')
      ) {
        return '#0284c7';
      }

      if (
        lblLower.includes('méthod') || lblLower.includes('method') || lblLower.includes('organis') ||
        lblLower.includes('travail') || lblLower.includes('soin') || lblLower.includes('structur') ||
        lblLower.includes('zeit') || lblLower.includes('gest')
      ) {
        return '#7c3aed';
      }

      return '#0284c7';
    }

    function isObservationSectionMatch(groupOrSec, sampleLabel = '', sampleKind = '') {
      if (!groupOrSec) return false;
      const secName = typeof groupOrSec === 'object' ? (groupOrSec.section || groupOrSec.name || groupOrSec.sectionName || '') : String(groupOrSec);
      const secLower = String(secName || '').trim().toLowerCase();
      const lblLower = String(sampleLabel || '').trim().toLowerCase();
      const normTargetKind = typeof normalizeObservationKind === 'function' ? normalizeObservationKind(sampleKind) : '';
      const kTarget = (normTargetKind || String(sampleKind || '').trim()).toLowerCase();
      const normSecKind = typeof groupOrSec === 'object' && groupOrSec.kind && typeof normalizeObservationKind === 'function' ? normalizeObservationKind(groupOrSec.kind) : '';
      const kSec = (normSecKind || (typeof groupOrSec === 'object' && groupOrSec.kind ? String(groupOrSec.kind).trim() : '')).toLowerCase();

      // 1. Exact string match on section name / label
      if (secLower && lblLower && secLower === lblLower) return true;

      // 2. Kind semantic matching (goodPoints vs toRemedy vs action)
      const isTargetGood = kTarget === 'goodpoints' || lblLower.includes('good') || lblLower.includes('fort') || lblLower.includes('strength') || lblLower.includes('bien') || lblLower.includes('positif') || lblLower.includes('stärk') || lblLower.includes('ottim');
      const isTargetRemedy = kTarget === 'toremedy' || lblLower.includes('remedy') || lblLower.includes('improv') || lblLower.includes('amélio') || lblLower.includes('faible') || lblLower.includes('difficul') || lblLower.includes('schwach') || lblLower.includes('lacune');
      const isTargetAction = kTarget === 'action' || lblLower.includes('action') || lblLower.includes('plan') || lblLower.includes('next') || lblLower.includes('étape') || lblLower.includes('conseil') || lblLower.includes('ziel');

      const isSecGood = kSec === 'goodpoints' || secLower.includes('good') || secLower.includes('fort') || secLower.includes('strength') || secLower.includes('bien') || secLower.includes('positif') || secLower.includes('stärk') || secLower.includes('ottim');
      const isSecRemedy = kSec === 'toremedy' || secLower.includes('remedy') || secLower.includes('improv') || secLower.includes('amélio') || secLower.includes('faible') || secLower.includes('difficul') || secLower.includes('schwach') || secLower.includes('lacune');
      const isSecAction = kSec === 'action' || secLower.includes('action') || secLower.includes('plan') || secLower.includes('next') || secLower.includes('étape') || secLower.includes('conseil') || secLower.includes('ziel');

      if (isTargetGood && isSecGood) return true;
      if (isTargetRemedy && isSecRemedy) return true;
      if (isTargetAction && isSecAction) return true;

      // Mutually exclusive: if target is good and sec is remedy (or vice versa), NEVER match
      if ((isTargetGood && isSecRemedy) || (isTargetRemedy && isSecGood)) return false;
      if ((isTargetGood && isSecAction) || (isTargetAction && isSecGood)) return false;
      if ((isTargetRemedy && isSecAction) || (isTargetAction && isSecRemedy)) return false;

      // 3. Substring containment if both non-empty and neither is standard kind
      if (secLower && lblLower && !isTargetGood && !isTargetRemedy && !isTargetAction && !isSecGood && !isSecRemedy && !isSecAction) {
        if (secLower.includes(lblLower) || lblLower.includes(secLower)) return true;
      }

      return false;
    }

    function isObservationSectionConflict(groupOrSec, sampleLabel = '', sampleKind = '') {
      if (!groupOrSec) return false;
      const secName = typeof groupOrSec === 'object' ? (groupOrSec.section || groupOrSec.name || groupOrSec.sectionName || '') : String(groupOrSec);
      const secLower = String(secName || '').trim().toLowerCase();
      const lblLower = String(sampleLabel || '').trim().toLowerCase();
      const normTargetKind = typeof normalizeObservationKind === 'function' ? normalizeObservationKind(sampleKind) : '';
      const kTarget = (normTargetKind || String(sampleKind || '').trim()).toLowerCase();
      const normSecKind = typeof groupOrSec === 'object' && groupOrSec.kind && typeof normalizeObservationKind === 'function' ? normalizeObservationKind(groupOrSec.kind) : '';
      const kSec = (normSecKind || (typeof groupOrSec === 'object' && groupOrSec.kind ? String(groupOrSec.kind).trim() : '')).toLowerCase();

      const isTargetGood = kTarget === 'goodpoints' || lblLower.includes('good') || lblLower.includes('fort') || lblLower.includes('strength') || lblLower.includes('bien') || lblLower.includes('positif') || lblLower.includes('stärk') || lblLower.includes('ottim');
      const isTargetRemedy = kTarget === 'toremedy' || lblLower.includes('remedy') || lblLower.includes('improv') || lblLower.includes('amélio') || lblLower.includes('faible') || lblLower.includes('difficul') || lblLower.includes('schwach') || lblLower.includes('lacune');
      const isTargetAction = kTarget === 'action' || lblLower.includes('action') || lblLower.includes('plan') || lblLower.includes('next') || lblLower.includes('étape') || lblLower.includes('conseil') || lblLower.includes('ziel');

      const isSecGood = kSec === 'goodpoints' || secLower.includes('good') || secLower.includes('fort') || secLower.includes('strength') || secLower.includes('bien') || secLower.includes('positif') || secLower.includes('stärk') || secLower.includes('ottim');
      const isSecRemedy = kSec === 'toremedy' || secLower.includes('remedy') || secLower.includes('improv') || secLower.includes('amélio') || secLower.includes('faible') || secLower.includes('difficul') || secLower.includes('schwach') || secLower.includes('lacune');
      const isSecAction = kSec === 'action' || secLower.includes('action') || secLower.includes('plan') || secLower.includes('next') || secLower.includes('étape') || secLower.includes('conseil') || secLower.includes('ziel');

      if ((isTargetGood && isSecRemedy) || (isTargetRemedy && isSecGood)) return true;
      if ((isTargetGood && isSecAction) || (isTargetAction && isSecGood)) return true;
      if ((isTargetRemedy && isSecAction) || (isTargetAction && isSecRemedy)) return true;

      return false;
    }

    function resolveObservationChipColor(chipName, sectionColor = '', sampleKind = '', sampleLabel = '', bankFilename = null) {
      const nameLower = String(chipName || '').trim().toLowerCase();
      const targetBank = bankFilename || (typeof _activeChipBankFilename !== 'undefined' ? _activeChipBankFilename : null);
      const hasSectionContext = !!(String(sampleLabel || '').trim() || String(sampleKind || '').trim());

      if (typeof getObservationChecklistGroups === 'function') {
        const groups = getObservationChecklistGroups(targetBank);
        if (Array.isArray(groups) && groups.length > 0) {
          // 1. If we have section context, first search specifically within matching section groups
          if (hasSectionContext) {
            for (const g of groups) {
              if (isObservationSectionMatch(g, sampleLabel, sampleKind)) {
                if (Array.isArray(g.items) && g.items.some(item => String(item || '').trim().toLowerCase() === nameLower)) {
                  if (g.color) return g.color;
                  if (g.section) {
                    const secCol = resolveObservationSectionColor(g.section, sampleKind, targetBank);
                    if (secCol) return secCol;
                  }
                }
              }
            }
          }

          // 2. If NO section context was provided at all, search across all groups
          if (!hasSectionContext) {
            for (const g of groups) {
              if (Array.isArray(g.items) && g.items.some(item => String(item || '').trim().toLowerCase() === nameLower)) {
                if (g.color) return g.color;
                if (g.section) {
                  const secCol = resolveObservationSectionColor(g.section, '', targetBank);
                  if (secCol) return secCol;
                }
              }
            }
          }
        }
      }

      if (sectionColor && sectionColor !== '#555555' && sectionColor !== '#555' && sectionColor !== '#0f172a') {
        return sectionColor;
      }

      return resolveObservationSectionColor(sampleLabel, sampleKind, targetBank);
    }

    function renderObservationPill(nameOrObj, kind, label, preferredColor = '', remarkAllocator = null) {
      const parsed = parseObservationChipItem(nameOrObj);
      const name = parsed.name;
      const count = parsed.count;
      const lbl = String(label || "").trim();
      const chipCol = resolveObservationChipColor(name, preferredColor, kind, lbl);
      const border = chipCol;
      const color = (typeof getHighContrastTextColor === 'function') ? getHighContrastTextColor(chipCol) : chipCol;
      const bg = `${chipCol}18`;

      const normK = typeof normalizeObservationKind === 'function' ? normalizeObservationKind(kind) : '';
      const k = (normK || (kind ? String(kind) : '')).toLowerCase();
      const lblLower = lbl.toLowerCase();
      let pillClass = "obs-pill obs-pill-custom";
      if (k === 'goodpoints' || lblLower.includes('good') || lblLower.includes('fort') || lblLower.includes('strength') || lblLower.includes('stärk') || lblLower.includes('bien') || chipCol === '#16a34a' || chipCol === '#166534') {
        pillClass = "obs-pill obs-pill-good";
      } else if (k === 'toremedy' || lblLower.includes('remedy') || lblLower.includes('improv') || lblLower.includes('amélio') || lblLower.includes('faible') || lblLower.includes('schwach') || lblLower.includes('difficul') || chipCol === '#dc2626' || chipCol === '#991b1b') {
        pillClass = "obs-pill obs-pill-remedy";
      }

      const remarks = Array.isArray(parsed.remarks) ? parsed.remarks : parseChipRemarksString(parsed.comment || "");
      const underlineThickness = getChipUnderlineThickness(count);
      const nameHtml = underlineThickness !== '0px'
        ? `<span class="obs-pill-name" style="text-decoration:underline;text-decoration-thickness:${underlineThickness};text-underline-offset:2px;">${escapeHtml(name)}</span>`
        : `<span class="obs-pill-name">${escapeHtml(name)}</span>`;

      const numOnlyRemarks = remarks.filter(r => (!r.text || !r.text.trim()) && r.num && r.num.trim());
      const textRemarks = remarks.filter(r => r.text && r.text.trim());
      let numOnlyHtml = '';
      if (numOnlyRemarks.length > 0) {
        numOnlyHtml = numOnlyRemarks.map(rem => {
          const displayNum = remarkAllocator ? remarkAllocator.next(rem) : rem.num.trim();
          return `<sup class="obs-pill-remark-num" style="font-size:0.75em;font-weight:800;line-height:0;vertical-align:super;margin-left:2px;">[${escapeHtml(displayNum)}]</sup>`;
        }).join('');
      }
      let commentHtml = '';
      if (textRemarks.length > 0) {
        const joined = textRemarks.map(rem => {
          const rawNum = rem && rem.num ? String(rem.num).trim() : '';
          if (!rawNum) {
            return escapeHtml(rem.text);
          }
          const displayNum = remarkAllocator ? remarkAllocator.next(rem) : rawNum;
          return displayNum
            ? `${escapeHtml(rem.text)}<sup class="obs-pill-remark-num" style="font-size:0.75em;font-weight:800;line-height:0;vertical-align:super;margin-left:2px;">[${escapeHtml(displayNum)}]</sup>`
            : escapeHtml(rem.text);
        }).join(', ');
        commentHtml = `<span class="obs-pill-comment" style="font-weight:600;margin-left:2px;opacity:0.95;">: ${joined}</span>`;
      }

      return `<span class="${pillClass}" style="display:inline-block;padding:1px 4px;border-radius:4px;font-size:9px;font-weight:700;line-height:1.15;margin:1px 3px 1px 0;background:transparent;color:${color};border:0.5px dotted ${border};box-shadow:none;">${nameHtml}${numOnlyHtml}${commentHtml}</span>`;
    }

    function groupObservationChipsByCategory(chips, sectionLabel, bankFilename, sectionKind = '') {
      if (!Array.isArray(chips) || chips.length === 0) return [];
      const groups = getObservationChecklistGroups(bankFilename);
      const generalLabel = (typeof t === 'function' ? (t('gsCategoryGeneral') || 'General') : 'General');

      const secGroups = groups.filter(g => isObservationSectionMatch(g, sectionLabel, sectionKind));
      const hasSpecificSecGroups = secGroups.length > 0;
      const targetGroups = hasSpecificSecGroups ? secGroups : groups.filter(g => !isObservationSectionConflict(g, sectionLabel, sectionKind));

      const categoryMap = new Map();
      const uncategorized = [];

      chips.forEach(chip => {
        const parsed = parseObservationChipItem(chip);
        const chipClean = parsed.name;
        if (!chipClean) return;
        const chipLower = chipClean.toLowerCase();

        let foundGroup = null;
        for (const g of targetGroups) {
          if (Array.isArray(g.items) && g.items.some(item => String(item || '').trim().toLowerCase() === chipLower)) {
            foundGroup = g;
            break;
          }
        }

        if (foundGroup) {
          const catName = String(foundGroup.type || foundGroup.category || generalLabel).trim() || generalLabel;
          if (!categoryMap.has(catName)) {
            categoryMap.set(catName, {
              category: catName,
              color: foundGroup.color || '',
              chips: []
            });
          }
          categoryMap.get(catName).chips.push(parsed);
        } else {
          uncategorized.push(parsed);
        }
      });

      const result = Array.from(categoryMap.values());
      if (uncategorized.length > 0) {
        result.push({
          category: generalLabel,
          color: '',
          chips: uncategorized
        });
      }

      return result;
    }

    function renderObservationSectionHtml(section, bankFilename = null, remarkAllocator = null) {
      if (!section) return "";
      const label = String(section.label || "").trim();
      const checklist = sectionChecklistSummary(section);
      const text = String(section.text || "").trim();

      if (checklist.length === 0 && !text) return "";

      const targetBank = bankFilename || section.bankFilename || (typeof _activeChipBankFilename !== 'undefined' ? _activeChipBankFilename : null);
      const secColor = resolveObservationSectionColor(section, section.kind, targetBank);

      let pillsHtml = "";
      if (checklist.length > 0) {
        const catGroups = groupObservationChipsByCategory(checklist, label, targetBank, section.kind);
        if (catGroups.length > 0) {
          pillsHtml = catGroups.map(cg => `
            <span class="obs-category-span" style="display:inline-flex;align-items:center;flex-wrap:wrap;gap:2px;margin:0 4px 0 0;vertical-align:middle;">
              <span class="obs-category-tag" style="font-size:10px;font-weight:800;letter-spacing:0.02em;color:#333333;margin-right:2px;white-space:nowrap;">
                ${escapeHtml(cg.category)}:
              </span>
              ${cg.chips.map(chip => renderObservationPill(chip, section.kind, label, cg.color || secColor, remarkAllocator)).join("")}
            </span>
          `).join("");
        }
      }

      const hasChips = checklist.length > 0;
      const feedbackHtml = text
        ? `<div class="obs-feedback" style="display:block;width:100%;font-size:10px;line-height:1.35;color:#1e293b;margin-top:${hasChips ? '3px' : '1px'};"><span class="obs-feedback-body" style="display:block;">${renderMd(text)}</span></div>`
        : "";

      const labelHtml = label
        ? `<span class="obs-label" style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.03em;color:#111;display:inline-flex;align-items:center;gap:3px;margin-right:4px;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${secColor};"></span>${escapeHtml(label)}:</span>`
        : "";

      const topChipsLine = (labelHtml || pillsHtml)
        ? `<div class="obs-chips-line" style="display:flex;flex-wrap:wrap;align-items:center;gap:2px 4px;">${labelHtml}${pillsHtml}</div>`
        : "";

      return `<div class="obs-section" style="margin-bottom:4px;line-height:1.35;">${topChipsLine}${feedbackHtml}</div>`;
    }

    function renderObservationInlineHtml(section, bankFilename = null, remarkAllocator = null) {
      if (!section) return "";
      const label = String(section.label || "").trim();
      const checklist = sectionChecklistSummary(section);
      const text = String(section.text || "").trim();

      if (checklist.length === 0 && !text) return "";

      const targetBank = bankFilename || section.bankFilename || (typeof _activeChipBankFilename !== 'undefined' ? _activeChipBankFilename : null);
      const secColor = resolveObservationSectionColor(section, section.kind, targetBank);

      const labelPrefix = label ? `<strong class="obs-label" style="color:#111;margin-right:4px;font-size:9.5px;text-transform:uppercase;letter-spacing:0.03em;">${escapeHtml(label)}:</strong>` : "";
      let pills = "";
      if (checklist.length > 0) {
        const catGroups = groupObservationChipsByCategory(checklist, label, targetBank, section.kind);
        pills = catGroups.map(cg => `
          <span class="obs-category-span" style="display:inline-flex;align-items:center;flex-wrap:wrap;gap:2px;margin:0 4px 0 0;vertical-align:middle;">
            <span class="obs-category-tag" style="font-size:10px;font-weight:800;letter-spacing:0.02em;color:#333333;margin-right:2px;white-space:nowrap;">${escapeHtml(cg.category)}:</span>
            ${cg.chips.map(chip => renderObservationPill(chip, section.kind, label, cg.color || secColor, remarkAllocator)).join("")}
          </span>
        `).join("");
      }
      const hasChips = checklist.length > 0;
      const textPart = text ? `<div class="obs-inline-text" style="display:block;width:100%;color:#1e293b;font-size:9.5px;margin-top:${hasChips ? '2px' : '0'};"><span style="display:block;">${renderMd(text)}</span></div>` : "";

      const topRow = (labelPrefix || pills)
        ? `<div class="obs-inline-chips-line" style="display:flex;flex-wrap:wrap;align-items:center;gap:2px 4px;">${labelPrefix}${pills}</div>`
        : "";

      return `<div class="obs-inline-row" style="margin-bottom:3px;">${topRow}${textPart}</div>`;
    }

    // ── Helper to determine if a string is a section name / dummy label rather than a genuine category ──
    function isSectionNameOrDummy(catCandidate, secName = '', sampleLabel = '') {
      if (!catCandidate || typeof catCandidate !== 'string') return true;
      const clean = catCandidate.trim().toLowerCase();
      if (!clean || clean === 'criteria' || clean === '—' || clean === '-') return true;

      if (secName && clean === String(secName).trim().toLowerCase()) return true;
      if (sampleLabel && clean === String(sampleLabel).trim().toLowerCase()) return true;

      const sectionKeywords = [
        'good points', 'good elements', 'points forts', 'stärken', 'punti di forza',
        'to remedy', 'to improve', 'points faibles', 'à améliorer', 'a ameliorer', 'schwächen', 'da migliorare',
        'action', 'next steps', 'prochaines étapes', 'prochaines etapes', 'prossimi passi', 'nächste schritte',
        'general observations', 'observations générales', 'observations generales', 'allgemeine beobachtungen', 'osservazioni generali',
        'general', 'allgemein', 'generale'
      ];
      if (sectionKeywords.includes(clean)) return true;

      if (typeof t === 'function') {
        const locGood = String(t('gsSectionGoodPoints', '') || '').trim().toLowerCase();
        const locRemedy = String(t('gsSectionToImprove', '') || '').trim().toLowerCase();
        const locGen = String(t('gsSectionGeneral', '') || '').trim().toLowerCase();
        if (locGood && clean === locGood) return true;
        if (locRemedy && clean === locRemedy) return true;
        if (locGen && clean === locGen) return true;
      }

      return false;
    }

    // ── Top Observation Chips Aggregator & UI ─────────────────────
    function getTopObservationChips(classObj, options = {}) {
      if (!classObj || !Array.isArray(classObj.students) || classObj.students.length === 0) return [];
      const semFilter = options.semester || 'all';
      const testIndex = options.testIndex != null ? Number(options.testIndex) : null;
      const limit = options.limit || 10;
      const testCfg = (testIndex != null && classObj.testConfigs && classObj.testConfigs[options.semester] && classObj.testConfigs[options.semester][testIndex]) || null;
      const bankFilename = options.bankFilename
        || (testCfg && testCfg.chipBank)
        || classObj.chipBank
        || (Array.isArray(classObj.chipBanks) && classObj.chipBanks[0])
        || (typeof _activeChipBankFilename !== 'undefined' ? _activeChipBankFilename : null);

      const bankSections = typeof getObservationSectionsWithGroups === 'function' ? getObservationSectionsWithGroups(bankFilename) : [];
      const bankGroups = typeof getObservationChecklistGroups === 'function' ? getObservationChecklistGroups(bankFilename) : [];

      const countsMap = new Map();
      const sectionCountsMap = new Map();
      const totalRelevantStudents = classObj.students.length;

      classObj.students.forEach(student => {
        if (!student.testNotes) return;
        const sems = (semFilter === 'sem1' || semFilter === 'sem2') ? [semFilter] : ['sem1', 'sem2'];

        sems.forEach(sem => {
          const noteArr = student.testNotes[sem];
          if (!Array.isArray(noteArr)) return;

          const maxTestCount = (classObj.testCounts && typeof classObj.testCounts[sem] === 'number')
            ? classObj.testCounts[sem]
            : noteArr.length;

          const testIndicesToCheck = testIndex != null ? [testIndex] : Array.from({ length: maxTestCount }, (_, i) => i);

          testIndicesToCheck.forEach(ti => {
            const sections = noteArr[ti];
            if (!Array.isArray(sections)) return;

            sections.forEach(sec => {
              if (!sec) return;
              const checklist = (typeof sectionChecklistSummary === 'function')
                ? sectionChecklistSummary(sec)
                : (Array.isArray(sec.checklist) ? sec.checklist : []);

              if (!checklist || !checklist.length) return;

              const secName = String(sec.label || '').trim() || (sec.kind === 'goodPoints' ? 'Good points' : (sec.kind === 'toRemedy' ? 'To improve' : 'General'));
              const secKey = secName.toLowerCase();
              const secColor = resolveObservationSectionColor(sec, sec.kind, bankFilename);
              if (!sectionCountsMap.has(secKey)) {
                sectionCountsMap.set(secKey, {
                  key: secKey,
                  name: secName,
                  kind: sec.kind || 'custom',
                  color: secColor,
                  map: new Map()
                });
              }
              const secEntry = sectionCountsMap.get(secKey);
              if (secColor && (!secEntry.color || secEntry.color === '#0284c7' || secEntry.color === '#555555' || (secColor !== '#16a34a' && secColor !== '#dc2626'))) {
                secEntry.color = secColor;
              }

              checklist.forEach(chipRaw => {
                const parsed = (typeof parseObservationChipItem === 'function')
                  ? parseObservationChipItem(chipRaw)
                  : { name: String(chipRaw || '').trim(), count: 1, comment: '' };

                const chipName = String(parsed.name || '').trim();
                if (!chipName) return;
                const chipKey = chipName.toLowerCase();
                const count = Math.max(1, Number(parsed.count) || 1);
                const stId = student.id || student.index || (student.firstName + ' ' + student.lastName);

                // Overall map
                if (!countsMap.has(chipKey)) {
                  countsMap.set(chipKey, {
                    key: chipKey,
                    name: chipName,
                    occurrences: 0,
                    students: new Set(),
                    sampleKind: sec.kind || '',
                    sampleLabel: sec.label || '',
                    sampleColor: secColor || ''
                  });
                }
                const entry = countsMap.get(chipKey);
                entry.occurrences += count;
                entry.students.add(stId);
                if (!entry.sampleKind && sec.kind) entry.sampleKind = sec.kind;
                if (!entry.sampleLabel && sec.label) entry.sampleLabel = sec.label;
                if (!entry.sampleColor && secColor) entry.sampleColor = secColor;

                // Section map
                if (!secEntry.map.has(chipKey)) {
                  secEntry.map.set(chipKey, {
                    key: chipKey,
                    name: chipName,
                    occurrences: 0,
                    students: new Set(),
                    sampleKind: sec.kind || '',
                    sampleLabel: sec.label || '',
                    sampleColor: secColor || ''
                  });
                }
                const sItem = secEntry.map.get(chipKey);
                sItem.occurrences += count;
                sItem.students.add(stId);
                if (!sItem.sampleKind && sec.kind) sItem.sampleKind = sec.kind;
                if (!sItem.sampleLabel && sec.label) sItem.sampleLabel = sec.label;
                if (!sItem.sampleColor && secColor) sItem.sampleColor = secColor;
              });
            });
          });
        });
      });

      function resolveChipMetadata(e, defaultColor = '') {
        const color = resolveObservationChipColor(e.name, e.sampleColor || defaultColor, e.sampleKind, e.sampleLabel, bankFilename);

        let category = '';
        for (const g of bankGroups) {
          if (Array.isArray(g.items) && g.items.some(item => String(item || '').trim().toLowerCase() === e.key)) {
            const rawCat = String(g.type || g.category || '').trim();
            if (rawCat && !isSectionNameOrDummy(rawCat, g.section, e.sampleLabel)) {
              category = rawCat;
              break;
            }
          }
        }
        // Only genuine category names are used. Category must never fall back to section names.

        const studentCount = e.students.size;
        const percentage = totalRelevantStudents > 0 ? Math.round((studentCount / totalRelevantStudents) * 100) : 0;

        return {
          name: e.name,
          occurrences: e.occurrences,
          studentCount,
          percentage,
          category,
          color,
          kind: e.sampleKind,
          label: e.sampleLabel
        };
      }

      const list = Array.from(countsMap.values()).map(e => resolveChipMetadata(e));
      list.sort((a, b) => {
        if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
        if (b.studentCount !== a.studentCount) return b.studentCount - a.studentCount;
        return a.name.localeCompare(b.name);
      });

      // Best 5 per section separately
      const sectionsList = Array.from(sectionCountsMap.values()).map(sec => {
        let effectiveSecColor = sec.color;
        const secChips = Array.from(sec.map.values()).map(e => resolveChipMetadata(e, effectiveSecColor));
        if ((!effectiveSecColor || effectiveSecColor === '#0284c7' || effectiveSecColor === '#555555') && secChips.length > 0) {
          const chipWithColor = secChips.find(c => c.color && c.color !== '#0284c7' && c.color !== '#555555');
          if (chipWithColor) {
            effectiveSecColor = chipWithColor.color;
          }
        }
        secChips.sort((a, b) => {
          if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
          if (b.studentCount !== a.studentCount) return b.studentCount - a.studentCount;
          return a.name.localeCompare(b.name);
        });
        return {
          name: sec.name,
          kind: sec.kind,
          color: effectiveSecColor,
          topChips: secChips.slice(0, 5)
        };
      }).filter(s => s.topChips.length > 0);

      sectionsList.sort((a, b) => {
        const order = { goodPoints: 1, toRemedy: 2 };
        const oA = order[a.kind] || 99;
        const oB = order[b.kind] || 99;
        if (oA !== oB) return oA - oB;
        return a.name.localeCompare(b.name);
      });

      const result = list.slice(0, limit);
      result.sections = sectionsList;
      return result;
    }

    function renderChipsTableHtml(chips, isCohort = false, totalStudents = null, selectedClasses = null) {
      if (!Array.isArray(chips) || chips.length === 0) {
        return `<div class="gs-top-chips-empty">${typeof t === 'function' ? (t(isCohort ? 'gsTopChipsCompareEmpty' : 'gsTopChipsEmpty') || 'No observation chips recorded yet') : 'No observation chips recorded yet'}</div>`;
      }
      const esc = escapeHtml;
      const thRank = "#";
      const thChip = typeof t === 'function' ? (t('gsColObservations') || 'Observation Chip') : 'Observation Chip';
      const thCat = typeof t === 'function' ? (t('gsTopChipsCategory') || 'Category') : 'Category';
      const thUses = typeof t === 'function' ? (t('gsStatCount') || 'Uses') : 'Uses';
      const thStudents = isCohort
        ? (typeof t === 'function' ? (t('gsTopChipsCohortStudentsLabel') || 'Cohort Students') : 'Cohort Students')
        : (typeof t === 'function' ? (t('gsTopChipsStudentsCountLabel') || 'Students') : 'Students');

      const classHeaders = (isCohort && Array.isArray(selectedClasses) && selectedClasses.length > 0)
        ? selectedClasses.map(c => `<th class="center" style="width:55px;">${esc(c.name)}</th>`).join('')
        : '';

      const rows = chips.map((chip, idx) => {
        const pillColor = chip.color || resolveObservationSectionColor(chip.category || chip.label, chip.kind);
        const pillBg = `${pillColor}18`;
        const usesText = chip.occurrences;
        const studentsText = isCohort && totalStudents != null
          ? `${chip.studentCount}/${totalStudents} (${chip.percentage}%)`
          : `${chip.studentCount} (${chip.percentage}%)`;
        const studentsTitle = isCohort
          ? `${chip.studentCount} students (${chip.percentage}% of cohort)`
          : `${chip.studentCount} students (${chip.percentage}% of class)`;

        const classCols = (isCohort && Array.isArray(selectedClasses) && selectedClasses.length > 0)
          ? selectedClasses.map(c => {
              const matched = Array.isArray(chip.byClass) ? chip.byClass.find(bc => bc.classId === c.id) : null;
              if (matched && matched.occurrences > 0) {
                return `<td class="center" style="font-weight:700;"><span style="display:inline-block;padding:0 4px;border-radius:2px;border:1px solid #777;background:#fff;">${matched.occurrences}</span></td>`;
              }
              return `<td class="center" style="color:#94a3b8;">-</td>`;
            }).join('')
          : '';

        return `
          <tr>
            <td class="center" style="width:28px;font-weight:800;color:#555;">#${idx + 1}</td>
            <td style="text-align:left;">
              <span class="gs-top-chip-pill" style="border:1.5px solid ${pillColor};border-left:4px solid ${pillColor};background:${pillBg};color:#111111;" title="${esc(chip.name)}">${esc(chip.name)}</span>
            </td>
            <td style="text-align:left;">
              ${chip.category ? `<span class="gs-top-chip-category" style="border:1px solid ${pillColor}55;background:${pillBg};color:#1e293b;" title="${esc(chip.category)}"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${pillColor};margin-right:4px;vertical-align:middle;"></span>${esc(chip.category)}</span>` : '<span style="color:#94a3b8;">—</span>'}
            </td>
            <td class="center" style="font-weight:800;">${usesText}</td>
            <td class="center" title="${studentsTitle}">${studentsText}</td>
            ${classCols}
          </tr>
        `;
      }).join('');

      return `
        <table class="gs-top-chips-table">
          <thead>
            <tr>
              <th class="center" style="width:28px;">${thRank}</th>
              <th style="text-align:left;">${thChip}</th>
              <th style="width:130px;text-align:left;">${thCat}</th>
              <th class="center" style="width:50px;">${thUses}</th>
              <th class="center" style="width:120px;">${thStudents}</th>
              ${classHeaders}
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;
    }

    function renderTopChipsContentHtml(containerEl, topChips, storageKey, isCohort = false, totalStudents = null, selectedClasses = null) {
      if (!containerEl) return;
      const sections = topChips.sections || [];
      const hasOverall = topChips.length > 0;
      const hasSections = sections.some(s => s.topChips && s.topChips.length > 0);

      if (!hasOverall && !hasSections) {
        containerEl.innerHTML = `<div class="gs-top-chips-empty">${typeof t === 'function' ? (t(isCohort ? 'gsTopChipsCompareEmpty' : 'gsTopChipsEmpty') || 'No observation chips recorded yet') : 'No observation chips recorded yet'}</div>`;
        return;
      }

      const viewMode = localStorage.getItem(storageKey) || 'sections';

      const tabOverall = typeof t === 'function' ? (t('gsTopChipsTabOverall') || 'Overall (Top 10)') : 'Overall (Top 10)';
      const tabBySection = typeof t === 'function' ? (t('gsTopChipsTabBySection') || 'By Section (Top 5)') : 'By Section (Top 5)';
      const tabBoth = typeof t === 'function' ? (t('gsTopChipsTabBoth') || 'All Views') : 'All Views';

      let html = `
        <div class="gs-top-chips-toolbar">
          <span class="gs-top-chips-toolbar-label">${typeof t === 'function' ? (t('gsTopChipsCategory') || 'Display') : 'Display'}:</span>
          <div class="gs-top-chips-mode-tabs" role="tablist" data-i18n-help="hhGsTopChipsMode" data-hover-help="${escapeHtml(typeof t === 'function' ? (t('hhGsTopChipsMode') || 'Switch how the Top 10 observation chips are aggregated (by section, overall, or both).') : 'Switch how the Top 10 observation chips are aggregated (by section, overall, or both).')}">
            <button type="button" class="gs-top-chips-mode-tab${viewMode === 'sections' ? ' active' : ''}" data-mode="sections">${tabBySection}</button>
            <button type="button" class="gs-top-chips-mode-tab${viewMode === 'overall' ? ' active' : ''}" data-mode="overall">${tabOverall}</button>
            <button type="button" class="gs-top-chips-mode-tab${viewMode === 'both' ? ' active' : ''}" data-mode="both">${tabBoth}</button>
          </div>
        </div>
      `;

      // 1. By Section (Top 5 each)
      if (viewMode === 'sections' || viewMode === 'both') {
        if (viewMode === 'both') {
          html += `<div class="gs-top-chips-section-heading"><span>📂</span> <span>${typeof t === 'function' ? (t('gsTopChipsBySectionTitle') || 'Top 5 Observation Chips by Section') : 'Top 5 Observation Chips by Section'}</span></div>`;
        }
        if (sections.length === 0) {
          html += `<div class="gs-top-chips-empty">${typeof t === 'function' ? (t('gsTopChipsSectionEmpty') || 'No observation chips recorded in this section') : 'No observation chips recorded in this section'}</div>`;
        } else {
          sections.forEach(sec => {
            const secChips = sec.topChips || [];
            if (!secChips.length) return;
            html += `
              <div class="gs-top-chip-sec-title">
                <span class="gs-top-chip-sec-indicator" style="background:${sec.color};border:1px solid ${sec.color};"></span>
                <span class="gs-top-chip-sec-name" style="color:#111;">${escapeHtml(sec.name)} (Top 5)</span>
              </div>
              ${renderChipsTableHtml(secChips, isCohort, totalStudents, selectedClasses)}
            `;
          });
        }
      }

      // 2. Overall Top 10
      if (viewMode === 'overall' || viewMode === 'both') {
        if (viewMode === 'both') {
          html += `<div class="gs-top-chips-section-heading"><span>🏆</span> <span>${typeof t === 'function' ? (t('gsTopChipsOverallTitle') || 'Top 10 Overall Observation Chips') : 'Top 10 Overall Observation Chips'}</span></div>`;
        }
        html += renderChipsTableHtml(topChips, isCohort, totalStudents, selectedClasses);
      }

      containerEl.innerHTML = html;

      // Event delegation for tab switcher
      const tabsWrap = containerEl.querySelector('.gs-top-chips-mode-tabs');
      if (tabsWrap) {
        tabsWrap.addEventListener('click', (e) => {
          const tabBtn = e.target.closest('.gs-top-chips-mode-tab');
          if (!tabBtn) return;
          const newMode = tabBtn.dataset.mode;
          if (!newMode) return;
          localStorage.setItem(storageKey, newMode);
          renderTopChipsContentHtml(containerEl, topChips, storageKey, isCohort, totalStudents, selectedClasses);
        });
      }
    }

    function renderSummaryTopChips(classObj, semFilter) {
      const card = document.getElementById("summary-top-chips-card");
      if (!card) return;
      if (!classObj) {
        card.classList.add("hidden");
        return;
      }
      card.classList.remove("hidden");

      const isCollapsed = localStorage.getItem("gsTopChipsSummaryCollapsed") === "true";
      card.classList.toggle("collapsed", isCollapsed);

      const topChips = getTopObservationChips(classObj, { semester: semFilter, limit: 10 });
      const badge = document.getElementById("summary-top-chips-badge");
      const listEl = document.getElementById("summary-top-chips-list");

      if (badge) {
        const secCount = (topChips.sections || []).length;
        badge.textContent = secCount > 0
          ? `${topChips.length} chips · ${secCount} sec`
          : `${topChips.length} chip${topChips.length === 1 ? '' : 's'}`;
      }

      renderTopChipsContentHtml(listEl, topChips, "gsTopChipsSummaryViewMode", false);
    }

    function toggleSummaryTopChips() {
      const card = document.getElementById("summary-top-chips-card");
      if (!card) return;
      card.classList.toggle("collapsed");
      localStorage.setItem("gsTopChipsSummaryCollapsed", card.classList.contains("collapsed") ? "true" : "false");
    }

    function renderTestTopChips(classObj, sem, testIndex) {
      const card = document.getElementById("test-top-chips-card");
      if (!card) return;
      if (!classObj || sem == null || testIndex == null) {
        card.classList.add("hidden");
        return;
      }
      card.classList.remove("hidden");

      const isCollapsed = localStorage.getItem("gsTopChipsTestCollapsed") === "true";
      card.classList.toggle("collapsed", isCollapsed);

      const topChips = getTopObservationChips(classObj, { semester: sem, testIndex: testIndex, limit: 10 });
      const badge = document.getElementById("test-top-chips-badge");
      const listEl = document.getElementById("test-top-chips-list");

      if (badge) {
        const secCount = (topChips.sections || []).length;
        badge.textContent = secCount > 0
          ? `${topChips.length} chips · ${secCount} sec`
          : `${topChips.length} chip${topChips.length === 1 ? '' : 's'}`;
      }

      renderTopChipsContentHtml(listEl, topChips, "gsTopChipsTestViewMode", false);
    }

    function toggleTestTopChips() {
      const card = document.getElementById("test-top-chips-card");
      if (!card) return;
      card.classList.toggle("collapsed");
      localStorage.setItem("gsTopChipsTestCollapsed", card.classList.contains("collapsed") ? "true" : "false");
    }

    function renderTopChipsReportSection(topChips, totalStudents) {
      if (!Array.isArray(topChips) || topChips.length === 0) {
        return `<div class="top-chips-empty-note" style="font-size:10px;color:#64748b;font-style:italic;padding:4px 0;">${typeof t === 'function' ? (t('gsTopChipsEmpty') || 'No observation chips recorded yet') : 'No observation chips recorded yet'}</div>`;
      }
      const esc = escapeHtml;

      function renderChipTableRows(chips) {
        return chips.map((chip, idx) => {
          const pillColor = chip.color || resolveObservationSectionColor(chip.category || chip.label, chip.kind);
          const pillBg = `${pillColor}18`;
          const rankBadge = `<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:9px;font-weight:900;background:#333333;color:#ffffff;">#${idx + 1}</span>`;
          const chipPill = `<span style="display:inline-block;padding:2px 7px;border-radius:4px;border:1.5px solid ${pillColor};border-left:4px solid ${pillColor};background:${pillBg};color:#111;font-weight:700;font-size:10.5px;white-space:normal;word-break:break-word;">${esc(chip.name)}</span>`;
          const catBadge = chip.category ? `<span style="display:inline-flex;align-items:center;padding:1px 5px;border-radius:3px;font-size:9.5px;color:#1e293b;font-weight:600;background:${pillColor}15;border:1px solid ${pillColor}44;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${pillColor};margin-right:4px;"></span>${esc(chip.category)}</span>` : '—';
          const usesBadge = `<span style="display:inline-block;padding:1px 6px;border-radius:3px;background:#f0f0ea;border:1px solid #555;font-weight:800;font-size:10px;">${chip.occurrences}</span>`;
          const pctBar = `<div style="display:flex;align-items:center;gap:6px;justify-content:center;">
            <span style="font-weight:700;font-size:10px;">${chip.studentCount} (${chip.percentage}%)</span>
            <div style="width:48px;height:6px;background:#e2e8f0;border-radius:3px;border:1px solid #94a3b8;overflow:hidden;flex-shrink:0;">
              <div style="width:${Math.min(100, chip.percentage)}%;height:100%;background:${pillColor};"></div>
            </div>
          </div>`;

          return `<tr>
            <td class="center">${rankBadge}</td>
            <td style="text-align:left;">${chipPill}</td>
            <td style="text-align:left;">${catBadge}</td>
            <td class="center">${usesBadge}</td>
            <td class="center">${pctBar}</td>
          </tr>`;
        }).join('');
      }

      let html = `
        <div style="font-weight:800;font-size:11px;color:#333;margin-top:6px;margin-bottom:4px;">${typeof t === 'function' ? (t('gsTopChipsOverallTitle') || 'Top 10 Overall Observation Chips') : 'Top 10 Overall Observation Chips'}</div>
        <table class="report-table" style="margin-top:2px;margin-bottom:8px;">
          <thead>
            <tr>
              <th class="center" style="width:36px;">#</th>
              <th style="text-align:left;">${typeof t === 'function' ? (t('gsColObservations') || 'Observation Chip') : 'Observation Chip'}</th>
              <th style="width:140px;text-align:left;">${typeof t === 'function' ? (t('gsTopChipsCategory') || 'Category') : 'Category'}</th>
              <th class="center" style="width:80px;">${typeof t === 'function' ? (t('gsStatCount') || 'Uses') : 'Uses'}</th>
              <th class="center" style="width:140px;">${typeof t === 'function' ? (t('gsTopChipsStudentsCountLabel') || 'Students (% of Class)') : 'Students (% of Class)'}</th>
            </tr>
          </thead>
          <tbody>
            ${renderChipTableRows(topChips)}
          </tbody>
        </table>
      `;

      if (Array.isArray(topChips.sections) && topChips.sections.length > 0) {
        html += `<div style="font-weight:800;font-size:11px;color:#333;margin-top:10px;margin-bottom:4px;">${typeof t === 'function' ? (t('gsTopChipsBySectionTitle') || 'Top 5 Observation Chips by Section') : 'Top 5 Observation Chips by Section'}</div>`;
        topChips.sections.forEach(sec => {
          const sChips = sec.topChips || [];
          if (!sChips.length) return;
          html += `
            <div style="margin-top:6px;margin-bottom:3px;font-size:10px;font-weight:800;color:#111;display:flex;align-items:center;gap:5px;">
              <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${sec.color};border:1px solid #333;"></span>
              <span>${esc(sec.name)} (Top 5)</span>
            </div>
            <table class="report-table" style="margin-top:2px;margin-bottom:6px;">
              <thead>
                <tr>
                  <th class="center" style="width:36px;">#</th>
                  <th style="text-align:left;">${typeof t === 'function' ? (t('gsColObservations') || 'Observation Chip') : 'Observation Chip'}</th>
                  <th style="width:140px;text-align:left;">${typeof t === 'function' ? (t('gsTopChipsCategory') || 'Category') : 'Category'}</th>
                  <th class="center" style="width:80px;">${typeof t === 'function' ? (t('gsStatCount') || 'Uses') : 'Uses'}</th>
                  <th class="center" style="width:140px;">${typeof t === 'function' ? (t('gsTopChipsStudentsCountLabel') || 'Students (% of Class)') : 'Students (% of Class)'}</th>
                </tr>
              </thead>
              <tbody>
                ${renderChipTableRows(sChips)}
              </tbody>
            </table>
          `;
        });
      }

      return html;
    }

    window.toggleSummaryTopChips = toggleSummaryTopChips;
    window.toggleTestTopChips = toggleTestTopChips;

    function getCohortTopObservationChips(classesList, options = {}) {
      if (!Array.isArray(classesList) || classesList.length === 0) return [];
      const scope = options.scope || (typeof _cmpState !== 'undefined' && _cmpState.scope) || 'year';
      const testIndex = options.testIndex != null ? options.testIndex : (typeof _cmpState !== 'undefined' ? _cmpState.testIndex : null);
      const limit = options.limit || 10;

      const totalCohortStudents = classesList.reduce((acc, c) => acc + (Array.isArray(c.students) ? c.students.length : 0), 0);
      const countsMap = new Map();
      const sectionCountsMap = new Map();

      classesList.forEach(classObj => {
        if (!classObj || !Array.isArray(classObj.students)) return;
        const bankFilename = classObj.chipBank || (typeof _activeChipBankFilename !== 'undefined' ? _activeChipBankFilename : null);
        const bankSections = typeof getObservationSectionsWithGroups === 'function' ? getObservationSectionsWithGroups(bankFilename) : [];
        const bankGroups = typeof getObservationChecklistGroups === 'function' ? getObservationChecklistGroups(bankFilename) : [];

        classObj.students.forEach(student => {
          if (!student.testNotes) return;

          let checks = [];
          if (scope === 'sem1') {
            const count = (classObj.testCounts && typeof classObj.testCounts.sem1 === 'number') ? classObj.testCounts.sem1 : ((student.testNotes.sem1 || []).length);
            for (let i = 0; i < count; i++) checks.push({ sem: 'sem1', ti: i });
          } else if (scope === 'sem2') {
            const count = (classObj.testCounts && typeof classObj.testCounts.sem2 === 'number') ? classObj.testCounts.sem2 : ((student.testNotes.sem2 || []).length);
            for (let i = 0; i < count; i++) checks.push({ sem: 'sem2', ti: i });
          } else if (scope === 'tests') {
            if (testIndex === 'timeline') {
              const c1 = (classObj.testCounts && typeof classObj.testCounts.sem1 === 'number') ? classObj.testCounts.sem1 : ((student.testNotes.sem1 || []).length);
              for (let i = 0; i < c1; i++) checks.push({ sem: 'sem1', ti: i });
              const c2 = (classObj.testCounts && typeof classObj.testCounts.sem2 === 'number') ? classObj.testCounts.sem2 : ((student.testNotes.sem2 || []).length);
              for (let i = 0; i < c2; i++) checks.push({ sem: 'sem2', ti: i });
            } else {
              const tIdx = Number(testIndex) || 0;
              const n1 = (classObj.testCounts && classObj.testCounts.sem1) || 0;
              const n2 = (classObj.testCounts && classObj.testCounts.sem2) || 0;
              if (tIdx < (n1 + n2)) {
                const sem = tIdx < n1 ? 'sem1' : 'sem2';
                const localIdx = tIdx < n1 ? tIdx : tIdx - n1;
                checks.push({ sem, ti: localIdx });
              }
            }
          } else {
            const c1 = (classObj.testCounts && typeof classObj.testCounts.sem1 === 'number') ? classObj.testCounts.sem1 : ((student.testNotes.sem1 || []).length);
            for (let i = 0; i < c1; i++) checks.push({ sem: 'sem1', ti: i });
            const c2 = (classObj.testCounts && typeof classObj.testCounts.sem2 === 'number') ? classObj.testCounts.sem2 : ((student.testNotes.sem2 || []).length);
            for (let i = 0; i < c2; i++) checks.push({ sem: 'sem2', ti: i });
          }

          checks.forEach(({ sem, ti }) => {
            const noteArr = student.testNotes[sem];
            if (!Array.isArray(noteArr)) return;
            const sections = noteArr[ti];
            if (!Array.isArray(sections)) return;

            sections.forEach(sec => {
              if (!sec) return;
              const checklist = (typeof sectionChecklistSummary === 'function')
                ? sectionChecklistSummary(sec)
                : (Array.isArray(sec.checklist) ? sec.checklist : []);
              if (!checklist || !checklist.length) return;

              const secName = String(sec.label || '').trim() || (sec.kind === 'goodPoints' ? 'Good points' : (sec.kind === 'toRemedy' ? 'To improve' : 'General'));
              const secKey = secName.toLowerCase();
              const classBank = classObj.chipBank
                || (Array.isArray(classObj.chipBanks) ? classObj.chipBanks[0] : null)
                || (typeof _activeChipBankFilename !== 'undefined' ? _activeChipBankFilename : null);
              const secColor = resolveObservationSectionColor(sec, sec.kind, classBank);
              if (!sectionCountsMap.has(secKey)) {
                sectionCountsMap.set(secKey, {
                  key: secKey,
                  name: secName,
                  kind: sec.kind || 'custom',
                  color: secColor,
                  map: new Map()
                });
              }
              const secEntry = sectionCountsMap.get(secKey);
              if (secColor && (!secEntry.color || secEntry.color === '#0284c7' || secEntry.color === '#555555' || (secColor !== '#16a34a' && secColor !== '#dc2626'))) {
                secEntry.color = secColor;
              }

              checklist.forEach(chipRaw => {
                const parsed = (typeof parseObservationChipItem === 'function')
                  ? parseObservationChipItem(chipRaw)
                  : { name: String(chipRaw || '').trim(), count: 1, comment: '' };

                const chipName = String(parsed.name || '').trim();
                if (!chipName) return;
                const chipKey = chipName.toLowerCase();
                const count = Math.max(1, Number(parsed.count) || 1);
                const studentUid = `${classObj.id}_${student.id || student.index || (student.firstName + '_' + student.lastName)}`;

                // Overall map
                if (!countsMap.has(chipKey)) {
                  countsMap.set(chipKey, {
                    key: chipKey,
                    name: chipName,
                    occurrences: 0,
                    students: new Set(),
                    sampleKind: sec.kind || '',
                    sampleLabel: sec.label || '',
                    sampleColor: secColor || '',
                    classBreakdown: new Map()
                  });
                }
                const entry = countsMap.get(chipKey);
                entry.occurrences += count;
                entry.students.add(studentUid);
                if (!entry.sampleKind && sec.kind) entry.sampleKind = sec.kind;
                if (!entry.sampleLabel && sec.label) entry.sampleLabel = sec.label;
                if (!entry.sampleColor && secColor) entry.sampleColor = secColor;

                if (!entry.classBreakdown.has(classObj.id)) {
                  entry.classBreakdown.set(classObj.id, {
                    classId: classObj.id,
                    className: classObj.name,
                    occurrences: 0,
                    students: new Set()
                  });
                }
                const cEntry = entry.classBreakdown.get(classObj.id);
                cEntry.occurrences += count;
                cEntry.students.add(studentUid);

                // Section map
                if (!secEntry.map.has(chipKey)) {
                  secEntry.map.set(chipKey, {
                    key: chipKey,
                    name: chipName,
                    occurrences: 0,
                    students: new Set(),
                    sampleKind: sec.kind || '',
                    sampleLabel: sec.label || '',
                    sampleColor: secColor || '',
                    classBreakdown: new Map()
                  });
                }
                const secItem = secEntry.map.get(chipKey);
                secItem.occurrences += count;
                secItem.students.add(studentUid);
                if (!secItem.sampleKind && sec.kind) secItem.sampleKind = sec.kind;
                if (!secItem.sampleLabel && sec.label) secItem.sampleLabel = sec.label;
                if (!secItem.sampleColor && secColor) secItem.sampleColor = secColor;

                if (!secItem.classBreakdown.has(classObj.id)) {
                  secItem.classBreakdown.set(classObj.id, {
                    classId: classObj.id,
                    className: classObj.name,
                    occurrences: 0,
                    students: new Set()
                  });
                }
                const secCEntry = secItem.classBreakdown.get(classObj.id);
                secCEntry.occurrences += count;
                secCEntry.students.add(studentUid);
              });
            });
          });
        });
      });

      function resolveCohortChipMetadata(e, defaultColor = '') {
        const color = resolveObservationChipColor(e.name, e.sampleColor || defaultColor, e.sampleKind, e.sampleLabel);

        let category = '';
        for (const classObj of classesList) {
          const bankFilename = classObj.chipBank
            || (Array.isArray(classObj.chipBanks) ? classObj.chipBanks[0] : null)
            || (typeof _activeChipBankFilename !== 'undefined' ? _activeChipBankFilename : null);
          const bankGroups = typeof getObservationChecklistGroups === 'function' ? getObservationChecklistGroups(bankFilename) : [];
          for (const g of bankGroups) {
            if (Array.isArray(g.items) && g.items.some(item => String(item || '').trim().toLowerCase() === e.key)) {
              const rawCat = String(g.type || g.category || '').trim();
              if (rawCat && !isSectionNameOrDummy(rawCat, g.section, e.sampleLabel)) {
                category = rawCat;
                break;
              }
            }
          }
          if (category) break;
        }
        // Only genuine category names are used. Category must never fall back to section names.

        const studentCount = e.students.size;
        const percentage = totalCohortStudents > 0 ? Math.round((studentCount / totalCohortStudents) * 100) : 0;

        const byClass = Array.from(e.classBreakdown.values()).map(b => ({
          classId: b.classId,
          className: b.className,
          occurrences: b.occurrences,
          studentCount: b.students.size
        })).sort((a, b) => b.occurrences - a.occurrences);

        return {
          name: e.name,
          occurrences: e.occurrences,
          studentCount,
          percentage,
          category,
          color,
          kind: e.sampleKind,
          label: e.sampleLabel,
          byClass
        };
      }

      const list = Array.from(countsMap.values()).map(e => resolveCohortChipMetadata(e));
      list.sort((a, b) => {
        if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
        if (b.studentCount !== a.studentCount) return b.studentCount - a.studentCount;
        return a.name.localeCompare(b.name);
      });

      // Best 5 per section separately for cohort
      const sectionsList = Array.from(sectionCountsMap.values()).map(sec => {
        let effectiveSecColor = sec.color;
        const secChips = Array.from(sec.map.values()).map(e => resolveCohortChipMetadata(e, effectiveSecColor));
        if ((!effectiveSecColor || effectiveSecColor === '#0284c7' || effectiveSecColor === '#555555') && secChips.length > 0) {
          const chipWithColor = secChips.find(c => c.color && c.color !== '#0284c7' && c.color !== '#555555');
          if (chipWithColor) {
            effectiveSecColor = chipWithColor.color;
          }
        }
        secChips.sort((a, b) => {
          if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
          if (b.studentCount !== a.studentCount) return b.studentCount - a.studentCount;
          return a.name.localeCompare(b.name);
        });
        return {
          name: sec.name,
          kind: sec.kind,
          color: effectiveSecColor,
          topChips: secChips.slice(0, 5)
        };
      }).filter(s => s.topChips.length > 0);

      sectionsList.sort((a, b) => {
        const order = { goodPoints: 1, toRemedy: 2 };
        const oA = order[a.kind] || 99;
        const oB = order[b.kind] || 99;
        if (oA !== oB) return oA - oB;
        return a.name.localeCompare(b.name);
      });

      const result = list.slice(0, limit);
      result.sections = sectionsList;
      return result;
    }

    function renderCompareTopChips(selectedClasses, cardEl) {
      const card = cardEl || document.getElementById("cmp-top-chips-card");
      if (!card) return;
      if (!Array.isArray(selectedClasses) || selectedClasses.length === 0) {
        card.classList.add("hidden");
        return;
      }
      card.classList.remove("hidden");

      const isCollapsed = localStorage.getItem("gsTopChipsCompareCollapsed") === "true";
      card.classList.toggle("collapsed", isCollapsed);
      const header = document.getElementById("cmp-top-chips-header");
      if (header) header.setAttribute("aria-expanded", isCollapsed ? "false" : "true");

      const topChips = getCohortTopObservationChips(selectedClasses, { limit: 10 });
      const badge = document.getElementById("cmp-top-chips-badge");
      const gridEl = document.getElementById("cmp-top-chips-grid");

      if (badge) {
        const secCount = (topChips.sections || []).length;
        badge.textContent = secCount > 0
          ? `${topChips.length} chips · ${secCount} sec`
          : `${topChips.length} chip${topChips.length === 1 ? '' : 's'}`;
      }

      const totalCohortStudents = selectedClasses.reduce((acc, c) => acc + (Array.isArray(c.students) ? c.students.length : 0), 0);
      renderTopChipsContentHtml(gridEl, topChips, "gsTopChipsCompareViewMode", true, totalCohortStudents, selectedClasses);
    }

    function toggleCompareTopChips() {
      const card = document.getElementById("cmp-top-chips-card");
      if (!card) return;
      card.classList.toggle("collapsed");
      const isCollapsed = card.classList.contains("collapsed");
      localStorage.setItem("gsTopChipsCompareCollapsed", isCollapsed ? "true" : "false");
      const header = document.getElementById("cmp-top-chips-header");
      if (header) header.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
    }

    function renderCompareTopChipsReportSection(topChips, totalStudents, selectedClasses) {
      if (!Array.isArray(topChips) || topChips.length === 0) {
        return `<div class="top-chips-empty-note" style="margin-top:14px;padding:8px 12px;background:#fafaf7;border:1.5px solid #333;border-radius:6px;font-size:11px;color:#64748b;font-style:italic;">${typeof t === 'function' ? (t('gsTopChipsCompareEmpty') || 'No observation chips recorded for the selected classes and scope') : 'No observation chips recorded for the selected classes and scope'}</div>`;
      }
      const esc = escapeHtml;
      const title = typeof t === 'function' ? (t('gsTopChipsCompareTitle') || 'Top 10 Most Frequent Observation Chips (Cohort)') : 'Top 10 Most Frequent Observation Chips (Cohort)';
      
      const classHeaders = Array.isArray(selectedClasses) ? selectedClasses.map(c => `<th class="center" style="font-size:10px;">${esc(c.name)}</th>`).join('') : '';

      function renderCohortTableRows(chips) {
        return chips.map((chip, idx) => {
          const pillColor = chip.color || resolveObservationSectionColor(chip.category || chip.label, chip.kind);
          const pillBg = `${pillColor}18`;
          const rankBadge = `<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:9px;font-weight:900;background:#333333;color:#ffffff;">#${idx + 1}</span>`;
          const chipPill = `<span style="display:inline-block;padding:2px 7px;border-radius:4px;border:1.5px solid ${pillColor};border-left:4px solid ${pillColor};background:${pillBg};color:#111;font-weight:700;font-size:10.5px;white-space:normal;word-break:break-word;">${esc(chip.name)}</span>`;
          const catBadge = chip.category ? `<span style="display:inline-flex;align-items:center;padding:1px 5px;border-radius:3px;font-size:9.5px;color:#1e293b;font-weight:600;background:${pillColor}15;border:1px solid ${pillColor}44;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${pillColor};margin-right:4px;"></span>${esc(chip.category)}</span>` : '—';
          const usesBadge = `<span style="display:inline-block;padding:1px 6px;border-radius:3px;background:#f0f0ea;border:1px solid #555;font-weight:800;font-size:10px;">${chip.occurrences}</span>`;
          const pctBar = `<div style="display:flex;align-items:center;gap:6px;justify-content:center;">
            <span style="font-weight:700;font-size:10px;">${chip.studentCount}/${totalStudents} (${chip.percentage}%)</span>
            <div style="width:40px;height:5px;background:#e2e8f0;border-radius:3px;border:1px solid #94a3b8;overflow:hidden;flex-shrink:0;">
              <div style="width:${Math.min(100, chip.percentage)}%;height:100%;background:${pillColor};"></div>
            </div>
          </div>`;

          const classCols = Array.isArray(selectedClasses) ? selectedClasses.map(c => {
            const matched = Array.isArray(chip.byClass) ? chip.byClass.find(bc => bc.classId === c.id) : null;
            if (matched && matched.occurrences > 0) {
              return `<td class="center" style="font-size:10px;font-weight:700;"><span style="display:inline-block;padding:1px 5px;border-radius:3px;border:1px solid #777;background:#fff;">${matched.occurrences}</span></td>`;
            }
            return `<td class="center" style="font-size:10px;color:#94a3b8;">-</td>`;
          }).join('') : '';

          return `<tr>
            <td class="center">${rankBadge}</td>
            <td style="text-align:left;">${chipPill}</td>
            <td style="text-align:left;">${catBadge}</td>
            <td class="center">${usesBadge}</td>
            <td class="center">${pctBar}</td>
            ${classCols}
          </tr>`;
        }).join('');
      }

      let secTablesHtml = '';
      if (Array.isArray(topChips.sections) && topChips.sections.length > 0) {
        secTablesHtml = `
          <div style="font-weight:800;font-size:0.95rem;color:#111;margin-top:16px;margin-bottom:6px;">${typeof t === 'function' ? (t('gsTopChipsBySectionTitle') || 'Top 5 Observation Chips by Section') : 'Top 5 Observation Chips by Section'}</div>
          ${topChips.sections.map(sec => {
            const sChips = sec.topChips || [];
            if (!sChips.length) return '';
            return `
              <div style="margin-top:8px;margin-bottom:3px;font-size:11px;font-weight:800;color:#111;display:flex;align-items:center;gap:6px;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${sec.color};border:1px solid #333;"></span>
                <span>${esc(sec.name)} (Top 5)</span>
              </div>
              <table class="cmp-table" style="margin-top:2px;margin-bottom:10px;">
                <thead>
                  <tr>
                    <th class="center" style="width:36px;">#</th>
                    <th style="text-align:left;">${typeof t === 'function' ? (t('gsColObservations') || 'Observation Chip') : 'Observation Chip'}</th>
                    <th style="width:130px;text-align:left;">${typeof t === 'function' ? (t('gsTopChipsCategory') || 'Category') : 'Category'}</th>
                    <th class="center" style="width:70px;">${typeof t === 'function' ? (t('gsStatCount') || 'Uses') : 'Uses'}</th>
                    <th class="center" style="width:130px;">${typeof t === 'function' ? (t('gsTopChipsCohortStudentsLabel') || 'Cohort Students') : 'Cohort Students'}</th>
                    ${classHeaders}
                  </tr>
                </thead>
                <tbody>${renderCohortTableRows(sChips)}</tbody>
              </table>
            `;
          }).join('')}
        `;
      }

      return `
        <div class="cmp-report-chips-section" style="margin-top:16px;margin-bottom:16px;border:2px solid #333;border-radius:8px;padding:12px;background:#ffffff;box-shadow:3px 3px 0 #555;">
          <div style="font-weight:800;font-size:1rem;color:#111;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
            <span>${esc(title)}</span>
            <span style="font-size:0.75rem;padding:2px 7px;background:#333;color:#fff;border-radius:999px;">${topChips.length}</span>
          </div>
          <table class="cmp-table" style="margin-top:4px;">
            <thead>
              <tr>
                <th class="center" style="width:36px;">#</th>
                <th style="text-align:left;">${typeof t === 'function' ? (t('gsColObservations') || 'Observation Chip') : 'Observation Chip'}</th>
                <th style="width:130px;text-align:left;">${typeof t === 'function' ? (t('gsTopChipsCategory') || 'Category') : 'Category'}</th>
                <th class="center" style="width:70px;">${typeof t === 'function' ? (t('gsStatCount') || 'Uses') : 'Uses'}</th>
                <th class="center" style="width:130px;">${typeof t === 'function' ? (t('gsTopChipsCohortStudentsLabel') || 'Cohort Students') : 'Cohort Students'}</th>
                ${classHeaders}
              </tr>
            </thead>
            <tbody>
              ${renderCohortTableRows(topChips)}
            </tbody>
          </table>
          ${secTablesHtml}
        </div>
      `;
    }

    window.toggleCompareTopChips = toggleCompareTopChips;

    // Returns the descriptor text for a named xlsm criterion at the given grade level.
    // Grade is mapped to the nearest available descriptor level: 6, 5, 4, 3, 2, or 1.5.
    function xlsmCommentForGrade(criterionName, grade, points, minPts, maxPts) {
      const crit = XLSM_CRITERIA.find(c => c.name.trim().toLowerCase() === criterionName.trim().toLowerCase());
      if (!crit || !crit.comments) return null;
      const key = nearestCriterionGradeKey(crit, grade, points, minPts, maxPts);
      return crit.comments[key] || null;
    }

