# Reuseme

**Reuse more, apply more.**

Reuseme is a local-first web app for building one-page resumes from a vault of career blocks. Paste a job description to see which blocks fit and which required skills your resume still misses. AI rewrites use only facts from your own source notes.

**[Try the live demo](https://reuseme-coral.vercel.app/)** · Editor at `/editor` · Built for **SBUHacks 2026**

<!-- Add a screenshot or short GIF: docs/images/preview.png -->

---

## The problem

Every application asks you to pick the right experiences, rewrite bullets, and maintain another resume version. Accomplishments get buried in old files. Multiple resumes drift apart.

Reuseme treats your career as a **library of reusable blocks**, not a pile of disconnected documents. Write each accomplishment once—with the notes behind it—and assemble a role-specific resume when you apply.

There are no accounts. Vault and documents stay in your browser.

---

## Features

### Career vault

- Store experience, projects, education, leadership, certifications, awards, and publications as tagged blocks with dates, bullets, and private **source notes**.
- Search by text; filter by tag, section, and date range. Archived blocks stay hidden unless you include them.
- Add, edit, and delete blocks. Vault edits apply everywhere that block is used; tailoring for one document does not change the vault bullet.

### Resume canvas

- Live **US Letter** page: add blocks by button or drag-and-drop, reorder within sections, drag sections below the header.
- Multiple documents in browser-style tabs; two single-column ATS templates; undo/redo.
- **Space meter** estimates one-page fit. Export stays off until content fits. The lowest-match block is flagged when you overflow.
- **PDF** (browser print, selectable text) or **Word** (`.docx`).

### Job description matching

- Paste a JD and rank the vault. Each card gets a match score, a one-sentence explanation, tier (strong / partial / weak), best bullet, and matched tags.
- Required skills appear as chips (covered or missing) and update as you change the canvas.
- Live mode calls `POST /api/jd/match` (Gemini structured output). `MOCK_AI=1` uses a deterministic fixture for dev and tests.

### Evidence-grounded tailoring

- Three rewrites per bullet: job-focused, technical, conversational.
- Side-by-side diff, supporting quote from your notes, and non-blocking grounding warnings.
- **Accept** updates only the active document (undoable). Other presets and vault bullets stay unchanged.

Reuseme helps you communicate experience you already have. It does not invent roles or metrics. Review every rewrite before you accept it.

### Copy a reference format

- Upload PDF, PNG, or JPG (≤ 4 MB). The app detects font, header layout, spacing, margins, and section order.
- Adjust detected layout in the preview, then apply as a reusable template. **Style only**—no employers, contact fields, or bullets are imported from the file.

---

## How it works

1. **Build your vault** — Add accomplishments and the context behind them.
2. **Paste a job description** — See skill coverage and ranked blocks.
3. **Assemble the resume** — Add the strongest matches to the canvas and arrange sections.
4. **Refine bullets** — Tailor with AI; inspect evidence; accept or reject.
5. **Export** — Print PDF or download Word when the page fits.

**Under the hood**

- **Matching** — One structured call sends the JD, vault tags, and all blocks to Gemini. The server returns parsed requirements, tag mapping, and per-block relevance. Final score blends semantic score (60%) with keyword overlap in code (40%).
- **Grounding** — Tailoring is limited to source notes and existing bullets. The JD is treated as desired requirements only. Server checks quotes heuristically; warnings are not a guarantee of accuracy.
- **One-page budget** — The app measures the real off-screen resume so the meter, overflow flag, and export gate match what you see.
- **Untrusted input** — User text is delimited in prompts and handled as data, not instructions.

---

## Project goals

- **Reusability** — One source of truth for accomplishments.
- **Relevance** — Pick experience for the role you target.
- **Traceability** — Keep original context beside AI edits.
- **User control** — Review, accept, reject, and undo.
- **Consistency** — Separate resume variants without duplicating history.

---

## Tech stack

| Technology | Role |
| --- | --- |
| Next.js (App Router), React, TypeScript | App UI and API routes |
| Tailwind CSS, `lucide-react`, dnd-kit | Styling and drag-and-drop |
| Zustand + `localStorage` | Persisted vault and documents |
| Vercel AI SDK + Google Gemini, Zod | Matching, tailoring, format analysis |
| `docx`, `pdfjs-dist` | Word export; PDF measurements for format upload |
| Vitest, Playwright | Unit, route, and browser tests |
| Vercel, Upstash Redis | Deploy; shared live-AI rate limit |

---

## Quick start

Requires Node **20.9+** (see `.nvmrc`).

```bash
git clone https://github.com/nathanz19/Reuseme.git
cd Reuseme
npm ci
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Landing page is `/`; workspace is `/editor`.

`.env.example` sets `MOCK_AI=1`, so you can run without API keys. Matching, tailoring, and format analysis use deterministic fixtures.

### Sample data

Default workspace is empty (one blank document, no vault). For demo content:

```env
NEXT_PUBLIC_ENABLE_DEMO_DATA=1
```

Restart the dev server. This loads fictional vault blocks, two sample resumes (`frontend-swe`, `systems-eng`), and a sample JD. Sample and real data use different `localStorage` keys (`reuseme-resume-demo` vs `reuseme-resume-user`).

### Live AI

Set in `.env.local` and restart:

```env
MOCK_AI=0
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_studio_key
AI_MODEL=gemini-3.1-flash-lite
UPSTASH_REDIS_REST_URL=your_upstash_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_write_token
```

Keys are server-only. Never commit `.env.local`.

**Rate limit** — Live matching, tailoring, and format analysis share **10 requests per IP per 24 hours** (Upstash on Vercel). Failed provider calls may count. Mock mode and validation errors do not. Without Redis, live AI returns 503.

**Local dev** — `DISABLE_AI_RATE_LIMIT_LOCAL=1` skips Redis under `npm run dev` only.

**Deploy** — Configure the same variables on Vercel (write-enabled Upstash token). Preview can use `MOCK_AI=1` to avoid Gemini usage.

---

## Project structure

```
src/
  app/          Pages (/, /editor) and API routes
    api/jd/match         Rank vault against a job description
    api/blocks/tailor    Rewrite one bullet in three tones
    api/resume/format    Analyze uploaded reference resume style
    api/ai/usage         Remaining AI allowance for current IP
  components/   Vault, canvas, dialogs, panels
  lib/          Page budget, scoring, search, coverage, grounding, exports
  lib/server/   Tailoring, rate limiter, PDF measurements
  schemas/      Zod schemas for API payloads
  store/        Persisted resume store + session store
  data/         Seed and starter workspace
test/
  unit/         Pure logic and stores
  llm/          API routes with fake Gemini/Upstash (no key)
  e2e/          Playwright
docs/SPEC.md    Detailed behavior spec
```

---

## Development

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3000 |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm run test:unit` | Vitest unit tests |
| `npm run test:llm` | API route tests (fake provider) |
| `npm run test:e2e` | Playwright (port 3100, `MOCK_AI=1`) |
| `npm run test:all` | Typecheck, lint, Vitest, Playwright |

First e2e run: `npx playwright install --with-deps chromium`. CI runs three jobs (see `.github/workflows/test.yml`).

Full contracts and tunables: [`docs/SPEC.md`](docs/SPEC.md). Agent/testing notes: [`docs/AGENTS.md`](docs/AGENTS.md).

---

## Limitations

- No accounts, sync, or resume **content** import. Clearing site data clears your vault.
- One US Letter page. Overflow is flagged, not paginated.
- Print preview is the final check; browsers may differ slightly from the on-screen meter.
- Cross-pane drag needs width ≥ 1320px. Narrow layouts use a Vault/Canvas tab; Add/Remove work at all widths.
- Reference format is an approximation (no sidebars, photos, or exact commercial fonts).
- Rate limit is per IP, not per user.
