import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const root = read('index.html');
assert.ok(root.includes('http-equiv="refresh" content="0; url=coach.html"'));
assert.ok(root.includes('href="coach.html"'));
assert.ok(!root.includes('<script'), 'root must not host a second application');
for (const path of ['coach-ai.js','coach-ai.smoke.mjs','strength-sync.js','reference/legacy-brain-coach/index.html']) {
  assert.equal(existsSync(new URL(path, import.meta.url)), false, `${path} is retired`);
}
for (const path of ['coach.html','strength-builder-frame.html']) {
  const html = read(path);
  const markup=html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi,'$1</script>');
  for (const [,asset] of markup.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)) {
    if (/^(?:https?:|data:|#)/.test(asset)) continue;
    assert.ok(existsSync(new URL(asset, new URL(path, import.meta.url))), `${path} needs ${asset}`);
  }
  assert.ok(!/coach-ai\.js|strength-sync\.js/.test(html));
}
console.log('Retired files absent; root redirects; active page assets intact');
if (process.env.COACH_BROWSER_URL) {
  const {chromium}=createRequire(import.meta.url)('playwright');
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    const page=await browser.newPage();
    await page.goto(new URL('index.html',process.env.COACH_BROWSER_URL).href);
    await page.waitForURL('**/coach.html');
    await page.getByRole('button',{name:'Demo coach (offline)'}).click();
    await page.getByRole('button',{name:'Athletes',exact:true}).click();
    await page.getByRole('heading',{name:'My Athletes',exact:true}).waitFor();
    console.log('Browser root routing and coach navigation passed');
  } finally {await browser.close();}
}
