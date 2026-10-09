/** RIPPED 2026-09-03 — athlete engine wiring removed. Package libraries remain under packages/. See docs/superpowers/specs/2026-09-03-autopilot-clean-rebuild-plan.md */
(function(g){
  /*
   * Keep remote refreshes from replacing the object currently being logged.
   * The active session contains unsaved timer and set-entry state that does not
   * exist in the last cloud snapshot. Callers may safely use this helper even
   * while the remainder of the old strength engine is disabled.
   */
  function mergeRemoteSession(local, remote) {
    if (!remote) return local || null;
    if (!local) return JSON.parse(JSON.stringify(remote));
    if (local.status === 'active') return local;
    Object.keys(local).forEach(function (key) { delete local[key]; });
    Object.assign(local, JSON.parse(JSON.stringify(remote)));
    return local;
  }

  var api = {
    ripped: true,
    hasStrength: function(){return false},
    hasEngine: function(){return false},
    mergeRemoteSession: mergeRemoteSession
  };
  if (typeof module !== "undefined") module.exports = api;
  g.StrengthAdapter = g.StrengthAdapter || api;
  g.EngineAdapter = g.EngineAdapter || api;
  g.BigMacBridge = g.BigMacBridge || { ripped: true };
  g.CondIntervalAutoreg = g.CondIntervalAutoreg || { ripped: true };
  g.StrengthOneSetLogger = g.StrengthOneSetLogger || { ripped: true };
  g.CondSessionLogger = g.CondSessionLogger || { ripped: true };
  g.CoordinatorAdapter = g.CoordinatorAdapter || { ripped: true };
})(typeof window !== "undefined" ? window : globalThis);
