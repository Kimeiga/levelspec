import { mountReviewer } from "../../review/app.ts";
const token = new URL(import.meta.url).searchParams.get("session");
const endpoint = `/__levelspec/${token}`;
const reviewer=mountReviewer({source:"",local:false,worker:()=>new Worker(new URL("../../viewer/worker.ts",import.meta.url),{type:"module"}),deferLoad:true});
let revision=0;
/** Keeps HTTP replies from superseded file revisions out of the reviewer. */
async function refresh() {
  const request=++revision;
  try {
    const response=await fetch(`${endpoint}/source`),data=await response.json();
    if(request!==revision)return;
    if(data.error){reviewer.failSource(data.error);return;}
    reviewer.updateSource(data.text,Object.fromEntries(Object.entries(data.files).map(([key,value])=>[key,new Uint8Array(value as number[])])));
  } catch(error){if(request===revision)reviewer.failSource(String(error));}
}
const events=new EventSource(`${endpoint}/events`);
events.onmessage=()=>{void refresh();};
events.onopen=()=>{void refresh();};
events.onerror=()=>{
  revision++;
  reviewer.failSource("Preview connection lost; reconnecting…");
};
window.addEventListener("pagehide",()=>{events.close();reviewer.dispose();},{once:true});
