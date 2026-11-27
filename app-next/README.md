# LeadLens migration scaffold

Run these commands from `app-next/` using Node 22.22.3 or newer in the Node
22 line, Node 24.15.0 or newer in the Node 24 line, or Node 26+.

```sh
npm ci
npm run dev -- --port 3001
```

Open http://localhost:3001. The legacy app continues to run from its own root.
The scaffold currently renders a single page. Reports, authentication, and the
external API client will be ported in later phases.

```sh
npm run lint
npm run format:check
npm run typecheck
npm run generate
```

Static output is written to `.output/public/`. Serve that directory with a local
static host to preview it.

For local configuration, copy `.env.example` to `.env` in this directory.
`SHOWCASE_MODE` defaults to enabled unless explicitly set to `false`. Connected
mode uses `BASE_URL_DEVELOPMENT`, `BASE_URL_STAGING`, or `BASE_URL_PRODUCTION`
according to `NODE_ENV`. Regenerate the static output after changing these
values. Only the selected API base URL and showcase flag are exposed to the
client.
