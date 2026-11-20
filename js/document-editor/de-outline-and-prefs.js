function deGetEditorRawContent() {
  if (currentViewMode === 'wysiwyg' && currentDocType === 'html' && typeof deSyncWysiwygToEditor === 'function') {
    deSyncWysiwygToEditor();
  }
  return mdEditor ? (mdEditor.getValue() || '') : '';
}

function deGetHtmlFromContent(rawText, docType) {
  if (docType === 'html') {
    return rawText;
  }
  if (docType === 'typ') {
    const typNormalized = (rawText || '')
      .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      .split('\n')
      .map(line => {
        const hm = line.match(/^(=+)\s+(.+)$/);
        if (hm) {
          return '#'.repeat(hm[1].length) + ' ' + hm[2];
        }
        return line;
      })
      .join('\n');
    if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
      try {
        return marked.parse(typNormalized);
      } catch (_) {}
    }
    return typNormalized;
  }

  // Markdown docType:
  if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
    try {
      return marked.parse(rawText);
    } catch (err) {
      console.warn('marked.parse failed:', err);
    }
  }
  return rawText;
}

function deExtractOutlineTreeFromDom(containerEl) {
  const items = [];
  let idCounter = 0;
  const stack = []; // [ { level, item, isList } ]

  function processNodes(children) {
    for (let i = 0; i < children.length; i++) {
      const el = children[i];
      if (el.nodeType !== Node.ELEMENT_NODE) continue;
      const tag = el.tagName.toUpperCase();

      if (/^H[1-6]$/.test(tag)) {
        const level = parseInt(tag.slice(1), 10);
        const title = el.textContent.trim();
        if (!title) continue;

        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
          stack.pop();
        }

        const parent = stack.length > 0 ? stack[stack.length - 1].item : null;
        const item = {
          id: 'de_item_' + (++idCounter),
          type: tag.toLowerCase(),
          level: level,
          depth: stack.length,
          title: title,
          note: '',
          parentId: parent ? parent.id : null,
          children: [],
          checked: true
        };

        if (parent) {
          parent.children.push(item);
        }
        items.push(item);
        stack.push({ level: level, item: item, isList: false });

      } else if (tag === 'UL' || tag === 'OL') {
        processList(el);
      } else if (tag === 'P' || tag === 'BLOCKQUOTE') {
        const text = el.textContent.trim();
        if (text && stack.length > 0) {
          const curr = stack[stack.length - 1].item;
          curr.note += (curr.note ? '\n' : '') + text;
        }
      } else if (tag === 'DETAILS') {
        const summary = el.querySelector('summary');
        if (summary) {
          const title = summary.textContent.trim();
          if (title) {
            const currentLevel = stack.length > 0 ? stack[stack.length - 1].level + 1 : 2;
            const parent = stack.length > 0 ? stack[stack.length - 1].item : null;
            const item = {
              id: 'de_item_' + (++idCounter),
              type: 'h3',
              level: currentLevel,
              depth: stack.length,
              title: title,
              note: '',
              parentId: parent ? parent.id : null,
              children: [],
              checked: true
            };
            if (parent) parent.children.push(item);
            items.push(item);
            stack.push({ level: currentLevel, item: item, isList: false });
          }
        }
        processNodes(el.children);
      } else if (['DIV', 'SECTION', 'ARTICLE', 'MAIN', 'HEADER', 'ASIDE'].includes(tag)) {
        processNodes(el.children);
      }
    }
  }

  function processList(listEl) {
    const parentOnStack = stack.length > 0 ? stack[stack.length - 1] : null;
    const baseLevel = parentOnStack ? parentOnStack.level + 1 : 1;

    for (let j = 0; j < listEl.children.length; j++) {
      const child = listEl.children[j];
      if (child.tagName.toUpperCase() !== 'LI') continue;

      let title = '';
      for (const n of child.childNodes) {
        if (n.nodeType === Node.TEXT_NODE) {
          title += n.textContent;
        } else if (n.nodeType === Node.ELEMENT_NODE) {
          const ctag = n.tagName.toUpperCase();
          if (ctag !== 'UL' && ctag !== 'OL') {
            title += ' ' + n.textContent;
          }
        }
      }
      title = title.replace(/\s+/g, ' ').trim();
      if (!title) continue;

      const parent = stack.length > 0 ? stack[stack.length - 1].item : null;
      const item = {
        id: 'de_item_' + (++idCounter),
        type: 'li',
        level: baseLevel,
        depth: stack.length,
        title: title,
        note: '',
        parentId: parent ? parent.id : null,
        children: [],
        checked: true
      };

      if (parent) {
        parent.children.push(item);
      }
      items.push(item);

      const nestedLists = Array.from(child.children).filter(c => c.tagName === 'UL' || c.tagName === 'OL');
      if (nestedLists.length > 0) {
        stack.push({ level: baseLevel + 1, item: item, isList: true });
        nestedLists.forEach(nl => processList(nl));
        stack.pop();
      }
    }
  }

  processNodes(containerEl.children);
  return items;
}

