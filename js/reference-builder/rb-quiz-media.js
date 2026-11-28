/**
 * js/reference-builder/rb-quiz-media.js
 * Media (picture/video) picker, inline quiz helpers, and CMT Quiz Bank importer.
 */
(function (root) {
  'use strict';

  function createEmptyQuestion(kind) {
    var k = kind || 'mcq';
    var id = (root.RbStore && typeof root.RbStore.uuid === 'function')
      ? root.RbStore.uuid()
      : ('q-' + Date.now().toString(36));
    if (k === 'tf') {
      return {
        id: id,
        kind: 'tf',
        prompt: '',
        options: ['True', 'False'],
        correctIndex: 0,
        answerText: '',
        explanation: ''
      };
    }
    if (k === 'short') {
      return {
        id: id,
        kind: 'short',
        prompt: '',
        options: [],
        correctIndex: 0,
        answerText: '',
        explanation: ''
      };
    }
    return {
      id: id,
      kind: 'mcq',
      prompt: '',
      options: ['Option A', 'Option B', 'Option C'],
      correctIndex: 0,
      answerText: '',
      explanation: ''
    };
  }

  function pickAndImportMedia(manualId, mediaKind) {
    return new Promise(function (resolve) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = mediaKind === 'video'
        ? 'video/mp4,video/webm,video/ogg,.mp4,.webm,.ogv'
        : 'image/png,image/jpeg,image/webp,image/svg+xml,image/gif,.png,.jpg,.jpeg,.webp,.svg';
      input.onchange = function () {
        var file = input.files && input.files[0];
        if (!file) { resolve(null); return; }
        var reader = new FileReader();
        reader.onload = async function () {
          var dataUrl = String(reader.result || '');
          if (root.RbStore && typeof root.RbStore.saveMediaBlob === 'function') {
            var saved = await root.RbStore.saveMediaBlob(manualId || 'shared', file.name, dataUrl, file.type);
            resolve({
              src: saved.dataUrl || dataUrl,
              dataUrl: saved.dataUrl || dataUrl,
              relPath: saved.relPath || '',
              fileName: file.name,
              width: '100%'
            });
          } else {
            resolve({
              src: dataUrl,
              dataUrl: dataUrl,
              relPath: '',
              fileName: file.name,
              width: '100%'
            });
          }
        };
        reader.onerror = function () { resolve(null); };
        reader.readAsDataURL(file);
      };
      input.click();
    });
  }

  async function listCmtQuizBanks() {
    try {
      var api = root.electronApi;
      var desktop = root.Desktop;
      var res = null;
      if (desktop && typeof desktop.listFiles === 'function') {
        res = await desktop.listFiles('customQuizzes');
      } else if (api && typeof api.listByPath === 'function') {
        res = await api.listByPath({ target: 'customQuizzes' });
      }
      var files = Array.isArray(res) ? res : (res && Array.isArray(res.files) ? res.files : []);
      return files.map(function (f) {
        return typeof f === 'string' ? f : (f && (f.relativePath || f.name || f.filename));
      }).filter(function (n) {
        return n && /\.(json|js)$/i.test(n);
      });
    } catch (_) {
      return [];
    }
  }

  async function loadCmtQuizBankQuestions(fileName) {
    if (!fileName) return [];
    try {
      var res = null;
      if (root.Desktop && typeof root.Desktop.readText === 'function') {
        res = await root.Desktop.readText('customQuizzes', fileName);
      } else if (root.electronApi && typeof root.electronApi.readByPath === 'function') {
        res = await root.electronApi.readByPath({ target: 'customQuizzes', relativePath: fileName });
      }
      var txt = typeof res === 'string' ? res : (res && res.content);
      if (!txt) return [];
      var parsed = null;
      var trimmed = txt.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        parsed = JSON.parse(trimmed);
      } else {
        var eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          var rhs = trimmed.slice(eqIdx + 1).trim().replace(/;\s*$/, '');
          parsed = JSON.parse(rhs);
        }
      }
      var rawList = Array.isArray(parsed)
        ? parsed
        : (parsed && Array.isArray(parsed.questions) ? parsed.questions
          : (parsed && Array.isArray(parsed.items) ? parsed.items : []));
      return rawList.map(function (q, i) {
        var opts = Array.isArray(q.options) ? q.options.map(String)
          : (Array.isArray(q.choices) ? q.choices.map(String) : []);
        var cIdx = typeof q.correctIndex === 'number' ? q.correctIndex
          : (typeof q.answerIndex === 'number' ? q.answerIndex : 0);
        if (typeof q.answer === 'string' && opts.length) {
          var found = opts.indexOf(q.answer);
          if (found !== -1) cIdx = found;
        }
        return {
          id: q.id || ('imp-' + i + '-' + Date.now().toString(36)),
          kind: opts.length > 0 ? 'mcq' : 'short',
          prompt: String(q.question || q.prompt || q.title || '').trim(),
          options: opts,
          correctIndex: cIdx,
          answerText: String(q.answer || q.correctAnswer || '').trim(),
          explanation: String(q.explanation || q.note || '').trim()
        };
      }).filter(function (q) { return q.prompt.length > 0; });
    } catch (_) {
      return [];
    }
  }

  root.RbQuizMedia = {
    createEmptyQuestion: createEmptyQuestion,
    pickAndImportMedia: pickAndImportMedia,
    listCmtQuizBanks: listCmtQuizBanks,
    loadCmtQuizBankQuestions: loadCmtQuizBankQuestions
  };
})(typeof window !== 'undefined' ? window : globalThis);
