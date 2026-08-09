/* Import module – Books & Texts (file-copy mode: no CSV mapping) */
window.IMPORT_MODULE_BOOKS = {
  id: 'books',
  i18nKey: 'importDestBooks',
  isFileCopy: true,
  target: 'customBooks',
  copySubdir: null,
  copyFilters: [
    { name: 'Books & Texts', extensions: ['epub', 'html', 'htm', 'xhtml', 'txt', 'pdf', 'md'] },
    { name: 'All files', extensions: ['*'] }
  ],
  copyTitleKey: 'importBooksPickTitle',
  doneActionKey: 'importBtnOpenBoard',
  doneToolPage: 'board.html'
};
