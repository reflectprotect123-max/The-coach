import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),T=require('./coach-tools.js'),L=require('./coach-loop.js');
const fixture={athletes:[{id:'a',name:'Athlete'},{id:'b',name:'No logs'}],sessions:[{id:'done',athleteId:'a',date:'2026-10-01',status:'completed',minutes:0,readiness:0,blocks:[{complete:true,exercises:[{sets:1,reps:'5',rows:[{done:true,weight:100,reps:5}]}]}]},{athleteId:'a',date:'2026-10-02',status:'scheduled',minutes:99,blocks:[]}]};
const snapshot=JSON.stringify(fixture),rows=T.analytics(fixture);
assert.deepEqual(rows[0],{id:'a',name:'Athlete',scheduled:2,completed:1,completion:50,minutes:0,readiness:0,volume:500,sets:1});
assert.equal(rows[1].readiness,null);assert.equal(rows[1].completion,null);
assert.equal(T.analytics(fixture,{from:'2026-10-02'})[0].completed,0);
assert.equal(JSON.stringify(fixture),snapshot);
const p={weeks:3,cells:{'1-1':'template','3-7':'later'}};
assert.throws(()=>T.resizeProgram(p,1),/Later weeks/);assert.equal(p.weeks,3);
assert.throws(()=>T.resizeProgram(p,1.5),/whole number/);
T.resizeProgram(p,1,true);assert.deepEqual(p.cells,{'1-1':'template'});
const source={...fixture.sessions[0],templateId:'tpl',name:'Session',comment:{text:'old'},cloudAssignedId:'cloud'};
const copied=T.freshCalendarCopy(source,L,7);
assert.equal(copied.date,'2026-10-08');assert.equal(copied.published,false);assert.equal(copied.status,'scheduled');
assert.equal(copied.cloudAssignedId,undefined);assert.equal(copied.comment,null);assert.equal(copied.minutes,null);
assert.equal(copied.blocks[0].complete,false);assert.equal(copied.blocks[0].exercises[0].rows[0].done,false);
assert.equal(copied.blocks[0].exercises[0].rows[0].weight,'');
assert.equal(JSON.stringify(fixture),snapshot);
assert.throws(()=>T.validateMacros({calories:2000,proteinG:-1,carbsG:100,fatG:0}),/non-negative/);
assert.throws(()=>T.validateMacros({calories:'',proteinG:0,carbsG:0,fatG:0}),/non-negative/);
assert.deepEqual(T.validateMacros({calories:'2000',proteinG:'0',carbsG:'100',fatG:'0'}),{calories:2000,proteinG:0,carbsG:100,fatG:0});
assert.equal(T.validDate('2026-02-30'),false);assert.equal(T.validDate('2028-02-29'),true);
const sheetState={testingSheets:[],athletes:[{id:'a',name:'=unsafe,"name"'}]},sheet=T.newSheet(sheetState,L);
sheet.athleteIds=['a'];sheet.columns=[{id:'c',name:'Test'}];sheet.results={a:{c:'@unsafe'}};
assert.match(T.sheetCsv(sheet,sheetState),/"'=unsafe,""name"""/);assert.match(T.sheetCsv(sheet,sheetState),/"'@unsafe"/);
console.log('Analytics, protected program resizing, clean calendar copies, and nutrition validation passed');

