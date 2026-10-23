import { ENGINE_VERSION, evaluateReadiness, normalizeConstraints } from "./engine.js";
import { SAVED_OBSERVATIONS } from "./saved-observations.js";
import { persistRun } from "./store.js";

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const digest=async value=>{const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(value)));return "sha256:"+[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("");};

async function handle(request,env){
  const url=new URL(request.url);
  if(url.pathname==="/api/meta")return json({engineVersion:ENGINE_VERSION,chainId:1672,nativeSymbol:"PROS",interfaceType:"DETERMINISTIC_COMPANION",invokesSkillEngine:false,readOnly:true,unsignedOnly:true,broadcast:false,proof:["/evidence/v1.0-live-affordable.json","/evidence/v1.0-live-insufficient.json","/evidence/v1.0-live-gas-ceiling.json"]});
  if(url.pathname==="/api/runs"&&request.method==="GET"){const rows=await env.DB.prepare("SELECT payload FROM runs ORDER BY created_at DESC LIMIT 30").all();return json({runs:rows.results.map(x=>JSON.parse(x.payload))});}
  if(url.pathname==="/api/evaluate"&&request.method==="POST"){
    const body=await request.json();const constraints=normalizeConstraints(body);const requestKey=String(body.requestKey||await digest({constraints,source:SAVED_OBSERVATIONS.sourceRunId}));
    const result=evaluateReadiness(constraints,SAVED_OBSERVATIONS);const capturedAt=new Date().toISOString();
    const run={id:crypto.randomUUID(),requestKey,capturedAt,historical:true,label:"DETERMINISTIC COMPANION — HISTORICAL SAVED OBSERVATIONS",sourceObservationRunId:SAVED_OBSERVATIONS.sourceRunId,constraints,observations:SAVED_OBSERVATIONS,result,trace:["VALIDATING","LOADING_SAVED_OBSERVATIONS","RUNNING_DETERMINISTIC_COMPANION","CHECKING_OUTPUT","COMPLETE"],disclosure:"This hosted companion does not invoke the agent-loaded Pharos Skill Engine. See the published genuine agent-run evidence."};
    return json(await persistRun(env.DB,run,requestKey));
  }
  return env.ASSETS.fetch(request);
}
export default{async fetch(request,env){try{return await handle(request,env);}catch(error){return json({error:error.message,status:"BLOCKED",readOnly:true,broadcast:false},400);}}};

