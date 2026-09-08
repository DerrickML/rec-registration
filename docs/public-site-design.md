# Public REC site design

## Scope

The public site now uses the NREP blue and amber palette, shared navigation,
footer, photo mastheads, accessible loading/error states, and responsive content
layouts. Home, About, Program, Sponsors, Media, Reports and Venue share these
foundations. Registration, scanner access, badge details and the embedded program
use the same control colors without changing their authorization or business rules.

- Brand colors: `#176F91`, `#2E9ECC`, `#0B5E78`, `#EFA74F`, `#F5C078`, `#B45309`.
- Shared layout styles: `app/public-site.css`; base UI tokens: `app/globals.css`.
- Imagery and display helpers: `lib/conference-display.js`.
- Configured conference title, theme, description, dates, features, hero image,
  sponsorship package and contact details remain controlled by the HR portal.
- Archive selection does not replace the active conference in the site navigation.
- Sponsor browsing is manual, with buttons, keyboard focus and native touch scrolling.
- Album samples open in an accessible dialog; the full album still opens externally.
- Conference dates use Africa/Kampala. Historical photographs are labeled REC25.
- Removed placeholder statistics, obsolete animation effects and decorative gradient
  panels. Existing excursion promotion dates and placement configuration are unchanged.

## Excursion Destinations

HR controls excursion links under **REC > Excursions > Publication**. External mode
sends navigation, footer, enabled section CTAs and the optional home hero button directly
to the configured HTTPS URL. Source attribution and best-effort click metrics remain.
Saved excursion content is retained. Switching the destination back to the REC page
restores it; missing destination settings on legacy records default to the REC page.

Old excursion routes use temporary Next.js redirects in external mode, preserving
allowlisted `from` attribution and ignoring arbitrary target query parameters. They
are excluded from the sitemap. Invalid external URLs fail closed. The hero uses the
separate `home_hero` placement; visibility still respects publication and promotion dates.
Deploy the updated HR and public applications together; no database schema change is
required. The active REC26 configuration was switched to LocalMotion with the hero
placement enabled through the authenticated HR editor.

## Photo Sources

Selected from the public [REC25 & EXPO album](https://photos.app.goo.gl/dHpY6Tq2ts6xWtaS9),
also linked by the published REC media API. Photographs remain unaltered apart from
web encoding. No faces or conference content were generated. Local copies avoid
depending on temporary Google Photos delivery URLs.

| Local file                    | Source                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `expo-aerial.webp`            | HR media sample `DJI_0442.webp`, Appwrite file `6a3c44a700134330883e`                    |
| `conference-speaker.webp`     | HR media sample `SM2_3001.webp`, file `6a3c44a8002c5f9d18b9`; publication launch         |
| `conference-panel.webp`       | HR media sample `SM2_8365.webp`, file `6a3c44a90021207feb2a`; conference speaker         |
| `conference-community.webp`   | HR media sample `SM2_9689.webp`, file `6a3c44a9003a9439eaa5`                             |
| `panel-discussion.webp`       | REC25 Google Photos album, photo `AF1QipOTBPcWCm_IEWcprkSuWL9XyM44Cks_z1Iy03pJ`          |
| `audience-participation.webp` | REC25 Google Photos album, adjacent photo `AF1QipMNBU2dVEPxaqZlOcWaQyE_8Sb4lpfCoQiTMGCA` |

The configured home hero image takes precedence over the archive fallback. Replace
archive photos deliberately when new conference photography is published, updating
the alt text and visible date attribution at the same time.

## Verification

Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`.
Display tests cover Kampala date boundaries, missing configuration and image assets.
Existing registration, schedule, public-site configuration and excursion tests remain.

Browser checks completed at 320px, 390px, 768px and desktop widths include:

- Home, About, Venue, Media, Reports, Sponsors and excursion layout and imagery.
- Mobile navigation, focus handling and dialog dismissal.
- Conference dropdown containment, historical conference selection, media type
  filters, empty results and album previews.
- Sponsor details, program day/hall selection and collapsing schedule blocks.
- Program download page, embedded schedule, scanner login and closed registration.
- Reduced-motion preference and readable foreground/background brand colors.

The automated suite has 58 passing tests. Final lint, type checking and production
build should also be run before release. Existing unrelated lint warnings are
not suppressed by this update.

Do not create real registrations, send OTPs or scan production badges as a visual test.
Physical camera/browser testing remains separate from this presentation-only update.
