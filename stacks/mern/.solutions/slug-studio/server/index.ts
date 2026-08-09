import type { ChallengeServerModule } from "../../../server/types.ts";
import {
  SLUG_MAX_LENGTH,
  SLUG_MIN_LENGTH,
  SLUG_PATTERN,
} from "../../../shared/slug-studio.ts";
import type { PageRecord } from "../../../shared/types.ts";

function isValidSlug(slug: string) {
  return (
    slug.length >= SLUG_MIN_LENGTH &&
    slug.length <= SLUG_MAX_LENGTH &&
    SLUG_PATTERN.test(slug)
  );
}

const referenceSlugStudioServer: ChallengeServerModule = {
  async registerRoutes({ app, db }) {
    const pages = db.collection<PageRecord>("pages");

    async function findById(id: string) {
      return pages.findOne({ _id: id });
    }

    app.get("/api/pages", async (_request, response) => {
      const list = await pages.find({}).sort({ updated_at: -1 }).toArray();
      response.json(list);
    });

    app.get("/api/pages/:id", async (request, response) => {
      const page = await findById(request.params.id);
      if (!page) {
        response.status(404).json({ message: "Page not found." });
        return;
      }
      response.json(page);
    });

    app.patch("/api/pages/:id", async (request, response) => {
      const id = request.params.id;
      const expectedVersion = Number(request.body?.expected_version);
      const title = String(request.body?.title ?? "");
      const body = String(request.body?.body ?? "");

      if (!Number.isFinite(expectedVersion)) {
        response.status(400).json({ message: "expected_version is required" });
        return;
      }

      const updatedAt = new Date().toISOString();
      const updated = await pages.findOneAndUpdate(
        { _id: id, version: expectedVersion },
        {
          $set: { title, body, updated_at: updatedAt },
          $inc: { version: 1 },
        },
        { returnDocument: "after" },
      );

      if (!updated) {
        const latest = await findById(id);
        if (!latest) {
          response.status(404).json({ message: "Page not found." });
          return;
        }
        response.status(409).json({
          message: "Page was updated elsewhere.",
          latest,
        });
        return;
      }

      response.json(updated);
    });

    app.post("/api/pages/:id/publish", async (request, response) => {
      const id = request.params.id;
      const expectedVersion = Number(request.body?.expected_version);
      const slug = String(request.body?.slug ?? "").trim();

      if (!Number.isFinite(expectedVersion)) {
        response.status(400).json({ message: "expected_version is required" });
        return;
      }
      if (!isValidSlug(slug)) {
        response.status(400).json({ message: "Invalid slug." });
        return;
      }

      const current = await findById(id);
      if (!current) {
        response.status(404).json({ message: "Page not found." });
        return;
      }

      const owner = await pages.findOne({ slug, _id: { $ne: id } });
      if (owner) {
        response.status(409).json({
          message: "Slug already taken.",
          latest: current,
          conflicting_page: {
            _id: owner._id,
            title: owner.title,
            slug: owner.slug,
            status: owner.status,
          },
        });
        return;
      }

      const publishedAt = new Date().toISOString();
      const updated = await pages.findOneAndUpdate(
        { _id: id, version: expectedVersion },
        {
          $set: {
            status: "published",
            slug,
            published_at: publishedAt,
            updated_at: publishedAt,
          },
          $inc: { version: 1 },
        },
        { returnDocument: "after" },
      );

      if (!updated) {
        const latest = await findById(id);
        if (!latest) {
          response.status(404).json({ message: "Page not found." });
          return;
        }
        response.status(409).json({
          message: "Page was updated elsewhere.",
          latest,
        });
        return;
      }

      response.json(updated);
    });

    app.post("/api/pages/:id/unpublish", async (request, response) => {
      const id = request.params.id;
      const expectedVersion = Number(request.body?.expected_version);

      if (!Number.isFinite(expectedVersion)) {
        response.status(400).json({ message: "expected_version is required" });
        return;
      }

      const updatedAt = new Date().toISOString();
      const updated = await pages.findOneAndUpdate(
        { _id: id, version: expectedVersion, status: "published" },
        {
          $set: {
            status: "draft",
            published_at: null,
            updated_at: updatedAt,
          },
          $inc: { version: 1 },
        },
        { returnDocument: "after" },
      );

      if (!updated) {
        const latest = await findById(id);
        if (!latest) {
          response.status(404).json({ message: "Page not found." });
          return;
        }
        response.status(409).json({
          message: "Page was updated elsewhere.",
          latest,
        });
        return;
      }

      response.json(updated);
    });

    app.get("/api/public/:slug", async (request, response) => {
      const page = await pages.findOne({
        slug: request.params.slug,
        status: "published",
      });
      if (!page || !page.slug || !page.published_at) {
        response.status(404).json({ message: "Page not found." });
        return;
      }
      response.json({
        title: page.title,
        body: page.body,
        slug: page.slug,
        published_at: page.published_at,
      });
    });
  },
};

export default referenceSlugStudioServer;
export { referenceSlugStudioServer };
