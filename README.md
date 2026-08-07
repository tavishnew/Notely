# Notely

**Turn any lecture, PDF, or video into study notes, flashcards, quizzes, and a study chat — free, and private by default.**

## Download the app

Installers are published from GitHub Releases when a version tag is pushed:

| Platform | Artifact |
| --- | --- |
| macOS Apple Silicon | `Notely-mac-arm64.dmg` |
| macOS Intel | `Notely-mac-x64.dmg` |
| Windows 10/11 | `Notely-Setup-Windows.exe` |

Browse [Releases](https://github.com/tavishnew/Notely/releases/latest) for the latest builds.

## How it works

Notely is a local-first study app. Point it at a document, website, YouTube link, or audio file and it generates notes (with math), spaced-repetition flashcards, quizzes, and a chat that knows your material.

You pick one engine on first launch (switch anytime in Settings):

- **Fully local** — downloads and starts [Ollama](https://ollama.com) and a small model. Nothing leaves your machine.
- **Bring your own key** — OpenAI (`sk-…`), Anthropic (`sk-ant-…`), or NVIDIA NIM (`nvapi-…`). Keys stay in your OS keychain.

## For developers

Requires **Node ≥ 20.19** (or 22 LTS).

```bash
git clone https://github.com/tavishnew/Notely.git
cd Notely
npm install

npm run dev      # Vite frontend + local helper server
npm run serve    # build once, serve UI + helpers at http://localhost:4180
npm run app      # build, then launch the Electron desktop shell
npm test         # Vitest
npm run typecheck
```

Build installers:

```bash
npm run dist:mac   # → release/Notely-<version>-<arch>.dmg
npm run dist:win   # → release/Notely-Setup-Windows.exe
```

Or push a tag (`git tag v0.1.3 && git push --tags`) and the [release workflow](.github/workflows/release.yml) builds and attaches installers.

### Project layout

```
frontend/       React + Vite UI (engine, ingest, generation)
backend/        Local Node server (static UI + YouTube + Ollama helpers)
electron/       Desktop shell (starts backend, opens the window)
build-resources/  Icons, entitlements, Apple intermediates for signing
scripts/        electron-builder hooks (e.g. afterPack)
```

Deployable production path:

1. `npm run build` → writes `frontend/dist`
2. `npm run serve` / `npm start` → backend serves that dist on port 4180
3. `npm run dist` → packages Electron with `dist/`, `backend/`, and `electron/`

## Signing your own builds

By default the release workflow produces **ad-hoc-signed** builds. With certificates as GitHub secrets, tagged builds are signed/notarized automatically.

**macOS** (paid Apple Developer + Developer ID Application cert):

| Secret | What it is |
| --- | --- |
| `CSC_LINK` | Developer ID `.p12`, base64-encoded |
| `CSC_KEY_PASSWORD` | `.p12` password |
| `APPLE_ID` | Apple ID email |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | 10-character Team ID |

**Windows** (optional Authenticode cert):

| Secret | What it is |
| --- | --- |
| `WIN_CSC_LINK` | Code-signing `.pfx`, base64-encoded |
| `WIN_CSC_KEY_PASSWORD` | `.pfx` password |

## Tech

React 19 · Vite · Tailwind · Electron · Ollama (local) · OpenAI / Anthropic / NVIDIA NIM (cloud) · KaTeX · FSRS. No cloud backend of our own, no telemetry, no account.

## License

[AGPL-3.0-or-later](LICENSE). Fork it, ship it, improve it — just keep it open.
