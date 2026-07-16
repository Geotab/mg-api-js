# CLAUDE.md

## Project Overview

mg-api-js is the official JavaScript API wrapper for the MyGeotab telematics platform. It provides a `GeotabApi` class for authenticated API calls in browser and Node.js environments. The published package has zero runtime dependencies and uses native `fetch` in browsers and `http`/`https` in Node.js. Supported Node.js versions start at 18.

## Build & Test Commands

| Command | Purpose |
|---|---|
| `npm run build` | Production build → `dist/api.min.js` (webpack + Babel, targeting IE 10 syntax) |
| `npm run serve` | Start the development server on port 9000 |
| `npm test` | Build, start the development server, and run all Node.js and browser tests |
| `npm run test:node` | Run Node.js tests against the committed bundle |
| `npm run test:web` | Start the development server and run browser tests |
| `npm run mocha:node` | Run Node.js specs directly with Mocha |

Browser tests use `puppeteer-core` and require Chrome. The test harness checks common Chrome installation paths; set `PUPPETEER_EXECUTABLE_PATH` when Chrome is installed elsewhere. GitHub Actions installs Chrome with `browser-actions/setup-chrome` and supplies this variable.

## Architecture

```
lib/api.js                         → UMD entry point bundled to dist/api.min.js
lib/GeotabApi.js                   → Public facade: authenticate(), call(), multiCall(), getSession(), forget()
lib/ApiHelper.js                   → Authentication, credential-store, retry, and response handling
lib/HttpCall.js                    → Browser fetch or Node.js http/https transport
lib/LocalStorageCredentialStore.js → Browser localStorage adapter or Node.js in-memory fallback
lib/LocalStorageMock.js            → In-memory localStorage replacement for Node.js
```

## Credential Persistence

- `rememberMe` defaults to `true`. In browsers this persists session credentials as plaintext JSON in same-origin `localStorage`; in Node.js the default store is process-local memory.
- `rememberMe: false` prevents new persistence but does not clear credentials written by an earlier instance.
- `forget()` refreshes the session; it is not a logout API and may persist replacement credentials.
- `newCredentialStore` is a supported synchronous adapter with `get()`, `set(credentials, server)`, and `clear()` methods. `get()` returns a falsey value or `{ credentials, server }`.
- Keep the README threat model and custom-store contract aligned with credential-management changes.

## Code Conventions

- **Module format**: CommonJS with `exports.default = ClassName`; UMD wrapper in `lib/api.js`
- **Naming**: PascalCase files/classes, camelCase methods, underscore-prefixed private facade members
- **Style**: Spaces, LF endings, and no trailing whitespace according to `.editorconfig`
- **Patterns**: ES2017 classes with async/await and dual callback/promise public APIs
- **Tests**: Mocha + Chai, Nock for Node.js HTTP mocks, and Puppeteer Core for browser tests
- **Test naming**: `{context}-{Feature}.spec.js`, such as `node-Credentials.spec.js`

## Git Conventions

- Commit messages are lowercase, imperative, concise, and single-line (for example, `refactor error handling for DRYness`).
- Do not add conventional-commit prefixes unless the repository convention changes.
- Existing Jira-linked branches use ticket IDs such as `MYG-62290`; PRs merge to `master`.

## Rules

- Run `npm test` before committing changes that affect runtime code, bundling, credentials, or browser behavior.
- At minimum, run `npm run test:node` for Node-only test changes.
- Rebuild and commit `dist/api.min.js`, its source map, and license file when `lib/` changes.
- Keep the package version, README CDN pin, source banner, lockfile, and distribution license banner aligned; `node-Version.spec.js` enforces this.
- Do not replace the pinned README CDN example with an unversioned package URL.

## Key Details

- The generated `dist/` bundle is committed to the repository.
- Browser versus Node.js transport detection uses `typeof window`.
- `InvalidUserException` triggers authentication refresh and one retry of the failed call.
- Default API timeout: 180 seconds.
- API endpoint format: `https://{server}/apiv1/`.
- CI runs Node.js tests on 18, 20, and 22, plus browser tests on Node.js 22.
- The publish workflow builds and runs both Node.js and browser tests on Node.js 24 before publishing.
- The `uuid` override intentionally supplies a patched release to webpack-dev-server 5's `sockjs` dependency; retain it until the development server no longer depends on `sockjs`.
