import * as path from "node:path";
import fg from "fast-glob";
import { scanRubric, RULES } from "./rubric.js";

const THRESHOLD = parseInt(process.env.THRESHOLD ?? "70", 10);

function usage(): never {
  console.error("Usage: npm run scan -- <repo-path> [glob]");
  console.error("Example: npm run scan -- /path/to/repo");
  console.error("Example: npm run scan -- /path/to/repo 'tests/**/*.spec.ts'");
  process.exit(1);
}

const repoArg = process.argv[2];
if (!repoArg) usage();

const repoPath = path.resolve(repoArg);
const glob = process.argv[3] ?? "**/*.spec.ts";

async function main(): Promise<void> {
  const specs = await fg(glob, {
    cwd: repoPath,
    absolute: true,
    ignore: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/build/**"],
  });

  if (specs.length === 0) {
    console.error(`No .spec.ts files found under ${repoPath} matching ${glob}`);
    process.exit(1);
  }

  console.log(`\n  verdict-guard rubric scan`);
  console.log(`  ${"━".repeat(50)}`);
  console.log(`  Repo:       ${repoPath}`);
  console.log(`  Specs:      ${specs.length} file(s)`);
  console.log(`  Threshold:  ${THRESHOLD}/100`);
  console.log("");

  const results = await scanRubric(specs, THRESHOLD);

  const flagged = results.filter((r) => r.score < THRESHOLD);
  const clean = results.filter((r) => r.score >= THRESHOLD);

  if (results.length === 0) {
    console.log(`  No tests parsed (parse errors, empty files, or no test() blocks).`);
    return;
  }

  const findingCounts = new Map<string, number>();
  for (const r of results) {
    for (const f of r.findings) {
      findingCounts.set(f.rule.id, (findingCounts.get(f.rule.id) ?? 0) + 1);
    }
  }

  console.log(`  ${"━".repeat(50)}`);
  console.log(`  SUMMARY`);
  console.log(`  ${"━".repeat(50)}`);
  console.log(`  Tests analysed:        ${results.length}`);
  console.log(`  Below threshold (🛑):  ${flagged.length}`);
  console.log(`  At or above (✅):       ${clean.length}`);
  console.log("");
  console.log(`  Finding distribution:`);
  for (const [id, count] of [...findingCounts.entries()].sort((a, b) => b[1] - a[1])) {
    const rule = RULES[id];
    const sev = rule.severity === "blocker" ? "blocker" : "warn   ";
    console.log(`    [${sev}] ${id.padEnd(28)} × ${count}`);
  }

  if (flagged.length > 0) {
    console.log("");
    console.log(`  ${"━".repeat(50)}`);
    console.log(`  TESTS BELOW THRESHOLD`);
    console.log(`  ${"━".repeat(50)}`);
    for (const r of flagged.sort((a, b) => a.score - b.score)) {
      const rel = path.relative(repoPath, r.file);
      console.log(`\n  🛑 ${r.score.toString().padStart(3)}/100  ${rel}`);
      console.log(`          "${r.testName}"`);
      for (const f of r.findings) {
        console.log(`          └─ ${f.rule.id} @ line ${f.line}`);
        console.log(`             ${f.rule.hint}`);
      }
    }
  }

  if (clean.length > 0 && clean.length <= 10) {
    console.log("");
    console.log(`  ${"━".repeat(50)}`);
    console.log(`  CLEAN TESTS`);
    console.log(`  ${"━".repeat(50)}`);
    for (const r of clean.sort((a, b) => b.score - a.score)) {
      const rel = path.relative(repoPath, r.file);
      console.log(`  ✅ ${r.score.toString().padStart(3)}/100  ${rel} :: "${r.testName}"`);
    }
  } else if (clean.length > 10) {
    console.log("");
    console.log(`  ${clean.length} clean test(s) omitted (use VERBOSE=1 to show).`);
  }

  console.log("");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
