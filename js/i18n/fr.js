// Aggregated fr dictionary (loads all split namespaces from ./fr/)
(function () {
  var NAMESPACES = ["core","test-creator","grade-sheet","board","lesson-creator","manage-database","how-to","planner","document-editor","participation-tracker","general-config","group-editor","file-manager","schedule-maker","class-plan","oral-marking","tutorials"];
  if (typeof module === 'object' && module.exports) {
    var merged = {};
    for (var i = 0; i < NAMESPACES.length; i++) {
      Object.assign(merged, require('./fr/' + NAMESPACES[i] + '.js'));
    }
    module.exports = merged;
  }
})();
