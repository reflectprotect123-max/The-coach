/**
 * Coach V1 views — calendars, roster, assign, nutrition UI.
 * Initialized from coach.html after domain state is ready.
 */
(function (root) {
  'use strict';

  var ctx = {};

  function C() {
    return ctx;
  }

  function esc(s) {
    return ctx.esc(s);
  }

  function persist() {
    ctx.persist();
  }

  function pushBridge() {
    if (root.CoachBridge) root.CoachBridge.push(ctx.S);
  }

  function L() {
    return ctx.L;
  }

  function S() {
    return ctx.S;
  }

  function ui() {
    return ctx.ui;
  }

  function monthKey() {
    return ui().calMonth || L().today().slice(0, 7);
  }

  function setMonth(k) {
    ui().calMonth = k;
    ctx.render();
  }

  function shiftCalMonth(delta) {
    ui().calMonth = L().shiftMonth(monthKey(), delta);
    ctx.render();
  }

  /* ---------- Assign ---------- */

  function assignHtml() {
    var p = ctx.prog(ui().programId);
    if (!p) {
      return (
        '<div class="empty-panel"><div class="eyebrow">Assign</div><h2>Pick a program</h2>' +
        '<p class="muted">Open Library → Programs, then Assign from a program row.</p>' +
        '<div class="empty-actions"><button type="button" class="btn primary small" onclick="go(\'library\',{lib:\'programs\'})">Go to programs</button></div></div>'
      );
    }
    var teams = (S().teams || [])
      .map(function (t) {
        var sel = ui().assignTeamId === t.id ? ' selected' : '';
        return (
          '<option value="' +
          esc(t.id) +
          '"' +
          sel +
          '>' +
          esc(t.name) +
          ' (' +
          (t.athleteIds || []).length +
          ')</option>'
        );
      })
      .join('');
    var start = ui().assignStart || L().mondayOf(L().today());
    return (
      '<div class="fade-in"><button type="button" class="btn ghost small page-back" onclick="go(\'library\',{lib:\'programs\'})">← Back</button>' +
      '<div class="page-intro" style="margin-top:12px"><div class="eyebrow">Assign</div><h1>' +
      esc(p.name) +
      '</h1><p class="lede">Stamp program cells onto each athlete calendar as unpublished sessions. Publish from the team or athlete calendar.</p></div>' +
      '<div class="card stack">' +
      '<div class="field"><label>Team</label><select onchange="ui.assignTeamId=this.value;render()">' +
      teams +
      '</select></div>' +
      '<div class="field"><label>Start week (Monday)</label><input type="date" value="' +
      esc(start) +
      '" onchange="ui.assignStart=this.value;persist()"></div>' +
      '<button type="button" class="btn primary block" onclick="CoachViews.confirmAssign()">Assign program</button></div></div>'
    );
  }

  function confirmAssign() {
    var p = ctx.prog(ui().programId);
    if (!p) return;
    var teamId = ui().assignTeamId || (S().teams[0] && S().teams[0].id);
    try {
      L().assignProgram(S(), {
        programId: p.id,
        teamId: teamId,
        startDate: ui().assignStart || L().mondayOf(L().today()),
      });
      persist();
      ui().view = 'team';
      ui().teamId = teamId;
      ui().calMonth = (ui().assignStart || L().today()).slice(0, 7);
      ctx.render();
    } catch (e) {
      alert(String(e.message || e));
    }
  }

  /* ---------- Roster ---------- */

  function saveAthleteCloudId(athleteId, cloudUserId) {
    var a = ctx.athleteBy(athleteId);
    if (!a) return;
    var id = String(cloudUserId || '').trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      if (typeof root.showCoachToast === 'function') root.showCoachToast('Paste the athlete Supabase user id (UUID).', 'warn');
      else alert('Paste the athlete Supabase user id (UUID).');
      return;
    }
    a.cloudUserId = id;
    persist();
    ctx.render();
    if (typeof root.showCoachToast === 'function') root.showCoachToast('Linked ' + a.name + ' for cloud publish.', 'ok');
  }

  function notifyPublishResult(result, athleteName) {
    L().saveState(null,S());
    if (!result) return;
    if (typeof root.coachPortalToast === 'function') {
      root.coachPortalToast(result, athleteName);
      return;
    }
    if (result.ok) {
      alert('Published to ' + (athleteName || 'athlete') + '. Phone syncs on next open.');
    } else if (result.errors && result.errors.length) {
      alert('Cloud push: ' + result.errors.map(function (e) { return e.error; }).join('; '));
    }
  }


  function athleteListHtml() {
    var all = S().athletes || [];
    var group = ui().rosterGroup || 'all';
    var status = ui().rosterStatus || 'active';
    var list = all.filter(function(a) {return root.CoachManagement.rosterMatches(S(),a,ui());});
    var selected = ui().rosterSelected || {};
    var selectedCount = Object.keys(selected).filter(function (id) { return selected[id]; }).length;
    var rows = list
      .map(function (a) {
        var memberships = (S().teams || []).filter(function (t) { return (t.athleteIds || []).indexOf(a.id) >= 0; });
        var initials = String(a.initials || a.name || 'A').split(/\s+/).map(function (x) { return x[0]; }).join('').slice(0, 2).toUpperCase();
        var checked = selected[a.id] ? ' checked' : '';
        return (
          '<tr class="' + (selected[a.id] ? 'roster-selected' : '') + '"><td><input type="checkbox" aria-label="Select ' + esc(a.name) + '"' + checked + ' onchange="CoachViews.toggleAthleteSelected(\'' + a.id + '\',this.checked)"></td><td><div class="roster-person"><span class="roster-avatar">' + esc(initials) + '</span><div><button type="button" class="linkish" onclick="CoachViews.openAthleteProfile(\'' +
          a.id +
          '\')">' +
          esc(a.name) +
          '</button><div class="subline">' + esc(a.email || 'Athlete account') + '</div></div></div></td>' +
          '<td><div class="table-actions"><button class="action-glyph" title="Calendar" aria-label="Calendar" onclick="go(\'athlete\',{athleteId:\'' + a.id + '\'})">▣</button><button class="action-glyph" title="Message" aria-label="Message" disabled>□</button><button class="action-glyph" title="Progress" aria-label="Progress" onclick="CoachViews.openAthleteProfile(\'' + a.id + '\')">↗</button></div></td>' +
          '<td><span class="pill">Coach Plan</span></td><td class="muted">' + esc(memberships.map(function (t) { return t.name; }).join(', ') || '—') + '</td>' +
          '<td><button type="button" class="linkish tag-link" onclick="CoachViews.addAthleteTag(\'' + a.id + '\')">' + esc((a.tags || []).join(', ') || 'Add Tags') + '</button></td>' +
          '<td class="muted">' + esc(a.daysSinceLogin == null ? '—' : a.daysSinceLogin) + '</td></tr>'
        );
      })
      .join('');
    var n = list.length;
    var teamOptions = (S().teams || []).map(function (t) { return '<option value="team:' + esc(t.id) + '"' + (group === 'team:' + t.id ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('');
    return (
      '<div class="fade-in"><div class="surface-titlebar"><h1>My Athletes</h1><div class="bulk-actions"><span class="muted">' + selectedCount + ' selected</span><button type="button" class="btn small" onclick="CoachViews.removeSelectedFromTeams()"' + (selectedCount ? '' : ' disabled') + '>Remove From Teams</button><button type="button" class="btn small" onclick="CoachViews.archiveSelectedAthletes(' + (status === 'archived') + ')"' + (selectedCount ? '' : ' disabled') + '>' + (status === 'archived' ? 'Restore' : 'Archive') + '</button><button type="button" class="btn primary small" onclick="CoachViews.openInviteAthlete()">Invite Athletes</button></div></div><p class="muted" role="status">' + esc(ui().rosterNotice || '') + '</p>' +
      '<div class="table-toolbar"><div class="table-toolbar-left"><div class="compact-filter"><label>GROUP</label><select aria-label="GROUP" onchange="ui.rosterGroup=this.value;render()"><option value="all">All Athletes (' + all.length + ')</option><option value="none"' + (group === 'none' ? ' selected' : '') + '>Athletes not on a Team</option>' + teamOptions + '</select></div>' +
      '<div class="compact-filter"><label>STATUS</label><select aria-label="STATUS" onchange="ui.rosterStatus=this.value;render()"><option value="active"' + (status === 'active' ? ' selected' : '') + '>Active</option><option value="invited"' + (status === 'invited' ? ' selected' : '') + '>Invited</option><option value="archived"' + (status === 'archived' ? ' selected' : '') + '>Archived</option></select></div></div>' +
      '<div class="table-toolbar-right"><input class="table-search" aria-label="Search athletes" placeholder="Search athletes" value="' + esc(ui().rosterSearch || '') + '" oninput="CoachViews.searchRoster(this.value)"><button class="table-icon-btn" title="Export" aria-label="Export visible athletes" onclick="CoachViews.exportRoster()">⋮</button></div></div>' +
      (rows
        ? '<div class="table-wrap"><table class="th-table data-table roster-table"><thead><tr><th><input type="checkbox" aria-label="Select visible athletes"'+(list.every(function(a){return selected[a.id];})?' checked':'')+' onchange="CoachViews.selectVisibleAthletes(this.checked)"></th><th>Athlete Name</th><th>Actions</th><th>Athlete Type</th><th>Teams</th><th>Tags</th><th>Days Since Last Login</th></tr></thead><tbody>' +
          rows +
          '</tbody></table></div><div class="table-foot"><span class="rows-per-page">Rows per page: 100</span><span>1–' + n + ' of ' + n + '</span></div>'
        : '<div class="empty-panel"><div class="eyebrow">Roster</div><h2>' + (all.length ? 'No matching athletes' : 'No athletes yet') + '</h2><p class="muted">' + (all.length ? 'Try another search, group, or status.' : 'Add an athlete to start your roster.') + '</p></div>') +
      athleteProfileDrawer() + inviteAthleteDialog() +
      '</div>'
    );
  }

  function toggleAthleteSelected(id, checked) {
    ui().rosterSelected = ui().rosterSelected || {};
    ui().rosterSelected[id] = !!checked;
    ctx.render();
  }

  function selectVisibleAthletes(checked) {
    ui().rosterSelected = ui().rosterSelected || {};
    (S().athletes || []).filter(function(a) {return root.CoachManagement.rosterMatches(S(),a,ui());}).forEach(function (a) { ui().rosterSelected[a.id] = !!checked; });
    ctx.render();
  }

  function searchRoster(q) {
    var input=document.querySelector('[aria-label="Search athletes"]');
    var cursor=input ? input.selectionStart : null;
    ui().rosterSearch=q;ctx.render();
    input=document.querySelector('[aria-label="Search athletes"]');
    if(input) {input.focus();if(cursor!=null) input.setSelectionRange(cursor,cursor);}
  }
  function archiveSelectedAthletes(restore) {
    var selected=root.CoachManagement.selectedAthletes(S(),ui().rosterSelected);
    if(!selected.length || !confirm((restore ? 'Restore ' : 'Archive ') + selected.length + ' athlete(s)? Training history and team memberships will be kept.')) return;
    root.CoachManagement.archiveAthletes(S(),selected.map(function(a){return a.id;}),restore);
    ui().rosterSelected={};ui().rosterNotice=(restore?'Restored ':'Archived ')+selected.length+' athlete(s). Local coach roster updated; history preserved.';
    persist();ctx.render();
  }
  function removeSelectedFromTeams() {
    var selected=root.CoachManagement.selectedAthletes(S(),ui().rosterSelected);
    if(!selected.length || !confirm('Remove '+selected.length+' selected athlete(s) from all teams? Existing sessions and training history will be kept.')) return;
    root.CoachManagement.removeFromTeams(S(),selected.map(function(a){return a.id;}));
    ui().rosterSelected={};ui().rosterNotice='Team memberships removed locally. Existing sessions are unchanged.';
    persist();ctx.render();
  }
  function exportRoster() {
    var visible=(S().athletes || []).filter(function(a){return root.CoachManagement.rosterMatches(S(),a,ui());});
    function cell(value){var text=String(value || '');if(/^(\s*[=+@-]|[\t\r\n])/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
    var rows=[['Name','Email','Status','Teams','Tags']].concat(visible.map(function(a){return [a.name,a.email,a.status || 'active',(S().teams || []).filter(function(t){return (t.athleteIds || []).includes(a.id);}).map(function(t){return t.name;}).join('; '),(a.tags || []).join('; ')];}));
    var url=URL.createObjectURL(new Blob([rows.map(function(row){return row.map(cell).join(',');}).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    var link=document.createElement('a');link.href=url;link.download='coach-athletes.csv';link.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);
  }

  function addAthleteTag(id) {
    var a = ctx.athleteBy(id);
    if (!a) return;
    var raw = prompt('Tags (comma separated)', (a.tags || []).join(', '));
    if (raw == null) return;
    a.tags = String(raw).split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    persist();
    ctx.render();
  }

  function openAthleteProfile(id) { ui().athleteProfileId = id; ui().athleteProfileTab = 'exercises'; ctx.render(); }
  function closeAthleteProfile() { ui().athleteProfileId = null; ctx.render(); }
  function setAthleteProfileTab(tab) { ui().athleteProfileTab = tab; ctx.render(); }

  function athleteProfileDrawer() {
    var a = ctx.athleteBy(ui().athleteProfileId);
    if (!a) return '';
    var tab = ui().athleteProfileTab || 'exercises';
    var initials = String(a.initials || a.name || 'A').split(/\s+/).map(function (x) { return x[0]; }).join('').slice(0,2).toUpperCase();
    var body = '';
    if (tab === 'exercises') {
      var rows = root.CoachManagement.exerciseHistory(S(),a.id).map(function(entry){return '<div class="profile-ex-row" data-history-name="'+esc(entry.name.toLowerCase())+'"><span>'+esc(entry.name)+'</span><b>'+esc(entry.actual)+'</b><span class="muted">'+esc(entry.date)+'</span></div>';});
      body = '<input class="table-search" aria-label="Search exercise history" style="width:100%" placeholder="Search exercises" oninput="CoachViews.searchExerciseHistory(this.value)"><div class="profile-ex-row muted"><span>Exercise</span><span>Last logged</span><span>Date</span></div>' + rows.join('') + '<p id="exerciseHistoryStatus" class="muted" role="status">'+(rows.length ? rows.length+' logged exercises' : 'No logged exercise history yet.')+'</p>';
    } else if (tab === 'circuits') {
      var circuits=[];
      (S().sessions || []).filter(function(s){return s.athleteId===a.id;}).slice().sort(function(x,y){return String(y.date).localeCompare(String(x.date));}).forEach(function(s){(s.blocks || []).filter(function(b){return ['text','recovery'].includes(b.type)&&b.complete;}).forEach(function(b){circuits.push('<div class="profile-ex-row"><span>'+esc(b.heading || 'Completion circuit')+'</span><b>Completed</b><span class="muted">'+esc(s.date)+'</span></div>');});});
      body=circuits.join('') || '<div class="empty-panel"><h2>No circuit history</h2><p class="muted">Completed circuits will appear here.</p></div>';
    }
    else if (tab === 'notes') body = '<div class="field"><label>Coach notes</label><textarea id="athlete-profile-notes" oninput="CoachViews.saveAthleteNotes(\'' + a.id + '\',this.value)">' + esc(a.coachNotes || '') + '</textarea></div>';
    else body = '<div class="stack"><div><label>Email</label><div>' + esc(a.email || 'Not set') + '</div></div><div><label>Supabase user id</label><input value="' + esc(a.cloudUserId || '') + '" placeholder="auth.users UUID" onchange="CoachViews.saveAthleteCloudId(\'' + a.id + '\',this.value)"></div><button class="btn small" onclick="bindMyCloudIdToAthlete(\'' + a.id + '\')">Link my signed-in account</button></div>';
    var tabs = ['exercises','circuits','notes','account'].map(function (x) { return '<button type="button" class="' + (tab === x ? 'on' : '') + '" onclick="CoachViews.setAthleteProfileTab(\'' + x + '\')">' + x + '</button>'; }).join('');
    return '<div class="profile-overlay" onclick="if(event.target===this)CoachViews.closeAthleteProfile()"><aside class="profile-drawer athlete-profile-drawer" role="dialog" aria-label="Athlete profile"><div class="profile-head"><span class="roster-avatar">' + esc(initials) + '</span><div style="flex:1"><b>' + esc(a.name) + '</b><div class="subline">Athlete profile</div></div><button class="btn ghost small" aria-label="Close athlete profile" onclick="CoachViews.closeAthleteProfile()">×</button></div><div class="profile-tabs">' + tabs + '</div><div class="profile-body">' + body + '</div></aside></div>';
  }

  function saveAthleteNotes(id, value) { var a = ctx.athleteBy(id); if (!a) return; a.coachNotes = String(value || ''); persist(); }
  function searchExerciseHistory(query) {
    var needle=String(query || '').trim().toLowerCase(),count=0;
    document.querySelectorAll('[data-history-name]').forEach(function(row){row.hidden=!row.dataset.historyName.includes(needle);if(!row.hidden)count++;});
    var status=document.getElementById('exerciseHistoryStatus');if(status)status.textContent=count?count+' logged exercises':'No matching logged exercises.';
  }

  function openInviteAthlete() { ui().inviteStep = 1; ctx.render(); }
  function closeInviteAthlete() { ui().inviteStep = 0; ctx.render(); }
  function inviteAthleteDialog() {
    if (!ui().inviteStep) return '';
    if (ui().inviteStep === 1) return '<div class="picker-overlay" onclick="if(event.target===this)CoachViews.closeInviteAthlete()"><div class="picker-panel" role="dialog" aria-label="Invite Athletes"><div class="row"><h2>Invite Athletes</h2><button class="btn ghost small" onclick="CoachViews.closeInviteAthlete()">×</button></div><p class="muted" style="margin-top:8px">Choose how you coach this athlete.</p><button class="picker-item" style="margin-top:14px" onclick="ui.inviteStep=2;render()"><span><b>1:1 Athlete</b><span class="subline">Manage an individual training calendar</span></span><span>›</span></button></div></div>';
    return '<div class="picker-overlay" onclick="if(event.target===this)CoachViews.closeInviteAthlete()"><div class="picker-panel" role="dialog" aria-label="Invite 1:1 Athlete"><h2>Invite a 1:1 Athlete</h2><p class="muted">Save a pending invitation in your local roster. Email delivery is not connected yet.</p><div class="field"><label>Name</label><input id="invite-athlete-name" required placeholder="Athlete name"></div><div class="field"><label>Email</label><input id="invite-athlete-email" required type="email" placeholder="athlete@email.com"></div><p id="invite-athlete-error" role="status" class="muted"></p><div class="row" style="margin-top:16px"><button class="btn" onclick="CoachViews.closeInviteAthlete()">Cancel</button><button class="btn primary" onclick="CoachViews.saveInviteAthlete()">Save pending invite</button></div></div></div>';
  }

  function saveInviteAthlete() {
    var nameEl = document.getElementById('invite-athlete-name');
    var emailEl = document.getElementById('invite-athlete-email');
    var name = String(nameEl && nameEl.value || '').trim();
    var email = String(emailEl && emailEl.value || '').trim();
    var error=document.getElementById('invite-athlete-error');
    if (!name || !email || !emailEl.checkValidity()) {if(error)error.textContent='Enter a name and valid email address.';return;}
    if((S().athletes || []).some(function(a){return String(a.email || '').toLowerCase()===email.toLowerCase();})){if(error)error.textContent='An athlete with this email already exists.';return;}
    S().athletes.push({ id:L().uid('athlete'), name:name, email:email, status:'invited', tags:[] });
    ui().inviteStep = 0;
    ui().rosterStatus='invited';ui().rosterGroup='all';ui().rosterSearch='';ui().rosterNotice='Pending invitation saved locally. No email was sent.';
    persist();
    ctx.render();
  }

  function teamListHtml() {
    var teams=(S().teams || []).filter(function(t){return (t.name+' '+(t.focus || '')).toLowerCase().includes(String(ui().teamSearch || '').trim().toLowerCase());});
    var rows = teams
      .map(function (t) {
        var owner = (S().coach && S().coach.name) || 'Coach';
        return (
          '<tr><td><input type="checkbox" disabled title="Bulk team actions are not available" aria-label="Select ' + esc(t.name) + '"></td><td><div class="roster-person"><span class="team-mark">HTS</span><div><button type="button" class="linkish" onclick="go(\'team\',{teamId:\'' + t.id + '\'})">' + esc(t.name) + '</button><div class="subline">' + esc(owner) + '</div></div></div></td>' +
          '<td><span class="status-dot"></span>' + (L().teamCalendar(S(), t.id, monthKey()) || []).length + '</td><td class="muted">' + esc(t.difficulty || 'Intermediate') + '</td><td>' + (t.athleteIds || []).length + '</td><td class="muted">' + esc(t.focus || '—') + '</td><td class="muted">' + esc(t.createdAt ? String(t.createdAt).slice(0,10) : '—') + '</td>' +
          '<td><div class="table-actions"><button class="action-glyph" title="Calendar" aria-label="Calendar" onclick="go(\'team\',{teamId:\'' + t.id + '\'})">▣</button><button class="action-glyph" title="Message" disabled>□</button><button class="action-glyph" title="Team settings" onclick="CoachViews.openTeamSettings(\'' + t.id + '\')">⚙</button><button class="action-glyph" title="Invite athletes" onclick="CoachViews.openTeamInvite(\'' + t.id + '\')">⋮</button></div></td></tr>'
        );
      })
      .join('');
    return (
      '<div class="fade-in"><div class="surface-titlebar"><h1>My Teams</h1><button type="button" class="btn primary small" onclick="CoachViews.openCreateTeam()">Create Team</button></div>' +
      '<div class="table-toolbar"><div></div><div class="table-toolbar-right"><input class="table-search" aria-label="Search teams" placeholder="Search teams" value="'+esc(ui().teamSearch || '')+'" oninput="CoachViews.searchTeams(this.value)"><button class="table-icon-btn" disabled title="Bulk team options are not available">⋮</button></div></div>' +
      (rows
        ? '<div class="table-wrap"><table class="th-table data-table roster-table"><thead><tr><th><input type="checkbox" disabled aria-label="Select teams"></th><th>Title</th><th>Planned Sessions</th><th>Difficulty</th><th>Athletes</th><th>Focus</th><th>Created</th><th>Actions</th></tr></thead><tbody>' +
          rows +
          '</tbody></table></div><div class="table-foot"><span class="rows-per-page">Rows per page: 100</span><span>1–' + teams.length + ' of ' + teams.length + '</span></div>'
        : '<div class="empty-panel"><div class="eyebrow">Teams</div><h2>'+((S().teams || []).length?'No matching teams':'No teams yet')+'</h2><p class="muted">Create a team, or try another search.</p><div class="empty-actions"><button type="button" class="btn primary small" onclick="CoachViews.openCreateTeam()">Create Team</button></div></div>') +
      (ui().createTeam ? teamCreateDialog() : '') + teamSettingsDrawer() + teamInviteDialog() +
      '</div>'
    );
  }

  function teamCreateDialog() {
    return (
      '<div class="picker-overlay" onclick="if(event.target===this)CoachViews.closeCreateTeam()">' +
      '<div class="picker-panel team-create-dialog" role="dialog" aria-label="Create Team">' +
      '<h2>Create Team</h2>' +
      '<div class="field"><label>Team Name</label><input id="team-name-in" maxlength="75" oninput="CoachViews.teamNameCount(this)" placeholder="Team name">' +
      '<div class="muted" id="team-name-count">0/75</div></div>' +
      '<p class="muted" id="team-create-error" role="status"></p>' +
      '<div class="row" style="margin-top:16px"><button type="button" class="btn" onclick="CoachViews.closeCreateTeam()">Cancel</button>' +
      '<button type="button" class="btn primary" id="team-create-save" disabled onclick="CoachViews.saveCreateTeam()">Create Team</button></div>' +
      '</div></div>'
    );
  }
  function searchTeams(q) {
    var input=document.querySelector('[aria-label="Search teams"]'),cursor=input ? input.selectionStart : null;
    ui().teamSearch=q;ctx.render();input=document.querySelector('[aria-label="Search teams"]');
    if(input){input.focus();if(cursor!=null)input.setSelectionRange(cursor,cursor);}
  }

  function teamNameCount(el) {
    var n = String(el.value || '').length;
    var c = document.getElementById('team-name-count');
    if (c) c.textContent = n + '/75';
    var b = document.getElementById('team-create-save');
    if (b) b.disabled = String(el.value || '').trim().length < 1;
  }

  function saveCreateTeam() {
    var el = document.getElementById('team-name-in');
    var name = el && el.value;
    if (!name || !String(name).trim()) return;
    if((S().teams || []).some(function(t){return t.name.toLowerCase()===String(name).trim().toLowerCase();})) {document.getElementById('team-create-error').textContent='A team with this name already exists.';return;}
    S().teams.push({
      id: L().uid('team'),
      name: String(name).trim(),
      athleteIds: [],
      difficulty: 'Intermediate',
      createdAt: new Date().toISOString(),
    });
    ui().createTeam = false;
    ui().teamSearch = '';
    persist();
    ctx.render();
  }

  function openCreateTeam() {
    ui().createTeam = true;
    ctx.render();
  }
  function closeCreateTeam() {ui().createTeam=false;ctx.render();}

  function openTeamSettings(id) { ui().teamSettingsId = id; ui().teamSettingsTab = 'general'; ctx.render(); }
  function closeTeamSettings() { ui().teamSettingsId = null; ctx.render(); }
  function setTeamSettingsTab(tab) { ui().teamSettingsTab = tab; ctx.render(); }
  function saveTeamSettings(id) {
    var t = ctx.team(id); if (!t) return;
    var name = document.getElementById('team-settings-name');
    var focus = document.getElementById('team-settings-focus');
    var difficulty = document.getElementById('team-settings-difficulty');
    if(!name || !String(name.value).trim()){document.getElementById('team-settings-error').textContent='Enter a team name.';if(name)name.reportValidity();return;}
    if((S().teams || []).some(function(other){return other.id!==id&&other.name.toLowerCase()===name.value.trim().toLowerCase();})){document.getElementById('team-settings-error').textContent='A team with this name already exists.';return;}
    t.name = String(name.value).trim();
    if (focus) t.focus = focus.value;
    if (difficulty) t.difficulty = difficulty.value;
    persist(); closeTeamSettings();
  }
  function teamSettingsDrawer() {
    var t = ctx.team(ui().teamSettingsId); if (!t) return '';
    var tab = ui().teamSettingsTab || 'general';
    var body = tab === 'general'
      ? '<div class="field"><label for="team-settings-name">Team Name</label><input id="team-settings-name" required maxlength="75" value="' + esc(t.name) + '"></div>' +
        '<div class="field"><label>Team Owner</label><select disabled title="Ownership transfer is not connected"><option>' + esc((S().coach && S().coach.name) || 'Coach') + '</option></select></div>' +
        '<div class="field"><label for="team-settings-focus">Sport/Focus Interest</label><input id="team-settings-focus" value="' + esc(t.focus || '') + '" placeholder="Strength & Conditioning"></div>' +
        '<div class="field"><label for="team-settings-difficulty">Program Difficulty</label><select id="team-settings-difficulty">' + ['Beginner','Intermediate','Advanced'].map(function(value){return '<option'+((t.difficulty || 'Intermediate')===value?' selected':'')+'>'+value+'</option>';}).join('') + '</select></div>' +
        '<div class="field"><label>Logo Image</label><div class="empty-panel" style="text-align:center">300 × 300<p class="muted">Logo upload is not connected yet.</p></div></div><p id="team-settings-error" role="status" class="muted"></p><button class="btn primary block" style="margin-top:14px" onclick="CoachViews.saveTeamSettings(\'' + t.id + '\')">Save & Close</button>'
      : '<div class="empty-panel"><h2>Access Codes</h2><p class="muted">Secure team joining is not connected yet. Manage existing roster members from the team list.</p><button class="btn primary small" disabled style="margin-top:14px">Create New</button></div>';
    return '<div class="profile-overlay" onclick="if(event.target===this)CoachViews.closeTeamSettings()"><aside class="profile-drawer" role="dialog" aria-label="Team settings"><div class="profile-head"><div style="flex:1"><b>' + esc(t.name) + '</b><div class="subline">Team settings</div></div><button class="btn ghost small" onclick="CoachViews.closeTeamSettings()">×</button></div><div class="profile-tabs"><button class="' + (tab === 'general' ? 'on' : '') + '" onclick="CoachViews.setTeamSettingsTab(\'general\')">General</button><button class="' + (tab === 'access' ? 'on' : '') + '" onclick="CoachViews.setTeamSettingsTab(\'access\')">Access Codes</button></div><div class="profile-body">' + body + '</div></aside></div>';
  }

  function openTeamInvite(id) { ui().teamInviteId = id; ctx.render(); }
  function closeTeamInvite() { ui().teamInviteId = null; ctx.render(); }
  function teamInviteDialog() {
    var t = ctx.team(ui().teamInviteId); if (!t) return '';
    var members = new Set(t.athleteIds || []);
    var rows = (S().athletes || []).map(function (a) { return '<label class="picker-item"><span>' + esc(a.name) + '</span><input type="checkbox"' + (members.has(a.id) ? ' checked' : '') + ' onchange="CoachViews.toggleTeamAthlete(\'' + t.id + '\',\'' + a.id + '\',this.checked)"></label>'; }).join('');
    return '<div class="picker-overlay" onclick="if(event.target===this)CoachViews.closeTeamInvite()"><div class="picker-panel" role="dialog" aria-label="Invite Athletes to Team"><div class="row"><h2>Invite Athletes</h2><button class="btn ghost small" onclick="CoachViews.closeTeamInvite()">×</button></div><p class="muted" style="margin-top:6px">' + esc(t.name) + ' · manage local membership; no invitation email is sent.</p><div class="picker-list">' + rows + '</div></div></div>';
  }
  function toggleTeamAthlete(teamId, athleteId, checked) {
    var t = ctx.team(teamId); if (!t || !ctx.athleteBy(athleteId)) return;
    var ids = new Set(t.athleteIds || []);
    if (checked) ids.add(athleteId); else ids.delete(athleteId);
    t.athleteIds = Array.from(ids); persist();
  }

  /* ---------- Calendar shared ---------- */

  function chipMenu(sessionId) {
    var m = ui().chipMenu;
    if (!m || m.id !== sessionId) return '';
    var s = ctx.ses(sessionId);
    return (
      '<div class="kebab-menu" role="menu" onclick="event.stopPropagation()">' +
      (s && s.published ? '<button type="button" onclick="CoachViews.unpublishChip(\'' : '<button type="button" onclick="CoachViews.publishChip(\'') +
      sessionId +
      '\')">' + (s && s.published ? 'Unpublish' : 'Publish') + '</button>' +
      '<button type="button" onclick="CoachViews.previewChip(\'' + sessionId + '\')">Preview</button>' +
      '<button type="button" onclick="CoachViews.editChip(\'' + sessionId + '\')">Edit</button>' +
      '<button type="button" onclick="CoachViews.saveChipToLibrary(\'' + sessionId + '\')">Save to Library as…</button>' +
      '<button type="button" onclick="CoachViews.repeatChip(\'' + sessionId + '\')">Repeat</button>' +
      '<button type="button" onclick="CoachViews.copyChip(\'' + sessionId + '\')">Copy</button>' +
      '<button type="button" onclick="CoachViews.deleteChip(\'' +
      sessionId +
      '\')">Delete</button>' +
      '</div>'
    );
  }

  function previewChip(id) { if (!ctx.ses(id)) return; ui().chipMenu = null; ui().calendarPreview=id; ctx.render(); }
  function closeCalendarPreview(){ui().calendarPreview=null;ctx.render();}
  function calendarPreview(){var s=ctx.ses(ui().calendarPreview);if(!s)return '';return '<div class="profile-overlay" onclick="if(event.target===this)CoachViews.closeCalendarPreview()"><aside class="profile-drawer" role="dialog" aria-label="Session preview"><div class="profile-head"><b style="flex:1">'+esc(s.sessionTitle||s.name)+'</b><button class="btn ghost small" aria-label="Close session preview" onclick="CoachViews.closeCalendarPreview()">×</button></div><div class="profile-body"><p class="muted">'+esc(s.date)+' · '+esc(s.status)+'</p><p style="white-space:pre-wrap">'+esc(s.coachInstructions||'No coach instructions.')+'</p>'+root.blockDetail(s)+'</div></aside></div>';}
  function manageCalendar(){var id=ui().teamId;ctx.go(ui().view==='team'?'teams':'athletes');if(id&&ui().view==='teams')openTeamInvite(id);}
  function toggleCalendarInstructions(){ui().showCalendarInstructions=!ui().showCalendarInstructions;ctx.render();}
  function editChip(id) { var s = ctx.ses(id); if (!s || !s.templateId) return; ui().chipMenu = null; root.openSession(s.templateId); }
  function saveChipToLibrary(id) {
    var s = ctx.ses(id); if (!s) return;
    var t = L().makeTemplate({ name:(s.sessionTitle || s.name) + ' (copy)', coachInstructions:s.coachInstructions || '', blocks:JSON.parse(JSON.stringify(s.blocks || [])) });
    S().templates.push(t); ui().chipMenu = null; persist(); ctx.render();
  }
  function cloneCalendarSession(id, days) {
    var s = ctx.ses(id); if (!s) return;
    var copy = root.CoachTools.freshCalendarCopy(s,L(),days);
    if((S().sessions||[]).some(function(x){return x.athleteId===copy.athleteId&&x.date===copy.date&&x.templateId===copy.templateId;})){ui().calendarNotice='This session is already scheduled on '+copy.date;ui().chipMenu=null;ctx.render();return;}
    S().sessions.push(copy); ui().chipMenu = null; ui().calMonth=copy.date.slice(0,7);ui().calendarNotice='Created an unpublished copy on '+copy.date+'. No logged results were copied.'; persist(); ctx.render();
  }
  function repeatChip(id) { cloneCalendarSession(id, 7); }
  function copyChip(id) { cloneCalendarSession(id, 1); }

  function sessionChip(s, opts) {
    opts = opts || {};
    var pub = s.published ? 'published' : 'unpublished';
    var completed = s.status === 'completed';
    if (completed) pub = s.published ? 'published completed' : 'unpublished completed';
    var title = s.sessionTitle || s.name;
    var athleteName =
      opts.showAthlete && s.athleteId
        ? (ctx.athleteBy(s.athleteId) || {}).name
        : '';
    var statusPill =
      completed
        ? '<span class="pill ok">Completed</span>'
        : '<span class="pill ' +
          (s.published ? 'ok' : 'warn') +
          '">' +
          (s.published ? 'Published' : 'UNPUBLISHED') +
          '</span>';
    var macroPill = s.hasNutritionBundle ? ' · <span class="pill">Macros</span>' : '';
    return (
      '<div class="cal-chip ' +
      pub +
      '">' +
      (athleteName
        ? '<div class="cal-chip-ath">' + esc(athleteName) + '</div>'
        : '') +
      '<div class="cal-chip-top">' +
      '<span class="cal-chip-title">' +
      esc(title) +
      '</span>' +
      '<button type="button" class="kebab-btn" onclick="CoachViews.toggleChipMenu(\'' +
      s.id +
      '\',event)">⋯</button></div>' +
      '<div class="cal-chip-meta">' +
      esc(s.name) +
      ' · ' +
      statusPill +
      macroPill +
      '</div>' +
      chipMenu(s.id) +
      '</div>'
    );
  }

  function toggleChipMenu(id, ev) {
    if (ev) ev.stopPropagation();
    var cur = ui().chipMenu;
    ui().chipMenu = cur && cur.id === id ? null : { id: id };
    ui().cellMenu = null;
    ctx.render();
  }

  function revertPublishOnCloudFail(sessions, wasPublished) {
    (sessions || []).forEach(function (s, i) {
      if (wasPublished[i]) return;
      L().unpublishSession(s);
      s.hasNutritionBundle = false;
    });
    persist();
    ctx.render();
  }

  function publishChip(id) {
    var s = ctx.ses(id);
    var athlete = s ? ctx.athleteBy(s.athleteId) : null;
    var wasPublished = s ? !!s.published : true;
    if (s) {
      L().publishSession(s);
      s.hasNutritionBundle = !!(root.CoachCloud && CoachCloud.nutritionSnapshot && CoachCloud.nutritionSnapshot(S(), s.athleteId, s.date));
    }
    ui().chipMenu = null;
    persist();
    ctx.render();
    if (root.CoachCloud && CoachCloud.pushPublished) {
      CoachCloud.pushPublished(S(), { sessionIds: [id] })
        .then(function (r) {
          if (!r.ok && s && !wasPublished) {
            revertPublishOnCloudFail([s], [wasPublished]);
          }
          notifyPublishResult(r, athlete && athlete.name);
        })
        .catch(function (e) {
          if (s && !wasPublished) {
            revertPublishOnCloudFail([s], [wasPublished]);
          }
          notifyPublishResult(
            { ok: false, errors: [{ error: String((e && e.message) || e) }] },
            athlete && athlete.name,
          );
        });
    }
  }

  function unpublishChip(id) {
    var s = ctx.ses(id);
    var wasPublished = s ? !!s.published : false;
    if (s) L().unpublishSession(s);
    ui().chipMenu = null;
    persist();
    ctx.render();
    if (root.CoachCloud && CoachCloud.unpublishSession) {
      CoachCloud.unpublishSession(S(), s)
        .then(function (r) {
          if (r && !r.ok && wasPublished && s) {
            L().publishSession(s);
            s.hasNutritionBundle = !!(root.CoachCloud && CoachCloud.nutritionSnapshot && CoachCloud.nutritionSnapshot(S(), s.athleteId, s.date));
            persist();
            ctx.render();
            notifyPublishResult(
              r,
              s && ctx.athleteBy(s.athleteId) && ctx.athleteBy(s.athleteId).name,
            );
          }
        })
        .catch(function (e) {
          if (wasPublished && s) {
            L().publishSession(s);
            s.hasNutritionBundle = !!(root.CoachCloud && CoachCloud.nutritionSnapshot && CoachCloud.nutritionSnapshot(S(), s.athleteId, s.date));
            persist();
            ctx.render();
          }
          notifyPublishResult(
            { ok: false, errors: [{ error: String((e && e.message) || e) }] },
            s && ctx.athleteBy(s.athleteId) && ctx.athleteBy(s.athleteId).name,
          );
        });
    }
  }

  function deleteChip(id) {
    var s = ctx.ses(id);
    ui().chipMenu = null;
    if(!s)return;
    if(s.status==='completed'||L().sessionHasLog(s)){ui().calendarNotice='Logged sessions are retained to protect athlete history.';ctx.render();return;}
    if (!confirm('Delete this session from the calendar?')) return;
    function removeLocal() {
      S().sessions = (S().sessions || []).filter(function (x) {
        return x.id !== id;
      });
      persist();
      ctx.render();
    }
    if (s && s.cloudAssignedId && root.CoachCloud && CoachCloud.unpublishSession) {
      CoachCloud.unpublishSession(S(), s)
        .then(function(result){if(result.ok)removeLocal();else{ui().calendarNotice='Session retained: cloud unpublish failed. '+(result.error||result.reason||'');ctx.render();}})
        .catch(function () {ui().calendarNotice='Session retained: could not reach the cloud.';ctx.render();});
      return;
    }
    removeLocal();
  }

  function publishAllForSessions(list) {
    var wasPublished = (list || []).map(function (s) {
      return !!s.published;
    });
    L().publishAllSessions(list);
    (list || []).forEach(function (s) {
      s.hasNutritionBundle = !!(root.CoachCloud && CoachCloud.nutritionSnapshot && CoachCloud.nutritionSnapshot(S(), s.athleteId, s.date));
    });
    persist();
    ctx.render();
    if (root.CoachCloud && CoachCloud.pushPublished) {
      var ids = (list || []).map(function (s) {
        return s.id;
      });
      var athlete = list && list[0] ? ctx.athleteBy(list[0].athleteId) : null;
      CoachCloud.pushPublished(S(), { sessionIds: ids })
        .then(function (r) {
          if (!r.ok && list && list.length) {
            var failed = new Set(
              (r.errors || []).map(function (e) {
                return e.sessionId;
              }),
            );
            var revertList = [];
            var revertWas = [];
            list.forEach(function (s, i) {
              if (!wasPublished[i] && (failed.size === 0 || failed.has(s.id))) {
                revertList.push(s);
                revertWas.push(wasPublished[i]);
              }
            });
            if (revertList.length) revertPublishOnCloudFail(revertList, revertWas);
          }
          notifyPublishResult(r, athlete && athlete.name);
        })
        .catch(function (e) {
          var revertList = [];
          var revertWas = [];
          (list || []).forEach(function (s, i) {
            if (!wasPublished[i]) {
              revertList.push(s);
              revertWas.push(wasPublished[i]);
            }
          });
          if (revertList.length) revertPublishOnCloudFail(revertList, revertWas);
          notifyPublishResult(
            { ok: false, errors: [{ error: String((e && e.message) || e) }] },
            athlete && athlete.name,
          );
        });
    }
  }

  function calDayCell(date, sessions, athleteId, teamMode) {
    var expanded = ui().calDay === date;
    var visible = expanded ? sessions : sessions.slice(0, 2);
    var chips = visible
      .map(function (s) {
        return sessionChip(s, { showAthlete: !!teamMode });
      })
      .join('');
    var more =
      !expanded && sessions.length > 2
        ? '<div class="cal-chip-meta">+' + (sessions.length - 2) + ' more</div>'
        : '';
    var empty =
      !sessions.length && expanded
        ? teamMode
          ? '<div class="cal-empty-actions"><button type="button" class="btn small" onclick="CoachViews.openAddFromLibrary(\'' +
            date +
            '\',\'\',true)">Add from library</button></div>'
          : '<div class="cal-empty-actions"><button type="button" class="btn small" onclick="CoachViews.openAddFromLibrary(\'' +
            date +
            "','" +
            athleteId +
            '\')">Add from library</button></div>'
        : '';
    return (
      '<div class="cal-day' +
      (expanded ? ' expanded' : '') +
      (sessions.length ? ' has-sessions' : '') +
      '">' +
      '<button type="button" class="cal-day-num" onclick="CoachViews.toggleCalDay(\'' +
      date +
      '\'' + (sessions.length ? '' : teamMode ? ',\'\',true' : ',\'' + athleteId + '\'') + ')">' +
      esc(String(Number(date.slice(8)))) +
      (sessions.length ? ' · ' + sessions.length : '') +
      '</button>' +
      '<div class="cal-day-body">' +
      chips +
      more +
      empty +
      '</div></div>'
    );
  }

  function toggleCalDay(date) {
    if (arguments.length > 1) {
      openAddFromLibrary(date, arguments[1], arguments[2]);
      return;
    }
    ui().calDay = ui().calDay === date ? null : date;
    ctx.render();
  }

  function openAddFromLibrary(date, athleteId, teamMode) {
    ui().calendarNotice = '';
    if (teamMode || (!athleteId && ui().view === 'team')) {
      ui().libPick = { date: date, teamId: ui().teamId, pickAthlete: true };
    } else {
      ui().libPick = { date: date, athleteId: athleteId, q: '' };
    }
    ctx.render();
  }

  function pickLibraryAthlete(athleteId) {
    var pick = ui().libPick;
    if (!pick || !pick.pickAthlete) return;
    var team = ctx.team(pick.teamId);
    if (!team || !(team.athleteIds || []).includes(athleteId) || !ctx.athleteBy(athleteId)) return;
    ui().libPick = { date: pick.date, athleteId: athleteId, q: '' };
    ctx.render();
  }

  function pickLibraryTemplate(tid) {
    var pick = ui().libPick;
    if (!pick || pick.pickAthlete) return;
    var template = ctx.tpl(tid);
    if (!template) return;
    var session;
    try {
      session = L().addCalendarSession(S(), {
        athleteId: pick.athleteId,
        date: pick.date,
        templateId: tid,
      });
    } catch (error) {
      pick.error = error.message;
      refreshLibraryResults();
      return;
    }
    if (!session) {pick.error='This session is already scheduled for this athlete and date.';refreshLibraryResults();return;}
    ui().calMonth = pick.date.slice(0,7);
    ui().calDay = pick.date;
    ui().calendarNotice = template.name + ' added for ' + ctx.athleteBy(pick.athleteId).name + ' on ' + pick.date + ' · unpublished coach assignment.';
    ui().libPick = null;
    persist();
    ctx.render();
  }

  function searchLibrary(q) {
    if (!ui().libPick) return;
    ui().libPick.q = String(q || '');
    refreshLibraryResults();
  }

  function setLibraryDate(date) {
    if (!ui().libPick) return;
    ui().libPick.date = date;
    ui().libPick.error = '';
    // Keep result buttons in place so date-field blur cannot swallow an Add click.
    document.querySelectorAll('[data-calendar-template]').forEach(function(button) {
      var pick = ui().libPick;
      var scheduled = (S().sessions || []).some(function(s) {return s.athleteId === pick.athleteId && s.date === pick.date && s.templateId === button.dataset.calendarTemplate;});
      button.disabled = scheduled;
      button.lastElementChild.textContent = scheduled ? 'Already scheduled' : '+ Add';
    });
    var status = document.getElementById('calendarLibraryStatus');
    if (status) status.textContent = '';
  }

  function libraryResults() {
    var pick = ui().libPick;
    if (!pick) return '';
    var q = String(pick.q || '').trim().toLowerCase();
    var templates = (S().templates || []).filter(function(t) {
      return (t.name + ' ' + (t.athleteTemplate ? t.athleteTemplate.title : '')).toLowerCase().includes(q);
    });
    return templates.map(function(t) {
      var scheduled = (S().sessions || []).some(function(s) {return s.athleteId === pick.athleteId && s.date === pick.date && s.templateId === t.id;});
      return '<button type="button" class="picker-item" data-calendar-template="' + esc(t.id) + '" onclick="CoachViews.pickLibraryTemplate(this.dataset.calendarTemplate)"' + (scheduled ? ' disabled' : '') + '><span><b>' + esc(t.name) + '</b>' + (t.athleteTemplate ? '<small style="display:block;color:var(--muted)">Strength draft is local only; assigns original coach session.</small>' : '') + '</span><span class="muted">' + (scheduled ? 'Already scheduled' : '+ Add') + '</span></button>';
    }).join('') || '<p class="muted">' + (S().templates.length ? 'No matching sessions.' : 'No session templates yet. Create one in the library.') + '</p>';
  }

  function refreshLibraryResults() {
    var list = document.getElementById('calendarLibraryResults');
    if (list) list.innerHTML = libraryResults();
    var status = document.getElementById('calendarLibraryStatus');
    if (status) status.textContent = ui().libPick.error || '';
  }

  function libraryPickOverlay() {
    var pick = ui().libPick;
    if (!pick) return '';
    if (pick.pickAthlete) {
      var team = ctx.team(pick.teamId);
      var athleteList = (team && team.athleteIds) || [];
      var athletes = athleteList
        .map(function (aid) {
          var a = ctx.athleteBy(aid);
          if (!a) return '';
          return (
            '<button type="button" class="picker-item" data-athlete-id="' +
            esc(aid) +
            '" onclick="CoachViews.pickLibraryAthlete(this.dataset.athleteId)"><span>' +
            esc(a.name) +
            '</span></button>'
          );
        })
        .join('');
      return '<div class="library-pick-overlay" onclick="if(event.target===this)ui.libPick=null;render()"><aside class="library-pick-drawer" role="dialog" aria-label="Choose athlete"><div class="library-pick-head"><b>Choose athlete</b><button class="btn ghost small" onclick="ui.libPick=null;render()">×</button></div><div class="library-pick-body"><p class="muted">' + esc(pick.date) + '</p><div class="picker-list">' + (athletes || '<div class="muted">No athletes on this team.</div>') + '</div></div></aside></div>';
    }
    var athlete = ctx.athleteBy(pick.athleteId);
    return '<div class="library-pick-overlay" onclick="if(event.target===this){ui.libPick=null;render()}"><aside class="library-pick-drawer" role="dialog" aria-label="Add From Library"><div class="library-pick-head"><b>Add From Library</b><button class="btn ghost small" aria-label="Close library picker" onclick="ui.libPick=null;render()">×</button></div><div class="library-pick-body"><input class="table-search" style="width:100%" aria-label="Search calendar sessions" placeholder="Search sessions…" value="' + esc(pick.q || '') + '" oninput="CoachViews.searchLibrary(this.value)"><div class="library-pick-tabs"><button disabled title="Use program assignment to schedule a program">PROGRAMS</button><button class="on" aria-current="page">SESSIONS</button><button disabled title="Parent calendar imports are not available">PARENT CALENDARS</button></div><p class="muted" style="margin-top:14px">Assign to ' + esc(athlete ? athlete.name : 'Choose athlete') + '</p><label class="field"><span>Session date</span><input type="date" aria-label="Session date" value="' + esc(pick.date) + '" onchange="CoachViews.setLibraryDate(this.value)"></label><p id="calendarLibraryStatus" role="status" class="muted">' + esc(pick.error || '') + '</p><div class="picker-list" id="calendarLibraryResults">' + libraryResults() + '</div></div></aside></div>';
  }

  function calendarShell(title, backView, backExtra, sessions, athleteId, teamMode) {
    var mk = monthKey();
    var grid = L().monthGridCells ? L().monthGridCells(mk) : L().monthDays(mk);
    var canPublish = L().hasUnpublished(sessions);
    var cells = grid
      .map(function (d) {
        if (!d) return '<div class="cal-day cal-pad" aria-hidden="true"></div>';
        var daySessions = sessions.filter(function (s) {
          return s.date === d;
        });
        return calDayCell(d, daySessions, athleteId, teamMode);
      })
      .join('');
    var dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      .map(function (d) {
        return '<div class="cal-dow">' + d + '</div>';
      })
      .join('');
    var mark = String(title || 'T').split(/\s+/).map(function (x) { return x[0]; }).join('').slice(0,3).toUpperCase();
    var manage = teamMode ? 'Manage Team' : 'Manage Athletes';
    return '<div class="fade-in calendar-page"><div class="calendar-hero"><div class="calendar-owner"><button class="btn ghost small" onclick="go(\'' + backView + '\'' + (backExtra ? ',' + backExtra : '') + ')">←</button><span class="team-mark">' + esc(mark) + '</span><div><b>' + esc(title) + '</b><span>' + (teamMode ? 'Team calendar' : 'Athlete calendar') + '</span></div></div><div class="calendar-actions"><button class="btn" onclick="CoachViews.manageCalendar()">' + manage + '</button><button class="btn primary" aria-label="Publish all"' + (canPublish ? '' : ' disabled') + ' onclick="CoachViews.publishAllVisible()">Publish All</button><button class="btn" title="Show Instructions" aria-label="Show calendar instructions" aria-pressed="'+!!ui().showCalendarInstructions+'" onclick="CoachViews.toggleCalendarInstructions()">◉</button><button class="btn" title="Add From Library" onclick="CoachViews.openAddFromLibrary(\'' + mk + '-01\',\'' + (athleteId || '') + '\',' + (!!teamMode) + ')">▣+</button></div></div>' +
      (ui().showCalendarInstructions?'<div class="card"><b>Calendar instructions</b><p>Choose a day to add a session from your library. Copies and repeats start unpublished with no logged results. Publish requires a linked athlete and Supabase coach access. Completed sessions are retained as history.</p></div>':'')+
      '<p class="muted" role="status">' + esc(ui().calendarNotice || '') + '</p><div class="calendar-monthbar"><button aria-label="Previous month" onclick="CoachViews.shiftCalMonth(-1)">‹</button><b>' + esc(L().monthLabel(mk)) + '</b><button aria-label="Next month" onclick="CoachViews.shiftCalMonth(1)">›</button></div>' +
      '<div class="cal-month"><div class="cal-dow-row">' + dow + '</div><div class="cal-grid">' + cells + '</div></div>' + libraryPickOverlay() + calendarPreview() + '</div>';
  }

  function publishAllVisible() {
    var view = ui().view;
    var list = [];
    if (view === 'athlete' && ui().athleteId) {
      list = L().calendarFor(S(), ui().athleteId, monthKey());
    } else if (view === 'team' && ui().teamId) {
      list = L().teamCalendar(S(), ui().teamId, monthKey());
    }
    publishAllForSessions(list.filter(function (s) {
      return !s.published && s.status !== 'completed';
    }));
  }

  function athleteCalHtml() {
    var a = ctx.athleteBy(ui().athleteId);
    if (!a) return athleteListHtml();
    if (!ui().calMonth) {
      var completed = (S().sessions || []).filter(function (s) { return s.athleteId === a.id && s.status === 'completed' && s.date; }).sort(function (x,y) { return x.date < y.date ? 1 : -1; });
      if (completed[0]) ui().calMonth = completed[0].date.slice(0,7);
    }
    var sessions = L().calendarFor(S(), a.id, monthKey());
    return calendarShell(a.name, 'athletes', '', sessions, a.id);
  }

  function teamCalHtml() {
    var t = ctx.team(ui().teamId);
    if (!t) return teamListHtml();
    if (!ui().calMonth) {
      var ids = new Set(t.athleteIds || []);
      var completed = (S().sessions || []).filter(function (s) { return ids.has(s.athleteId) && s.status === 'completed' && s.date; }).sort(function (x,y) { return x.date < y.date ? 1 : -1; });
      if (completed[0]) ui().calMonth = completed[0].date.slice(0,7);
    }
    var sessions = L().teamCalendar(S(), t.id, monthKey());
    return calendarShell(t.name, 'teams', '', sessions, '', true);
  }

  /* ---------- Nutrition N1–N3 ---------- */

  function nutritionHtml() {
    var N = root.CoachNutrition;
    if (!N) return '<div class="card muted">Nutrition module missing.</div>';
    var nut = N.ensureNutrition(S());
    var athletes = S().athletes || [];
    var aid = ui().nutAthleteId || (athletes[0] && athletes[0].id);
    var a = ctx.athleteBy(aid);
    var resolved = N.resolveActiveTargets(nut.targetsByAthlete[aid], null);
    var t = resolved.active;
    var opts = athletes
      .map(function (x) {
        return (
          '<option value="' +
          x.id +
          '"' +
          (x.id === aid ? ' selected' : '') +
          '>' +
          esc(x.name) +
          '</option>'
        );
      })
      .join('');
    var targets = t
      ? '<div class="card"><div class="eyebrow">Active targets</div><div class="metrics cols-4" style="margin-top:10px">' +
        '<div class="metric"><b>' +
        t.calories +
        '</b><span>kcal</span></div>' +
        '<div class="metric"><b>' +
        t.proteinG +
        'g</b><span>Protein</span></div>' +
        '<div class="metric"><b>' +
        t.carbsG +
        'g</b><span>Carbs</span></div>' +
        '<div class="metric"><b>' +
        t.fatG +
        'g</b><span>Fat</span></div></div>' +
        '<p class="muted" style="margin-top:8px">Source: ' +
        esc(resolved.reason) +
        '</p></div>'
      : '<div class="empty-panel"><div class="eyebrow">Targets</div><h2>No targets set</h2><p class="muted">Save an override below to set coach macros for this athlete.</p></div>';
    if (!athletes.length) {
      return (
        '<div class="empty-panel"><div class="eyebrow">Nutrition</div><h2>No athletes</h2>' +
        '<p class="muted">Add athletes to the roster before setting targets or meals.</p></div>'
      );
    }
    return (
      '<div class="fade-in"><div class="page-intro"><div class="eyebrow">Nutrition</div><h1>Coach targets & meals</h1>' +
      '<p class="lede">Manage local targets and meal days for ' +
      esc((a && a.name) || 'the selected athlete') +
      '. Cloud nutrition is bundled with published training sessions; saving here alone does not deliver it.</p></div><p id="nutritionStatus" class="muted" role="status">'+esc(ui().nutritionNotice||'')+'</p>' +
      '<div class="card" style="margin-bottom:16px"><div class="field" style="margin:0"><label>Athlete</label><select onchange="ui.nutAthleteId=this.value;render()">' +
      opts +
      '</select></div></div>' +
      targets +
      '<div class="card stack" style="margin-top:16px"><div class="eyebrow">Override macros</div>' +
      '<div class="rx-grid cols-4"><div class="field"><label>kcal</label><input id="nutKcal" type="number" value="' +
      esc(t ? t.calories : 2800) +
      '"></div>' +
      '<div class="field"><label>Protein (g)</label><input id="nutP" type="number" value="' +
      esc(t ? t.proteinG : 180) +
      '"></div>' +
      '<div class="field"><label>Carbs (g)</label><input id="nutC" type="number" value="' +
      esc(t ? t.carbsG : 300) +
      '"></div>' +
      '<div class="field"><label>Fat (g)</label><input id="nutF" type="number" value="' +
      esc(t ? t.fatG : 80) +
      '"></div></div>' +
      '<div class="row" style="justify-content:flex-start;gap:8px;flex-wrap:wrap;margin-top:4px">' +
      '<button type="button" class="btn primary" onclick="CoachViews.saveNutOverride()">Save override</button>' +
      '<button type="button" class="btn ghost small" onclick="CoachViews.clearNutOverride()">Clear override</button></div></div>' +
      '<div class="card stack" style="margin-top:16px"><div class="eyebrow">Meal day</div>' +
      '<div class="field"><label>Date</label><input id="nutMealDate" type="date" value="' +
      esc(L().today()) +
      '"></div>' +
      '<div class="field"><label>Meal title</label><input id="nutMealTitle" value="Training day"></div>' +
      '<div class="field"><label>Food line</label><input id="nutFoodLine" placeholder="Chicken breast · 200g"></div>' +
      '<button type="button" class="btn primary" onclick="CoachViews.addMealDay()">Save meal day for publishing</button></div><div class="card stack" style="margin-top:16px"><h2>Saved meal days</h2>'+(nut.mealDays||[]).filter(function(d){return d.athleteId===aid;}).slice().sort(function(a,b){return b.date.localeCompare(a.date);}).map(function(d){return '<div class="card"><b>'+esc(d.date)+'</b><span class="muted"> · Ready for session bundle</span>'+(d.meals||[]).map(function(m){return '<p><b>'+esc(m.title)+'</b> · '+esc(m.status)+'<br>'+(m.items||[]).map(function(i){return esc(i.name);}).join(', ')+'</p>';}).join('')+'</div>';}).join('')+'</div></div>'
    );
  }

  function saveNutOverride() {
    var N = root.CoachNutrition;
    var aid = ui().nutAthleteId || S().athletes[0].id;
    var el = function (id) {
      return document.getElementById(id);
    };
    if(!ctx.athleteBy(aid))return;
    var macros;
    try{macros=root.CoachTools.validateMacros({calories:el('nutKcal').value,proteinG:el('nutP').value,carbsG:el('nutC').value,fatG:el('nutF').value});}
    catch(e){document.getElementById('nutritionStatus').textContent=e.message;return;}
    N.setCoachOverride(N.ensureNutrition(S()), aid, macros);
    ui().nutritionNotice='Macro override saved locally. Publish a training session to include it in a cloud bundle.';
    persist();
    ctx.render();
    if (typeof root.showCoachToast === 'function') root.showCoachToast('Macro override saved.', 'ok');
  }

  function clearNutOverride() {
    var N = root.CoachNutrition;
    var aid = ui().nutAthleteId || S().athletes[0].id;
    N.clearCoachOverride(N.ensureNutrition(S()), aid);
    ui().nutritionNotice='Coach override cleared locally.';
    persist();
    ctx.render();
  }

  function addMealDay() {
    var N = root.CoachNutrition;
    var aid = ui().nutAthleteId || S().athletes[0].id;
    var titleEl = document.getElementById('nutMealTitle');
    var foodEl = document.getElementById('nutFoodLine');
    var dateEl = document.getElementById('nutMealDate');
    var mealDate = (dateEl && dateEl.value) || L().today();
    if(!ctx.athleteBy(aid)||!root.CoachTools.validDate(mealDate)||!titleEl.value.trim()||!foodEl.value.trim()){document.getElementById('nutritionStatus').textContent='Choose a valid date and enter a meal title and food line.';return;}
    var nutrition=N.ensureNutrition(S()),existing=(nutrition.mealDays||[]).find(function(d){return d.athleteId===aid&&d.date===mealDate;});
    var day = N.makeMealDay({
      athleteId: aid,
      date: mealDate,
      id:existing && existing.id,
      meals: (existing ? existing.meals : []).concat([
        N.makeMeal({
          title: titleEl.value.trim(),
          items: [
            N.makeMealItem({
              name: foodEl.value.trim(),
            }),
          ],
        }),
      ]),
    });
    N.publishMealDay(day);
    N.upsertMealDay(N.ensureNutrition(S()), day);
    ui().nutritionNotice='Meal saved locally for '+mealDate+'. Publish a training session to deliver the nutrition bundle.';
    persist();
    ctx.render();
    if (typeof root.showCoachToast === 'function') root.showCoachToast('Meal day saved locally.', 'ok');
  }

  function init(context) {
    ctx = context;
  }

  function bindState(state) {
    ctx.S = state;
  }

  root.CoachViews = {
    init: init,
    bindState: bindState,
    assignHtml: assignHtml,
    confirmAssign: confirmAssign,
    athleteListHtml: athleteListHtml,
    teamListHtml: teamListHtml,
    athleteCalHtml: athleteCalHtml,
    teamCalHtml: teamCalHtml,
    nutritionHtml: nutritionHtml,
    openCreateTeam: openCreateTeam,
    teamNameCount: teamNameCount,
    saveCreateTeam: saveCreateTeam,
    toggleAthleteSelected: toggleAthleteSelected,
    selectVisibleAthletes: selectVisibleAthletes,
    addAthleteTag: addAthleteTag,
    openAthleteProfile: openAthleteProfile,
    closeAthleteProfile: closeAthleteProfile,
    setAthleteProfileTab: setAthleteProfileTab,
    saveAthleteNotes: saveAthleteNotes,
    openInviteAthlete: openInviteAthlete,
    closeInviteAthlete: closeInviteAthlete,
    saveInviteAthlete: saveInviteAthlete,
    openTeamSettings: openTeamSettings,
    closeTeamSettings: closeTeamSettings,
    setTeamSettingsTab: setTeamSettingsTab,
    saveTeamSettings: saveTeamSettings,
    openTeamInvite: openTeamInvite,
    closeTeamInvite: closeTeamInvite,
    toggleTeamAthlete: toggleTeamAthlete,
    toggleChipMenu: toggleChipMenu,
    publishChip: publishChip,
    unpublishChip: unpublishChip,
    deleteChip: deleteChip,
    previewChip: previewChip,
    closeCalendarPreview:closeCalendarPreview,
    manageCalendar:manageCalendar,
    toggleCalendarInstructions:toggleCalendarInstructions,
    editChip: editChip,
    saveChipToLibrary: saveChipToLibrary,
    repeatChip: repeatChip,
    copyChip: copyChip,
    publishAllVisible: publishAllVisible,
    shiftCalMonth: shiftCalMonth,
    toggleCalDay: toggleCalDay,
    openAddFromLibrary: openAddFromLibrary,
    pickLibraryAthlete: pickLibraryAthlete,
    pickLibraryTemplate: pickLibraryTemplate,
    searchRoster: searchRoster,
    archiveSelectedAthletes: archiveSelectedAthletes,
    removeSelectedFromTeams: removeSelectedFromTeams,
    exportRoster: exportRoster,
    searchExerciseHistory: searchExerciseHistory,
    searchTeams: searchTeams,
    closeCreateTeam: closeCreateTeam,
    searchLibrary: searchLibrary,
    setLibraryDate: setLibraryDate,
    saveNutOverride: saveNutOverride,
    clearNutOverride: clearNutOverride,
    addMealDay: addMealDay,
    pushBridge: pushBridge,
    saveAthleteCloudId: saveAthleteCloudId,
  };
})(typeof window !== 'undefined' ? window : globalThis);
