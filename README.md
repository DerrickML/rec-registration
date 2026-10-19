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

The October 7, 2026 integration updates Next.js to 16.3.6 and fixes compatible dependency advisories. Full `npm audit` still reports the `braces` denial-of-service advisory through Tailwind 3 and the Next ESLint plugin's build-tooling dependency chain. There is no patched `braces` release at verification time. Do not apply npm's forced Tailwind 4 upgrade or Next ESLint downgrade without a dedicated migration. See [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
