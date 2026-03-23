# dl-tldv-extension

## What This Is

A cross-browser extension (Chrome + Firefox) that adds a download button to tldv.io meeting pages, allowing users to download meeting recordings as MP4 files directly from the browser. It handles tldv's obfuscated HLS streams, decodes them, downloads segments, and remuxes them into MP4 using ffmpeg.wasm — all client-side with a progress indicator and standard browser download behavior.

## Core Value

One-click video download from any tldv.io meeting page — public or private — with no external tools required.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Download button injected on tldv.io meeting pages next to "Copy link" button
- [ ] Public meetings download without authentication
- [ ] Private meetings download using Firebase auth token from logged-in session
- [ ] Caesar cipher decoding of tldv's obfuscated m3u8 playlists
- [ ] HLS .ts segment download in-browser
- [ ] Remux segments into MP4 using ffmpeg.wasm
- [ ] Real-time download progress indicator (segment fetch + remux phases)
- [ ] Standard browser file download trigger for completed MP4
- [ ] Cross-browser support: Chrome (Manifest V3) and Firefox

### Out of Scope

- Video transcoding/re-encoding — stream copy only, no quality loss
- Batch download of multiple meetings — single meeting per page
- Transcript download — video only (tldv already provides transcript export)
- Mobile browser support — desktop extensions only
- Safari support — no WebExtension support comparable to Chrome/Firefox

## Context

tldv.io serves meeting recordings via HLS (m3u8 playlists). The platform uses a custom obfuscation layer:
- **API endpoint**: `GET https://gw.tldv.io/v1/meetings/{id}/watch-page?noTranscript=true` returns meeting metadata and video source URL
- **Playlist endpoint**: `https://gaia.tldv.io/v1/meetings/{id}/playlist.m3u8` returns an obfuscated m3u8 playlist
- **Obfuscation**: `#TLDVCONF:{expiry},{offset},{baseUrl}` header — segment URLs and AWS signed parameters are Caesar-ciphered by `{offset}` positions on letters only, digits unchanged
- **Segments**: Individual `.ts` chunks with AWS S3 signed URLs (valid for ~48 hours)
- **Auth**: Public meetings need no auth; private meetings require Firebase Auth Bearer token
- **Reference implementation**: [tldv_downloader](https://github.com/Cramraika/tldv_downloader) — Python CLI tool using ffmpeg

ffmpeg.wasm (WebAssembly port of ffmpeg) enables in-browser remuxing without a server. The `-c copy` equivalent (stream copy) avoids expensive re-encoding.

## Constraints

- **Manifest V3**: Chrome requires MV3 for new extensions; Firefox supports both MV2 and MV3 — target MV3 for both
- **ffmpeg.wasm size**: ~25MB WASM binary — must be bundled with extension, not fetched at runtime (Chrome extension CSP)
- **Memory**: Large recordings (1h+) may have 1800+ segments; must handle memory efficiently during download and remux
- **CORS**: Content scripts run in page context; may need to handle CORS for API/segment fetches via background service worker
- **Signed URL expiry**: AWS signed URLs expire in ~48h; download must complete within that window (not a practical concern for single recordings)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| ffmpeg.wasm for remuxing | Only viable in-browser option for HLS→MP4; avoids server dependency | — Pending |
| Manifest V3 for both browsers | Future-proof; Chrome requires it, Firefox supports it | — Pending |
| Content script + Service Worker architecture | Content script injects UI; service worker handles heavy download/remux to avoid blocking page | — Pending |
| Button placement next to "Copy link" | Consistent with page UI, discoverable, non-intrusive | — Pending |
| Cross-browser via WebExtension polyfill | Single codebase targeting both Chrome and Firefox | — Pending |

---
*Last updated: 2026-03-23 after initialization*
