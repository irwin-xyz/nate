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
