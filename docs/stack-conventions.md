# Stack Conventions

Each stack in this repository should follow the same challenge contract.

## Folder Shape

- `stacks/<stack-name>/`: isolated runnable project for one stack
- `stacks/<stack-name>/challenges/<challenge-slug>/exercise/`: practice implementation path
- `stacks/<stack-name>/.solutions/<challenge-slug>/`: hidden validated solution
- `stacks/<stack-name>/tests/`: task-oriented tests

## Required Ingredients Per Stack

- Tailwind in the UI
- seeded real data with at most 30 rows per table
- one README per challenge
- 11 to 15 meaningful Vitest tasks
- a hidden solution that passes the same requirements
- scripts for app startup and challenge tests in watch mode

## Exercise Boundaries

The exercise path owns the full implementation surface:

- server routes and SQL
- React UI and state
- **client HTTP / `fetch`** (query params, bodies, status handling, conflict payloads)

Do **not** put ready-made API client modules or injectable fake-API props in scaffolding. UI tests mock the network (`fetch` / MSW) so the exercise still writes and runs real client request code. Hidden solutions may keep their own `api.ts` next to the UI as the solved answer only.

## UI Test Queries

Prefer accessible roles (`getByRole` / `findByRole` with a name). Use `data-testid` only when no stable role exists (e.g. summary count tiles). Do not couple tests to one specific `<label>` / `htmlFor` / `aria-labelledby` pattern.

## Challenge Authoring Flow

1. Build the reference solution first.
2. Verify it against the task suite.
3. Move the solved implementation into `.solutions/`.
4. Replace the exercise path with the incomplete version used for practice.
5. Keep all answers out of the exercise path.

## Future Stack Notes

- `nextjs16/`: prefer App Router conventions, keep Tailwind installed, and adapt task tests to server/client boundaries.
- `mern/`: keep the same exercise and hidden-solution split, but adapt seeding and integration tests to MongoDB.
- Additional Vite-based stacks should keep the same two-terminal workflow whenever possible.
