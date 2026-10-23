#!/usr/bin/env node
let raw=""; for await (const chunk of process.stdin) raw+=chunk;
try {
  const {constraints:c,observations:o}=JSON.parse(raw);
  const required=["balanceWei","gasPriceWei","estimatedGas"];
  const missing=required.filter(k=>o[k]===null||o[k]===undefined||o[k]==="");
  if(Number(o.chainId)!==1672||missing.length){process.stdout.write(JSON.stringify({status:"INSUFFICIENT_DATA",decision:"INSUFFICIENT_DATA",reasons:[Number(o.chainId)!==1672?"Pacific Mainnet chain ID 1672 is required.":`Missing required observation(s): ${missing.join(", ")}.`]}));process.exit(0);}
  const balance=BigInt(o.balanceWei),gasPrice=BigInt(o.gasPriceWei),estimatedGas=BigInt(o.estimatedGas),amount=BigInt(c.amountWei),reserve=BigInt(c.reserveWei),ceiling=BigInt(c.gasPriceCeilingWei);
  const bufferedGas=(estimatedGas*BigInt(10000+c.bufferBps)+9999n)/10000n;
  const modeledGasCostWei=bufferedGas*gasPrice,totalRequiredWei=amount+modeledGasCostWei+reserve,spent=amount+modeledGasCostWei;
  const remaining=balance>=spent?balance-spent:null,shortfall=totalRequiredWei>balance?totalRequiredWei-balance:0n,balancePass=balance>=totalRequiredWei,gasPriceCeilingPass=gasPrice<=ceiling;
  const reasons=[]; if(!balancePass)reasons.push(`Balance is short by ${shortfall} wei.`); if(!gasPriceCeilingPass)reasons.push("Observed gas price exceeds the configured ceiling."); if(balancePass&&gasPriceCeilingPass)reasons.push("Balance covers transfer, buffered modeled gas, and retained reserve; gas price is within the ceiling.");
  process.stdout.write(JSON.stringify({status:"COMPLETE",decision:balancePass&&gasPriceCeilingPass?"READY":"NOT_READY",amountWei:amount.toString(),estimatedGas:estimatedGas.toString(),bufferBps:c.bufferBps,bufferedGas:bufferedGas.toString(),gasPriceWei:gasPrice.toString(),modeledGasCostWei:modeledGasCostWei.toString(),reserveWei:reserve.toString(),totalRequiredWei:totalRequiredWei.toString(),balanceWei:balance.toString(),remainingAfterAmountAndGasWei:remaining?.toString()??null,shortfallWei:shortfall.toString(),gasPriceCeilingWei:ceiling.toString(),checks:{balancePass,gasPriceCeilingPass},reasons,limitations:["Gas estimate is not a guarantee.","Gas price may not be pinned to the balance block."]},null,2));
} catch(error){process.stderr.write(JSON.stringify({status:"FAILED",error:error.message}));process.exitCode=1;}
