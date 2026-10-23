import test from "node:test";
import assert from "node:assert/strict";
import {evaluateReadiness,normalizeConstraints,validateSkillOutput} from "../src/engine.js";
import {parseDecimal} from "../src/math.js";
import {IdempotentRunner,verifyComposition} from "../src/composition.js";

const constraints={sender:"0x4117b9737f64d816be36f6c18c72409c98e4737c",recipient:"0x15ddce897d76ac39c188ade4d353711a60395315",amountWei:"100000000000000",reserveWei:"100000000000000",gasPriceCeilingWei:"100000000000",bufferBps:2000};
const observations={chainId:1672,balanceWei:"988631830399322430",gasPriceWei:"10000000000",estimatedGas:"21000"};

test("decimal parsing is exact",()=>assert.equal(parseDecimal("0.000000000000000001"),1n));
test("decimal precision overflow is rejected",()=>assert.throws(()=>parseDecimal("0.0000000000000000001"),/18 decimal/));
test("affordability boundary preserves reserve",()=>{const o=evaluateReadiness({...constraints,amountWei:"988279830399322430"},observations);assert.equal(o.decision,"READY");assert.equal(o.totalRequiredWei,observations.balanceWei);});
test("one wei above boundary is not ready",()=>assert.equal(evaluateReadiness({...constraints,amountWei:"988279830399322431"},observations).decision,"NOT_READY"));
test("gas ceiling rejects otherwise affordable transfer",()=>{const o=evaluateReadiness({...constraints,gasPriceCeilingWei:"5000000000"},observations);assert.equal(o.checks.balancePass,true);assert.equal(o.checks.gasPriceCeilingPass,false);assert.equal(o.decision,"NOT_READY");});
test("unknown balance fails closed",()=>assert.equal(evaluateReadiness(constraints,{...observations,balanceWei:null}).status,"INSUFFICIENT_DATA"));
test("unknown gas estimate fails closed",()=>assert.equal(evaluateReadiness(constraints,{...observations,estimatedGas:null}).status,"INSUFFICIENT_DATA"));
test("invalid address is blocked",()=>assert.throws(()=>normalizeConstraints({...constraints,sender:"bad",amount:"0.1",reserve:"0.1",gasPriceCeilingGwei:"10"}),/valid EVM/));
test("conflicting natural language and structured amount is blocked",()=>assert.throws(()=>normalizeConstraints({...constraints,amount:"0.1",reserve:"0.1",gasPriceCeilingGwei:"10",prompt:"Transfer 0.2 PROS and keep 0.1 PROS under 10 gwei"}),/conflict/));
test("Skill receives exact current observations",()=>{const out=evaluateReadiness(constraints,observations);assert.equal(out.balanceWei,observations.balanceWei);assert.equal(out.gasPriceWei,observations.gasPriceWei);assert.equal(out.estimatedGas,observations.estimatedGas);});
test("incorrect Skill arithmetic is rejected",()=>{const out={...evaluateReadiness(constraints,observations),modeledGasCostWei:"0"};assert.equal(validateSkillOutput(constraints,observations,out).valid,false);});
test("missing Skill invocation cannot complete",()=>{const record={runId:"r1",chainObservations:{runId:"r1"},skillInput:{runId:"r1",constraints,observations},skillOutput:evaluateReadiness(constraints,observations)};assert.equal(verifyComposition(record).status,"FAILED");});
test("cross-run observation mixing is rejected",()=>{const record={runId:"r1",chainObservations:{runId:"r2"},skillInput:{runId:"r1",constraints,observations},skillInvocation:{mechanism:"agent-loaded-installed-skill",status:"SUCCEEDED"},skillOutput:evaluateReadiness(constraints,observations)};assert.match(verifyComposition(record).errors.join(" "),/Cross-run/);});
test("duplicate request invokes once",async()=>{let count=0;const runner=new IdempotentRunner(async()=>++count);const [a,b]=await Promise.all([runner.run("same",{}),runner.run("same",{})]);assert.equal(a,1);assert.equal(b,1);assert.equal(count,1);});
test("no signer or broadcast output exists",()=>{const out=evaluateReadiness(constraints,observations);assert.equal("transaction" in out,false);assert.equal("signed" in out,false);});

