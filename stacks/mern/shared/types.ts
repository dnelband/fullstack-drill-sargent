export type BriefStatus = "open" | "claimed" | "completed";
export type BriefPriority = "high" | "medium" | "low";

export const BRIEF_STATUS_OPTIONS: BriefStatus[] = [
  "claimed",
  "completed",
  "open",
];

export interface Member {
  _id: string;
  display_name: string;
  discipline: string;
}

export interface BriefRecord {
  _id: string;
  client_name: string;
  title: string;
  priority: BriefPriority;
  status: BriefStatus;
  assigned_member_id: string | null;
  assigned_member_name: string | null;
  due_at: string;
  notes: string;
  version: number;
  updated_at: string;
}

export interface BriefSummary {
  open: number;
  claimed: number;
  completed: number;
}

export interface BriefFilters {
  status?: BriefStatus | "all";
  assigned_member_id?: string | "all";
  search?: string;
}

export interface ClaimBriefInput {
  member_id: string;
}

export interface UpdateBriefInput {
  expected_version: number;
  status: BriefStatus;
  notes: string;
}

export type QuizCategory = "javascript" | "react" | "mongodb";

export interface QuizOption {
  _id: string;
  label: string;
}

export interface QuizQuestionPublic {
  _id: string;
  prompt: string;
  category: QuizCategory;
  options: QuizOption[];
}

export interface QuizConfig {
  questions_per_session: number;
  time_limit_seconds: number;
}

export interface NextQuestionResponse {
  serve_id: string;
  deadline_at: string;
  remaining: number;
  question: QuizQuestionPublic;
}

export interface SubmitAnswerInput {
  serve_id: string;
  option_id: string | null;
}

/** Complete attempt record — the only thing the UI appends to build the summary. */
export interface AttemptResult {
  question_id: string;
  prompt: string;
  option_id: string | null;
  correct: boolean;
  correct_option_id: string;
}

export type SubmitAnswerResponse = AttemptResult;

/** @deprecated Use AttemptResult */
export type QuizResultItem = AttemptResult;

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

export const BASE_URL = "http://localhost:4020";
