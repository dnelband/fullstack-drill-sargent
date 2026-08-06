import type { Reporter, TestCase } from "vitest/node";

const ansi = {
  reset: "\u001b[0m",
  bold: "\u001b[1m",
  dim: "\u001b[2m",
  green: "\u001b[32m",
  red: "\u001b[31m",
  yellow: "\u001b[33m",
  cyan: "\u001b[36m",
};

function color(code: string, text: string) {
  if (process.env.NO_COLOR || process.stdout.isTTY === false) {
    return text;
  }

  return `${code}${text}${ansi.reset}`;
}

function fullError(error: unknown): string {
  if (!error) {
    return "unknown error";
  }

  if (typeof error === "string") {
    return error.trim();
  }

  if (error instanceof Error) {
    return error.message.trim();
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message).trim();
  }

  return "unknown error";
}

type ResultEntry =
  | { state: "passed"; title: string }
  | { state: "failed"; title: string; detail: string };

export default class ChallengeSummaryReporter implements Reporter {
  private readonly results = new Map<string, ResultEntry>();

  private reset() {
    this.results.clear();
  }

  onTestRunStart() {
    this.reset();
  }

  onTestCaseResult(testCase: TestCase) {
    const title = testCase.name;
    const state = testCase.result()?.state;

    if (state === "passed") {
      this.results.set(title, { state: "passed", title });
      return;
    }

    if (state === "failed") {
      const errors = testCase.result()?.errors ?? [];
      this.results.set(title, {
        state: "failed",
        title,
        detail: fullError(errors[0]),
      });
    }
  }

  onTestRunEnd() {
    const entries = [...this.results.values()];
    const passed = entries.filter((entry) => entry.state === "passed");
    const failed = entries.filter((entry) => entry.state === "failed");

    const lines: string[] = [
      "",
      color(ansi.bold + ansi.cyan, "Challenge summary"),
      color(ansi.dim, "----------------"),
    ];

    for (const entry of entries) {
      if (entry.state === "passed") {
        lines.push(`  ${color(ansi.green, "✓")} ${entry.title}`);
        continue;
      }

      lines.push(`  ${color(ansi.red, "✗")} ${entry.title}`);
      for (const detailLine of entry.detail.split("\n")) {
        lines.push(`      ${color(ansi.yellow, detailLine)}`);
      }
    }

    lines.push("");
    lines.push(
      `${color(ansi.green, `✓ Passed: ${passed.length}`)}   ${color(ansi.red, `✗ Failed: ${failed.length}`)}`,
    );
    lines.push("");

    console.log(lines.join("\n"));
    this.reset();
  }
}
