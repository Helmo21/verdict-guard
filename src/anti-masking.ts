import { execFileSync } from "node:child_process";

export interface MaskingFinding {
  file: string;
  pattern: "added-waitForTimeout" | "weakened-assertion" | "wrapped-in-try" | "skipped-test";
  line: string;
}

const PATTERNS: Array<{ pattern: MaskingFinding["pattern"]; regex: RegExp }> = [
  { pattern: "added-waitForTimeout", regex: /^\+.*\bwaitForTimeout\s*\(/ },
  { pattern: "weakened-assertion", regex: /^\+.*\.(toBeTruthy|toBeFalsy|not\.toThrow)\s*\(/ },
  { pattern: "wrapped-in-try", regex: /^\+\s*try\s*\{/ },
  { pattern: "skipped-test", regex: /^\+.*\.(skip|only|fixme)\s*\(/ },
];

export async function detectMasking(testFiles: string[]): Promise<MaskingFinding[]> {
  const findings: MaskingFinding[] = [];
  if (testFiles.length === 0) return findings;

  const baseRef = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "HEAD~1";
  let diff: string;
  try {
    diff = execFileSync("git", ["diff", "--unified=0", baseRef, "--", ...testFiles], {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch {
    return findings;
  }

  let currentFile: string | null = null;
  for (const line of diff.split("\n")) {
    const fileMatch = line.match(/^\+\+\+ b\/(.+)$/);
    if (fileMatch) {
      currentFile = fileMatch[1];
      continue;
    }
    if (!currentFile) continue;

    for (const { pattern, regex } of PATTERNS) {
      if (regex.test(line)) {
        findings.push({ file: currentFile, pattern, line: line.slice(1).trim() });
      }
    }
  }

  return findings;
}
