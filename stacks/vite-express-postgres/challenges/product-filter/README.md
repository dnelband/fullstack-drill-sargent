# Product Filter Desk

Build a tiny **product filter desk**: query a catalog with stackable filters (brand, discount, stock) and render the matching list.

## Live budget

Intrinsic **Medium** / live **~60m Medium–Hard** / take-home **Easy–Medium**.  
Target: finish the suite in about an hour. **≤10 tests.** No claim, version, or Expand→Edit.

## Architecture (source of truth)

`POST /api/products/query` returns the **full matching `ProductRecord[]`** (`200`). Invalid filters → **`400`**. The UI must not invent products client-side from filter state alone — always render what the API returned.

| Outcome | Status | Body |
|---------|--------|------|
| Query success (including empty filters / empty result) | `200` | `ProductRecord[]` |
| Invalid filter key / operator / value | **`400` Bad Request** | `{ message }` |

Filters are an **intersection** (AND): a product must satisfy every filter in the array.

## Stack notes

- Native Postgres driver (no Postgresose)
- Keep `id` in JSON
- Express + React (Vite) + Tailwind

## Domain

### `products` (seeded)

| Field | Notes |
|-------|-------|
| `id` | e.g. `prod1` |
| `name` | |
| `brand` | |
| `discount_percent` | number 0–100 |
| `stock` | integer; `> 0` means in stock |

## API

`POST /api/products/query` body `{ filters: ProductFilter[] }`

`ProductFilter` (discriminated by `key`):

| key | operator | value |
|-----|----------|--------|
| `brand` | `contains` | string (case-insensitive substring) |
| `discount` | `greater_than` \| `less_than` \| `equal` | number |
| `stock` | `in_stock` \| `out_of_stock` | *(omit value)* |

- Empty `filters: []` → all products, ordered by `name` **asc**
- Unknown key/operator or wrong value type → `400`
- Result order: always `name` asc

## Product

1. On first render, query with **empty filters** and show the list  
2. Controls: brand text, discount operator + number, stock combobox, **Apply filters**  
3. Apply builds the `filters` array and `POST`s; replace the list with the response  
4. Show empty list state when the API returns `[]`

## UI hooks

| Hook | |
|------|--|
| `product-list` | |
| `{id}-product-row` | |
| `{id}-product-name`, `{id}-product-brand`, `{id}-product-discount`, `{id}-product-stock` | |
| `textbox` | Brand filter |
| `combobox` | Discount operator, Stock filter |
| `spinbutton` or `textbox` | Discount value (`aria-label="Discount value"`) |
| `button` | Apply filters |

## Difficulty

Intrinsic **Medium** · live **~60m Medium–Hard** · take-home **Easy–Medium**.

## Tasks

See `shared/product-filter.ts`.

## Workflow

```bash
cp .env.example .env
pnpm install && pnpm db:prepare && pnpm dev
pnpm test:challenge:watch
```

Solve only under `challenges/product-filter/exercise/`.
