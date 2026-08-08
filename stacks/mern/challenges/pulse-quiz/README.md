# Pulse Quiz

Timed multi-choice quiz. A bank of **30** questions lives in MongoDB. Each run asks **5**: one shuffled question at a time via `exclude`, a per-question deadline, then a summary.

## Architecture (source of truth)

**Every finished attempt is a complete record from `POST /api/answers` (HTTP 200).**  
The UI builds the summary by appending those payloads only. Do **not** invent grades from error responses.

| Outcome | Status | Body |
|---------|--------|------|
| Graded (right/wrong/timeout skip) | `200` | full `AttemptResult` |
| Serve already consumed | `409` | conflict — do **not** append |
| Unknown serve | `404` | not found |

Timeout is a first-class client behavior: when `deadline_at` is reached, **auto-submit** `{ serve_id, option_id: null }`. There is no separate “late click” UI path — the timer submits for you. `option_id: null` still returns **`200`** with `correct: false` and every field needed for the summary.

## Stack notes

- Native MongoDB driver (no Mongoose)
- Keep `_id` in JSON
- Express + React (Vite) + Tailwind

## Domain

### `questions` (seeded, 30)

| Field | Notes |
|-------|-------|
| `_id` | e.g. `q1` |
| `prompt` | |
| `category` | `javascript` \| `react` \| `mongodb` |
| `options` | `[{ _id, label }]` × 4 |
| `correct_option_id` | server only — never on `/next` |

### `serves` (runtime)

| Field | Notes |
|-------|-------|
| `_id` | returned as `serve_id` |
| `question_id` | |
| `deadline_at` | ISO string |
| `consumed_at` | null until the attempt is recorded |

### Config

- `questions_per_session`: **5**
- `time_limit_seconds`: **15**

## API

- `GET /api/quiz/config` → `{ questions_per_session, time_limit_seconds }`
- `GET /api/questions/next?exclude=q1,q2` →
  - `200` `{ serve_id, deadline_at, remaining, question: { _id, prompt, category, options } }`
  - no `correct_option_id` on the payload
  - `remaining` = `questions_per_session - exclude.length - 1`
  - `404` `{ message: "Quiz complete." }` when `exclude.length >= questions_per_session` (or pool empty)
- `POST /api/answers` body `{ serve_id, option_id }` (`option_id` may be `null`):
  - Consume the serve once (unconsumed)
  - If past `deadline_at` or `option_id` is null/wrong → `correct: false` (still **200**)
  - `200` `AttemptResult`:
    ```ts
    {
      question_id: string;
      prompt: string;
      option_id: string | null;
      correct: boolean;
      correct_option_id: string;
    }
    ```
  - `409` if already consumed
  - `404` if serve unknown

## Product

1. Start quiz → load config → loop next / answer  
2. Progress `current / questions_per_session`  
3. Timer from `deadline_at`; when it hits zero, **automatically** `POST { serve_id, option_id: null }` (no manual “late” submit)
4. On **200**, append the attempt; on **409**, do not append  
5. When next is 404 complete → summary from the attempt list only  

## UI hooks

| Hook | |
|------|--|
| `button` | Start quiz, Submit answer |
| options | `radio` named by option label |
| `question-prompt` | |
| `question-timer` | seconds remaining |
| `quiz-progress` | e.g. `3 / 5` |
| `summary-score` | e.g. `2 / 5` |
| `summary-results` | |
| `summary-result-{question_id}` | shows Correct/Incorrect |

## Difficulty

Intrinsic **Hard** / live **Hardcore** / take-home **Medium–Hard**.

## Tasks

See `shared/pulse-quiz.ts`.

## Workflow

```bash
cp .env.example .env
pnpm install && pnpm db:prepare && pnpm dev
pnpm test:challenge:watch
```

Solve only under `challenges/pulse-quiz/exercise/`.
