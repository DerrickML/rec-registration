# Rapporteur drafts and automatic pages

The reporting editor keeps one structured document and creates A4 pages as content grows, including paragraphs and long table cells. Page spacers, branding and page numbers belong to the display; they never become report content. Word downloads use A4 with 20 mm margins.

Opening a saved report does not save or replace it. Existing HTML, including headings, takes precedence over generating a template. Older structured drafts render their recorded sections. Malformed or unavailable content produces an error instead of a fresh template.

Each editable report has its own serialized save queue and revision. Navigation, sign-out, submission and sending a note flush the editor's latest text before proceeding. An acknowledged save must confirm the complete body. Interruptions retry the same mutation; conflicting writers keep their browser copies for comparison rather than automatically overwriting one another. Browser recovery uses IndexedDB per report and per tab, with explicit recover, download and discard actions.

The matching HR backend stores full documents in private files and immutable version records. The first protected mutation automatically retains the original report as a baseline, including its raw legacy record. Subsequent saves and workflow transitions append versions. Restoring appends another version. Existing report IDs, assignments, inline content, comments and approval ownership remain in place. There is no bulk conversion or requirement to export every draft manually.

## Coordinated deployment

Use `docs/rec-rapporteur-document-protection.md` in the HR checkout for the complete rollout and rollback procedure. Its `scripts/migrate_rec_rapporteur_documents.mjs` defaults to a read-only schema plan. The `--apply` mode adds private document storage, revision indexes and optional pointer attributes; it does not update existing report bodies.

Apply the additive schema, deploy the reader-capable HR backend to every instance, then enable `REC_RAPPORTEUR_PROTECTED_WRITES=enabled` on every backend. Deploy both editor clients with this backend. Keep the disabled-write interval short; saves during that interval return an explicit error and retain the writer's work. Do not return to an older backend that reads only inline content after protected saves begin.

Configure both sites' reverse proxies to accept request bodies of at least 4 MiB, allowing the complete 2 MiB content and its JSON envelope. For Nginx, verify the applicable `client_max_body_size`; this setting lives outside the application checkout.

Verify a designated test assignment before general use: several pages with a long table cell, save/reopen, a second tab conflict, interrupted saving, recovery, version download/restore, submission, supervisor approval and repository export. No existing live draft should be used for destructive testing.

The complete serialized report has an explicit 2 MiB limit, including pasted images and formatting. There is no one-page save boundary or silent text truncation. A rejected save leaves the previous server version unchanged and the writer's current document available for recovery/download.

Version history starts with the first protected save's baseline. It cannot recover text that was already overwritten before this update.
