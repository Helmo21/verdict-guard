import * as path from "node:path";
import * as fs from "node:fs/promises";
import fg from "fast-glob";
import { scanRubric, type RubricResult } from "./rubric.js";
import { readPlaywrightReport } from "./playwright-report.js";
import { triageFailures, type TriageResult } from "./triage.js";
import { formatComment } from "./comment.js";
import type { MaskingFinding } from "./anti-masking.js";
import { resolveLLM } from "./llm.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const LANDING = path.join(ROOT, "demo", "landing");
const TESTS_DIR = path.join(LANDING, "tests");
const REPORT = path.join(LANDING, "playwright-report");
const THRESHOLD = 70;

const SYNTHETIC_MASKING: MaskingFinding[] = [
  {
    file: "demo/landing/tests/transfer.spec.ts",
    pattern: "added-waitForTimeout",
    line: "await page.waitForTimeout(3000);",
  },
  {
    file: "demo/landing/tests/profile.spec.ts",
    pattern: "weakened-assertion",
    line: "expect(heading).toBeTruthy();",
  },
];

const STUB_VERDICTS: TriageResult["verdict"][] = [
  {
    cause: "test-drift",
    severity: "major",
    hypothesis:
      "The data-testid 'balance' on /transfer was renamed to 'account-balance'. The DOM snapshot in the trace contains <div data-testid=\"account-balance\">€900.00</div> — the expected value is present, but under a renamed selector. Application is correct; the test is stale.",
    repro_steps: [
      "Check out the PR branch",
      "Run: npx playwright test demo/landing/tests/transfer.spec.ts:5 --headed",
      "Observe the locator timeout on getByTestId('balance')",
      "Inspect the DOM: the element is now [data-testid='account-balance']",
    ],
    next_action:
      "Rename getByTestId('balance') → getByTestId('account-balance') in transfer.spec.ts.",
  },
  {
    cause: "app-bug",
    severity: "blocker",
    hypothesis:
      "Login succeeded (POST /api/login → 200) but the session endpoint now returns requiresOnboarding=true, redirecting to /onboarding instead of /dashboard. Either an onboarding flag was incorrectly applied to existing users, or the test predates a new onboarding step. The DOM at failure shows /onboarding's welcome page, not the dashboard.",
    repro_steps: [
      "Check out the PR branch",
      "Run: npx playwright test demo/landing/tests/login.spec.ts:4 --headed",
      "Watch the redirect from /login to /onboarding (not /dashboard)",
      "Inspect /api/session response: requiresOnboarding=true",
      "Decide: is the onboarding step intentional for existing users? If yes → update the test; if no → ship a fix to skip onboarding for already-onboarded users.",
    ],
    next_action:
      "Confirm with product whether existing users should be sent to onboarding. The test needs updating only after this is decided.",
  },
];

function banner(text: string): void {
  const line = "─".repeat(text.length + 4);
  console.log(`\n┌${line}┐`);
  console.log(`│  ${text}  │`);
  console.log(`└${line}┘\n`);
}

function scoreColumn(score: number): string {
  const tag = score >= THRESHOLD ? "✅" : "🛑";
  return `${tag} ${score.toString().padStart(3)}/100`;
}

async function main(): Promise<void> {
  banner("verdict-guard landing-page demo");
  console.log("Mock app:    demo/landing/  (run `npm run dev:landing` to view in browser)");
  console.log(`Test files:  ${path.relative(ROOT, TESTS_DIR)}/`);
  console.log(`Threshold:   ${THRESHOLD}/100`);

  const llm = resolveLLM({
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    openaiKey: process.env.OPENAI_API_KEY,
    openrouterKey: process.env.OPENROUTER_API_KEY,
    preferredProvider: (process.env.LLM_PROVIDER as "anthropic" | "openai" | "openrouter" | undefined) || undefined,
    modelOverride: process.env.LLM_MODEL || undefined,
  });

  if (llm) {
    console.log(`Triage:      LIVE via ${llm.provider} (${llm.model})`);
  } else {
    console.log(`Triage:      STUBBED (set ANTHROPIC_API_KEY / OPENAI_API_KEY / OPENROUTER_API_KEY for live triage)`);
  }

  const specPaths = await fg("*.spec.ts", { cwd: TESTS_DIR, absolute: true });

  banner("step 1 — rubric (deterministic AST scan)");
  const rubric = await scanRubric(specPaths, THRESHOLD);
  const grouped = new Map<string, RubricResult[]>();
  for (const r of rubric) {
    const key = path.relative(LANDING, r.file);
    grouped.set(key, [...(grouped.get(key) ?? []), r]);
  }
  for (const [file, results] of grouped) {
    console.log(`  📄 ${file}`);
    for (const r of results) {
      console.log(`     ${scoreColumn(r.score)}  ${r.testName}`);
      for (const f of r.findings) {
        console.log(`              └─ ${f.rule.id} @ line ${f.line}`);
      }
    }
  }
  const flaggedCount = rubric.filter((r) => r.score < THRESHOLD).length;
  const cleanCount = rubric.length - flaggedCount;
  console.log(`\n  ${flaggedCount} test(s) below threshold, ${cleanCount} clean (out of ${rubric.length} with findings).`);

  banner("step 2 — anti-masking (synthetic diff for demo)");
  for (const m of SYNTHETIC_MASKING) {
    console.log(`  ⚠️  ${m.file} — ${m.pattern}`);
    console.log(`      \`${m.line}\``);
  }

  banner("step 3 — read playwright report");
  const report = await readPlaywrightReport(REPORT);
  console.log(`  Found ${report.failures.length} failure(s) out of ${report.totalTests} test(s).`);
  for (const f of report.failures) {
    console.log(`  🔴 ${f.title}`);
    console.log(`       ${f.errorMessage.split("\n")[0]}`);
  }

  banner(llm ? `step 4 — triage via ${llm.provider} (${llm.model})` : "step 4 — stub verdicts (no API key)");
  let triage: TriageResult[];
  if (llm && report.failures.length > 0) {
    triage = await triageFailures(report.failures, llm);
    console.log(`  ${llm.provider} returned ${triage.length} structured verdict(s).`);
  } else {
    triage = report.failures.map((failure, i) => ({
      failure,
      verdict: STUB_VERDICTS[i] ?? STUB_VERDICTS[0],
    }));
    console.log(`  Stubbed ${triage.length} verdict(s) so the comment renders end-to-end.`);
  }

  const rubricRelative = rubric.map((r) => ({ ...r, file: path.relative(ROOT, r.file) }));

  const body = formatComment({
    rubric: rubricRelative,
    masking: SYNTHETIC_MASKING,
    triage,
    threshold: THRESHOLD,
    totalFailures: report.failures.length,
    triagedCount: triage.length,
  });

  banner("step 5 — rendered PR comment (this is what reviewers see)");
  console.log(body);

  const outPath = path.join(LANDING, "rendered-comment.md");
  await fs.writeFile(outPath, body, "utf8");
  banner("done");
  console.log(`Saved a copy to:  ${path.relative(ROOT, outPath)}`);
  console.log(`View the app:     npm run dev:landing  →  http://localhost:3000`);
  console.log(`Live triage:      ANTHROPIC_API_KEY=...  npm run demo`);
  console.log(`         or:      OPENROUTER_API_KEY=... npm run demo   (same Claude model via gateway)`);
  console.log(`         or:      OPENAI_API_KEY=...     npm run demo   (uses gpt-5-mini)\n`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
