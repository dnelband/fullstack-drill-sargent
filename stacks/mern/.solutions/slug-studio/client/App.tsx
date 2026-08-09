import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  fetchPages,
  fetchPublicPage,
  publishPage,
  unpublishPage,
  updatePage,
} from "./api.ts";
import type { PageRecord, PublicPage } from "../../../shared/types.ts";

function upsertPage(items: PageRecord[], next: PageRecord) {
  const index = items.findIndex((item) => item._id === next._id);
  if (index === -1) {
    return [next, ...items];
  }
  const copy = [...items];
  copy[index] = next;
  return copy;
}

export function ChallengeApp() {
  const [items, setItems] = useState<PageRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [bodyDraft, setBodyDraft] = useState("");
  const [slugDraft, setSlugDraft] = useState("");
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [publicPreview, setPublicPreview] = useState<PublicPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const expanded = useMemo(
    () => items.find((item) => item._id === expandedId) ?? null,
    [items, expandedId],
  );

  useEffect(() => {
    setIsLoading(true);
    void fetchPages()
      .then((pages) => {
        setItems(pages);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!expanded) {
      setTitleDraft("");
      setBodyDraft("");
      setSlugDraft("");
      return;
    }
    setTitleDraft(expanded.title);
    setBodyDraft(expanded.body);
    setSlugDraft(expanded.slug ?? "");
  }, [expanded]);

  function applyLatest(latest: PageRecord) {
    setItems((current) => upsertPage(current, latest));
    setTitleDraft(latest.title);
    setBodyDraft(latest.body);
    setSlugDraft(latest.slug ?? "");
  }

  async function handleSave() {
    if (!expanded) return;
    setIsMutating(true);
    setConflictMessage(null);
    try {
      const updated = await updatePage(expanded._id, {
        expected_version: expanded.version,
        title: titleDraft,
        body: bodyDraft,
      });
      applyLatest(updated);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const payload = error.payload as { latest?: PageRecord };
        if (payload.latest) {
          applyLatest(payload.latest);
        }
      }
      setConflictMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setIsMutating(false);
    }
  }

  async function handlePublish() {
    if (!expanded) return;
    setIsMutating(true);
    setConflictMessage(null);
    try {
      const updated = await publishPage(expanded._id, {
        expected_version: expanded.version,
        slug: slugDraft,
      });
      applyLatest(updated);
      if (updated.slug) {
        setPublicPreview(await fetchPublicPage(updated.slug));
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const payload = error.payload as { latest?: PageRecord };
        if (payload.latest) {
          applyLatest(payload.latest);
        }
      }
      setConflictMessage(error instanceof Error ? error.message : "Publish failed");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleUnpublish() {
    if (!expanded) return;
    setIsMutating(true);
    setConflictMessage(null);
    try {
      const updated = await unpublishPage(expanded._id, {
        expected_version: expanded.version,
      });
      applyLatest(updated);
      setPublicPreview(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const payload = error.payload as { latest?: PageRecord };
        if (payload.latest) {
          applyLatest(payload.latest);
        }
      }
      setConflictMessage(error instanceof Error ? error.message : "Unpublish failed");
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.25em] text-violet-300">Slug Studio</p>
          <h1 className="text-3xl font-semibold">Publish pages with unique slugs</h1>
          <p className="text-sm text-slate-400">
            Versioned drafts, contested slugs, public preview from the API.
          </p>
        </header>

        {conflictMessage ? (
          <p
            className="rounded-xl border border-amber-700/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-100"
            data-testid="conflict-message"
          >
            {conflictMessage}
          </p>
        ) : null}

        {isLoading ? <p className="text-slate-400">Loading pages…</p> : null}

        <ul className="space-y-3" data-testid="page-list">
          {items.map((page) => {
            const isExpanded = expandedId === page._id;
            const isEditing = editingId === page._id;
            return (
              <li
                key={page._id}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
                data-testid={`${page._id}-page-row`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span data-testid={`${page._id}-page-title`} className="font-medium">
                    {page.title}
                  </span>
                  <span data-testid={`${page._id}-page-status`} className="text-sm text-slate-400">
                    {page.status}
                  </span>
                  <span data-testid={`${page._id}-page-slug`} className="text-sm text-slate-400">
                    {page.slug ?? "—"}
                  </span>
                  <span data-testid={`${page._id}-page-version`} className="text-sm text-slate-500">
                    v{page.version}
                  </span>
                  <button
                    type="button"
                    className="ml-auto rounded-lg border border-slate-600 px-3 py-1 text-sm hover:bg-slate-800"
                    onClick={() => {
                      setExpandedId((current) => (current === page._id ? null : page._id));
                      setEditingId(null);
                      setConflictMessage(null);
                    }}
                  >
                    Expand
                  </button>
                </div>

                {isExpanded ? (
                  <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
                    {!isEditing ? (
                      <div data-testid={`${page._id}-details-view`} className="space-y-2 text-sm">
                        <p>
                          <span className="text-slate-500">Title: </span>
                          {page.title}
                        </p>
                        <p>
                          <span className="text-slate-500">Body: </span>
                          {page.body}
                        </p>
                        <p>
                          <span className="text-slate-500">Slug: </span>
                          {page.slug ?? "—"}
                        </p>
                        <button
                          type="button"
                          className="rounded-lg bg-slate-100 px-3 py-1 text-slate-950"
                          onClick={() => setEditingId(page._id)}
                        >
                          Edit
                        </button>
                      </div>
                    ) : (
                      <div data-testid={`${page._id}-details-form`} className="space-y-3">
                        <label className="block text-sm">
                          Title
                          <input
                            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                            data-testid={`${page._id}-title`}
                            value={titleDraft}
                            onChange={(event) => setTitleDraft(event.target.value)}
                            aria-label={`${page._id} title`}
                          />
                        </label>
                        <label className="block text-sm">
                          Body
                          <textarea
                            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                            data-testid={`${page._id}-body`}
                            value={bodyDraft}
                            onChange={(event) => setBodyDraft(event.target.value)}
                            aria-label={`${page._id} body`}
                            rows={4}
                          />
                        </label>
                        <label className="block text-sm">
                          Publish slug
                          <input
                            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                            data-testid="publish-slug"
                            value={slugDraft}
                            onChange={(event) => setSlugDraft(event.target.value)}
                            aria-label="Publish slug"
                          />
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-lg bg-cyan-600 px-3 py-2 font-medium disabled:opacity-50"
                            disabled={isMutating}
                            onClick={() => void handleSave()}
                          >
                            Save detail changes
                          </button>
                          <button
                            type="button"
                            className="rounded-lg bg-violet-600 px-3 py-2 font-medium disabled:opacity-50"
                            disabled={isMutating}
                            onClick={() => void handlePublish()}
                          >
                            Publish
                          </button>
                          {page.status === "published" ? (
                            <button
                              type="button"
                              className="rounded-lg border border-slate-600 px-3 py-2 disabled:opacity-50"
                              disabled={isMutating}
                              onClick={() => void handleUnpublish()}
                            >
                              Unpublish
                            </button>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        {publicPreview ? (
          <section
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
            data-testid="public-preview"
          >
            <h2 className="text-lg font-medium">{publicPreview.title}</h2>
            <p className="mt-2 text-sm text-slate-300">{publicPreview.body}</p>
            <p className="mt-2 text-xs text-slate-500">/{publicPreview.slug}</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
