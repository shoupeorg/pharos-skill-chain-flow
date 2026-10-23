---
name: pharos-transfer-readiness
description: Evaluate whether a Pharos Pacific Mainnet wallet can afford a native PROS transfer while retaining a reserve, using live observations supplied by official Pharos Chain MCP.
---

# Pharos Transfer Readiness

This is a read-only agent Skill. For one user request, create one run ID and:

1. Validate sender, recipient, positive decimal-string amount, decimal-string retained reserve, decimal-string gas-price ceiling, and optional integer gas-buffer basis points.
2. Load and follow the installed upstream `pharos-skill-engine` instructions for Pacific Mainnet.
3. Call official Pharos Chain MCP `get_chain_info`, `get_block`, `get_balance`, `get_gas_price`, and `estimate_gas`. Pin balance to the observed block and record that gas price and estimate may be later observations.
4. Pass the exact current-run MCP outputs, normalized addresses and user constraints to the bundled `scripts/evaluate-readiness.mjs` on stdin as JSON with `{constraints, observations}`.
5. Treat the script JSON as Skill output, then independently validate every numeric claim. A mismatch prevents `COMPLETE`.

Exact rules:

- PROS uses 18 decimals and integer arithmetic.
- `bufferedGas = ceil(estimatedGas * (10000 + bufferBps) / 10000)`.
- `modeledGasCostWei = bufferedGas * gasPriceWei`.
- `totalRequiredWei = amountWei + modeledGasCostWei + reserveWei`.
- `shortfallWei = max(totalRequiredWei - balanceWei, 0)`.
- `READY` requires balance to cover the total and observed gas price not to exceed the ceiling.
- Missing balance, gas price, or estimate produces `INSUFFICIENT_DATA`; never substitute zero.

The gas estimate is not a guarantee. Never sign, broadcast, request keys, fund an account, deploy a contract, or call `send_raw_transaction`. Do not mix observations across run IDs. Historical records must be labeled `HISTORICAL`. The hosted reviewer is a deterministic companion using saved observations and does not invoke this Skill.

