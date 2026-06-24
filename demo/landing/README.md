# Verdict Bank — verdict-guard landing demo

A small Next.js mock app used to make verdict-guard's value proposition tangible.

## The point

The tests in `./tests/` are the demo's payload. They were written to look like a realistic batch of Playwright tests an AI assistant might produce in a single PR — some are honest, some pass without verifying anything meaningful. Open any spec file next to the page it tests and you can see exactly which assertions are doing real work and which aren't.

verdict-guard's job is to flag the bad ones before they reach `main`.

## See the app

```bash
cd demo/landing
npm install
npm run dev
# → open http://localhost:3000
```

Four flows:

| Route | What it does | Test file |
|---|---|---|
| `/transfer` | Money transfer form with balance | `tests/transfer.spec.ts` |
| `/login` | Email + password login | `tests/login.spec.ts` |
| `/dashboard` | Balance + recent transactions table | `tests/dashboard.spec.ts` |
| `/profile` | Update profile form | `tests/profile.spec.ts` |

Each page exposes the `data-testid` and `aria-label` attributes that the corresponding tests use.

## See verdict-guard's verdict

From the repo root:

```bash
npm run demo
```

This:
1. Runs the rubric against every test in `demo/landing/tests/`
2. Prints each test's score (out of 100) and which rules it violated
3. Reads a synthetic Playwright report at `demo/landing/playwright-report/results.json` (2 failures crafted for the demo)
4. Either calls Claude (`ANTHROPIC_API_KEY` set) or stubs the triage verdicts
5. Prints the exact PR comment the GitHub Action would post
6. Saves it to `demo/landing/rendered-comment.md`

Live triage:
```bash
ANTHROPIC_API_KEY=sk-ant-... npm run demo
```

## What you should see

About 7 tests passing the threshold (≥70), about 7 failing it (<70). Every one of verdict-guard's six rules fires at least once across the suite:

- `TOAST_ONLY` — `transfer.spec.ts` and `notifications.spec.ts` both have a test that only checks the success toast
- `NO_VALUE_ASSERTION` — `dashboard.spec.ts` has a test that only checks visibility
- `WEAK_TO_BE_TRUTHY` — `login.spec.ts` and `profile.spec.ts` both use `.toBeTruthy()`
- `HIDDEN_WAIT_FOR_TIMEOUT` — `transfer.spec.ts` has the 3-second sleep
- `BROAD_SELECTOR` — `login.spec.ts` and `dashboard.spec.ts` use `text=...` and `.classname` selectors
- `MISSING_NEGATIVE_CASE` — fires in files that lack an unhappy-path test

## Why the tests are scanned, not executed

verdict-guard is a **static** scanner — it reads test source code, it doesn't run browsers. You don't need Playwright installed in `demo/landing/` to make the demo work; you only need it if you want to actually exercise the mock app in a browser yourself.

The triage layer also reads from a stored Playwright report (`playwright-report/results.json`), not from a live run. The provided report contains two carefully crafted failures so the triage section of the rendered comment is meaningful.
