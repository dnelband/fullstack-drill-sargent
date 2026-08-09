# MERN Challenges

Vite + Express + MongoDB (native driver) + Tailwind practice workspace.

## Current challenge

- `challenges/slug-studio/` — draft/publish pages with unique slugs and versioned PATCH
- `.solutions/slug-studio/` — reference implementation

Also on disk (inactive): `pulse-quiz`, `brief-desk`.

## Setup

```bash
cp .env.example .env
pnpm install
pnpm db:prepare
pnpm dev
```

App: client `http://localhost:4174`, API `http://localhost:4020`.

## Tests

```bash
pnpm test:challenge
pnpm test:solution
pnpm test:challenge:watch
```

## Notes

- No Mongoose — official `mongodb` package
- Solve only under `challenges/<slug>/exercise/`
- Do not edit `.solutions/` while practicing
