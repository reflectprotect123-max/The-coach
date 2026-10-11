import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';

// Generates a downloadable build artifact. Application source files are unchanged.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=resolve(process.argv[2]||resolve(root,'releases/Hybrid-Coach-Sidebar.html'));
const sdk=process.argv[3];
const scriptBody=text=>text.replace(/<\/script/gi,'<\\/script');
function localFile(path){
  const file=resolve(root,path.replace(/^\.\//,''));
  if(relative(root,file).startsWith('..'))throw new Error('Asset outside project');
  return readFileSync(file,'utf8');
}
function inline(html,transform=(_,text)=>text){
  return html.replace(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"?#]+)"[^>]*>/g,(tag,path)=>/^https?:/.test(path)?tag:`<style data-bundled="${path}">${localFile(path)}</style>`)
    .replace(/<script\b[^>]*src="([^"?#]+)"[^>]*><\/script>/g,(tag,path)=>{
      if(/^https?:/.test(path)){
        // The SDK's webpack runtime requires a nonempty currentScript.src.
        // A data URL keeps that requirement while embedding the exact pinned SDK.
        if(sdk&&path.includes('@supabase/supabase-js@2.49.8/'))return `<script data-bundled="supabase-js-2.49.8" src="data:text/javascript;base64,${readFileSync(sdk).toString('base64')}"></script>`;
        return tag;
      }
      return `<script data-bundled="${path}">${scriptBody(transform(path,localFile(path)))}</script>`;
    });
}
const opaqueOrigin=text=>text.replace(/,((?:parent\.)?location\.origin)\)/g,(_,origin)=>`,(${origin}==='null'?'*':${origin}))`);
const preview=inline(localFile('strength-builder-frame.html'),(path,text)=>{
  // about:srcdoc reports location.origin as null even when it inherits the
  // parent's origin. Use that inherited parent origin for message validation.
  if(path==='strength-builder-frame.js')text=text.replace(/\blocation\.origin\b/g,'parent.location.origin');
  return opaqueOrigin(text);
});
let html=inline(localFile('coach.html'),(path,text)=>{
  if(path!=='./strength-builder.js')return text;
  text=opaqueOrigin(text);
  text=text.replace('src="strength-builder-frame.html?mode=preview"','');
  text=text.replace("const preview=overlay.querySelector('iframe');","const preview=overlay.querySelector('iframe');\n    preview.srcdoc=window.__COACH_PREVIEW_HTML;");
  text=text.replace("preview.src='strength-builder-frame.html?mode=preview'","preview.srcdoc=window.__COACH_PREVIEW_HTML");
  return text;
});
const previewScript=`<script>window.__COACH_PREVIEW_HTML=${JSON.stringify(preview).replace(/</g,'\\u003c')};</script>`;
html=html.replace('<script data-bundled="./strength-builder.js">',previewScript+'\n<script data-bundled="./strength-builder.js">');
html=html.replace('<title>','<!-- Standalone coach build: local assets embedded; live cloud services require internet and authorization. -->\n<title>');
if(/<(?:script|link)\b[^>]*(?:src|href)="(?:\.\/)?(?:coach-|athlete-runtime\/|strength-builder)/.test(html))throw new Error('Unbundled application asset');
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,html);
console.log(`Standalone coach HTML built: ${output} (${Buffer.byteLength(html).toLocaleString()} bytes)`);