function deExtractOutlineFallback(rawText) {
  const normalized = (rawText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const items = [];
  let idCounter = 0;
  const stack = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    let setextLevel = 0;
    if (i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (/^={3,}$/.test(nextLine)) setextLevel = 1;
      else if (/^-{3,}$/.test(nextLine) && !trimmed.startsWith('-')) setextLevel = 2;
    }

    const atxMatch = trimmed.match(/^(#{1,6})\s+(.+?)(?:\s+#+)?$/);
    const typMatch = trimmed.match(/^(=+)\s+(.+)$/);
    const listMatch = line.match(/^(\s*)(?:[-*+]|\d+\.)\s+(.+)$/);

    if (setextLevel > 0 || atxMatch || typMatch) {
      const level = setextLevel > 0 ? setextLevel : (atxMatch ? atxMatch[1].length : typMatch[1].length);
      const title = setextLevel > 0 ? trimmed : (atxMatch ? atxMatch[2].trim() : typMatch[2].trim());
      if (setextLevel > 0) i++;

      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      const parent = stack.length > 0 ? stack[stack.length - 1].item : null;
      const item = {
        id: 'de_item_' + (++idCounter),
        type: 'h' + Math.min(6, level),
        level: level,
        depth: stack.length,
        title: title,
        note: '',
        parentId: parent ? parent.id : null,
        children: [],
        checked: true
      };
      if (parent) parent.children.push(item);
      items.push(item);
      stack.push({ level: level, item: item });

    } else if (listMatch) {
      const indent = listMatch[1].length;
      const listLevel = 10 + Math.floor(indent / 2);
      const title = listMatch[2].trim();

      while (stack.length > 0 && stack[stack.length - 1].level >= listLevel) {
        stack.pop();
      }
      const parent = stack.length > 0 ? stack[stack.length - 1].item : null;
      const item = {
        id: 'de_item_' + (++idCounter),
        type: 'li',
        level: listLevel,
        depth: stack.length,
        title: title,
        note: '',
        parentId: parent ? parent.id : null,
        children: [],
        checked: true
      };
      if (parent) parent.children.push(item);
      items.push(item);
      stack.push({ level: listLevel, item: item });

    } else if (stack.length > 0 && !trimmed.startsWith('```') && !trimmed.startsWith('---')) {
      const top = stack[stack.length - 1].item;
      top.note += (top.note ? '\n' : '') + trimmed;
    }
  }
  return items;
}

function deGetDocumentOutlineItems() {
  const rawText = deGetEditorRawContent();
  if (!rawText.trim()) return [];

  const html = deGetHtmlFromContent(rawText, currentDocType);
  let items = [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    items = deExtractOutlineTreeFromDom(doc.body);
  } catch (err) {
    console.warn('DOM parsing of outline failed:', err);
  }

  if (!items || items.length === 0) {
    items = deExtractOutlineFallback(rawText);
  }
  return items;
}

async function deConvertOutlineToMindmap() {
  if (!mdEditor) return;
  const rawText = deGetEditorRawContent();
  if (!rawText.trim()) {
    showToast('Document is empty', true);
    return;
  }

  const items = deGetDocumentOutlineItems();
  if (!items || items.length === 0) {
    showToast(t('deNoOutlineToExport') || 'No headings or outline items found in document to build mindmap.', true);
    return;
  }

  const docTitle = (currentDocName ? currentDocName.replace(/\.[^.]+$/, '') : 'Document Outline').trim();
  const firstH1 = items.find(it => it.level === 1);
  const defaultCentralTopic = firstH1 ? firstH1.title : docTitle;

  deOutlineExportState = {
    items: items,
    docTitle: docTitle,
    rootTitle: defaultCentralTopic,
    layout: 'tree'
  };

  const topicInput = document.getElementById('de-mm-central-topic');
  if (topicInput) topicInput.value = defaultCentralTopic;

  const layoutSelect = document.getElementById('de-mm-layout-select');
  if (layoutSelect) layoutSelect.value = 'tree';

  deMindmapRenderTree();
  showModal('de-mindmap-modal');
}

function deMindmapRenderTree() {
  const container = document.getElementById('de-mm-tree-container');
  const counterEl = document.getElementById('de-mm-counter');
  if (!container) return;

  const items = deOutlineExportState.items || [];
  const total = items.length;
  const selectedCount = items.filter(it => it.checked).length;

  if (counterEl) {
    const template = t('deMindmapSelectedCount') || '{count} of {total} elements selected';
    counterEl.textContent = template.replace('{count}', selectedCount).replace('{total}', total);
  }

  if (items.length === 0) {
    container.innerHTML = `<div style="padding:16px;text-align:center;color:#64748b;font-weight:600;">No outline items found.</div>`;
    return;
  }

  const badgeColors = {
    h1: 'background:#fef08a;color:#000;',
    h2: 'background:#fed7aa;color:#000;',
    h3: 'background:#bbf7d0;color:#000;',
    h4: 'background:#bae6fd;color:#000;',
    h5: 'background:#e0e7ff;color:#000;',
    h6: 'background:#f3e8ff;color:#000;',
    li: 'background:#f1f5f9;color:#334155;'
  };

  let html = '';
  items.forEach(item => {
    const indent = Math.min(item.depth * 18 + 6, 160);
    const bColor = badgeColors[item.type] || badgeColors.li;
    const isHeading = item.type.startsWith('h');
    const titleStyle = isHeading ? 'font-weight:800;color:#000;' : 'font-weight:500;color:#1e293b;';
    const noteBadge = item.note
      ? `<span style="font-size:0.68rem;background:#f8fafc;border:1px solid #cbd5e1;padding:1px 4px;color:#64748b;margin-left:auto;white-space:nowrap;font-weight:600;" title="${escHtml(item.note)}"> note</span>`
      : '';

    html += `
      <div class="de-mm-tree-row" style="display:flex;align-items:center;gap:8px;padding:3px 6px;padding-left:${indent}px;border-bottom:1px solid #f1f5f9;transition:background 0.1s ease;">
        <input type="checkbox" class="de-mm-chk" data-mm-id="${escHtml(item.id)}" id="de-mm-chk-${item.id}" ${item.checked ? 'checked' : ''} style="accent-color:#000;cursor:pointer;width:15px;height:15px;margin:0;" />
        <span class="de-mm-badge" style="font-size:0.65rem;font-weight:900;border:1.5px solid #000;padding:1px 5px;box-shadow:1px 1px 0px #000;${bColor}">${item.type.toUpperCase()}</span>
        <span style="font-size:0.82rem;${titleStyle}overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;" title="${escHtml(item.title)}">${escHtml(item.title)}</span>
        ${noteBadge}
      </div>
    `;
  });

  container.innerHTML = html;
  if (!container._deMmDelegated) {
    container._deMmDelegated = true;
    container.addEventListener('change', function (e) {
      var chk = e.target.closest('input.de-mm-chk[data-mm-id]');
      if (!chk) return;
      deMindmapToggleItem(chk.getAttribute('data-mm-id'), chk.checked);
    });
    container.addEventListener('mouseover', function (e) {
      var row = e.target.closest('.de-mm-tree-row');
      if (row) row.style.background = '#f8fafc';
    });
    container.addEventListener('mouseout', function (e) {
      var row = e.target.closest('.de-mm-tree-row');
      if (row && !row.contains(e.relatedTarget)) row.style.background = 'transparent';
    });
  }
}

function deMindmapToggleItem(itemId, checked) {
  const items = deOutlineExportState.items || [];
  const item = items.find(it => it.id === itemId);
  if (!item) return;

  item.checked = checked;

  function setSubtreeChecked(parent, val) {
    if (!parent.children || !parent.children.length) return;
    parent.children.forEach(child => {
      child.checked = val;
      setSubtreeChecked(child, val);
    });
  }
  setSubtreeChecked(item, checked);

  if (checked) {
    let curr = item;
    while (curr && curr.parentId) {
      const p = items.find(it => it.id === curr.parentId);
      if (p) {
        p.checked = true;
        curr = p;
      } else {
        break;
      }
    }
  }

  deMindmapRenderTree();
}

function deMindmapSetSelection(mode) {
  const items = deOutlineExportState.items || [];
  if (mode === 'all') {
    items.forEach(it => it.checked = true);
  } else if (mode === 'none') {
    items.forEach(it => it.checked = false);
  } else if (mode === 'headings') {
    items.forEach(it => {
      it.checked = it.type.startsWith('h');
    });
  }
  deMindmapRenderTree();
}

function deCloseMindmapModal() {
  hideModal('de-mindmap-modal');
}

async function deExecuteMindmapExport() {
  const items = deOutlineExportState.items || [];
  const activeItems = items.filter(it => it.checked);

  if (activeItems.length === 0) {
    showToast(t('deMindmapPleaseSelect') || 'Please select at least one outline element to export.', true);
    return;
  }

  const topicInput = document.getElementById('de-mm-central-topic');
  const rootTitle = (topicInput && topicInput.value.trim()) ? topicInput.value.trim() : (deOutlineExportState.rootTitle || 'Mindmap');
  const layoutSelect = document.getElementById('de-mm-layout-select');
  const layoutMode = (layoutSelect ? layoutSelect.value : '') || 'tree';

  hideModal('de-mindmap-modal');

  const mindmapTitle = 'Mindmap: ' + rootTitle;
  const rootId = 'node_root_' + Date.now();

  // Check if the first active item is an H1 that matches the central topic title
  const isFirstH1Root = activeItems.length > 0 && activeItems[0].type === 'h1' &&
    activeItems[0].title.trim().toLowerCase() === rootTitle.trim().toLowerCase();

  // Determine which items to generate as child nodes
  const exportItems = isFirstH1Root ? activeItems.slice(1) : activeItems;

  // Assign unique, permanent node IDs for all nodes
  const nodeIdMap = new Map();
  nodeIdMap.set('root', rootId);
  if (isFirstH1Root) {
    nodeIdMap.set(activeItems[0].id, rootId);
  }
  exportItems.forEach((it, idx) => {
    nodeIdMap.set(it.id, 'node_' + it.id + '_' + idx + '_' + Date.now());
  });

  // Resolve effective parent node ID for every item
  exportItems.forEach(item => {
    let pId = item.parentId;
    let resolvedParentNodeId = rootId;
    while (pId) {
      if (nodeIdMap.has(pId)) {
        resolvedParentNodeId = nodeIdMap.get(pId);
        break;
      }
      const parentItem = items.find(it => it.id === pId);
      pId = parentItem ? parentItem.parentId : null;
    }
    item.effectiveParentNodeId = resolvedParentNodeId;
  });

  // Build child adjacency map keyed by parent node ID
  const childrenMap = {};
  childrenMap[rootId] = [];
  exportItems.forEach(it => {
    const pNodeId = it.effectiveParentNodeId;
    if (!childrenMap[pNodeId]) childrenMap[pNodeId] = [];
    childrenMap[pNodeId].push(it);
  });

  const nodes = [];
  const edges = [];
  const notes = [];
  const branchPalette = ['#ffffff', '#e0f2fe', '#dcfce7', '#fce7f3', '#ffedd5', '#f3e8ff', '#ccfbf1', '#fef9c3'];

  if (layoutMode === 'tree') {
    // ── Horizontal Tree (Hierarchy - Left-to-Right) ──────────
    let currentY = 120;
    const colWidth = 320;

    function assignHorizontalPositions(nodeId, depth) {
      const children = childrenMap[nodeId] || [];
      const x = 140 + depth * colWidth;

      if (children.length === 0) {
        const leafItem = exportItems.find(it => nodeIdMap.get(it.id) === nodeId);
        const hasNote = leafItem && !!leafItem.note;
        const y = currentY;
        currentY += hasNote ? 145 : 90;
        return { x, y };
      }

      const childYs = [];
      children.forEach((ch, idx) => {
        const chNodeId = nodeIdMap.get(ch.id);
        const pos = assignHorizontalPositions(chNodeId, depth + 1);
        ch.x = pos.x;
        ch.y = pos.y;
        childYs.push(pos.y);

        const isHeading = ch.type.startsWith('h');
        const branchColor = branchPalette[idx % branchPalette.length];

        nodes.push({
          id: chNodeId,
          baseWord: ch.title,
          x: ch.x,
          y: ch.y,
          bg: isHeading ? branchColor : '#ffffff',
          color: '#000000',
          border: '#000000',
          borderWidth: isHeading ? 2 : 1.5,
          borderStyle: 'solid',
          fontSize: isHeading ? (ch.level <= 2 ? '15px' : '13px') : '12px',
          shape: 'rectangle',
          fmt: { bold: isHeading },
          rotation: 0
        });

        edges.push({
          id: 'edge_' + nodeId + '_' + chNodeId,
          a: nodeId,
          b: chNodeId,
          color: '#000000',
          thickness: isHeading ? 2 : 1.5,
          type: 'none',
          strokeType: 'solid',
          routing: 'straight'
        });

        if (ch.note) {
          notes.push({
            id: 'note_' + chNodeId,
            nodeId: chNodeId,
            x: ch.x,
            y: ch.y + 44,
            width: 220,
            height: 75,
            manualSize: true,
            bg: '#f8fafc',
            color: '#1e293b',
            borderColor: '#000000',
            borderWidth: 1.5,
            text: ch.note.slice(0, 300),
            html: ''
          });
        }
      });

      let y = Math.round((childYs[0] + childYs[childYs.length - 1]) / 2);
      const parentItem = exportItems.find(it => nodeIdMap.get(it.id) === nodeId);
      if (parentItem && parentItem.note && children.length === 1) {
        currentY = Math.max(currentY, y + 105);
      }
      return { x, y };
    }

    const rootPos = assignHorizontalPositions(rootId, 0);
    nodes.unshift({
      id: rootId,
      baseWord: rootTitle.toUpperCase(),
      x: rootPos.x,
      y: rootPos.y,
      bg: '#fef08a',
      color: '#000000',
      border: '#000000',
      borderWidth: 3,
      borderStyle: 'solid',
      fontSize: '20px',
      shape: 'rectangle',
      fmt: { bold: true },
      rotation: 0
    });

  } else if (layoutMode === 'tree-v') {
    // ── Top-Down Tree (Hierarchy - Top-to-Bottom) ────────────
    let currentX = 140;
    const rowHeight = 180;
    const colWidth = 260;

    function assignVerticalPositions(nodeId, depth) {
      const children = childrenMap[nodeId] || [];
      const y = 140 + depth * rowHeight;

      if (children.length === 0) {
        const x = currentX;
        currentX += colWidth;
        return { x, y };
      }

      const childXs = [];
      children.forEach((ch, idx) => {
        const chNodeId = nodeIdMap.get(ch.id);
        const pos = assignVerticalPositions(chNodeId, depth + 1);
        ch.x = pos.x;
        ch.y = pos.y;
        childXs.push(pos.x);

        const isHeading = ch.type.startsWith('h');
        const branchColor = branchPalette[idx % branchPalette.length];

        nodes.push({
          id: chNodeId,
          baseWord: ch.title,
          x: ch.x,
          y: ch.y,
          bg: isHeading ? branchColor : '#ffffff',
          color: '#000000',
          border: '#000000',
          borderWidth: isHeading ? 2 : 1.5,
          borderStyle: 'solid',
          fontSize: isHeading ? (ch.level <= 2 ? '15px' : '13px') : '12px',
          shape: 'rectangle',
          fmt: { bold: isHeading },
          rotation: 0
        });

        edges.push({
          id: 'edge_' + nodeId + '_' + chNodeId,
          a: nodeId,
          b: chNodeId,
          color: '#000000',
          thickness: isHeading ? 2 : 1.5,
          type: 'none',
          strokeType: 'solid',
          routing: 'straight'
        });

        if (ch.note) {
          notes.push({
            id: 'note_' + chNodeId,
            nodeId: chNodeId,
            x: ch.x,
            y: ch.y + 44,
            width: 200,
            height: 75,
            manualSize: true,
            bg: '#f8fafc',
            color: '#1e293b',
            borderColor: '#000000',
            borderWidth: 1.5,
            text: ch.note.slice(0, 300),
            html: ''
          });
        }
      });

      const x = Math.round((childXs[0] + childXs[childXs.length - 1]) / 2);
      return { x, y };
    }

    const rootPos = assignVerticalPositions(rootId, 0);
    nodes.unshift({
      id: rootId,
      baseWord: rootTitle.toUpperCase(),
      x: rootPos.x,
      y: rootPos.y,
      bg: '#fef08a',
      color: '#000000',
      border: '#000000',
      borderWidth: 3,
      borderStyle: 'solid',
      fontSize: '20px',
      shape: 'rectangle',
      fmt: { bold: true },
      rotation: 0
    });

  } else {
    // ── Radial / Starburst ────────────────────────────────────
    nodes.push({
      id: rootId,
      baseWord: rootTitle.toUpperCase(),
      x: 800,
      y: 600,
      bg: '#fef08a',
      color: '#000000',
      border: '#000000',
      borderWidth: 3,
      borderStyle: 'solid',
      fontSize: '20px',
      shape: 'rectangle',
      fmt: { bold: true },
      rotation: 0
    });

    const rootChildren = childrenMap[rootId] || [];
    const nRoot = Math.max(1, rootChildren.length);
    const R1 = Math.max(280, Math.min(460, 220 + nRoot * 18));

    rootChildren.forEach((item, idx) => {
      const angle = (2 * Math.PI * idx) / nRoot - Math.PI / 2;
      const x = Math.round(800 + R1 * Math.cos(angle));
      const y = Math.round(600 + R1 * Math.sin(angle));
      const chNodeId = nodeIdMap.get(item.id);
      item.x = x;
      item.y = y;

      const isHeading = item.type.startsWith('h');
      const branchColor = branchPalette[idx % branchPalette.length];

      nodes.push({
        id: chNodeId,
        baseWord: item.title,
        x: x,
        y: y,
        bg: isHeading ? branchColor : '#ffffff',
        color: '#000000',
        border: '#000000',
        borderWidth: isHeading ? 2 : 1.5,
        borderStyle: 'solid',
        fontSize: isHeading ? (item.level <= 2 ? '15px' : '13px') : '12px',
        shape: 'rectangle',
        fmt: { bold: isHeading },
        rotation: 0
      });

      edges.push({
        id: 'edge_' + rootId + '_' + chNodeId,
        a: rootId,
        b: chNodeId,
        color: '#000000',
        thickness: isHeading ? 2 : 1.5,
        type: 'none',
        strokeType: 'solid',
        routing: 'straight'
      });

      if (item.note) {
        notes.push({
          id: 'note_' + chNodeId,
          nodeId: chNodeId,
          x: x,
          y: y + 40,
          width: 200,
          height: 75,
          manualSize: true,
          bg: '#f8fafc',
          color: '#1e293b',
          borderColor: '#000000',
          borderWidth: 1.5,
          text: item.note.slice(0, 300),
          html: ''
        });
      }

      layoutRadialSubtree(chNodeId, angle, branchColor);
    });

    function layoutRadialSubtree(parentNodeId, parentAngle, branchColor) {
      const children = childrenMap[parentNodeId] || [];
      if (!children.length) return;
      const m = children.length;
      const arcSpan = Math.min(1.3, Math.max(0.4, (2 * Math.PI / 7) * 0.8));
      const R2 = 190;
      const parentNode = nodes.find(n => n.id === parentNodeId);
      if (!parentNode) return;

      children.forEach((ch, j) => {
        const chAngle = parentAngle - arcSpan / 2 + (m > 1 ? (j / (m - 1)) * arcSpan : arcSpan / 2);
        const chX = Math.round(parentNode.x + R2 * Math.cos(chAngle));
        const chY = Math.round(parentNode.y + R2 * Math.sin(chAngle));
        const chNodeId = nodeIdMap.get(ch.id);

        const isHeading = ch.type.startsWith('h');
        nodes.push({
          id: chNodeId,
          baseWord: ch.title,
          x: chX,
          y: chY,
          bg: isHeading ? branchColor : '#ffffff',
          color: '#000000',
          border: '#000000',
          borderWidth: isHeading ? 2 : 1.5,
          borderStyle: 'solid',
          fontSize: isHeading ? '13px' : '12px',
          shape: 'rectangle',
          fmt: { bold: isHeading },
          rotation: 0
        });

        edges.push({
          id: 'edge_' + parentNodeId + '_' + chNodeId,
          a: parentNodeId,
          b: chNodeId,
          color: '#000000',
          thickness: 1.5,
          type: 'none',
          strokeType: 'solid',
          routing: 'straight'
        });

        if (ch.note) {
          notes.push({
            id: 'note_' + chNodeId,
            nodeId: chNodeId,
            x: chX,
            y: chY + 35,
            width: 190,
            height: 70,
            manualSize: true,
            bg: '#f8fafc',
            color: '#1e293b',
            borderColor: '#000000',
            borderWidth: 1.5,
            text: ch.note.slice(0, 300),
            html: ''
          });
        }

        layoutRadialSubtree(chNodeId, chAngle, branchColor);
      });
    }
  }

  // ── Universal Bounding-Box Normalization ────────────────────
  // Guarantees all nodes and notes appear completely inside the visible board with clean margins
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  nodes.forEach(n => {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + 240);
    maxY = Math.max(maxY, n.y + 60);
  });

  notes.forEach(nt => {
    minX = Math.min(minX, nt.x);
    minY = Math.min(minY, nt.y);
    maxX = Math.max(maxX, nt.x + (nt.width || 220));
    maxY = Math.max(maxY, nt.y + (nt.height || 80));
  });

  const targetMarginX = 140;
  const targetMarginY = 140;
  const shiftX = targetMarginX - minX;
  const shiftY = targetMarginY - minY;

  nodes.forEach(n => {
    n.x = Math.round(n.x + shiftX);
    n.y = Math.round(n.y + shiftY);
  });

  notes.forEach(nt => {
    nt.x = Math.round(nt.x + shiftX);
    nt.y = Math.round(nt.y + shiftY);
  });

  const totalBoardHeight = Math.max(1600, Math.round(maxY + shiftY + 250));

  const constellationData = {
    _type: 'constellation',
    _version: 1,
    title: mindmapTitle,
    dateCreated: new Date().toISOString(),
    boardHeight: totalBoardHeight,
    nodes: nodes,
    edges: edges,
    links: edges,
    notes: notes,
    groups: [],
    masks: [],
    drawings: [],
    shapes: [],
    tables: [],
    media: [],
    attachments: [],
    competences: []
  };

  const slug = (deOutlineExportState.docTitle || rootTitle).toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 25).replace(/^_+|_+$/g, '') || 'outline';
  const filename = 'mindmap_' + slug + '_' + Date.now() + '.json';

  const isElec = window.Desktop && (typeof Desktop.isElectron === 'function' ? Desktop.isElectron() : !!Desktop.isElectron);

  if (isElec && typeof Desktop.saveJson === 'function') {
    const sRes = await Desktop.saveJson('mindmaps', filename, constellationData);
    if (sRes && sRes.ok) {
      const docUrn = getDeActiveDocUrn() || ('cmt:doc:docEditorDocs/' + (currentDocName || 'doc.md'));
      if (typeof LinksService !== 'undefined') {
        await LinksService.addLink(docUrn, 'cmt:board:' + filename, {
          relation: 'outline_mindmap',
          meta: {
            docTitle: deOutlineExportState.docTitle || rootTitle,
            mindmapTitle: mindmapTitle
          }
        });
        updateDeDocLinksBadge();
      }

      const openBoard = window.showConfirm
        ? await window.showConfirm((t('deMindmapCreated') || 'Mindmap generated from outline and linked!') + '\n\n' + (t('deOpenInBoardPrompt') || 'Open in Board now?'))
        : confirm((t('deMindmapCreated') || 'Mindmap generated from outline and linked!') + '\n\nOpen in Board now?');

      if (openBoard && typeof Desktop.openTool === 'function') {
        Desktop.openTool('board.html', {
          query: {
            openSession: '1',
            openTarget: 'mindmaps',
            openFilename: filename,
            openSection: 'constellation'
          }
        });
      }
    } else {
      showToast('Failed to save mindmap session', true);
    }
  } else {
    try {
      localStorage.setItem('cmt_mindmap_' + filename, JSON.stringify(constellationData));
    } catch (_) {}
    showToast(t('deMindmapCreated') || 'Mindmap generated from outline!');
  }
}
window.deConvertOutlineToMindmap = deConvertOutlineToMindmap;
window.deMindmapRenderTree = deMindmapRenderTree;
window.deMindmapToggleItem = deMindmapToggleItem;
window.deMindmapSetSelection = deMindmapSetSelection;
window.deCloseMindmapModal = deCloseMindmapModal;
window.deExecuteMindmapExport = deExecuteMindmapExport;

