import { ceilDiv, formatDecimal, isAddress, parseDecimal } from "./math.js";

export const ENGINE_VERSION = "pharos-transfer-readiness/1.0.0";
const requiredObservationFields = ["balanceWei", "gasPriceWei", "estimatedGas"];

export function normalizeConstraints(input) {
  const sender = String(input.sender || "").toLowerCase();
  const recipient = String(input.recipient || "").toLowerCase();
  if (!isAddress(sender) || !isAddress(recipient)) throw new Error("Sender and recipient must be valid EVM addresses.");
  const amountWei = parseDecimal(String(input.amount));
  if (amountWei <= 0n) throw new Error("Transfer amount must be positive.");
  const reserveWei = parseDecimal(String(input.reserve));
  const gasPriceCeilingWei = parseDecimal(String(input.gasPriceCeilingGwei), 9);
  if (gasPriceCeilingWei <= 0n) throw new Error("Gas-price ceiling must be positive.");
  const bufferBps = Number(input.bufferBps ?? 2000);
  if (!Number.isInteger(bufferBps) || bufferBps < 0 || bufferBps > 10000) throw new Error("Gas buffer must be an integer from 0 to 10000 basis points.");
  validatePrompt(input.prompt, input);
  return {sender, recipient, amountWei:amountWei.toString(), reserveWei:reserveWei.toString(), gasPriceCeilingWei:gasPriceCeilingWei.toString(), bufferBps};
}

function validatePrompt(prompt, input) {
  if (!prompt) return;
  const text = String(prompt);
  const amount = text.match(/transfer\s+([0-9]+(?:\.[0-9]+)?)\s+PROS/i)?.[1];
  const reserve = text.match(/(?:keep|retain)\s+([0-9]+(?:\.[0-9]+)?)\s+PROS/i)?.[1];
  const ceiling = text.match(/(?:ceiling|under|below)\s+([0-9]+(?:\.[0-9]+)?)\s+gwei/i)?.[1];
  if ((amount && amount !== String(input.amount)) || (reserve && reserve !== String(input.reserve)) || (ceiling && ceiling !== String(input.gasPriceCeilingGwei))) throw new Error("Natural-language and structured inputs conflict.");
}

export function evaluateReadiness(normalized, observations) {
  if (Number(observations.chainId) !== 1672) return insufficient(normalized, observations, "Unsupported network; Pacific Mainnet chain ID 1672 is required.");
  const missing = requiredObservationFields.filter(field => observations[field] === null || observations[field] === undefined || observations[field] === "");
  if (missing.length) return insufficient(normalized, observations, `Missing required observation(s): ${missing.join(", ")}.`);
  const balance = BigInt(observations.balanceWei);
  const gasPrice = BigInt(observations.gasPriceWei);
  const estimatedGas = BigInt(observations.estimatedGas);
  const amount = BigInt(normalized.amountWei);
  const reserve = BigInt(normalized.reserveWei);
  const ceiling = BigInt(normalized.gasPriceCeilingWei);
  const bufferedGas = ceilDiv(estimatedGas * BigInt(10000 + normalized.bufferBps), 10000n);
  const gasCost = bufferedGas * gasPrice;
  const totalRequired = amount + gasCost + reserve;
  const amountAndGas = amount + gasCost;
  const remaining = balance >= amountAndGas ? balance - amountAndGas : null;
  const shortfall = totalRequired > balance ? totalRequired - balance : 0n;
  const balancePass = balance >= totalRequired;
  const ceilingPass = gasPrice <= ceiling;
  const reasons = [];
  if (!balancePass) reasons.push(`Balance is short by ${formatDecimal(shortfall)} PROS.`);
  if (!ceilingPass) reasons.push(`Observed gas price ${formatDecimal(gasPrice,9)} gwei exceeds the ${formatDecimal(ceiling,9)} gwei ceiling.`);
  if (balancePass && ceilingPass) reasons.push("Balance covers transfer, buffered modeled gas, and retained reserve; observed gas price is within the ceiling.");
  return {
    engineVersion: ENGINE_VERSION,
    status: "COMPLETE",
    decision: balancePass && ceilingPass ? "READY" : "NOT_READY",
    amountWei: amount.toString(), estimatedGas: estimatedGas.toString(), bufferBps: normalized.bufferBps,
    bufferedGas: bufferedGas.toString(), gasPriceWei: gasPrice.toString(), modeledGasCostWei: gasCost.toString(),
    reserveWei: reserve.toString(), totalRequiredWei: totalRequired.toString(), balanceWei: balance.toString(),
    remainingAfterAmountAndGasWei: remaining?.toString() ?? null, shortfallWei: shortfall.toString(), gasPriceCeilingWei: ceiling.toString(),
    checks:{balancePass,gasPriceCeilingPass:ceilingPass}, reasons,
    display:{amount:`${formatDecimal(amount)} PROS`,modeledGasCost:`${formatDecimal(gasCost)} PROS`,reserve:`${formatDecimal(reserve)} PROS`,totalRequired:`${formatDecimal(totalRequired)} PROS`,remaining:remaining===null?"UNKNOWN":`${formatDecimal(remaining)} PROS`,shortfall:`${formatDecimal(shortfall)} PROS`,gasPrice:`${formatDecimal(gasPrice,9)} gwei`,ceiling:`${formatDecimal(ceiling,9)} gwei`},
    limitations:["Gas estimate is not a guarantee.","Gas price may not be pinned to the balance block."]
  };
}

function insufficient(normalized, observations, reason){return {engineVersion:ENGINE_VERSION,status:"INSUFFICIENT_DATA",decision:"INSUFFICIENT_DATA",reasons:[reason],input:normalized,observations,limitations:["Unknown values were not replaced with zero."]};}

export function validateSkillOutput(normalized, observations, output) {
  const expected=evaluateReadiness(normalized,observations);
  const fields=["status","decision","amountWei","bufferedGas","modeledGasCostWei","reserveWei","totalRequiredWei","balanceWei","remainingAfterAmountAndGasWei","shortfallWei","gasPriceCeilingWei"];
  const mismatches=fields.filter(field=>JSON.stringify(output[field])!==JSON.stringify(expected[field]));
  return {valid:mismatches.length===0,mismatches,expected};
}

