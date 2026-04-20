# Image Analysis Backend

Railway-ready Node.js + Express API that uses the **OpenAI Vision API** to analyze images and **Nodemailer** to email results.

## Features

- `POST /analyze` — upload an image, get `{ description, text, objects }`
- `POST /send-email` — email results (with the image attached)
- `GET /history` — list in-memory scan history
- `POST /history/:id/resend` — re-send a previous scan
- Built-in `/health` endpoint for Railway health checks
- CORS enabled, multipart uploads via `multer`

## Project structure

```
backend/
├── server.js
├── routes/
│   ├── analyze.js
│   ├── email.js
│   └── history.js
├── controllers/
│   ├── analyzeController.js
│   ├── emailController.js
│   └── historyController.js
├── services/
│   ├── openaiService.js
│   ├── emailService.js
│   └── historyStore.js
├── middleware/
│   └── upload.js
├── uploads/          (image temp storage)
├── .env.example
├── railway.json
└── package.json
```

## Local setup

```bash
cd backend
cp .env.example .env    # then fill in your keys
npm install
npm run dev             # or: npm start
```

The server listens on `http://localhost:3000` by default.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | ✅ | OpenAI secret key |
| `OPENAI_MODEL` | optional | Defaults to `gpt-4o-mini` |
| `EMAIL_USER` | ✅ | Sending email account |
| `EMAIL_PASS` | ✅ | App password (for Gmail, create one at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)) |
| `EMAIL_SERVICE` | optional | Defaults to `gmail` |
| `PORT` | optional | Railway sets this automatically |

## Deploying to Railway

1. **Push to GitHub.** Create a new repo and push the `backend/` folder (or the whole project with a Root Directory set).
2. **Create a Railway project.**
   - Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
   - Pick your repo. If the backend isn't at the repo root, set **Settings → Root Directory** to `backend`.
3. **Add environment variables** in **Variables** tab:
   - `OPENAI_API_KEY`
   - `EMAIL_USER`
   - `EMAIL_PASS`
   - (optional) `OPENAI_MODEL`, `EMAIL_SERVICE`
4. **Generate a public domain:** Settings → Networking → **Generate Domain**. You'll get something like `https://your-app.up.railway.app`.
5. **Verify:** visit `https://your-app.up.railway.app/health` — should return `{"status":"ok"...}`.
6. **Point the mobile app** at this URL (see `mobile/README.md`).

## API reference

### `POST /analyze`
`multipart/form-data` with field `image` (file).

```bash
curl -X POST https://your-app.up.railway.app/analyze \
  -F "image=@/path/to/photo.jpg"
```

Response:
```json
{
  "id": "a1b2c3d4",
  "timestamp": 1737936000000,
  "description": "A red bicycle leaning against a brick wall...",
  "text": "NO PARKING\nMON-FRI 8AM-6PM",
  "objects": ["bicycle", "wall", "sign", "sidewalk"]
}
```

### `POST /send-email`
Two modes — JSON or multipart.

**JSON mode** (recommended when re-sending known results):
```json
{
  "email": "user@example.com",
  "description": "...",
  "text": "...",
  "objects": ["a","b"],
  "historyId": "a1b2c3d4"
}
```

**Multipart mode** (when attaching a fresh image):
form fields: `email`, `description`, `text`, `objects` (JSON string), `image` (file).

### `GET /history`
Returns the last 100 scans (newest first).

### `POST /history/:id/resend`
Body: `{ "email": "someone@example.com" }`. Re-sends the saved result with the original image attached.

## Notes

- `uploads/` is used as temporary storage for images so they can be attached to emails. On Railway this is **ephemeral** — it resets on redeploy. Swap for S3/GCS if you need durability.
- `historyStore` is in-memory; replace with Postgres/Redis for production use.
