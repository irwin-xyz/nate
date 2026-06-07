# nate.irwin.xyz

Personal website for Nate Irwin.

## Development

Build the site:

```sh
npm run build
```

Serve the generated site locally:

```sh
npm run serve
```

The build script has no package dependencies. It writes the static site to `_site`.

Render is still configured with the legacy `bundle exec jekyll build` command.
The local `jekyll` gem in this repo is a compatibility shim that delegates that
command to `npm run build`.

## Live dashboard data

The section dashboards fetch live data at build time when credentials or local
exports are available. The build also reads a local `.env` file, which is
ignored by Git. If credentials are missing or an API request fails, the build
falls back to committed data in `_data`.

- Active: HealthFit GPX files via `HEALTHFIT_EXPORT_DIR`, or HealthFit CSV/JSON via `HEALTHFIT_EXPORT_URL` or `HEALTHFIT_EXPORT_FILE`; Strava remains available via `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, and `STRAVA_REFRESH_TOKEN`
- Books: Goodreads via `GOODREADS_API_KEY` and optional `GOODREADS_USER_ID`; Hardcover remains available via optional `HARDCOVER_API_TOKEN`
- Music: Spotify via `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and optional `SPOTIFY_USER_ID`
- Bucket List: `_data/bucket-list.json`

Set `RENDER_DEPLOY_HOOK_URL` as a GitHub Actions secret to let
`.github/workflows/refresh-site.yml` trigger scheduled Render rebuilds.

Verify generated pages:

```sh
npm run verify
```

For local HealthFit files, point `HEALTHFIT_EXPORT_DIR` at the folder that
contains GPX exports, for example:

```sh
HEALTHFIT_EXPORT_DIR="$HOME/Library/Mobile Documents/icloud~com~altifondo~Healthfit/Documents"
```

Then generate the CSV consumed by the site:

```sh
npm run export:healthfit
```

The command writes `_data/healthfit-workouts.csv`. It reads FIT session metadata
for indoor and non-route workouts, merges GPX route-derived values where useful,
and appends the committed Strava fallback records in `_data/activities.json` for
dates before the first HealthFit workout. Commit the CSV when you want Render to
deploy updated activity data. You can also save a JSON export as
`_data/healthfit-workouts.json`.

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