if(process.env.COACH_BROWSER_URL){
  const {chromium}=require('playwright');
  const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.COACH_BROWSER_URL);await page.getByRole('button',{name:'Demo coach (offline)'}).click();
    await page.getByRole('button',{name:'Analytics',exact:true}).click();await page.getByRole('button',{name:'Training Summary Single Athlete',exact:true}).click();
    await page.getByLabel('From',{exact:true}).fill('2026-08-01');
    await page.getByRole('button',{name:'Gym Tools',exact:true}).click();await page.getByRole('button',{name:'Launch Rest Timer',exact:true}).click();await page.getByLabel('Rest duration (seconds)').fill('2');
    await page.getByRole('heading',{name:'Rest timer',exact:true}).click();await page.getByRole('button',{name:'Start',exact:true}).click();
    await page.getByText('Rest finished.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Reset',exact:true}).click();assert.equal(await page.locator('#coachRestClock').textContent(),'00:02');
    await page.getByRole('button',{name:'← Gym Tools',exact:true}).click();await page.getByRole('button',{name:'Launch Spreadsheets'}).click();await page.getByRole('button',{name:'Create spreadsheet'}).click();
    await page.getByRole('checkbox',{name:'Include Dan Veldman',exact:true}).check();
    await page.getByRole('button',{name:'Add benchmark',exact:true}).click();await page.locator('[data-column-id]').first().fill('120kg');
    await page.getByRole('checkbox',{name:'Include Dan Veldman',exact:true}).uncheck();await page.getByRole('checkbox',{name:'Include Dan Veldman',exact:true}).check();assert.equal(await page.locator('[data-column-id]').first().inputValue(),'120kg');
    const sheetSnapshot=await page.evaluate(()=>JSON.stringify(S.testingSheets));await page.reload();assert.equal(await page.evaluate(()=>JSON.stringify(S.testingSheets)),sheetSnapshot);
    await page.getByRole('button',{name:'Coach settings',exact:true}).click();await page.getByLabel('Display name').fill('Release Coach');
    await page.getByRole('button',{name:'Save profile',exact:true}).click();await page.getByText('Profile saved on this device.',{exact:true}).waitFor();
    const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Download local backup'}).click();assert.equal((await downloaded).suggestedFilename(),'the-coach-backup.json');
    await page.evaluate(()=>go('library',{lib:'exercises'}));const search=page.getByRole('textbox',{name:'Search exercises',exact:true});await search.fill('squat');assert.equal(await search.evaluate(el=>document.activeElement===el),true);
    await page.getByRole('button',{name:'New exercise',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Exercise details'});
    await dialog.getByLabel('Name',{exact:true}).fill('Release custom lift');await dialog.getByLabel('Video URL (optional)').fill('javascript:alert(1)');
    await dialog.getByRole('button',{name:'Save details'}).click();await dialog.getByText('Enter an HTTP or HTTPS video URL.').waitFor();
    await dialog.getByLabel('Video URL (optional)').fill('https://example.com/demo');await dialog.getByRole('button',{name:'Save details'}).click();
    await page.getByRole('button',{name:'Release custom lift',exact:true}).waitFor();
    await page.evaluate(()=>go('nutrition'));
    await page.locator('#nutP').fill('-2');await page.getByRole('button',{name:'Save override'}).click();await page.getByText('Enter non-negative numbers for all four targets.').waitFor();
    await page.locator('#nutP').fill('0');await page.getByRole('button',{name:'Save override'}).click();assert.equal(await page.locator('#nutP').inputValue(),'0');
    await page.locator('#nutFoodLine').fill('Food one');await page.getByRole('button',{name:'Save meal day for publishing'}).click();
    await page.locator('#nutFoodLine').fill('Food two');await page.getByRole('button',{name:'Save meal day for publishing'}).click();
    assert.equal(await page.evaluate(()=>S.nutrition.mealDays.find(d=>d.date===CoachLoop.today()).meals.length),2);
    await page.evaluate(()=>{openProgram(S.programs[0].id);ui.programSettings=true;render();});await page.locator('#program-settings-difficulty').selectOption('Advanced');
    await page.getByRole('button',{name:'Save & Close',exact:true}).click();assert.equal(await page.evaluate(()=>S.programs[0].difficulty),'Advanced');
    await page.getByTitle('Preview program',{exact:true}).click();await page.getByRole('dialog',{name:'Program preview'}).waitFor();await page.getByRole('button',{name:'Close program preview'}).click();
    await page.evaluate(()=>{go('athlete',{athleteId:S.athletes[0].id});CoachViews.previewChip(S.sessions.find(s=>s.athleteId===S.athletes[0].id).id);});await page.getByRole('dialog',{name:'Session preview'}).waitFor();await page.getByRole('button',{name:'Close session preview'}).click();
    await page.getByRole('button',{name:'Show calendar instructions'}).click();await page.getByText('Calendar instructions',{exact:true}).waitFor();
    await page.reload();assert.equal(await page.evaluate(()=>S.coach.name),'Release Coach');
    for(const report of ['Readiness','Performance','Lift History','Training Summary','Compliance','Lift Progress']){await page.evaluate(name=>{go('analytics');CoachTools.openReport(name);},report);await page.getByRole('heading',{name:report,exact:true}).waitFor();}
    for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
      await page.setViewportSize(viewport);
      for(const view of ['home','athletes','teams','library','nutrition','analytics','gym','account']){
        await page.evaluate(v=>go(v),view);assert.equal(await page.locator('#coachApp').isVisible(),true);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${view} overflows viewport ${viewport.width}`);
      }
    }
    assert.deepEqual(errors,[]);console.log('Remaining coach screens, timer, backup, metadata, nutrition, preview and mobile checks passed');
  }finally{await browser.close();}
}
