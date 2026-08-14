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

/**
 * Vitest often serializes objects as: Object {\n  "a": 1,\n}
 * or as a JSON-encoded version of that string. Always prefer real JSON.
 * NEVER truncate.
 */
function parseVitestObjectDump(raw: string): unknown | undefined {
  let text = raw.trim();

  // JSON-encoded string wrapper: "\"Object {\\n ... }\""
  if (text.startsWith('"') && text.includes("Object {")) {
    try {
      const once = JSON.parse(text);
      if (typeof once === "string") {
        text = once.trim();
      }
    } catch {
      // keep text
    }
  }

  if (text.startsWith("Object {") && text.endsWith("}")) {
    const asJson = text.replace(/^Object\s*/, "").replace(/,(\s*[}\]])/g, "$1");
    try {
      return JSON.parse(asJson);
    } catch {
      return undefined;
    }
  }

  if (
    (text.startsWith("{") && text.endsWith("}")) ||
    (text.startsWith("[") && text.endsWith("]"))
  ) {
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function formatValue(value: unknown): string {
  if (typeof value === "string") {
    const parsed = parseVitestObjectDump(value);
    if (parsed !== undefined) {
      return JSON.stringify(parsed, null, 2);
    }
    // Already a multi-line dump from JsonAssertError — print as-is
    if (value.includes("\n") || value.startsWith("{") || value.startsWith("[")) {
      return value;
    }
    return value;
  }
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

function formatFailure(error: unknown): string {
  if (error == null) {
    return "unknown error";
  }

  if (typeof error !== "object") {
    return String(error);
  }

  const err = error as {
    name?: string;
    message?: unknown;
    actual?: unknown;
    expected?: unknown;
    extra?: Record<string, unknown>;
    jsonActual?: unknown;
    jsonExpected?: unknown;
    jsonExtra?: Record<string, unknown>;
  };

  const message = String(err.message ?? "");

  // expect-json JsonAssertError — message is already the full dump.
  if (
    err.name === "JsonAssertError" ||
    message.includes("DIFF=") ||
    (message.includes("actual=") && message.includes("expected="))
  ) {
    return message;
  }

  const blocks: string[] = [];
  const extra = err.jsonExtra ?? err.extra;
  if (extra && typeof extra === "object") {
    for (const [key, value] of Object.entries(extra)) {
      blocks.push(`${key}=${formatValue(value)}`);
    }
  }

  if ("jsonActual" in err) {
    blocks.push(`actual=${formatValue(err.jsonActual)}`);
  } else if ("actual" in err && err.actual !== undefined) {
    blocks.push(`actual=${formatValue(err.actual)}`);
  }
  if ("jsonExpected" in err) {
    blocks.push(`expected=${formatValue(err.jsonExpected)}`);
  } else if ("expected" in err && err.expected !== undefined) {
    blocks.push(`expected=${formatValue(err.expected)}`);
  }

  // Prefer a real message over empty actual/expected (common for jest-dom / waitFor).
  if (message && (blocks.length === 0 || message.length > 20)) {
    const statusMatch = message.match(
      /expected (\d+)(?:\s+"[^"]*")?, got (\d+)(?:\s+"[^"]*")?/i,
    );
    if (statusMatch) {
      return `actual=${statusMatch[2]}\nexpected=${statusMatch[1]}`;
    }
    const unmangled = message.replace(
      /Object \{[\s\S]*?\n\}/g,
      (chunk) => {
        const parsed = parseVitestObjectDump(chunk);
        return parsed === undefined
          ? chunk
          : JSON.stringify(parsed, null, 2);
      },
    );
    if (blocks.length === 0) {
      return unmangled;
    }
    return `${unmangled}\n${blocks.join("\n")}`;
  }

  if (blocks.length > 0) {
    return blocks.join("\n");
  }

  return formatValue(error);
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
      const detail =
        errors.length === 0
          ? "unknown error"
          : errors.map((error) => formatFailure(error)).join("\n\n");
      this.results.set(title, { state: "failed", title, detail });
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
