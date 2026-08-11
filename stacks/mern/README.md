# MERN Challenges

Vite + Express + MongoDB (native driver) + Tailwind practice workspace.

## Setup (fresh clone)

```bash
cp .env.example .env
pnpm install
pnpm challenge              # pick the exercise
pnpm challenge --prepare    # reset + seed for the active challenge
pnpm dev
```

## Current challenge

Active slug: `config/active-challenge.json` (catalog: `config/challenges.ts`).

```bash
pnpm challenge --list
pnpm challenge coupon-redeem --prepare
```

Solve under `challenges/<slug>/exercise/`. References in `.solutions/<slug>/`.

## Tests

```bash
pnpm test:challenge
pnpm test:solution
pnpm test:challenge:watch
```

## Notes

- No Mongoose — official `mongodb` package
- Per-challenge types: `challenges/<slug>/exercise/types.ts`
- Per-challenge seed: `challenges/<slug>/db/seed.ts`
- Do not edit `.solutions/` while practicing
