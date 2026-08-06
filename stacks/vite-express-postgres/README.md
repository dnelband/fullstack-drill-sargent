# Vite + Express + Postgres Challenges

This stack is an isolated practice workspace for realistic fullstack interview challenges.

## Structure

- `client/`: Vite + React + Tailwind app shell
- `server/`: Express app shell and challenge loader
- `db/`: plain Postgres reset and seed scripts
- `challenges/dispatch-board/exercise/`: the only implementation path you work in during practice (server + UI + client `fetch`)
- `.solutions/dispatch-board/`: validated hidden reference implementation
- `tests/`: task-oriented challenge coverage (UI tests mock the network, not an injected API)

## Setup

1. Copy `.env.example` to `.env`.
2. Point `DATABASE_URL` at your local Postgres database.
3. Run `pnpm install`.
4. Run `pnpm db:prepare`.

## Scripts

- `pnpm dev:server`: start the Express API
- `pnpm dev:client`: start the Vite client
- `pnpm dev`: start both processes together
- `pnpm db:prepare`: reset and reseed the database
- `pnpm test:challenge`: run the exercise tests once
- `pnpm test:challenge:watch`: run the exercise tests in watch mode
- `pnpm test:solution`: run the same tests against the hidden reference solution
- `pnpm build`: type-check and build the client

## Recommended Terminal Layout

- Terminal 1: `pnpm dev`
- Terminal 2: `pnpm test:challenge:watch`

This keeps the app logs in one place and the failing task loop in another.

## How the Hidden Solution Works

The stack has a current challenge loader. It selects either:

- `exercise`: the intentionally incomplete implementation
- `reference`: the validated implementation in `.solutions/`

Challenge tests default to the exercise version. The `test:solution` script flips the loader to the hidden reference implementation so the same task suite can prove the challenge is solvable.
