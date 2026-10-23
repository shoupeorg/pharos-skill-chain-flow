---
name: pharos-transfer-readiness
description: Evaluate whether a Pharos Pacific Mainnet wallet can afford a native PROS transfer while retaining a reserve, using live observations supplied by official Pharos Chain MCP.
---

# Pharos Transfer Readiness

Use this Skill only for read-only native-transfer readiness on Pharos Pacific Mainnet.

## Required flow

One user request creates one run ID and follows this order:

1. Validate sender, recipient, decimal-string amount, decimal-string retained reserve, decimal-string gas-price ceiling, and optional integer gas-buffer basis points.
2. Load and follow the installed upstream `pharos-skill-engine` network and query instructions.
3. Through official Pharos Chain MCP, call `get_chain_info`, `get_block`, `get_balance`, `get_gas_price`, and `estimate_gas`. Pin balance to the observed block. Record that gas price and gas estimation may be observed after that block.
4. Build the normalized Skill input using the exact current-run MCP outputs. Include the run ID, chain ID, block number/hash/timestamp, sender balance in wei, gas price in wei and observation time, gas estimate, amount/reserve/ceiling in atomic units, buffer basis points, normalized addresses, tool names, and response identifiers when supplied.
5. Compute the decision with `node scripts/evaluate-readiness.mjs`. Pass the normalized Skill input as JSON on stdin. This script is part of this Skill; its JSON output is the Skill output.
6. Independently validate every numeric field against the same normalized input. A mismatch fails the run instead of producing `COMPLETE`.

## Exact decision rules

- All PROS quantities use 18 decimals and integer arithmetic.
- `bufferedGas = ceil(estimatedGas * (10000 + bufferBps) / 10000)`.
- `modeledGasCostWei = bufferedGas * gasPriceWei`.
- `totalRequiredWei = amountWei + modeledGasCostWei + reserveWei`.
- `remainingAfterAmountAndGasWei = balanceWei - amountWei - modeledGasCostWei` when non-negative.
- `shortfallWei = max(totalRequiredWei - balanceWei, 0)`.
- `READY` requires both `balanceWei >= totalRequiredWei` and `gasPriceWei <= gasPriceCeilingWei`.
- Missing balance, gas price, or estimate produces `INSUFFICIENT_DATA`; unknown values are never replaced with zero.

## Safety and honesty

- Readiness is an estimate, not a guarantee.
- Never sign, broadcast, request a private key, fund an account, deploy a contract, or call `send_raw_transaction`.
- Treat the public example address as an unattributed third-party address.
- Do not mix observations across run IDs.
- Historical evidence must be labeled `HISTORICAL` with its observation timestamp.
- The hosted reviewer interface is a deterministic companion using saved observations; it does not invoke this agent-loaded Skill at runtime.

