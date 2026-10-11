import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const html=readFileSync(new URL('./coach.html',import.meta.url),'utf8');
const css=readFileSync(new URL('./coach-layout.css',import.meta.url),'utf8');
assert.ok(html.includes('href="coach-layout.css"'));
assert.ok(css.includes('--coach-rail-width: 256px'));
assert.ok(css.includes('--tap: 44px'));
assert.ok(html.includes('aria-controls="coachNavigation"'));
assert.ok(html.includes('Skip to coach content'));
console.log('Readable sidebar, larger controls and navigation semantics present');
if(process.env.COACH_BROWSER_URL){
  const {chromium}=require('playwright');
  const browser=await chromium.launch({headless:true,args:['--no-sandbox'],executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.COACH_BROWSER_URL);await page.getByRole('button',{name:'Demo coach (offline)'}).click();
    assert.equal(await page.locator('.coach-header').count(),0,'the horizontal black header must be gone');
    const sidebar=page.locator('.coach-side');assert.equal(Math.round((await sidebar.boundingBox()).width),256);
    assert.equal(await page.locator('.coach-side .coach-profile-link').count(),1);
    for(const button of await page.locator('.coach-side nav button').all()){
      const box=await button.boundingBox();assert.ok(box.height>=44);assert.ok(box.width>180);
      assert.ok(await button.evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=14));
    }
    await page.getByRole('button',{name:'Athletes',exact:true}).click();
    assert.equal(await page.locator('[data-nav="athletes"]').getAttribute('aria-current'),'page');
    for(const button of await page.locator('.action-glyph').all())assert.ok((await button.boundingBox()).height>=44);
    for(const width of [320,375,640,768,980,981,1024,1280,1440,1920]){
      await page.setViewportSize({width,height:900});
      for(const view of ['home','athletes','teams','library','nutrition','analytics','gym','account']){
        await page.evaluate(v=>go(v),view);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${view} document overflow at ${width}px`);
      }
      if(width<=980){
        assert.equal(await sidebar.isVisible(),false);
        await page.getByRole('button',{name:'Open coach navigation'}).click();
        const drawer=page.getByRole('dialog',{name:'Coach navigation',exact:true});await drawer.waitFor();
        assert.ok(await drawer.evaluate(el=>el.contains(document.activeElement)),'focus must move into the navigation drawer');
        const focusable=drawer.locator('button:not([disabled]):visible');await focusable.last().focus();await page.keyboard.press('Tab');
        assert.ok(await focusable.first().evaluate(el=>el===document.activeElement),'keyboard focus must stay in the drawer');
        await page.keyboard.press('Escape');assert.equal(await drawer.count(),0);
        assert.ok(await page.getByRole('button',{name:'Open coach navigation'}).evaluate(el=>el===document.activeElement));
        await page.getByRole('button',{name:'Open coach navigation'}).click();await page.getByRole('button',{name:'Athletes',exact:true}).click();
        assert.equal(await sidebar.isVisible(),false);await page.getByRole('heading',{name:'My Athletes',exact:true}).waitFor();
      }else{assert.equal(await sidebar.isVisible(),true);}
    }
    await page.setViewportSize({width:844,height:390});await page.getByRole('button',{name:'Open coach navigation'}).click();
    await page.getByRole('button',{name:'Coach settings'}).click();await page.getByRole('heading',{name:'Coach settings'}).waitFor();
    assert.deepEqual(errors,[]);console.log('Sidebar placement, 44px actions, breakpoint layouts, drawer focus/Escape, and landscape navigation passed');
  }finally{await browser.close();}
}
