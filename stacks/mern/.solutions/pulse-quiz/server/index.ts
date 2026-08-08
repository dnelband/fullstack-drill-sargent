import { randomUUID } from "node:crypto";
import type { ChallengeServerModule } from "../../../server/types.ts";
import {
  QUIZ_QUESTIONS_PER_SESSION,
  QUIZ_TIME_LIMIT_SECONDS,
} from "../../../shared/quiz-constants.ts";
import type { AttemptResult, QuizQuestionPublic } from "../../../shared/types.ts";

type QuestionDoc = QuizQuestionPublic & {
  correct_option_id: string;
};

type ServeDoc = {
  _id: string;
  question_id: string;
  deadline_at: string;
  consumed_at: string | null;
};

function parseExclude(raw: unknown): string[] {
  if (typeof raw !== "string" || raw.trim() === "") {
    return [];
  }
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function toPublicQuestion(doc: QuestionDoc): QuizQuestionPublic {
  return {
    _id: doc._id,
    prompt: doc.prompt,
    category: doc.category,
    options: doc.options,
  };
}

function buildAttempt(
  question: QuestionDoc,
  optionId: string | null,
  forceIncorrect: boolean,
): AttemptResult {
  const correct =
    !forceIncorrect && optionId !== null && optionId === question.correct_option_id;
  return {
    question_id: question._id,
    prompt: question.prompt,
    option_id: optionId,
    correct,
    correct_option_id: question.correct_option_id,
  };
}

const referencePulseQuizServer: ChallengeServerModule = {
  async registerRoutes({ app, db }) {
    const questions = db.collection<QuestionDoc>("questions");
    const serves = db.collection<ServeDoc>("serves");

    app.get("/api/quiz/config", (_request, response) => {
      response.json({
        questions_per_session: QUIZ_QUESTIONS_PER_SESSION,
        time_limit_seconds: QUIZ_TIME_LIMIT_SECONDS,
      });
    });

    app.get("/api/questions/next", async (request, response) => {
      const exclude = parseExclude(request.query.exclude);

      if (exclude.length >= QUIZ_QUESTIONS_PER_SESSION) {
        response.status(404).json({ message: "Quiz complete." });
        return;
      }

      const filter = exclude.length > 0 ? { _id: { $nin: exclude } } : {};
      const matching = await questions.countDocuments(filter);
      if (matching === 0) {
        response.status(404).json({ message: "Quiz complete." });
        return;
      }

      const sampled = await questions
        .aggregate<QuestionDoc>([{ $match: filter }, { $sample: { size: 1 } }])
        .toArray();
      const doc = sampled[0];
      if (!doc) {
        response.status(404).json({ message: "Quiz complete." });
        return;
      }

      const serveId = randomUUID();
      const deadlineAt = new Date(Date.now() + QUIZ_TIME_LIMIT_SECONDS * 1000).toISOString();
      await serves.insertOne({
        _id: serveId,
        question_id: doc._id,
        deadline_at: deadlineAt,
        consumed_at: null,
      });

      response.json({
        serve_id: serveId,
        deadline_at: deadlineAt,
        remaining: QUIZ_QUESTIONS_PER_SESSION - exclude.length - 1,
        question: toPublicQuestion(doc),
      });
    });

    app.post("/api/answers", async (request, response) => {
      const serveId = String(request.body?.serve_id ?? "");
      const optionId =
        request.body?.option_id === null || request.body?.option_id === undefined
          ? null
          : String(request.body.option_id);

      if (!serveId) {
        response.status(400).json({ message: "missing serve_id" });
        return;
      }

      const existing = await serves.findOne({ _id: serveId });
      if (!existing) {
        response.status(404).json({ message: "Serve not found." });
        return;
      }
      if (existing.consumed_at) {
        response.status(409).json({ message: "Answer already submitted." });
        return;
      }

      const nowIso = new Date().toISOString();
      const expired = new Date(existing.deadline_at).getTime() <= Date.now();

      const consumed = await serves.findOneAndUpdate(
        { _id: serveId, consumed_at: null },
        { $set: { consumed_at: nowIso } },
        { returnDocument: "after" },
      );

      if (!consumed) {
        response.status(409).json({ message: "Answer already submitted." });
        return;
      }

      const question = await questions.findOne({ _id: consumed.question_id });
      if (!question) {
        response.status(404).json({ message: "Question not found." });
        return;
      }

      // Late, skip (null), or wrong → still a complete 200 attempt (SoT).
      response.json(buildAttempt(question, optionId, expired || optionId === null));
    });
  },
};

export default referencePulseQuizServer;
export { referencePulseQuizServer };
