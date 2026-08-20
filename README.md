# OlympiadMath

OlympiadMath is a React and Capacitor trainer for a large mathematics and science question corpus. Browser development builds read the generated JSON chunks in `public/`, while production browser builds stream the same chunks from the corpus endpoint. Native builds package only the application shell and install a verified SQLite/FTS snapshot after first launch.

## Requirements

- Node.js 24 or newer to build corpus snapshots with `node:sqlite`
- Xcode 26 or newer for iOS 15+
- Android Studio with JDK 21 and an Android SDK for Android API 24+

## Development

```sh
npm install
npm run dev
```

The development server runs at <http://localhost:3000/> and serves the local JSON corpus from `public/`.

## Corpus Snapshot

Generate and verify the SQLite/FTS artifact from the existing JSON chunks without downloading upstream datasets:

```sh
npm run corpus:snapshot
npm run corpus:verify
```

Output is written to the ignored `artifacts/corpus/` directory. The publishing command uploads `manifest.json`, `mathnet.sqlite3`, and the browser JSON chunks together under the HTTPS directory configured by `VITE_CORPUS_BASE_URL`.

To publish the default public Hugging Face dataset, authenticate locally and run:

```sh
python3 -m huggingface_hub.commands.huggingface_cli login
npm run corpus:publish:hf
cp .env.example .env.local
npm run corpus:check-remote
```

Enter the Hugging Face token only in the terminal prompt. Native sync commands run the same remote check and stop before building if the endpoint is missing or invalid.

Regenerating the source JSON corpus is a separate network-heavy operation:

```sh
npm run corpus:build
```

## Native Builds

Create `.env.local` with the deployed artifact directory:

```dotenv
VITE_CORPUS_BASE_URL="https://example.com/mathnet-corpus/"
```

Then build and sync both native projects:

```sh
npm run cap:sync
```

Platform commands:

```sh
npm run ios:run
npm run android:run
```

Production builds intentionally exclude `public/` to stay within hosting limits. Browser builds load JSON chunks from `VITE_CORPUS_BASE_URL`, or from the default public Hugging Face dataset when the variable is unset. The build fails if corpus JSON, SQLite files, or the source image directory enter `dist`.

## Verification

```sh
npm test
npm run lint
npm run build
```

See [docs/architecture/mobile-corpus.md](docs/architecture/mobile-corpus.md) for the architecture, measured baseline, and remaining release gates.
