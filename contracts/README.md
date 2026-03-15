# $PAPER Contracts (Base Sepolia dry-run)

This folder contains a **deploy-ready** (but not deployed) contract set for PAPER Protocol:

- `PaperToken.sol` — ERC20 token
- `PaperClaim.sol` — Merkle-based claim contract with **partial claims**

## Safety
- Do **not** deploy to Base mainnet until you explicitly decide to.
- Use a fresh deployer wallet for testnet.

## Install

```bash
cd contracts
npm i
```

## Configure env

Create `contracts/.env`:

```bash
BASE_SEPOLIA_RPC_URL="https://..."
DEPLOYER_PRIVATE_KEY="0x..."
PAPER_TOKEN_NAME="PAPER Protocol"
PAPER_TOKEN_SYMBOL="PAPER"
```

## Build snapshot + Merkle

(Requires you to export balances from Supabase into a JSON file.)

```bash
node scripts/build_merkle.mjs --in ../snapshots/paper_balances.json --out ../snapshots/merkle.json
```

## Compile

```bash
node scripts/compile.mjs
```

## Deploy (Base Sepolia)

```bash
node scripts/deploy_sepolia.mjs --merkle ../snapshots/merkle.json
```

Outputs deployed addresses and a verification bundle.
