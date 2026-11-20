// Shared lightweight DOM synchronization helpers for 60fps in-place updates.
(function () {
  'use strict';

  function setText(el, value) {
    if (!el) return false;
    var next = value == null ? '' : String(value);
    if (el.textContent !== next) {
      el.textContent = next;
      return true;
    }
    return false;
  }

  function setClass(el, className, enabled) {
    if (!el || !el.classList || !className) return false;
    var want = !!enabled;
    var has = el.classList.contains(className);
    if (has !== want) {
      el.classList.toggle(className, want);
      return true;
    }
    return false;
  }

  function setAttr(el, name, value) {
    if (!el || !name) return false;
    if (value === null || value === undefined || value === false) {
      if (el.hasAttribute(name)) {
        el.removeAttribute(name);
        return true;
      }
      return false;
    }
    var next = value === true ? '' : String(value);
    if (el.getAttribute(name) !== next) {
      el.setAttribute(name, next);
      return true;
    }
    return false;
  }

  function patchListByKey(container, items, getKey, createEl, updateEl) {
    if (!container) return;
    var list = Array.isArray(items) ? items : [];
    var existingByKey = new Map();
    var children = container.children || [];
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      var k = child && child.dataset ? child.dataset.syncKey : null;
      if (k !== undefined && k !== null && k !== '') {
        existingByKey.set(String(k), child);
      }
    }

    var seenKeys = new Set();
    var orderedNodes = [];
    for (var j = 0; j < list.length; j++) {
      var item = list[j];
      var key = String(getKey(item, j));
      seenKeys.add(key);
      var node = existingByKey.get(key);
      if (!node) {
        node = createEl(item, j);
        if (node && node.dataset) {
          node.dataset.syncKey = key;
        }
      }
      if (node && typeof updateEl === 'function') {
        updateEl(node, item, j);
      }
      if (node) {
        orderedNodes.push(node);
      }
    }

    // Remove stale keyed or unkeyed children no longer in list
    for (var r = children.length - 1; r >= 0; r--) {
      var cur = children[r];
      var curKey = cur && cur.dataset ? cur.dataset.syncKey : null;
      if (!curKey || !seenKeys.has(String(curKey))) {
        container.removeChild(cur);
      }
    }

    // Reorder / insert only where positions differ
    for (var idx = 0; idx < orderedNodes.length; idx++) {
      var targetNode = orderedNodes[idx];
      var currentAtIdx = container.children[idx] || null;
      if (currentAtIdx !== targetNode) {
        container.insertBefore(targetNode, currentAtIdx);
      }
    }
  }

  var _windowStates = typeof WeakMap === 'function' ? new WeakMap() : null;

  function computeWindowRange(totalCount, scrollOffset, viewportHeight, rowHeight, overscan) {
    var total = Math.max(0, Number(totalCount) || 0);
    if (total === 0) return { start: 0, end: 0, topHeight: 0, bottomHeight: 0 };
    var rh = Math.max(1, Number(rowHeight) || 42);
    var vh = Math.max(rh, Number(viewportHeight) || 600);
    var ov = Math.max(0, Number(overscan) || 12);
    var offset = Math.max(0, Number(scrollOffset) || 0);
    var firstVisible = Math.floor(offset / rh);
    var visibleCount = Math.ceil(vh / rh);
    var start = Math.max(0, firstVisible - ov);
    var end = Math.min(total, firstVisible + visibleCount + ov);
    return {
      start: start,
      end: end,
      topHeight: start * rh,
      bottomHeight: Math.max(0, (total - end) * rh)
    };
  }

  function _findScrollContainer(el) {
    if (typeof window === 'undefined' || !el) return null;
    var cur = el.parentElement;
    while (cur && cur !== document.body && cur !== document.documentElement) {
      if (typeof getComputedStyle === 'function') {
        var oy = getComputedStyle(cur).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && cur.clientHeight > 0) {
          return cur;
        }
      }
      cur = cur.parentElement;
    }
    return window;
  }

  function _ensureSpacer(container, isTable, pos, colSpan) {
    var doc = container.ownerDocument;
    if (isTable) {
      var tr = doc.createElement('tr');
      tr.dataset.syncSpacer = pos;
      tr.setAttribute('aria-hidden', 'true');
      var td = doc.createElement('td');
      td.colSpan = Math.max(1, colSpan || 1);
      td.style.padding = '0';
      td.style.border = 'none';
      td.style.height = '0px';
      tr.appendChild(td);
      return tr;
    }
    var div = doc.createElement('div');
    div.dataset.syncSpacer = pos;
    div.setAttribute('aria-hidden', 'true');
    div.style.height = '0px';
    div.style.pointerEvents = 'none';
    return div;
  }

  function _setSpacerHeight(spacer, isTable, px) {
    var h = Math.max(0, Math.round(px)) + 'px';
    var target = isTable ? spacer.firstChild : spacer;
    if (target && target.style && target.style.height !== h) {
      target.style.height = h;
    }
    var disp = px > 0 ? '' : 'none';
    if (spacer.style && spacer.style.display !== disp) {
      spacer.style.display = disp;
    }
  }

  /**
   * Renders large lists/tables using scroll windowing above `threshold` items,
   * while delegating smaller lists directly to `patchListByKey`.
   */
  function renderWindowedRows(container, items, getKey, createEl, updateEl, options) {
    if (!container) return;
    var opts = options || {};
    var list = Array.isArray(items) ? items : [];
    var threshold = opts.threshold !== undefined ? opts.threshold : 80;
    var rowHeight = opts.rowHeight || 42;
    var overscan = opts.overscan !== undefined ? opts.overscan : 12;
    var colSpan = opts.colSpan || 1;
    var isTable = container.tagName === 'TBODY';

    var state = _windowStates ? _windowStates.get(container) : null;

    if (list.length <= threshold || typeof window === 'undefined') {
      if (state) {
        if (state.topSpacer && state.topSpacer.parentNode === container) container.removeChild(state.topSpacer);
        if (state.bottomSpacer && state.bottomSpacer.parentNode === container) container.removeChild(state.bottomSpacer);
        state.lastRange = null;
      }
      patchListByKey(container, list, getKey, createEl, updateEl);
      return;
    }

    if (!state) {
      state = {
        scrollEl: opts.scrollContainer || _findScrollContainer(container),
        topSpacer: _ensureSpacer(container, isTable, 'top', colSpan),
        bottomSpacer: _ensureSpacer(container, isTable, 'bottom', colSpan),
        lastRange: null,
        rafId: 0,
        latestArgs: null
      };
      if (_windowStates) _windowStates.set(container, state);

      var onScroll = function () {
        if (state.rafId) return;
        var raf = typeof requestAnimationFrame === 'function'
          ? requestAnimationFrame
          : function (fn) { return setTimeout(fn, 16); };
        state.rafId = raf(function () {
          state.rafId = 0;
          if (!container.isConnected || !state.latestArgs) return;
          _paintWindow(state.latestArgs);
        });
      };
      state.onScroll = onScroll;
      if (state.scrollEl && state.scrollEl.addEventListener) {
        state.scrollEl.addEventListener('scroll', onScroll, { passive: true });
      }
    }

    state.latestArgs = {
      container: container,
      list: list,
      getKey: getKey,
      createEl: createEl,
      updateEl: updateEl,
      rowHeight: rowHeight,
      overscan: overscan,
      colSpan: colSpan,
      isTable: isTable,
      state: state
    };

    _paintWindow(state.latestArgs, true);
  }

  function _paintWindow(ctx, force) {
    var container = ctx.container;
    var state = ctx.state;
    var scrollEl = state.scrollEl;
    var scrollOffset = 0;
    var viewportHeight = 600;

    if (scrollEl && scrollEl !== window) {
      scrollOffset = Math.max(0, scrollEl.scrollTop - (container.offsetTop || 0));
      viewportHeight = scrollEl.clientHeight || 600;
    } else if (typeof window !== 'undefined') {
      var rect = container.getBoundingClientRect ? container.getBoundingClientRect() : null;
      scrollOffset = rect ? Math.max(0, -rect.top) : 0;
      viewportHeight = window.innerHeight || 600;
    }

    var range = computeWindowRange(ctx.list.length, scrollOffset, viewportHeight, ctx.rowHeight, ctx.overscan);
    if (!force && state.lastRange && state.lastRange.start === range.start && state.lastRange.end === range.end) {
      return;
    }
    state.lastRange = range;

    // Detach spacers temporarily so patchListByKey only diffs real keyed items
    if (state.topSpacer.parentNode === container) container.removeChild(state.topSpacer);
    if (state.bottomSpacer.parentNode === container) container.removeChild(state.bottomSpacer);

    var slice = ctx.list.slice(range.start, range.end);
    patchListByKey(container, slice, function (item, localIdx) {
      return ctx.getKey(item, range.start + localIdx);
    }, function (item, localIdx) {
      return ctx.createEl(item, range.start + localIdx);
    }, function (node, item, localIdx) {
      if (typeof ctx.updateEl === 'function') {
        ctx.updateEl(node, item, range.start + localIdx);
      }
    });

    if (ctx.isTable && state.topSpacer.firstChild) {
      state.topSpacer.firstChild.colSpan = Math.max(1, ctx.colSpan || 1);
      state.bottomSpacer.firstChild.colSpan = Math.max(1, ctx.colSpan || 1);
    }
    _setSpacerHeight(state.topSpacer, ctx.isTable, range.topHeight);
    _setSpacerHeight(state.bottomSpacer, ctx.isTable, range.bottomHeight);

    container.insertBefore(state.topSpacer, container.firstChild || null);
    container.appendChild(state.bottomSpacer);
  }

  var api = {
    setText: setText,
    setClass: setClass,
    setAttr: setAttr,
    patchListByKey: patchListByKey,
    computeWindowRange: computeWindowRange,
    renderWindowedRows: renderWindowedRows
  };

  if (typeof window !== 'undefined') {
    window.DomSync = api;
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})();
