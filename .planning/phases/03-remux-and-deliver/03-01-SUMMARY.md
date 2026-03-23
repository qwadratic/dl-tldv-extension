---
phase: 03-remux-and-deliver
plan: 01
subsystem: pipeline
tags: [ffmpeg, wasm, remux, mp4, filename]

# Dependency graph
requires:
  - phase: 02-core-download
    provides: "DownloadResult with ArrayBuffer[] segments, MeetingMetadata type"
provides:
  - "remuxSegments function: takes ArrayBuffer[] segments + metadata, returns MP4 Uint8Array + filename"
  - "buildFilename / sanitizeName utilities for YYYY-MM-DD_Name.mp4 format"
  - "ffmpeg.wasm core bundled in dist/ via CopyWebpackPlugin"
  - "RemuxProgressMessage and RemuxCompleteMessage types"
affects: [03-02-PLAN]

# Tech tracking
tech-stack:
  added: ["@ffmpeg/ffmpeg", "@ffmpeg/core", "@types/chrome"]
  patterns: ["ffmpeg.wasm single-threaded core loaded from chrome.runtime.getURL", "concat demuxer with stream copy for zero-reencode remux"]

key-files:
  created:
    - src/pipeline/remux.ts
    - src/pipeline/filename.ts
    - tests/filename.test.ts
  modified:
    - package.json
    - webpack.config.js
    - src/manifest.json
    - src/types.ts
    - tsconfig.json

key-decisions:
  - "Used single-threaded @ffmpeg/core (not -mt) to avoid SharedArrayBuffer/COOP/COEP requirements"
  - "Added @types/chrome for chrome.runtime.getURL type support in remux module"
  - "WASM files bundled via CopyWebpackPlugin, loaded via chrome.runtime.getURL at runtime"

patterns-established:
  - "ffmpeg.wasm loading pattern: chrome.runtime.getURL for coreURL and wasmURL"
  - "Filename sanitization: strip non-alphanumeric except dash/underscore, replace spaces with underscores"

requirements-completed: [MUX-01, MUX-02, UI-05]

# Metrics
duration: 3min
completed: 2026-03-23
---

# Phase 3 Plan 1: Remux Module and Filename Utility Summary

**ffmpeg.wasm remux module with concat/stream-copy remuxing and YYYY-MM-DD filename generation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-23T18:14:42Z
- **Completed:** 2026-03-23T18:18:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Filename utility with sanitizeName and buildFilename producing YYYY-MM-DD_Name.mp4 format
- 14 unit tests for filename generation covering edge cases (empty, special chars, invalid dates, truncation)
- ffmpeg.wasm remux module that loads WASM core, writes segments to virtual FS, runs concat with -c copy -movflags +faststart
- Webpack configured to bundle ffmpeg-core.wasm (~32MB) and ffmpeg-core.js with extension
- Manifest updated with downloads permission and web_accessible_resources for WASM files

## Task Commits

Each task was committed atomically:

1. **Task 1: Create filename utility with tests (TDD)** - `176442c` (feat)
2. **Task 2: Install ffmpeg.wasm, configure webpack, create remux module, update types** - `d2e9a78` (feat)

## Files Created/Modified
- `src/pipeline/filename.ts` - sanitizeName and buildFilename utilities
- `src/pipeline/remux.ts` - ffmpeg.wasm remux module with concat demuxer
- `tests/filename.test.ts` - 14 unit tests for filename generation
- `src/types.ts` - Added RemuxProgressMessage and RemuxCompleteMessage types
- `src/manifest.json` - Added downloads permission and web_accessible_resources
- `webpack.config.js` - CopyWebpackPlugin for WASM files, Node fallbacks
- `package.json` - Added @ffmpeg/ffmpeg, @ffmpeg/core dependencies
- `tsconfig.json` - Added @types/chrome for chrome global types

## Decisions Made
- Used single-threaded @ffmpeg/core (not -mt) to avoid SharedArrayBuffer/COOP/COEP requirements
- Added @types/chrome for chrome.runtime.getURL type support (not in original plan)
- WASM files bundled via CopyWebpackPlugin, loaded via chrome.runtime.getURL at runtime

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed @types/chrome for chrome global type support**
- **Found during:** Task 2 (webpack build)
- **Issue:** TypeScript TS2304: Cannot find name 'chrome' when compiling remux.ts
- **Fix:** Installed @types/chrome devDependency and added "types": ["chrome"] to tsconfig.json
- **Files modified:** package.json, tsconfig.json
- **Verification:** npm run build compiles without errors
- **Committed in:** d2e9a78 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for TypeScript compilation. No scope creep.

## Issues Encountered
- npm peer dependency conflict with ts-jest required --legacy-peer-deps flag for ffmpeg package installation

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- remuxSegments function ready to be wired into background pipeline in Plan 02
- buildFilename ready for generating download filenames
- ffmpeg.wasm WASM core bundled and loadable from extension context
- All 30 tests pass (14 filename + 10 caesar + 6 playlist)

## Self-Check: PASSED

All files verified present. All commit hashes verified in git log.

---
*Phase: 03-remux-and-deliver*
*Completed: 2026-03-23*
