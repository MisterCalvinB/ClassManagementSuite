// js/pins.js - Shared pinned items management library
(function() {
  const STORAGE_KEY = 'cmt-pinned-items';
  const FILE_TARGET = 'user';
  const FILE_NAME = 'pinned-items.json';

  async function getPins() {
    let pins = [];
    // 1. Try local storage first as local cache
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) pins = JSON.parse(raw);
    } catch (e) {}

    // 2. In Electron, try reading from the shared file
    if (window.Desktop && typeof Desktop.readJson === 'function') {
      try {
        const res = await Desktop.readJson(FILE_TARGET, FILE_NAME);
        if (res && res.ok && Array.isArray(res.data)) {
          pins = res.data;
          // Synchronize local storage cache
          localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
        }
      } catch (e) {
        console.warn('pins: could not read pinned-items.json:', e);
      }
    }
    return pins;
  }

  async function savePins(pins) {
    if (!Array.isArray(pins)) return false;
    
    // Update local storage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
    } catch (e) {}

    // In Electron, save to the shared file
    if (window.Desktop && typeof Desktop.saveJson === 'function') {
      try {
        const res = await Desktop.saveJson(FILE_TARGET, FILE_NAME, pins);
        return !!(res && res.ok);
      } catch (e) {
        console.error('pins: could not write pinned-items.json:', e);
        return false;
      }
    }
    return true;
  }

  async function pinItem(item) {
    if (!item || !item.type || !item.title) return false;
    const pins = await getPins();
    // Check for duplicates
    const exists = pins.some(p => 
      p.type === item.type && 
      (p.relativePath === item.relativePath || (p.relativePath === undefined && item.relativePath === undefined)) && 
      (p.id === item.id || (p.id === undefined && item.id === undefined)) && 
      (p.classId === item.classId || (p.classId === undefined && item.classId === undefined)) && 
      (p.planId === item.planId || (p.planId === undefined && item.planId === undefined))
    );
    if (exists) return true;

    pins.push(item);
    return await savePins(pins);
  }

  async function unpinItem(itemMatch) {
    if (!itemMatch) return false;
    const pins = await getPins();
    const filtered = pins.filter(p => {
      const typeMatch = p.type === itemMatch.type;
      let pathMatch = true;
      if (itemMatch.relativePath !== undefined) {
        pathMatch = p.relativePath === itemMatch.relativePath;
      }
      let classMatch = true;
      if (itemMatch.classId !== undefined) {
        classMatch = p.classId === itemMatch.classId;
      }
      let planMatch = true;
      if (itemMatch.planId !== undefined) {
        planMatch = p.planId === itemMatch.planId;
      }
      let idMatch = true;
      if (itemMatch.id !== undefined) {
        idMatch = p.id === itemMatch.id;
      }
      return !(typeMatch && pathMatch && classMatch && planMatch && idMatch);
    });
    
    if (filtered.length === pins.length) return true; // nothing changed
    return await savePins(filtered);
  }

  async function isPinned(itemMatch) {
    if (!itemMatch) return false;
    const pins = await getPins();
    return pins.some(p => {
      const typeMatch = p.type === itemMatch.type;
      let pathMatch = true;
      if (itemMatch.relativePath !== undefined) {
        pathMatch = p.relativePath === itemMatch.relativePath;
      }
      let classMatch = true;
      if (itemMatch.classId !== undefined) {
        classMatch = p.classId === itemMatch.classId;
      }
      let planMatch = true;
      if (itemMatch.planId !== undefined) {
        planMatch = p.planId === itemMatch.planId;
      }
      let idMatch = true;
      if (itemMatch.id !== undefined) {
        idMatch = p.id === itemMatch.id;
      }
      return typeMatch && pathMatch && classMatch && planMatch && idMatch;
    });
  }

  // Expose to window
  window.Pins = {
    getPins,
    savePins,
    pinItem,
    unpinItem,
    isPinned
  };
})();
