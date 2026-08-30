/**
 * Typst Monaco Editor Language Definition & Monarch Grammar
 */
(function (global) {
  'use strict';

  function registerTypstLanguage(monacoInstance) {
    if (!monacoInstance || !monacoInstance.languages) return;

    // Check if already registered
    const existing = monacoInstance.languages.getLanguages().some(l => l.id === 'typst');
    if (existing) return;

    monacoInstance.languages.register({
      id: 'typst',
      extensions: ['.typ'],
      aliases: ['Typst', 'typst']
    });

    monacoInstance.languages.setLanguageConfiguration('typst', {
      comments: {
        lineComment: '//',
        blockComment: ['/*', '*/']
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')'],
        ['$', '$']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: '`', close: '`' },
        { open: '$', close: '$' }
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: '`', close: '`' },
        { open: '$', close: '$' },
        { open: '*', close: '*' },
        { open: '_', close: '_' }
      ]
    });

    monacoInstance.languages.setMonarchTokensProvider('typst', {
      defaultToken: '',
      tokenPostfix: '.typst',

      keywords: [
        'set', 'show', 'let', 'import', 'include', 'return',
        'if', 'else', 'for', 'while', 'break', 'continue',
        'in', 'not', 'and', 'or', 'context', 'as', 'auto', 'none'
      ],

      builtins: [
        'align', 'rect', 'circle', 'square', 'line', 'table', 'grid',
        'image', 'figure', 'text', 'page', 'par', 'list', 'enum',
        'heading', 'block', 'box', 'stack', 'columns', 'colbreak',
        'pagebreak', 'link', 'cite', 'bibliography', 'locate',
        'counter', 'state', 'query', 'datetime', 'rgb', 'cmyk', 'luma'
      ],

      tokenizer: {
        root: [
          // Comments
          [/\/\/.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment'],

          // Headings (= Heading 1, == Heading 2)
          [/^={1,6}\s+.*$/, 'keyword.heading'],

          // Inline & Block Math
          [/\$([^$]+)\$/, 'string.math'],
          [/\$/, 'string.math', '@math'],

          // Raw code block
          [/```[\s\S]*?```/, 'variable.source'],
          [/`[^`]*`/, 'variable.source'],

          // Strings
          [/"([^"\\]|\\.)*"/, 'string'],

          // Directives and functions with hash (#set, #show, #let, #table, etc.)
          [/#[a-zA-Z_][a-zA-Z0-9_-]*/, {
            cases: {
              '#set': 'keyword',
              '#show': 'keyword',
              '#let': 'keyword',
              '#import': 'keyword',
              '#include': 'keyword',
              '#if': 'keyword',
              '#else': 'keyword',
              '#for': 'keyword',
              '#while': 'keyword',
              '#return': 'keyword',
              '@default': 'type.identifier'
            }
          }],

          // Labels <my-label>
          [/<[a-zA-Z0-9:_-]+>/, 'tag'],

          // References @my-label
          [/@[a-zA-Z0-9:_-]+/, 'variable.parameter'],

          // Formatted text markers
          [/\*[^*]+\*/, 'strong'],
          [/_[^_]+_/, 'emphasis'],

          // Numbers & Dimensions
          [/\b\d+(\.\d+)?(pt|mm|cm|in|em|%|fr|deg|rad)?\b/, 'number'],

          // Delimiters & brackets
          [/[{}()\[\]]/, '@brackets'],

          // Punctuation
          [/[:,;]/, 'delimiter']
        ],

        comment: [
          [/[^\/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[\/*]/, 'comment']
        ],

        math: [
          [/[^$]+/, 'string.math'],
          [/\$/, 'string.math', '@pop']
        ]
      }
    });

    // Snippets & Autocomplete
    monacoInstance.languages.registerCompletionItemProvider('typst', {
      provideCompletionItems: function (model, position) {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        const suggestions = [
          {
            label: '#set page',
            kind: monacoInstance.languages.CompletionItemKind.Snippet,
            insertText: '#set page(paper: "${1:a4}", margin: (${2:2cm}))\n$0',
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Configure page size, orientation, and margins',
            range: range
          },
          {
            label: '#set text',
            kind: monacoInstance.languages.CompletionItemKind.Snippet,
            insertText: '#set text(font: "${1:Segoe UI}", size: ${2:11pt})\n$0',
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Configure font family and size',
            range: range
          },
          {
            label: '#table',
            kind: monacoInstance.languages.CompletionItemKind.Snippet,
            insertText: '#table(\n  columns: (${1:1fr, 1fr}),\n  [ *${2:Header 1}* ], [ *${3:Header 2}* ],\n  [ ${4:Cell 1} ], [ ${5:Cell 2} ]\n)$0',
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Insert a formatted table',
            range: range
          },
          {
            label: '#grid',
            kind: monacoInstance.languages.CompletionItemKind.Snippet,
            insertText: '#grid(\n  columns: (${1:1fr, 1fr}),\n  gutter: ${2:16pt},\n  [ ${3:Left column} ],\n  [ ${4:Right column} ]\n)$0',
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Insert a multi-column grid',
            range: range
          },
          {
            label: '#align',
            kind: monacoInstance.languages.CompletionItemKind.Snippet,
            insertText: '#align(${1:center})[\n  $0\n]',
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Align content (center, left, right, top, bottom)',
            range: range
          },
          {
            label: '#figure',
            kind: monacoInstance.languages.CompletionItemKind.Snippet,
            insertText: '#figure(\n  image("${1:image.png}", width: ${2:80%}),\n  caption: [${3:Caption text}]\n)$0',
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Insert an image figure with caption',
            range: range
          },
          {
            label: '#pagebreak',
            kind: monacoInstance.languages.CompletionItemKind.Snippet,
            insertText: '#pagebreak()\n$0',
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Insert a page break',
            range: range
          }
        ];

        return { suggestions: suggestions };
      }
    });
  }

  global.registerTypstLanguage = registerTypstLanguage;
})(typeof window !== 'undefined' ? window : globalThis);
