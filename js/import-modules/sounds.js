/* Import module – Sounds (file-copy mode: no CSV mapping) */
window.IMPORT_MODULE_SOUNDS = {
  id: 'sounds',
  i18nKey: 'importDestSounds',
  isFileCopy: true,
  target: 'data',
  copySubdir: 'sounds',
  copyFilters: [
    { name: 'Audio files', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'] },
    { name: 'All files', extensions: ['*'] }
  ],
  copyTitleKey: 'importSoundsPickTitle',
  doneActionKey: 'importBtnOpenCms',
  doneToolPage: 'class-management.html'
};
