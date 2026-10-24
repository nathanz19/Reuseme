<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Testing

Requires Node 20.9+ (`.nvmrc`). On Node 18, Vitest fails to load its config with `ERR_REQUIRE_ESM`.

- `npm run test` runs Vitest unit tests in `test/**/*.test.ts` (node by default; files that touch `localStorage` opt into jsdom with `// @vitest-environment jsdom`).
- `npm run test:e2e` runs Playwright specs in `test/e2e/`. The config builds the app and serves it on port 3100 (`E2E_PORT` overrides), so a `next dev` on 3000 does not conflict. Set `E2E_BASE_URL` to test an already running server instead.
- `npm run test:all` runs typecheck, unit, and e2e tests. Run it before finishing a change.
- First run on a fresh machine: `npx playwright install --with-deps chromium`.

Both seed presets start over the 45-line budget, so on a fresh load every add, header edit, and tailor accept is refused. E2E tests that change the canvas remove `proj-4` first. Each Playwright test gets a fresh browser context, so `localStorage` starts empty.

### Cursor Cloud specific instructions

The cloud environment is configured in the Cursor dashboard. It must provide Node 20.9+ and run `npx playwright install --with-deps chromium` after `npm ci`. Use the scripts above; no API keys are needed. Playwright starts the app with `MOCK_AI=1`, so `/api/jd/match` returns its fixture; tailor calls use in-app fixtures.