if (typeof window !== 'undefined') {
  window.addEventListener('cmt-links-changed', () => {
    updateDeDocLinksBadge();
  });
}

function goToLauncher() {
  if (window.Desktop && Desktop.isElectron()) {
    Desktop.goToLauncher();
  } else {
    window.location.href = 'launcher.html';
  }
}

// ── Editor Settings ──────────────────────────────────────

let editorSettings = {
  snippets: [],
  shortcuts: [],
  typingTriggers: [],
  customCssRules: [],
  customSyntaxSnippets: [],
  editorPrefs: {
    fontSize: 14,
    wordWrap: 'on',
    lineNumbers: 'on',
    tabSize: 2,
    inlineStylesheet: true,
    defaultLayout: deCloneDefaultPageLayout()
  }
};

let _completionDisposable = null;
let _shortcutDisposables = [];
let _applyingTrigger = false;
let _stgTab = 'prefs';
let _stgSnippetEdit = null;
let _stgShortcutEdit = null;
let _stgTriggerEdit = null;
let _stgCssRuleEdit = null;
let _stgKeyData = null;
let _stgCssRuleEditor = null;

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

async function loadEditorSettings() {
  if (!window.Desktop || !Desktop.isElectron()) return;
  try {
    const r = await Desktop.readJson('docEditorSettings', 'settings.js');
    if (r && r.ok && r.data && typeof r.data === 'object') {
      const d = r.data;
      if (Array.isArray(d.snippets)) editorSettings.snippets = d.snippets;
      if (Array.isArray(d.shortcuts)) editorSettings.shortcuts = d.shortcuts;
      if (Array.isArray(d.typingTriggers)) editorSettings.typingTriggers = d.typingTriggers;
      if (Array.isArray(d.customCssRules)) editorSettings.customCssRules = d.customCssRules;
      if (Array.isArray(d.customSyntaxSnippets)) editorSettings.customSyntaxSnippets = d.customSyntaxSnippets;
      if (d.editorPrefs && typeof d.editorPrefs === 'object') {
        Object.assign(editorSettings.editorPrefs, d.editorPrefs);
      }
    }
  } catch (e) { }
  editorSettings.editorPrefs.inlineStylesheet = true;
  editorLayoutDefaults = deClonePageLayout(editorSettings.editorPrefs.defaultLayout);
  editorSettings.editorPrefs.defaultLayout = deClonePageLayout(editorLayoutDefaults);
}

