/**
 * BoardUnits Service
 * Handles unit conversions, formatting, and calibration between canonical CSS pixels (px)
 * and physical/typographic units of measure (pt, mm, cm, in) for fonts, line strokes,
 * borders, and canvas geometry in Board.
 *
 * Internal engine and saved constellation session files always store canonical pixels (px).
 * This service provides the dynamic UI adapter layer for display, user inputs, and slider bounds.
 */
(function (global) {
  'use strict';

  var PX_PER_INCH = 96;
  var PT_PER_INCH = 72;
  var MM_PER_INCH = 25.4;

  var RATIOS = {
    px: 1,
    pt: PX_PER_INCH / PT_PER_INCH,        // 1.3333333333333333 px
    mm: PX_PER_INCH / MM_PER_INCH,        // 3.779527559055118 px
    cm: (PX_PER_INCH / MM_PER_INCH) * 10, // 37.79527559055118 px
    in: PX_PER_INCH                       // 96 px
  };

  var FONT_UNITS = ['pt', 'px'];
  var THICKNESS_UNITS = ['mm', 'pt', 'px'];

  var STORAGE_FONT_UNIT = 'cmt_board_font_unit';
  var STORAGE_THICK_UNIT = 'cmt_board_thick_unit';

  var _listeners = [];

  var BoardUnits = {
    UNITS: {
      PX: 'px',
      PT: 'pt',
      MM: 'mm',
      CM: 'cm',
      IN: 'in'
    },

    FONT_UNITS: FONT_UNITS,
    THICKNESS_UNITS: THICKNESS_UNITS,

    /**
     * Convert value in specified unit to canonical CSS pixels.
     * @param {number|string} val
     * @param {string} unit ('pt', 'mm', 'cm', 'in', 'px')
     * @returns {number} Value in canonical px
     */
    toPx: function (val, unit) {
      var num = parseFloat(val);
      if (isNaN(num)) return 0;
      var u = (unit || 'px').toLowerCase();
      var factor = RATIOS[u] || 1;
      return num * factor;
    },

    /**
     * Convert canonical CSS pixels to specified unit.
     * @param {number|string} px
     * @param {string} unit ('pt', 'mm', 'cm', 'in', 'px')
     * @param {number} [decimals] Decimal precision
     * @returns {number} Value in requested unit
     */
    fromPx: function (px, unit, decimals) {
      var num = parseFloat(px);
      if (isNaN(num)) return 0;
      var u = (unit || 'px').toLowerCase();
      var factor = RATIOS[u] || 1;
      var converted = num / factor;

      if (typeof decimals !== 'number') {
        if (u === 'pt') {
          // Check if very close to integer
          var roundVal = Math.round(converted);
          if (Math.abs(converted - roundVal) < 0.05) return roundVal;
          // Check if very close to half-point
          var halfVal = Math.round(converted * 2) / 2;
          if (Math.abs(converted - halfVal) < 0.05) return halfVal;
          decimals = 1;
        } else if (u === 'mm' || u === 'cm') {
          var roundMm = Math.round(converted * 10) / 10;
          return roundMm;
        } else {
          decimals = 0;
        }
      }

      if (decimals === 0) {
        return Math.round(converted);
      }
      var mult = Math.pow(10, decimals);
      return Math.round(converted * mult) / mult;
    },

    /**
     * Format canonical pixels into user-facing string with unit suffix.
     * @param {number|string} px
     * @param {string} unit
     * @returns {string} e.g. "12 pt", "0.5 mm", "16 px"
     */
    format: function (px, unit) {
      var u = (unit || this.getFontUnit()).toLowerCase();
      var val = this.fromPx(px, u);
      return val + (u ? ' ' + u : '');
    },

    /**
     * Parse arbitrary input string with optional unit suffix into numeric value, unit, and px.
     * @param {string|number} inputStr e.g. "12pt", "1.5 mm", "16px", 12
     * @param {string} defaultUnit
     * @returns {{value: number, unit: string, px: number}}
     */
    parse: function (inputStr, defaultUnit) {
      if (typeof inputStr === 'number') {
        var u = defaultUnit || 'px';
        return { value: inputStr, unit: u, px: this.toPx(inputStr, u) };
      }
      var s = String(inputStr || '').trim();
      var m = s.match(/^([+-]?[0-9]*\.?[0-9]+)\s*([a-zA-Z%]+)?$/);
      if (!m) {
        var fallbackVal = parseFloat(s) || 0;
        var du = defaultUnit || 'px';
        return { value: fallbackVal, unit: du, px: this.toPx(fallbackVal, du) };
      }
      var val = parseFloat(m[1]);
      var unit = (m[2] || defaultUnit || 'px').toLowerCase();
      if (!RATIOS[unit]) unit = defaultUnit || 'px';
      return {
        value: val,
        unit: unit,
        px: this.toPx(val, unit)
      };
    },

    /**
     * Get preferred font size unit ('pt' or 'px'). Defaults to 'pt'.
     */
    getFontUnit: function () {
      try {
        var u = localStorage.getItem(STORAGE_FONT_UNIT);
        if (u && FONT_UNITS.indexOf(u) !== -1) return u;
      } catch (_) { }
      return 'pt';
    },

    /**
     * Set preferred font size unit ('pt' or 'px') and notify listeners.
     */
    setFontUnit: function (unit) {
      var u = (unit || 'pt').toLowerCase();
      if (FONT_UNITS.indexOf(u) === -1) u = 'pt';
      try {
        localStorage.setItem(STORAGE_FONT_UNIT, u);
      } catch (_) { }
      this._emitChange('font', u);
      return u;
    },

    /**
     * Get preferred thickness unit ('mm', 'pt', or 'px'). Defaults to 'mm'.
     */
    getThicknessUnit: function () {
      try {
        var u = localStorage.getItem(STORAGE_THICK_UNIT);
        if (u && THICKNESS_UNITS.indexOf(u) !== -1) return u;
      } catch (_) { }
      return 'mm';
    },

    /**
     * Set preferred thickness unit ('mm', 'pt', or 'px') and notify listeners.
     */
    setThicknessUnit: function (unit) {
      var u = (unit || 'mm').toLowerCase();
      if (THICKNESS_UNITS.indexOf(u) === -1) u = 'mm';
      try {
        localStorage.setItem(STORAGE_THICK_UNIT, u);
      } catch (_) { }
      this._emitChange('thickness', u);
      return u;
    },

    /**
     * Returns slider configuration bounds { min, max, step } calibrated for the given type and unit.
     * @param {'nodeFont'|'noteFont'|'edgeFont'|'drawPen'|'shapeThick'|'edgeThick'|'drawEraser'|'borderWidth'} type
     * @param {string} [unit]
     */
    getSliderConfig: function (type, unit) {
      var u = unit || (type.indexOf('Font') !== -1 ? this.getFontUnit() : this.getThicknessUnit());
      u = u.toLowerCase();

      switch (type) {
        case 'nodeFont':
          // Standard node font: 8px - 96px
          if (u === 'pt') return { min: 6, max: 72, step: 1, unit: 'pt' };
          return { min: 8, max: 96, step: 1, unit: 'px' };

        case 'noteFont':
          // Sticky notes: 4px - 96px
          if (u === 'pt') return { min: 3, max: 72, step: 1, unit: 'pt' };
          return { min: 4, max: 96, step: 1, unit: 'px' };

        case 'edgeFont':
          // Edge arrow/label: 8px - 36px
          if (u === 'pt') return { min: 6, max: 27, step: 1, unit: 'pt' };
          return { min: 8, max: 36, step: 1, unit: 'px' };

        case 'drawPen':
          // Freehand pen: 1px - 40px
          if (u === 'mm') return { min: 0.2, max: 10.0, step: 0.1, unit: 'mm' };
          if (u === 'pt') return { min: 0.5, max: 30.0, step: 0.5, unit: 'pt' };
          return { min: 1, max: 40, step: 1, unit: 'px' };

        case 'shapeThick':
          // Shapes: 1px - 24px
          if (u === 'mm') return { min: 0.2, max: 6.0, step: 0.1, unit: 'mm' };
          if (u === 'pt') return { min: 0.5, max: 18.0, step: 0.5, unit: 'pt' };
          return { min: 1, max: 24, step: 1, unit: 'px' };

        case 'edgeThick':
          // Edge connectors: 1px - 20px
          if (u === 'mm') return { min: 0.2, max: 5.0, step: 0.1, unit: 'mm' };
          if (u === 'pt') return { min: 0.5, max: 15.0, step: 0.5, unit: 'pt' };
          return { min: 1, max: 20, step: 0.5, unit: 'px' };

        case 'drawEraser':
          // Eraser: 5px - 60px
          if (u === 'mm') return { min: 1.0, max: 16.0, step: 0.5, unit: 'mm' };
          if (u === 'pt') return { min: 3.0, max: 45.0, step: 1.0, unit: 'pt' };
          return { min: 5, max: 60, step: 5, unit: 'px' };

        case 'borderWidth':
          // Borders: 0px - 8px
          if (u === 'mm') return { min: 0, max: 2.0, step: 0.1, unit: 'mm' };
          if (u === 'pt') return { min: 0, max: 6.0, step: 0.5, unit: 'pt' };
          return { min: 0, max: 8, step: 1, unit: 'px' };

        default:
          return { min: 1, max: 50, step: 1, unit: u };
      }
    },

    /**
     * Subscribe to unit changes.
     */
    onChange: function (fn) {
      if (typeof fn === 'function') _listeners.push(fn);
    },

    /**
     * Unsubscribe from unit changes.
     */
    offChange: function (fn) {
      _listeners = _listeners.filter(function (l) { return l !== fn; });
    },

    _emitChange: function (kind, newUnit) {
      for (var i = 0; i < _listeners.length; i++) {
        try {
          _listeners[i](kind, newUnit);
        } catch (e) {
          console.error('[BoardUnits] listener error:', e);
        }
      }
    }
  };

  // Global Bridge Helpers for Board UI & Context Menus
  global.conPxToFontUnit = function (px, unit) {
    unit = unit || global.conFontUnit || BoardUnits.getFontUnit();
    var num = parseFloat(px) || 0;
    if (unit === 'px') return Math.round(num);
    return Math.round(num * 0.75 * 10) / 10;
  };

  global.conFontUnitToPx = function (val, unit) {
    unit = unit || global.conFontUnit || BoardUnits.getFontUnit();
    var num = parseFloat(val) || 0;
    if (unit === 'px') return Math.round(num);
    return Math.round((num / 0.75) * 10) / 10;
  };

  global.conFormatFontSize = function (px, unit) {
    unit = unit || global.conFontUnit || BoardUnits.getFontUnit();
    return global.conPxToFontUnit(px, unit) + ' ' + unit;
  };

  global.conPxToThicknessUnit = function (px, unit) {
    unit = unit || global.conThicknessUnit || BoardUnits.getThicknessUnit();
    var num = parseFloat(px) || 0;
    if (unit === 'px') return Math.round(num * 10) / 10;
    if (unit === 'pt') return Math.round(num * 0.75 * 10) / 10;
    return Math.round((num * 25.4 / 96) * 10) / 10;
  };

  global.conThicknessUnitToPx = function (val, unit) {
    unit = unit || global.conThicknessUnit || BoardUnits.getThicknessUnit();
    var num = parseFloat(val) || 0;
    if (unit === 'px') return Math.round(num * 10) / 10;
    if (unit === 'pt') return Math.round((num / 0.75) * 10) / 10;
    return Math.round((num * 96 / 25.4) * 10) / 10;
  };

  global.conFormatThickness = function (px, unit) {
    unit = unit || global.conThicknessUnit || BoardUnits.getThicknessUnit();
    return global.conPxToThicknessUnit(px, unit) + ' ' + unit;
  };

  global._conSetupFontSizeSlider = function (el, unit, context) {
    if (!el) return;
    unit = unit || global.conFontUnit || BoardUnits.getFontUnit();
    var isNote = context === 'note' || (el && el.id === 'wn-sp-size-slider');
    if (unit === 'pt') {
      el.min = isNote ? '3' : '6';
      el.max = '72';
      el.step = '1';
    } else {
      el.min = isNote ? '4' : '8';
      el.max = '96';
      el.step = '1';
    }
  };

  global._conSetupThicknessSlider = function (el, unit, context) {
    if (!el) return;
    unit = unit || global.conThicknessUnit || BoardUnits.getThicknessUnit();
    if (unit === 'mm') {
      if (context === 'shape') { el.min = '0.2'; el.max = '6.0'; el.step = '0.1'; }
      else if (context === 'edge') { el.min = '0.2'; el.max = '5.0'; el.step = '0.1'; }
      else if (context === 'noteBorder') { el.min = '0'; el.max = '6.0'; el.step = '0.1'; }
      else { el.min = '0.2'; el.max = '10.0'; el.step = '0.1'; }
    } else if (unit === 'pt') {
      if (context === 'shape') { el.min = '0.5'; el.max = '18.0'; el.step = '0.5'; }
      else if (context === 'edge') { el.min = '0.5'; el.max = '15.0'; el.step = '0.5'; }
      else if (context === 'noteBorder') { el.min = '0'; el.max = '18.0'; el.step = '0.5'; }
      else { el.min = '0.5'; el.max = '30.0'; el.step = '0.5'; }
    } else { // px
      if (context === 'shape') { el.min = '1'; el.max = '24'; el.step = '1'; }
      else if (context === 'edge') { el.min = '1'; el.max = '20'; el.step = '0.5'; }
      else if (context === 'noteBorder') { el.min = '0'; el.max = '18'; el.step = '1'; }
      else { el.min = '1'; el.max = '40'; el.step = '1'; }
    }
  };

  global.BoardUnits = BoardUnits;
})(typeof window !== 'undefined' ? window : this);
