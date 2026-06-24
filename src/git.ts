import { execFileSync } from "node:child_process";
import fg from "fast-glob";
import * as path from "node:path";

export async function getChangedTestFiles(globPattern: string): Promise<string[]> {
  const allMatchingTests = new Set(
    (await fg(globPattern, { dot: false })).map((p) => path.normalize(p))
  );

  const baseRef = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "HEAD~1";

  let diffOutput: string;
  try {
    diffOutput = execFileSync("git", ["diff", "--name-only", `${baseRef}...HEAD`], {
      encoding: "utf8",
    });
  } catch {
    return [...allMatchingTests];
  }

  const changed = diffOutput
    .split("\n")
    .map((s) => path.normalize(s.trim()))
    .filter(Boolean);

  return changed.filter((f) => allMatchingTests.has(f));
}