async function saveEditorSettings() {
  if (!window.Desktop || !Desktop.isElectron()) return;
  try {
    editorSettings.editorPrefs.inlineStylesheet = true;
    editorSettings.editorPrefs.defaultLayout = deClonePageLayout(editorLayoutDefaults);
    if (!Array.isArray(editorSettings.customCssRules)) editorSettings.customCssRules = [];
    if (!Array.isArray(editorSettings.customSyntaxSnippets)) editorSettings.customSyntaxSnippets = [];
    await Desktop.saveJson('docEditorSettings', 'settings.js', editorSettings);
  } catch (e) { showToast('Settings save failed', true); }
}

function applyEditorPrefs() {
  if (!mdEditor) return;
  const p = editorSettings.editorPrefs;
  mdEditor.updateOptions({
    fontSize: p.fontSize || 14,
    wordWrap: p.wordWrap || 'on',
    lineNumbers: p.lineNumbers || 'on',
    tabSize: p.tabSize || 2
  });
}

function isInlineStylesheetEnabled() {
  return true;
}

function applyStylesheetContent(cssContent, sourceName) {
  const css = deComposeManagedStylesheet(cssContent || '');
  currentStylesheetName = sourceName || '@inline@';
  deSetCssEditorValue(css, false);
}

function applyInlineStylesheetMeta(meta) {
  const css = meta && typeof meta.stylesheetContent === 'string' ? meta.stylesheetContent : '';
  applyStylesheetContent(css, css ? '@inline@' : null);
}

