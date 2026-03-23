# Roadmap: dl-tldv-extension

## Overview

Build a cross-browser extension that injects a download button on tldv.io meeting pages, walks the HLS pipeline (API fetch → playlist decode → segment download), remuxes segments into MP4 via ffmpeg.wasm, and triggers a standard browser file download — all client-side. Three phases: scaffold the extension shell, implement the download pipeline, then wire up remuxing and delivery.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Extension Scaffold** - Loadable cross-browser extension with injected download button visible on tldv meeting pages
- [ ] **Phase 2: Download Pipeline** - Full HLS pipeline: extract meeting ID, fetch metadata and playlist, decode Caesar cipher, authenticate, download all segments with progress
- [ ] **Phase 3: Remux and Deliver** - Remux segments into MP4 via ffmpeg.wasm and trigger browser file download with error handling

## Phase Details

### Phase 1: Extension Scaffold
**Goal**: A loadable Chrome and Firefox extension that injects a download button next to "Copy link" on tldv.io meeting pages and hides it on non-meeting pages
**Depends on**: Nothing (first phase)
**Requirements**: XBRO-01, XBRO-02, XBRO-03, UI-01, UI-03
**Success Criteria** (what must be TRUE):
  1. Extension loads in Chrome (MV3) without errors and appears in the extensions list
  2. Extension loads in Firefox (MV3) without errors using the same codebase
  3. A download button appears next to the "Copy link" button on any tldv.io meeting page
  4. The download button is absent (hidden or not injected) on tldv.io non-meeting pages
**Plans**: TBD

### Phase 2: Download Pipeline
**Goal**: Clicking the download button fetches meeting metadata, decodes the obfuscated playlist, authenticates when needed, downloads all .ts segments, and shows live segment progress
**Depends on**: Phase 1
**Requirements**: VID-01, VID-02, VID-03, VID-04, VID-05, VID-06, AUTH-01, AUTH-02, UI-02
**Success Criteria** (what must be TRUE):
  1. Clicking the download button on a public meeting fetches all .ts segments without any login prompt
  2. Clicking the download button on a private meeting uses the existing Firebase auth session to authenticate and downloads segments successfully
  3. The Caesar cipher in the `#TLDVCONF` header is correctly decoded so segment URLs resolve to real S3 signed URLs
  4. The button displays live progress as segments download (e.g., "12 of 87 segments")
**Plans**: TBD

### Phase 3: Remux and Deliver
**Goal**: Downloaded segments are remuxed into a valid MP4 file via ffmpeg.wasm (stream copy) and saved to disk with the correct filename, with error states surfaced on the button
**Depends on**: Phase 2
**Requirements**: MUX-01, MUX-02, MUX-03, UI-04, UI-05
**Success Criteria** (what must be TRUE):
  1. After all segments download, a valid MP4 file appears in the browser's downloads folder
  2. The saved file is named `{YYYY-MM-DD}_{meeting-name}.mp4` matching the meeting date and title
  3. The remuxed video plays correctly in a standard media player with no re-encoding artifacts
  4. If the download or remux fails, the button shows a readable error message instead of silently stalling
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Extension Scaffold | 0/TBD | Not started | - |
| 2. Download Pipeline | 0/TBD | Not started | - |
| 3. Remux and Deliver | 0/TBD | Not started | - |
