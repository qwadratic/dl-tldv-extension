---
phase: 02-download-pipeline
plan: 01
subsystem: pipeline
tags: [caesar-cipher, m3u8, hls, tldv-api, firebase-auth, indexeddb]

requires:
  - phase: 01-extension-scaffold
    provides: manifest.json with host_permissions, shared types, webpack build
provides:
  - caesarDecipher function for tldv obfuscated URL decoding
  - parseTldvConf and parsePlaylist for m3u8 playlist parsing
  - fetchMeetingMetadata and fetchPlaylist API client functions
  - getFirebaseToken for IndexedDB auth token extraction
  - extractMeetingId URL parser utility
  - MeetingMetadata, TldvConf, ParsedPlaylist type interfaces
affects: [02-download-pipeline, 03-remux-delivery]

tech-stack:
  added: [jest, ts-jest, @types/jest]
  patterns: [TDD for pure functions, pipeline module isolation, Caesar cipher for tldv URL decoding]

key-files:
  created:
    - src/pipeline/types.ts
    - src/pipeline/caesar.ts
    - src/pipeline/playlist.ts
    - src/pipeline/api.ts
    - src/pipeline/auth.ts
    - tests/caesar.test.ts
    - tests/playlist.test.ts
    - jest.config.js
    - tsconfig.test.json
  modified:
    - package.json
    - src/manifest.json

key-decisions:
  - "Used ts-jest with separate tsconfig.test.json to keep test types out of production build"
  - "Caesar cipher shifts letters forward by +offset to decode (matching tldv's proven mechanism)"
  - "parseTldvConf splits on first two commas only to handle baseUrls with query params"

patterns-established:
  - "Pipeline modules in src/pipeline/ as pure functions and fetch wrappers"
  - "Test files in tests/ directory with jest + ts-jest"
  - "Auth module returns null gracefully when no token found (public meeting support)"

requirements-completed: [VID-01, VID-02, VID-03, VID-04, AUTH-01, AUTH-02]

duration: 3min
completed: 2026-03-23
---

# Phase 2 Plan 1: Pipeline Core Modules Summary

**Caesar cipher decoder, m3u8 playlist parser, tldv API client, and Firebase auth extractor as isolated testable modules**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-23T17:59:54Z
- **Completed:** 2026-03-23T18:03:36Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Caesar cipher decoder correctly shifts letters by offset with A-Z/a-z wrapping, preserving digits and symbols
- Playlist parser extracts TLDVCONF header (expiry, offset, baseUrl) and decodes obfuscated segment URLs into full S3 signed URLs
- API client fetches meeting metadata and raw m3u8 playlist with optional Firebase Bearer auth
- Firebase auth module reads IndexedDB for token, gracefully returns null for public meetings
- 16 unit tests covering cipher behavior, playlist parsing, and edge cases all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Create pipeline type definitions, Caesar cipher decoder, and playlist parser with tests** - `806db0d` (feat)
2. **Task 2: Create API client and Firebase auth token extractor** - `da2d16c` (feat)

## Files Created/Modified
- `src/pipeline/types.ts` - MeetingMetadata, TldvConf, ParsedPlaylist interfaces
- `src/pipeline/caesar.ts` - caesarDecipher function shifting letters by +offset
- `src/pipeline/playlist.ts` - parseTldvConf and parsePlaylist for m3u8 decoding
- `src/pipeline/api.ts` - fetchMeetingMetadata, fetchPlaylist, extractMeetingId
- `src/pipeline/auth.ts` - getFirebaseToken reading IndexedDB firebaseLocalStorageDb
- `tests/caesar.test.ts` - 10 test cases for Caesar cipher
- `tests/playlist.test.ts` - 6 test cases for playlist parsing
- `jest.config.js` - Jest config with ts-jest preset
- `tsconfig.test.json` - Test-specific TypeScript config with jest types
- `package.json` - Added test script and jest/ts-jest dependencies
- `src/manifest.json` - Added media-files.tldv.io host permission

## Decisions Made
- Used ts-jest with separate tsconfig.test.json to keep jest types out of production build (webpack only compiles src/)
- Caesar cipher shifts letters forward by +offset to decode, matching the proven tldv mechanism
- parseTldvConf splits on first two commas only to safely handle baseUrl containing query parameters

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added tsconfig.test.json for jest type resolution**
- **Found during:** Task 1 (TDD GREEN phase)
- **Issue:** ts-jest could not resolve `describe`, `test`, `expect` -- jest types not available in main tsconfig
- **Fix:** Created tsconfig.test.json extending tsconfig.json with `"types": ["jest"]` and updated jest.config.js to reference it
- **Files modified:** tsconfig.test.json, jest.config.js
- **Verification:** All 16 tests pass
- **Committed in:** 806db0d (Task 1 commit)

**2. [Rule 3 - Blocking] Used --legacy-peer-deps for jest installation**
- **Found during:** Task 1 (dependency installation)
- **Issue:** npm peer dependency conflict with TypeScript 6.x and ts-jest
- **Fix:** Added --legacy-peer-deps flag to npm install
- **Verification:** Dependencies installed, tests run successfully
- **Committed in:** 806db0d (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary to unblock test infrastructure. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All pipeline modules ready for service worker orchestration in Plan 02
- Caesar cipher and playlist parser are fully tested
- API client and auth module ready for integration
- media-files.tldv.io host permission added for S3 segment fetching

---
*Phase: 02-download-pipeline*
*Completed: 2026-03-23*
