    (function () {
      function injectScript(src, name) {
        var s = document.createElement('script');
        s.text = String(src || '') + '\n//# sourceURL=' + (name || 'injected');
        document.head.appendChild(s); document.head.removeChild(s);
      }
      window.__plannerBoot = (async function () {
        if (!window.Desktop || !Desktop.isElectron()) return;
        window.__plannerKnownClassFiles = window.__plannerKnownClassFiles || {};
        window.PLANNER_ENTRIES_BY_CLASS = window.PLANNER_ENTRIES_BY_CLASS || {};

        var pClassGroups = Desktop.readText('user', 'class-groups.js').catch(function () { return null; });
        var pPlannerConfig = Desktop.readText('user', 'planner-config.js').catch(function () { return null; });
        var pTodos = Desktop.readText('user', 'todos.js').catch(function () { return null; });
        var pStudents = Desktop.readText('user', 'students.js').catch(function () { return null; });
        var pAdmin = Desktop.readText('user', 'administrative-groups.json').catch(function () { return null; });
        var pSubCache = Desktop.readByPath('user', 'planner/subscription-cache.json').catch(function () { return null; });
        var pListPlanner = Desktop.listByPath('user', 'planner', { recursive: false, extensions: ['.js'] }).catch(function () { return null; });

        var res = await Promise.all([pClassGroups, pPlannerConfig, pTodos, pStudents, pAdmin, pSubCache, pListPlanner]);
        var rGroups = res[0], rCfg = res[1], rTodos = res[2], rStudents = res[3], rAdmin = res[4], rSub = res[5], _lr = res[6];

        if (rGroups && rGroups.ok && rGroups.content) {
          injectScript(rGroups.content, 'user/class-groups.js');
          try {
            var _cgFn = new Function(rGroups.content + '\nreturn { data: (typeof CLASS_GROUPS_DATA !== "undefined" ? CLASS_GROUPS_DATA : null), meta: (typeof CLASS_GROUPS_META !== "undefined" ? CLASS_GROUPS_META : null), groups: (typeof CLASS_GROUPS !== "undefined" ? CLASS_GROUPS : null) };');
            var _cgParsed = _cgFn();
            if (_cgParsed) {
              if (_cgParsed.data) window.CLASS_GROUPS_DATA = _cgParsed.data;
              if (_cgParsed.meta) window.CLASS_GROUPS_META = _cgParsed.meta;
              if (_cgParsed.groups) window.CLASS_GROUPS = _cgParsed.groups;
            }
          } catch (_) { }
        }
        if (rCfg && rCfg.ok && rCfg.content) injectScript(rCfg.content, 'user/planner-config.js');
        if (rTodos && rTodos.ok && rTodos.content) injectScript(rTodos.content, 'user/todos.js');
        if (rStudents && rStudents.ok && rStudents.content) injectScript(rStudents.content, 'user/students.js');
        if (rAdmin && rAdmin.ok && rAdmin.content) {
          try { window.ADMINISTRATIVE_DATA = JSON.parse(rAdmin.content); } catch (_) { }
        }
        if (rSub && rSub.ok && rSub.content) {
          try { window.PLANNER_SUBSCRIPTION_CACHE = JSON.parse(rSub.content); } catch (_) { }
        }

        if (_lr && _lr.ok && Array.isArray(_lr.files) && _lr.files.length) {
          var classFileTasks = _lr.files.map(async function (f) {
            var _rp = String((f && f.relativePath) || '');
            var _base = _rp.split('/').pop() || '';
            if (/\.js$/i.test(_base)) {
              var _cid = _base.replace(/\.js$/i, '');
              if (_cid === '__unassigned') _cid = '';
              window.__plannerKnownClassFiles[_cid] = true;
            }
            var r = await Desktop.readByPath('user', _rp);
            if (r && r.ok && r.content) injectScript(r.content, 'user/' + _rp);
          });
          await Promise.all(classFileTasks);
        }

        var _hasClassFiles = Object.keys(window.PLANNER_ENTRIES_BY_CLASS).some(function (k) { return k !== ''; });
        if (!_hasClassFiles) {
          try {
            var rLegacy = await Desktop.readText('user', 'planner-entries.js');
            if (rLegacy && rLegacy.ok && rLegacy.content) injectScript(rLegacy.content, 'user/planner-entries.js');
          } catch (_) { }
        }
      })();
    })();
