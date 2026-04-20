# Image Analyzer — Full-Stack (Expo + Railway)

End-to-end system that lets a mobile user take or upload a photo, analyze it with the OpenAI Vision API, and email the results.

```
┌────────────────────┐        ┌──────────────────────────┐        ┌─────────────────┐
│  React Native app  │  HTTPS │  Node.js + Express API   │  HTTPS │  OpenAI Vision  │
│  (Expo)            │ ─────▶ │  (Railway)               │ ─────▶ │  (gpt-4o-mini)  │
│                    │        │                          │        └─────────────────┘
│                    │        │        │                 │
│                    │        │        ▼                 │        ┌─────────────────┐
│                    │        │     SMTP (Nodemailer)    │ ─────▶ │  Gmail / SMTP   │
└────────────────────┘        └──────────────────────────┘        └─────────────────┘
```

## Repositories

- **`backend/`** — Express API, Railway-ready. See [`backend/README.md`](./backend/README.md).
- **`mobile/`** — Expo app. See [`mobile/README.md`](./mobile/README.md).

## Quick start

### 1. Backend (deploy first)

```bash
cd backend
cp .env.example .env      # fill in OPENAI_API_KEY, EMAIL_USER, EMAIL_PASS
npm install
npm start                 # http://localhost:3000
```

Then deploy to Railway — detailed steps in `backend/README.md`. You'll end up with a public URL like `https://your-app.up.railway.app`.

### 2. Mobile

```bash
cd mobile
npm install
```

Open `mobile/app.json` and set:
```json
"extra": { "apiBaseUrl": "https://your-app.up.railway.app" }
```

Then:
```bash
npm start
```

Scan the QR with **Expo Go** (or press `i` / `a` for a simulator).

## Features

**Core flow**
- 📷 Take photo (camera) or 🖼️ pick from gallery
- Preview → **Analyze Image** → results in seconds
- Description, extracted text (OCR), detected objects
- Enter email → send formatted HTML email with the image attached

**Extras**
- In-memory scan history on the server (`GET /history`) with timestamps
- Re-send any past scan (`POST /history/:id/resend`)
- Local device history via `AsyncStorage` — the Home screen shows recent scans
- Configurable API base URL (no hardcoded hosts)
- Clean card-based UI, loading indicators, disabled states during requests
- Robust error surfacing (API errors shown in native alerts)

## API summary

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Health check (used by Railway) |
| `POST` | `/analyze` | Analyze an uploaded image — returns `{ description, text, objects }` |
| `POST` | `/send-email` | Email the results, optionally attaching the stored image |
| `GET` | `/history` | List recent scans |
| `GET` | `/history/:id` | Get a single scan |
| `POST` | `/history/:id/resend` | Re-send a past scan to a given email |

## Environment variables

### Backend (Railway → Variables)
| Var | Required | Notes |
|---|---|---|
| `OPENAI_API_KEY` | ✅ | |
| `EMAIL_USER` | ✅ | |
| `EMAIL_PASS` | ✅ | Gmail App Password recommended |
| `OPENAI_MODEL` | — | Default `gpt-4o-mini` |
| `EMAIL_SERVICE` | — | Default `gmail` |
| `PORT` | — | Injected by Railway |

### Mobile (`app.json` or `.env`)
| Var | Notes |
|---|---|
| `expo.extra.apiBaseUrl` | Backend public URL |
| `EXPO_PUBLIC_API_BASE_URL` | Overrides the above at runtime |

## License

MIT — use it however you'd like.
