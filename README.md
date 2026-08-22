# estifanos.sh

Source for [estifanos.com](https://estifanos.com) and
[estifanos.sh](https://estifanos.sh).

- `estifanos.com` is the primary company landing page.
- `estifanos.sh` is the project directory and serves project documentation at
  `/convex-auth/` and `/convex-embedded/`.

Both landing pages are static HTML and CSS. The HTTP handler selects the
appropriate document for each hostname, so the landing output has no
framework or hostname-switching client JavaScript.

## Tooling

- [Astro](https://astro.build/) for static product documentation (without
  Starlight)
- [Vite+](https://viteplus.dev/) and pnpm
- [Convex static hosting](https://github.com/get-convex/static-hosting)

## Development

```sh
vp install
vp dev
```

Keep sibling checkouts of `convex-auth` and `convex-embedded`, then build the
complete site from this repository:

```sh
vp run build
vp run check
vp run test
```

The shared documentation application lives in `docs/`. Each product repository
contributes only `docs/docs.json`, clean `docs/content/**/*.md`, and optional
static assets. Each Markdown file is named after its slug (for example,
`api/request.md`), and frontmatter is the sole source of its title and
description. `vp run build` rejects `+page.md`, Svelte or script markup,
custom MDX components, and Markdown H1 titles. It validates both contracts, renders both sites,
generates Pagefind and the `llms` files, and assembles `/convex-auth/` and
`/convex-embedded/` into the ignored `dist/client` deployment artifact.
`config/docs.json` is the allowlist of source repositories, refs, local paths,
and public mount paths.

## Deployment

The **Production deployment** GitHub Actions workflow is the only production
deployment owner. It builds each product's docs in an isolated matrix job,
records the resolved commit in the artifact, assembles one namespaced static
site, validates every required file, deploys the Convex HTTP backend, and then
atomically uploads the complete artifact to static hosting.

Production releases are started explicitly from this repository by running the
workflow with refs for either project; omitted refs use the defaults in
`config/docs.json`. Merging framework or content changes cannot implicitly
replace the shared static-hosting manifest. The deploy summary and
`/.well-known/docs-release.json` record the exact source commits that went live.
`vp run deploy` remains available for deliberate local recovery deployments and
rebuilds both sibling content repositories first.

Product repositories must not upload to this static-hosting component or deploy
backend code to this production deployment. Demos that need their own Convex
backend belong in separate Convex projects with separate deploy keys.

The landing repository's existing `production` environment is the only place
that stores `CONVEX_DEPLOY_KEY` for the estifanos.sh deployment. Product
repositories need no landing-site token, deploy key, or additional GitHub
environment. Their small documentation workflows call the reusable validation
workflow in this repository without passing secrets. The landing workflow
rebuilds every project in isolation and publishes the complete site under one
serialized deployment lock.
