/**
 * js/reference-builder/rb-module-types.js
 * Built-in starter module types and Custom Module Type Builder registry.
 */
(function (root) {
  'use strict';

  var AVAILABLE_ICONS = [
    'reference-builder.svg',
    'document-editor.svg',
    'manage-database.svg',
    'learning-tools.svg',
    'test-creator.svg',
    'lesson-creator.svg',
    'board.svg',
    'table.svg',
    'dictionary.svg',
    'media-converter.svg',
    'planner.svg',
    'competence-portfolio.svg',
    'zap.svg',
    'lightbulb.svg',
    'warning.svg',
    'check.svg'
  ];

  var ACCENT_PALETTE = [
    '#e2c96e', // Amber
    '#6abf8e', // Sage
    '#5b8fcc', // Slate
    '#8b7cc2', // Violet
    '#c96b6b', // Rose
    '#333333'  // Charcoal
  ];

  var BUILTIN_TYPES = [
    {
      id: 'definition',
      nameKey: 'rbTypeDefinition',
      defaultName: 'Definition / Concept',
      icon: 'dictionary.svg',
      color: '#5b8fcc',
      styleVariant: 'callout',
      fields: [
        { key: 'term', labelKey: 'rbFieldTerm', defaultLabel: 'Key Term / Concept', kind: 'text' },
        { key: 'body', labelKey: 'rbFieldExplanation', defaultLabel: 'Explanation (Markdown / KaTeX)', kind: 'richtext' }
      ]
    },
    {
      id: 'rule',
      nameKey: 'rbTypeRule',
      defaultName: 'Rule / Grammar Point',
      icon: 'document-editor.svg',
      color: '#8b7cc2',
      styleVariant: 'callout',
      fields: [
        { key: 'body', labelKey: 'rbFieldRule', defaultLabel: 'Rule / Syntax / Formula', kind: 'richtext' },
        { key: 'exceptions', labelKey: 'rbFieldExceptions', defaultLabel: 'Exceptions / Notes', kind: 'list' }
      ]
    },
    {
      id: 'example',
      nameKey: 'rbTypeExample',
      defaultName: 'Example / Case Study',
      icon: 'lesson-creator.svg',
      color: '#6abf8e',
      styleVariant: 'card',
      fields: [
        { key: 'body', labelKey: 'rbFieldContent', defaultLabel: 'Content (Markdown / KaTeX)', kind: 'richtext' },
        { key: 'pairs', labelKey: 'rbFieldPairs', defaultLabel: 'Annotated Pairs (e.g. Prompt -> Analysis)', kind: 'keyvalue' }
      ]
    },
    {
      id: 'tip',
      nameKey: 'rbTypeTip',
      defaultName: 'Tip / Mnemonic',
      icon: 'lightbulb.svg',
      color: '#e2c96e',
      styleVariant: 'callout',
      fields: [
        { key: 'body', labelKey: 'rbFieldContent', defaultLabel: 'Tip / Memory Aid', kind: 'richtext' }
      ]
    },
    {
      id: 'warning',
      nameKey: 'rbTypeWarning',
      defaultName: 'Warning / Common Pitfall',
      icon: 'warning.svg',
      color: '#c96b6b',
      styleVariant: 'callout',
      fields: [
        { key: 'body', labelKey: 'rbFieldContent', defaultLabel: 'Pitfall & How to Avoid It', kind: 'richtext' }
      ]
    },
    {
      id: 'procedure',
      nameKey: 'rbTypeProcedure',
      defaultName: 'Procedure / Lab Protocol',
      icon: 'check.svg',
      color: '#5b8fcc',
      styleVariant: 'card',
      fields: [
        { key: 'steps', labelKey: 'rbFieldSteps', defaultLabel: 'Ordered Steps', kind: 'list' },
        { key: 'body', labelKey: 'rbFieldNotes', defaultLabel: 'Additional Notes', kind: 'richtext' }
      ]
    },
    {
      id: 'table',
      nameKey: 'rbTypeTable',
      defaultName: 'Comparison / Data Table',
      icon: 'table.svg',
      color: '#6abf8e',
      styleVariant: 'table',
      fields: [
        { key: 'table', labelKey: 'rbFieldTable', defaultLabel: 'Table Data', kind: 'table' },
        { key: 'caption', labelKey: 'rbFieldCaption', defaultLabel: 'Caption', kind: 'text' }
      ]
    },
    {
      id: 'picture',
      nameKey: 'rbTypePicture',
      defaultName: 'Picture / Diagram',
      icon: 'board.svg',
      color: '#e2c96e',
      styleVariant: 'media',
      fields: [
        { key: 'media', labelKey: 'rbFieldImage', defaultLabel: 'Image File or URL', kind: 'media', mediaKind: 'image' },
        { key: 'caption', labelKey: 'rbFieldCaption', defaultLabel: 'Caption', kind: 'text' },
        { key: 'alt', labelKey: 'rbFieldAlt', defaultLabel: 'Alt Text', kind: 'text' }
      ]
    },
    {
      id: 'video',
      nameKey: 'rbTypeVideo',
      defaultName: 'Video Embed',
      icon: 'media-converter.svg',
      color: '#8b7cc2',
      styleVariant: 'media',
      fields: [
        { key: 'media', labelKey: 'rbFieldVideo', defaultLabel: 'Video File or URL', kind: 'media', mediaKind: 'video' },
        { key: 'caption', labelKey: 'rbFieldCaption', defaultLabel: 'Caption / Timestamp Notes', kind: 'text' }
      ]
    },
    {
      id: 'quiz',
      nameKey: 'rbTypeQuiz',
      defaultName: 'Interactive Quiz',
      icon: 'learning-tools.svg',
      color: '#6abf8e',
      styleVariant: 'quiz',
      fields: [
        { key: 'quiz', labelKey: 'rbFieldQuiz', defaultLabel: 'Questions', kind: 'quiz' }
      ]
    },
    {
      id: 'tool_link',
      nameKey: 'rbTypeToolLink',
      defaultName: 'CMT Tool Link',
      icon: 'zap.svg',
      color: '#5b8fcc',
      styleVariant: 'links',
      fields: [
        { key: 'links', labelKey: 'rbFieldLinks', defaultLabel: 'Linked CMT Tools & Resources', kind: 'tool_link' },
        { key: 'body', labelKey: 'rbFieldNotes', defaultLabel: 'Teacher / Student Instructions', kind: 'richtext' }
      ]
    },
    {
      id: 'summary',
      nameKey: 'rbTypeSummary',
      defaultName: 'Summary / Key Takeaways',
      icon: 'reference-builder.svg',
      color: '#e2c96e',
      styleVariant: 'card',
      fields: [
        { key: 'bullets', labelKey: 'rbFieldKeyPoints', defaultLabel: 'Key Takeaways', kind: 'list' },
        { key: 'body', labelKey: 'rbFieldSummary', defaultLabel: 'Closing Synthesis', kind: 'richtext' }
      ]
    }
  ];

  function getAllTypes(customTypes) {
    var list = BUILTIN_TYPES.slice();
    if (Array.isArray(customTypes)) {
      customTypes.forEach(function (ct) {
        if (ct && ct.id) list.push(ct);
      });
    }
    return list;
  }

  function getTypeById(typeId, customTypes) {
    var all = getAllTypes(customTypes);
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === typeId) return all[i];
    }
    return BUILTIN_TYPES[0];
  }

  function createDefaultDataForType(typeDef) {
    var data = {};
    var fields = (typeDef && Array.isArray(typeDef.fields)) ? typeDef.fields : [];
    fields.forEach(function (f) {
      switch (f.kind) {
        case 'list':
          data[f.key] = [''];
          break;
        case 'keyvalue':
          data[f.key] = [{ left: '', right: '' }];
          break;
        case 'table':
          data[f.key] = { headers: ['Column 1', 'Column 2'], rows: [['', '']] };
          break;
        case 'media':
          data[f.key] = { src: '', dataUrl: '', relPath: '', fileName: '', width: '100%' };
          break;
        case 'quiz':
          data[f.key] = { sourceBankFile: '', questions: [] };
          break;
        case 'tool_link':
          data[f.key] = [];
          break;
        default:
          data[f.key] = '';
          break;
      }
    });
    return data;
  }

  function createCustomTypeObj(input) {
    var uuid = (root.RbStore && typeof root.RbStore.uuid === 'function')
      ? root.RbStore.uuid
      : function () { return 'ctype-' + Date.now().toString(36); };
    var fields = Array.isArray(input && input.fields) && input.fields.length
      ? input.fields
      : [{ key: 'body', defaultLabel: 'Content', kind: 'richtext' }];
    return {
      id: (input && input.id) || ('custom-' + uuid().slice(0, 8)),
      isCustom: true,
      defaultName: String((input && input.name) || 'Custom Module').trim(),
      icon: (input && input.icon) || 'reference-builder.svg',
      color: (input && input.color) || '#e2c96e',
      styleVariant: (input && input.styleVariant) || 'card',
      fields: fields.map(function (f, idx) {
        return {
          key: f.key || ('field_' + idx),
          defaultLabel: String(f.defaultLabel || f.label || ('Field ' + (idx + 1))).trim(),
          kind: f.kind || 'richtext',
          mediaKind: f.mediaKind || undefined
        };
      })
    };
  }

  root.RbModuleTypes = {
    AVAILABLE_ICONS: AVAILABLE_ICONS,
    ACCENT_PALETTE: ACCENT_PALETTE,
    BUILTIN_TYPES: BUILTIN_TYPES,
    getAllTypes: getAllTypes,
    getTypeById: getTypeById,
    createDefaultDataForType: createDefaultDataForType,
    createCustomTypeObj: createCustomTypeObj
  };
})(typeof window !== 'undefined' ? window : globalThis);
