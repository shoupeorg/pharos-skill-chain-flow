import { validateSkillOutput } from "./engine.js";

export function verifyComposition(record) {
  const errors=[];
  if(!record.runId) errors.push("Missing run ID.");
  if(record.skillInvocation?.mechanism!=="agent-loaded-installed-skill") errors.push("Missing genuine installed-Skill invocation evidence.");
  if(record.skillInvocation?.status!=="SUCCEEDED") errors.push("Skill invocation did not succeed.");
  if(record.chainObservations?.runId!==record.runId || record.skillInput?.runId!==record.runId) errors.push("Cross-run observation mixing detected.");
  const check=validateSkillOutput(record.skillInput.constraints,record.skillInput.observations,record.skillOutput||{});
  if(!check.valid) errors.push(`Skill arithmetic mismatch: ${check.mismatches.join(", ")}.`);
  return {valid:errors.length===0,status:errors.length?"FAILED":"COMPLETE",errors,numericValidation:check};
}

export class IdempotentRunner {
  constructor(invoke){this.invoke=invoke;this.cache=new Map();}
  async run(key,input){if(this.cache.has(key))return this.cache.get(key);const promise=this.invoke(input);this.cache.set(key,promise);return promise;}
}

