/**
 * ALWAYS dump the ENTIRE actual object (and expected) on failure.
 * Pass full response bodies / full entities — never field picks.
 * Also print a plain DIFF so the mismatch is obvious.
 *
 * Do NOT attach enumerable `actual` / `expected` props — Vitest rewrites those
 * into escaped `Object {\\n...}` dumps and clobbers the readable message.
 */

function dump(label: string, value: unknown): string {
  return `${label}=${JSON.stringify(value, null, 2)}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function matchesObject(actual: unknown, expected: unknown): boolean {
  if (!isPlainObject(expected)) {
    return JSON.stringify(actual) === JSON.stringify(expected);
  }
  if (!isPlainObject(actual)) {
    return false;
  }
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (!(key in actual)) {
      return false;
    }
    if (JSON.stringify(actual[key]) !== JSON.stringify(expectedValue)) {
      return false;
    }
  }
  return true;
}

/** Human-readable mismatch list — never truncates values. */
function diffLines(actual: unknown, expected: unknown): string[] {
  const lines: string[] = ["DIFF="];

  if (!isPlainObject(expected)) {
    if (actual !== expected) {
      lines.push(`  value differs`);
      lines.push(`    actual=${JSON.stringify(actual, null, 2)}`);
      lines.push(`    expected=${JSON.stringify(expected, null, 2)}`);
    }
    return lines;
  }

  if (!isPlainObject(actual)) {
    lines.push(`  actual is not an object`);
    lines.push(`    actual=${JSON.stringify(actual, null, 2)}`);
    return lines;
  }

  for (const [key, expectedValue] of Object.entries(expected)) {
    if (!(key in actual)) {
      lines.push(`  missing key "${key}"`);
      lines.push(`    expected=${JSON.stringify(expectedValue, null, 2)}`);
      continue;
    }
    const actualValue = actual[key];
    if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
      lines.push(`  key "${key}" differs`);
      lines.push(`    actual=${JSON.stringify(actualValue, null, 2)}`);
      lines.push(`    expected=${JSON.stringify(expectedValue, null, 2)}`);
    }
  }

  if (lines.length === 1) {
    lines.push(`  (no field-level diff — check nested/extra data above)`);
  }

  return lines;
}

function buildDump(
  actual: unknown,
  expected: unknown,
  extra?: Record<string, unknown>,
): string {
  return [
    ...(extra
      ? Object.entries(extra).map(([key, value]) => dump(key, value))
      : []),
    dump("actual", actual),
    dump("expected", expected),
    ...diffLines(actual, expected),
  ].join("\n");
}

export class JsonAssertError extends Error {
  constructor(
    actual: unknown,
    expected: unknown,
    extra?: Record<string, unknown>,
  ) {
    super(buildDump(actual, expected, extra));
    this.name = "JsonAssertError";
    // Keep payloads off enumerable actual/expected — Vitest mangles those.
    Object.defineProperty(this, "jsonActual", {
      value: actual,
      enumerable: false,
    });
    Object.defineProperty(this, "jsonExpected", {
      value: expected,
      enumerable: false,
    });
    Object.defineProperty(this, "jsonExtra", {
      value: extra,
      enumerable: false,
    });
  }
}

export function expectJsonMatch(
  actual: unknown,
  expected: unknown,
  extra?: Record<string, unknown>,
): void {
  if (!matchesObject(actual, expected)) {
    throw new JsonAssertError(actual, expected, extra);
  }
}

export function expectJsonEqual(
  actual: unknown,
  expected: unknown,
  extra?: Record<string, unknown>,
): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new JsonAssertError(actual, expected, extra);
  }
}
