# estifanos.sh

Source for [estifanos.com](https://estifanos.com) and
[estifanos.sh](https://estifanos.sh).

- `estifanos.com` is the primary company landing page.
- `estifanos.sh` is the project directory and serves project documentation at
  `/convex-auth/`.

Both domains use the same TanStack Start and Solid application. Hostname-aware
client routing selects the appropriate landing view. The interactive canvas is
entirely local to the browser: it has no database, shared state, or history.

## Tooling

- [TanStack Start](https://tanstack.com/start/latest/docs/framework/solid/overview)
  with [Solid](https://www.solidjs.com/)
- [Vite+](https://viteplus.dev/) and pnpm
- [Convex static hosting](https://github.com/get-convex/static-hosting)

## Development

```sh
vp install
vp dev
```

Build the Convex Auth documentation before assembling the complete site:

```sh
cd ../convex-auth
vp run build:docs
cd ../robelest
vp run build
vp run check
vp run test
```

`vp run build` assembles the generated documentation under `/convex-auth/` in
the ignored `dist/client` deployment artifact. Set `CONVEX_AUTH_DOCS_DIR` to
use a source outside the default sibling checkout.

## Deployment

The **Production deployment** GitHub Actions workflow is the only production
deployment owner. It checks out both repositories at explicit revisions,
builds them, assembles one immutable static artifact, deploys the Convex HTTP
backend, and uploads the artifact to static hosting.

Pushes to this repository deploy automatically. Convex Auth documentation
changes request the same workflow through a repository dispatch. `vp run
deploy` remains available for deliberate local recovery deployments.
