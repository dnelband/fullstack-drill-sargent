import type { ComponentType } from "react";

export interface PulseQuizChallengeModule {
  ChallengeApp: ComponentType;
}

export const challengeTasks = [
  "[API] GET /api/quiz/config returns questions_per_session and time_limit_seconds",
  "[API] GET /api/questions/next returns a question not in the exclude list",
  "[API] GET /api/questions/next never includes correct_option_id in the payload",
  "[API] GET /api/questions/next returns 404 Quiz complete when the session is finished",
  "[API] GET /api/questions/next reports remaining count for the session after serving",
  "[API] POST /api/answers returns a complete attempt result when the answer is correct",
  "[API] POST /api/answers returns a complete attempt result when the answer is incorrect",
  "[API] POST /api/answers returns a complete incorrect attempt when option_id is null",
  "[API] POST /api/answers returns a complete incorrect attempt when the deadline has passed",
  "[API] POST /api/answers returns 409 when the serve was already consumed",
  "[API] POST /api/answers returns 404 for an unknown serve_id",
  "[UI] Start screen shows a Start quiz button",
  "[UI] Starting the quiz loads config and shows the first question",
  "[UI] The question view shows prompt, options, timer, and progress",
  "[UI] Submitting an answer sends the selected option_id with the serve_id",
  "[UI] A successful answer appends the API attempt and advances",
  "[UI] Subsequent next requests exclude previously answered question ids",
  "[UI] When the timer expires the client auto-submits option_id null and advances",
  "[UI] Completing the quiz shows summary score built only from API attempts",
] as const;
