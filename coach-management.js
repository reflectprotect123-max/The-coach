(function(root) {
  function rosterMatches(state,athlete,filters) {
    const q=String(filters.rosterSearch || '').trim().toLowerCase();
    const status=filters.rosterStatus || 'active',group=filters.rosterGroup || 'all';
    if(q && !`${athlete.name || ''} ${athlete.email || ''}`.toLowerCase().includes(q)) return false;
    if(status==='archived' && athlete.status!=='archived') return false;
    if(status==='invited' && athlete.status!=='invited') return false;
    if(status==='active' && ['archived','invited'].includes(athlete.status)) return false;
    const teams=(state.teams || []).filter(t=>(t.athleteIds || []).includes(athlete.id));
    if(group==='none' && teams.length) return false;
    if(group.startsWith('team:') && !teams.some(t=>t.id===group.slice(5))) return false;
    return true;
  }
  function selectedAthletes(state,selected) {return (state.athletes || []).filter(a=>selected?.[a.id]);}
  function archiveAthletes(state,ids,restore=false) {
    for(const athlete of state.athletes || []) {
      if(!ids.includes(athlete.id)) continue;
      if(restore && athlete.status==='archived') {
        athlete.status=athlete.preArchiveStatus || 'active';delete athlete.preArchiveStatus;delete athlete.archivedAt;
      } else if(!restore && athlete.status!=='archived') {
        athlete.preArchiveStatus=athlete.status || 'active';athlete.status='archived';athlete.archivedAt=new Date().toISOString();
      }
    }
  }
  function removeFromTeams(state,ids) {
    for(const team of state.teams || []) team.athleteIds=(team.athleteIds || []).filter(id=>!ids.includes(id));
  }
  function exerciseHistory(state,athleteId) {
    const latest=new Map();
    const sessions=(state.sessions || []).filter(s=>s.athleteId===athleteId).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    for(const session of sessions) for(const block of session.blocks || []) for(const exercise of block.exercises || []) {
      const rows=(exercise.rows || []).filter(row=>row.done);
      const key=exercise.exerciseId || exercise.name;
      if(!rows.length || latest.has(key)) continue;
      const reps=rows.map(row=>row.reps==null || row.reps===''?'–':row.reps).join(',');
      const hasLoad=rows.some(row=>String(row.weight ?? '').trim()!=='');
      const actual=hasLoad?`${reps} @ ${rows.map(row=>row.weight==null || row.weight===''?'–':row.weight).join(',')}kg`:reps;
      latest.set(key,{name:exercise.name,date:session.date,actual});
    }
    return [...latest.values()].sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  }
  function selfAthleteIds(state) {
    const account=(state.accounts || []).find(a=>a.id===state.currentUserId);
    if(!account) return [];
    return (state.athletes || []).filter(a=>a.id===account.athleteId || (a.email && account.email && a.email.toLowerCase()===account.email.toLowerCase())).map(a=>a.id);
  }
  function feedSessions(state,filters) {
    const filter=filters.filterAthlete || 'all',athletes=state.athletes || [];
    const members=new Set((state.teams || []).flatMap(t=>t.athleteIds || []));
    const self=new Set(selfAthleteIds(state));
    const team=(state.teams || []).find(t=>`team:${t.id}`===filter);
    return (state.sessions || []).filter(s=>{
      if(filters.homeMode==='date' && s.date!==filters.homeDate) return false;
      if(filter==='all') return true;
      if(filter==='1to1') return !members.has(s.athleteId);
      if(filter==='me') return self.has(s.athleteId);
      if(filter==='new') return athletes.some(a=>a.id===s.athleteId&&(a.isNew || a.status==='invited'));
      if(filter.startsWith('team:')) return !!team && (team.athleteIds || []).includes(s.athleteId);
      return s.athleteId===filter;
    });
  }
  function appendCoachComment(session,text,coachId) {
    const body=String(text || '').trim();
    if(!body || body.length>4000) return false;
    const comments=session.coachComments ? session.coachComments.slice() : session.comment?.text ? [session.comment] : [];
    const comment={text:body,at:new Date().toISOString(),coachId};
    comments.push(comment);session.coachComments=comments;session.comment=comment;return true;
  }
  const api={rosterMatches,selectedAthletes,archiveAthletes,removeFromTeams,exerciseHistory,selfAthleteIds,feedSessions,appendCoachComment};
  root.CoachManagement=api;if(typeof module==='object') module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