function syncDocStylesheetMeta() {
  currentDocMeta.stylesheetInline = true;
  currentDocMeta.stylesheetContent = cssEditor ? cssEditor.getValue() : '';
  currentDocMeta.stylesheet = null;
  currentDocMeta.stylesheetInDocs = false;
}

function getDocStylesheetRelPath(docName, subdir) {
  const cssName = String(docName || '').replace(/\.(md|html)$/i, '') + '.css';
  return subdir ? subdir + '/' + cssName : cssName;
}

function injectInlineStylesheetIntoHtml(html, css) {
  return deInjectInlineStyles(html, 'html', css);
}

const EDITOR_ACTIONS = [
  { id: 'editor.action.copyLinesDownAction', label: 'Duplicate line down' },
  { id: 'editor.action.copyLinesUpAction', label: 'Duplicate line up' },
  { id: 'editor.action.moveLinesDownAction', label: 'Move line down' },
  { id: 'editor.action.moveLinesUpAction', label: 'Move line up' },
  { id: 'editor.action.deleteLines', label: 'Delete line' },
  { id: 'editor.action.joinLines', label: 'Join lines' },
  { id: 'editor.action.sortLinesAscending', label: 'Sort lines A → Z' },
  { id: 'editor.action.sortLinesDescending', label: 'Sort lines Z → A' },
  { id: 'editor.action.indentLines', label: 'Indent' },
  { id: 'editor.action.outdentLines', label: 'Outdent' },
  { id: 'editor.action.transformToUppercase', label: 'Uppercase' },
  { id: 'editor.action.transformToLowercase', label: 'Lowercase' },
  { id: 'editor.action.trimTrailingWhitespace', label: 'Trim trailing whitespace' },
  { id: 'editor.action.commentLine', label: 'Toggle line comment' },
  { id: 'editor.action.selectAll', label: 'Select all' },
  { id: 'actions.find', label: 'Open Find' },
  { id: 'editor.action.startFindReplaceAction', label: 'Open Find & Replace' },
  { id: 'editor.fold', label: 'Fold' },
  { id: 'editor.unfold', label: 'Unfold' },
  { id: 'editor.foldAll', label: 'Fold all' },
  { id: 'editor.unfoldAll', label: 'Unfold all' },
];

