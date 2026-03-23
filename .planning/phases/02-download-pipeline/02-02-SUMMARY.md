---
phase: 02-download-pipeline
plan: 02
subsystem: pipeline
tags: [hls-download, concurrency, service-worker, progress-ui, arraybuffer]

requires:
  - phase: 02-download-pipeline
    plan: 01
    provides: Caesar cipher, playlist parser, API client, Firebase auth extractor
provides:
  - downloadSegments function with concurrent workers and progress callback
  - Full service worker pipeline orchestration (metadata -> playlist -> parse -> download)
  - Live progress display on content script button (X/Y with percentage)
  - In-memory segment storage (ArrayBuffer[]) ready for Phase 3 remuxing
  - DOWNLOAD_COMPLETE message type for completion signaling
affects: [03-remux-delivery]

tech-stack:
  added: []
  patterns: [worker-pool concurrency with queue, fire-and-forget message handling, in-memory ArrayBuffer storage]

key-files:
  created:
    - src/pipeline/downloader.ts
  modified:
    - src/background.ts
    - src/content.ts
    - src/types.ts

key-decisions:
  - "Concurrency limit of 6 matching browser per-host connection limit"
  - "Segments stored in memory as ArrayBuffer[] for Phase 3 remuxing (not persisted to disk)"
  - "Fire-and-forget pattern for handleDownload to avoid blocking onMessage listener"

patterns-established:
  - "Worker-pool pattern: queue + N async workers for controlled concurrency"
  - "Progress reporting via browser.tabs.sendMessage from service worker to content script"
  - "Button state machine: Download -> Starting... -> X/Y (Z%) -> Done! -> Download"

requirements-completed: [VID-05, VID-06, UI-02]

duration: 4min
completed: 2026-03-23
---

# Phase 2 Plan 2: Segment Downloader and Full Pipeline Wiring Summary

**Concurrent segment downloader with 6-worker pool, full service worker pipeline orchestration, and live progress UI on the download button**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-23T18:05:00Z
- **Completed:** 2026-03-23T18:09:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Segment downloader fetches all .ts URLs concurrently (6 workers) with ordered ArrayBuffer results and progress callback
- Service worker orchestrates full pipeline: metadata fetch -> playlist fetch -> parse/decode -> download all segments
- Content script displays live progress as "X/Y (Z%)" during download with "Done!" completion state
- End-to-end pipeline verified on real tldv meeting: metadata fetched, 1017 segments decoded, first segment downloaded successfully (92.7 KB)
- Segments stored in memory as ArrayBuffer[] ready for Phase 3 remuxing

## Task Commits

Each task was committed atomically:

1. **Task 1: Create segment downloader and wire full pipeline into service worker** - `4b4e0be` (feat)
2. **Task 2: Verify download pipeline works on a real tldv meeting** - checkpoint:human-verify (approved)

## Files Created/Modified
- `src/pipeline/downloader.ts` - downloadSegments with concurrent worker pool, DownloadResult and ProgressCallback types
- `src/background.ts` - Full pipeline orchestration: metadata -> playlist -> parse -> download with progress/error/complete messaging
- `src/content.ts` - Enhanced message listener with DOWNLOAD_COMPLETE handling, percentage progress display, button state resets
- `src/types.ts` - Added CompleteMessage interface and DOWNLOAD_COMPLETE to ExtensionMessage union

## Decisions Made
- Concurrency limit of 6 workers matches browser per-host connection limit for optimal throughput
- Segments stored as in-memory ArrayBuffer[] (not written to disk) for direct handoff to Phase 3 remuxing
- Fire-and-forget pattern in onMessage listener avoids blocking the message channel during long downloads

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Full download pipeline operational end-to-end
- ArrayBuffer segments in memory via `lastDownloadResult` ready for Phase 3 ffmpeg.wasm remuxing
- All Phase 2 plans complete; Phase 3 (remux and delivery) can begin
- Note: Large recordings (1800+ segments) may need memory management attention in Phase 3

## Self-Check: PASSED

- FOUND: src/pipeline/downloader.ts
- FOUND: src/background.ts
- FOUND: src/content.ts
- FOUND: src/types.ts
- FOUND: commit 4b4e0be

---
*Phase: 02-download-pipeline*
*Completed: 2026-03-23*
