# estifanos.sh

Source for [estifanos.com](https://estifanos.com) and
[estifanos.sh](https://estifanos.sh).

- `estifanos.com` is the primary company landing page.
- `estifanos.sh` is the project directory and serves project documentation at
  `/convex-auth/` and `/convex-embedded/`.

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

The documentation build artifacts are copied from the sibling
`../convex-auth/docs/build` and `../convex-embedded/docs/build` directories.

```sh
vp run build
vp run check
vp run test
```

## Deployment

```sh
vp run deploy
```

This deploys the minimal Convex static-hosting backend, prerenders the Solid
application, syncs both documentation sites, and uploads `dist/client` to the
production deployment.
