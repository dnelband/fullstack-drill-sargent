/** @vitest-environment jsdom */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loadChallengeApp } from "../../client/src/load-challenge-app.tsx";
import type {
  AttemptResult,
  NextQuestionResponse,
  QuizConfig,
  QuizQuestionPublic,
} from "../../shared/types.ts";
import { installFetchMock, jsonResponse } from "./mock-fetch.ts";

const config: QuizConfig = { questions_per_session: 3, time_limit_seconds: 15 };

const questionOne: QuizQuestionPublic = {
  _id: "q1",
  prompt: "What does === compare?",
  category: "javascript",
  options: [
    { _id: "q1-o1", label: "Value only" },
    { _id: "q1-o2", label: "Value and type" },
    { _id: "q1-o3", label: "References only" },
    { _id: "q1-o4", label: "Truthy-ness only" },
  ],
};

const questionTwo: QuizQuestionPublic = {
  _id: "q2",
  prompt: "Which hook stores a mutable ref?",
  category: "react",
  options: [
    { _id: "q2-o1", label: "useState" },
    { _id: "q2-o2", label: "useRef" },
    { _id: "q2-o3", label: "useMemo" },
    { _id: "q2-o4", label: "useId" },
  ],
};

const questionThree: QuizQuestionPublic = {
  _id: "q3",
  prompt: "Which update operator increments?",
  category: "mongodb",
  options: [
    { _id: "q3-o1", label: "$set" },
    { _id: "q3-o2", label: "$push" },
    { _id: "q3-o3", label: "$inc" },
    { _id: "q3-o4", label: "$addToSet" },
  ],
};

function nextPayload(
  question: QuizQuestionPublic,
  remaining: number,
  serveId: string,
  deadlineAt = new Date(Date.now() + 60_000).toISOString(),
): NextQuestionResponse {
  return {
    serve_id: serveId,
    deadline_at: deadlineAt,
    remaining,
    question,
  };
}

function attemptFor(
  question: QuizQuestionPublic,
  optionId: string | null,
  correct: boolean,
  correctOptionId: string,
): AttemptResult {
  return {
    question_id: question._id,
    prompt: question.prompt,
    option_id: optionId,
    correct,
    correct_option_id: correctOptionId,
  };
}

type RouteHandlers = {
  config?: () => Promise<Response> | Response;
  next?: (url: URL) => Promise<Response> | Response;
  answer?: (url: URL, init: RequestInit | undefined) => Promise<Response> | Response;
};

function installQuizFetch(handlers: RouteHandlers = {}) {
  installFetchMock((url, init) => {
    const path = url.pathname;
    const method = (init?.method ?? "GET").toUpperCase();

    if (path.endsWith("/api/quiz/config") && method === "GET") {
      return handlers.config?.() ?? jsonResponse(config);
    }
    if (path.endsWith("/api/questions/next") && method === "GET") {
      return handlers.next?.(url) ?? jsonResponse(nextPayload(questionOne, 2, "serve-1"));
    }
    if (path.endsWith("/api/answers") && method === "POST") {
      return (
        handlers.answer?.(url, init) ??
        jsonResponse(attemptFor(questionOne, "q1-o2", true, "q1-o2"))
      );
    }
    return jsonResponse({ message: `Unhandled mock route: ${method} ${path}` }, 500);
  });
}

