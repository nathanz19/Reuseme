# Reuseme

Local-first web app for composing a one-page resume from a vault of career blocks, then matching and rewriting bullets against a pasted job description.

## Functionality

### Core Task

Job seekers keep accomplishments as tagged blocks and assemble a role-specific, single-column resume. They paste a job description, see which vault blocks and required skills match the posting, and accept or reject bullet rewrites that stay inside facts from their own notes. The result is an on-screen US Letter resume that prints to PDF from the browser.

### Key Features

- Add your own entries from the Add button beside each vault section. Forms support titles, organizations, dates, descriptions, source notes, tags, and extra fields. Contact details, target title, summary, skills, awards, publications, and custom sections can also be entered. New career blocks are saved to the vault; choose Add to Resume to place them on the canvas. Other details belong to the active resume version.
- Use the compact Filters panel and + Add filter to combine tags, active date ranges, and sections. Include Archived and Clear all are inside the panel; the button shows the active filter count. Date ranges match entries whose start/end dates overlap the selected months.
- Search and filter a persisted vault of accomplishment blocks by text and tags, with an option to include archived blocks. Each card expands to show the raw source notes.
- Add, remove, and reorder blocks on a live resume canvas. Blocks land in a fixed section for their category (Education, Experience, Projects, Leadership, Certifications, Skills). Drag-and-drop runs between the vault and the canvas on wide layouts; Add to Resume and Remove work at any width.
- Switch documents using browser-style tabs, create a blank document with the plus icon, and switch between two ATS-style templates (font, accent, and header layout only). Undo and redo apply to canvas changes, including accepted rewrites. Vault blocks stay immutable, so a rewrite for one role does not change another preset.
- Paste a job description and rank every vault block. The app shows a match score and a one-sentence explanation, required-skill chips (covered or missing), and a ranked list of the top 8 non-archived blocks with tier, best bullet, and matched tags.
- Request a bullet rewrite in three tones (technical IC, leadership, concise). The dialog shows a word diff, highlights the source quote in the notes, lists job-description keywords left out for lack of evidence, and shows non-blocking grounding warnings. Accept stores the new text only on the active preset.

### User Workflow

1. Open the app. There is no login. The vault and two presets (`frontend-swe`, `systems-eng`) load from seed data, then from browser storage after the first edit.
2. On the Vault tab, search or filter blocks and add them to the resume, or drag a card onto the canvas when the window is at least 1320px wide.
3. On the canvas, reorder blocks within a section, edit the header and skills, remove blocks, and watch the space meter. If the estimated line count exceeds the one-page budget, the lowest-match block is flagged (the last block of the last section when there is no ranking).
4. Open the JD tab. A demo job description is filled in if the field is empty. Edit the text and choose Analyze & Rank Vault.
5. Review the skill chips and the ranked vault, and add matching blocks to the resume. Rankings stay put if a match request fails.
6. From a vault card or a canvas bullet, open Tailor bullet, pick a tone, and Accept or Reject. Accept updates that preset only and can be undone. Reject leaves no change.
7. Choose Export PDF once the space count is within the one-page budget. If it is over budget, remove or shorten content first. The print view is the resume only: selectable text, one column, US Letter.

### Current Scope & Limitations

- The vault ships with 25 fictional blocks. Adding blocks is supported. Existing blocks can be edited and deleted from vault cards and resume blocks. Edits apply across resume versions; changing bullets clears their old tailored rewrites. Deleting a block removes it from all versions. Contact details, skills, and extra sections can also be edited or cleared. Importing blocks, accounts, server sync, multi-page layout, and DOCX export remain out of scope. Overflow is flagged, not paginated.
- Coverage counts a required skill only when it appears in an on-canvas block’s tags, title, or effective bullets. Mentions that exist only in source notes do not count. Preferred skills appear as badges and are not part of the percentage. Keyword matching treats a small set of aliases as the same skill (for example `k8s` and `kubernetes`).
- Line count is an estimate used by the space meter, not a guarantee of one printed page. Undo history is kept in memory and cleared when stored state is rehydrated. Search, filters, the job description, and rankings are session state and are not part of undo.
- Cross-pane drag is pointer-only and only in the two-pane layout. Below 1320px the UI is one column with a Vault/Canvas toggle.
- JD matching calls `POST /api/jd/match` (live Gemini call, or the fixture when `MOCK_AI=1`).
- Tailoring calls `POST /api/blocks/tailor` on the server. Live Gemini returns job-focused, technical, and conversational rewrites with source quotes, unsupported skills, and grounding warnings. Accept updates only the active document and is undoable. Job-description analysis/ranking still uses local demo fixtures; `/api/jd/match` is not implemented.


## Live tailoring setup

Copy `.env.example` to `.env.local` and set:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_private_key
AI_MODEL=gemini-3.1-flash-lite
MOCK_AI=0
```

Use a Gemini text model available to your account. Restart `npm run dev` after changing environment variables. The key is used only on the server; `.env.local` is ignored by Git. Set `MOCK_AI=1` for deterministic tailoring samples without provider calls. Browser tests force mock mode so they do not use your key or quota.

Paste the job description in the JD tab, then choose Tailor on a bullet. Analysis is optional: tailoring uses the current JD text directly. If no JD is supplied, it rewrites the bullet using its existing context. The modal shows loading, errors with retry, original text, evidence, and nonblocking warnings. Closing the dialog cancels the request. A 45-second timeout and explicit quota/configuration errors keep failures actionable. Grounding checks are heuristic warnings, not a guarantee that every claim is supported; review the proposed wording before accepting.
