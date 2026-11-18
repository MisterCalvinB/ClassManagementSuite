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

  var api = {
    setText: setText,
    setClass: setClass,
    setAttr: setAttr,
    patchListByKey: patchListByKey
  };

  if (typeof window !== 'undefined') {
    window.DomSync = api;
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})();