function applyShortcuts() {
  _shortcutDisposables.forEach(d => { try { d.dispose(); } catch (e) { } });
  _shortcutDisposables = [];
  if (!mdEditor) return;
  for (const sc of editorSettings.shortcuts) {
    const kb = buildMonacoKeybinding(sc);
    if (kb === null) continue;
    try {
      const d = mdEditor.addAction({
        id: 'cmt-sc-' + sc.id,
        label: sc.label || 'Custom shortcut',
        keybindings: [kb],
        run() {
          const type = sc.type || 'wrap';
          if (type === 'action') {
            mdEditor.trigger('keyboard', sc.actionId, null);
          } else if (type === 'insert') {
            mdEditor.trigger('keyboard', 'editor.action.insertSnippet', { snippet: sc.insertBody || '' });
          } else {
            const sel = mdEditor.getSelection();
            const text = mdEditor.getModel().getValueInRange(sel);
            const before = sc.wrapBefore || '';
            const after = sc.wrapAfter || '';
            mdEditor.executeEdits('cmt-sc', [{ range: sel, text: before + text + after }]);
            if (!text) {
              mdEditor.setPosition({ lineNumber: sel.startLineNumber, column: sel.startColumn + before.length });
            }
          }
        }
      });
      _shortcutDisposables.push(d);
    } catch (e) { }
  }
}

