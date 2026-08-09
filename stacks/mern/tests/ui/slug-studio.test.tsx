/** @vitest-environment jsdom */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadChallengeApp } from "../../client/src/load-challenge-app.tsx";
import type { PageRecord, PublicPage } from "../../shared/types.ts";
import { installFetchMock, jsonResponse } from "./mock-fetch.ts";

const pageOne: PageRecord = {
  _id: "p1",
  title: "Launch checklist",
  body: "Ship the landing page this week.",
  slug: null,
  status: "draft",
  version: 1,
  updated_at: "2026-08-01T12:00:00.000Z",
  published_at: null,
};

const pageTwo: PageRecord = {
  _id: "p2",
  title: "Pricing",
  body: "Simple plans for teams.",
  slug: "pricing",
  status: "published",
  version: 3,
  updated_at: "2026-08-01T12:10:00.000Z",
  published_at: "2026-08-01T12:10:00.000Z",
};

function installStudioFetch(handlers: {
  list?: () => Response | Promise<Response>;
  patch?: (id: string, init: RequestInit | undefined) => Response | Promise<Response>;
  publish?: (id: string, init: RequestInit | undefined) => Response | Promise<Response>;
  public?: (slug: string) => Response | Promise<Response>;
} = {}) {
  installFetchMock((url, init) => {
    const path = url.pathname;
    const method = (init?.method ?? "GET").toUpperCase();

    if (path.endsWith("/api/pages") && method === "GET") {
      return handlers.list?.() ?? jsonResponse([pageOne, pageTwo]);
    }

    const pageMatch = path.match(/\/api\/pages\/([^/]+)$/);
    if (pageMatch && method === "PATCH") {
      return (
        handlers.patch?.(pageMatch[1], init) ??
        jsonResponse({ ...pageOne, title: "x", body: "y", version: 2 })
      );
    }

    const publishMatch = path.match(/\/api\/pages\/([^/]+)\/publish$/);
    if (publishMatch && method === "POST") {
      return (
        handlers.publish?.(publishMatch[1], init) ??
        jsonResponse({
          ...pageOne,
          status: "published",
          slug: "launch",
          version: 2,
          published_at: "2026-08-01T13:00:00.000Z",
        })
      );
    }

    const publicMatch = path.match(/\/api\/public\/([^/]+)$/);
    if (publicMatch && method === "GET") {
      return (
        handlers.public?.(publicMatch[1]) ??
        jsonResponse({
          title: "Launch checklist",
          body: "Ship the landing page this week.",
          slug: publicMatch[1],
          published_at: "2026-08-01T13:00:00.000Z",
        } satisfies PublicPage)
      );
    }

    return jsonResponse({ message: `Unhandled mock route: ${method} ${path}` }, 500);
  });
}

async function expandPage(row: HTMLElement) {
  await userEvent.click(within(row).getByRole("button", { name: /expand/i }));
}

async function enterEditMode(row: HTMLElement) {
  await expandPage(row);
  await userEvent.click(within(row).getByRole("button", { name: /^edit$/i }));
}

