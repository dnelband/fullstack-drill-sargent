import request from "supertest";
import { createApp } from "../../server/create-app.ts";
import { closeDb, getDb } from "../../server/db.ts";
import type { PageRecord } from "../../shared/types.ts";

const fixturePages: PageRecord[] = [
  {
    _id: "p1",
    title: "Launch checklist",
    body: "Ship the landing page this week.",
    slug: null,
    status: "draft",
    version: 1,
    updated_at: "2026-08-01T12:00:00.000Z",
    published_at: null,
  },
  {
    _id: "p2",
    title: "Pricing",
    body: "Simple plans for teams.",
    slug: "pricing",
    status: "published",
    version: 3,
    updated_at: "2026-08-01T12:10:00.000Z",
    published_at: "2026-08-01T12:10:00.000Z",
  },
  {
    _id: "p3",
    title: "About us",
    body: "We build practice challenges.",
    slug: null,
    status: "draft",
    version: 1,
    updated_at: "2026-08-01T12:20:00.000Z",
    published_at: null,
  },
];

async function assertSeededDatabase() {
  const db = await getDb();
  const count = await db.collection("pages").countDocuments();
  if (count < 1) {
    throw new Error(
      `Expected seeded pages. Run \`pnpm db:prepare\` before the API tests (found ${count}).`,
    );
  }
}

describe("slug studio API", () => {
  beforeAll(async () => {
    await assertSeededDatabase();
  });

  beforeEach(async () => {
    const db = await getDb();
    const pages = db.collection<PageRecord>("pages");
    await pages.deleteMany({});
    await pages.insertMany(fixturePages);
  });

  afterAll(async () => {
    await closeDb();
  });

  test("[API] GET /api/pages returns seeded pages ordered by updated_at desc", async () => {
    const app = await createApp();
    const response = await request(app).get("/api/pages").expect(200);
    expect(response.body).toHaveLength(3);
    expect(response.body.map((page: { _id: string }) => page._id)).toEqual([
      "p3",
      "p2",
      "p1",
    ]);
  });

  test("[API] GET /api/pages/:id returns a page or 404", async () => {
    const app = await createApp();
    const ok = await request(app).get("/api/pages/p1").expect(200);
    expect(ok.body.title).toBe("Launch checklist");
    await request(app).get("/api/pages/missing").expect(404);
  });

  test("[API] PATCH /api/pages/:id persists title and body and bumps version", async () => {
    const app = await createApp();
    const response = await request(app)
      .patch("/api/pages/p1")
      .send({
        expected_version: 1,
        title: "Launch checklist v2",
        body: "Updated body",
      })
      .expect(200);

    const expected = {
      _id: "p1",
      title: "Launch checklist v2",
      body: "Updated body",
      status: "draft",
      slug: null,
      version: 2,
    };
    expect(
      response.body,
      `actual=${JSON.stringify(response.body, null, 2)}\nexpected=${JSON.stringify(expected, null, 2)}`,
    ).toMatchObject(expected);
  });

  test("[API] PATCH /api/pages/:id returns 409 with latest when expected_version is stale", async () => {
    const app = await createApp();
    const response = await request(app)
      .patch("/api/pages/p1")
      .send({
        expected_version: 99,
        title: "Nope",
        body: "Nope",
      })
      .expect(409);

    expect(response.body.message).toBe("Page was updated elsewhere.");
    expect(response.body.latest).toMatchObject({
      _id: "p1",
      title: "Launch checklist",
      version: 1,
    });
  });

  test("[API] POST /api/pages/:id/publish publishes with a slug and bumps version", async () => {
    const app = await createApp();
    const response = await request(app)
      .post("/api/pages/p1/publish")
      .send({ expected_version: 1, slug: "launch" })
      .expect(200);

    expect(response.body).toMatchObject({
      _id: "p1",
      status: "published",
      slug: "launch",
      version: 2,
    });
    expect(response.body.published_at).toBeTruthy();
  });

  test("[API] POST /api/pages/:id/publish returns 409 with conflicting_page when the slug is taken", async () => {
    const app = await createApp();
    const list = await request(app).get("/api/pages").expect(200);
    const pages = list.body as PageRecord[];

    const owner = pages.find((page) => page.slug != null);
    const aspirant = pages.find(
      (page) => page.status === "draft" && page._id !== owner?._id,
    );
    expect(owner, "fixture must include a page that already owns a slug").toBeTruthy();
    expect(aspirant, "fixture must include a draft page to publish").toBeTruthy();

    const response = await request(app)
      .post(`/api/pages/${aspirant!._id}/publish`)
      .send({ expected_version: aspirant!.version, slug: owner!.slug })
      .expect(409);

    expect(response.body.message).toBe("Slug already taken.");
    expect(
      response.body.latest,
      `actual=${JSON.stringify(response.body.latest, null, 2)}`,
    ).toMatchObject({
      _id: aspirant!._id,
      title: aspirant!.title,
      status: aspirant!.status,
      version: aspirant!.version,
    });
    expect(
      response.body.conflicting_page,
      `actual=${JSON.stringify(response.body.conflicting_page, null, 2)}`,
    ).toMatchObject({
      _id: owner!._id,
      title: owner!.title,
      slug: owner!.slug,
      status: owner!.status,
    });
  });

  test("[API] POST /api/pages/:id/publish returns 409 with latest when expected_version is stale", async () => {
    const app = await createApp();
    const response = await request(app)
      .post("/api/pages/p1/publish")
      .send({ expected_version: 9, slug: "fresh-slug" })
      .expect(409);

    expect(response.body.message).toBe("Page was updated elsewhere.");
    expect(response.body.latest).toMatchObject({ _id: "p1", version: 1 });
  });

  test("[API] POST /api/pages/:id/unpublish returns the page to draft and clears published_at", async () => {
    const app = await createApp();
    const response = await request(app)
      .post("/api/pages/p2/unpublish")
      .send({ expected_version: 3 })
      .expect(200);

    expect(response.body).toMatchObject({
      _id: "p2",
      status: "draft",
      slug: "pricing",
      published_at: null,
      version: 4,
    });
  });

  test("[API] GET /api/public/:slug returns a published page", async () => {
    const app = await createApp();
    const response = await request(app).get("/api/public/pricing").expect(200);
    expect(response.body).toEqual({
      title: "Pricing",
      body: "Simple plans for teams.",
      slug: "pricing",
      published_at: "2026-08-01T12:10:00.000Z",
    });
  });

  test("[API] GET /api/public/:slug returns 404 for a draft slug", async () => {
    const app = await createApp();
    await request(app)
      .post("/api/pages/p2/unpublish")
      .send({ expected_version: 3 })
      .expect(200);
    await request(app).get("/api/public/pricing").expect(404);
  });
});
