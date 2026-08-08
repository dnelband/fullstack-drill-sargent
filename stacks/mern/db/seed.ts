import "dotenv/config";
import { getDb, closeDb } from "../server/db.ts";
import { QUIZ_POOL_SIZE } from "../shared/quiz-constants.ts";

type SeedOption = { _id: string; label: string };
type SeedQuestion = {
  _id: string;
  prompt: string;
  category: "javascript" | "react" | "mongodb";
  options: SeedOption[];
  correct_option_id: string;
};

function q(
  index: number,
  category: SeedQuestion["category"],
  prompt: string,
  correctIndex: 0 | 1 | 2 | 3,
  labels: [string, string, string, string],
): SeedQuestion {
  const id = `q${index}`;
  const options = labels.map((label, optionIndex) => ({
    _id: `${id}-o${optionIndex + 1}`,
    label,
  }));
  return {
    _id: id,
    prompt,
    category,
    options,
    correct_option_id: options[correctIndex]._id,
  };
}

const questions: SeedQuestion[] = [
  q(1, "javascript", "What does `===` compare in JavaScript?", 1, [
    "Value only",
    "Value and type",
    "References only",
    "Truthy-ness only",
  ]),
  q(2, "javascript", "Which keyword declares a block-scoped variable?", 2, [
    "var",
    "static",
    "let",
    "define",
  ]),
  q(3, "javascript", "What does `Array.prototype.map` return?", 0, [
    "A new array",
    "The mutated original array",
    "A single value",
    "An iterator only",
  ]),
  q(4, "javascript", "Which value is nullish?", 3, [
    "0",
    "false",
    '""',
    "null",
  ]),
  q(5, "javascript", "What is the result of `typeof null`?", 1, [
    '"null"',
    '"object"',
    '"undefined"',
    '"number"',
  ]),
  q(6, "javascript", "Which method schedules a macrotask?", 0, [
    "setTimeout",
    "queueMicrotask",
    "Promise.resolve().then",
    "await Promise.resolve()",
  ]),
  q(7, "javascript", "What does `JSON.parse` throw on invalid input?", 2, [
    "TypeError",
    "RangeError",
    "SyntaxError",
    "ReferenceError",
  ]),
  q(8, "javascript", "Which operator is nullish coalescing?", 1, [
    "||",
    "??",
    "?.",
    "&&",
  ]),
  q(9, "javascript", "What does `Promise.all` do on the first rejection?", 0, [
    "Rejects immediately",
    "Waits for all then rejects",
    "Ignores the rejection",
    "Retries automatically",
  ]),
  q(10, "javascript", "Which array method short-circuits on the first truthy predicate?", 3, [
    "map",
    "filter",
    "forEach",
    "some",
  ]),
  q(11, "react", "What hook stores mutable values without re-rendering?", 1, [
    "useState",
    "useRef",
    "useMemo",
    "useId",
  ]),
  q(12, "react", "When do effects run by default after mount?", 0, [
    "After paint",
    "Before paint",
    "During render",
    "Only on unmount",
  ]),
  q(13, "react", "What should you pass to `key` in a list?", 2, [
    "Array index always",
    "A random number each render",
    "A stable id for the item",
    "The component display name",
  ]),
  q(14, "react", "Controlled inputs take their value from…", 1, [
    "The DOM only",
    "React state/props",
    "localStorage",
    "CSS variables",
  ]),
  q(15, "react", "Which hook derives a value from other values during render?", 3, [
    "useEffect",
    "useLayoutEffect",
    "useRef",
    "useMemo",
  ]),
  q(16, "react", "What does React Strict Mode intentionally do in development?", 0, [
    "Double-invoke certain lifecycles/effects",
    "Disable concurrent features",
    "Strip propTypes",
    "Force class components",
  ]),
  q(17, "react", "Context is best for…", 2, [
    "High-frequency mouse coordinates",
    "Replacing all props always",
    "Rarely changing shared values",
    "CSS-in-JS only",
  ]),
  q(18, "react", "What cleans up a `useEffect`?", 1, [
    "Returning a string",
    "Returning a function",
    "Throwing an error",
    "Calling `useCleanup`",
  ]),
  q(19, "react", "Which event prop name is correct?", 0, [
    "onClick",
    "onclick",
    "on-click",
    "clickHandler",
  ]),
  q(20, "react", "Fragments let you…", 3, [
    "Create portals",
    "Avoid hooks rules",
    "Mutate props",
    "Group children without an extra DOM node",
  ]),
  q(21, "mongodb", "In the native driver, which method returns a cursor?", 0, [
    "find",
    "findOne",
    "insertOne",
    "estimatedDocumentCount",
  ]),
  q(22, "mongodb", "Which update operator increments a numeric field?", 2, [
    "$set",
    "$push",
    "$inc",
    "$addToSet",
  ]),
  q(23, "mongodb", "What does `findOneAndUpdate` with `returnDocument: \"after\"` return?", 1, [
    "The pre-image only",
    "The document after the update",
    "Only the UpdateResult counts",
    "A change stream",
  ]),
  q(24, "mongodb", "Case-insensitive substring search often uses…", 0, [
    "$regex with $options: \"i\"",
    "$eq only",
    "$text without an index always",
    "$where always",
  ]),
  q(25, "mongodb", "Which aggregation stage joins collections?", 3, [
    "$match",
    "$group",
    "$project",
    "$lookup",
  ]),
  q(26, "mongodb", "A filter `{ status: \"open\" }` on update makes the write…", 1, [
    "Slower always",
    "Conditional / atomic with the matched predicate",
    "Impossible",
    "Only valid with transactions",
  ]),
  q(27, "mongodb", "String `_id` values are…", 0, [
    "Allowed when you set them explicitly",
    "Forbidden by the server",
    "Converted to ObjectId always",
    "Only valid in Mongoose",
  ]),
  q(28, "mongodb", "Which operator adds a value to an array if missing?", 2, [
    "$push",
    "$pull",
    "$addToSet",
    "$pop",
  ]),
  q(29, "mongodb", "Projection `{ password: 0 }` means…", 1, [
    "Include only password",
    "Exclude password",
    "Sort by password",
    "Index password",
  ]),
  q(30, "mongodb", "What does `$sample: { size: 1 }` do?", 0, [
    "Picks a random document",
    "Samples CPU usage",
    "Limits to first document by _id",
    "Creates a capped collection",
  ]),
];

if (questions.length !== QUIZ_POOL_SIZE) {
  throw new Error(`Expected ${QUIZ_POOL_SIZE} seed questions, got ${questions.length}`);
}

async function main() {
  const db = await getDb();
  await db.collection("questions").insertMany(questions as never[]);
  console.log(`[db] seeded ${questions.length} questions`);
}

main()
  .then(async () => {
    await closeDb();
    console.log("[db] seed complete");
  })
  .catch(async (error: unknown) => {
    console.error("[db] seed failed", error);
    await closeDb();
    process.exitCode = 1;
  });
