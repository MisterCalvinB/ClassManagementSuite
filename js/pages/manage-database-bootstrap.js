    (function () {
      function injectClassicScript(source, name) {
        var s = document.createElement('script');
        s.text = String(source || '') + '\n//# sourceURL=' + name;
        document.head.appendChild(s);
        if (s.parentNode) s.parentNode.removeChild(s);
      }
      function loadScriptBySrc(src) {
        return new Promise(function (resolve, reject) {
          var s = document.createElement('script');
          s.src = src;
          s.onload = function () { resolve(true); };
          s.onerror = function () { reject(new Error('Failed to load ' + src)); };
          document.head.appendChild(s);
        });
      }
      async function loadUserScript(relPath) {
        if (window.Desktop && Desktop.isElectron() && typeof Desktop.readText === 'function') {
          var result = await Desktop.readText('user', relPath);
          if (!result || !result.ok) throw new Error((result && result.error) || ('Missing user/' + relPath));
          injectClassicScript(result.content || '', 'user/' + relPath);
          return;
        }
        await loadScriptBySrc('user/' + relPath);
      }
      window.__mdbBootstrapPromise = (async function () {
        try { await loadUserScript('config.js'); } catch (e) { console.warn('manage-database: Failed to load user/config.js:', e); }
      })();
    })();

    (function () {
      document.addEventListener('DOMContentLoaded', function () {
        Promise.resolve(window.__mdbBootstrapPromise).catch(function () { }).then(function () {
          window._cmtApplyNavBrand();
        });
      });
    })();
