# estifanos-sh

This repository builds the static `estifanos.com` and `estifanos.sh` landing
pages plus Astro-rendered product documentation for Convex Embedded. Static
output is uploaded through the Convex static-hosting
component and served by `convex/http.ts`.

## Commands

- `vp install` installs workspace dependencies.
- `vp run check` formats, lints, and type-checks the repository.
- `vp run test` runs the test suite.
- `vp run build` builds both product documentation sites, Pagefind indexes,
  release metadata, and the Astro landing pages.
- `vp run dev:convex` starts the Convex development backend.

Vite+ is the workspace task and package-management surface. Landing and
documentation rendering use Astro's static build command through Vite+ tasks.

## Architecture

- `src/pages/` contains zero-client-JavaScript Astro landing pages.
- `docs/` is the custom Astro documentation engine; it deliberately does not
  use Starlight.
- Product repositories provide `docs/docs.json` and clean
  `docs/content/**/*.md` content. The engine validates and assembles their
  output under `/convex-embedded/`.
- `convex/http.ts` resolves static files, directory URLs, scoped product 404s,
  and the hostname-selected engineering landing page.

## Convex

Before changing Convex code, read `convex/_generated/ai/guidelines.md`. It
contains repository-specific requirements for Convex APIs and patterns.
