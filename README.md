<div align="center">
  <img src="client/public/app_icon_color.png" alt="Aaharya app icon" width="80" />

  # aaharya

  **Indulge with intention.**

  [Live App](<!-- TODO: add production URL -->) · [GitHub](<!-- TODO: add GitHub repo URL -->) · [Report Bug](<!-- TODO: add GitHub issues URL -->)

  ![Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen)
  ![PWA](https://img.shields.io/badge/PWA-ready-5E7A52)
  <!-- TODO: Add Vercel deployment badge — available at vercel.com/[team]/[project] → Settings → Deployments -->

</div>

---

## What it is

Aaharya is a mobile-first meal tracking PWA. You photograph meals, tag them **clean** or **indulgent**, and track how many indulgent days you've used against a monthly limit you set yourself.

It doesn't count calories or weigh food. One indulgent meal marks the whole day — that's the only rule. The calendar makes the pattern visible without any spreadsheets.

---

## Screenshots

### Home screen
<img width="2000" height="1414" alt="3" src="https://github.com/user-attachments/assets/85717cf8-4572-427c-a18c-a7c186157715" />


### Day detail
<img width="2000" height="1414" alt="1" src="https://github.com/user-attachments/assets/2a149210-b88d-460c-af05-95801a543c03" />


### Onboarding
<img width="2000" height="1414" alt="Untitled design" src="https://github.com/user-attachments/assets/efa2575a-6bd7-4f9c-ae26-a7c5f68a226a" />

### Tag meal sheet

<img width="2000" height="1414" alt="2" src="https://github.com/user-attachments/assets/7117f2da-d627-45ab-98fe-f2aa5274484a" />


### All meals
<img width="2000" height="1414" alt="4" src="https://github.com/user-attachments/assets/54722309-00de-4fa6-8387-d4a0da183c4a" />


---
## Demo

<img width="392" height="850" alt="demo-gif" src="https://github.com/user-attachments/assets/6b57cd0d-2797-4c60-883d-03b73f557575" />



## Features

- **Photo-first meal logging** — capture with camera or pick from gallery; EXIF time is extracted automatically for gallery photos
- **Clean / Indulgent binary tagging** — no calories, no macros; one indulgent meal marks the whole day
- **Monthly indulgent day limit** — set a goal (3, 5, 7, 10, 15 or custom); a segmented bar tracks progress
- **Calendar visualization** — every day of the month color-coded: clean, indulgent, over-limit, or empty
- **Day detail with masonry meal grid** — tap any calendar day to see all meals in a 2-column layout
- **Meal editing and deletion** — edit tag, note, and amount after the fact; delete with a confirmation step
- **Amount tracking** — optional spend field (₹) per meal, shown on cards and in the day view
- **Streak indicator** — header shows a 🌱 streak count when you've logged 3+ consecutive days
- **Google SSO + Email/Password auth** — JWT-based with httpOnly cookies and refresh token rotation
- **Device-based fallback** — skip auth entirely; a device UUID identifies you; data migrates when you later sign in
- **PWA with offline support** — installable on Android and iOS; API responses cached for 24h, meal images cached for 30 days
- **Install prompt with smart re-show** — banner appears after 3 meals logged; re-shows after 15 days for active users who dismissed it
- **Event analytics** — install prompt interactions and standalone visits tracked server-side
- **85% test coverage enforced** — thresholds applied on both client (Vitest) and server (Jest) via CI

---

## Tech stack

### Client

| | |
|---|---|
| Framework | React 19.2.5 |
| Language | TypeScript 6.0.3 |
| Bundler | Vite 8.0.10 |
| Styling | Tailwind CSS 4.3.0 |
| Router | React Router DOM 7.15.0 |
| Testing | Vitest 4.1.5 + jsdom + Testing Library |
| PWA | vite-plugin-pwa (Workbox) |
| EXIF | exifr 7.1.3 |

### Server

| | |
|---|---|
| Runtime | Node.js |
| Framework | Express 5.2.1 |
| Language | TypeScript 6.0.3 |
| Database | MongoDB via Mongoose 9.6.2 |
| Auth | JWT (jsonwebtoken) + bcrypt + Passport (Google OAuth 2.0) |
| Images | Cloudinary v2 SDK + Multer 2.1.1 (memory storage) |
| Testing | Jest 30.4.2 + supertest 7.2.2 |

---

## Architecture overview

### Monorepo structure

```
client/   React + Vite SPA
server/   Express REST API
```

The client proxies API calls to `localhost:3000` in dev via Vite's `server.proxy`.

### Client routes

| Route | Description |
|---|---|
| `/` | Home — calendar + stats + FAB |
| `/tag` | TagMeal — full-screen photo + bottom sheet (no header) |
| `/day/:date` | DayDetail — masonry grid of meals for one day |
| `/meals` | All meals — tabbed list/grid for current month |
| `/settings` | Settings — goal, account, install |
| `/onboard` | Onboarding — first-run 4-screen flow |
| `/login` | Login — sign in / sign up / skip |

`/tag` and `/settings` are navigated to with `{ replace: true }` so they never accumulate in browser history.

**4-step auth gate** (evaluated in order on every render):
1. Onboarding — if not onboarded, all routes redirect to `/onboard`
2. Auth loading — spinner while `AuthContext.isLoading` is true
3. Login gate — if not logged in and not skipped, redirect to `/login`
4. App — `MealProvider → SettingsProvider → InstallProvider` mount

### State management

All state lives in React Context. Three providers wrap the authenticated app:

- **`MealProvider`** — fetches meals on mount, caches metadata to localStorage (images excluded), exposes `addMeal`, `updateMeal`, `deleteMeal`
- **`SettingsProvider`** — fetches fresh on every mount, exposes `saveSettings`
- **`InstallProvider`** — captures `beforeinstallprompt`, exposes `canInstall`, `install()`, `dismiss()`, and re-show logic

**`AuthProvider`** wraps everything (including `/onboard` and `/login`) and manages JWT session refresh on mount, login, register, logout, and the skip/un-skip flow.

### Auth model

Signed-in users are identified by an `accessToken` cookie (15-minute JWT) refreshed via a 30-day rotating refresh token stored as a SHA-256 hash in MongoDB.

Users who skip auth are identified by a `x-user-id` header carrying a device UUID from localStorage. Device data migrates to an account when they later sign in.

Google OAuth is optional — enabled only when `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL` are set.

### PWA caching strategy

| Resource | Strategy | TTL |
|---|---|---|
| Static assets (JS, CSS, HTML, icons) | CacheFirst (precached) | indefinite |
| `/meals`, `/settings`, `/health` | NetworkFirst (5s timeout) | 24h fallback |
| Cloudinary images | CacheFirst | 30 days, max 100 entries |

---

## Local development

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account

### Setup

```bash
git clone <repo-url>
cd aaharya
```

**Client:**
```bash
cd client
npm install
npm run dev        # → http://localhost:5173
```

**Server:**
```bash
cd server
npm install
cp .env.example .env   # or create server/.env manually (see below)
npm run dev        # → http://localhost:3000
```

The client proxies `/meals`, `/settings`, `/health`, and `/auth` to the server in dev — no CORS config needed locally.

---

## Environment variables

Create `server/.env` with the following keys:

```env
PORT=3000
MONGODB_URI=          # MongoDB Atlas connection string
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLIENT_URL=           # production client origin (for CORS)
NODE_ENV=production
JWT_ACCESS_SECRET=    # random secret for signing access tokens (generate with: openssl rand -hex 32)

# Optional — enables Google OAuth. Omit to disable the /auth/google routes.
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=  # e.g. https://api.example.com/auth/google/callback
```

**Client** — only needed in production:
```env
VITE_API_URL=         # production API base URL (empty string in dev — uses Vite proxy)
```

---

## PWA installation

### Android (Chrome)

1. Open the live app in Chrome
2. Log 3+ meals — the install banner appears after the third
3. Tap **Install** in the banner, or use Chrome's **Add to Home Screen** option in the browser menu

### iOS (Safari)

1. Open the live app in Safari
2. Tap the Share button → **Add to Home Screen**

iOS does not fire `beforeinstallprompt`, so the install banner won't appear — direct users to the share sheet.

### Offline support

Once installed or visited once, the app works offline for:
- Browsing the home calendar and stats (served from cache)
- Viewing meals logged in the last 24h
- Viewing meal images loaded in the last 30 days

Logging new meals requires a network connection (image upload is server-side).

---

## Design system

### Color palette

| Token | Hex | Usage |
|---|---|---|
| `fog` | `#F2F4F0` | App background, surface fallback |
| `neem` | `#B8C9A8` | Subtle accents, dividers, drag handle |
| `moss` | `#5E7A52` | Primary CTA, logo, active states, today ring |
| `slate` | `#2C3830` | Body text, headings, save button |
| `clean` | `#E8EDE5` | Clean day cell fill |
| `clean-text` | `#3A5040` | Text on clean day cells |
| `indulgent` | `#C2714A` | Indulgent fill, indulgent count text |
| `overlimit` | `#8B2020` | Over-limit fill, over-limit count text |
| `surface` | `#FFFFFF` | Card and sheet backgrounds |
| `border` | `#C4CEC0` | Card borders, calendar cell borders |
| `text-primary` | `#2C3830` | Primary text |
| `text-secondary` | `#7A8C7A` | Secondary text |
| `text-muted` | `#9AA89A` | Muted text |
| `text-disabled` | `#BFC8BB` | Disabled / placeholder text |

All tokens are defined in [client/src/colors.ts](client/src/colors.ts) and registered as Tailwind theme tokens in `index.css`.

### Typography

- **Fraunces** (serif) — wordmark, onboarding headings, limit number display
- **System-ui** (Tailwind default sans) — all UI text

### Layout

Max width 480px, centered. On desktop (`sm+`): rounded corners and shadow — looks like a phone on a dark slate background. On mobile: fills edge-to-edge. Scrollbars hidden globally.

---

## Testing

### Run tests

```bash
# Client
cd client
npm test               # Vitest watch mode
npm test -- --run      # single run
npx vitest run --coverage

# Server
cd server
npm test               # Jest watch mode
npm test -- --run      # single run
npm test -- --coverage
```

### Coverage

Both client and server enforce **85% coverage** on statements, branches, functions, and lines.

Coverage runs automatically on `git push` via the Husky `pre-push` hook — the push is rejected if any threshold is missed.

---

## Deployment

### Client → Vercel

The `client/` directory is deployed to Vercel. `main` branch → production. Feature branches get preview deployments automatically.

Build command: `npm run build`  
Output directory: `dist`

Set `VITE_API_URL` in Vercel environment variables to point at the production server.

### Server → Render

The `server/` directory is deployed to Render.

Build command: `npm run build`  
Start command: `npm start`

Add all server `.env` keys in Render's environment variable dashboard.
