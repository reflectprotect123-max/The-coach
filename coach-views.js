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
    if (!id) {
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
    var q = String(ui().rosterSearch || '').trim().toLowerCase();
    var group = ui().rosterGroup || 'all';
    var status = ui().rosterStatus || 'active';
    var list = all.filter(function (a) {
      if (q && String(a.name || '').toLowerCase().indexOf(q) < 0 && String(a.email || '').toLowerCase().indexOf(q) < 0) return false;
      if (status === 'invited' && a.status !== 'invited') return false;
      if (status === 'archived' && a.status !== 'archived') return false;
      if (status === 'active' && a.status === 'archived') return false;
      var memberships = (S().teams || []).filter(function (t) { return (t.athleteIds || []).indexOf(a.id) >= 0; });
      if (group === 'none' && memberships.length) return false;
      if (group.indexOf('team:') === 0 && !memberships.some(function (t) { return t.id === group.slice(5); })) return false;
      return true;
    });
    var selected = ui().rosterSelected || {};
    var selectedCount = Object.keys(selected).filter(function (id) { return selected[id]; }).length;
    var rows = list
      .map(function (a) {
        var memberships = (S().teams || []).filter(function (t) { return (t.athleteIds || []).indexOf(a.id) >= 0; });
        var initials = String(a.initials || a.name || 'A').split(/\s+/).map(function (x) { return x[0]; }).join('').slice(0, 2).toUpperCase();
        var checked = selected[a.id] ? ' checked' : '';
        return (
          '<tr><td><input type="checkbox" aria-label="Select ' + esc(a.name) + '"' + checked + ' onchange="CoachViews.toggleAthleteSelected(\'' + a.id + '\',this.checked)"></td><td><div class="roster-person"><span class="roster-avatar">' + initials + '</span><div><button type="button" class="linkish" onclick="CoachViews.openAthleteProfile(\'' +
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
      '<div class="fade-in"><div class="surface-titlebar"><h1>My Athletes</h1><div class="bulk-actions"><button type="button" class="btn small"' + (selectedCount ? '' : ' disabled') + '>Remove From Teams</button><button type="button" class="btn small"' + (selectedCount ? '' : ' disabled') + '>Archive</button><button type="button" class="btn primary small" onclick="CoachViews.openInviteAthlete()">Invite Athletes</button></div></div>' +
      '<div class="table-toolbar"><div class="table-toolbar-left"><div class="compact-filter"><label>GROUP</label><select aria-label="GROUP" onchange="ui.rosterGroup=this.value;render()"><option value="all">All Athletes (' + all.length + ')</option><option value="none"' + (group === 'none' ? ' selected' : '') + '>Athletes not on a Team</option>' + teamOptions + '</select></div>' +
      '<div class="compact-filter"><label>STATUS</label><select aria-label="STATUS" onchange="ui.rosterStatus=this.value;render()"><option value="active"' + (status === 'active' ? ' selected' : '') + '>Active</option><option value="invited"' + (status === 'invited' ? ' selected' : '') + '>Invited</option><option value="archived"' + (status === 'archived' ? ' selected' : '') + '>Archived</option></select></div></div>' +
      '<div class="table-toolbar-right"><input class="table-search" aria-label="Search athletes" placeholder="Search athletes" value="' + esc(ui().rosterSearch || '') + '" oninput="ui.rosterSearch=this.value;render()"><button class="table-icon-btn" title="Export">⋮</button></div></div>' +
      (rows
        ? '<div class="table-wrap"><table class="th-table data-table roster-table"><thead><tr><th><input type="checkbox" aria-label="Select visible athletes" onchange="CoachViews.selectVisibleAthletes(this.checked)"></th><th>Athlete Name</th><th>Actions</th><th>Athlete Type</th><th>Teams</th><th>Tags</th><th>Days Since Last Login</th></tr></thead><tbody>' +
          rows +
          '</tbody></table></div><div class="table-foot"><span class="rows-per-page">Rows per page: 100</span><span>1–' + n + ' of ' + n + '</span></div>'
        : '<div class="empty-panel"><div class="eyebrow">Roster</div><h2>No athletes yet</h2><p class="muted">Reset demo data to load the seeded roster, or add athletes from your workflow.</p></div>') +
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
    (S().athletes || []).forEach(function (a) { ui().rosterSelected[a.id] = !!checked; });
    ctx.render();
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
      var seen = {};
      var rows = [];
      (S().sessions || []).filter(function (s) { return s.athleteId === a.id; }).forEach(function (s) {
        (s.blocks || []).forEach(function (b) { (b.exercises || []).forEach(function (e) {
          if (seen[e.name]) return; seen[e.name] = true;
          var actual = L().actualLine ? L().actualLine(e) : '';
          rows.push('<div class="profile-ex-row"><span>' + esc(e.name) + '</span><b>' + esc(actual || '—') + '</b><span class="muted">Personal record</span></div>');
        }); });
      });
      body = '<input class="table-search" style="width:100%" placeholder="Search exercises">' + (rows.join('') || '<p class="muted" style="margin-top:14px">No exercise history yet.</p>');
    } else if (tab === 'circuits') body = '<div class="empty-panel"><h2>No circuit history</h2><p class="muted">Completed circuits will appear here.</p></div>';
    else if (tab === 'notes') body = '<div class="field"><label>Coach notes</label><textarea id="athlete-profile-notes" oninput="CoachViews.saveAthleteNotes(\'' + a.id + '\',this.value)">' + esc(a.coachNotes || '') + '</textarea></div>';
    else body = '<div class="stack"><div><label>Email</label><div>' + esc(a.email || 'Not set') + '</div></div><div><label>Supabase user id</label><input value="' + esc(a.cloudUserId || '') + '" placeholder="auth.users UUID" onchange="CoachViews.saveAthleteCloudId(\'' + a.id + '\',this.value)"></div><button class="btn small" onclick="bindMyCloudIdToAthlete(\'' + a.id + '\')">Link my signed-in account</button></div>';
    var tabs = ['exercises','circuits','notes','account'].map(function (x) { return '<button type="button" class="' + (tab === x ? 'on' : '') + '" onclick="CoachViews.setAthleteProfileTab(\'' + x + '\')">' + x + '</button>'; }).join('');
    return '<div class="profile-overlay" onclick="if(event.target===this)CoachViews.closeAthleteProfile()"><aside class="profile-drawer" role="dialog" aria-label="Athlete profile"><div class="profile-head"><span class="roster-avatar">' + initials + '</span><div style="flex:1"><b>' + esc(a.name) + '</b><div class="subline">Athlete profile</div></div><button class="btn ghost small" aria-label="Close athlete profile" onclick="CoachViews.closeAthleteProfile()">×</button></div><div class="profile-tabs">' + tabs + '</div><div class="profile-body">' + body + '</div></aside></div>';
  }

  function saveAthleteNotes(id, value) { var a = ctx.athleteBy(id); if (!a) return; a.coachNotes = String(value || ''); persist(); }

  function openInviteAthlete() { ui().inviteStep = 1; ctx.render(); }
  function closeInviteAthlete() { ui().inviteStep = 0; ctx.render(); }
  function inviteAthleteDialog() {
    if (!ui().inviteStep) return '';
    if (ui().inviteStep === 1) return '<div class="picker-overlay" onclick="if(event.target===this)CoachViews.closeInviteAthlete()"><div class="picker-panel" role="dialog" aria-label="Invite Athletes"><div class="row"><h2>Invite Athletes</h2><button class="btn ghost small" onclick="CoachViews.closeInviteAthlete()">×</button></div><p class="muted" style="margin-top:8px">Choose how you coach this athlete.</p><button class="picker-item" style="margin-top:14px" onclick="ui.inviteStep=2;render()"><span><b>1:1 Athlete</b><span class="subline">Manage an individual training calendar</span></span><span>›</span></button></div></div>';
    return '<div class="picker-overlay" onclick="if(event.target===this)CoachViews.closeInviteAthlete()"><div class="picker-panel" role="dialog" aria-label="Invite 1:1 Athlete"><h2>Invite a 1:1 Athlete</h2><div class="field"><label>Name</label><input id="invite-athlete-name" placeholder="Athlete name"></div><div class="field"><label>Email</label><input id="invite-athlete-email" type="email" placeholder="athlete@email.com"></div><div class="row" style="margin-top:16px"><button class="btn" onclick="CoachViews.closeInviteAthlete()">Cancel</button><button class="btn primary" onclick="CoachViews.saveInviteAthlete()">Send Invite</button></div></div></div>';
  }

  function saveInviteAthlete() {
    var nameEl = document.getElementById('invite-athlete-name');
    var emailEl = document.getElementById('invite-athlete-email');
    var name = String(nameEl && nameEl.value || '').trim();
    var email = String(emailEl && emailEl.value || '').trim();
    if (!name || !email) return;
    S().athletes.push({ id:L().uid('athlete'), name:name, email:email, status:'invited', tags:[] });
    ui().inviteStep = 0;
    persist();
    ctx.render();
  }

  function teamListHtml() {
    var rows = (S().teams || [])
      .map(function (t) {
        var owner = (S().coach && S().coach.name) || 'Coach';
        return (
          '<tr><td><input type="checkbox" aria-label="Select ' + esc(t.name) + '"></td><td><div class="roster-person"><span class="team-mark">HTS</span><div><button type="button" class="linkish" onclick="go(\'team\',{teamId:\'' + t.id + '\'})">' + esc(t.name) + '</button><div class="subline">' + esc(owner) + '</div></div></div></td>' +
          '<td><span class="status-dot"></span>' + (L().teamCalendar(S(), t.id, monthKey()) || []).length + '</td><td class="muted">' + esc(t.difficulty || 'Intermediate') + '</td><td>' + (t.athleteIds || []).length + '</td><td class="muted">' + esc(t.focus || '—') + '</td><td class="muted">' + esc(t.createdAt ? String(t.createdAt).slice(0,10) : '5/24/2026') + '</td>' +
          '<td><div class="table-actions"><button class="action-glyph" title="Calendar" aria-label="Calendar" onclick="go(\'team\',{teamId:\'' + t.id + '\'})">▣</button><button class="action-glyph" title="Message" disabled>□</button><button class="action-glyph" title="Team settings" onclick="CoachViews.openTeamSettings(\'' + t.id + '\')">⚙</button><button class="action-glyph" title="Invite athletes" onclick="CoachViews.openTeamInvite(\'' + t.id + '\')">⋮</button></div></td></tr>'
        );
      })
      .join('');
    return (
      '<div class="fade-in"><div class="surface-titlebar"><h1>My Teams</h1><button type="button" class="btn primary small" onclick="CoachViews.openCreateTeam()">Create Team</button></div>' +
      '<div class="table-toolbar"><div></div><div class="table-toolbar-right"><input class="table-search" aria-label="Search teams" placeholder="Search teams"><button class="table-icon-btn" title="Team options">⋮</button></div></div>' +
      (rows
        ? '<div class="table-wrap"><table class="th-table data-table roster-table"><thead><tr><th><input type="checkbox" aria-label="Select teams"></th><th>Title</th><th>Planned Sessions</th><th>Difficulty</th><th>Athletes</th><th>Focus</th><th>Created</th><th>Actions</th></tr></thead><tbody>' +
          rows +
          '</tbody></table></div><div class="table-foot"><span class="rows-per-page">Rows per page: 100</span><span>1–' + (S().teams || []).length + ' of ' + (S().teams || []).length + '</span></div>'
        : '<div class="empty-panel"><div class="eyebrow">Teams</div><h2>No teams yet</h2><p class="muted">Create a team, then open its calendar to assign programs.</p><div class="empty-actions"><button type="button" class="btn primary small" onclick="CoachViews.openCreateTeam()">Create Team</button></div></div>') +
      (ui().createTeam ? teamCreateDialog() : '') + teamSettingsDrawer() + teamInviteDialog() +
      '</div>'
    );
  }

  function teamCreateDialog() {
    return (
      '<div class="picker-overlay" onclick="if(event.target===this){ui().createTeam=false;ctx.render()}">' +
      '<div class="picker-panel team-create-dialog" role="dialog" aria-label="Create Team">' +
      '<h2>Create Team</h2>' +
      '<div class="field"><label>Team Name</label><input id="team-name-in" maxlength="75" oninput="CoachViews.teamNameCount(this)" placeholder="Team name">' +
      '<div class="muted" id="team-name-count">0/75</div></div>' +
      '<div class="row" style="margin-top:16px"><button type="button" class="btn" onclick="ui().createTeam=false;ctx.render()">Cancel</button>' +
      '<button type="button" class="btn primary" id="team-create-save" disabled onclick="CoachViews.saveCreateTeam()">Create Team</button></div>' +
      '</div></div>'
    );
  }

  function teamNameCount(el) {
    var n = String(el.value || '').length;
    var c = document.getElementById('team-name-count');
    if (c) c.textContent = n + '/75';
    var b = document.getElementById('team-create-save');
    if (b) b.disabled = n < 1;
  }

  function saveCreateTeam() {
    var el = document.getElementById('team-name-in');
    var name = el && el.value;
    if (!name || !String(name).trim()) return;
    S().teams.push({
      id: L().uid('team'),
      name: String(name).trim(),
      athleteIds: [],
      difficulty: 'Intermediate',
      createdAt: new Date().toISOString(),
    });
    ui().createTeam = false;
    persist();
    ctx.render();
  }

  function openCreateTeam() {
    ui().createTeam = true;
    ctx.render();
  }

  function openTeamSettings(id) { ui().teamSettingsId = id; ui().teamSettingsTab = 'general'; ctx.render(); }
  function closeTeamSettings() { ui().teamSettingsId = null; ctx.render(); }
  function setTeamSettingsTab(tab) { ui().teamSettingsTab = tab; ctx.render(); }
  function saveTeamSettings(id) {
    var t = ctx.team(id); if (!t) return;
    var name = document.getElementById('team-settings-name');
    var focus = document.getElementById('team-settings-focus');
    var difficulty = document.getElementById('team-settings-difficulty');
    if (name && String(name.value).trim()) t.name = String(name.value).trim();
    if (focus) t.focus = focus.value;
    if (difficulty) t.difficulty = difficulty.value;
    persist(); closeTeamSettings();
  }
  function teamSettingsDrawer() {
    var t = ctx.team(ui().teamSettingsId); if (!t) return '';
    var tab = ui().teamSettingsTab || 'general';
    var body = tab === 'general'
      ? '<div class="field"><label>Team Name</label><input id="team-settings-name" value="' + esc(t.name) + '"></div><div class="field"><label>Team Owner</label><select><option>' + esc((S().coach && S().coach.name) || 'Coach') + '</option></select></div><div class="field"><label>Sport/Focus Interest</label><input id="team-settings-focus" value="' + esc(t.focus || '') + '" placeholder="Strength & Conditioning"></div><div class="field"><label>Program Difficulty</label><select id="team-settings-difficulty"><option>Beginner</option><option' + ((t.difficulty || 'Intermediate') === 'Intermediate' ? ' selected' : '') + '>Intermediate</option><option>Advanced</option></select></div><div class="field"><label>Logo Image</label><div class="empty-panel" style="text-align:center">300 × 300</div></div><button class="btn primary block" style="margin-top:14px" onclick="CoachViews.saveTeamSettings(\'' + t.id + '\')">Save & Close</button>'
      : '<div class="empty-panel"><h2>Access Codes</h2><p class="muted">Athletes can enter an access code in the mobile app to join this team.</p><button class="btn primary small" style="margin-top:14px">Create New</button></div>';
    return '<div class="profile-overlay" onclick="if(event.target===this)CoachViews.closeTeamSettings()"><aside class="profile-drawer" role="dialog" aria-label="Team settings"><div class="profile-head"><div style="flex:1"><b>' + esc(t.name) + '</b><div class="subline">Team settings</div></div><button class="btn ghost small" onclick="CoachViews.closeTeamSettings()">×</button></div><div class="profile-tabs"><button class="' + (tab === 'general' ? 'on' : '') + '" onclick="CoachViews.setTeamSettingsTab(\'general\')">General</button><button class="' + (tab === 'access' ? 'on' : '') + '" onclick="CoachViews.setTeamSettingsTab(\'access\')">Access Codes</button></div><div class="profile-body">' + body + '</div></aside></div>';
  }

  function openTeamInvite(id) { ui().teamInviteId = id; ctx.render(); }
  function closeTeamInvite() { ui().teamInviteId = null; ctx.render(); }
  function teamInviteDialog() {
    var t = ctx.team(ui().teamInviteId); if (!t) return '';
    var members = new Set(t.athleteIds || []);
    var rows = (S().athletes || []).map(function (a) { return '<label class="picker-item"><span>' + esc(a.name) + '</span><input type="checkbox"' + (members.has(a.id) ? ' checked' : '') + ' onchange="CoachViews.toggleTeamAthlete(\'' + t.id + '\',\'' + a.id + '\',this.checked)"></label>'; }).join('');
    return '<div class="picker-overlay" onclick="if(event.target===this)CoachViews.closeTeamInvite()"><div class="picker-panel" role="dialog" aria-label="Invite Athletes to Team"><div class="row"><h2>Invite Athletes</h2><button class="btn ghost small" onclick="CoachViews.closeTeamInvite()">×</button></div><p class="muted" style="margin-top:6px">' + esc(t.name) + '</p><div class="picker-list">' + rows + '</div></div></div>';
  }
  function toggleTeamAthlete(teamId, athleteId, checked) {
    var t = ctx.team(teamId); if (!t) return;
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

  function previewChip(id) { var s = ctx.ses(id); if (!s) return; ui().chipMenu = null; alert((s.sessionTitle || s.name) + '\n' + (s.blocks || []).length + ' blocks'); }
  function editChip(id) { var s = ctx.ses(id); if (!s || !s.templateId) return; ui().chipMenu = null; root.openSession(s.templateId); }
  function saveChipToLibrary(id) {
    var s = ctx.ses(id); if (!s) return;
    var t = L().makeTemplate({ name:(s.sessionTitle || s.name) + ' (copy)', coachInstructions:s.coachInstructions || '', blocks:JSON.parse(JSON.stringify(s.blocks || [])) });
    S().templates.push(t); ui().chipMenu = null; persist(); ctx.render();
  }
  function cloneCalendarSession(id, days) {
    var s = ctx.ses(id); if (!s) return;
    var copy = JSON.parse(JSON.stringify(s)); copy.id = L().uid('session'); copy.date = L().addDays(s.date, days); copy.published = false; copy.status = 'scheduled'; delete copy.cloudAssignedId; delete copy.publishedAt;
    S().sessions.push(copy); ui().chipMenu = null; persist(); ctx.render();
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
        .catch(function () {})
        .finally(removeLocal);
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
    if (teamMode || (!athleteId && ui().view === 'team')) {
      ui().libPick = { date: date, teamId: ui().teamId, pickAthlete: true };
    } else {
      ui().libPick = { date: date, athleteId: athleteId };
    }
    ctx.render();
  }

  function pickLibraryAthlete(athleteId) {
    var pick = ui().libPick;
    if (!pick || !pick.pickAthlete) return;
    ui().libPick = { date: pick.date, athleteId: athleteId };
    ctx.render();
  }

  function pickLibraryTemplate(tid) {
    var pick = ui().libPick;
    if (!pick) return;
    L().addCalendarSession(S(), {
      athleteId: pick.athleteId,
      date: pick.date,
      templateId: tid,
    });
    ui().libPick = null;
    persist();
    ctx.render();
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
            '<button type="button" class="picker-item" onclick="CoachViews.pickLibraryAthlete(\'' +
            aid +
            '\')"><span>' +
            esc(a.name) +
            '</span></button>'
          );
        })
        .join('');
      return '<div class="library-pick-overlay" onclick="if(event.target===this)ui.libPick=null;render()"><aside class="library-pick-drawer" role="dialog" aria-label="Choose athlete"><div class="library-pick-head"><b>Choose athlete</b><button class="btn ghost small" onclick="ui.libPick=null;render()">×</button></div><div class="library-pick-body"><p class="muted">' + esc(pick.date) + '</p><div class="picker-list">' + (athletes || '<div class="muted">No athletes on this team.</div>') + '</div></div></aside></div>';
    }
    var list = (S().templates || [])
      .map(function (t) {
        return (
          '<button type="button" class="picker-item" onclick="CoachViews.pickLibraryTemplate(\'' +
          t.id +
          '\')"><span>' +
          esc(t.name) +
          '</span></button>'
        );
      })
      .join('');
    return '<div class="library-pick-overlay" onclick="if(event.target===this)ui.libPick=null;render()"><aside class="library-pick-drawer" role="dialog" aria-label="Add From Library"><div class="library-pick-head"><b>Add From Library</b><button class="btn ghost small" onclick="ui.libPick=null;render()">×</button></div><div class="library-pick-body"><input class="table-search" style="width:100%" placeholder="Search For..."><div class="library-pick-tabs"><button class="on">PROGRAMS</button><button>SESSIONS</button><button>PARENT CALENDARS</button></div><p class="muted" style="margin-top:14px">Sessions · ' + esc(pick.date) + '</p><div class="picker-list">' + list + '</div></div></aside></div>';
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
    return '<div class="fade-in calendar-page"><div class="calendar-hero"><div class="calendar-owner"><button class="btn ghost small" onclick="go(\'' + backView + '\'' + (backExtra ? ',' + backExtra : '') + ')">←</button><span class="team-mark">' + esc(mark) + '</span><div><b>' + esc(title) + '</b><span>' + (teamMode ? 'Team calendar' : 'Athlete calendar') + '</span></div></div><div class="calendar-actions"><button class="btn">' + manage + '</button><button class="btn primary" aria-label="Publish all"' + (canPublish ? '' : ' disabled') + ' onclick="CoachViews.publishAllVisible()">Publish All</button><button class="btn" title="Show Instructions">◉</button><button class="btn" title="Add From Library" onclick="CoachViews.openAddFromLibrary(\'' + mk + '-01\',\'' + (athleteId || '') + '\',' + (!!teamMode) + ')">▣+</button></div></div>' +
      '<div class="calendar-monthbar"><button aria-label="Previous month" onclick="CoachViews.shiftCalMonth(-1)">‹</button><b>' + esc(L().monthLabel(mk)) + '</b><button aria-label="Next month" onclick="CoachViews.shiftCalMonth(1)">›</button></div>' +
      '<div class="cal-month"><div class="cal-dow-row">' + dow + '</div><div class="cal-grid">' + cells + '</div></div>' + libraryPickOverlay() + '</div>';
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
      '<p class="lede">Override macros and publish a meal day for ' +
      esc((a && a.name) || 'the selected athlete') +
      '.</p></div>' +
      '<div class="card" style="margin-bottom:16px"><div class="field" style="margin:0"><label>Athlete</label><select onchange="ui.nutAthleteId=this.value;render()">' +
      opts +
      '</select></div></div>' +
      targets +
      '<div class="card stack" style="margin-top:16px"><div class="eyebrow">Override macros</div>' +
      '<div class="rx-grid cols-4"><div class="field"><label>kcal</label><input id="nutKcal" type="number" value="' +
      esc((t && t.calories) || 2800) +
      '"></div>' +
      '<div class="field"><label>Protein (g)</label><input id="nutP" type="number" value="' +
      esc((t && t.proteinG) || 180) +
      '"></div>' +
      '<div class="field"><label>Carbs (g)</label><input id="nutC" type="number" value="' +
      esc((t && t.carbsG) || 300) +
      '"></div>' +
      '<div class="field"><label>Fat (g)</label><input id="nutF" type="number" value="' +
      esc((t && t.fatG) || 80) +
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
      '<button type="button" class="btn primary" onclick="CoachViews.addMealDay()">Add meal & publish day</button></div></div>'
    );
  }

  function saveNutOverride() {
    var N = root.CoachNutrition;
    var aid = ui().nutAthleteId || S().athletes[0].id;
    var el = function (id) {
      return document.getElementById(id);
    };
    N.setCoachOverride(N.ensureNutrition(S()), aid, {
      calories: Number(el('nutKcal') && el('nutKcal').value) || 0,
      proteinG: Number(el('nutP') && el('nutP').value) || 0,
      carbsG: Number(el('nutC') && el('nutC').value) || 0,
      fatG: Number(el('nutF') && el('nutF').value) || 0,
    });
    persist();
    ctx.render();
    if (typeof root.showCoachToast === 'function') root.showCoachToast('Macro override saved.', 'ok');
  }

  function clearNutOverride() {
    var N = root.CoachNutrition;
    var aid = ui().nutAthleteId || S().athletes[0].id;
    N.clearCoachOverride(N.ensureNutrition(S()), aid);
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
    var day = N.makeMealDay({
      athleteId: aid,
      date: mealDate,
      meals: [
        N.makeMeal({
          title: (titleEl && titleEl.value) || 'Meal',
          items: [
            N.makeMealItem({
              name: (foodEl && foodEl.value) || 'Food',
            }),
          ],
        }),
      ],
    });
    N.publishMealDay(day);
    N.upsertMealDay(N.ensureNutrition(S()), day);
    persist();
    ctx.render();
    if (typeof root.showCoachToast === 'function') root.showCoachToast('Meal day saved and published.', 'ok');
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
    saveNutOverride: saveNutOverride,
    clearNutOverride: clearNutOverride,
    addMealDay: addMealDay,
    pushBridge: pushBridge,
    saveAthleteCloudId: saveAthleteCloudId,
  };
})(typeof window !== 'undefined' ? window : globalThis);
