/**
 * js/bookmarks-service.js - Central Bookmarks & Web Links Repository
 * Class Management Tools (CMT)
 *
 * Provides persistent storage for user web bookmarks, Netscape HTML bookmark import/export,
 * tag querying, and automatic registration in the CMT LinksService graph.
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BookmarksService = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var STORAGE_KEY = 'cmt_bookmarks_registry';
  var FILE_TARGET = 'user';
  var FILE_NAME = 'bookmarks.json';
  var SYNC_CHANNEL = 'cmt-bookmarks-sync';

  var _bookmarksCache = null;
  var _loadPromise = null;
  var _channel = null;

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      _channel = new BroadcastChannel(SYNC_CHANNEL);
      _channel.onmessage = function (ev) {
        if (ev && ev.data) {
          _bookmarksCache = null;
          if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('cmt-bookmarks-changed', { detail: ev.data }));
          }
        }
      };
    } catch (_) {}
  }

  function _getDesktop() {
    return (typeof window !== 'undefined' && window.Desktop) ? window.Desktop : null;
  }

  function _extractDomain(urlStr) {
    if (!urlStr || typeof urlStr !== 'string') return '';
    try {
      var parsed = new URL(urlStr);
      return parsed.hostname.replace(/^www\./i, '');
    } catch (_) {
      var match = urlStr.match(/^(?:https?:\/\/)?(?:www\.)?([^\/\s?#]+)/i);
      return match ? match[1] : '';
    }
  }

  function _normalizeTags(tags) {
    if (!tags) return [];
    var list = Array.isArray(tags) ? tags : String(tags).split(/[,\s]+/);
    var seen = new Set();
    var out = [];
    list.forEach(function (t) {
      if (!t) return;
      var clean = String(t).trim();
      if (!clean) return;
      if (!clean.startsWith('#')) clean = '#' + clean;
      clean = clean.toLowerCase();
      if (!seen.has(clean)) {
        seen.add(clean);
        out.push(clean);
      }
    });
    return out;
  }

  function _generateId() {
    return 'bm_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
  }

  async function loadBookmarks(forceReload) {
    if (_bookmarksCache && !forceReload) return _bookmarksCache;
    if (_loadPromise && !forceReload) return _loadPromise;

    _loadPromise = (async function () {
      var dt = _getDesktop();
      var data = null;

      if (dt && typeof dt.readJson === 'function') {
        try {
          var res = await dt.readJson(FILE_TARGET, FILE_NAME);
          if (res && res.ok && Array.isArray(res.data)) {
            data = res.data;
          } else if (res && Array.isArray(res)) {
            data = res;
          }
        } catch (_) {}
      }

      if (!data && typeof localStorage !== 'undefined') {
        try {
          var raw = localStorage.getItem(STORAGE_KEY);
          if (raw) data = JSON.parse(raw);
        } catch (_) {}
      }

      if (!Array.isArray(data)) {
        data = [];
      }

      _bookmarksCache = data;
      _loadPromise = null;
      return _bookmarksCache;
    })();

    return _loadPromise;
  }

  async function saveBookmarks(items) {
    if (!Array.isArray(items)) return false;
    _bookmarksCache = items;

    var dt = _getDesktop();
    var ok = false;

    if (dt && typeof dt.saveJson === 'function') {
      try {
        var res = await dt.saveJson(FILE_TARGET, FILE_NAME, items);
        ok = !!(res && (res.ok || res.success));
      } catch (e) {
        console.warn('[BookmarksService] Failed to save bookmarks to user/bookmarks.json:', e);
      }
    }

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        ok = true;
      } catch (_) {}
    }

    if (_channel) {
      try {
        _channel.postMessage({ timestamp: Date.now(), count: items.length });
      } catch (_) {}
    }

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('cmt-bookmarks-changed', { detail: { count: items.length } }));
    }

    return ok;
  }

  async function getAll() {
    return await loadBookmarks();
  }

  async function get(id) {
    var all = await getAll();
    return all.find(function (b) { return b && b.id === id; }) || null;
  }

  async function add(bookmarkData) {
    if (!bookmarkData || !bookmarkData.url) return null;
    var all = await getAll();

    var rawUrl = String(bookmarkData.url).trim();
    if (!/^https?:\/\//i.test(rawUrl) && !/^about:/i.test(rawUrl)) {
      rawUrl = 'https://' + rawUrl;
    }

    var domain = bookmarkData.domain || _extractDomain(rawUrl);
    var title = bookmarkData.title ? String(bookmarkData.title).trim() : (domain || rawUrl);
    var tags = _normalizeTags(bookmarkData.tags);
    var id = bookmarkData.id || _generateId();

    var item = {
      id: id,
      url: rawUrl,
      title: title,
      domain: domain,
      tags: tags,
      notes: bookmarkData.notes ? String(bookmarkData.notes).trim() : '',
      starred: !!bookmarkData.starred,
      createdAt: bookmarkData.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    // Replace if same ID exists, otherwise prepend
    var idx = all.findIndex(function (b) { return b && b.id === id; });
    if (idx !== -1) {
      all[idx] = item;
    } else {
      all.unshift(item);
    }

    await saveBookmarks(all);

    // Auto-register in LinksService if available
    if (typeof window !== 'undefined' && window.LinksService && typeof window.LinksService.registerUrn === 'function') {
      try {
        window.LinksService.registerUrn('cmt:bookmark:' + item.id, {
          title: item.title,
          type: 'bookmark',
          url: item.url,
          tags: item.tags
        });
      } catch (_) {}
    }

    return item;
  }

  async function update(id, updates) {
    if (!id || !updates) return null;
    var all = await getAll();
    var idx = all.findIndex(function (b) { return b && b.id === id; });
    if (idx === -1) return null;

    var cur = all[idx];
    if (updates.url !== undefined) {
      cur.url = String(updates.url).trim();
      if (!/^https?:\/\//i.test(cur.url) && !/^about:/i.test(cur.url)) cur.url = 'https://' + cur.url;
      cur.domain = _extractDomain(cur.url);
    }
    if (updates.title !== undefined) cur.title = String(updates.title).trim();
    if (updates.domain !== undefined) cur.domain = String(updates.domain).trim();
    if (updates.tags !== undefined) cur.tags = _normalizeTags(updates.tags);
    if (updates.notes !== undefined) cur.notes = String(updates.notes).trim();
    if (updates.starred !== undefined) cur.starred = !!updates.starred;
    cur.updatedAt = Date.now();

    all[idx] = cur;
    await saveBookmarks(all);
    return cur;
  }

  async function remove(id) {
    if (!id) return false;
    var all = await getAll();
    var filtered = all.filter(function (b) { return b && b.id !== id; });
    if (filtered.length === all.length) return false;
    await saveBookmarks(filtered);
    return true;
  }

  async function search(query, tag) {
    var all = await getAll();
    var q = query ? String(query).trim().toLowerCase() : '';
    var filterTag = tag ? String(tag).trim().toLowerCase() : '';
    if (filterTag && !filterTag.startsWith('#')) filterTag = '#' + filterTag;

    return all.filter(function (b) {
      if (!b) return false;
      if (filterTag && (!Array.isArray(b.tags) || !b.tags.includes(filterTag))) return false;
      if (q) {
        var matchTitle = b.title && b.title.toLowerCase().includes(q);
        var matchUrl = b.url && b.url.toLowerCase().includes(q);
        var matchDomain = b.domain && b.domain.toLowerCase().includes(q);
        var matchNotes = b.notes && b.notes.toLowerCase().includes(q);
        var matchTags = Array.isArray(b.tags) && b.tags.some(function (t) { return t.toLowerCase().includes(q); });
        return matchTitle || matchUrl || matchDomain || matchNotes || matchTags;
      }
      return true;
    });
  }

  /**
   * Parses standard Netscape Bookmark HTML file exported from Chrome, Firefox, Edge, Safari.
   * Format: <DT><A HREF="url" ADD_DATE="..." TAGS="...">Title</A>
   */
  function parseNetscapeHtml(htmlString) {
    if (!htmlString || typeof htmlString !== 'string') return [];
    var items = [];

    try {
      var parser = new DOMParser();
      var doc = parser.parseFromString(htmlString, 'text/html');
      var links = doc.querySelectorAll('a[href]');

      links.forEach(function (a) {
        var href = a.getAttribute('href');
        if (!href || (!href.startsWith('http://') && !href.startsWith('https://'))) return;

        var title = (a.textContent || '').trim() || href;
        var tagsRaw = a.getAttribute('tags') || '';
        var tags = _normalizeTags(tagsRaw);

        // Find enclosing folder name if available
        var parentH3 = null;
        var cur = a.parentElement;
        while (cur && cur !== doc.body) {
          if (cur.tagName === 'DL') {
            var prev = cur.previousElementSibling;
            if (prev && prev.tagName === 'H3') {
              parentH3 = prev.textContent.trim();
              break;
            } else if (prev && prev.querySelector('h3')) {
              parentH3 = prev.querySelector('h3').textContent.trim();
              break;
            }
          }
          cur = cur.parentElement;
        }

        if (parentH3 && parentH3.length < 30) {
          var folderTag = '#' + parentH3.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
          if (!tags.includes(folderTag)) tags.push(folderTag);
        }

        items.push({
          url: href,
          title: title,
          domain: _extractDomain(href),
          tags: tags,
          notes: ''
        });
      });
    } catch (e) {
      console.warn('[BookmarksService] HTML bookmark parsing error:', e);
    }

    return items;
  }

  async function importFromHtml(htmlString) {
    var parsed = parseNetscapeHtml(htmlString);
    if (!parsed.length) return { added: 0, duplicates: 0, total: 0 };

    var all = await getAll();
    var existingUrls = new Set(all.map(function (b) { return (b.url || '').toLowerCase(); }));
    var addedCount = 0;
    var duplicateCount = 0;

    for (var i = 0; i < parsed.length; i++) {
      var item = parsed[i];
      var lower = item.url.toLowerCase();
      if (existingUrls.has(lower)) {
        duplicateCount++;
        continue;
      }
      existingUrls.add(lower);
      var newBm = {
        id: _generateId(),
        url: item.url,
        title: item.title,
        domain: item.domain,
        tags: item.tags,
        notes: item.notes || '',
        starred: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      all.push(newBm);
      addedCount++;
    }

    if (addedCount > 0) {
      await saveBookmarks(all);
    }

    return { added: addedCount, duplicates: duplicateCount, total: all.length };
  }

  function exportToHtml(items) {
    var list = Array.isArray(items) ? items : (_bookmarksCache || []);
    var html = '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n' +
      '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n' +
      '<TITLE>Class Management Tools Bookmarks</TITLE>\n' +
      '<H1>Bookmarks</H1>\n' +
      '<DL><p>\n';

    list.forEach(function (bm) {
      if (!bm || !bm.url) return;
      var tagsAttr = (Array.isArray(bm.tags) && bm.tags.length) ? ' TAGS="' + bm.tags.join(',').replace(/"/g, '&quot;') + '"' : '';
      var escTitle = (bm.title || bm.url).replace(/</g, '&lt;').replace(/>/g, '&gt;');
      html += '    <DT><A HREF="' + bm.url.replace(/"/g, '&quot;') + '"' + tagsAttr + '>' + escTitle + '</A>\n';
    });

    html += '</DL><p>\n';
    return html;
  }

  return {
    init: loadBookmarks,
    getAll: getAll,
    get: get,
    add: add,
    update: update,
    delete: remove,
    search: search,
    parseNetscapeHtml: parseNetscapeHtml,
    importFromHtml: importFromHtml,
    exportToHtml: exportToHtml
  };
});
