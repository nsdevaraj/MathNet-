# Mobile Corpus Architecture

## Status

The mobile redesign is in progress. The native shell, deterministic SQLite snapshot, installer state machine, native query repository, platform split, and iOS build are implemented. A hosted snapshot and downloadable offline image artifacts are still required before native release.

## Baseline

Measured on August 20, 2026 before the redesign:

| Item | Size/count |
| --- | ---: |
| Questions | 78,805 |
| Generated JSON | 139 MB on disk |
| Source images | 7,471 files / 305 MB |
| `public/` | 445 MB |
| Synced iOS web payload | 577 MB |
| JavaScript and CSS shell | 1.4 MB |

The legacy runtime fetched all 32 JSON chunks, normalized every record, retained the complete corpus in React state, and repeatedly scanned or copied the growing array for facets and filtering.

## Implemented Design

Native and browser routes split at startup:

- Browser development keeps the legacy JSON loader temporarily.
- iOS and Android never invoke the stream-all loader.
- Native first launch downloads a versioned SQLite snapshot from static HTTPS storage.
- Downloads go directly to app-private no-backup storage.
- The installer verifies byte size and SHA-256 incrementally, checks SQLite integrity, schema, corpus version, and row count, then atomically activates the staging database.
- Activation failures restore the previous database.
- A completed paused download resumes at verification without downloading twice.
- The repository exposes paged queries, facets, FTS search, and stable string identifiers; page size is capped at 50 and the trainer requests one active record.

The current full snapshot contains 71,911 rows and is 214,937,600 bytes uncompressed. Legacy `Mathematics (Multi-modal)` and `General Science` records are normalized under `Mathematics (Olympiad)` as the `JEE` and `General` topics respectively. Their former broad topics remain available as subtopics. Chemistry and Physics are excluded from both browser loading and generated snapshots (6,894 source records). The corpus version includes the classification version so installed apps do not mistake reclassified data for an unchanged snapshot.

After the implementation, both synced native web payloads are about 2.5 MB. The compiled iOS simulator application is about 29 MB and builds successfully with SQLite, Filesystem, and File Transfer plugins.

## Modules

- `src/corpus/contracts.ts`: storage-independent interfaces and installer states.
- `src/corpus/manifest.ts`: strict manifest validation and HTTPS URL resolution.
- `src/corpus/nativeCorpusInstaller.ts`: platform-neutral install, verify, activation, pause, and rollback state machine.
- `src/corpus/capacitorCorpusOperations.ts`: Capacitor Filesystem and File Transfer adapter.
- `src/corpus/capacitorSqlConnection.ts`: native non-conforming SQLite connection and snapshot validation.
- `src/corpus/sqliteQuestionRepository.ts`: paged filters, facets, FTS, and lookup queries.
- `src/hooks/useQuestionSession.ts`: bounded React session state.
- `src/native/NativeApp.tsx`: first-run setup and native SQLite trainer.
- `scripts/corpus/build-snapshot.mjs`: deterministic SQLite/FTS artifact generation.
- `scripts/corpus/verify-snapshot.mjs`: independent artifact verification.
- `scripts/assert-shell-build.mjs`: prevents corpus data from entering production shells.

## Security and Compliance

- Corpus HTML is sanitized before insertion into the DOM.
- KaTeX trust is disabled and its styles/fonts are bundled locally.
- A Content Security Policy blocks plugins, frames, and arbitrary scripts.
- Build-time Gemini secret injection was removed.
- iOS includes the Filesystem timestamp required-reason privacy manifest.
- Android stores corpus files privately and excludes application data from cloud backup/device transfer.
- `@capacitor-community/sqlite` links SQLCipher even for unencrypted databases. Complete Apple encryption/export-compliance review before distribution.
- Dataset and image licenses are not yet recorded in the generated manifest. Publication is blocked until redistribution rights and attribution are verified for every source.

## Release Blockers

1. Publish `artifacts/corpus/manifest.json` and `mathnet.sqlite3` to the configured HTTPS directory. The currently configured `https://math-net.vercel.app/manifest.json` returns 404.
2. Build content-addressed image artifacts, rewrite every Markdown/raw HTML/`srcset` reference, and extend the manifest and installer. Native corpus images are not yet offline.
3. Add free-space preflight. The installer currently reports storage errors but cannot query available disk before download.
4. Add incremental question and asset deltas. The current installer atomically replaces the full database.
5. Benchmark persistent SQLite WASM/OPFS and move the browser route off the JSON loader.
6. Install JDK 21 and Android SDK locally, then run `cd android && ./gradlew assembleDebug`. Android project generation and Capacitor sync pass, but this machine currently has no Java runtime or Android SDK.
7. Exercise first install, force-quit/resume, airplane mode, and update rollback on physical low-memory iOS and Android devices.

## Acceptance Gates

- No corpus JSON, database, or image tree in `dist` or either app binary.
- No full-corpus array in JavaScript memory on native.
- Query pages contain at most 50 records.
- Full offline crawl has no missing image or content requests.
- Corrupt/incompatible updates leave the prior corpus usable.
- No Android `largeHeap` workaround.