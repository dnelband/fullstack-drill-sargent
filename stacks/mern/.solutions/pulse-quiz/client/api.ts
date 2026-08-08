import type {
  AttemptResult,
  NextQuestionResponse,
  QuizConfig,
  SubmitAnswerInput,
} from "../../../shared/types.ts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4020";

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export async function fetchQuizConfig() {
  const response = await fetch(`${API_BASE_URL}/api/quiz/config`);
  if (!response.ok) {
    throw new Error("Failed to load quiz config");
  }
  return readJson<QuizConfig>(response);
}

export async function fetchNextQuestion(excludeIds: string[]) {
  const params = new URLSearchParams();
  if (excludeIds.length > 0) {
    params.set("exclude", excludeIds.join(","));
  }
  const query = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/api/questions/next${query ? `?${query}` : ""}`,
  );
  const payload = await readJson<Record<string, unknown>>(response);
  if (!response.ok) {
    throw new ApiError(
      String(payload.message ?? "Failed to load next question"),
      response.status,
      payload,
    );
  }
  return payload as unknown as NextQuestionResponse;
}

export async function submitAnswer(input: SubmitAnswerInput) {
  const response = await fetch(`${API_BASE_URL}/api/answers`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await readJson<Record<string, unknown>>(response);
  if (!response.ok) {
    throw new ApiError(
      String(payload.message ?? "Failed to submit answer"),
      response.status,
      payload,
    );
  }
  return payload as unknown as AttemptResult;
}
