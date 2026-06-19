# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Personal portfolio and journal site for Robel Estifanos ([robelestifanos.com](https://robelestifanos.com)), built with SvelteKit 2, Svelte 5, TypeScript, and Tailwind CSS v4. The site is statically generated (SSG) at build time and hosted via Convex static hosting.

## Development Commands

- `vp dev` - Start SvelteKit dev server. **Do not run this — it's handled manually by another process.**
- `vp run dev:convex` - Start Convex dev backend
- `vp build` - Build static site to `build/`
- `vp check` - Run format, lint, and type checks
- `vp test` - Run tests
- `vp run sync` - Sync journal markdown files to Convex dev
- `vp run sync:prod` - Sync journal markdown files to Convex production
- `vp run deploy:dev` - Build and upload to Convex dev (`giddy-koala-536.convex.site`)
- `vp run deploy` - Build and upload to Convex production (`quick-okapi-750.convex.site`)
- `vp run deploy:convex` - Deploy Convex backend functions to production

## Architecture

### Stack

- **Framework**: SvelteKit 2 with `@sveltejs/adapter-static` (pure SSG, no runtime server)
- **UI**: Svelte 5 with runes (`$state`, `$derived`, `$effect`, `$props`)
- **Styling**: Tailwind CSS v4 with `@tailwindcss/vite` plugin
- **Backend**: Convex (database, queries, file storage)
- **Reactivity**: `convex-svelte` for client-side reactive queries after hydration
- **Hosting**: Convex static hosting (`@convex-dev/static-hosting`) — static files uploaded to Convex storage and served via `convex/http.ts`
- **Content**: Journal entries stored as markdown in `journal/`, synced to Convex via `scripts/sync.ts`

### Project Structure

- `src/` - SvelteKit application source
  - `app.css` - Global styles with Tailwind v4 imports and Rose Pine theme CSS variables
  - `app.html` - Document shell template
  - `app.d.ts` - SvelteKit type declarations
  - `lib/` - Shared library code
    - `components/` - Svelte components (Header, Footer, UpdateBanner, StarHeader, etc.)
    - `utils.ts` - General utility functions
    - `utils/date.ts` - Date formatting
    - `utils/markdown.ts` - Marked + KaTeX markdown renderer
  - `routes/` - SvelteKit file-based routes
    - `+layout.js` - Root layout config (`export const prerender = true`)
    - `+layout.svelte` - Root layout with Convex setup and UpdateBanner
    - `+page.svelte` - Home page
    - `journal/+page.svelte` - Journal list with tag filtering
    - `journal/[slug]/+page.svelte` - Journal entry detail with TOC and mermaid diagrams
- `convex/` - Convex backend
  - `http.ts` - HTTP handler serving static files with path resolution (exact -> /path/index.html -> /path.html -> 404)
  - `schema.ts` - Database schema
  - `journal.ts` - Journal query functions (list, getBySlug, listSlugs)
  - `staticHosting.ts` - Self-hosting deployment tracking
    - `convex.config.ts` - Convex config with static hosting component
- `static/` - Static assets (favicons, images, robots.txt)
- `journal/` - Markdown source files for journal entries
- `scripts/sync.ts` - Script to sync journal markdown to Convex database

### Data Flow

1. **Build time**: `+page.server.ts` files use `ConvexHttpClient` to fetch data from Convex and bake it into static HTML
2. **Client-side**: After hydration, `convex-svelte`'s `useQuery` takes over with reactive subscriptions for live updates
3. **Deploy**: `vp build` prerenders all pages to `build/`, then `@convex-dev/static-hosting upload` pushes files to Convex storage

### Design System

**Rose Pine Theme** (CSS custom properties in `src/app.css`):

- `--color-th-base` - Background
- `--color-th-surface` - Surface/card backgrounds
- `--color-th-border` - Borders
- `--color-th-muted` - Muted/secondary text
- `--color-th-subtle` - Subtle text
- `--color-th-text` - Primary text
- `--color-th-accent` - Accent color
- `--color-th-accent-hover` - Accent hover state

Font: Newsreader / Crimson Pro via `var(--font-display)`.

### Deployments

- **Dev**: `giddy-koala-536.convex.site` (Convex URL: `giddy-koala-536.convex.cloud`)
- **Prod**: `quick-okapi-750.convex.site` (Convex URL: `gallant-squirrel-294.convex.cloud`)

## Development Guidelines

- Use `vp` for package management, runtime execution, and frontend tooling
- Maintain the Rose Pine color scheme using `th-*` CSS custom properties
- Use Svelte 5 runes syntax (`$state`, `$derived`, `$effect`, `$props`) — not legacy `let`/`export let`
- Keep the editorial/minimalist aesthetic with Ethiopian heritage influences
- Static assets go in `static/`, not `public/`
- When adding new routes, they are automatically prerendered (root layout sets `prerender = true`)
- Dynamic routes (like `[slug]`) need an `entries()` export in their `+page.server.ts` to enumerate all values at build time
- The upload tool is slow (~2 `convex run` calls per file). Run upload separately from `vp build` if the combined deploy script times out.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
