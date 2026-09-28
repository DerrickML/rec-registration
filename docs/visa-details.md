# REC Visa Correction Page

`/registration/visa` is a secure, noindex, visa-only completion page linked from staff-triggered reminder emails. It works independently of normal registration opening dates, subject to the HR-managed correction deadline.

Deploy alongside the HR `/api/v1/rec/visa` APIs and additive `rec_visa_*` schema. Keep `HR_PORTAL_BASE_URL=https://hr.nrep.ug` and `NEXT_PUBLIC_SITE_URL=https://rec.nrep.ug`. No new public-site environment variables are required. HR uses its existing `REC_PUBLIC_SITE_URL` for links.

The link invitation is in a URL fragment and is exchanged for an email OTP. The same-origin `/api/visa/[action]` proxy stores successful verification in an HttpOnly, SameSite=Strict cookie scoped to `/api/visa`; it does not expose the session token to browser JavaScript. The server rechecks source identity and eligibility on every save. No passport is sent by email, in query parameters, or in the badge QR payload.

Normal submissions now require a passport when visa support is requested. Blank days for new attendee registration default to all configured days; omitted days in an existing current-conference edit preserve the saved selection. Exhibitor applications collect passport numbers separately for each representative. Drafts and HR imports may defer passport completion.

Run `npm test` and `npm run build` before deployment. Use the HR service's mocked email transport for automated reminder/OTP tests; do not send test reminders to real registrants.