describe("slug studio UI", () => {
  test("[UI] The page list loads on first render", async () => {
    installStudioFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    expect(await screen.findByTestId("page-list")).toBeInTheDocument();
    expect(screen.getByTestId("p1-page-title")).toHaveTextContent("Launch checklist");
  });

  test("[UI] Expanding a page shows read-only details and an Edit button", async () => {
    installStudioFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("page-list");
    const row = screen.getByTestId("p1-page-row");
    expect(screen.queryByTestId("p1-details-form")).not.toBeInTheDocument();
    await expandPage(row);
    expect(screen.getByTestId("p1-details-view")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
    expect(screen.queryByTestId("p1-details-form")).not.toBeInTheDocument();
  });

  test("[UI] Clicking Edit shows the details form (title, body, publish slug, save)", async () => {
    installStudioFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("page-list");
    const row = screen.getByTestId("p1-page-row");
    await enterEditMode(row);
    expect(screen.getByTestId("p1-details-form")).toBeInTheDocument();
    expect(screen.getByTestId("p1-title")).toBeInTheDocument();
    expect(screen.getByTestId("p1-body")).toBeInTheDocument();
    expect(screen.getByTestId("publish-slug")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save detail changes/i })).toBeInTheDocument();
  });

  test("[UI] A successful save sends draft title and body and reflects the new version", async () => {
    let body: unknown;
    let listed: PageRecord[] = [pageOne, pageTwo];
    installStudioFetch({
      list: () => jsonResponse(listed),
      patch: (_id, init) => {
        body = JSON.parse(String(init?.body ?? "{}"));
        const input = body as { title: string; body: string; expected_version: number };
        const updated: PageRecord = {
          ...pageOne,
          title: input.title,
          body: input.body,
          version: input.expected_version + 1,
          updated_at: "2026-08-01T13:00:00.000Z",
        };
        listed = listed.map((page) => (page._id === updated._id ? updated : page));
        return jsonResponse(updated);
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("page-list");
    const row = screen.getByTestId("p1-page-row");
    await enterEditMode(row);

    const titleInput = screen.getByTestId("p1-title");
    const bodyInput = screen.getByTestId("p1-body");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Draft title");
    await userEvent.clear(bodyInput);
    await userEvent.type(bodyInput, "Draft body");
    await userEvent.click(screen.getByRole("button", { name: /save detail changes/i }));

    await waitFor(() => {
      expect(body).toMatchObject({
        expected_version: 1,
        title: "Draft title",
        body: "Draft body",
      });
    });
    expect(await screen.findByTestId("p1-page-version")).toHaveTextContent("v2");
    expect(screen.getByTestId("p1-page-title")).toHaveTextContent("Draft title");
  });

  test("[UI] A stale save shows the conflict message and applies latest", async () => {
    const latest: PageRecord = {
      ...pageOne,
      title: "Server title",
      body: "Server body",
      version: 4,
    };
    installStudioFetch({
      patch: () =>
        jsonResponse(
          {
            message: "Page was updated elsewhere.",
            latest,
          },
          409,
        ),
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("page-list");
    const row = screen.getByTestId("p1-page-row");
    await enterEditMode(row);
    await userEvent.click(screen.getByRole("button", { name: /save detail changes/i }));

    expect(await screen.findByTestId("conflict-message")).toHaveTextContent(
      /page was updated elsewhere/i,
    );
    expect(screen.getByTestId("p1-page-title")).toHaveTextContent("Server title");
    expect(screen.getByTestId("p1-page-version")).toHaveTextContent("v4");
  });

  test("[UI] Publishing updates status, slug, and the public preview", async () => {
    let listed: PageRecord[] = [pageOne, pageTwo];
    installStudioFetch({
      list: () => jsonResponse(listed),
      publish: () => {
        const updated: PageRecord = {
          ...pageOne,
          status: "published",
          slug: "launch",
          version: 2,
          published_at: "2026-08-01T13:00:00.000Z",
        };
        listed = listed.map((page) => (page._id === updated._id ? updated : page));
        return jsonResponse(updated);
      },
      public: () =>
        jsonResponse({
          title: "Launch checklist",
          body: "Ship the landing page this week.",
          slug: "launch",
          published_at: "2026-08-01T13:00:00.000Z",
        }),
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("page-list");
    const row = screen.getByTestId("p1-page-row");
    await enterEditMode(row);
    const slugInput = screen.getByTestId("publish-slug");
    await userEvent.clear(slugInput);
    await userEvent.type(slugInput, "launch");
    await userEvent.click(screen.getByRole("button", { name: /^publish$/i }));

    await waitFor(() => {
      expect(screen.getByTestId("p1-page-status")).toHaveTextContent("published");
      expect(screen.getByTestId("p1-page-slug")).toHaveTextContent("launch");
    });
    expect(await screen.findByTestId("public-preview")).toHaveTextContent("Launch checklist");
  });

  test("[UI] A taken slug shows the conflict message", async () => {
    installStudioFetch({
      publish: () =>
        jsonResponse(
          {
            message: "Slug already taken.",
            latest: pageOne,
            conflicting_page: {
              _id: "p2",
              title: "Pricing",
              slug: "pricing",
              status: "published",
            },
          },
          409,
        ),
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await screen.findByTestId("page-list");
    const row = screen.getByTestId("p1-page-row");
    await enterEditMode(row);
    const slugInput = screen.getByTestId("publish-slug");
    await userEvent.clear(slugInput);
    await userEvent.type(slugInput, "pricing");
    await userEvent.click(screen.getByRole("button", { name: /^publish$/i }));

    expect(await screen.findByTestId("conflict-message")).toHaveTextContent(/slug already taken/i);
  });
});
