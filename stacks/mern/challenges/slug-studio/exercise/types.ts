export type PageStatus = "draft" | "published";

export interface PageRecord {
  _id: string;
  title: string;
  body: string;
  slug: string | null;
  status: PageStatus;
  version: number;
  updated_at: string;
  published_at: string | null;
}

export interface UpdatePageInput {
  expected_version: number;
  title: string;
  body: string;
}

export interface PublishPageInput {
  expected_version: number;
  slug: string;
}

export interface UnpublishPageInput {
  expected_version: number;
}

export interface PublicPage {
  title: string;
  body: string;
  slug: string;
  published_at: string;
}

export interface PageConflictPayload {
  message: string;
  latest: PageRecord;
  conflicting_page?: Pick<PageRecord, "_id" | "title" | "slug" | "status">;
}
