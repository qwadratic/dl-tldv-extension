# dl-tldv-extension

Browser extension that adds a one-click download button to [tldv.io](https://tldv.io) meeting pages. Downloads the recording as an MP4 file directly in the browser — no external tools required.

Works with both **Chrome** and **Firefox** (Manifest V3).

## How it works

1. Injects a **Download** button next to "Copy link" on any tldv.io meeting page
2. Fetches meeting metadata and the obfuscated HLS playlist from tldv's API
3. Decodes the playlist (tldv uses a Caesar cipher on segment URLs)
4. Downloads all `.ts` segments concurrently with live progress
5. Remuxes segments into MP4 using [ffmpeg.wasm](https://github.com/nicedoc/ffmpegwasm) (stream copy, no re-encoding)
6. Triggers a standard browser file download as `YYYY-MM-DD_Meeting-Name.mp4`

Public meetings work without login. Private meetings use your existing tldv session (Firebase auth token).

## Install from source

```bash
git clone https://github.com/qwadratic/dl-tldv-extension.git
cd dl-tldv-extension
npm install
npm run build
```

### Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select the `dist/` folder

### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `dist/manifest.json`

## Development

```bash
npm run dev     # watch mode — rebuilds on file changes
npm test        # run tests
npm run build   # production build
npm run package # create zip files for store submission
```

### Stack

- **Vite** — build
- **Vitest** — tests
- **TypeScript 6** — language
- **ffmpeg.wasm** — in-browser HLS → MP4 remux
- **webextension-polyfill** — cross-browser API

### Project structure

```
src/
  manifest.json       # MV3 manifest (Chrome + Firefox)
  background.ts       # Service worker — pipeline orchestration
  content.ts          # Content script — button injection + progress UI
  styles.css          # Download button styles
  types.ts            # Message type definitions
  pipeline/
    api.ts            # tldv API client (metadata + playlist fetch)
    auth.ts           # Firebase token extraction from IndexedDB
    caesar.ts         # Caesar cipher decoder
    playlist.ts       # m3u8 playlist parser + TLDVCONF decoder
    downloader.ts     # Concurrent segment downloader
    remux.ts          # ffmpeg.wasm remux (HLS → MP4)
    filename.ts       # Output filename builder
    types.ts          # Pipeline type definitions
tests/
  caesar.test.ts      # Cipher tests (10)
  playlist.test.ts    # Playlist parser tests (6)
  filename.test.ts    # Filename builder tests (14)
```

## Publishing to extension stores

The release workflow (`.github/workflows/release.yml`) automates publishing when you create a GitHub release. It uploads zip files to the release and optionally publishes to Chrome Web Store and Firefox Add-ons.

### Chrome Web Store

1. Register at the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole) ($5 one-time fee)
2. Create a new extension manually (upload the zip once to get an Extension ID)
3. Set up OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Create OAuth client ID (Web application)
   - Add `https://developers.google.com/oauthplayground` as redirect URI
   - Generate a refresh token via [OAuth Playground](https://developers.google.com/oauthplayground)
4. Add these GitHub repository secrets:
   - `CHROME_CLIENT_ID`
   - `CHROME_CLIENT_SECRET`
   - `CHROME_REFRESH_TOKEN`
5. Add this GitHub repository variable:
   - `CHROME_EXTENSION_ID` — your extension's ID from the developer dashboard

### Firefox Add-ons (AMO)

1. Register at [addons.mozilla.org](https://addons.mozilla.org/developers/)
2. Generate API credentials from [Developer Hub > Manage API Keys](https://addons.mozilla.org/developers/addon/api/key/)
3. Add these GitHub repository secrets:
   - `FIREFOX_API_ISSUER`
   - `FIREFOX_API_SECRET`
4. Add this GitHub repository variable:
   - `FIREFOX_ADDON_ID` — your add-on's ID/slug

### Triggering a release

```bash
# Tag and release
git tag v1.0.0
git push origin v1.0.0
gh release create v1.0.0 --title "v1.0.0" --notes "Initial release"
```

The CI workflow runs on every push/PR. The release workflow runs only on published GitHub releases, attaches zip artifacts, and publishes to stores (if credentials are configured).

## Privacy

This extension:

- **Collects no user data** — no analytics, no tracking, no telemetry
- **Makes no external requests** except to tldv.io domains (to fetch meeting data and video segments)
- **Stores nothing** — no cookies, no local storage, no user profiles
- **Runs entirely locally** — all video processing (download + remux) happens in your browser
- **Source code is open** — inspect everything at [github.com/qwadratic/dl-tldv-extension](https://github.com/qwadratic/dl-tldv-extension)

## License

MIT
