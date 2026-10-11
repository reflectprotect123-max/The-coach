
(function(root) {
 const ratings=['very_easy','easy','average','hard','max_effort'];
 root.DemoLoadEngine={next({kg,reps,miss,effort,target,minReps}) {
  const actual=ratings.indexOf(effort),desired=ratings.indexOf(target);
  const below=Number.isFinite(minReps) && reps<minReps;
  let change=0,reason='No target difficulty: keep the same weight.';
  if (miss || below) {change=-2;reason=miss?'Set incomplete':'Below the prescribed rep range';}
  else if (actual>=0 && desired>=0) {
   change=Math.max(-2,Math.min(2,desired-actual));
   reason=change>0?'Easier than the target':change<0?'Harder than the target':'Matched the target';
  }
  const nextKg=Math.max(0,Math.round((kg+change)*100)/100);
  const delta=Math.round((nextKg-kg)*100)/100;
  return {kg:nextKg,delta,target,actual:effort,reason:`${reason} → ${nextKg} kg next set (${delta>0?'+':''}${delta} kg).`};
 }};
})(window);
