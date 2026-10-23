# Pharos Skill + Chain MCP Flow

A genuine Skill Engine composition proof for the Pharos Agent Arena task. One agent request loads an installed Skill, obtains live Pacific Mainnet observations from official Pharos Chain MCP, passes those exact observations into the Skill, and independently validates the decision.

## What it answers

> Can this wallet afford a transfer of X PROS while keeping Y PROS as a reserve?

The decision accounts for the transfer amount, estimated gas, an explicit gas buffer, retained reserve and gas-price ceiling using exact integer arithmetic.

## Genuine composition

The official `pharos-skill-engine` v0.1.0 was installed with the documented `npx skills add` mechanism. This repository's `pharos-transfer-readiness` Skill was packaged and installed through the same mechanism. The agent loaded both Skills, called official Chain MCP, passed the returned values into the installed readiness Skill, and validated its output.

The hosted website is intentionally labeled a **deterministic reviewer companion**. It uses saved observations so reviewers can change constraints without credentials. It does not claim to invoke the agent runtime. The unchanged genuine proofs are public under `/evidence/`.

## Real proof summary

Observation set at Pharos block `21051707`:

- Sender balance: `988631830399322430` wei (`0.98863183039932243 PROS`)
- Gas price: `10000000000` wei (`10 gwei`)
- Native-transfer estimate: `21000` gas
- 20% buffer: `25200` gas
- Modeled gas cost: `252000000000000` wei (`0.000252 PROS`)

Results:

- `0.0001 PROS` transfer + `0.0001 PROS` reserve under `100 gwei`: **READY**.
- Same observations, `1 PROS` transfer: **NOT_READY**, shortfall `0.01172016960067757 PROS`.
- Same observations, `5 gwei` ceiling: **NOT_READY**, because observed gas was `10 gwei`.

## Quick start

```bash
npm ci
npm test
npm run build
npx wrangler dev
```

Open the local URL and use **LOAD AFFORDABLE PROOF**, **LOAD INSUFFICIENT PROOF**, or **LOAD GAS-CEILING PROOF**. Use **RUN COMPANION CHECK →** only for deterministic what-if checks against the disclosed historical observation set.

## Installed Skill execution

```bash
npx skills add https://github.com/PharosNetwork/pharos-skill-engine
npx skills add <absolute-path-to>/skill-package/pharos-transfer-readiness
```

An agent follows the installed `SKILL.md`, calls Chain MCP, then pipes normalized JSON to the bundled evaluator:

```bash
node .agents/skills/pharos-transfer-readiness/scripts/evaluate-readiness.mjs
```

See [architecture](docs/architecture.md) and [evidence manifest](evidence/manifest.json).

## API

- `GET /api/meta` — scope and safety disclosure.
- `GET /api/runs` — saved companion runs.
- `POST /api/evaluate` — deterministic companion using saved historical observations.
- `GET /evidence/manifest.json` — genuine composed-run proof index.

## Supported scope and limitations

- Pacific Mainnet only: chain ID `1672`, native token `PROS`.
- Readiness only; no signing, broadcasting, funding or deployment.
- Decimal inputs must be strings; PROS precision is limited to 18 decimals.
- Natural-language values must agree with structured fields.
- Gas estimates are estimates, not guarantees.
- Gas price may not be pinned to the balance block.
- Reviewer companion results are historical and must not be described as fresh chain reads.

## Safety

There is no signer, private-key input, wallet connection, transaction construction, broadcast route, contract deployment or PROS spending in this project.

