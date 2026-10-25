<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Testing

Requires Node 20.9+ (`.nvmrc`). On Node 18, Vitest fails to load its config with `ERR_REQUIRE_ESM`.

There are three suites. Each one is a separate job in `.github/workflows/test.yml`.

- `npm run test:unit` runs the Vitest `unit` project in `test/unit/`: pure functions in `src/lib` and the stores. Tests run in node by default; files that touch `localStorage` opt into jsdom with `// @vitest-environment jsdom`.
- `npm run test:llm` runs the Vitest `llm` project in `test/llm/`: the AI routes (`/api/jd/match`, `/api/blocks/tailor`, `/api/resume/format`), the shared rate limiter, and the demo fixture. Tests call the real route handlers and the real AI SDK Google provider. `test/llm/support/fakeAi.ts` answers Gemini and Upstash HTTP calls and fails any other request, and `test/llm/support/setup.ts` replaces the AI environment variables with fake values before every test, so no key, quota, or network is used. Script model output with `fakeAi().reply(geminiJson(...))` and assert on the outgoing request through `ai.gemini`.
- `npm run test:e2e` runs Playwright specs in `test/e2e/`. The config builds the app and serves it on port 3100 (`E2E_PORT` overrides) with `MOCK_AI=1`, so a `next dev` on 3000 does not conflict. Set `E2E_BASE_URL` to test an already running server instead. Pages default to reduced motion so flows do not wait on animations; specs that check motion (landing, drag, sidebar handle) opt back in with `test.use({ reducedMotion: "no-preference" })`.
- Shared test data lives in `test/fixtures/` and shared helpers in `test/support/`. A unit test fails if a `.test.ts` file sits outside `test/unit/` or `test/llm/`, or a `.spec.ts` outside `test/e2e/`, because those files would never run.
- `npm test` runs both Vitest projects. `npm run test:all` runs typecheck, lint, Vitest, and Playwright. Run it before finishing a change.
- First run on a fresh machine: `npx playwright install --with-deps chromium`.

Both seed presets start over the 45-line budget, so on a fresh load every add, header edit, and tailor accept is refused. E2E tests that change the canvas remove `proj-4` first. Each Playwright test gets a fresh browser context, so `localStorage` starts empty.

### Cursor Cloud specific instructions

The cloud environment is configured in the Cursor dashboard. It must provide Node 20.9+ and run `npx playwright install --with-deps chromium` after `npm ci`. Use the scripts above; no API keys are needed. Playwright starts the app with `MOCK_AI=1`, so `/api/jd/match` returns its fixture; tailor calls use in-app fixtures. The `llm` suite uses fake credentials and a fake Gemini endpoint.
