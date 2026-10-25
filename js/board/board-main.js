/**
 * Class Management Tools — Board Main Orchestrator & Lifecycle Coordinator
 * Initializes board UI, coordinates hamburger menu, sync menu, credits dialog, and cross-window events.
 */
(function (global) {
  'use strict';
  var Board = global.Board = global.Board || {};

    function toggleSaveSyncMenu() {
      const menu = document.getElementById('save-sync-menu');
      if (!menu) return;
      const isOpen = menu.classList.contains('open');
      menu.classList.toggle('open', !isOpen);
      if (!isOpen) {
        // Disable Sync button if no sync location is configured
        const syncBtn = document.getElementById('ssm-sync-btn');
        if (syncBtn && Desktop.isElectron() && window.electronApi && window.electronApi.getSyncLocation) {
          window.electronApi.getSyncLocation().then(res => {
            syncBtn.disabled = !(res && res.ok && res.syncLocation);
            syncBtn.title = (res && res.ok && res.syncLocation)
              ? 'Sync with: ' + res.syncLocation
              : 'No sync location configured — set one in ⚙️ Data';
          }).catch(() => { syncBtn.disabled = true; });
        }

        // Update Pin button
        const pinBtn = document.getElementById('ssm-pin-btn');
        const pinDiv = document.getElementById('ssm-pin-divider');
        const curFileName = global._conCurrentFileName;
        const curFolderName = global._conCurrentFolderName;
        if (pinBtn && curFileName) {
          if (pinDiv) pinDiv.style.display = '';
          pinBtn.style.display = '';
          const relPath = curFolderName ? (curFolderName + '/' + curFileName) : curFileName;
          Pins.isPinned({
            type: 'mindmap',
            relativePath: relPath,
            target: 'mindmaps'
          }).then(pinned => {
            pinBtn.textContent = pinned ? '📌 Unpin Map' : '📌 Pin Map';
          });
        } else if (pinBtn) {
          if (pinDiv) pinDiv.style.display = 'none';
          pinBtn.style.display = 'none';
        }
      }
    }

    async function boardTogglePin() {
      if (!_conCurrentFileName) return;
      const relPath = _conCurrentFolderName ? (_conCurrentFolderName + '/' + _conCurrentFileName) : _conCurrentFileName;
      const itemInfo = {
        type: 'mindmap',
        relativePath: relPath,
        target: 'mindmaps'
      };
      const isPinned = await Pins.isPinned(itemInfo);
      if (isPinned) {
        await Pins.unpinItem(itemInfo);
        mdbToast('📌 Unpinned from sidebar');
      } else {
        const prettyName = boardStripJsonExt(_conCurrentFileName);
        await Pins.pinItem(Object.assign({ title: prettyName }, itemInfo));
        mdbToast('📌 Pinned to sidebar');
      }
    }

    function closeSaveSyncMenu() {
      const menu = document.getElementById('save-sync-menu');
      if (menu) menu.classList.remove('open');
    }

    document.addEventListener('click', e => {
      const wrap = document.getElementById('save-sync-wrap');
      if (wrap && !wrap.contains(e.target)) closeSaveSyncMenu();
    }, true);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeSaveSyncMenu();
    });

    async function downloadData() {
      if (!Desktop.isElectron()) {
        mdbToast('⚠️ Save as Zip is only available in the desktop app.');
        return;
      }
      const btn = document.getElementById('save-sync-btn');
      const origText = btn.textContent;
      btn.disabled = true;
      btn.textContent = '⏳ Saving…';
      try {
        const result = await Desktop.backupZip();
        if (!result) { btn.textContent = origText; btn.disabled = false; return; }
        if (result.canceled) { btn.textContent = origText; btn.disabled = false; return; }
        if (result.ok) {
          mdbToast('✓ Zip saved!');
        } else {
          mdbToast('⚠️ Save failed: ' + (result.error || 'Unknown error'));
        }
        btn.textContent = origText;
        btn.disabled = false;
      } catch (err) {
        mdbToast('⚠️ Save error: ' + (err && err.message ? err.message : err));
        btn.textContent = origText;
        btn.disabled = false;
      }
    }

    async function uploadData() {
      if (!Desktop.isElectron()) {
        mdbToast('⚠️ Load from Zip is only available in the desktop app.');
        return;
      }
      const btn = document.getElementById('save-sync-btn');
      const origText = btn.textContent;
      btn.disabled = true;
      btn.textContent = '⏳ Reading…';
      try {
        const result = await Desktop.restoreZip();
        if (!result) { btn.textContent = origText; btn.disabled = false; return; }
        if (result.canceled) {
          btn.textContent = origText;
          btn.disabled = false;
          return;
        }
        if (!result.ok) {
          mdbToast('⚠️ Load failed: ' + (result.error || 'Unknown error'));
          btn.textContent = origText;
          btn.disabled = false;
          return;
        }

        // If there are conflicts, show the modal
        if (result.conflicts && result.conflicts.length > 0) {
          showRestoreConflictModal(result.conflicts, result.zipPath);
        } else {
          // No conflicts, apply restore directly
          await applyRestoreChoices(result.zipPath, []);
        }

        btn.textContent = origText;
        btn.disabled = false;
      } catch (err) {
        mdbToast('⚠️ Load error: ' + (err && err.message ? err.message : err));
        btn.textContent = origText;
        btn.disabled = false;
      }
    }

    async function syncData() {
      if (!Desktop.isElectron() || !window.electronApi || !window.electronApi.runSync) {
        mdbToast('⚠️ Sync is only available in the desktop app.');
        return;
      }
      const locRes = await window.electronApi.getSyncLocation().catch(() => null);
      if (!locRes || !locRes.ok || !locRes.syncLocation) {
        mdbToast('⚠️ No sync location configured — set one in ⚙️ Data.');
        return;
      }
      const btn = document.getElementById('save-sync-btn');
      const origText = btn.textContent;
      btn.disabled = true;
      btn.textContent = '⏳ Syncing…';
      try {
        const res = await window.electronApi.runSync({ mode: 'both' });
        if (!res || !res.ok) {
          mdbToast('⚠️ Sync failed: ' + (res && res.error ? res.error : 'Unknown error'));
          btn.textContent = origText; btn.disabled = false;
          return;
        }
        if (res.conflicts && res.conflicts.length > 0) {
          mdbToast('⚠️ Sync has ' + res.conflicts.length + ' conflict(s). Resolve them in ⚙️ Data.');
        } else {
          mdbToast('✓ Sync complete — ' + (res.copied || 0) + ' file(s) updated.');
        }
        btn.textContent = origText; btn.disabled = false;
      } catch (err) {
        mdbToast('⚠️ Sync error: ' + (err && err.message ? err.message : err));
        btn.textContent = origText; btn.disabled = false;
      }
    }

    function showRestoreConflictModal(conflicts, zipPath) {
      const modal = document.createElement('div');
      modal.id = 'restore-conflict-overlay';
      modal.onclick = (e) => { if (e.target === modal) closeRestoreConflictModal(); };

      let conflictsHtml = '';
      for (const conflict of conflicts) {
        conflictsHtml += `
            <div class="conflict-item">
              <div class="conflict-path"><strong>${conflict.path}</strong></div>
              <div class="conflict-options">
                <label><input type="radio" name="choice-${conflict.id}" value="skip" checked> Skip</label>
                <label><input type="radio" name="choice-${conflict.id}" value="overwrite"> Overwrite</label>
                <label><input type="radio" name="choice-${conflict.id}" value="rename"> Rename (backup)</label>
              </div>
            </div>
          `;
      }

      modal.innerHTML = `
          <div id="restore-conflict-modal">
            <h3>
              <span>⚠️ File Conflicts Detected</span>
              <button onclick="document.getElementById('restore-conflict-overlay').remove()">✕</button>
            </h3>
            <div id="restore-conflict-body">
              <p>Some files already exist. Choose what to do for each:</p>
              <div id="conflicts-list">
                ${conflictsHtml}
              </div>
            </div>
            <div id="restore-conflict-footer">
              <button class="action-btn btn-grey" onclick="document.getElementById('restore-conflict-overlay').remove()">Cancel</button>
              <button class="action-btn" id="restore-conflict-apply-btn">Restore</button>
            </div>
          </div>
        `;

      document.body.appendChild(modal);

      const applyBtn = modal.querySelector('#restore-conflict-apply-btn');
      if (applyBtn) {
        applyBtn.addEventListener('click', () => {
          const selectedChoices = Array.from(
            document.querySelectorAll('#conflicts-list input[type=radio]:checked')
          ).map((r) => ({
            id: r.name.replace('choice-', ''),
            choice: r.value
          }));
          applyRestoreChoices(String(zipPath || ''), selectedChoices);
        });
      }
    }

    async function applyRestoreChoices(zipPath, choices) {
      const choiceMap = {};
      for (const c of choices) {
        choiceMap[c.id] = c.choice;
      }

      const btn = document.querySelector('.action-btn');
      const origText = btn.textContent;
      btn.disabled = true;
      btn.textContent = '⏳ Restoring…';

      try {
        const result = await Desktop.applyRestoreChoices({ zipPath, choices: choiceMap });
        if (result && result.ok) {
          mdbToast('✓ Data restored successfully! ' + (result.restored || 0) + ' files restored.');
          document.getElementById('restore-conflict-overlay')?.remove();
          setTimeout(() => { location.reload(); }, 1500);
        } else {
          mdbToast('⚠️ Restore failed: ' + (result?.error || 'Unknown error'));
          btn.textContent = origText;
          btn.disabled = false;
        }
      } catch (err) {
        mdbToast('⚠️ Restore error: ' + (err && err.message ? err.message : err));
        btn.textContent = origText;
        btn.disabled = false;
      }
    }
    function closeRestoreConflictModal() {
      var o = document.getElementById('restore-conflict-overlay');
      if (o) o.remove();
    }
    function openCreditsModal() { var o = document.getElementById('credits-overlay'); if (o) o.style.display = 'flex'; }
    function closeCreditsModal() { var o = document.getElementById('credits-overlay'); if (o) o.style.display = 'none'; }
    (function () {
      if (!window.Desktop || typeof Desktop.onDataChanged !== 'function') return;
      Desktop.onDataChanged(function (data) {
        if (data && data.filename === 'class-groups.js') {
          if (typeof window.initClassGroupSelector === 'function') window.initClassGroupSelector();
          if (typeof showDataChangedBanner === 'function') showDataChangedBanner(data);
          else if (typeof window.showDataChangedBanner === 'function') window.showDataChangedBanner(data);
        }
      });
    })();

  // --- Coordinated Lifecycle Bootstrapper ---
  document.addEventListener("DOMContentLoaded", function () {
    if (typeof initHamburger === "function") initHamburger();
    if (typeof initBoardCustomiseCollapsible === "function") {
      initBoardCustomiseCollapsible();
    }
    if (typeof window.initBoardCloseUnsavedGuard === "function") {
      window.initBoardCloseUnsavedGuard();
    } else if (typeof global.initBoardCloseUnsavedGuard === "function") {
      global.initBoardCloseUnsavedGuard();
    }
    if (typeof window.conUpdatePageBar === "function") {
      window.conUpdatePageBar();
    }
    Promise.resolve(global.__boardUserBootstrapPromise)
      .catch(function () { })
      .then(function () {
        if (typeof global._cmtApplyNavBrand === "function") global._cmtApplyNavBrand();
        if (typeof global.boardInitCmsTimerMirror === "function") global.boardInitCmsTimerMirror();
        if (typeof window.conUpdatePageBar === "function") window.conUpdatePageBar();
        if (typeof window.initClassGroupSelector === "function") window.initClassGroupSelector();
      });
  });

  Board.main = Board.main || {};

  // Backward compatibility exports for HTML attributes & cross-module calls
  window.toggleSaveSyncMenu = global.toggleSaveSyncMenu = toggleSaveSyncMenu;
  window.boardTogglePin = global.boardTogglePin = boardTogglePin;
  window.closeSaveSyncMenu = global.closeSaveSyncMenu = closeSaveSyncMenu;
  window.downloadData = global.downloadData = downloadData;
  window.uploadData = global.uploadData = uploadData;
  window.syncData = global.syncData = syncData;
  window.closeCreditsModal = global.closeCreditsModal = closeCreditsModal;
  window.closeRestoreConflictModal = global.closeRestoreConflictModal = closeRestoreConflictModal;

})(typeof window !== "undefined" ? window : this);