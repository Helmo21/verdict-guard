# verdict-guard

> The GitHub Action that catches **"AI wrote my test, AI says it passes"** before it reaches main.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node 20+](https://img.shields.io/badge/node-%E2%89%A520-3c873a.svg)](https://nodejs.org)
[![Providers](https://img.shields.io/badge/LLM-Anthropic%20%E2%80%A2%20OpenAI%20%E2%80%A2%20OpenRouter-7c3aed.svg)](#multi-provider-llm)

---

## What it does (90 seconds)

You ship a PR with a new Playwright test. Today the existing ecosystem tells you:

- [daun/playwright-report-summary](https://github.com/daun/playwright-report-summary) posts `✅ 12 passed, 2 flaky`.
- [Trunk](https://docs.trunk.io/flaky-tests/get-started/frameworks/playwright) auto-quarantines the flakies.
- [Currents](https://currents.dev/) shows you the trace.

None of them tell you the test is **dishonest** — i.e. it passes without verifying anything meaningful. The single highest-engagement r/Playwright thread of the last 30 days is literally titled *["ai wrote the playwright test but it only checks that a green toast appears... do you keep these?"](https://www.reddit.com/r/Playwright/comments/1u77avd/ai_wrote_the_playwright_test_but_it_only_checks/)*.

`verdict-guard` runs on every PR and posts a single PR comment with three signals:

1. **Verdict integrity score** — every new/changed test is graded against a 6-rule rubric (toast-only, no value assertion, hidden `waitForTimeout`, weakened `.toBeTruthy()`, missing negative case, broad selector). Tests below threshold are flagged with a one-line fix hint.
2. **Anti-masking detector** — if a PR *modifies* an existing test by adding `waitForTimeout`, loosening assertions, wrapping in `try/catch`, or marking `.skip` / `.only`, the comment surfaces the diff and asks for reviewer attention.
3. **Failure triage** — for every failure, an LLM reads the Playwright trace + DOM + network and returns a structured hypothesis (`cause: app-bug | test-drift | infra-flake | env-issue`, severity, repro steps, next action).

No external dashboard. No JUnit upload. Runs entirely inside your repo.

## See it in action

A self-contained Next.js mock app under [`demo/landing/`](./demo/landing/) with 14 deliberately mixed-quality tests:

```bash
npm install
npm run demo          # rubric + masking + triage → prints the rendered PR comment
npm run dev:landing   # open http://localhost:3000 to see what the tests are written against
```

The demo runs end-to-end with **no API key** (triage gets stubbed). For real triage, set any one of:

```bash
ANTHROPIC_API_KEY=...   npm run demo    # claude-sonnet-4-6 native
OPENROUTER_API_KEY=...  npm run demo    # same Claude model, via OpenRouter gateway
OPENAI_API_KEY=...      npm run demo    # gpt-5-mini
```

See [`demo/landing/README.md`](./demo/landing/README.md) for the test-by-test breakdown.

## Usage

```yaml
# .github/workflows/ci.yml
- uses: actions/checkout@v4
  with: { fetch-depth: 0 }    # required so verdict-guard can git diff against the base branch

- name: Run Playwright tests
  run: npx playwright test --reporter=json | tee playwright-report/results.json || true

- uses: antoine-pedretti/verdict-guard@v1
  with:
    # Provide ANY ONE of these three keys. Priority when multiple set: anthropic > openrouter > openai
    anthropic-api-key:  ${{ secrets.ANTHROPIC_API_KEY }}
    openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
    openai-api-key:     ${{ secrets.OPENAI_API_KEY }}
    # Optional explicit pin:
    # llm-provider: anthropic     # anthropic | openai | openrouter
    # llm-model: claude-sonnet-4-6
    mode: full                    # full | rubric-only | triage-only  (rubric-only needs no key)
    playwright-report-path: playwright-report/
    threshold: 70                 # tests below this are flagged
    max-failure-triages: 5        # LLM call cap per PR
```

A complete copy-pasteable workflow including fork-PR safety and the optional merge gate lives at [`examples/.github/workflows/example.yml`](./examples/.github/workflows/example.yml).

### Multi-provider LLM

| Provider | Default model | Notes |
|---|---|---|
| `anthropic` | `claude-sonnet-4-6` | Native, lowest latency |
| `openrouter` | `anthropic/claude-sonnet-4.6` | **Same Claude model** routed via OpenRouter — useful if you already have an OpenRouter account / cost dashboard |
| `openai` | `gpt-5-mini` | Comparable tier; pick this if you only have an OpenAI key |

Override the default model on any provider with `llm-model:`. Pin a provider explicitly with `llm-provider:` if you have multiple keys configured.

### Outputs

| Output | Type | Example |
|---|---|---|
| `failed-rubric-count` | integer | `2` |
| `triaged-failure-count` | integer | `1` |
| `comment-url` | string | `https://github.com/owner/repo/issues/1#issuecomment-123` |
| `llm-provider` | string | `openrouter` |
| `llm-model` | string | `anthropic/claude-sonnet-4.6` |

Use `failed-rubric-count` as a gateable integer if you want hard merge protection:

```yaml
- if: steps.verdict.outputs.failed-rubric-count > 0
  run: exit 1
```

## What it does NOT do

- **No quarantine.** Trunk does that well; this is a reasoning layer above it.
- **No dashboard.** Currents does that well; this stays in-repo.
- **No test execution.** It reads what Playwright already produced.
- **No autonomous fixes.** It surfaces and explains. Humans decide.

## Architecture

```
PR event
  ├─ getChangedTestFiles()      → fast-glob ∩ git diff --name-only base..HEAD
  ├─ scanRubric(files)          → AST scan per test → 0–100 score + findings
  ├─ detectMasking(files)       → git diff --unified=0 → regex on +added lines
  ├─ readPlaywrightReport(path) → walk results.json → PlaywrightFailure[]
  ├─ triageFailures(failures)   → LLM (provider-agnostic) → Zod-validated JSON verdict
  └─ formatComment()            → single markdown body → octokit.createComment
```

Two layers are deterministic AST/regex (free, milliseconds, regression-testable). The LLM only runs on real failures, capped at 5 per PR, with truncated trace excerpts. Expected cost on a typical PR with 0–2 failures: **< $0.03**.

For more, see [`docs/architecture.md`](./docs/architecture.md) and the evidence corpus at [`docs/research-2026-06-23.md`](./docs/research-2026-06-23.md).

## Why this exists

Three signals from a 30-day evidence sweep across r/Playwright, r/QualityAssurance, HN, and the Playwright tooling vendors:

1. **AI-generated tests increasingly pass without verifying anything.** The Reddit thread above is the most engaged community signal in the window.
2. **AI-driven refactors mask flakiness rather than fix it** — adding waits, retries, or relaxed assertions. Currents' own [State of Playwright AI Ecosystem 2026](https://currents.dev/posts/state-of-playwright-ai-ecosystem-in-2026) names this pattern explicitly.
3. **The primitive form exists everywhere; the reasoning layer is empty.** PostHog's own PR bot posts `⚠️ 2 flaky tests` with zero analysis. Every team has a flakiness counter; almost none have a verdict-integrity gate.

## Privacy

- Source code is read locally inside the runner.
- Only failure traces (which already live in `playwright-report/`) are sent to the LLM provider you configured.
- No bank or PII fixtures should live in test code; if they do, that's a separate issue this Action cannot fix.

## License

MIT. Use it, fork it, ship it.
# verdict-guard
