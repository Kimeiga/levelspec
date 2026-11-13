/** Artifact-backed public reviewer: renderer and physical walker are unmodified. */
import {mountReviewer} from '../../review/app.ts';
const run=new URL(location.href).searchParams.get('artifact');
if(!/^generated\/galini-reboot-[\w-]+$/.test(run??''))throw new Error('Expected a frozen Galini artifact directory');
const [source,level,verification]=await Promise.all([fetch('/'+run+'/loaded.aml').then(r=>r.text()),fetch('/'+run+'/compiled.json').then(r=>r.json()),fetch('/'+run+'/verification.json').then(r=>r.json())]);
const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source))),b=>b.toString(16).padStart(2,'0')).join('');
if(sha!==verification.sourceSha256)throw new Error('Frozen source identity mismatch');
mountReviewer({source,worker:()=>({active:true,onmessage:undefined,terminate(){this.active=false;},postMessage(request){if(request.text!==source)throw new Error('Frozen reviewer cannot recompile changed source');queueMicrotask(()=>{if(this.active)this.onmessage?.({data:{id:request.id,level,report:{passed:!level.diagnostics.some(d=>d.severity==='error')&&Boolean(level.navigation?.passed),diagnostics:level.diagnostics},stage:'Ready'}});});}})});
document.body.dataset.sourceSha256=sha;document.body.dataset.artifact=run;document.body.dataset.reviewMode='frozen-native-artifact';
document.getElementById('title').textContent='Galini · frozen native artifact';

document.querySelector('#nav-cell-form button').disabled=true;document.getElementById('nav-cell').readOnly=true;
