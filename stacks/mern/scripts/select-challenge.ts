import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import {
  CHALLENGES,
  assertChallengeSlug,
  findChallenge,
  type ChallengeSlug,
} from "../config/challenges.ts";
import activeChallenge from "../config/active-challenge.json" with { type: "json" };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const activePath = path.join(root, "config/active-challenge.json");
const envPath = path.join(root, ".env");
const envExamplePath = path.join(root, ".env.example");

function printUsage(): void {
  console.log(`Usage:
  pnpm challenge                 Interactive picker
  pnpm challenge <slug>          Select by slug
  pnpm challenge --list          List challenges
  pnpm challenge <slug> --prepare
  pnpm challenge --prepare       Re-prepare DB for the active challenge

Updates config/active-challenge.json and .env MONGODB_DB.
`);
}

function listChallenges(activeSlug: string): void {
  console.log("Available challenges:\n");
  for (const [index, challenge] of CHALLENGES.entries()) {
    const mark = challenge.slug === activeSlug ? "*" : " ";
    console.log(
      `  ${mark} ${String(index + 1).padStart(2, " ")}. ${challenge.slug.padEnd(16)} ${challenge.title}`,
    );
  }
  console.log(`\nActive: ${activeSlug}`);
}

function upsertEnvMongoDb(mongoDb: string): void {
  if (!existsSync(envPath)) {
    if (!existsSync(envExamplePath)) {
      throw new Error("Missing .env and .env.example — create .env first.");
    }
    copyFileSync(envExamplePath, envPath);
    console.log("Created .env from .env.example");
  }

  const raw = readFileSync(envPath, "utf8");
  const next = raw.includes("MONGODB_DB=")
    ? raw.replace(/^MONGODB_DB=.*$/m, `MONGODB_DB=${mongoDb}`)
    : `${raw.trimEnd()}\nMONGODB_DB=${mongoDb}\n`;

  if (next !== raw) {
    writeFileSync(envPath, next.endsWith("\n") ? next : `${next}\n`);
  }
}

function writeActive(slug: ChallengeSlug): void {
  writeFileSync(activePath, `${JSON.stringify({ slug }, null, 2)}\n`);
}

function runPrepare(): void {
  console.log("\nRunning pnpm db:prepare…");
  const result = spawnSync("pnpm", ["db:prepare"], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
  }
}

async function promptSlug(activeSlug: string): Promise<ChallengeSlug> {
  listChallenges(activeSlug);
  const rl = createInterface({ input, output });
  try {
    const answer = (await rl.question("\nSelect number or slug: ")).trim();
    if (!answer) {
      throw new Error("No selection.");
    }
    const asNumber = Number(answer);
    if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= CHALLENGES.length) {
      return CHALLENGES[asNumber - 1]!.slug;
    }
    return assertChallengeSlug(answer);
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const prepare = args.includes("--prepare");
  const listOnly = args.includes("--list") || args.includes("-l");
  const help = args.includes("--help") || args.includes("-h");
  const positional = args.filter((arg) => !arg.startsWith("-"));

  if (help) {
    printUsage();
    return;
  }

  const activeSlug = assertChallengeSlug(activeChallenge.slug);

  if (listOnly) {
    listChallenges(activeSlug);
    return;
  }

  let slug: ChallengeSlug;
  if (positional[0]) {
    slug = assertChallengeSlug(positional[0]);
  } else if (prepare) {
    slug = activeSlug;
  } else if (!process.stdin.isTTY) {
    printUsage();
    process.exitCode = 1;
    return;
  } else {
    slug = await promptSlug(activeSlug);
  }

  const meta = findChallenge(slug)!;
  writeActive(slug);
  upsertEnvMongoDb(meta.mongoDb);

  console.log(`\nActive challenge: ${meta.title} (${meta.slug})`);
  console.log(`MONGODB_DB=${meta.mongoDb}`);
  console.log(`Wrote ${path.relative(root, activePath)}`);

  if (prepare) {
    runPrepare();
    if (process.exitCode && process.exitCode !== 0) {
      return;
    }
    console.log("\nReady. Next: pnpm dev");
    return;
  }

  console.log("\nNext:");
  console.log("  pnpm db:prepare");
  console.log("  pnpm dev");
  console.log("\nOr: pnpm challenge --prepare");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
