(function (dict) {
  if (typeof window !== 'undefined') {
    window.__I18N_STRINGS__ = window.__I18N_STRINGS__ || {};
    window.__I18N_STRINGS__["de"] = Object.assign(window.__I18N_STRINGS__["de"] || {}, dict);
  }
  if (typeof module === 'object' && module.exports) module.exports = dict;
})({
  "auditTitle": "Audit-Konsole",
  "auditSubtitle": "Live-Diagnosestream für Main, Renderer, IPC, Sync, I/O & Classroom-Server",
  "auditPause": "Pause",
  "auditResume": "Fortsetzen",
  "auditAutoScroll": "Auto-Scroll",
  "auditAlwaysOnTop": "Anheften",
  "auditCopy": "Kopieren",
  "auditCopied": "Sichtbare Protokolle in die Zwischenablage kopiert.",
  "auditExportTxt": "Export .txt",
  "auditExportJson": "Export .json",
  "auditExportSuccess": "Protokolle exportiert.",
  "auditClear": "Leeren",
  "auditStatWindows": "Fenster:",
  "auditStatCpu": "CPU:",
  "auditStatMemory": "RAM:",
  "auditStatLag": "Lag:",
  "auditStatServer": "Server:",
  "auditServerOff": "Aus",
  "auditStatSpikes": "Spitzen:",
  "auditSpikesTitle": "Ressourcenspitzen & korrelierte Ereignisse",
  "auditResetPeaks": "Spitzen zurücksetzen",
  "auditSpikesEmpty": "Noch keine CPU-, Speicher-, Event-Loop- oder Slow-IPC-Spitzen erkannt.",
  "auditCorrelatedLabel": "Auslösende Ereignisse:",
  "auditStatBuffer": "Puffer:",
  "auditStatShowing": "Angezeigt:",
  "auditLvlAll": "Alle",
  "auditAllSources": "Alle Quellen",
  "auditSearchPlaceholder": "Protokolle filtern (Text oder Regex)...",
  "auditEmpty": "Warte auf Protokollereignisse..."
});
