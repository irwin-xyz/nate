# Agent Instructions

## Project Overview

This is Nate Irwin's personal website. It is a static Astro site that preserves
the existing lightweight personal-site structure while using local data exports
for the dashboard pages.

Primary source directories:

- `src/pages/`: Astro routes.
- `src/components/`: shared Astro components.
- `src/lib/`: build-time data loading and formatting helpers.
- `src/data/`: committed dashboard data exports.
- `public/`: static assets copied directly into the generated site.

Generated and local-only files:

- `_site/` is generated output and must not be committed.
- `.astro/` and `node_modules/` are local build/dependency artifacts.
- `.env` is local only and must not be committed.

## Deployment

This site deploys from `main` through Render. Do not use `gh-pages`, do not push
generated files to a deploy branch, and do not treat GitHub Pages as the hosting
target.

Render reads `render.yaml`:

- Build command: `npm run build`
- Static publish path: `./_site`
- Branch: `main`
- Auto deploy: enabled

The normal deploy flow is:

```sh
npm run verify
git add -A
git commit -m "Describe the change"
git push origin main
```

`_site/` is generated build output and is ignored by Git.

## Local Development

The site is built with Astro.

```sh
npm run build
npm run serve
```

Use `npm run verify` before committing changes. It builds the site and verifies
the generated internal pages.

When working on frontend changes, keep the site static and simple. Prefer Astro
components, plain CSS, and existing tokens/styles over adding client-side
JavaScript or framework dependencies. Do not redesign the site unless explicitly
asked; keep changes scoped to the request.

## Data Sources

- Active uses committed HealthFit data in `src/data/healthfit-workouts.csv`.
- Books uses committed Goodreads CSV data in `src/data/goodreads-books.csv`.
- Music loads Spotify at build time when credentials are available.

The sample environment file is `.env.example`. The real `.env` file is local and
must not be committed.

For data updates:

- Goodreads: export from `https://www.goodreads.com/review/import` and replace
  `src/data/goodreads-books.csv`.
- HealthFit: run `npm run export:healthfit` after setting `HEALTHFIT_EXPORT_DIR`
  or passing the source folder.
- Spotify: requires `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and optional
  `SPOTIFY_USER_ID` during the build.

## Git Hygiene

Respect existing uncommitted changes. Before editing, check `git status --short`
and avoid overwriting work from another agent or the user.

Commit source files and committed data exports only. Do not commit `_site/`,
`.env`, dependency folders, caches, or one-off downloaded files outside the repo.

If the repository reports that it moved, pushes may still succeed through the old
remote URL, but the canonical GitHub repo is `https://github.com/irwin-xyz/nate`.
