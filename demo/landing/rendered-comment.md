<!-- verdict-guard:comment -->
## verdict-guard
_Catches dishonest tests and triages real failures. [What this means →](https://github.com/antoine-pedretti/verdict-guard#what-it-does-90-seconds)_
### 🛑 Verdict integrity — 7 tests below threshold (70)
- `demo/landing/tests/dashboard.spec.ts` → **shows dashboard widgets** — score **55/100**
  - **No value-based assertion** (line 12) — Test contains only visibility/truthy checks. Assert on at least one specific value (text, count, attribute).
  - **No negative case in the same file** (line 0) — Add at least one test for the unhappy path (invalid input, missing permission, network error).

- `demo/landing/tests/dashboard.spec.ts` → **renders transaction list** — score **35/100**
  - **Broad selector** (line 21) — Selectors like text=Save or div.button match more than one element under load. Use role-based locators with names.
  - **Broad selector** (line 22) — Selectors like text=Save or div.button match more than one element under load. Use role-based locators with names.
  - **No value-based assertion** (line 19) — Test contains only visibility/truthy checks. Assert on at least one specific value (text, count, attribute).
  - **No negative case in the same file** (line 0) — Add at least one test for the unhappy path (invalid input, missing permission, network error).

- `demo/landing/tests/login.spec.ts` → **loads the login page** — score **45/100**
  - **Weak .toBeTruthy() instead of equality** (line 16) — Replace .toBeTruthy() with .toEqual(expected) or .toHaveText(...) so the test fails when the value changes silently.
  - **No value-based assertion** (line 13) — Test contains only visibility/truthy checks. Assert on at least one specific value (text, count, attribute).
  - **No negative case in the same file** (line 0) — Add at least one test for the unhappy path (invalid input, missing permission, network error).

- `demo/landing/tests/login.spec.ts` → **submits the login form** — score **35/100**
  - **Broad selector** (line 22) — Selectors like text=Save or div.button match more than one element under load. Use role-based locators with names.
  - **Broad selector** (line 23) — Selectors like text=Save or div.button match more than one element under load. Use role-based locators with names.
  - **No value-based assertion** (line 20) — Test contains only visibility/truthy checks. Assert on at least one specific value (text, count, attribute).
  - **No negative case in the same file** (line 0) — Add at least one test for the unhappy path (invalid input, missing permission, network error).

- `demo/landing/tests/notifications.spec.ts` → **displays success notification** — score **30/100**
  - **Toast-only assertion** (line 18) — Test only checks that a notification appeared. Add an assertion on the actual data the action produced.
  - **No value-based assertion** (line 14) — Test contains only visibility/truthy checks. Assert on at least one specific value (text, count, attribute).

- `demo/landing/tests/profile.spec.ts` → **renders profile page** — score **45/100**
  - **Weak .toBeTruthy() instead of equality** (line 17) — Replace .toBeTruthy() with .toEqual(expected) or .toHaveText(...) so the test fails when the value changes silently.
  - **No value-based assertion** (line 14) — Test contains only visibility/truthy checks. Assert on at least one specific value (text, count, attribute).
  - **No negative case in the same file** (line 0) — Add at least one test for the unhappy path (invalid input, missing permission, network error).

- `demo/landing/tests/transfer.spec.ts` → **shows success toast after transfer** — score **30/100**
  - **Toast-only assertion** (line 20) — Test only checks that a notification appeared. Add an assertion on the actual data the action produced.
  - **No value-based assertion** (line 16) — Test contains only visibility/truthy checks. Assert on at least one specific value (text, count, attribute).

### ⚠️ Possible flakiness masking — reviewer attention
This PR adds patterns that often hide timing or correctness bugs:
- `demo/landing/tests/transfer.spec.ts` — **added-waitForTimeout** — `await page.waitForTimeout(3000);`
- `demo/landing/tests/profile.spec.ts` — **weakened-assertion** — `expect(heading).toBeTruthy();`

### 🔍 Failure triage — 2 of 2
<details><summary><strong>creates a transfer and shows the new balance</strong> — cause: <code>test-drift</code> · severity: <code>major</code></summary>

**Hypothesis** — The data-testid 'balance' on /transfer was renamed to 'account-balance'. The DOM snapshot in the trace contains <div data-testid="account-balance">€900.00</div> — the expected value is present, but under a renamed selector. Application is correct; the test is stale.

**Reproduction steps**
1. Check out the PR branch
2. Run: npx playwright test demo/landing/tests/transfer.spec.ts:5 --headed
3. Observe the locator timeout on getByTestId('balance')
4. Inspect the DOM: the element is now [data-testid='account-balance']

**Next action** — Rename getByTestId('balance') → getByTestId('account-balance') in transfer.spec.ts.

<sub>File: `tests/transfer.spec.ts`</sub>
</details>

<details><summary><strong>logs in successfully and shows the logged-in identity</strong> — cause: <code>app-bug</code> · severity: <code>blocker</code></summary>

**Hypothesis** — Login succeeded (POST /api/login → 200) but the session endpoint now returns requiresOnboarding=true, redirecting to /onboarding instead of /dashboard. Either an onboarding flag was incorrectly applied to existing users, or the test predates a new onboarding step. The DOM at failure shows /onboarding's welcome page, not the dashboard.

**Reproduction steps**
1. Check out the PR branch
2. Run: npx playwright test demo/landing/tests/login.spec.ts:4 --headed
3. Watch the redirect from /login to /onboarding (not /dashboard)
4. Inspect /api/session response: requiresOnboarding=true
5. Decide: is the onboarding step intentional for existing users? If yes → update the test; if no → ship a fix to skip onboarding for already-onboarded users.

**Next action** — Confirm with product whether existing users should be sent to onboarding. The test needs updating only after this is decided.

<sub>File: `tests/login.spec.ts`</sub>
</details>