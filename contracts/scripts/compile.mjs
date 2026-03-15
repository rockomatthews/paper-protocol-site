import fs from "node:fs";
import path from "node:path";
import solc from "solc";

const ROOT = path.resolve(process.cwd());
const CONTRACTS_DIR = path.join(ROOT, "contracts");
const OUT_DIR = path.join(ROOT, "artifacts");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function findImports(importPath) {
  // Support OpenZeppelin imports from node_modules.
  if (importPath.startsWith("@openzeppelin/")) {
    const p = path.join(ROOT, "node_modules", importPath);
    return { contents: read(p) };
  }
  // Local relative imports
  const p2 = path.join(CONTRACTS_DIR, importPath);
  if (fs.existsSync(p2)) return { contents: read(p2) };
  return { error: `Import not found: ${importPath}` };
}

const sources = {};
for (const file of fs.readdirSync(CONTRACTS_DIR)) {
  if (!file.endsWith(".sol")) continue;
  sources[file] = { content: read(path.join(CONTRACTS_DIR, file)) };
}

const input = {
  language: "Solidity",
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"],
      },
    },
  },
};

const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
if (out.errors?.length) {
  const fatal = out.errors.filter((e) => e.severity === "error");
  for (const e of out.errors) {
    console.log(e.formattedMessage);
  }
  if (fatal.length) process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [file, contracts] of Object.entries(out.contracts || {})) {
  for (const [name, c] of Object.entries(contracts)) {
    const payload = {
      contractName: name,
      source: file,
      abi: c.abi,
      bytecode: "0x" + c.evm.bytecode.object,
      deployedBytecode: "0x" + c.evm.deployedBytecode.object,
    };
    fs.writeFileSync(path.join(OUT_DIR, `${name}.json`), JSON.stringify(payload, null, 2));
    console.log("wrote", path.join("artifacts", `${name}.json`));
  }
}
