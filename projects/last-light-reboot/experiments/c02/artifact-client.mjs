import{mountReviewer}from'../../../../review/app.ts';
const artifact=await(await fetch(new URL(location.href).searchParams.get('artifact'))).json();
const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(artifact.source)))].map(n=>n.toString(16).padStart(2,'0')).join('');if(hash!==artifact.sourceSha256)throw Error('Artifact source hash mismatch');
document.documentElement.dataset.artifactSource=hash;
mountReviewer({source:artifact.source,worker:()=>({onmessage:null,onerror:null,postMessage(message){if(message.text!==artifact.source)throw Error('Artifact source mismatch');queueMicrotask(()=>this.onmessage({data:{id:message.id,level:structuredClone(artifact.level),report:structuredClone(artifact.report),stage:'Ready'}}));},terminate(){}})});
