// Shared spotlight tutorial engine.
// Usage: Tutorial.start(steps, labels)
// steps: [{ selector, title, text }]
// labels: { next, prev, skip, done }
(function () {
  'use strict';

  (function _injectStyles() {
    if (document.getElementById('tut-styles')) return;
    var s = document.createElement('style');
    s.id = 'tut-styles';
    s.textContent = [
      '.tut-panel{position:fixed;background:rgba(0,0,0,.65);z-index:19000;pointer-events:all}',
      '.tut-target{outline:2px solid rgba(255,255,255,.6)!important;outline-offset:6px}',
      '.tut-tooltip{position:fixed;z-index:19001;background:#fff;border-radius:10px;padding:16px 18px 14px;width:300px;box-shadow:0 8px 32px rgba(0,0,0,.28);font-family:"Segoe UI",Tahoma,Geneva,Verdana,sans-serif;box-sizing:border-box}',
      '.tut-tt-title{font-weight:800;font-size:.92rem;margin-bottom:6px;color:#111}',
      '.tut-tt-body{font-size:.82rem;color:#555;line-height:1.55;margin-bottom:14px}',
      '.tut-tt-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}',
      '.tut-tt-counter{font-size:.72rem;font-weight:700;color:#aaa;white-space:nowrap}',
      '.tut-tt-btns{display:flex;gap:6px}',
      '.tut-btn{padding:5px 12px;border-radius:5px;font-family:inherit;font-size:.78rem;font-weight:700;cursor:pointer;border:2px solid #111;background:#fff;color:#111;transition:background .1s,color .1s;white-space:nowrap}',
      '.tut-next{background:#111;color:#fff}.tut-next:hover{background:#333;border-color:#333}',
      '.tut-prev:hover{background:#111;color:#fff}',
      '.tut-skip{border-color:#ccc;color:#999}.tut-skip:hover{border-color:#666;color:#555;background:#f5f5f5}',
      '.tut-trigger-btn{background:none;border:1px solid #555;color:#ccc;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:.82rem;font-weight:700;line-height:1;transition:border-color .12s,color .12s;font-family:inherit}',
      '.tut-trigger-btn:hover{border-color:#fff;color:#fff}'
    ].join('');
    document.head.appendChild(s);
  })();

  var _panels = {};
  var _tooltip = null;
  var _highlighted = null;
  var _steps = [];
  var _cur = 0;
  var _labels = {};
  var _escHandler = null;

  function _build() {
    ['top', 'bottom', 'left', 'right'].forEach(function (side) {
      var el = document.createElement('div');
      el.className = 'tut-panel tut-panel-' + side;
      el.addEventListener('click', _teardown);
      document.body.appendChild(el);
      _panels[side] = el;
    });
    _tooltip = document.createElement('div');
    _tooltip.className = 'tut-tooltip';
    document.body.appendChild(_tooltip);

    _escHandler = function (e) { if (e.key === 'Escape') _teardown(); };
    document.addEventListener('keydown', _escHandler);
  }

  function _teardown() {
    ['top', 'bottom', 'left', 'right'].forEach(function (s) {
      if (_panels[s]) { _panels[s].remove(); delete _panels[s]; }
    });
    if (_tooltip) { _tooltip.remove(); _tooltip = null; }
    if (_highlighted) { _highlighted.classList.remove('tut-target'); _highlighted = null; }
    if (_escHandler) { document.removeEventListener('keydown', _escHandler); _escHandler = null; }
    _steps = [];
    _cur = 0;
  }

  function _show(index) {
    var step = _steps[index];
    var target = document.querySelector(step.selector);
    if (!target) { _next(); return; }

    if (_highlighted) _highlighted.classList.remove('tut-target');
    _highlighted = target;
    target.classList.add('tut-target');

    target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    // Wait for scroll to settle before computing rects
    setTimeout(function () { _layout(target, index); }, 300);
  }

  function _layout(target, index) {
    var r = target.getBoundingClientRect();
    var pad = 10;
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    _panels.top.style.cssText    = 'top:0;left:0;right:0;height:' + Math.max(0, r.top - pad) + 'px';
    _panels.bottom.style.cssText = 'left:0;right:0;bottom:0;top:' + Math.min(vh, r.bottom + pad) + 'px';
    _panels.left.style.cssText   = 'left:0;top:' + (r.top - pad) + 'px;width:' + Math.max(0, r.left - pad) + 'px;height:' + (r.height + pad * 2) + 'px';
    _panels.right.style.cssText  = 'right:0;left:' + (r.right + pad) + 'px;top:' + (r.top - pad) + 'px;height:' + (r.height + pad * 2) + 'px';

    var step = _steps[index];
    var isLast = (index === _steps.length - 1);
    _tooltip.innerHTML =
      '<div class="tut-tt-title">' + (step.title || '') + '</div>' +
      '<div class="tut-tt-body">'  + (step.text  || '') + '</div>' +
      '<div class="tut-tt-foot">' +
        '<span class="tut-tt-counter">' + (index + 1) + ' / ' + _steps.length + '</span>' +
        '<div class="tut-tt-btns">' +
          (index > 0 ? '<button class="tut-btn tut-prev">' + _labels.prev + '</button>' : '') +
          '<button class="tut-btn tut-skip">' + _labels.skip + '</button>' +
          '<button class="tut-btn tut-next">' + (isLast ? _labels.done : _labels.next) + '</button>' +
        '</div>' +
      '</div>';

    _tooltip.querySelector('.tut-next').addEventListener('click', isLast ? _teardown : _next);
    _tooltip.querySelector('.tut-skip').addEventListener('click', _teardown);
    var pb = _tooltip.querySelector('.tut-prev');
    if (pb) pb.addEventListener('click', _prev);

    _placeTooltip(r, vw, vh);
  }

  function _placeTooltip(r, vw, vh) {
    _tooltip.style.visibility = 'hidden';
    _tooltip.style.display = 'block';
    var tw = _tooltip.offsetWidth;
    var th = _tooltip.offsetHeight;
    var gap = 14;
    var margin = 10;
    var left, top;

    if (r.bottom + gap + th <= vh - margin) {
      top  = r.bottom + gap;
      left = Math.min(Math.max(r.left, margin), vw - tw - margin);
    } else if (r.top - gap - th >= margin) {
      top  = r.top - gap - th;
      left = Math.min(Math.max(r.left, margin), vw - tw - margin);
    } else if (r.right + gap + tw <= vw - margin) {
      left = r.right + gap;
      top  = Math.min(Math.max(r.top, margin), vh - th - margin);
    } else {
      left = Math.max(r.left - gap - tw, margin);
      top  = Math.min(Math.max(r.top, margin), vh - th - margin);
    }

    _tooltip.style.left = left + 'px';
    _tooltip.style.top  = top  + 'px';
    _tooltip.style.visibility = 'visible';
  }

  function _next() {
    if (_cur < _steps.length - 1) { _cur++; _show(_cur); } else { _teardown(); }
  }

  function _prev() {
    if (_cur > 0) { _cur--; _show(_cur); }
  }

  window.Tutorial = {
    start: function (steps, labels) {
      _teardown();
      _steps  = steps;
      _cur    = 0;
      _labels = {
        next: (labels && labels.next) || 'Next →',
        prev: (labels && labels.prev) || '← Back',
        skip: (labels && labels.skip) || 'Skip',
        done: (labels && labels.done) || 'Done ✓'
      };
      _build();
      _show(0);
    }
  };
})();
