# Requirements: dl-tldv-extension

**Defined:** 2026-03-23
**Core Value:** One-click video download from any tldv.io meeting page — public or private — with no external tools required.

## v1 Requirements

### Extension UI

- [x] **UI-01**: Download button injected on tldv.io meeting pages next to "Copy link" button
- [ ] **UI-02**: Button displays real-time download progress as percentage
- [x] **UI-03**: Button is disabled or hidden on non-meeting pages
- [ ] **UI-04**: Button shows error state with message if download fails
- [ ] **UI-05**: Downloaded file uses naming format `{YYYY-MM-DD}_{meeting-name}.mp4`

### Video Pipeline

- [x] **VID-01**: Extract meeting ID from tldv.io meeting page URL
- [x] **VID-02**: Fetch meeting metadata via tldv watch-page API (`gw.tldv.io/v1/meetings/{id}/watch-page`)
- [x] **VID-03**: Fetch obfuscated m3u8 playlist from `gaia.tldv.io/v1/meetings/{id}/playlist.m3u8`
- [x] **VID-04**: Decode Caesar cipher on playlist segments using offset from `#TLDVCONF` header
- [ ] **VID-05**: Download all .ts segments from decoded signed S3 URLs
- [ ] **VID-06**: Show segment download progress (X of Y segments fetched)

### Remuxing

- [ ] **MUX-01**: Remux downloaded .ts segments into MP4 container using ffmpeg.wasm
- [ ] **MUX-02**: Use stream copy (no re-encoding) for fast, lossless remuxing
- [ ] **MUX-03**: Trigger standard browser file download for completed MP4

### Authentication

- [x] **AUTH-01**: Public meetings download without any authentication
- [x] **AUTH-02**: Private meetings download using Firebase auth token from logged-in tldv session in browser

### Cross-Browser

- [x] **XBRO-01**: Extension works in Chrome using Manifest V3
- [x] **XBRO-02**: Extension works in Firefox using Manifest V3
- [x] **XBRO-03**: Single codebase with WebExtension polyfill for cross-browser compatibility

## v2 Requirements

### Enhanced UX

- **UX-01**: Download quality selection (if multiple HLS streams available)
- **UX-02**: Download history / re-download from extension popup
- **UX-03**: Keyboard shortcut to trigger download

### Batch

- **BATCH-01**: Download multiple meetings from meetings list page
- **BATCH-02**: Download queue with concurrent limit

## Out of Scope

| Feature | Reason |
|---------|--------|
| Video transcoding/re-encoding | Stream copy is sufficient; re-encoding is slow and lossy |
| Transcript download | tldv already provides transcript export natively |
| Mobile browser support | Extensions are desktop-only |
| Safari support | Safari's extension model is fundamentally different |
| Server-side processing | Everything must run client-side in-browser |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| UI-01 | Phase 1 | Complete |
| UI-02 | Phase 2 | Pending |
| UI-03 | Phase 1 | Complete |
| UI-04 | Phase 3 | Pending |
| UI-05 | Phase 3 | Pending |
| VID-01 | Phase 2 | Complete |
| VID-02 | Phase 2 | Complete |
| VID-03 | Phase 2 | Complete |
| VID-04 | Phase 2 | Complete |
| VID-05 | Phase 2 | Pending |
| VID-06 | Phase 2 | Pending |
| MUX-01 | Phase 3 | Pending |
| MUX-02 | Phase 3 | Pending |
| MUX-03 | Phase 3 | Pending |
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Complete |
| XBRO-01 | Phase 1 | Complete |
| XBRO-02 | Phase 1 | Complete |
| XBRO-03 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-03-23*
*Last updated: 2026-03-23 after roadmap creation*
