# CLAUDE.md

## Project Overview

mg-api-js is the official JavaScript API wrapper for the MyGeotab telematics platform. It provides a `GeotabApi` class for making authenticated API calls from both browser and Node.js environments. Zero runtime dependencies — uses native `fetch` (browser) and `http`/`https` (Node.js).

## Build & Test Commands

| Command | Purpose |
|---|---|
| `npm run build` | Production build → `dist/api.min.js` (webpack + babel, targets IE 10) |
| `npm run serve` | Dev server on port 9000 |
| `npm test` | Build + start dev server + run all tests (node + web) |
| `npm run test:node` | Node.js tests only (fast, no server needed) |
| `npm run test:web` | Browser tests only (Puppeteer, needs dev server) |
| `npm run mocha:node` | Run node specs directly with mocha |

## Architecture

```
lib/api.js              → UMD entry point, webpack bundles this to dist/api.min.js
lib/GeotabApi.js        → Public facade: authenticate(), call(), multiCall(), getSession(), forget()
lib/ApiHelper.js        → Internal logic: auth flow, credential management, error handling, HTTP dispatch
lib/HttpCall.js         → Transport: fetch (browser) or http/https (Node), timeout via Promise.race
lib/LocalStorageCredentialStore.js → Credential persistence (localStorage or mock)
lib/LocalStorageMock.js → In-memory localStorage replacement for Node.js
```

## Code Conventions

- **Module format**: CommonJS with `exports.default = ClassName`; UMD wrapper in `api.js`
- **Naming**: PascalCase files and classes (`GeotabApi.js`), camelCase methods, underscore-prefix for private members (`this._helper`)
- **Style**: 2-space indent, LF line endings, no trailing whitespace (see `.editorconfig`)
- **Patterns**: ES2017 classes with async/await; dual callback/promise API on all public methods
- **Tests**: Mocha + Chai (BDD style), Nock for HTTP mocking, Puppeteer for browser tests
- **Test file naming**: `{context}-{Feature}.spec.js` (e.g., `node-Credentials.spec.js`)

## Git Conventions

- Commit messages: lowercase, imperative, concise, single-line (e.g., `refactor error handling for DRYness`)
- No conventional commits prefix
- Branch names use Jira ticket IDs (e.g., `MYG-62290`)
- PRs merge to `master`

## Rules

- All unit tests must pass before making a commit. Run `npm run test:node` to verify.

## Key Details

- The bundled output `dist/api.min.js` is committed to the repo
- Browser vs Node detection uses `typeof window` checks
- Auto re-authentication on `InvalidUserException` (retries failed call after re-auth)
- Default API timeout: 180 seconds
- API endpoint format: `https://{server}/apiv1/`
- CI: GitHub Actions, Node.js 16.x
