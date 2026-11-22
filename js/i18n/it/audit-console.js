(function (dict) {
  if (typeof window !== 'undefined') {
    window.__I18N_STRINGS__ = window.__I18N_STRINGS__ || {};
    window.__I18N_STRINGS__["it"] = Object.assign(window.__I18N_STRINGS__["it"] || {}, dict);
  }
  if (typeof module === 'object' && module.exports) module.exports = dict;
})({
  "auditTitle": "Console di Audit",
  "auditSubtitle": "Flusso diagnostico live per Main, Renderer, IPC, Sync, I/O e Server",
  "auditPause": "Pausa",
  "auditResume": "Riprendi",
  "auditAutoScroll": "Scorrimento auto",
  "auditAlwaysOnTop": "Fissa",
  "auditCopy": "Copia",
  "auditCopied": "Log visibili copiati negli appunti.",
  "auditExportTxt": "Esporta .txt",
  "auditExportJson": "Esporta .json",
  "auditExportSuccess": "Log esportati.",
  "auditClear": "Pulisci",
  "auditStatWindows": "Finestre:",
  "auditStatCpu": "CPU:",
  "auditStatMemory": "RAM:",
  "auditStatLag": "Ritardo:",
  "auditStatServer": "Server:",
  "auditServerOff": "Spento",
  "auditStatSpikes": "Picchi:",
  "auditSpikesTitle": "Picchi di risorse ed eventi correlati",
  "auditResetPeaks": "Azzera picchi",
  "auditSpikesEmpty": "Nessun picco di CPU, memoria, event-loop o IPC lento rilevato.",
  "auditCorrelatedLabel": "Eventi correlati:",
  "auditStatBuffer": "Buffer:",
  "auditStatShowing": "Mostrati:",
  "auditLvlAll": "Tutti",
  "auditAllSources": "Tutte le origini",
  "auditSearchPlaceholder": "Filtra log (testo o regex)...",
  "auditEmpty": "In attesa di eventi di log..."
});
