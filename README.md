# Reuseme

Local-first web app for composing a one-page resume from a vault of career blocks, then matching and rewriting bullets against a pasted job description.

## Functionality

### Core Task

Job seekers keep accomplishments as tagged blocks and assemble a role-specific, single-column resume. They paste a job description, see which vault blocks and required skills match the posting, and accept or reject bullet rewrites that stay inside facts from their own notes. The result is an on-screen US Letter resume that prints to PDF from the browser.

### Key Features

- Search and filter a persisted vault of accomplishment blocks by text and tags, with an option to include archived blocks. Each card expands to show the raw source notes.
- Add, remove, and reorder blocks on a live resume canvas. Blocks land in a fixed section for their category (Education, Experience, Projects, Leadership, Certifications, Skills). Drag-and-drop runs between the vault and the canvas on wide layouts; Add to Resume and Remove work at any width.
- Switch presets, duplicate the active preset as a new version, and switch between two ATS-style templates (font, accent, and header layout only). Undo and redo apply to canvas changes, including accepted rewrites. Vault blocks stay immutable, so a rewrite for one role does not change another preset.
- Paste a job description and rank every vault block. The app shows a match score and a one-sentence explanation, a coverage bar for required skills, and a “forgotten experience” list of archived blocks at or above the match threshold.
- Request a bullet rewrite in three tones (technical IC, leadership, concise). The dialog shows a word diff, highlights the source quote in the notes, lists job-description keywords left out for lack of evidence, and shows non-blocking grounding warnings. Accept stores the new text only on the active preset.

### User Workflow

1. Open the app. There is no login. The vault and two presets (`frontend-swe`, `systems-eng`) load from seed data, then from browser storage after the first edit.
2. On the Vault tab, search or filter blocks and add them to the resume, or drag a card onto the canvas when the window is at least 1320px wide.
3. On the canvas, reorder blocks within a section, edit the header and skills, remove blocks, and watch the space meter. If the estimated line count exceeds the one-page budget, the lowest-match block is flagged (the last block of the last section when there is no ranking).
4. Open the JD tab. A demo job description is filled in if the field is empty. Edit the text and choose Analyze & Rank Vault.
5. Review coverage and forgotten experience, and add matching blocks to the resume. Rankings stay put if a match request fails.
6. From a vault card or a canvas bullet, open Tailor bullet, pick a tone, and Accept or Reject. Accept updates that preset only and can be undone. Reject leaves no change.
7. Choose Export PDF. The print view is the resume only: selectable text, one column, US Letter.

### Current Scope & Limitations

- The vault ships with 25 fictional blocks. Adding, editing, or importing blocks is out of scope, as are accounts, server sync, multi-page layout, and DOCX export. Overflow is flagged, not paginated.
- Coverage counts a required skill only when it appears in an on-canvas block’s tags, title, or effective bullets. Mentions that exist only in source notes do not count. Preferred skills appear as badges and are not part of the percentage. Keyword matching treats a small set of aliases as the same skill (for example `k8s` and `kubernetes`).
- Line count is an estimate used by the space meter, not a guarantee of one printed page. Undo history is kept in memory and cleared when stored state is rehydrated. Search, filters, the job description, and rankings are session state and are not part of undo.
- Cross-pane drag is pointer-only and only in the two-pane layout. Below 1320px the UI is one column with a Vault/Canvas toggle.
- Match and tailor calls are specified as `POST /api/jd/match` and `POST /api/blocks/tailor` (Google model, or deterministic fixtures when `MOCK_AI=1`). The current build answers those calls from in-app fixtures.
