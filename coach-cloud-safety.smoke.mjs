import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Cloud=require('./coach-cloud.js');
function backend(initial,options={}){
  let row=initial?{...initial}:null,writes=0;
  class Query{
    constructor(){this.action='read';this.filters=[];this.exclusions=[];}
    select(){return this;}
    eq(key,value){this.filters.push([key,value]);return this;}
    neq(key,value){this.exclusions.push([key,value]);return this;}
    async in(){return {data:row?[row]:[],error:null};}
    update(patch){this.action='update';this.patch=patch;return this;}
    insert(value){this.action='insert';this.patch=value;return this;}
    single(){return this.maybeSingle();}
    async maybeSingle(){
      if(options.error)return {error:{message:'write denied'},data:null};
      if(this.action==='read')return {data:row,error:null};
      if(options.completeDuringUpdate&&this.action==='update')row.state='completed';
      if(this.action==='update'&&(!row||!this.filters.every(([k,v])=>row[k]===v)||!this.exclusions.every(([k,v])=>row[k]!==v)))return {data:null,error:null};
      writes++;row=this.action==='insert'?{...this.patch}:{...row,...this.patch};return {data:{id:row.id},error:null};
    }
  }
  globalThis.Whoop={client:()=>({auth:{getSession:async()=>({data:{session:{user:{id:'coach'}}},error:null})},from:()=>new Query()})};
  return {row:()=>row,writes:()=>writes};
}
const state=()=>({athletes:[{id:'a',cloudUserId:'athlete'}],sessions:[{id:'s',athleteId:'a',date:'2026-10-10',name:'Planned',published:true,status:'scheduled',cloudAssignedId:'wrong-local-id',blocks:[]}]});
let fixture=state(),db=backend({id:'real-cloud-id',state:'published'});
let result=await Cloud.pushPublished(fixture);
assert.equal(result.pushed,1);assert.equal(db.writes(),1);assert.equal(fixture.sessions[0].cloudAssignedId,'real-cloud-id');
fixture=state();db=backend({id:'done-cloud-id',state:'completed'});result=await Cloud.pushPublished(fixture);
assert.equal(result.pushed,0);assert.equal(result.skipped,1);assert.equal(db.writes(),0);assert.equal(db.row().state,'completed');
fixture=state();db=backend({id:'race-cloud-id',state:'published'},{completeDuringUpdate:true});result=await Cloud.pushPublished(fixture);
assert.equal(result.skipped,1);assert.equal(db.writes(),0);assert.equal(db.row().state,'completed');
fixture=state();fixture.sessions[0].status='completed';db=backend(null);result=await Cloud.pushPublished(fixture);assert.equal(result.pushed,0);assert.equal(db.writes(),0);
fixture=state();fixture.sessions[0].cloudAssignedId='protected';db=backend({id:'protected',state:'completed'});
result=await Cloud.unpublishSession(fixture,fixture.sessions[0]);assert.equal(result.ok,false);assert.equal(fixture.sessions[0].published,true);assert.equal(db.writes(),0);
db=backend({id:'protected',state:'published'},{error:true});result=await Cloud.unpublishSession(fixture,fixture.sessions[0]);assert.equal(result.ok,false);assert.equal(fixture.sessions[0].published,true);
db=backend({id:'protected',state:'published'});result=await Cloud.unpublishSession(fixture,fixture.sessions[0]);assert.equal(result.ok,true);assert.equal(fixture.sessions[0].published,false);
db=backend({id:'protected',state:'completed'});result=await Cloud.refreshPublishedStates(fixture);assert.equal(result.updated,1);
result=await Cloud.refreshPublishedStates(fixture);assert.equal(result.updated,0,'completed-state refresh must not trigger an endless render loop');
delete globalThis.Whoop;
console.log('Cloud completed-record protection, race guards, assignment IDs, and failed-unpublish retention passed (mock backend)');
