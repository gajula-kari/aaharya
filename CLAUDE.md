# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

Aaharya is a mobile-first meal tracking PWA (in progress). Users photograph meals, tag them as CLEAN or INDULGENT, and track monthly indulgence against a self-set limit. Auth is device-based via a `x-user-id` header — no login flow.

## Monorepo structure

```
client/   React + Vite + TypeScript SPA
server/   Express + TypeScript + MongoDB REST API
```

The client proxies API calls to `localhost:3000` in dev (configured in `vite.config.ts`).

## Dev commands

```bash
# Client
cd client
npm run dev          # Vite dev server → http://localhost:5173
npm run build        # tsc + vite build
npm run preview      # serve production build → http://localhost:4173
npm run tunnel       # ngrok HTTPS tunnel → for testing PWA install on Android (requires preview running)
npm run typecheck    # type check only
npm run lint         # ESLint
npm test             # Vitest watch
npm test -- --run    # Vitest single run
npx vitest run --coverage          # tests + coverage (threshold: 90% branches)
npx vitest run src/pages/Home.test.tsx  # run a single test file

# Server
cd server
npm run dev          # tsx watch → http://localhost:3000
npm run build        # tsc → dist/
npm run lint         # ESLint
npm test             # Jest watch
npm test -- --run    # Jest single run
npm test -- controllers/mealsController.test.ts  # run a single test file
```

## Environment

Server needs `server/.env`:
```
PORT=3000
MONGODB_URI=<MongoDB Atlas connection string>
CLOUDINARY_CLOUD_NAME=<your cloud name>
CLOUDINARY_API_KEY=<your api key>
CLOUDINARY_API_SECRET=<your api secret>
```

## Architecture

### Client

- **Router**: `BrowserRouter` in `App.tsx`. Routes: `/`, `/tag`, `/day/:date`, `/settings`, `/meals`, `/onboard`
- `/tag` and `/settings` are transient — navigated to with `{ replace: true }` so they never accumulate in browser history. Both have a `<Navigate to="/" replace />` guard for direct URL access.
- `/onboard` is a first-run onboarding screen rendered outside `<Layout>` (no header). It is gated by `localStorage.getItem('aaharya_onboarded')` — absent on first open, set to `'true'` after the user completes onboarding. Returning users never see it.
- **State**: `MealProvider`, `SettingsProvider`, and `InstallProvider` (React Context) all wrap the app in `main.tsx`. `MealProvider` fetches meals on mount, caches to localStorage (images excluded). `SettingsProvider` fetches settings on mount and exposes `saveSettings`. `InstallProvider` captures the browser's `beforeinstallprompt` event and exposes `canInstall`, `dismissed`, `install()`, `dismiss()`. All pages consume via `useMealContext()` / `useSettingsContext()` / `useInstallContext()`.
- **Services**: `mealApi.ts` and `settingsApi.ts` — thin wrappers over `fetch` that attach the `x-user-id` device header.
- **Image flow**: captured via `<input type="file" capture="environment">`, passed as a `File` object via React Router location state to `/tag`. On save, compressed client-side to 600px/0.75 quality via canvas (`imageUtils.ts`), uploaded as multipart FormData to the server, which streams it to Cloudinary and stores the returned URL on the Meal document.

- **PWA**: configured via `vite-plugin-pwa` in `vite.config.ts`. Generates `sw.js` (service worker) and `manifest.webmanifest` at build time. Caching strategy: static assets → CacheFirst (precached); `/meals`, `/settings`, `/health` → NetworkFirst (5s timeout, 24h cache fallback); Cloudinary images → CacheFirst (30-day expiry). Install prompt: Home page shows a dismissible banner; Settings shows a quiet fallback if the banner was dismissed. Both use `useInstallContext()`.

### Server

- **Entry**: `server.ts` connects MongoDB then starts Express (`app.ts`)
- **Routes**: `GET/POST /meals`, `PATCH/DELETE /meals/:id`, `GET/PATCH /settings`, `GET /health`
- **User isolation**: every request reads `x-user-id` header — no session or token auth
- **Models**: `Meal` (userId, imageUrl, tag, amountSpent, note, occurredAt) and `UserSettings` (userId unique, monthlyIndulgentLimit, previousGoal, goalUpdatedAt)

## Husky hooks (automated — do not replicate manually)

| Hook | What it does |
|---|---|
| `pre-commit` | prettier auto-formats staged `.ts/.tsx` files |
| `commit-msg` | commitlint rejects invalid commit types |
| `pre-push` | lint + prettier check + tests + coverage on client and server |

## Commit and push rules

**When starting new work** (user asks for a new feature, fix, or task):
1. Check the current branch name against what's being asked.
   - If it matches → proceed on this branch.
   - If it doesn't match → ask the user: "Current branch is `<name>`. Continue here or create a new branch for this work?"
   - **Never rename an existing branch** — create a new one from current HEAD if needed:
   ```bash
   git checkout -b <name-that-matches-the-work>
   git push origin -u <name-that-matches-the-work>
   ```
2. Once the branch is decided, all commits for that task go on the same branch — do not re-check per commit.

**Before every commit** — explain what changed and why, propose the commit message, wait for approval.

**Commit format:**
```
<type>: <short description>

(optional body as bullet points)
```
Types only: `feat` · `fix` · `refactor` · `style` · `chore` · `docs` · `test`. One concern per commit.

**Before every push:**
1. `git pull origin main`
2. If the work added or changed routes, models, services, or dev commands — review and update this file
