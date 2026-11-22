(function (dict) {
  if (typeof window !== 'undefined') {
    window.__I18N_STRINGS__ = window.__I18N_STRINGS__ || {};
    window.__I18N_STRINGS__["fr"] = Object.assign(window.__I18N_STRINGS__["fr"] || {}, dict);
  }
  if (typeof module === 'object' && module.exports) module.exports = dict;
})({
  "auditTitle": "Console d'audit",
  "auditSubtitle": "Flux de diagnostic en direct : Main, fenêtres, IPC, Sync, E/S et Serveur",
  "auditPause": "Pause",
  "auditResume": "Reprendre",
  "auditAutoScroll": "Défilement auto",
  "auditAlwaysOnTop": "Épingler",
  "auditCopy": "Copier",
  "auditCopied": "Journaux visibles copiés dans le presse-papiers.",
  "auditExportTxt": "Exporter .txt",
  "auditExportJson": "Exporter .json",
  "auditExportSuccess": "Journaux exportés.",
  "auditClear": "Effacer",
  "auditStatWindows": "Fenêtres :",
  "auditStatCpu": "CPU :",
  "auditStatMemory": "RAM :",
  "auditStatLag": "Latence :",
  "auditStatServer": "Serveur :",
  "auditServerOff": "Arrêté",
  "auditStatAi": "IA :",
  "auditAiIdle": "Inactive",
  "auditAiAnalyze": "Analyser (IA)",
  "auditAiAnalyzing": "Analyse...",
  "auditAiUnavailable": "IA locale (SLM) indisponible ou aucun modèle téléchargé. Configurez-en un dans Configuration générale → Stockage & Synchro.",
  "auditStatSpikes": "Pics :",
  "auditSpikesTitle": "Pics de ressources et événements corrélés",
  "auditResetPeaks": "Réinitialiser les pics",
  "auditSpikesEmpty": "Aucun pic CPU, mémoire, boucle d'événements ou IPC lent détecté.",
  "auditCorrelatedLabel": "Événements liés :",
  "auditStatBuffer": "Tampon :",
  "auditStatShowing": "Affichés :",
  "auditLvlAll": "Tout",
  "auditAllSources": "Toutes les sources",
  "auditSearchPlaceholder": "Filtrer les journaux (texte ou regex)...",
  "auditEmpty": "En attente d'événements de journalisation..."
});
