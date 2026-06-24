import { z } from "zod";
import type { PlaywrightFailure } from "./playwright-report.js";
import { callModel, type LLMConfig } from "./llm.js";

const VerdictSchema = z.object({
  cause: z.enum(["app-bug", "test-drift", "infra-flake", "env-issue", "unknown"]),
  severity: z.enum(["blocker", "major", "minor"]),
  hypothesis: z.string().max(400),
  repro_steps: z.array(z.string()).max(6),
  next_action: z.string().max(200),
});

export type Verdict = z.infer<typeof VerdictSchema>;

export interface TriageResult {
  failure: PlaywrightFailure;
  verdict: Verdict;
}

const SYSTEM = `You are a senior QA engineer triaging a Playwright test failure.

You will receive:
- The test title
- The error message
- A truncated trace excerpt (max 8KB)
- A list of network requests in the last 5 seconds before failure
- The DOM snippet where the failure occurred

Classify the cause as one of:
- app-bug: the application is genuinely broken
- test-drift: the test assumptions no longer match the app (selector renamed, copy changed)
- infra-flake: timeout, network blip, browser crash, CI runner issue
- env-issue: missing fixture, seed data wrong, feature flag off
- unknown: insufficient evidence

Return ONLY JSON matching this shape, no prose:
{
  "cause": "app-bug | test-drift | infra-flake | env-issue | unknown",
  "severity": "blocker | major | minor",
  "hypothesis": "<one paragraph, max 400 chars>",
  "repro_steps": ["step 1", "step 2", "..."],
  "next_action": "<one sentence telling the dev what to do first>"
}`;

function buildPrompt(failure: PlaywrightFailure): string {
  const trace = failure.traceExcerpt.slice(0, 8000);
  const network = failure.recentNetwork.slice(-10).map((n) => `${n.status} ${n.method} ${n.url}`).join("\n");
  return `## Test
${failure.title}

## Error
${failure.errorMessage}

## Trace excerpt (truncated)
${trace}

## Recent network requests
${network || "(none captured)"}

## DOM at failure point
${failure.domSnippet?.slice(0, 2000) ?? "(not captured)"}`;
}

export async function triageFailures(
  failures: PlaywrightFailure[],
  llm: LLMConfig
): Promise<TriageResult[]> {
  const results: TriageResult[] = [];

  for (const failure of failures) {
    const text = await callModel(llm, SYSTEM, buildPrompt(failure));

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) continue;

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const verdict = VerdictSchema.parse(parsed);
      results.push({ failure, verdict });
    } catch {
      // Skip malformed responses rather than failing the whole run.
    }
  }

  return results;
}
