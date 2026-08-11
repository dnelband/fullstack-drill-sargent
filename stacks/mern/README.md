# MERN Challenges

Vite + Express + MongoDB (native driver) + Tailwind practice workspace.

## Current challenge

- `challenges/product-filter/` — stackable product filters (live ~60m)
- `.solutions/product-filter/` — reference implementation

Also on disk (inactive): `leave-desk`, `slug-studio`, `pulse-quiz`, `brief-desk`.

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
