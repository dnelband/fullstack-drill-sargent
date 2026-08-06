import "dotenv/config";
import { getDb, closeDb } from "../server/db.ts";
import type { BriefPriority, BriefStatus } from "../shared/types.ts";

const members: Array<{ _id: string; display_name: string; discipline: string }> = [
  { _id: "m1", display_name: "Ava Chen", discipline: "Engineering" },
  { _id: "m2", display_name: "Ben Ortiz", discipline: "Design" },
  { _id: "m3", display_name: "Cara Nilsen", discipline: "Engineering" },
  { _id: "m4", display_name: "Devon Blake", discipline: "Content" },
  { _id: "m5", display_name: "Elena Vogt", discipline: "Engineering" },
  { _id: "m6", display_name: "Farah Haddad", discipline: "Design" },
];

const briefs: Array<{
  _id: string;
  client_name: string;
  title: string;
  priority: BriefPriority;
  status: BriefStatus;
  assigned_member_id: string | null;
  due_at: string;
  notes: string;
}> = [
  { _id: "b1", client_name: "Northline Bank", title: "Homepage rate table refresh", priority: "high", status: "open", assigned_member_id: null, due_at: "2026-08-10T09:00:00.000Z", notes: "Legal needs the APY copy updated before the campaign launch." },
  { _id: "b2", client_name: "Parcelio", title: "Checkout empty-state illustration", priority: "medium", status: "open", assigned_member_id: null, due_at: "2026-08-10T09:15:00.000Z", notes: "Replace the placeholder art with the approved mascot set." },
  { _id: "b3", client_name: "Harbor Health", title: "Patient portal MFA copy", priority: "high", status: "claimed", assigned_member_id: "m2", due_at: "2026-08-10T09:30:00.000Z", notes: "Compliance asked for a clearer recovery-path explanation." },
  { _id: "b4", client_name: "Lumen Foods", title: "Recipe card schema markup", priority: "medium", status: "open", assigned_member_id: null, due_at: "2026-08-10T09:45:00.000Z", notes: "SEO brief is attached in the shared drive." },
  { _id: "b5", client_name: "Orbit Travel", title: "Mobile nav overflow on iOS", priority: "high", status: "open", assigned_member_id: null, due_at: "2026-08-10T10:00:00.000Z", notes: "Reproduced on iPhone 14 Safari only." },
  { _id: "b6", client_name: "Quilt Co", title: "Return policy FAQ rewrite", priority: "low", status: "completed", assigned_member_id: "m4", due_at: "2026-08-10T10:15:00.000Z", notes: "Published after legal review." },
  { _id: "b7", client_name: "Ridge Analytics", title: "Dashboard filter chip colors", priority: "medium", status: "open", assigned_member_id: null, due_at: "2026-08-10T10:30:00.000Z", notes: "Match the new brand tokens from the Figma library." },
  { _id: "b8", client_name: "Summit Fitness", title: "Class booking confirmation email", priority: "high", status: "claimed", assigned_member_id: "m1", due_at: "2026-08-10T10:45:00.000Z", notes: "Subject line A/B variants are in the ticket." },
  { _id: "b9", client_name: "Tide Retail", title: "PLP sort default to newest", priority: "low", status: "open", assigned_member_id: null, due_at: "2026-08-10T11:00:00.000Z", notes: "Merchandising wants newest arrivals first." },
  { _id: "b10", client_name: "Umbra Studios", title: "Case study hero video autoplay", priority: "medium", status: "open", assigned_member_id: null, due_at: "2026-08-10T11:15:00.000Z", notes: "Mute by default; respect reduced-motion." },
  { _id: "b11", client_name: "Vesper Hotels", title: "Accessibility contrast on CTA", priority: "high", status: "open", assigned_member_id: null, due_at: "2026-08-10T11:30:00.000Z", notes: "Fails WCAG AA on the sand background." },
  { _id: "b12", client_name: "Willow CRM", title: "Import CSV error messaging", priority: "medium", status: "claimed", assigned_member_id: "m3", due_at: "2026-08-10T11:45:00.000Z", notes: "Show row-level failures, not a generic toast." },
  { _id: "b13", client_name: "Yarrow Apps", title: "Pricing page annual toggle", priority: "low", status: "open", assigned_member_id: null, due_at: "2026-08-10T12:00:00.000Z", notes: "Default to annual with monthly alternate." },
  { _id: "b14", client_name: "Zinc Logistics", title: "Tracking page timezone bug", priority: "high", status: "open", assigned_member_id: null, due_at: "2026-08-10T12:15:00.000Z", notes: "Events render in UTC instead of local." },
  { _id: "b15", client_name: "Atlas Nonprofit", title: "Donation receipt PDF branding", priority: "medium", status: "open", assigned_member_id: null, due_at: "2026-08-10T12:30:00.000Z", notes: "Swap to the 2026 letterhead assets." },
  { _id: "b16", client_name: "Beacon Schools", title: "Parent portal password reset", priority: "high", status: "open", assigned_member_id: null, due_at: "2026-08-10T12:45:00.000Z", notes: "Emails are landing in spam for Gmail users." },
  { _id: "b17", client_name: "Cedar Market", title: "Cart upsell carousel pause", priority: "low", status: "completed", assigned_member_id: "m5", due_at: "2026-08-10T13:00:00.000Z", notes: "Autoplay disabled when off-screen." },
  { _id: "b18", client_name: "Drift Media", title: "Blog tag archive pagination", priority: "medium", status: "open", assigned_member_id: null, due_at: "2026-08-10T13:15:00.000Z", notes: "Page 2 returns empty for tags with >12 posts." },
];

async function main() {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.collection("members").insertMany(members as never);
  await db.collection("briefs").insertMany(
    briefs.map((brief) => ({
      ...brief,
      version: brief.status === "open" ? 1 : brief.status === "claimed" ? 2 : 3,
      updated_at: now,
    })) as never,
  );
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
