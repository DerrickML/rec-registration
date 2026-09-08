# Explore Uganda / REC Excursions

Public pages: `/explore-uganda/rec26` and `/explore-uganda` (redirects to the current promotion, falling back to the latest published archive). The HR portal owns content and publication controls at `/dashboard/rec-conference/admin/excursions`.

## Deployment

Deploy the HR excursion endpoints and Appwrite schema before deploying this site. Set server-only `HR_PORTAL_BASE_URL=https://hr.nrep.ug`. Local integration testing can override it to the local HR server. No new Appwrite credential is required in this app.

- `GET /api/excursions` proxies the current promotion and fails closed to an empty list on upstream failure.
- Detail/metadata and sitemap read HR on the server. Drafts are not public. A temporary backend error shows a retry view; a genuine unknown/private slug is 404.
- `POST /api/excursions/{slug}/events` is a same-origin proxy for best-effort, anonymous engagement. No tracking request blocks a partner link. Session storage deduplicates page views, not outbound clicks. These counts are not confirmed bookings or unique people.
- CTAs on Home, About, Program, Media and Venue plus navigation/footer share one provider. It refreshes every minute and hides expired promotions while the page remains open. Program/Media use compact CTAs. Historical media pages explicitly label the promotion's REC edition.
- Partner links append allowlisted source attribution; target URLs come only from the HR-managed HTTPS link. No pricing, payment collection or booking workflow is hosted here.

All photo/logo assets under `public/excursions/rec26` are from the partner's [REC26 event page](https://www.localmotionsafaris.com/events/rec26-expo-2026), checked 8 September 2026. Original preview descriptions are maintained in the HR seed. Detailed image provenance and full API contracts are in the HR repository's `docs/rec-excursions.md`. Preserve image credits and confirm partner image-use requirements before deployment.

The promotion ends at the configured cutoff, initially midnight Africa/Kampala after 25 October 2026. Archive URLs remain accessible. To stop promotion earlier, edit HR publication dates or placements; do not delete this route.

## Verification

Run `npm test`, `npm run lint`, `npm run typecheck` and `npm run build`. Smoke test the public detail, alias, CTA source links, images, responsive navigation, and empty/upstream-error states. Test published/archived/draft changes in HR without changing unrelated conference registration or program data.
