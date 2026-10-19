/**
 * Class Management Tools — Character Network Service
 * Pure client-side service for constructing and visualizing literary character networks.
 *
 * Implements:
 * 1. Proper-noun entity & alias detection (English & French stopwords/honorifics)
 * 2. Narrative window co-occurrence matrix builder (sliding window, paragraph, chapter)
 * 3. Network centrality metrics (Degree, Weighted Strength, Betweenness Centrality)
 * 4. 2D Fruchterman-Reingold force-directed layout simulation with collision bounds
 * 5. Narrative excerpt extractor for close-reading link inspection
 */

(function (global) {
  'use strict';

  // Common English & French stopwords, demonstratives, pronouns, days/months, and place names
  // that frequently begin sentences with capital letters but are not character entities.
  const DEFAULT_STOPWORDS = new Set([
    // English
    'The', 'This', 'That', 'These', 'Those', 'There', 'Then', 'Here', 'Where', 'When',
    'What', 'Which', 'Who', 'Whom', 'Whose', 'Why', 'How', 'All', 'Some', 'Any', 'Every',
    'No', 'Not', 'Never', 'Always', 'Often', 'Sometimes', 'Soon', 'Now', 'Today', 'Yesterday',
    'Tomorrow', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December', 'He', 'She', 'They', 'We', 'You', 'It', 'His', 'Her',
    'Their', 'Our', 'Your', 'Its', 'Him', 'Them', 'Us', 'Me', 'My', 'Mine', 'And', 'But',
    'Or', 'Nor', 'For', 'Yet', 'So', 'Although', 'Because', 'Since', 'Unless', 'While',
    'After', 'Before', 'During', 'Under', 'Over', 'Above', 'Below', 'Through', 'Between',
    'Into', 'Out', 'Off', 'On', 'In', 'At', 'By', 'With', 'From', 'About', 'Against',
    'One', 'Two', 'Three', 'Four', 'Five', 'First', 'Second', 'Last', 'Next', 'Chapter',
    'Book', 'Part', 'Volume', 'Page', 'Section', 'London', 'Paris', 'England', 'France',
    'God', 'Heaven', 'Lord', 'Oh', 'Ah', 'Alas', 'Yes', 'No', 'Indeed', 'Perhaps',

    // French
    'Le', 'La', 'Les', 'Un', 'Une', 'Des', 'Du', 'De', 'Ce', 'Cet', 'Cette', 'Ces',
    'Celui', 'Celle', 'Ceux', 'Celles', 'Ceci', 'Cela', 'Ça', 'Il', 'Elle', 'Ils',
    'Elles', 'On', 'Nous', 'Vous', 'Je', 'Tu', 'Son', 'Sa', 'Ses', 'Leur', 'Leurs',
    'Mon', 'Ma', 'Mes', 'Ton', 'Ta', 'Tes', 'Notre', 'Votre', 'Lui', 'Eux', 'Moi',
    'Toi', 'Qui', 'Que', 'Quoi', 'Dont', 'Où', 'Quand', 'Comment', 'Pourquoi', 'Combien',
    'Mais', 'Ou', 'Et', 'Donc', 'Or', 'Ni', 'Car', 'Puisque', 'Comme', 'Si', 'Lorsque',
    'Puis', 'Alors', 'Ensuite', 'Après', 'Avant', 'Pendant', 'Sous', 'Sur', 'Dans', 'Par',
    'Pour', 'Avec', 'Sans', 'Chez', 'Vers', 'Entre', 'Contre', 'Non', 'Ne', 'Pas', 'Plus',
    'Jamais', 'Toujours', 'Aussi', 'Bien', 'Très', 'Tout', 'Toute', 'Tous', 'Toutes',
    'Rien', 'Autre', 'Autres', 'Chaque', 'Plusieurs', 'Certains', 'Certaines', 'Même',
    'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche', 'Janvier',
    'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre',
    'Novembre', 'Décembre', 'Chapitre', 'Livre', 'Partie', 'Tome', 'Dieu', 'Ciel'
  ]);

  // Common titles & honorific prefixes that belong to character names
  const HONORIFICS = [
    'Mr', 'Mr.', 'Mrs', 'Mrs.', 'Miss', 'Ms', 'Ms.', 'Dr', 'Dr.', 'Doctor', 'Prof', 'Prof.',
    'Professor', 'Sir', 'Lady', 'Lord', 'Count', 'Countess', 'Baron', 'Baroness', 'King',
    'Queen', 'Prince', 'Princess', 'Captain', 'General', 'Colonel', 'Major', 'Father', 'Mother',
    'Monsieur', 'M.', 'Mme', 'Mme.', 'Mlle', 'Mlle.', 'Abbé', 'Docteur', 'Professeur',
    'Comte', 'Comtesse', 'Baron', 'Baronne', 'Capitaine', 'Général', 'Père', 'Mère', 'Frère', 'Sœur'
  ];

  /**
   * Escape special characters for safe regular expression generation.
   */
  function escapeRegex(str) {
    return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Character Network Service definition
   */
  const CharacterNetworkService = {
    /**
     * Scan plain text or novel content to detect candidate characters.
     *
     * @param {string} rawText - Full novel plain text.
     * @param {object} options - Configuration options.
     * @returns {Array<object>} Detected characters with occurrences and suggested aliases.
     */
    detectCandidates(rawText, options = {}) {
      if (!rawText || typeof rawText !== 'string') return [];

      const minOccurrences = Math.max(1, options.minOccurrences || 3);
      const maxCandidates = Math.max(5, options.maxCandidates || 40);
      const customStopwords = new Set(options.customStopwords || []);

      // Build honorific pattern
      const honorificsPattern = HONORIFICS.map(escapeRegex).join('|');
      // Match: (Honorific\s+)?CapitalizedWord(\s+CapitalizedWord)*
      const nameRegex = new RegExp(
        `(?:(?:${honorificsPattern})\\s+)?[A-ZÀ-ÖØ-ß][a-zà-öø-ÿ]+(?:\\s+[A-ZÀ-ÖØ-ß][a-zà-öø-ÿ]+){0,2}`,
        'g'
      );

      // Map to count raw mentions and track sentence-initial vs inside-sentence contexts
      const counts = new Map();
      const midSentenceCounts = new Map();

      // Split text into sentences/lines to distinguish sentence-initial capitalized words
      const lines = rawText.split(/(?:\r?\n)+/);

      for (let l = 0; l < lines.length; l++) {
        const line = lines[l].trim();
        if (!line) continue;

        // Split line into sentences
        const sentences = line.split(/(?<=[.?!])\s+/);
        for (let s = 0; s < sentences.length; s++) {
          const sent = sentences[s].trim();
          if (!sent) continue;

          let match;
          nameRegex.lastIndex = 0;
          while ((match = nameRegex.exec(sent)) !== null) {
            const rawCand = match[0].trim();
            const index = match.index;

            // Normalize spacing
            const cand = rawCand.replace(/\s+/g, ' ');

            // Check if single word candidate is in stopwords
            if (!cand.includes(' ') && (DEFAULT_STOPWORDS.has(cand) || customStopwords.has(cand))) {
              continue;
            }

            counts.set(cand, (counts.get(cand) || 0) + 1);

            // If it occurs strictly after the sentence start (> 0), it is much more likely a real name
            if (index > 0) {
              midSentenceCounts.set(cand, (midSentenceCounts.get(cand) || 0) + 1);
            }
          }
        }
      }

      // Filter candidates: must meet minOccurrences, and single words that never appear mid-sentence are dropped
      const validCandidates = [];
      counts.forEach((freq, name) => {
        if (freq < minOccurrences) return;

        // Drop short 1-word candidates if they are stopwords or never appeared inside a sentence
        if (!name.includes(' ')) {
          if (name.length < 3) return;
          if (DEFAULT_STOPWORDS.has(name) || customStopwords.has(name)) return;
          const midCount = midSentenceCounts.get(name) || 0;
          // If a single word only appears at sentence beginnings and never inside, it's probably not a name
          if (midCount === 0 && freq < 6) return;
        }

        validCandidates.push({
          name,
          count: freq,
          midCount: midSentenceCounts.get(name) || 0
        });
      });

      // Sort by total occurrences descending
      validCandidates.sort((a, b) => b.count - a.count);

      // Suggest alias consolidation: e.g. "Jean Valjean" subsumes "Valjean"
      // or "M. Madeleine" / "Monsieur Madeleine"
      const consolidated = [];
      const usedNames = new Set();

      for (let i = 0; i < validCandidates.length; i++) {
        const item = validCandidates[i];
        if (usedNames.has(item.name)) continue;

        const aliases = new Set();
        let totalCount = item.count;

        // Find potential sub-matches
        for (let j = 0; j < validCandidates.length; j++) {
          if (i === j) continue;
          const other = validCandidates[j];
          if (usedNames.has(other.name)) continue;

          // Check if item contains other (e.g. "Jean Valjean" contains "Valjean")
          // or matches without honorific (e.g. "Monsieur Madeleine" vs "Madeleine")
          const cleanItem = item.name.replace(/^(?:M\.|Mr\.|Mme\.|Mrs\.|Dr\.|Monsieur|Madame)\s+/i, '');
          const cleanOther = other.name.replace(/^(?:M\.|Mr\.|Mme\.|Mrs\.|Dr\.|Monsieur|Madame)\s+/i, '');

          const isDirectSub = item.name.includes(' ') && item.name.split(' ').includes(other.name);
          const isHonorificVariant = (cleanItem === other.name || cleanOther === item.name);

          if (isDirectSub || isHonorificVariant) {
            aliases.add(other.name);
            totalCount += other.count;
            usedNames.add(other.name);
          }
        }

        consolidated.push({
          id: 'char_' + (consolidated.length + 1),
          name: item.name,
          count: totalCount,
          aliases: Array.from(aliases),
          enabled: true
        });

        usedNames.add(item.name);
        if (consolidated.length >= maxCandidates) break;
      }

      return consolidated;
    },

    /**
     * Segment text into interaction scenes/windows according to the selected mode.
     *
     * @param {string} rawText - Raw novel text.
     * @param {string} mode - 'sliding' | 'paragraph' | 'chapter'.
     * @param {number} windowSize - Words per window for sliding mode (default: 150).
     * @param {number} stepSize - Step advance for sliding mode (default: 75).
     * @returns {Array<{ text: string, index: number }>} Array of text windows.
     */
    segmentText(rawText, mode = 'sliding', windowSize = 150, stepSize = 75) {
      if (!rawText) return [];

      if (mode === 'chapter') {
        const chapters = rawText.split(/(?:\r?\n)+(?=(?:chapter|chapitre|book|livre|part|partie)\b)/i);
        return chapters
          .map((c, idx) => ({ text: c.trim(), index: idx }))
          .filter(c => c.text.length > 50);
      }

      if (mode === 'paragraph') {
        const paras = rawText.split(/(?:\r?\n){2,}/);
        return paras
          .map((p, idx) => ({ text: p.trim(), index: idx }))
          .filter(p => p.text.length > 20);
      }

      // Default: sliding window by words
      const words = rawText.split(/\s+/);
      const windows = [];
      const totalWords = words.length;
      const wSize = Math.max(30, windowSize || 150);
      const sSize = Math.max(15, stepSize || Math.floor(wSize / 2));

      let windowIndex = 0;
      for (let i = 0; i < totalWords; i += sSize) {
        const chunk = words.slice(i, i + wSize).join(' ');
        if (chunk.trim().length > 0) {
          windows.push({ text: chunk, index: windowIndex++ });
        }
        if (i + wSize >= totalWords) break;
      }

      return windows;
    },

    /**
     * Build symmetric co-occurrence matrix across characters asynchronously.
     * Yields periodically via setTimeout/micro-task to guarantee 60fps responsiveness.
     *
     * @param {string} rawText - Novel text.
     * @param {Array<object>} characterList - Array of { id, name, aliases }.
     * @param {object} options - { windowMode, windowSize, minCooccurrences }.
     * @param {function} onProgress - Progress callback receiving percentage (0-100).
     * @returns {Promise<object>} { matrix, pairExcerpts, characterCounts, totalWindows }
     */
    async buildCooccurrenceMatrix(rawText, characterList, options = {}, onProgress = null) {
      const activeChars = characterList.filter(c => c && c.enabled !== false && c.name);
      if (activeChars.length < 2) {
        return { matrix: {}, pairExcerpts: {}, characterCounts: {}, totalWindows: 0 };
      }

      const windowMode = options.windowMode || 'sliding';
      const windowSize = options.windowSize || 150;
      const minCooccurrences = Math.max(1, options.minCooccurrences || 1);

      // Pre-compile regular expressions for fast searching of each character (name + aliases)
      const compiledChars = activeChars.map(c => {
        const terms = [c.name, ...(c.aliases || [])].filter(Boolean);
        const pattern = terms.map(t => '\\b' + escapeRegex(t.trim()) + '\\b').join('|');
        return {
          id: c.id,
          name: c.name,
          regex: new RegExp(pattern, 'i')
        };
      });

      const windows = this.segmentText(rawText, windowMode, windowSize);
      const totalWindows = windows.length;

      const matrix = {}; // key: "idA::idB" -> count
      const pairExcerpts = {}; // key: "idA::idB" -> [ { text, index } ]
      const characterCounts = {}; // id -> count of windows appeared in

      compiledChars.forEach(c => { characterCounts[c.id] = 0; });

      // Helper for canonical symmetric pair key (idA < idB)
      function pairKey(a, b) {
        return (a < b) ? (a + '::' + b) : (b + '::' + a);
      }

      const BATCH_SIZE = 150;
      let processed = 0;

      while (processed < totalWindows) {
        const batchEnd = Math.min(processed + BATCH_SIZE, totalWindows);

        for (let i = processed; i < batchEnd; i++) {
          const win = windows[i];
          const text = win.text;
          const presentChars = [];

          // Identify which characters appear in this window
          for (let c = 0; c < compiledChars.length; c++) {
            const charObj = compiledChars[c];
            if (charObj.regex.test(text)) {
              presentChars.push(charObj.id);
              characterCounts[charObj.id]++;
            }
          }

          // Record pairwise co-occurrences
          if (presentChars.length >= 2) {
            for (let j = 0; j < presentChars.length; j++) {
              for (let k = j + 1; k < presentChars.length; k++) {
                const pk = pairKey(presentChars[j], presentChars[k]);
                matrix[pk] = (matrix[pk] || 0) + 1;

                if (!pairExcerpts[pk]) pairExcerpts[pk] = [];
                // Store up to 10 sample excerpts per pair for inspection
                if (pairExcerpts[pk].length < 10) {
                  pairExcerpts[pk].push({
                    index: win.index,
                    text: text
                  });
                }
              }
            }
          }
        }

        processed = batchEnd;

        if (typeof onProgress === 'function') {
          onProgress(Math.round((processed / totalWindows) * 100));
        }

        // Yield to browser main thread
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Filter out links below minCooccurrences
      const filteredMatrix = {};
      Object.keys(matrix).forEach(pk => {
        if (matrix[pk] >= minCooccurrences) {
          filteredMatrix[pk] = matrix[pk];
        } else {
          delete pairExcerpts[pk];
        }
      });

      return {
        matrix: filteredMatrix,
        pairExcerpts,
        characterCounts,
        totalWindows
      };
    },

    /**
     * Compute graph centrality metrics (Degree, Weighted Strength, Betweenness Centrality).
     *
     * @param {object} matrix - Adjacency map { "idA::idB": weight }.
     * @param {Array<object>} characterList - List of characters.
     * @returns {object} { nodesWithMetrics, edges }
     */
    computeMetrics(matrix, characterList) {
      const activeChars = characterList.filter(c => c && c.enabled !== false && c.name);
      const charMap = new Map();
      activeChars.forEach(c => charMap.set(c.id, c));

      // Build adjacency graph
      const adj = new Map();
      const edgeList = [];
      activeChars.forEach(c => adj.set(c.id, new Map()));

      Object.entries(matrix).forEach(([key, weight]) => {
        const [a, b] = key.split('::');
        if (adj.has(a) && adj.has(b)) {
          adj.get(a).set(b, weight);
          adj.get(b).set(a, weight);
          edgeList.push({ source: a, target: b, weight });
        }
      });

      // Calculate Degree & Weighted Strength
      const degree = {};
      const strength = {};
      let maxDegree = 1;
      let maxStrength = 1;

      activeChars.forEach(c => {
        const neighbors = adj.get(c.id) || new Map();
        degree[c.id] = neighbors.size;
        let s = 0;
        neighbors.forEach(w => { s += w; });
        strength[c.id] = s;

        if (degree[c.id] > maxDegree) maxDegree = degree[c.id];
        if (s > maxStrength) maxStrength = s;
      });

      // Calculate Betweenness Centrality via Brandes' Algorithm (BFS on unweighted paths)
      const betweenness = {};
      activeChars.forEach(c => { betweenness[c.id] = 0; });

      const nodeIds = activeChars.map(c => c.id);
      for (let sIdx = 0; sIdx < nodeIds.length; sIdx++) {
        const s = nodeIds[sIdx];
        const S = []; // stack
        const P = {}; // predecessors: v -> list
        const sigma = {}; // number of shortest paths: v -> int
        const d = {}; // distance: v -> int

        nodeIds.forEach(v => {
          P[v] = [];
          sigma[v] = 0;
          d[v] = -1;
        });

        sigma[s] = 1;
        d[s] = 0;

        const Q = [s]; // queue
        while (Q.length > 0) {
          const v = Q.shift();
          S.push(v);
          const neighbors = adj.get(v) || new Map();
          neighbors.forEach((_, w) => {
            // w found for the first time?
            if (d[w] < 0) {
              Q.push(w);
              d[w] = d[v] + 1;
            }
            // shortest path to w via v?
            if (d[w] === d[v] + 1) {
              sigma[w] += sigma[v];
              P[w].push(v);
            }
          });
        }

        const delta = {};
        nodeIds.forEach(v => { delta[v] = 0; });
        while (S.length > 0) {
          const w = S.pop();
          P[w].forEach(v => {
            delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
          });
          if (w !== s) {
            betweenness[w] += delta[w];
          }
        }
      }

      // Halve betweenness because graph is undirected
      let maxBetweenness = 1;
      nodeIds.forEach(v => {
        betweenness[v] = betweenness[v] / 2;
        if (betweenness[v] > maxBetweenness) maxBetweenness = betweenness[v];
      });

      // Assemble enriched nodes
      const nodesWithMetrics = activeChars.map(c => {
        const deg = degree[c.id] || 0;
        const str = strength[c.id] || 0;
        const bet = betweenness[c.id] || 0;

        return {
          id: c.id,
          name: c.name,
          aliases: c.aliases || [],
          degree: deg,
          strength: str,
          betweenness: bet,
          normDegree: deg / maxDegree,
          normStrength: str / maxStrength,
          normBetweenness: bet / maxBetweenness
        };
      });

      return {
        nodes: nodesWithMetrics,
        edges: edgeList
      };
    },

    /**
     * Compute 2D positions for characters using Fruchterman-Reingold force-directed simulation.
     *
     * @param {Array<object>} nodes - Array of nodes.
     * @param {Array<object>} edges - Array of { source, target, weight }.
     * @param {number} width - Target canvas width (default: 1200).
     * @param {number} height - Target canvas height (default: 800).
     * @param {object} options - Layout configuration.
     * @returns {Array<object>} Nodes with computed { x, y } coordinates.
     */
    computeLayout(nodes, edges, width = 1200, height = 800, options = {}) {
      if (!nodes || nodes.length === 0) return [];

      const padX = Math.max(60, options.paddingX || 100);
      const padY = Math.max(60, options.paddingY || 100);
      const usableW = Math.max(400, width - (padX * 2));
      const usableH = Math.max(300, height - (padY * 2));
      const centerX = width / 2;
      const centerY = height / 2;

      const n = nodes.length;
      const area = usableW * usableH;
      // Optimal distance between vertices
      const k = Math.sqrt(area / Math.max(1, n)) * 0.85;

      // Initialize positions in a circle around center to avoid zero-division singularities
      const pos = {};
      const disp = {};
      const angleStep = (2 * Math.PI) / n;
      const initRadius = Math.min(usableW, usableH) * 0.35;

      nodes.forEach((node, idx) => {
        const angle = idx * angleStep;
        pos[node.id] = {
          x: centerX + initRadius * Math.cos(angle) + (Math.random() - 0.5) * 20,
          y: centerY + initRadius * Math.sin(angle) + (Math.random() - 0.5) * 20
        };
        disp[node.id] = { x: 0, y: 0 };
      });

      const iterations = Math.max(50, options.iterations || 120);
      let temp = usableW / 10;
      const coolingFactor = temp / iterations;

      for (let iter = 0; iter < iterations; iter++) {
        // Reset displacements
        nodes.forEach(node => {
          disp[node.id] = { x: 0, y: 0 };
        });

        // 1. Repulsive forces between ALL pairs of vertices
        for (let i = 0; i < n; i++) {
          const u = nodes[i].id;
          for (let j = i + 1; j < n; j++) {
            const v = nodes[j].id;
            let dx = pos[u].x - pos[v].x;
            let dy = pos[u].y - pos[v].y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 0.01) {
              dx = (Math.random() - 0.5) * 2;
              dy = (Math.random() - 0.5) * 2;
              dist = Math.sqrt(dx * dx + dy * dy);
            }

            // Electrical repulsion: f_r = k^2 / dist
            const force = (k * k) / dist;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            disp[u].x += fx;
            disp[u].y += fy;
            disp[v].x -= fx;
            disp[v].y -= fy;
          }
        }

        // 2. Attractive forces along active edges
        edges.forEach(edge => {
          const u = edge.source;
          const v = edge.target;
          if (!pos[u] || !pos[v]) return;

          let dx = pos[u].x - pos[v].x;
          let dy = pos[u].y - pos[v].y;
          let dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 0.01) dist = 0.01;

          // Spring attraction: f_a = (dist^2 / k) * weight^0.25
          const weightFactor = Math.pow(Math.max(1, edge.weight || 1), 0.25);
          const force = ((dist * dist) / k) * weightFactor;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          disp[u].x += fx;
          disp[u].y += fy;
          disp[v].x -= fx;
          disp[v].y -= fy;
        });

        // 3. Weak gravitational attraction toward canvas center (prevents disconnected components from floating away)
        nodes.forEach(node => {
          const u = node.id;
          const dx = centerX - pos[u].x;
          const dy = centerY - pos[u].y;
          disp[u].x += dx * 0.04;
          disp[u].y += dy * 0.04;
        });

        // 4. Position update bounded by temperature and canvas limits
        nodes.forEach(node => {
          const u = node.id;
          const dLen = Math.sqrt(disp[u].x * disp[u].x + disp[u].y * disp[u].y);
          if (dLen > 0) {
            const step = Math.min(dLen, temp);
            pos[u].x += (disp[u].x / dLen) * step;
            pos[u].y += (disp[u].y / dLen) * step;
          }

          // Clamp within boundaries
          pos[u].x = Math.max(padX, Math.min(width - padX, pos[u].x));
          pos[u].y = Math.max(padY, Math.min(height - padY, pos[u].y));
        });

        // Cool temperature
        temp = Math.max(0.5, temp - coolingFactor);
      }

      // Return nodes with assigned (x, y) coordinates rounded to integers
      return nodes.map(node => ({
        ...node,
        x: Math.round(pos[node.id].x),
        y: Math.round(pos[node.id].y)
      }));
    },

    /**
     * Clean and format excerpts for pair inspection modal.
     *
     * @param {Array<object>} rawExcerpts - Array of { index, text }.
     * @param {string} nameA - First character name.
     * @param {string} nameB - Second character name.
     * @returns {Array<string>} Formatted HTML passages with names highlighted.
     */
    formatExcerpts(rawExcerpts, nameA, nameB) {
      if (!Array.isArray(rawExcerpts) || rawExcerpts.length === 0) return [];

      const regA = new RegExp('(\\b' + escapeRegex(nameA) + '\\b)', 'gi');
      const regB = new RegExp('(\\b' + escapeRegex(nameB) + '\\b)', 'gi');

      return rawExcerpts.map(ex => {
        let clean = String(ex.text || '').replace(/\s+/g, ' ').trim();
        // Truncate if excessively long
        if (clean.length > 380) {
          clean = clean.substring(0, 360) + '...';
        }
        // Highlight character names
        clean = clean.replace(regA, '<mark class="char-mark-a">$1</mark>');
        clean = clean.replace(regB, '<mark class="char-mark-b">$1</mark>');
        return clean;
      });
    }
  };

  // Expose to browser window or module exports
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CharacterNetworkService;
  }
  if (typeof window !== 'undefined') {
    window.CharacterNetworkService = CharacterNetworkService;
  }

})(typeof window !== 'undefined' ? window : global);
