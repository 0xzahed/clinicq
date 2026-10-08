# ClinicQ — token queue, zero chaos

Clinic queue dashboard: doctors, auto-serial tokens, live now-serving
display and visit statuses. Built to demo to real clinics.

## Run it

```bash
npm install
cp .env.example .env   # optional — MongoDB persistence
npm run dev            # http://localhost:3000
```

Without `MONGODB_URI` data lives in `.data/` (gitignored file store).

## Features (built feature-by-feature)

- **F1/F2** — doctors + token-queue visits engine (serial per doctor per day, never reused)
- **F3** — live queue API: now-serving + waiting/serving/done counts (dashboard auto-refreshes every 15s)
- **F4** — dashboard UI + one-click demo seed
- **F5** — verified build + live tests (serials, serve flow)

## Notes

- `cacheComponents: false` + `dynamic = "force-dynamic"` so the queue is always live.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · Mongoose (optional)
