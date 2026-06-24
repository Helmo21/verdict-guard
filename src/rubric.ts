import * as fs from "node:fs/promises";
import { parse, AST_NODE_TYPES } from "@typescript-eslint/typescript-estree";
import type { TSESTree } from "@typescript-eslint/typescript-estree";

export interface RubricRule {
  id: string;
  title: string;
  severity: "blocker" | "warn";
  hint: string;
}

export interface RubricFinding {
  rule: RubricRule;
  line: number;
  excerpt: string;
}

export interface RubricResult {
  file: string;
  testName: string;
  score: number;
  findings: RubricFinding[];
}

export const RULES: Record<string, RubricRule> = {
  TOAST_ONLY: {
    id: "TOAST_ONLY",
    title: "Toast-only assertion",
    severity: "blocker",
    hint: "Test only checks that a notification appeared. Add an assertion on the actual data the action produced.",
  },
  NO_VALUE_ASSERTION: {
    id: "NO_VALUE_ASSERTION",
    title: "No value-based assertion",
    severity: "blocker",
    hint: "Test contains only visibility/truthy checks. Assert on at least one specific value (text, count, attribute).",
  },
  HIDDEN_WAIT_FOR_TIMEOUT: {
    id: "HIDDEN_WAIT_FOR_TIMEOUT",
    title: "Hidden waitForTimeout",
    severity: "warn",
    hint: "waitForTimeout masks timing bugs. Use expect.poll, waitFor, or web-first assertions instead.",
  },
  WEAK_TO_BE_TRUTHY: {
    id: "WEAK_TO_BE_TRUTHY",
    title: "Weak .toBeTruthy() instead of equality",
    severity: "warn",
    hint: "Replace .toBeTruthy() with .toEqual(expected) or .toHaveText(...) so the test fails when the value changes silently.",
  },
  MISSING_NEGATIVE_CASE: {
    id: "MISSING_NEGATIVE_CASE",
    title: "No negative case in the same file",
    severity: "warn",
    hint: "Add at least one test for the unhappy path (invalid input, missing permission, network error).",
  },
  BROAD_SELECTOR: {
    id: "BROAD_SELECTOR",
    title: "Broad selector",
    severity: "warn",
    hint: "Selectors like text=Save or div.button match more than one element under load. Use role-based locators with names.",
  },
};

