import "dotenv/config";
import { getDb, closeDb } from "../server/db.ts";
import type { PageRecord } from "../shared/types.ts";

const now = "2026-08-01T12:00:00.000Z";

function page(
  index: number,
  title: string,
  body: string,
  status: PageRecord["status"],
  slug: string | null,
  version: number,
  updatedOffsetMinutes: number,
): PageRecord {
  const updated = new Date(Date.parse(now) + updatedOffsetMinutes * 60_000).toISOString();
  return {
    _id: `p${index}`,
    title,
    body,
    slug,
    status,
    version,
    updated_at: updated,
    published_at: status === "published" ? updated : null,
  };
}

const pages: PageRecord[] = [
  page(1, "Launch checklist", "Ship the landing page this week.", "draft", null, 1, 0),
  page(2, "Pricing", "Simple plans for teams.", "published", "pricing", 3, 10),
  page(3, "About us", "We build practice challenges.", "draft", null, 1, 20),
  page(4, "Careers", "Join the studio.", "published", "careers", 2, 30),
  page(5, "Changelog", "What shipped recently.", "draft", "changelog", 4, 40),
  page(6, "Docs home", "Start here.", "published", "docs", 5, 50),
  page(7, "Privacy", "How we handle data.", "draft", null, 1, 60),
  page(8, "Contact", "Say hello.", "published", "contact", 2, 70),
  page(9, "Blog index", "Notes from the team.", "draft", null, 2, 80),
  page(10, "Status", "Systems operational.", "published", "status", 1, 90),
];

async function main() {
  const db = await getDb();
  await db.collection<PageRecord>("pages").insertMany(pages);
  console.log(`[db] seeded ${pages.length} pages`);
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
