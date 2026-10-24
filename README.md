# Reuseme

Local-first web app for composing a one-page resume from a vault of career blocks, then matching and rewriting bullets against a pasted job description.

## Functionality

### Core Task

Job seekers keep accomplishments as tagged blocks and assemble a role-specific, single-column resume. They paste a job description, see which vault blocks and required skills match the posting, and accept or reject bullet rewrites that are checked against their own notes. The result is an on-screen Letter-size resume that can be printed to PDF from the browser.

### Key Features

- Search and filter a persisted vault of accomplishment blocks by text and tags, with an option to include archived blocks. Each card can expand to show the raw source notes.
- Add, remove, and reorder blocks on a live resume canvas. Blocks land in a fixed section for their category (Education, Experience, Projects, Leadership, Certifications, Skills). Drag-and-drop works between the vault and the canvas on wide layouts; buttons work at any width.
- Switch presets, duplicate the active preset as a new version, and switch between two ATS-style templates (font, accent, and header layout only). Undo and redo apply to canvas changes, including accepted rewrites.
- Paste a job description and rank vault blocks. The app shows a match score and explanation, a coverage bar for required skills, and a “forgotten experience” list of high-scoring archived blocks.
- Request a bullet rewrite in three tones (technical IC, leadership, concise). The dialog shows a word diff, a source quote from the notes, unsupported-keyword badges, and non-blocking grounding warnings. Accept stores the new text only on the active preset.

### User Workflow

1. Open the app. There is no login. The vault and two presets (`frontend-swe`, `systems-eng`) load from seed data, then from browser storage after the first edit.
2. On the Vault tab, search or filter blocks and add them to the resume, or drag a card onto the canvas when the window is at least 1320px wide.
3. On the canvas, reorder blocks within a section, edit the header, remove blocks, and watch the space meter. If the estimated line count exceeds the one-page budget, the lowest-match block (or the last block when there is no ranking) is flagged.
4. Open the JD tab. A demo job description is filled in if the field is empty. Edit the text and choose Analyze & Rank Vault.
5. Review coverage and forgotten experience, and add matching blocks to the resume.
6. From a vault card or a canvas bullet, open Tailor bullet, pick a tone, and Accept or Reject. Accept updates that preset only and can be undone.
7. Choose Export PDF to open the browser print dialog. The print view is the resume only.

### Current Scope & Limitations

- The vault is seeded with fictional people, employers, and schools (25 blocks). Users cannot add, edit, or import blocks in the UI. There are no accounts and no server sync; data stays in the browser.
- Job matching and bullet tailoring run against local fixture functions (`src/data/fixtures.ts`), not a live model API. Pasting `__FIXTURE_MATCH_FAIL__` in the job description returns an error and leaves existing rankings in place. The demo job description is written so some skills (including Kubernetes, Rust, and Terraform, which appear nowhere in the seed notes) surface as unsupported.
- Coverage counts required skills only when they appear in a block’s tags, title, or effective bullets. Mentions that exist only in source notes do not count. Preferred skills are badges, not part of the percentage.
- Line count is an estimate (`MAX_LINES` 45). Overflow is flagged; the resume is not split across pages. Export uses `window.print()` (selectable text, US Letter). DOCX export is not supported.
- Cross-pane drag is pointer-only and only in the two-pane layout. Below 1320px the UI is one column with a Vault/Canvas toggle. Canvas reorder supports pointer and keyboard; vault-to-canvas drags do not.
- Undo history is in memory only and is cleared when stored state is rehydrated. Search, filters, the job description, and rankings are session state and are not undone with canvas edits.
