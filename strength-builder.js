(function(root) {
  const clone = value => JSON.parse(JSON.stringify(value));
  function convert(template) {
    if (template.athleteTemplate) return {template:clone(template.athleteTemplate),warnings:template.athleteConversionWarnings || []};
    const warnings = [], blocks = [];
    let previousGroup = null;
    for (const [index,block] of (template.blocks || []).entries()) {
      const kind = block.type || 'strength';
      if (kind === 'conditioning') { warnings.push(`${block.heading || 'Conditioning'}: not supported by the strength-only athlete app; retained in the original coach template.`); previousGroup=null; continue; }
      if (kind !== 'strength') {
        blocks.push({id:`native-${block.id || index}`,kind:'circuit',title:block.heading || (kind==='recovery'?'Recovery':'Warm-up'),instructions:block.notes || block.text || '',track:'for_completion'});
        previousGroup=null; continue;
      }
      const groupId = previousGroup || (block.superset ? `superset-${block.id || index}` : null);
      for (const [ei,exercise] of (block.exercises || []).entries()) {
        const name=exercise.name || 'Exercise';
        if (exercise.reps || exercise.load || exercise.loadExpr || exercise.targetRir != null) warnings.push(`${name}: coach reps/load/RIR are not native athlete targets. The actual compiler uses 8 reps or 8–12 and athlete-entered load; original values remain unchanged.`);
        if (!exercise.sets) warnings.push(`${name}: no coach set count; athlete default is 3 sets.`);
        const range=/[-–]/.test(String(exercise.reps || ''));
        const aliases={reps:'reps',reps_range:'reps_range',weight_kg:'weight_kg',weight_pct_wm:'weight_pct',weight_lwp:'lwp',time_sec:'seconds',distance_m:'meters'};
        const legacyColumns=exercise.logColumns || [];
        const mapped=legacyColumns.map(column=>aliases[column.kind]).filter(Boolean);
        if(legacyColumns.some(column=>!aliases[column.kind])) warnings.push(`${name}: an unsupported logging column was omitted from the native draft.`);
        if(legacyColumns.some(column=>column.value || column.values?.some(value=>value!=='' && value!=null))) warnings.push(`${name}: column targets remain in the original coach template; only their tracking types carry into the athlete draft.`);
        const loadKeys=new Set(['weight_kg','weight_pct','lwp']);
        mapped.sort((a,b)=>Number(loadKeys.has(a))-Number(loadKeys.has(b)));
        blocks.push({id:`native-${exercise.id || `${index}-${ei}`}`,kind:'lift',title:name,setCount:Number(exercise.sets)||3,columns:mapped.length?mapped:[range?'reps_range':'reps',...(exercise.metric==='Weight'||exercise.load ? ['weight_kg'] : [])],notes:[block.notes,exercise.coachNote].filter(Boolean),restSec:exercise.restSec ?? 120,groupId,targetEffort:'average'});
      }
      // Coach supersets can span a flagged block and its next block.
      previousGroup = block.superset && !previousGroup && (block.exercises || []).length===1 && template.blocks[index+1]?.supersetPartner ? groupId : null;
    }
    return {template:{id:template.id,title:template.name || 'Session Template',instructions:template.coachInstructions || '',blocks},warnings};
  }
  function open(coachTemplate,persist,onClose) {
    if (document.getElementById('strengthBuilder')) return;
    const Lib=root.HybridLibrary;
    const native=convert(coachTemplate);
    let library=Lib.ensure({...Lib.emptyState(),templates:[native.template],...(coachTemplate.athleteCatalog?{catalog:coachTemplate.athleteCatalog}:{})});
    const tid=native.template.id;
    const current=()=>Lib.template(library,tid);
    const esc=value=>String(value ?? '').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const field=(label,html)=>`<label class="sb-field"><span>${label}</span>${html}</label>`;
    const options=(value,items)=>items.map(([key,label])=>`<option value="${esc(key)}" ${value===key?'selected':''}>${esc(label)}</option>`).join('');
    const tracks=Lib.TRACK.filter(t=>t.key!=='for_completion').map(t=>[t.key,t.label]);
    const efforts=[['very_easy','Very Easy'],['easy','Easy'],['average','Average'],['hard','Hard'],['max_effort','Max Effort']];
    const opener=document.activeElement;
    const originalOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const overlay=document.createElement('section'); overlay.id='strengthBuilder';
    overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Coach strength session builder');
    overlay.innerHTML=`<header class="sb-header"><div><div class="sb-breadcrumb">Library <span>/</span> Session templates</div><h1>Session Builder</h1></div><div class="sb-actions"><span class="sb-draft">Local draft</span><button type="button" class="btn" id="closeStrengthBuilder">Back to coach</button></div></header>
      <div class="sb-workspace"><main class="sb-editor"><div class="sb-title-row"><span class="sb-eyebrow">STRENGTH SESSION</span><span id="sbBlockCount"></span></div>
      ${field('Session title',`<input id="sbSessionTitle" value="${esc(current().title)}" aria-label="Session title">`)}
      ${field('Coach instructions',`<textarea id="sbInstructions" rows="2" placeholder="Set the intention for this session…">${esc(current().instructions)}</textarea>`)}
      <div class="sb-section-heading"><h2>Session blocks</h2><span>Coach-authored · athlete-compatible</span></div><div id="sbBlocks"></div>
      <div class="sb-add"><button type="button" class="btn primary" data-action="picker">+ Add exercise</button><button type="button" class="btn" data-action="circuit">+ Add completion circuit</button></div>
      <section id="sbPicker" class="sb-picker" hidden><div class="sb-section-heading"><h2>Exercise library</h2><button type="button" class="btn small" data-action="close-picker">Close</button></div><label class="sb-field"><span>Search exercises</span><input id="sbSearch" type="search" placeholder="Search by exercise name"></label><div id="sbResults"></div><button type="button" class="btn" data-action="custom">Add search text as a custom exercise</button></section>
      <details class="sb-limits"><summary>Strength-app compatibility & conversion notes</summary><p>The live athlete compiler uses 8 reps or 8–12 for rep-range tracking. Prescribed load and RIR are not supported targets. Original coach prescriptions are preserved; this draft is not published.</p><ul>${native.warnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul></details><p id="strengthSaveStatus" role="status">Changes save locally. Supabase publishing is unchanged.</p></main>
      <aside class="sb-preview"><div class="sb-section-heading"><div><span class="sb-eyebrow">ATHLETE VIEW</span><h2>Session preview</h2></div><span class="sb-preview-tag">Live app logic</span></div><p>Preview what your athlete will log. Test sets stay here.</p><iframe title="Exact athlete session preview" src="strength-builder-frame.html?mode=preview"></iframe><button type="button" class="btn block" id="restartStrengthPreview">Restart preview with latest edits</button><p class="sb-footnote">Preview only · no athlete records are changed</p></aside></div>`;
    const preview=overlay.querySelector('iframe');
    const send=()=>preview.contentWindow.postMessage({type:'strength-builder-init',template:current(),catalog:library.catalog},location.origin);
    const receive=event=>{
      if(event.origin===location.origin && event.source===preview.contentWindow && event.data?.type==='strength-builder-ready') send();
    };
    window.addEventListener('message',receive);
    document.body.appendChild(overlay);
    const status=overlay.querySelector('#strengthSaveStatus');
    function save(next,repaint=true) {
      library=next;
      coachTemplate.athleteTemplate=clone(current());coachTemplate.athleteCatalog=clone(library.catalog);coachTemplate.athleteConversionWarnings=native.warnings;
      try {persist();status.textContent='Saved locally · original coach prescriptions preserved · not published';}
      catch(error) {status.textContent=`Save failed: ${error.message}`;}
      if(repaint) paintBlocks();
      send();
    }
    function paintBlocks() {
      const template=current(), plan=Lib.compile(template);
      overlay.querySelector('#sbBlockCount').textContent=`${template.blocks.length} blocks`;
      overlay.querySelector('#sbBlocks').innerHTML=Lib.lettered(template).map((b,index)=>{
        const rx=plan.blocks.find(p=>p.letter===b.letter)?.prescription || 'For Completion';
        const title=field('Exercise name',`<input data-field="title" value="${esc(b.title)}">`);
        const details=b.kind==='circuit'
          ? `${field('Circuit name',`<input data-field="title" value="${esc(b.title)}">`)}${field('Circuit instructions',`<textarea rows="2" data-field="instructions">${esc(b.instructions)}</textarea>`)}<span class="sb-completion">✓ For Completion</span>`
          : `${title}<div class="sb-prescription">${field('Sets',`<input type="number" min="1" max="12" data-field="setCount" value="${b.setCount || 3}">`)}${field('Tracking column 1',`<select data-field="col1">${options(b.columns?.[0] || 'reps',tracks)}</select>`)}${field('Tracking column 2',`<select data-field="col2">${options(b.columns?.[1] || 'none',[['none','None'],...tracks])}</select>`)}${field('Rest (seconds)',`<input type="number" min="0" data-field="restSec" value="${b.restSec ?? 120}">`)}${field('Target difficulty',`<select data-field="targetEffort">${options(b.targetEffort || 'average',efforts)}</select>`)}</div><div class="sb-rx"><span>Athlete prescription: <strong>${esc(rx)}</strong></span><span>Load entered by athlete</span></div>${field('Exercise notes',`<textarea rows="1" data-field="notes" placeholder="Coaching cues, technique, intent…">${esc((b.notes || []).join('\n'))}</textarea>`)}<div class="sb-link">${b.groupId?'<span class="sb-superset">Linked superset</span><button class="btn small" data-action="unlink">Unlink exercise</button>':index<template.blocks.length-1 && template.blocks[index+1].kind==='lift'?'<button class="btn small" data-action="link">Link next exercise as superset</button>':''}</div>`;
        return `<article class="sb-block" data-bid="${esc(b.id)}"><div class="sb-block-header"><span class="sb-letter">${esc(b.letter)}</span><strong>${b.kind==='circuit'?'Completion circuit':'Strength / Power'}</strong><div class="sb-block-tools"><button class="sb-icon" data-action="up" aria-label="Move ${esc(b.title)} up" ${index===0?'disabled':''}>↑</button><button class="sb-icon" data-action="down" aria-label="Move ${esc(b.title)} down" ${index===template.blocks.length-1?'disabled':''}>↓</button><button class="sb-delete" data-action="remove" aria-label="Delete ${esc(b.title)}">Delete</button></div></div><div class="sb-block-body">${details}</div></article>`;
      }).join('') || '<div class="sb-empty">Add an exercise or completion circuit to start your session.</div>';
    }
    function search() {
      const q=overlay.querySelector('#sbSearch').value;
      overlay.querySelector('#sbResults').innerHTML=Lib.searchCatalog(library,'exercises',q).map(hit=>`<button type="button" class="sb-result" data-action="add" data-catalog-id="${esc(hit.id)}"><strong>${esc(hit.title)}</strong><span>+ Add</span></button>`).join('') || '<p>No exercises found. Add a custom exercise below.</p>';
    }
    overlay.addEventListener('input',event=>{if(event.target.id==='sbSearch') search();});
    overlay.addEventListener('change',event=>{
      const el=event.target;
      if(el.id==='sbSessionTitle') return save(Lib.patchTemplate(library,tid,{title:el.value}),false);
      if(el.id==='sbInstructions') return save(Lib.patchTemplate(library,tid,{instructions:el.value}),false);
      const bid=el.closest('[data-bid]')?.dataset.bid;
      if(!bid || !el.dataset.field) return;
      const key=el.dataset.field;
      if(['setCount','restSec'].includes(key) && (!el.checkValidity() || el.value==='')) {el.reportValidity();return;}
      let patch;
      if(key==='col1'||key==='col2') {
        const block=el.closest('[data-bid]');
        patch={columns:[block.querySelector('[data-field="col1"]').value,block.querySelector('[data-field="col2"]').value]};
      } else patch={[key]:key==='notes'?el.value.split('\n').filter(Boolean):['setCount','restSec'].includes(key)?Number(el.value):el.value};
      // Keep the edited DOM in place: blur must not swallow the next button click.
      save(Lib.patchBlock(library,tid,bid,patch),false);
      const card=el.closest('[data-bid]');
      const letter=Lib.lettered(current()).find(b=>b.id===bid)?.letter;
      const rx=Lib.compile(current()).blocks.find(b=>b.letter===letter)?.prescription;
      if(card.querySelector('.sb-rx strong')) card.querySelector('.sb-rx strong').textContent=rx || '';
      if(key==='title') for(const [action,label] of [['up','Move'],['down','Move'],['remove','Delete']]) {
        card.querySelector(`[data-action="${action}"]`).setAttribute('aria-label',`${label} ${el.value}${action==='remove'?'':` ${action}`}`);
      }
    });
    overlay.addEventListener('click',event=>{
      const button=event.target.closest('[data-action]');if(!button) return;
      const action=button.dataset.action, bid=button.closest('[data-bid]')?.dataset.bid;
      if(action==='picker') {overlay.querySelector('#sbPicker').hidden=false;search();overlay.querySelector('#sbSearch').focus();}
      else if(action==='close-picker') overlay.querySelector('#sbPicker').hidden=true;
      else if(action==='circuit') save(Lib.addCircuit(library,tid,{title:'Warm-up circuit'}));
      else if(action==='add') save(Lib.addExercise(library,tid,{catalogId:button.dataset.catalogId}));
      else if(action==='custom') {
        const title=overlay.querySelector('#sbSearch').value.trim();
        if(title) {let next=Lib.createCatalogExercise(library,{title,columns:['reps','weight_kg']});next=Lib.addExercise(next,tid,{catalogId:next.catalog.exercises[0].id});save(next);search();}
      } else if(action==='remove') {if(root.confirm('Delete this block from the strength draft? Original coach blocks will remain unchanged.')) save(Lib.removeBlock(library,tid,bid));}
      else if(action==='up'||action==='down') save(Lib.moveBlock(library,tid,bid,action==='up'?-1:1));
      else if(action==='unlink') save(Lib.unlinkSuperset(library,tid,bid));
      else if(action==='link') {const blocks=current().blocks,index=blocks.findIndex(b=>b.id===bid);if(blocks[index+1]) save(Lib.linkSuperset(library,tid,bid,blocks[index+1].id));}
    });
    const close=()=>{window.removeEventListener('message',receive);overlay.remove();document.body.style.overflow=originalOverflow;if(onClose) onClose();opener?.focus();};
    overlay.querySelector('#restartStrengthPreview').onclick=()=>{preview.src='strength-builder-frame.html?mode=preview';};
    overlay.querySelector('#closeStrengthBuilder').onclick=close;
    overlay.addEventListener('keydown',event=>{
      if(event.key==='Escape') close();
      if(event.key!=='Tab') return;
      const focusable=[...overlay.querySelectorAll('button:not(:disabled),input,textarea,select,summary,iframe')].filter(el=>el.getClientRects().length);
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
    paintBlocks();overlay.querySelector('#closeStrengthBuilder').focus();
  }
  root.StrengthBuilder={convert,open};
  if(typeof module==='object') module.exports=root.StrengthBuilder;
})(typeof window!=='undefined'?window:globalThis);
