import * as core from "@actions/core";
import * as github from "@actions/github";
import { scanRubric } from "./rubric.js";
import { detectMasking } from "./anti-masking.js";
import { triageFailures } from "./triage.js";
import { formatComment } from "./comment.js";
import { readPlaywrightReport } from "./playwright-report.js";
import { getChangedTestFiles } from "./git.js";
import { resolveLLM, type Provider } from "./llm.js";

async function run(): Promise<void> {
  const mode = core.getInput("mode") || "full";
  const reportPath = core.getInput("playwright-report-path") || "playwright-report";
  const testsGlob = core.getInput("tests-glob") || "tests/**/*.spec.ts";
  const threshold = parseInt(core.getInput("threshold") || "70", 10);
  const maxTriages = parseInt(core.getInput("max-failure-triages") || "5", 10);
  const githubToken = core.getInput("github-token");

  const anthropicKey = core.getInput("anthropic-api-key");
  const openaiKey = core.getInput("openai-api-key");
  const openrouterKey = core.getInput("openrouter-api-key");
  const llmProviderInput = (core.getInput("llm-provider") || "").toLowerCase();
  const llmModelOverride = core.getInput("llm-model");

  const preferredProvider: Provider | undefined =
    llmProviderInput === "anthropic" || llmProviderInput === "openai" || llmProviderInput === "openrouter"
      ? llmProviderInput
      : undefined;

  const llm = resolveLLM({
    anthropicKey,
    openaiKey,
    openrouterKey,
    preferredProvider,
    modelOverride: llmModelOverride || undefined,
  });

  if ((mode === "full" || mode === "triage-only") && !llm) {
    core.setFailed(
      `mode=${mode} requires one of: anthropic-api-key, openai-api-key, openrouter-api-key.`
    );
    return;
  }

  const octokit = github.getOctokit(githubToken);
  const { owner, repo } = github.context.repo;
  const prNumber = github.context.payload.pull_request?.number;

  if (!prNumber) {
    core.warning("No pull_request context. verdict-guard only runs on PRs.");
    return;
  }

  const changedTests = await getChangedTestFiles(testsGlob);
  core.info(`Found ${changedTests.length} changed test files.`);

  const rubricResults =
    mode === "triage-only" ? [] : await scanRubric(changedTests, threshold);

  const maskingFindings =
    mode === "triage-only" ? [] : await detectMasking(changedTests);

  const report = await readPlaywrightReport(reportPath);
  const failures = report.failures.slice(0, maxTriages);

  const triageResults =
    mode === "rubric-only" || failures.length === 0 || !llm
      ? []
      : await triageFailures(failures, llm);

  const body = formatComment({
    rubric: rubricResults,
    masking: maskingFindings,
    triage: triageResults,
    threshold,
    totalFailures: report.failures.length,
    triagedCount: triageResults.length,
  });

  const { data: comment } = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body,
  });

  const failedRubric = rubricResults.filter((r) => r.score < threshold).length;

  core.setOutput("failed-rubric-count", failedRubric);
  core.setOutput("triaged-failure-count", triageResults.length);
  core.setOutput("comment-url", comment.html_url);
  core.setOutput("llm-provider", llm?.provider ?? "none");
  core.setOutput("llm-model", llm?.model ?? "none");

  core.info(
    `verdict-guard done: ${failedRubric} rubric flags, ${maskingFindings.length} masking findings, ${triageResults.length} triages via ${llm?.provider ?? "no-llm"} (${llm?.model ?? "—"}).`
  );
}

run().catch((err: Error) => {
  core.setFailed(err.message);
});