function applySnippetCompletions() {
  if (_completionDisposable) {
    try { _completionDisposable.dispose(); } catch (e) { }
    _completionDisposable = null;
  }
  if (typeof monaco === 'undefined') return;
  const items = editorSettings.snippets.filter(
    s => s.triggerMode === 'completion' || s.triggerMode === 'both'
  );
  if (!items.length) return;
  _completionDisposable = monaco.languages.registerCompletionItemProvider('markdown', {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
        startColumn: word.startColumn, endColumn: word.endColumn
      };
      return {
        suggestions: items.map(s => ({
          label: s.prefix,
          kind: monaco.languages.CompletionItemKind.Snippet,
          detail: s.label || s.prefix,
          insertText: s.body,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range
        }))
      };
    }
  });
}

function checkTypingTriggers() {
  if (_applyingTrigger || !mdEditor) return;
  const model = mdEditor.getModel();
  const pos = mdEditor.getPosition();
  if (!pos) return;
  const line = model.getLineContent(pos.lineNumber);
  const col = pos.column - 1;

  const allTriggers = [
    ...editorSettings.snippets
      .filter(s => s.triggerMode === 'typed' || s.triggerMode === 'both')
      .map(s => ({ trigger: s.prefix, expand: s.body })),
    ...editorSettings.typingTriggers
  ];

  for (const t of allTriggers) {
    const tr = t.trigger;
    if (!tr || col < tr.length) continue;
    if (line.substring(col - tr.length, col) === tr) {
      _applyingTrigger = true;
      const range = {
        startLineNumber: pos.lineNumber, endLineNumber: pos.lineNumber,
        startColumn: pos.column - tr.length, endColumn: pos.column
      };
      mdEditor.executeEdits('cmt-trigger', [{ range, text: t.expand }]);
      _applyingTrigger = false;
      return;
    }
  }
}

