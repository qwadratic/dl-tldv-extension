---
phase: 03-remux-and-deliver
plan: 02
subsystem: pipeline
tags: [remux, mp4, download, ffmpeg, browser-extension, end-to-end]

# Dependency graph
requires:
  - phase: 03-remux-and-deliver
    plan: 01
    provides: "remuxSegments function, buildFilename utility, ffmpeg.wasm bundled core"
  - phase: 02-core-download
    provides: "downloadSegments pipeline, segment progress messaging, content script button UI"
provides:
  - "Complete end-to-end pipeline: button click -> metadata -> playlist -> download -> remux -> browser download"
  - "Remux progress stages displayed on button (loading, writing, remuxing, finalizing)"
  - "Error display with retry capability on download button"
  - "Automatic memory cleanup after remux (segments freed, blob URL revoked)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: ["Blob URL for triggering browser downloads from service worker", "Stage callback pattern for cross-component progress reporting"]

key-files:
  created: []
  modified:
    - src/background.ts
    - src/content.ts

key-decisions:
  - "Removed lastDownloadResult storage -- segments freed immediately after remux to reduce memory pressure"
  - "60-second delay before revoking blob URL to ensure browser has time to start download"
  - "Button shows 'Downloaded!' for 8 seconds then resets, error shows 'Retry' after 5 seconds"

patterns-established:
  - "Full pipeline flow: metadata -> playlist -> decode -> download -> remux -> blob -> browser.downloads.download"
  - "Progress messaging chain: background sends typed messages, content script maps to user-friendly labels"

requirements-completed: [MUX-03, UI-04]

# Metrics
duration: 4min
completed: 2026-03-23
---

# Phase 3 Plan 2: Wire Remux Pipeline and Trigger Browser Download Summary

**Full end-to-end one-click pipeline: segment download with progress, ffmpeg.wasm remux with stage display, and browser download trigger with error retry**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-23T18:18:00Z
- **Completed:** 2026-03-23T18:22:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Wired remuxSegments into background pipeline so remux runs automatically after segment download completes
- Browser download triggered via Blob URL with proper YYYY-MM-DD_Name.mp4 filename
- Content script displays remux stage progress (Loading ffmpeg, Writing segments, Remuxing to MP4, Finalizing)
- Error handling shows readable messages on button with automatic retry after 5 seconds
- Memory cleanup: segments freed after remux, blob URL revoked after 60s

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire remux into background pipeline and trigger browser download** - `85008ce` (feat)
2. **Task 2: Verify full end-to-end flow (checkpoint)** - human-verified, approved

## Files Created/Modified
- `src/background.ts` - Full pipeline: metadata -> playlist -> download -> remux -> blob -> browser.downloads.download()
- `src/content.ts` - Extended message handler for REMUX_PROGRESS, REMUX_COMPLETE, and improved DOWNLOAD_ERROR with retry

## Decisions Made
- Removed lastDownloadResult variable entirely -- segments are freed after remux to reduce memory usage
- 60-second blob URL revocation delay to ensure browser starts the download
- Button resets to "Download" after 8 seconds on success, changes to "Retry" after 5 seconds on error

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - build compiled cleanly (warnings expected for ffmpeg.wasm dynamic imports and large WASM file are informational only).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Extension is feature-complete for v1.0: one-click download from any tldv.io meeting page produces a valid MP4 file
- All 30 tests pass
- Build produces complete dist/ with all required assets including 31MB ffmpeg-core.wasm
- Ready for packaging and distribution

## Self-Check: PASSED

All files verified present. Commit hash 85008ce verified in git log.

---
*Phase: 03-remux-and-deliver*
*Completed: 2026-03-23*
