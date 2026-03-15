import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createWalletClient, createPublicClient, http, parseEther, hexToBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

const merklePath = arg("--merkle");
if (!merklePath) {
  console.error("Usage: node scripts/deploy_sepolia.mjs --merkle <merkle.json>");
  process.exit(1);
}

const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;
const pk = process.env.DEPLOYER_PRIVATE_KEY;
if (!rpcUrl || !pk) {
  console.error("Missing BASE_SEPOLIA_RPC_URL or DEPLOYER_PRIVATE_KEY in contracts/.env");
  process.exit(1);
}

const name = process.env.PAPER_TOKEN_NAME || "PAPER Protocol";
const symbol = process.env.PAPER_TOKEN_SYMBOL || "PAPER";

const merkle = JSON.parse(fs.readFileSync(merklePath, "utf8"));
const merkleRoot = merkle.merkleRoot;

const account = privateKeyToAccount(pk);

const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });
const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(rpcUrl) });

const artifactsDir = path.join(process.cwd(), "artifacts");
const tokenArtifact = JSON.parse(fs.readFileSync(path.join(artifactsDir, "PaperToken.json"), "utf8"));
const claimArtifact = JSON.parse(fs.readFileSync(path.join(artifactsDir, "PaperClaim.json"), "utf8"));

console.log("deployer", account.address);

// Deploy PaperToken(owner=deployer)
const tokenHash = await walletClient.deployContract({
  abi: tokenArtifact.abi,
  bytecode: tokenArtifact.bytecode,
  args: [name, symbol, account.address],
});
const tokenReceipt = await publicClient.waitForTransactionReceipt({ hash: tokenHash });
const tokenAddress = tokenReceipt.contractAddress;
console.log("PaperToken", tokenAddress);

// Deploy PaperClaim(token, merkleRoot, owner)
const claimHash = await walletClient.deployContract({
  abi: claimArtifact.abi,
  bytecode: claimArtifact.bytecode,
  args: [tokenAddress, merkleRoot, account.address],
});
const claimReceipt = await publicClient.waitForTransactionReceipt({ hash: claimHash });
const claimAddress = claimReceipt.contractAddress;
console.log("PaperClaim", claimAddress);

// Mint a large pool to the claim contract (owner-only mint)
// NOTE: For testnet we mint an arbitrary supply. Mainnet will be explicit approval.
const mintAmount = 10n ** 24n; // 1,000,000 tokens at 18 decimals
const mintHash = await walletClient.writeContract({
  address: tokenAddress,
  abi: tokenArtifact.abi,
  functionName: "mint",
  args: [claimAddress, mintAmount],
});
await publicClient.waitForTransactionReceipt({ hash: mintHash });
console.log("Minted", mintAmount.toString(), "to claim contract");

const out = {
  chainId: baseSepolia.id,
  tokenAddress,
  claimAddress,
  merkleRoot,
  deployedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(process.cwd(), "deployments.sepolia.json"), JSON.stringify(out, null, 2));
console.log("wrote deployments.sepolia.json");
