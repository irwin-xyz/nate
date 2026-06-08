# nate.irwin.xyz

Personal website for Nate Irwin.

## Design

The site follows the **Field Notes** brand — a cartographic, topographic field-guide
system. The full guidelines (concept, palette, typography, motifs, voice) live in
[`BRAND.md`](./BRAND.md). Design tokens are in `public/assets/css/tokens.css`; components
and layout in `public/assets/css/site.css`. Type is self-hosted Fraunces (display) +
Inter (body) via `@fontsource-variable`. Light is the default theme; dark is available via
the header toggle and follows the OS preference when no choice has been made.

## Development

Build the site:

```sh
npm run build
```

Serve the generated site locally:

```sh
npm run serve
```

The site is built with Astro and writes static output to `_site`.

## Live dashboard data

The section dashboards fetch live data at build time when credentials or local
exports are available. The build also reads a local `.env` file, which is
ignored by Git. If credentials are missing or an API request fails, the build
falls back to committed data in `src/data`.

- Active: committed HealthFit CSV data in `src/data/healthfit-workouts.csv`, or CSV/JSON via `HEALTHFIT_EXPORT_URL` or `HEALTHFIT_EXPORT_FILE`
- Books: Goodreads CSV export at `src/data/goodreads-books.csv`, or another path via `GOODREADS_EXPORT_FILE`
- Music: Spotify via `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and optional `SPOTIFY_USER_ID`
- Bucket List: `src/data/bucket-list.json`

Set `RENDER_DEPLOY_HOOK_URL` as a GitHub Actions secret to let
`.github/workflows/refresh-site.yml` trigger scheduled Render rebuilds.

Verify generated pages:

```sh
npm run verify
```

## Goodreads books export

Goodreads no longer reliably supports its deprecated API, so the Books page
prefers a manual Goodreads library CSV export.

To update the Books page:

1. Open Goodreads on desktop.
2. Go to **My Books**.
3. Click **Import and export** in the left sidebar.
4. Click **Export Library**.
5. Download the generated CSV.
6. Save it in this repo as `src/data/goodreads-books.csv`.
7. Run `npm run verify`.
8. Commit the CSV when you want Render to deploy updated book data.

If you want to keep the export somewhere else locally, set
`GOODREADS_EXPORT_FILE` in `.env` to that path. Render only sees committed files
and configured environment variables, so commit `src/data/goodreads-books.csv`
for deploys unless you provide another accessible export path during the build.

For local HealthFit files, point `HEALTHFIT_EXPORT_DIR` at the folder that
contains GPX exports, for example:

```sh
HEALTHFIT_EXPORT_DIR="$HOME/Library/Mobile Documents/icloud~com~altifondo~Healthfit/Documents"
```

Then generate the CSV consumed by the site:

```sh
npm run export:healthfit
```

The command writes `src/data/healthfit-workouts.csv`. It reads FIT session metadata
for indoor and non-route workouts, merges GPX route-derived values where useful,
and appends the committed Strava fallback records in `src/data/activities.json` for
dates before the first HealthFit workout. Commit the CSV when you want Render to
deploy updated activity data. You can also save a JSON export as
`src/data/healthfit-workouts.json`.

To convert HealthFit FIT files that do not already have matching GPX files,
install GPSBabel and run the converter:

```sh
brew install gpsbabel
npm run convert:healthfit -- --dry-run
npm run convert:healthfit
npm run export:healthfit
```

The converter writes missing `.gpx` files next to the `.fit` files by default.
FIT files without GPS track points, such as many indoor workouts, may fail or
produce no useful GPX file.
