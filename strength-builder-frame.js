/* Preview host only: compilation and logging remain upstream code. */
window.S = { library: HybridLibrary.emptyState(), sessions: {}, session: null, loggerOpen: false };
let templateId = null;
window.today = () => new Date().toISOString().slice(0, 10);
// Preview logs never leave this iframe and never write to athlete/coach records.
window.save = () => {};
window.render = () => {
    const app = document.getElementById('app');
    app.innerHTML = '<div class="lib-top"><p class="lib-kicker">Isolated athlete preview</p><h1 class="lib-title">Start session</h1><button class="lib-primary" id="startPreview">Start Session</button><p>No logs are saved. Restart after editing to see the latest template.</p></div>';
    document.getElementById('startPreview').onclick = () => {
      S.session = null;
      Logger.open({date:today(),plan:HybridLibrary.compile(HybridLibrary.template(S.library,templateId))});
    };
};
window.addEventListener('message', event => {
  if (event.source !== parent || event.origin !== location.origin || event.data?.type !== 'strength-builder-init') return;
  const {template,catalog} = event.data;
  if (!template || !Array.isArray(template.blocks)) return;
  templateId = template.id;
  S.library = HybridLibrary.ensure({...HybridLibrary.emptyState(),templates:[template],...(catalog ? {catalog} : {})});
  S.libUi = {screen:'edit',tid:templateId,tab:'exercises',q:'',selected:[],draft:{},bid:null};
  // Keep an active preview stable until the coach explicitly restarts it.
  if (!S.loggerOpen) render();
});
parent.postMessage({type:'strength-builder-ready'},location.origin);
