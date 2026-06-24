import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface NetworkEntry {
  url: string;
  method: string;
  status: number;
}

export interface PlaywrightFailure {
  title: string;
  file: string;
  errorMessage: string;
  traceExcerpt: string;
  recentNetwork: NetworkEntry[];
  domSnippet?: string;
}

export interface PlaywrightReport {
  failures: PlaywrightFailure[];
  totalTests: number;
  flakyCount: number;
}

interface RawResult {
  status: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
  error?: { message?: string; stack?: string };
  attachments?: Array<{ name: string; path?: string; contentType?: string }>;
}

interface RawSpec {
  title: string;
  file: string;
  tests: Array<{ results: RawResult[] }>;
}

interface RawSuite {
  specs?: RawSpec[];
  suites?: RawSuite[];
}

interface RawReport {
  suites?: RawSuite[];
  stats?: { expected?: number; flaky?: number };
}

function collectSpecs(suite: RawSuite, out: RawSpec[] = []): RawSpec[] {
  if (suite.specs) out.push(...suite.specs);
  if (suite.suites) for (const s of suite.suites) collectSpecs(s, out);
  return out;
}

export async function readPlaywrightReport(reportDir: string): Promise<PlaywrightReport> {
  const resultsPath = path.join(reportDir, "results.json");

  let raw: RawReport;
  try {
    const content = await fs.readFile(resultsPath, "utf8");
    raw = JSON.parse(content) as RawReport;
  } catch {
    return { failures: [], totalTests: 0, flakyCount: 0 };
  }

  const specs = (raw.suites ?? []).flatMap((s) => collectSpecs(s));
  const failures: PlaywrightFailure[] = [];

  for (const spec of specs) {
    for (const test of spec.tests) {
      const last = test.results[test.results.length - 1];
      if (!last || (last.status !== "failed" && last.status !== "timedOut")) continue;

      failures.push({
        title: spec.title,
        file: spec.file,
        errorMessage: last.error?.message ?? "(no message)",
        traceExcerpt: last.error?.stack ?? "(no trace)",
        recentNetwork: [],
      });
    }
  }

  return {
    failures,
    totalTests: raw.stats?.expected ?? 0,
    flakyCount: raw.stats?.flaky ?? 0,
  };
}
