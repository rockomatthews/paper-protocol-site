import fs from "node:fs";
import path from "node:path";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--in") out.in = args[++i];
    if (a === "--out") out.out = args[++i];
  }
  if (!out.in || !out.out) {
    console.error("Usage: node scripts/build_merkle.mjs --in <balances.json> --out <merkle.json>");
    process.exit(1);
  }
  return out;
}

const { in: inPath, out: outPath } = parseArgs();
const raw = JSON.parse(fs.readFileSync(inPath, "utf8"));

// Expect format: [{ address: "0x...", allocation: "123" }, ...]
const rows = Array.isArray(raw) ? raw : raw.rows || [];

function normAddr(a) {
  if (!a) return "";
  const s = String(a).trim();
  return s.startsWith("0x") ? s.toLowerCase() : ("0x" + s).toLowerCase();
}

const leaves = [];
const claims = {};

for (const r of rows) {
  const address = normAddr(r.address || r.wallet || r.session_id || r.sessionId);
  const allocation = String(r.allocation ?? r.points ?? r.amount ?? "0");
  if (!address || address.length !== 42) continue;
  if (allocation === "0") continue;
  const leaf = keccak256(Buffer.concat([
    Buffer.from(address.slice(2), "hex"),
    Buffer.from(BigInt(allocation).toString(16).padStart(64, "0"), "hex"),
  ]));
  leaves.push(leaf);
  claims[address] = { totalAllocation: allocation, leaf: "0x" + leaf.toString("hex") };
}

const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
const root = tree.getHexRoot();

for (const [address, c] of Object.entries(claims)) {
  const proof = tree.getHexProof(Buffer.from(c.leaf.slice(2), "hex"));
  claims[address].proof = proof;
}

const out = {
  merkleRoot: root,
  leafEncoding: "keccak256(abi.encodePacked(address,uint256))",
  sortPairs: true,
  claims,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log("wrote", outPath);
console.log("merkleRoot", root);
