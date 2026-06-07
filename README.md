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

The section dashboards fetch live data at build time when credentials are
available. If credentials are missing or an API request fails, the build falls
back to committed data in `_data`.

- Active: Strava via `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, and `STRAVA_REFRESH_TOKEN`
- Books: Hardcover via `HARDCOVER_API_TOKEN`
- Music: Spotify via `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and optional `SPOTIFY_USER_ID`
- Bucket List: `_data/bucket-list.json`

Set `RENDER_DEPLOY_HOOK_URL` as a GitHub Actions secret to let
`.github/workflows/refresh-site.yml` trigger scheduled Render rebuilds.

Verify generated pages:

```sh
npm run verify
```
