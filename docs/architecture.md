# Architecture

## Design principles

1. **Deterministic before LLM.** The rubric scanner and anti-masking detector are pure AST/regex. They run in milliseconds, cost nothing, and catch the majority of issues. The LLM is only invoked on real failures, where its reasoning adds the most value.
2. **Read what already exists.** Never re-run tests, never instrument them. Consume `playwright-report/results.json` and `trace.zip`, which Playwright already produces.
3. **Comment, don't gate.** verdict-guard posts a single PR comment. It never blocks a merge directly — that decision belongs to branch protection rules the team configures themselves.
4. **Stay in the repo.** No dashboard, no JUnit upload, no external SaaS. The PR comment is the entire user surface.
5. **Cost-bounded.** LLM calls capped per PR (default 5), trace excerpts truncated (8KB), Sonnet not Opus by default.

## Components

| File | Responsibility |
|---|---|
| `src/index.ts` | Entry point; orchestrates the three checks and posts the comment. |
| `src/rubric.ts` | AST-based static rubric (6 rules) over changed test files. |
| `src/anti-masking.ts` | Git-diff scan for patterns that hide timing/correctness bugs. |
| `src/triage.ts` | LLM failure analysis with strict JSON-schema validation. |
| `src/playwright-report.ts` | Parser for Playwright `results.json`. |
| `src/git.ts` | Identifies which test files actually changed in this PR. |
| `src/comment.ts` | Single-comment formatter, marker `<!-- verdict-guard:comment -->`. |

## The rubric (6 rules)

| Rule | Severity | Detection |
|---|---|---|
| `TOAST_ONLY` | blocker (-35) | String literal containing `toast \| notification \| snackbar \| alert.*success` inside an assertion. |
| `NO_VALUE_ASSERTION` | blocker (-35) | Test has 1+ assertions but none of `.toEqual / .toBe / .toHaveText / .toHaveCount / .toHaveValue / .toHaveAttribute`. |
| `HIDDEN_WAIT_FOR_TIMEOUT` | warn (-10) | Any call to `page.waitForTimeout(...)`. |
| `WEAK_TO_BE_TRUTHY` | warn (-10) | Any `.toBeTruthy() / .toBeFalsy()`. |
| `MISSING_NEGATIVE_CASE` | warn (-10) | File contains 1+ positive tests but 0 tests whose name matches `invalid\|fail\|error\|forbidden\|reject\|unauthorized\|missing`. |
| `BROAD_SELECTOR` | warn (-10) | `locator()` arg matches `text= / css= / xpath= / .class / #id` with no compound selector. |

Score starts at 100 and is decremented by severity. Tests scoring below `threshold` (default 70) are flagged in the PR comment.

## The LLM triage contract

System prompt (verbatim in `src/triage.ts`) defines exactly 5 cause categories. Response is parsed against a Zod schema; malformed responses are silently dropped rather than failing the run. This avoids one bad model call breaking the whole action.

Inputs sent per failure:
- Test title
- Error message
- Trace excerpt (max 8KB)
- Last 10 network requests (when available)
- DOM snippet at failure point (max 2KB)

No source code is sent. No secrets, env vars, or fixture data is sent.

## What we deliberately didn't build

- **Auto-quarantine.** Trunk does this. We classify; humans quarantine.
- **Auto-fix.** Code review tools exist. We surface; humans fix.
- **A dashboard.** Currents does this. We stay in the PR.
- **Test execution.** Playwright does this. We read its output.
