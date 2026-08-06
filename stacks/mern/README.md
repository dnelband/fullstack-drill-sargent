# MERN Challenges

Vite + Express + MongoDB (native driver) + Tailwind practice workspace.

## Current challenge

- `challenges/brief-desk/` — agency client brief intake desk
- `.solutions/brief-desk/` — reference implementation

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
pnpm test:challenge        # exercise
pnpm test:solution         # reference
pnpm test:challenge:watch
```

## Notes

- No Mongoose — use the official `mongodb` package
- Solve only under `challenges/<slug>/exercise/`
- Do not edit `.solutions/` while practicing
