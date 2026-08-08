import request from "supertest";
import { createApp } from "../../server/create-app.ts";
import { closeDb, getDb } from "../../server/db.ts";
import {
  QUIZ_POOL_SIZE,
  QUIZ_QUESTIONS_PER_SESSION,
  QUIZ_TIME_LIMIT_SECONDS,
} from "../../shared/quiz-constants.ts";

async function assertSeededDatabase() {
  const db = await getDb();
  const count = await db.collection("questions").countDocuments();
  if (count !== QUIZ_POOL_SIZE) {
    throw new Error(
      `Expected ${QUIZ_POOL_SIZE} questions. Run \`pnpm db:prepare\` before the API tests.`,
    );
  }
}

describe("pulse quiz API", () => {
  beforeAll(async () => {
    await assertSeededDatabase();
  });

  beforeEach(async () => {
    const db = await getDb();
    await db.collection("serves").deleteMany({});
  });

  afterAll(async () => {
    await closeDb();
  });

  test("[API] GET /api/quiz/config returns questions_per_session and time_limit_seconds", async () => {
    const app = await createApp();
    const response = await request(app).get("/api/quiz/config").expect(200);
    expect(response.body).toEqual({
      questions_per_session: QUIZ_QUESTIONS_PER_SESSION,
      time_limit_seconds: QUIZ_TIME_LIMIT_SECONDS,
    });
  });

  test("[API] GET /api/questions/next returns a question not in the exclude list", async () => {
    const app = await createApp();
    const first = await request(app).get("/api/questions/next").expect(200);
    const excludedId = first.body.question._id as string;

    const second = await request(app)
      .get(`/api/questions/next?exclude=${excludedId}`)
      .expect(200);

    expect(second.body.question._id).not.toBe(excludedId);
    expect(second.body.serve_id).toBeTruthy();
    expect(second.body.deadline_at).toBeTruthy();
  });

  test("[API] GET /api/questions/next never includes correct_option_id in the payload", async () => {
    const app = await createApp();
    const response = await request(app).get("/api/questions/next").expect(200);
    expect(JSON.stringify(response.body)).not.toContain("correct_option_id");
    expect(response.body.question.options).toHaveLength(4);
  });

  test("[API] GET /api/questions/next returns 404 Quiz complete when the session is finished", async () => {
    const app = await createApp();
    const exclude = Array.from(
      { length: QUIZ_QUESTIONS_PER_SESSION },
      (_, index) => `q${index + 1}`,
    );
    const response = await request(app)
      .get(`/api/questions/next?exclude=${exclude.join(",")}`)
      .expect(404);
    expect(response.body.message).toBe("Quiz complete.");
  });

  test("[API] GET /api/questions/next reports remaining count for the session after serving", async () => {
    const app = await createApp();
    const response = await request(app).get("/api/questions/next").expect(200);
    expect(response.body.remaining).toBe(QUIZ_QUESTIONS_PER_SESSION - 1);

    const second = await request(app)
      .get(`/api/questions/next?exclude=${response.body.question._id}`)
      .expect(200);
    expect(second.body.remaining).toBe(QUIZ_QUESTIONS_PER_SESSION - 2);
  });

  test("[API] POST /api/answers returns a complete attempt result when the answer is correct", async () => {
    const app = await createApp();
    const next = await request(app).get("/api/questions/next").expect(200);
    const db = await getDb();
    const question = await db.collection("questions").findOne({ _id: next.body.question._id });

    const response = await request(app)
      .post("/api/answers")
      .send({ serve_id: next.body.serve_id, option_id: question!.correct_option_id })
      .expect(200);

    const expected = {
      question_id: next.body.question._id,
      prompt: next.body.question.prompt,
      option_id: question!.correct_option_id,
      correct: true,
      correct_option_id: question!.correct_option_id,
    };
    expect(
      response.body,
      `actual=${JSON.stringify(response.body, null, 2)}\nexpected=${JSON.stringify(expected, null, 2)}`,
    ).toMatchObject(expected);
  });

  test("[API] POST /api/answers returns a complete attempt result when the answer is incorrect", async () => {
    const app = await createApp();
    const next = await request(app).get("/api/questions/next").expect(200);
    const db = await getDb();
    const question = await db.collection("questions").findOne({ _id: next.body.question._id });
    const wrong = question!.options.find(
      (option: { _id: string }) => option._id !== question!.correct_option_id,
    );

    const response = await request(app)
      .post("/api/answers")
      .send({ serve_id: next.body.serve_id, option_id: wrong!._id })
      .expect(200);

    expect(response.body).toMatchObject({
      question_id: next.body.question._id,
      prompt: next.body.question.prompt,
      option_id: wrong!._id,
      correct: false,
      correct_option_id: question!.correct_option_id,
    });
  });

  test("[API] POST /api/answers returns a complete incorrect attempt when option_id is null", async () => {
    const app = await createApp();
    const next = await request(app).get("/api/questions/next").expect(200);

    const response = await request(app)
      .post("/api/answers")
      .send({ serve_id: next.body.serve_id, option_id: null })
      .expect(200);

    expect(response.body).toMatchObject({
      question_id: next.body.question._id,
      prompt: next.body.question.prompt,
      option_id: null,
      correct: false,
      correct_option_id: expect.any(String),
    });
  });

  test("[API] POST /api/answers returns a complete incorrect attempt when the deadline has passed", async () => {
    const app = await createApp();
    const next = await request(app).get("/api/questions/next").expect(200);
    const serveId = next.body.serve_id;
    expect(serveId).toBeTruthy();

    const db = await getDb();
    // Backdate via question_id + unconsumed serve — do not depend on _id string vs ObjectId.
    const updated = await db.collection("serves").updateOne(
      {
        question_id: next.body.question._id,
        consumed_at: null,
      } as never,
      { $set: { deadline_at: new Date(Date.now() - 1000).toISOString() } },
    );
    expect(updated.matchedCount).toBe(1);

    const response = await request(app)
      .post("/api/answers")
      .send({
        serve_id: serveId,
        option_id: next.body.question.options[0]._id,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      question_id: next.body.question._id,
      prompt: next.body.question.prompt,
      option_id: next.body.question.options[0]._id,
      correct: false,
      correct_option_id: expect.any(String),
    });
  });

  test("[API] POST /api/answers returns 409 when the serve was already consumed", async () => {
    const app = await createApp();
    const next = await request(app).get("/api/questions/next").expect(200);
    await request(app)
      .post("/api/answers")
      .send({ serve_id: next.body.serve_id, option_id: next.body.question.options[0]._id })
      .expect(200);

    await request(app)
      .post("/api/answers")
      .send({ serve_id: next.body.serve_id, option_id: next.body.question.options[1]._id })
      .expect(409);
  });

  test("[API] POST /api/answers returns 404 for an unknown serve_id", async () => {
    const app = await createApp();
    await request(app)
      .post("/api/answers")
      .send({ serve_id: "00000000-0000-4000-8000-000000000000", option_id: "q1-o1" })
      .expect(404);
  });
});
