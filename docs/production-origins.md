# Production URL Configuration

Set these variables before building/deploying:

```env
NEXT_PUBLIC_SITE_URL=https://rec.nrep.ug
HR_PORTAL_BASE_URL=https://hr.nrep.ug
```

The HR portal also uses `NEXT_PUBLIC_APP_URL=https://hr.nrep.ug` in its own deployment.

Exhibitor, scanner and excursion browser requests are checked against the REC site's canonical URL in production. This supports HTTPS reverse proxies whose internal Next.js request URL is HTTP or uses a container hostname. Set the external public URL, not the internal address; rebuild when changing a `NEXT_PUBLIC_` value. These URLs default to the production domains if unset; preview deployments must set their own canonical site URL.

Local development additionally accepts the exact request URL origin. Foreign origins remain blocked; do not enable wildcard CORS or trust arbitrary forwarded host headers to bypass origin checks. The public site's server-to-server calls to HR continue to use `HR_PORTAL_BASE_URL`.

The exhibitor and scanner browser proxies require Origin for mutations. The excursion telemetry endpoint retains its existing support for requests without an Origin header. All three reject explicit foreign/opaque origins and cross-site Fetch Metadata. Server-to-server HR bearer-token endpoints are separate and unchanged.

This follows [OWASP's configured target-origin guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#identifying-the-target-origin).