describe("pulse quiz UI", () => {
  test("[UI] Start screen shows a Start quiz button", async () => {
    installQuizFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    expect(screen.getByRole("button", { name: /start quiz/i })).toBeInTheDocument();
  });

  test("[UI] Starting the quiz loads config and shows the first question", async () => {
    installQuizFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await userEvent.click(screen.getByRole("button", { name: /start quiz/i }));
    expect(await screen.findByTestId("question-prompt")).toHaveTextContent(questionOne.prompt);
  });

  test("[UI] The question view shows prompt, options, timer, and progress", async () => {
    installQuizFetch();
    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await userEvent.click(screen.getByRole("button", { name: /start quiz/i }));
    expect(await screen.findByTestId("question-prompt")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /value and type/i })).toBeInTheDocument();
    expect(screen.getByTestId("question-timer")).toBeInTheDocument();
    expect(screen.getByTestId("quiz-progress")).toHaveTextContent("1 / 3");
  });

  test("[UI] Submitting an answer sends the selected option_id with the serve_id", async () => {
    let body: unknown;
    installQuizFetch({
      answer: (_url, init) => {
        body = JSON.parse(String(init?.body ?? "{}"));
        return jsonResponse(attemptFor(questionOne, "q1-o2", true, "q1-o2"));
      },
      next: (url) => {
        const exclude = url.searchParams.get("exclude") ?? "";
        if (!exclude) {
          return jsonResponse(nextPayload(questionOne, 2, "serve-1"));
        }
        return jsonResponse(nextPayload(questionTwo, 1, "serve-2"));
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await userEvent.click(screen.getByRole("button", { name: /start quiz/i }));
    await screen.findByTestId("question-prompt");
    await userEvent.click(screen.getByRole("radio", { name: /value and type/i }));
    await userEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    await waitFor(() => {
      expect(body).toMatchObject({ serve_id: "serve-1", option_id: "q1-o2" });
    });
  });

  test("[UI] A successful answer appends the API attempt and advances", async () => {
    installQuizFetch({
      next: (url) => {
        const exclude = url.searchParams.get("exclude") ?? "";
        if (!exclude) {
          return jsonResponse(nextPayload(questionOne, 2, "serve-1"));
        }
        return jsonResponse(nextPayload(questionTwo, 1, "serve-2"));
      },
      answer: () => jsonResponse(attemptFor(questionOne, "q1-o2", true, "q1-o2")),
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await userEvent.click(screen.getByRole("button", { name: /start quiz/i }));
    await screen.findByTestId("question-prompt");
    await userEvent.click(screen.getByRole("radio", { name: /value and type/i }));
    await userEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    await waitFor(() => {
      expect(screen.getByTestId("question-prompt")).toHaveTextContent(questionTwo.prompt);
      expect(screen.getByTestId("quiz-progress")).toHaveTextContent("2 / 3");
    });
  });

  test("[UI] Subsequent next requests exclude previously answered question ids", async () => {
    const excludeParams: string[] = [];
    installQuizFetch({
      next: (url) => {
        excludeParams.push(url.searchParams.get("exclude") ?? "");
        if (excludeParams.length === 1) {
          return jsonResponse(nextPayload(questionOne, 2, "serve-1"));
        }
        return jsonResponse(nextPayload(questionTwo, 1, "serve-2"));
      },
      answer: () => jsonResponse(attemptFor(questionOne, "q1-o1", false, "q1-o2")),
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await userEvent.click(screen.getByRole("button", { name: /start quiz/i }));
    await screen.findByTestId("question-prompt");
    await userEvent.click(screen.getByRole("radio", { name: /value only/i }));
    await userEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    await waitFor(() => {
      expect(excludeParams[1]).toContain("q1");
    });
  });

  test("[UI] When the timer expires the client auto-submits option_id null and advances", async () => {
    let answerBody: unknown;
    installQuizFetch({
      next: (url) => {
        const exclude = url.searchParams.get("exclude") ?? "";
        if (!exclude) {
          // Already expired — client must auto-POST { option_id: null }, not wait for a "late" click.
          return jsonResponse(
            nextPayload(
              questionOne,
              2,
              "serve-1",
              new Date(Date.now() - 1000).toISOString(),
            ),
          );
        }
        return jsonResponse(nextPayload(questionTwo, 1, "serve-2"));
      },
      answer: (_url, init) => {
        answerBody = JSON.parse(String(init?.body ?? "{}"));
        return jsonResponse(attemptFor(questionOne, null, false, "q1-o2"));
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await userEvent.click(screen.getByRole("button", { name: /start quiz/i }));
    await screen.findByTestId("question-prompt");

    await waitFor(() => {
      expect(answerBody).toMatchObject({
        serve_id: "serve-1",
        option_id: null,
      });
    });
    await waitFor(() => {
      expect(screen.getByTestId("question-prompt")).toHaveTextContent(questionTwo.prompt);
    });
  });

  test("[UI] Completing the quiz shows summary score built only from API attempts", async () => {
    let answerCount = 0;
    installQuizFetch({
      next: (url) => {
        const exclude = (url.searchParams.get("exclude") ?? "").split(",").filter(Boolean);
        if (exclude.length === 0) {
          return jsonResponse(nextPayload(questionOne, 2, "serve-1"));
        }
        if (exclude.length === 1) {
          return jsonResponse(nextPayload(questionTwo, 1, "serve-2"));
        }
        if (exclude.length === 2) {
          return jsonResponse(nextPayload(questionThree, 0, "serve-3"));
        }
        return jsonResponse({ message: "Quiz complete." }, 404);
      },
      answer: () => {
        answerCount += 1;
        if (answerCount === 1) {
          return jsonResponse(attemptFor(questionOne, "q1-o2", true, "q1-o2"));
        }
        if (answerCount === 2) {
          return jsonResponse(attemptFor(questionTwo, "q2-o2", true, "q2-o2"));
        }
        return jsonResponse(attemptFor(questionThree, "q3-o1", false, "q3-o3"));
      },
    });

    const ChallengeApp = await loadChallengeApp();
    render(<ChallengeApp />);
    await userEvent.click(screen.getByRole("button", { name: /start quiz/i }));

    await screen.findByTestId("question-prompt");
    await userEvent.click(screen.getByRole("radio", { name: /value and type/i }));
    await userEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    await screen.findByText(questionTwo.prompt);
    await userEvent.click(screen.getByRole("radio", { name: /useref/i }));
    await userEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    await screen.findByText(questionThree.prompt);
    await userEvent.click(screen.getByRole("radio", { name: /\$set/i }));
    await userEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    expect(await screen.findByTestId("summary-score")).toHaveTextContent("2 / 3");
    const results = screen.getByTestId("summary-results");
    expect(within(results).getByTestId("summary-result-q1")).toHaveTextContent(/correct/i);
    expect(within(results).getByTestId("summary-result-q2")).toHaveTextContent(/correct/i);
    expect(within(results).getByTestId("summary-result-q3")).toHaveTextContent(/incorrect/i);
  });
});
