/* Import module – Documents (file-copy mode: no CSV mapping) */
window.IMPORT_MODULE_DOCUMENTS = {
  id: 'documents',
  i18nKey: 'importDestDocuments',
  isFileCopy: true,
  target: 'docEditorDocs',
  copySubdir: null,
  copyFilters: [
    { name: 'Documents', extensions: ['html', 'md', 'txt'] },
    { name: 'All files', extensions: ['*'] }
  ],
  copyTitleKey: 'importDocsPickTitle',
  doneActionKey: 'importBtnOpenDocEditor',
  doneToolPage: 'document-editor.html'
};
