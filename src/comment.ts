import type { RubricResult } from "./rubric.js";
import type { MaskingFinding } from "./anti-masking.js";
import type { TriageResult } from "./triage.js";

export interface CommentInput {
  rubric: RubricResult[];
  masking: MaskingFinding[];
  triage: TriageResult[];
  threshold: number;
  totalFailures: number;
  triagedCount: number;
}

const HEADER = "<!-- verdict-guard:comment -->";

function rubricSection(rubric: RubricResult[], threshold: number): string {
  if (rubric.length === 0) return "";
  const flagged = rubric.filter((r) => r.score < threshold);

  if (flagged.length === 0) {
    return `### ✅ Verdict integrity\nAll ${rubric.length} changed tests scored at or above ${threshold}.\n`;
  }

  const lines = flagged.map((r) => {
    const findings = r.findings
      .map((f) => `  - **${f.rule.title}** (line ${f.line}) — ${f.rule.hint}`)
      .join("\n");
    return `- \`${r.file}\` → **${r.testName}** — score **${r.score}/100**\n${findings}`;
  });

  return `### 🛑 Verdict integrity — ${flagged.length} test${flagged.length === 1 ? "" : "s"} below threshold (${threshold})\n${lines.join("\n\n")}\n`;
}

function maskingSection(findings: MaskingFinding[]): string {
  if (findings.length === 0) return "";
  const lines = findings.map(
    (f) => `- \`${f.file}\` — **${f.pattern}** — \`${f.line}\``
  );
  return `### ⚠️ Possible flakiness masking — reviewer attention\nThis PR adds patterns that often hide timing or correctness bugs:\n${lines.join("\n")}\n`;
}

function triageSection(triages: TriageResult[], totalFailures: number, triagedCount: number): string {
  if (totalFailures === 0) return `### 🟢 All tests passed\nNothing to triage.\n`;
  if (triages.length === 0) return `### 🔴 ${totalFailures} failure${totalFailures === 1 ? "" : "s"} — triage disabled\n`;

  const cards = triages.map((t) => {
    const { failure, verdict } = t;
    return [
      `<details><summary><strong>${failure.title}</strong> — cause: <code>${verdict.cause}</code> · severity: <code>${verdict.severity}</code></summary>`,
      ``,
      `**Hypothesis** — ${verdict.hypothesis}`,
      ``,
      `**Reproduction steps**`,
      ...verdict.repro_steps.map((s, i) => `${i + 1}. ${s}`),
      ``,
      `**Next action** — ${verdict.next_action}`,
      ``,
      `<sub>File: \`${failure.file}\`</sub>`,
      `</details>`,
    ].join("\n");
  });

  const more = totalFailures > triagedCount ? `\n_${totalFailures - triagedCount} additional failure(s) not triaged (cap)._\n` : "";

  return `### 🔍 Failure triage — ${triagedCount} of ${totalFailures}\n${cards.join("\n\n")}${more}`;
}

export function formatComment(input: CommentInput): string {
  const sections = [
    HEADER,
    "## verdict-guard",
    "_Catches dishonest tests and triages real failures. [What this means →](https://github.com/antoine-pedretti/verdict-guard#what-it-does-90-seconds)_",
    "",
    rubricSection(input.rubric, input.threshold),
    maskingSection(input.masking),
    triageSection(input.triage, input.totalFailures, input.triagedCount),
  ];
  return sections.filter(Boolean).join("\n");
}
