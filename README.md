# Renewable Energy Conference And Expo

## Local Setup

Use this application's `.env.example` as the reference for its ignored `.env.local`. Next.js loads environment files from this project; it no longer imports a sibling application's `.env` implicitly. Do not commit credentials or replace configured secrets with example placeholders.

Run the HR portal on port 3000 and this application on port 3002. Set `HR_PORTAL_BASE_URL=http://localhost:3000` locally. Registration, scanner, exhibitor, badge, media and rapporteur proxies must use the same updated HR backend. For deployment use `HR_PORTAL_BASE_URL=https://hr.nrep.ug`, `NEXT_PUBLIC_SITE_URL=https://rec.nrep.ug` and disable scanner development login. Keep `REC_REGISTRATION_SYNC_SECRET` identical on both servers. The optional `NEXT_PUBLIC_NREP_LOGO_URL` supplies branding to reporting documents.

The reporting interface is `/reporting`, backed by `/api/reporting/*` and the HR portal's `/api/v1/rec/rapporteur/*` endpoints. Rapporteurs require an active HR-managed assignment and an emailed OTP. Sessions use a scoped HttpOnly cookie; browsers never receive the bearer token. HR administrators manage assignments and approvers review submitted reports at `/dashboard/rec-conference/admin/reporting`. See [rapporteur draft protection](docs/rapporteur-draft-protection.md) for the coordinated backend rollout required for protected saves.

Reporting sessions have no fixed login timeout in the HR backend. The browser cookie persists across restarts for up to 400 days and renews after every successful authenticated reporting request. Sign-out revokes the session, and HR still checks assignment status, access windows and hall permissions on every request. Deploy the matching HR session change together with this site's cookie change; changing the cookie alone cannot prevent the previous 12-hour backend expiry. Existing cookies are upgraded on their next successful reporting request; users whose cookies have already expired must sign in once again. Clearing browser cookies also requires a fresh sign-in. Email OTP codes still expire after ten minutes.

## External REC Scanners

The public `/scanner` interface supports camera, external keyboard/HID scanner, USB Serial and manual entry modes. See [REC external scanner setup](docs/rec-hardware-scanner-setup.md) for Tera HW0009 USB/cradle/Bluetooth configuration, USB-COM port settings and browser permissions, operator instructions, troubleshooting and the hardware acceptance checklist. No new deployment variables or database changes are required.

## Verification

Install the full dependency tree before building, including build-only Tailwind plugins. Run `npm test`, `npm run lint`, `npm run typecheck` and `npm run build`. Environment files remain local; deployment variables must be configured separately.

The October 22, 2026 package audit retains Next.js 16.3.8, updates Vitest to 4.1.12, and overrides vulnerable Vite 8 releases through 8.1.5 with 8.1.6. The npm and pnpm lockfiles include these fixes. `@tiptap/core` is declared directly because the document editor and its pagination tests import it; a clean pnpm install must not rely on an accidentally hoisted transitive dependency.

Full and production-only audits now report zero vulnerabilities after the user-approved local nesting-depth patch. There is still no official upstream fixed `braces` release: both portals install the private, locally maintained `@nrep/braces` archive through an explicit `braces` override. Readable source, upstream integrity, MIT attribution and maintenance instructions are in [the patch notice](vendor/braces/NREP_PATCH.md). Tests check ordinary upstream behavior, malicious nesting, actual tooling resolution, and installed source/archive integrity. A package rename or clean audit alone is not proof of safety; the parser and AST traversal guards are the fix. No advisory is suppressed.

This patch preserves Tailwind 3 and the current Next ESLint setup. Keep glob patterns repository-controlled and do not expose development/test servers publicly; the depth guard is not a general defense against every expensive regular expression or expansion. Track the [upstream advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and replace the maintained patch when a suitable official fix is available. Install from the committed locks/archive and restart existing development/build processes after installing.

Do not use `npm audit fix --force`: its proposed Tailwind 4 upgrade and Next ESLint downgrade require separate compatibility work. Recheck the upstream advisory before changing this exception. Keep npm overrides in `package.json` and pnpm overrides in `pnpm-workspace.yaml` aligned, regenerate both tracked lockfiles, and rerun the verification commands above.