function buildMonacoKeybinding(sc) {
  if (!sc || !sc.key || typeof monaco === 'undefined') return null;
  const K = monaco.KeyCode;
  const k = sc.key.toLowerCase();
  let kc = null;
  if (k.length === 1) {
    if (k >= 'a' && k <= 'z') kc = K['Key' + k.toUpperCase()];
    else if (k >= '0' && k <= '9') kc = K['Digit' + k];
    else {
      const sym = {
        ',': K.Comma, '.': K.Period, '/': K.Slash, ';': K.Semicolon,
        "'": K.Quote, '[': K.BracketLeft, ']': K.BracketRight,
        '\\': K.Backslash, '-': K.Minus, '=': K.Equal, '`': K.Backquote, ' ': K.Space
      };
      kc = sym[k];
    }
  } else {
    const fm = k.match(/^f(\d+)$/);
    if (fm) {
      kc = K['F' + fm[1]];
    } else {
      kc = {
        enter: K.Enter, tab: K.Tab, escape: K.Escape,
        backspace: K.Backspace, space: K.Space,
        arrowup: K.UpArrow, arrowdown: K.DownArrow,
        arrowleft: K.LeftArrow, arrowright: K.RightArrow
      }[k];
    }
  }
  if (kc == null) return null;
  let mod = 0;
  if (sc.ctrlKey) mod |= monaco.KeyMod.CtrlCmd;
  if (sc.altKey) mod |= monaco.KeyMod.Alt;
  if (sc.shiftKey) mod |= monaco.KeyMod.Shift;
  return mod | kc;
}

function formatKeyCombo(sc) {
  if (!sc || !sc.key) return '—';
  const parts = [];
  if (sc.ctrlKey) parts.push('Ctrl');
  if (sc.altKey) parts.push('Alt');
  if (sc.shiftKey) parts.push('Shift');
  const k = sc.key;
  parts.push(k === ' ' ? 'Space' : k.length === 1 ? k.toUpperCase() : k.charAt(0).toUpperCase() + k.slice(1));
  return parts.join('+');
}

// ── Settings modal ────────────────────────────────────────

