#!/usr/bin/env node
import { evaluateReadiness } from "../src/engine.js";

let raw="";
for await (const chunk of process.stdin) raw+=chunk;
try {
  const input=JSON.parse(raw);
  process.stdout.write(JSON.stringify(evaluateReadiness(input.constraints,input.observations),null,2));
} catch(error) {
  process.stderr.write(JSON.stringify({status:"FAILED",error:error.message}));
  process.exitCode=1;
}