const TOAST_REGEX = /toast|notification|snackbar|alert.*success/i;
const BROAD_SELECTOR_REGEX = /^(text=|css=|xpath=|\.|#)\w+$/;

const VALUE_ASSERTION_MATCHERS = new Set([
  "toEqual", "toBe", "toStrictEqual", "toMatchObject", "toMatchSnapshot",
  "toHaveText", "toContainText",
  "toHaveCount", "toHaveValue", "toHaveValues",
  "toHaveAttribute", "toHaveClass", "toContainClass", "toHaveCSS", "toHaveId",
  "toHaveTitle", "toHaveURL",
  "toHaveAccessibleName", "toHaveAccessibleDescription", "toHaveRole",
  "toHaveJSProperty", "toHaveScreenshot",
]);

function ruleScore(findings: RubricFinding[]): number {
  let score = 100;
  for (const f of findings) {
    score -= f.rule.severity === "blocker" ? 35 : 10;
  }
  return Math.max(0, score);
}

function expectChain(node: TSESTree.CallExpression): string[] {
  const chain: string[] = [];
  let current: TSESTree.Expression = node;
  while (current.type === AST_NODE_TYPES.CallExpression) {
    const callee: TSESTree.Expression = current.callee;
    if (callee.type === AST_NODE_TYPES.MemberExpression && callee.property.type === AST_NODE_TYPES.Identifier) {
      chain.unshift(callee.property.name);
      current = callee.object;
    } else if (callee.type === AST_NODE_TYPES.Identifier) {
      chain.unshift(callee.name);
      break;
    } else {
      break;
    }
  }
  return chain;
}

function extractStringArg(node: TSESTree.CallExpression): string | null {
  const arg = node.arguments[0];
  if (!arg) return null;
  if (arg.type === AST_NODE_TYPES.Literal && typeof arg.value === "string") return arg.value;
  if (arg.type === AST_NODE_TYPES.TemplateLiteral && arg.quasis.length === 1) return arg.quasis[0].value.cooked;
  return null;
}

function scanFile(source: string): Map<string, RubricFinding[]> {
  const findingsByTest = new Map<string, RubricFinding[]>();
  let ast: TSESTree.Program;
  try {
    ast = parse(source, { loc: true, jsx: false });
  } catch {
    return findingsByTest;
  }

  const collect = (testName: string, finding: RubricFinding) => {
    const existing = findingsByTest.get(testName) ?? [];
    existing.push(finding);
    findingsByTest.set(testName, existing);
  };

  const visitTest = (testName: string, body: TSESTree.Node) => {
    let hasValueAssertion = false;
    let assertionCount = 0;

    const walk = (node: TSESTree.Node) => {
      if (node.type === AST_NODE_TYPES.CallExpression) {
        const chain = expectChain(node);

        if (chain[0] === "expect") {
          assertionCount++;
          const tail = chain[chain.length - 1] ?? "";

          if (tail === "toBeTruthy" || tail === "toBeFalsy") {
            collect(testName, {
              rule: RULES.WEAK_TO_BE_TRUTHY,
              line: node.loc!.start.line,
              excerpt: `expect(...)..${tail}()`,
            });
          }
          if (VALUE_ASSERTION_MATCHERS.has(tail)) {
            hasValueAssertion = true;
          }
        }

        if (chain.includes("waitForTimeout")) {
          collect(testName, {
            rule: RULES.HIDDEN_WAIT_FOR_TIMEOUT,
            line: node.loc!.start.line,
            excerpt: "page.waitForTimeout(...)",
          });
        }

        if (chain.includes("locator") || chain.includes("$") || chain.includes("$$")) {
          const arg = extractStringArg(node);
          if (arg && BROAD_SELECTOR_REGEX.test(arg)) {
            collect(testName, {
              rule: RULES.BROAD_SELECTOR,
              line: node.loc!.start.line,
              excerpt: `locator("${arg}")`,
            });
          }
        }

        for (const a of node.arguments) {
          if (a.type === AST_NODE_TYPES.Literal && typeof a.value === "string" && TOAST_REGEX.test(a.value)) {
            collect(testName, {
              rule: RULES.TOAST_ONLY,
              line: node.loc!.start.line,
              excerpt: `"${a.value}"`,
            });
          }
        }
      }

      for (const key of Object.keys(node) as Array<keyof TSESTree.Node>) {
        const child = (node as unknown as Record<string, unknown>)[key as string];
        if (Array.isArray(child)) {
          for (const c of child) if (c && typeof c === "object" && "type" in c) walk(c as TSESTree.Node);
        } else if (child && typeof child === "object" && "type" in (child as object)) {
          walk(child as TSESTree.Node);
        }
      }
    };

    walk(body);

    if (assertionCount > 0 && !hasValueAssertion) {
      collect(testName, {
        rule: RULES.NO_VALUE_ASSERTION,
        line: (body.loc?.start.line ?? 0),
        excerpt: `${assertionCount} assertion(s), none value-based`,
      });
    }
  };

  let positiveTests = 0;
  let negativeTests = 0;
  const negativeRegex = /invalid|fail|error|forbidden|reject|unauthorized|missing/i;

  const visit = (node: TSESTree.Node) => {
    if (node.type === AST_NODE_TYPES.CallExpression) {
      const callee = node.callee;
      const isTest =
        (callee.type === AST_NODE_TYPES.Identifier && callee.name === "test") ||
        (callee.type === AST_NODE_TYPES.MemberExpression &&
          callee.object.type === AST_NODE_TYPES.Identifier &&
          callee.object.name === "test");

      if (isTest && node.arguments.length >= 2) {
        const name = extractStringArg(node);
        const fn = node.arguments[1];
        if (name && (fn.type === AST_NODE_TYPES.ArrowFunctionExpression || fn.type === AST_NODE_TYPES.FunctionExpression)) {
          if (negativeRegex.test(name)) negativeTests++;
          else positiveTests++;
          visitTest(name, fn.body);
        }
      }
    }
    for (const key of Object.keys(node) as Array<keyof TSESTree.Node>) {
      const child = (node as unknown as Record<string, unknown>)[key as string];
      if (Array.isArray(child)) {
        for (const c of child) if (c && typeof c === "object" && "type" in c) visit(c as TSESTree.Node);
      } else if (child && typeof child === "object" && "type" in (child as object)) {
        visit(child as TSESTree.Node);
      }
    }
  };

  visit(ast);

  if (positiveTests > 0 && negativeTests === 0) {
    for (const testName of findingsByTest.keys()) {
      collect(testName, {
        rule: RULES.MISSING_NEGATIVE_CASE,
        line: 0,
        excerpt: `${positiveTests} positive test(s), 0 negative`,
      });
    }
    if (findingsByTest.size === 0 && positiveTests > 0) {
      collect("(file-level)", {
        rule: RULES.MISSING_NEGATIVE_CASE,
        line: 0,
        excerpt: `${positiveTests} positive test(s), 0 negative`,
      });
    }
  }

  return findingsByTest;
}

export async function scanRubric(files: string[], _threshold: number): Promise<RubricResult[]> {
  const results: RubricResult[] = [];
  for (const file of files) {
    const source = await fs.readFile(file, "utf8");
    const findingsByTest = scanFile(source);
    for (const [testName, findings] of findingsByTest) {
      results.push({
        file,
        testName,
        score: ruleScore(findings),
        findings,
      });
    }
  }
  return results;
}
