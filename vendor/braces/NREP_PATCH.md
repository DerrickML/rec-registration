# NREP Bounded-Depth Patch

This is the private, locally maintained `@nrep/braces` 3.0.3-nrep.1 package,
not an official upstream release. It retains the MIT-licensed implementation,
copyright notices and README from `braces` 3.0.3. Its upstream registry archive
integrity is recorded in `package.json`.

The targeted issue is GHSA-vfj7-8cjw-p6xm / CVE-2026-93687:
https://github.com/advisories/GHSA-vfj7-8cjw-p6xm

Changes relative to upstream:

- Add `lib/check-depth.js`, limiting structural depth to 128.
- Check parser stack depth before opening braces or parentheses, including
  malformed/unclosed patterns that could otherwise reach recursive cleanup.
- Check each recursive compile, expand and stringify traversal. Direct AST
  inputs therefore receive the same protection as parsed strings.
- Excess depth throws a catchable `RangeError` with code
  `ERR_BRACES_MAX_DEPTH`, rather than exhausting the JavaScript call stack.
- Preserve the previous parent argument behavior in stringify. Ordinary glob
  syntax, option behavior, input-length limits and range limits are unchanged.
- Use a private NREP package name/version, remove unused upstream development
  scripts/dependencies, and pin the existing runtime dependency `fill-range`.

Only the four traversal/parser files, this notice, package metadata and the new
depth guard differ. `index.js`, constants, utilities, README and LICENSE retain
their original upstream content. This is not a general defense against every
expensive regular expression or combinatorial expansion: do not expose arbitrary
glob expressions to untrusted users.

Both portals install the checked-in local archive through an explicit root
`braces` dependency and an override. No audit advisory is suppressed and no
upstream version number is fabricated. A clean audit alone is not evidence that
this private fork is secure; the nesting, API and dependency-resolution tests
are required checks. The application team owns this patch until it is replaced
with a reviewed upstream fix or a separately tested tooling migration.

To change this package, edit the readable source, bump its private version,
run `npm pack --ignore-scripts --pack-destination ..` inside this directory,
update both repositories' dependency/archive paths and lockfiles, then run tests,
lint, production builds and audits. Keep the copies byte-identical. Do not edit
only the archive or only `node_modules`.
