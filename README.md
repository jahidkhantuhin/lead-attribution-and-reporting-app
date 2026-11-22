# lead-attribution-and-reporting-app

A lead attribution dashboard for marketing and account teams to see where leads come from and compare performance across clients and locations.

## Showcase overview

![Animated tour of the lead dashboard, record inspectors, and reports](docs/media/foundation-overview.gif)

Start with the lead-source dashboard, then open a client record to see its locations and staff.

## Key features

- Break down leads by source and inspect individual leads in the Lead Details Report.
- Compare client and website performance using the Client Overview, KPI, and Statistics reports.
- View and manage client, location, staff, site, and user records from the same workspace.
- Generate a Payment Report for a call scorer and date range.

## Tech stack

| Area | Technologies |
| --- | --- |
| Frontend | Nuxt 2, Vue 2, TypeScript, Vuetify, Vuex |
| Data and charts | Axios, ApexCharts |
| Connected backend | External API using Laravel Sanctum and a Google OAuth authorization-code flow |
| Showcase and build | In-browser fixtures, Webpack 4, Nuxt static generation |
| Code quality | ESLint, Stylelint, Jest |

## Architecture overview

Nuxt pages and Vuetify components use shared services and Vuex for records and reports. Those services make Axios requests. In showcase mode, the requests go to the local adapter. In connected mode, they go to the configured API.

- [Showcase plugin](plugins/showcase.ts) installs a synthetic session and attaches the adapter to shared Axios requests.
- [Showcase API](showcase/api.ts) handles lookups, pagination, filters, and simulated mutations using [fixtures](showcase/fixtures.ts) and [report payloads](showcase/reports.ts).
- [Nuxt configuration](nuxt.config.js) selects the mode and includes seeded nested routes in static showcase builds.

## Engineering decisions

- **Use an Axios adapter for the showcase.** The same UI and service paths consume API-shaped responses in both modes. This keeps the demo usable without a backend and lets it exercise the real report filters and record forms.
- **Keep demo changes in memory.** The local adapter resets supported record changes and the synthetic session on refresh. This makes each fresh visit start from the same fixtures.
- **Delegate connected auth and persistence to the backend.** Nuxt Auth handles frontend session integration. The external API owns session validation, authorization, and durable writes. The repository contains the frontend only.

## Getting started

Use Node.js 22 and npm. From the repository root in PowerShell, run:

```powershell
npm ci --legacy-peer-deps
$env:SHOWCASE_MODE = 'true'
$env:NODE_OPTIONS = '--openssl-legacy-provider'
npx --no-install nuxt-ts dev
```

Open `http://localhost:3000`. The showcase is enabled by default. In Bash, use `SHOWCASE_MODE=true NODE_OPTIONS=--openssl-legacy-provider npx --no-install nuxt-ts dev`. The OpenSSL option supports this repository’s Webpack 4 toolchain on modern Node versions.

These commands invoke the installed Nuxt CLI directly. The `dev`, `build-*`, and `generate-*` scripts in [package.json](package.json) run Yarn before invoking Nuxt, even when launched through npm. For a static showcase, run `npx --no-install nuxt-ts generate` with the same environment settings and serve `dist/`.

### Connect the original backend

[.env.example](.env.example) lists the environment names. Set the base URL for your environment before starting or building. This example uses the development API.

```powershell
$env:SHOWCASE_MODE = 'false'
$env:BASE_URL_DEVELOPMENT = 'http://localhost:8000/api/v1'
$env:NODE_OPTIONS = '--openssl-legacy-provider'
npx --no-install nuxt-ts dev
```

Use `BASE_URL_STAGING` or `BASE_URL_PRODUCTION` for the corresponding environment selected by the build command. Return to the showcase by setting `SHOWCASE_MODE=true` or removing the override, then restarting or rebuilding.

For Google sign-in, configure the Google OAuth client ID in the Nuxt auth strategy and register the exact frontend `/social-login` callback for each environment in that OAuth client. The development callback is `http://localhost:3000/social-login`. Replace the existing staging and production callbacks if you deploy under different hostnames. The backend must support the configured `/social-login` code exchange and the user lookup endpoint. Keep any OAuth client secret on that backend.

## Walk through the app

1. Open `/` to see the lead-source chart and summary.
2. Open `/client-records/1` to explore Cedar Dental Studio, then follow its links to Cedar Downtown or Riley Chen.
3. Open `/reports/lead-details-report` to inspect lead summaries and individual records.

In showcase mode, **Client Overview, Lead Details Report, KPI, Statistics, and Payment Report** initialize with demo filters and load results. The Reports index itself is a navigation page. To run the Payment Report again manually, open `/reports/payment-report`, select **Taylor Reed** under **Call scorer**, choose **Last 14 days**, and click **Apply**.

<details>
<summary>Route reference</summary>

| Area | Routes |
| --- | --- |
| Dashboard | `/` |
| Reports | `/reports`, `/reports/client-overview`, `/reports/lead-details-report`, `/reports/kpi`, `/reports/statistics`, `/reports/payment-report` |
| Client records | `/client-records`, `/client-records/add`, `/client-records/1`, `/client-records/1/edit` |
| Client locations and staff | `/client-records/1/locations/1`, `/client-records/1/staff/1` |
| Location administration | `/all-locations`, `/location-settings`, `/location-settings/add?id=5&name=Riverfront%20Intake` |
| Site records | `/site-records`, `/site-records/1` |
| Users and profile | `/users`, `/users/add`, `/users/2/edit`, `/profile` |
| VPN setup | `/vpn-setup` |
| Authentication | `/login`, `/social-login`, `/reset-password` |
| Other routes | `/data-mining` redirects to Statistics. `/search` is a placeholder. `/404` displays the error page. |

</details>

## Quality baseline

```bash
npm run lint:js
npm run lint:style
npm test -- --runInBand --coverage=false
```

The combined `npm run lint` script delegates to Yarn. The duration-formatting suite passes locally (4 cases). ESLint and Stylelint pass locally through `npm run lint`. The [Quality checks workflow](.github/workflows/quality.yml) runs both linters and Jest on pushes and pull requests.

### Pre-push hook

After installing dependencies, enable the repository's hook once per clone.

```bash
git config --local core.hooksPath .githooks
```

The hook runs both linters and Jest before a push. Any failed check blocks the push. GitHub Actions runs the same checks independently.

## Known limitations

- The showcase uses synthetic records and report values. It simulates sign-in, sign-out, and password recovery without changing access to the demo.
- Supported client, location, staff, and user edits reset on refresh.
- Call playback uses no external recordings. Report upload returns a local placeholder.
- VPN setup uses documentation-only IP addresses and makes no changes to a server.
- Connected mode requires a compatible external API. Search is still a placeholder.

## License

This project is licensed under the [MIT License](LICENSE).

## Author

**Jahid Khan Tuhin** · Full-stack JavaScript engineer

[LinkedIn](https://www.linkedin.com/in/jahidkhantuhin/)
