import { useEffect, useState } from "react";
import {
  ApiError,
  fetchNextQuestion,
  fetchQuizConfig,
  submitAnswer,
} from "./api.ts";
import type {
  AttemptResult,
  NextQuestionResponse,
  QuizConfig,
} from "../../../shared/types.ts";

type Phase = "start" | "question" | "summary";

function secondsRemaining(deadlineAt: string, nowMs: number) {
  return Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - nowMs) / 1000));
}

export function ChallengeApp() {
  const [phase, setPhase] = useState<Phase>("start");
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [excludeIds, setExcludeIds] = useState<string[]>([]);
  const [active, setActive] = useState<NextQuestionResponse | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (phase !== "question" || !active) {
      return;
    }
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [phase, active?.serve_id]);

  useEffect(() => {
    if (phase !== "question" || !active || isSubmitting) {
      return;
    }
    if (secondsRemaining(active.deadline_at, nowMs) > 0) {
      return;
    }
    void finishAttempt(null);
  }, [nowMs, phase, active, isSubmitting]);

  async function loadNext(nextExclude: string[]) {
    try {
      const payload = await fetchNextQuestion(nextExclude);
      setActive(payload);
      setSelectedOptionId(null);
      setPhase("question");
      setNowMs(Date.now());
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setActive(null);
        setPhase("summary");
        setError(null);
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load question");
    }
  }

  async function handleStart() {
    setError(null);
    setExcludeIds([]);
    setAttempts([]);
    try {
      const nextConfig = await fetchQuizConfig();
      setConfig(nextConfig);
      await loadNext([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start quiz");
    }
  }

  async function finishAttempt(optionId: string | null) {
    if (!active || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    const questionId = active.question._id;

    try {
      // SoT: only append complete 200 attempt payloads from the API.
      const attempt = await submitAnswer({
        serve_id: active.serve_id,
        option_id: optionId,
      });
      const nextExclude = [...excludeIds, questionId];
      setExcludeIds(nextExclude);
      setAttempts((current) => [...current, attempt]);
      setActive(null);
      setIsSubmitting(false);
      await loadNext(nextExclude);
    } catch (err) {
      // 409 already-consumed → do not invent a row.
      setError(err instanceof Error ? err.message : "Failed to submit answer");
      setIsSubmitting(false);
    }
  }

  const progressIndex = excludeIds.length + (phase === "question" && active ? 1 : 0);
  const total = config?.questions_per_session ?? 5;
  const score = attempts.filter((item) => item.correct).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.25em] text-amber-300">Pulse Quiz</p>
          <h1 className="text-3xl font-semibold">Timed interview quiz</h1>
          <p className="text-sm text-slate-400">
            Five questions per run. One at a time. The API owns every attempt result.
          </p>
        </header>

        {error ? (
          <p className="rounded-xl border border-amber-700/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
            {error}
          </p>
        ) : null}

        {phase === "start" ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <p className="mb-4 text-slate-300">
              Five questions from a larger bank. Fifteen seconds each. Exclude answered ids on
              the next draw.
            </p>
            <button
              type="button"
              className="rounded-xl bg-amber-500 px-4 py-2 font-medium text-slate-950 hover:bg-amber-400"
              onClick={() => void handleStart()}
            >
              Start quiz
            </button>
          </div>
        ) : null}

        {phase === "question" && active ? (
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span data-testid="quiz-progress">
                {progressIndex} / {total}
              </span>
              <span data-testid="question-timer">
                {secondsRemaining(active.deadline_at, nowMs)}
              </span>
            </div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {active.question.category}
            </p>
            <h2 className="text-xl font-medium" data-testid="question-prompt">
              {active.question.prompt}
            </h2>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label="Answer options">
              {active.question.options.map((option) => (
                <label
                  key={option._id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 px-3 py-2 hover:border-slate-500"
                >
                  <input
                    type="radio"
                    name="quiz-option"
                    value={option._id}
                    checked={selectedOptionId === option._id}
                    disabled={isSubmitting}
                    onChange={() => setSelectedOptionId(option._id)}
                    aria-label={option.label}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              className="rounded-xl bg-cyan-600 px-4 py-2 font-medium hover:bg-cyan-500 disabled:opacity-50"
              disabled={isSubmitting || !selectedOptionId}
              onClick={() => void finishAttempt(selectedOptionId)}
            >
              Submit answer
            </button>
          </div>
        ) : null}

        {phase === "summary" ? (
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-2xl font-semibold">Summary</h2>
            <p className="text-lg">
              Score:{" "}
              <span data-testid="summary-score">
                {score} / {total}
              </span>
            </p>
            <ul className="space-y-2" data-testid="summary-results">
              {attempts.map((item) => (
                <li
                  key={item.question_id}
                  className="rounded-xl border border-slate-800 px-3 py-2 text-sm"
                  data-testid={`summary-result-${item.question_id}`}
                >
                  <span className={item.correct ? "text-emerald-400" : "text-rose-400"}>
                    {item.correct ? "Correct" : "Incorrect"}
                  </span>
                  <span className="ml-2 text-slate-300">{item.prompt}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="rounded-xl border border-slate-600 px-4 py-2 hover:bg-slate-800"
              onClick={() => {
                setPhase("start");
                setExcludeIds([]);
                setAttempts([]);
                setActive(null);
                setError(null);
              }}
            >
              Start quiz
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
