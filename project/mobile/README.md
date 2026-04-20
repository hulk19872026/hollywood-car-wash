# Image Analyzer — Mobile App (Expo)

React Native app built with **Expo** that:
- Takes a photo (camera) or picks one from the gallery
- Previews the image
- Sends it to the backend for AI analysis (description, OCR text, detected objects)
- Displays results and emails them to any address
- Keeps a local history of recent scans (AsyncStorage)

## Project structure

```
mobile/
├── App.js
├── app.json
├── babel.config.js
├── package.json
├── components/
│   ├── Card.js
│   ├── Header.js
│   ├── PrimaryButton.js
│   └── theme.js
├── screens/
│   ├── HomeScreen.js
│   ├── PreviewScreen.js
│   └── ResultsScreen.js
└── services/
    ├── api.js
    └── storage.js
```

## Prerequisites

- **Node.js 18+**
- **Expo Go** app on your phone (iOS App Store / Google Play), **or** an Android/iOS simulator

## Setup

```bash
cd mobile
npm install
```

### Configure the API base URL

The backend URL is read from `app.json` under `expo.extra.apiBaseUrl`. After deploying your backend to Railway, open `app.json` and replace:

```json
"extra": {
  "apiBaseUrl": "https://your-railway-app.up.railway.app"
}
```

…with your actual Railway public URL.

Alternatively you can override it without editing `app.json` by creating a `.env` file (see `.env.example`) and starting Expo with it loaded — any variable prefixed with `EXPO_PUBLIC_` is exposed to the app:

```bash
EXPO_PUBLIC_API_BASE_URL=https://your-railway-app.up.railway.app npx expo start
```

> When running the backend **locally** on your computer, your phone can't reach `localhost`. Use your computer's LAN IP (e.g. `http://192.168.1.42:3000`) or run your backend on a tunnel. For real testing, deploying to Railway is easier.

## Run

```bash
npm start              # opens Expo dev tools
# or directly:
npm run ios            # iOS simulator (macOS only)
npm run android        # Android emulator
```

Scan the QR code with the **Expo Go** app to run it on a real device.

## How it works

1. **HomeScreen** — shows "Take a Photo" and "Upload from Gallery" buttons. Requests camera / media library permissions on demand.
2. **PreviewScreen** — previews the selected image. Tapping **Analyze Image** POSTs the image as `multipart/form-data` to `POST /analyze` on the backend.
3. **ResultsScreen** — displays `description`, `text`, and `objects` as chips. Enter an email and tap **Send Email** to POST to `/send-email`; the backend attaches the originally analyzed image.

## Permissions

The app requests:
- **Camera** — to take photos
- **Photo library** — to pick existing images

These are declared in `app.json` (`ios.infoPlist`, `android.permissions`, and the `expo-image-picker` plugin).

## Troubleshooting

- **Network request failed** — make sure `apiBaseUrl` is reachable from your device. `localhost` only works in simulators on the same machine as the server.
- **Image upload too large** — the backend limits uploads to 15 MB. The image picker is set to `quality: 0.85` which is usually fine; lower it if you hit the limit.
- **Gmail auth error on backend** — use a [Google App Password](https://myaccount.google.com/apppasswords), not your regular account password, and make sure 2FA is enabled on the Gmail account.
