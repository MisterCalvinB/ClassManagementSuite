(function (dict) {
  if (typeof window !== 'undefined') {
    window.__I18N_STRINGS__ = window.__I18N_STRINGS__ || {};
    window.__I18N_STRINGS__["en"] = Object.assign(window.__I18N_STRINGS__["en"] || {}, dict);
  }
  if (typeof module === 'object' && module.exports) module.exports = dict;
})({
  "auditTitle": "Audit Console",
  "auditSubtitle": "Live diagnostic stream for Main, Renderers, IPC, Sync, I/O & Classroom Server",
  "auditPause": "Pause",
  "auditResume": "Resume",
  "auditAutoScroll": "Auto-scroll",
  "auditAlwaysOnTop": "Pin",
  "auditCopy": "Copy",
  "auditCopied": "Visible logs copied to clipboard.",
  "auditExportTxt": "Export .txt",
  "auditExportJson": "Export .json",
  "auditExportSuccess": "Logs exported.",
  "auditClear": "Clear",
  "auditStatWindows": "Windows:",
  "auditStatCpu": "CPU:",
  "auditStatMemory": "RAM:",
  "auditStatLag": "Lag:",
  "auditStatServer": "Server:",
  "auditServerOff": "Off",
  "auditStatAi": "AI:",
  "auditAiIdle": "Idle",
  "auditAiAnalyze": "AI Analyze",
  "auditAiAnalyzing": "Analyzing...",
  "auditAiUnavailable": "Local AI (SLM) is not available or no model is downloaded. Configure one in General Config → Storage & Sync.",
  "auditStatSpikes": "Spikes:",
  "auditSpikesTitle": "Resource Spikes & Correlated Events",
  "auditResetPeaks": "Reset Peaks",
  "auditSpikesEmpty": "No CPU, memory, event-loop, or slow-IPC spikes detected yet.",
  "auditCorrelatedLabel": "Trigger events:",
  "auditStatBuffer": "Buffered:",
  "auditStatShowing": "Showing:",
  "auditLvlAll": "All",
  "auditAllSources": "All Sources",
  "auditSearchPlaceholder": "Filter logs (text or regex)...",
  "auditEmpty": "Waiting for log events..."
});
