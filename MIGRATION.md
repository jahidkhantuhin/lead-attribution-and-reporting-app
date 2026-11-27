# LeadLens migration

## Phase 0 — Discovery

Branch `migrate/nuxt4-vue3`. This checkpoint changes only this document. The legacy app remains at the repository root. The target configuration is `TEST_RUNNER=vitest` and `TARGET_TS=6`.

### Runtime and target versions

Node on the discovery machine is 26.13.0 with npm 12.2.1. The published Nuxt 4.7.0 engine is `^22.22.3 || ^24.15.0 || >=26.0.0`; its CLI dependency is `^4.1.0`. CLI 4.1.0 declares `^22.21.0 || ^24.11.0 || >=26.0.0`. The installed Node satisfies both. Keep CI on a compatible Node 22 patch at cutover, with an exact patch confirmed and pinned at that checkpoint.

| Area | Legacy | Target checked via npm registry |
| --- | --- | --- |
| Nuxt and CLI | Nuxt 2.15.2, CLI 2.15.2, Webpack 4 | Nuxt 4.7.0, CLI 4.1.0, native Nuxt build configuration |
| Vue | Vue 2.6.12 | Vue 3.5.46 |
| UI | Vuetify 2.4.5 through `@nuxtjs/vuetify` | Vuetify 4.3.5, Vite plugin 2.1.3 candidate |
| State | Vuex 3.6.2 via Nuxt | Pinia 4.1.0 and `@pinia/nuxt` 1.0.3 |
| HTTP | `@nuxtjs/axios` 5.13.6 with Axios 0.21.4 | Axios 1.21.1 with typed injection and adapter |
| Charts | ApexCharts 3.39.0 and `vue-apexcharts` 1.6.2 | ApexCharts 8.9.2 and `vue3-apexcharts` 1.11.3, subject to render parity and license review |
| TypeScript | 4.2.3, resolved through tooling | 6.0.3 selected. Registry latest is 7.0.2 |
| Testing | Jest 26.6.3, Babel Jest, ts-jest and vue-jest | Vitest 5.1.2 candidate and Vue Test Utils 2.6.0 when needed |

Vuetify declares Vue 3.5 compatibility. The Nuxt-specific Vuetify module's latest tag returned a release candidate, so the stable Vite integration is the candidate to evaluate. The chart wrapper accepts Vue 3 and ApexCharts 5.10 or newer. Vitest 5 declares Vite 6.4, 7, or 8 peers. Inspect Nuxt's resolved builder versions before pinning scaffold dependencies.

### Current app

- `nuxt.config.js` configures a client-rendered static app, English localization, Vuetify and local MDI, enabled plugins `usPhone`, `truncateText` and conditional `showcase`, a wildcard 404, and 34 explicit seed paths. Showcase uses the shared Axios client with an in-memory adapter. Connected mode uses an external API and loads Auth Next conditionally.
- `middleware/isAuthenticated.js` checks the Vuex getter and redirects to login. The return-home middleware currently has a commented redirect. Preserve actual behavior in characterization tests.
- `store/index.ts` holds app shell state, including titles and breadcrumbs. `store/users.ts` contains user and role/permission getters and CRUD actions delegated to `traits/crudStore.ts`.
- The layouts are `default.vue` (sidebar, app bar, session and logout UI), `blank.vue` (auth shell), and `error.vue`. Most Vue files use the Nuxt Composition API shim and `defineComponent`; the scan found no class-style declarations or repository-local mixins. Vue 2 filters exist in `plugins/usPhone.ts`, `truncateText.ts`, `callAudio.ts`, and `callStatus.ts`. Port active call sites to functions or composables. Review the unregistered filters and `vue-moment.ts` before removal.
- Environment inputs are `SHOWCASE_MODE`, `BASE_URL_DEVELOPMENT`, `BASE_URL_STAGING`, `BASE_URL_PRODUCTION`, and the environment selection via `NODE_ENV`. The app exposes internal mode and API configuration to the client. Preserve the public names and selection rules without reading or copying local secrets. The tracked example contains placeholders for staging and production.
- Both npm and Yarn lockfiles are tracked. CI uses npm and its v1 lockfile. Dev, build, and generate scripts invoke Yarn before Nuxt. The direct Nuxt CLI avoids that implicit install. The three build scripts, three generation scripts, dev/start, both linters, combined lint, and Jest are the existing public commands. Preserve equivalent workflows at cutover and document the existing `build-dev` script's staging environment selection.

### Dependency decisions

| Disposition | Dependencies and reasoning |
| --- | --- |
| Replace framework integration | `nuxt`, `@nuxt/types`, `@nuxt/typescript-runtime`, `@nuxt/typescript-build`, `@nuxtjs/composition-api`, `@nuxtjs/vuetify`, `nuxt-i18n`, `vue-i18n`, `vue-i18n-composable`. Use Nuxt 4, native Vue composables, Vuetify 4, and a compatible Vue 3 i18n integration preserving English message keys. |
| Replace transport and auth | `@nuxtjs/axios` becomes an Axios 1 instance and adapter. Replace `@nuxtjs/auth-next` with a typed session integration after confirming the actual server contract. Remove inactive `@nuxtjs/auth` and `vue-social-auth` once their references and behavior are accounted for. |
| Replace visualization and UI adapters | Upgrade `apexcharts`; replace `vue-apexcharts` with `vue3-apexcharts`. Preserve chart series and formatter behavior. Audit `chart.js`, `vue3-chart-v2`, `vue-toast-notification`, and `vue-sweetalert2` against actual imports. Remove unused packages and use a Vue 3-compatible integration for active alerts. |
| Keep behavior and validate browser compatibility | `@mdi/font`, `animate.css`, `compressorjs`, `croppie`, `js-cookie`, `lodash`, `@types/lodash`, `moment`, `moment-range`, `moment-timezone`, and `slugify`. Verify bundle and compatibility before changing versions. |
| Remove obsolete wiring after import audit | `add`, `global`, `core-js`, `yarn`, `cross-env`, `@nuxtjs/dotenv`, `@nuxtjs/eslint-module` and `@nuxtjs/stylelint-module`. Preserve env behavior, supported browser behavior, and standalone lint checks. Keep a dependency if a live source path still needs it. |
| Replace build and test tooling | Update ESLint, Prettier, Stylelint, their Nuxt/Vue/config plugins, and the Babel parser with modern equivalents. Replace Jest, Babel Jest, ts-jest, and vue-jest with Vitest. Upgrade Vue Test Utils if component tests need it. Remove the Babel bridge only after its test/build use is gone. Preserve lint rules or record any equivalent replacements. |

### Automation parity

| Current check | Preserve or extend |
| --- | --- |
| `.github/workflows/quality.yml`, workflow **Quality checks**, job ID and check **quality**, push and pull_request, Ubuntu, Node 22, npm cache, read-only contents permission | Keep file, triggers, job ID and check name. Use the pinned Node version and npm lockfile. Retain all current checks and add strict typecheck and static generation. No artifact or deploy steps currently exist. Confirm remote required checks after pushing. |
| CI install `npm ci --legacy-peer-deps --ignore-scripts` | Keep frozen npm install. Drop legacy peer or lifecycle workarounds only when the new lockfile and build prove they can go. |
| CI and `.githooks/pre-push` run `npm run lint:js`, `npm run lint:style`, and `npm test -- --runInBand --coverage=false` independently with a shared failure flag | Keep JS/Vue and style lint checks, serial test coverage of the same logic, and failure propagation. Add compatible typecheck before push by cutover. Evaluate both roots at scaffold checkpoint. |
| Hook installed via local `core.hooksPath=.githooks`. No prepare script or other tracked hooks. Hook is tracked as mode 100644 | Preserve the plain hook, make it executable and document a safe install path in the automation phase. No pre-commit or commit-msg commands exist to replay. |
| `.eslintrc.js`, `stylelint.config.js`, `.prettierrc`, `.editorconfig` and build-integrated Stylelint | Carry forward JS/Vue, formatting, and CSS rules and file coverage. Existing JS lint targets JS/Vue. Add TS lint coverage without reducing existing coverage. |
| `jest.config.js`, `.babelrc`, `test/secondsToHHMMSS.spec.js` | Preserve all four cases. Jest defaults to Vue component/page coverage collection, while CI and hook explicitly disable coverage for their test run. There is no threshold. Preserve an equivalent coverage mode and keep the faster gate. |
| `tsconfig.json` enables strict and noEmit. No standalone typecheck script | Replay the installed compiler directly for the baseline. Add Nuxt/Vue-aware strict typecheck without reducing strictness. |

No Husky, lint-staged, commitlint, Lefthook, simple-git-hooks, Dependabot, Renovate, PR template, CODEOWNERS, Docker, Compose, nginx, Netlify, Vercel, Firebase, or other host-specific deployment files were found among tracked paths. Current deployment contract is static `dist/` and an external API. The production host and GitHub rules are outside the repository.

### Porting checklist and checkpoints

1. **Safety net.** Preserve `test/secondsToHHMMSS.spec.js`. Add fixture-based tests around KPI calculations, report filters and query mapping, authentication transitions, and Axios request/response contracts. Turn the route inventory below into the manual smoke checklist.
2. **Scaffold.** Create `app-next/` beside the legacy root. Configure strict TypeScript, ESLint, Prettier, runtime config and static generation. Verify both apps and report the minimal CI and hook adjustments.
3. **Foundation.** Port `plugins/useAxios.ts`, `plugins/showcase.ts`, each file under `services/`, `showcase/api.ts`, `showcase/fixtures.ts`, and `showcase/reports.ts`. Port both Vuex files and the CRUD trait to typed Pinia and update both route middleware files. Characterize `LoginForm.vue`, `PasswordResetModal.vue`, `LogOutModal.vue`, `SessionExpired.vue`, and `pages/social-login.vue` before implementing session behavior.
4. **UI.** Port layouts, shell parts, shared labels/types/navigation and theme assets first. Port dashboard, then `pages/reports/` with `components/KPI/`, `components/LDR/`, report-upload helpers, summary components, and `WorkspaceChart.vue`. Port directories, inspectors and nested client/location/staff pages with their corresponding forms. Port team/profile, location setup, VPN, auth and error routes. For each route file below, preserve path, query/defaults, permissions, table behavior, and screenshots. Compare small and large viewports against legacy. Move `static/` assets into `public/` and preserve URL paths.
5. **Tests.** Move every existing and characterization case to Vitest. Compare coverage behavior, aliases and transforms. Verify Vue Test Utils only if needed for ported component behavior.
6. **Types.** Apply TypeScript 6 and Vue-aware checking. Replace legacy shims, resolve ambient types, and fix product code types. No unchecked escape hatches.
7. **Cutover.** Move the validated scaffold to root, update package scripts and lockfile, Node pins, CI and hooks. Generate and serve `.output/public/`, smoke every route, and report dependency audit findings. Preserve a deployable known-good legacy revision before cutover.
8. **Documentation.** Complete decisions, version table, gap and rollout notes. Revise README and capture verified gate results. Review ApexCharts licensing under the intended organization and distribution model before production use.

### Open questions and risks

- Confirm the connected API's cookie/CSRF, OAuth code exchange, session expiry and renewal semantics before replacing Auth Next. No independent refresh endpoint is evident in the Nuxt config. Preserve observed behavior and avoid assuming the API supports bearer refresh. Keep API payloads and credential handling within the existing contract.
- Confirm the production static host, public base path, fallback handling, environment selection and callback URLs with the owner. Dynamic route fixtures and the wildcard 404 must work on direct navigation.
- Verify ApexCharts visual parity for axis labels, legends, responsive heights, and filters. The vendor lists a free Community tier below USD 2 million in qualifying financial resources and paid Commercial terms at or above that threshold. Redistribution and some configurable hosted-chart use can require OEM terms. Confirm which terms apply before upgrading ApexCharts for sale.
- Confirm which remote checks are required and compare a GitHub run after the next user push. Discovery runs the CI steps locally and makes no repository-settings changes.

### Official references

- [Nuxt migration](https://nuxt.com/docs/4.x/migration/overview) and [Vue 3 migration](https://v3-migration.vuejs.org/)
- [Vuetify upgrade guide](https://vuetifyjs.com/en/getting-started/releases-and-migrations/) and [Pinia from Vuex](https://pinia.vuejs.org/cookbook/migration-vuex.html)
- [Axios interceptors](https://axios.rest/pages/advanced/interceptors), [Vitest migration](https://vitest.dev/guide/migration/), and [TypeScript 6](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)
- [ApexCharts licensing](https://apexcharts.com/license/)

### Route-by-route porting inventory

| Legacy page | URL to preserve |
| --- | --- |
| `pages/404.vue` | `/404` |
| `pages/all-locations/index.vue` | `/all-locations` |
| `pages/client-records/_client_id/edit.vue` | `/client-records/:client_id/edit` |
| `pages/client-records/_client_id/index.vue` | `/client-records/:client_id` |
| `pages/client-records/_client_id/locations/_location_id/edit.vue` | `/client-records/:client_id/locations/:location_id/edit` |
| `pages/client-records/_client_id/locations/_location_id/index.vue` | `/client-records/:client_id/locations/:location_id` |
| `pages/client-records/_client_id/locations/add.vue` | `/client-records/:client_id/locations/add` |
| `pages/client-records/_client_id/staff/_staff_id/edit.vue` | `/client-records/:client_id/staff/:staff_id/edit` |
| `pages/client-records/_client_id/staff/_staff_id/index.vue` | `/client-records/:client_id/staff/:staff_id` |
| `pages/client-records/_client_id/staff/add.vue` | `/client-records/:client_id/staff/add` |
| `pages/client-records/add.vue` | `/client-records/add` |
| `pages/client-records/index.vue` | `/client-records` |
| `pages/data-mining.vue` | `/data-mining` |
| `pages/index.vue` | `/` |
| `pages/location-settings/add.vue` | `/location-settings/add` |
| `pages/location-settings/index.vue` | `/location-settings` |
| `pages/login.vue` | `/login` |
| `pages/profile.vue` | `/profile` |
| `pages/reports/client-overview.vue` | `/reports/client-overview` |
| `pages/reports/index.vue` | `/reports` |
| `pages/reports/kpi.vue` | `/reports/kpi` |
| `pages/reports/lead-details-report.vue` | `/reports/lead-details-report` |
| `pages/reports/payment-report.vue` | `/reports/payment-report` |
| `pages/reports/statistics.vue` | `/reports/statistics` |
| `pages/reset-password.vue` | `/reset-password` |
| `pages/search.vue` | `/search` |
| `pages/site-records/_site_id/index.vue` | `/site-records/:site_id` |
| `pages/site-records/index.vue` | `/site-records` |
| `pages/social-login.vue` | `/social-login` |
| `pages/users/_id/edit.vue` | `/users/:id/edit` |
| `pages/users/add.vue` | `/users/add` |
| `pages/users/index.vue` | `/users` |
| `pages/vpn-setup/index.vue` | `/vpn-setup` |
| Wildcard configured in `nuxt.config.js` | Unknown paths use the 404 view. |

### Supporting source checklist

Each entry names the legacy file to review. Checked items will be recorded in their implementation phase.

#### Foundation and shell

- [ ] `assets/notification-style-fix.css`
- [ ] `assets/variables.css`
- [ ] `assets/variables.scss`
- [ ] `assets/workspace.css`
- [ ] `lang/en-US.js`
- [ ] `layouts/blank.vue`
- [ ] `layouts/default.vue`
- [ ] `layouts/error.vue`
- [ ] `middleware/isAuthenticated.js`
- [ ] `middleware/redirectToHomeIfAlreadyLoggedIn.js`
- [ ] `nuxt.config.js`
- [ ] `plugins/callAudio.ts`
- [ ] `plugins/callStatus.ts`
- [ ] `plugins/showcase.ts`
- [ ] `plugins/truncateText.ts`
- [ ] `plugins/usPhone.ts`
- [ ] `plugins/useAxios.ts`
- [ ] `plugins/vue-moment.ts`
- [ ] `services/useApi.ts`
- [ ] `services/useClientLocations.ts`
- [ ] `services/useClientRecords.ts`
- [ ] `services/useClientStaff.ts`
- [ ] `services/useKPI.ts`
- [ ] `services/useLocationRecords.ts`
- [ ] `services/useSiteRecords.ts`
- [ ] `services/useUsers.ts`
- [ ] `shared/AppbarItems.ts`
- [ ] `shared/PageNames.ts`
- [ ] `shared/SidebarItems.ts`
- [ ] `shared/Types.ts`
- [ ] `shared/ValidateStrongPassword.ts`
- [ ] `shared/VuetifyColorsPallete.ts`
- [ ] `shared/callColors.ts`
- [ ] `showcase/api.ts`
- [ ] `showcase/fixtures.ts`
- [ ] `showcase/reports.ts`
- [ ] `store/index.ts`
- [ ] `store/users.ts`
- [ ] `traits/crudStore.ts`

#### UI and report logic

- [ ] `components/ClientOverview.vue`
- [ ] `components/ClientRecords/LocationAddress.vue`
- [ ] `components/ClientRecords/LocationDetails.vue`
- [ ] `components/ClientRecords/LocationIds.vue`
- [ ] `components/ClientRecords/LocationList.vue`
- [ ] `components/ClientRecords/LocationNameAndStatus.vue`
- [ ] `components/ClientRecords/LocationServices.vue`
- [ ] `components/ClientRecords/LocationSites.vue`
- [ ] `components/ClientRecords/StaffDetails.vue`
- [ ] `components/ClientRecords/StaffList.vue`
- [ ] `components/ClientStatusChip.vue`
- [ ] `components/DatesAndDiff.vue`
- [ ] `components/DirectoryRecordDetail.vue`
- [ ] `components/FormattedDate.vue`
- [ ] `components/FormattedDateForCalls.vue`
- [ ] `components/FormattedDuration.vue`
- [ ] `components/KPI/daily.vue`
- [ ] `components/KPI/month.vue`
- [ ] `components/KPI/table.vue`
- [ ] `components/LDR/AllReports.vue`
- [ ] `components/LDR/Calls-FB.vue`
- [ ] `components/LDR/Calls-PPC.vue`
- [ ] `components/LDR/Calls-SEO.vue`
- [ ] `components/LDR/Calls.vue`
- [ ] `components/LDR/Chats-FB.vue`
- [ ] `components/LDR/Chats-PPC.vue`
- [ ] `components/LDR/Chats-SEO.vue`
- [ ] `components/LDR/Chats.vue`
- [ ] `components/LDR/Emails.vue`
- [ ] `components/LDR/Forms-FB.vue`
- [ ] `components/LDR/Forms-PPC.vue`
- [ ] `components/LDR/Forms-SEO.vue`
- [ ] `components/LDR/LDRAnalytics.vue`
- [ ] `components/LDR/LDRAnalyticsAdwords.vue`
- [ ] `components/LDR/LDRAnalyticsFacebook.vue`
- [ ] `components/LDR/LDRCallsStyles.css`
- [ ] `components/LDR/LDRCallsStyles.scss`
- [ ] `components/LDR/LDRStyles.css`
- [ ] `components/LDR/LDRStyles.scss`
- [ ] `components/LDR/LDRSummary-FACEBOOK.vue`
- [ ] `components/LDR/LDRSummary-GOOGLE.vue`
- [ ] `components/LDR/LDRSummary-SEO.vue`
- [ ] `components/LDR/LDRSummary.vue`
- [ ] `components/LDR/LeadLink.vue`
- [ ] `components/LDR/LeadReportOverview.vue`
- [ ] `components/LDR/LeadSourceSummary.vue`
- [ ] `components/LogOutModal.vue`
- [ ] `components/LoginForm.vue`
- [ ] `components/PasswordResetModal.vue`
- [ ] `components/PaymentReportDetail.vue`
- [ ] `components/PaymentReportFilters.vue`
- [ ] `components/ProfileImageCropper.vue`
- [ ] `components/RecordFacts.vue`
- [ ] `components/RecordInspector.vue`
- [ ] `components/ReportGenerateFailed.vue`
- [ ] `components/ReportGenerated.vue`
- [ ] `components/ReportResultHeading.vue`
- [ ] `components/ReportingEmailAddress.vue`
- [ ] `components/ReportsList.vue`
- [ ] `components/RequiredFieldsNote.vue`
- [ ] `components/RestrictedComponent.vue`
- [ ] `components/SessionExpired.vue`
- [ ] `components/SiteRecords/SiteDetails.vue`
- [ ] `components/SiteRecords/SiteInspectorDetail.vue`
- [ ] `components/SiteRecords/SiteRecordInspector.vue`
- [ ] `components/TruncateText.vue`
- [ ] `components/UnauthorizedUser.vue`
- [ ] `components/UserProfilePicture.vue`
- [ ] `components/WorkspaceBadge.vue`
- [ ] `components/WorkspaceChart.vue`
- [ ] `components/forms/ClientPicker.vue`
- [ ] `components/forms/ClientRecordsForm.vue`
- [ ] `components/forms/DatePicker.vue`
- [ ] `components/forms/DatePickerForStatistics.vue`
- [ ] `components/forms/LocationForm.vue`
- [ ] `components/forms/LocationPicker.vue`
- [ ] `components/forms/MissingClientRecordsForm.vue`
- [ ] `components/forms/RecordFormCard.vue`
- [ ] `components/forms/StaffForm.vue`
- [ ] `components/forms/UserForm.vue`
- [ ] `components/forms/VpnSetupForm.vue`
- [ ] `components/parts/AppBar.vue`
- [ ] `components/parts/Sidebar.vue`
- [ ] `components/parts/Version.vue`
- [ ] `report/cor-comp-testing-report.js`
- [ ] `report/cor-testing-report.js`
- [ ] `report/ldr-example-report.js`
- [ ] `static/favicon.ico`
- [ ] `static/favicon.png`
- [ ] `static/showcase-report.txt`
- [ ] `static/user.svg`
- [ ] `static/v.png`
- [ ] `static/vuetify-logo.svg`
- [ ] `utils/ClientStatusEnums.js`
- [ ] `utils/UserEnums.js`
- [ ] `utils/addTwoTimes.ts`
- [ ] `utils/authRoutes.ts`
- [ ] `utils/average.ts`
- [ ] `utils/convertHHMMSSToSeconds.ts`
- [ ] `utils/dateFormat.js`
- [ ] `utils/datepicker.ts`
- [ ] `utils/defaultTimezone.ts`
- [ ] `utils/dummyPaymentReport.json`
- [ ] `utils/getColorForScoredCall.ts`
- [ ] `utils/isUserAllowedToEdit.ts`
- [ ] `utils/reportTableHeaders.ts`
- [ ] `utils/reports-upload/comparingCor.ts`
- [ ] `utils/reports-upload/comparingSeoCor.ts`
- [ ] `utils/reports-upload/cor.ts`
- [ ] `utils/reports-upload/helpers.ts`
- [ ] `utils/reports-upload/kpi.ts`
- [ ] `utils/reports-upload/ldr/columns.ts`
- [ ] `utils/reports-upload/ldr/index.ts`
- [ ] `utils/reports-upload/payment-report.ts`
- [ ] `utils/reports-upload/seoCor.ts`
- [ ] `utils/reports-upload/site-records.ts`
- [ ] `utils/reports-upload/statistic-report.ts`
- [ ] `utils/reports.ts`
- [ ] `utils/reports/calculateTotal.ts`
- [ ] `utils/secondsToHHMMSS.ts`
- [ ] `utils/showErrorOnXHRFail.ts`
- [ ] `utils/swalMixin.ts`

#### Cutover and tooling

- [ ] `.babelrc`
- [ ] `.editorconfig`
- [ ] `.env.example`
- [ ] `.eslintrc.js`
- [ ] `.githooks/pre-push`
- [ ] `.github/workflows/quality.yml`
- [ ] `.prettierrc`
- [ ] `README.md`
- [ ] `jest.config.js`
- [ ] `package-lock.json`
- [ ] `package.json`
- [ ] `shims-tsx.d.ts`
- [ ] `stylelint.config.js`
- [ ] `test/secondsToHHMMSS.spec.js`
- [ ] `tsconfig.json`
- [ ] `yarn.lock`

### Legacy verification baseline

| Check | Command and result |
| --- | --- |
| Frozen install and CI install step | `npm ci --legacy-peer-deps --ignore-scripts` passed. npm installed 1,940 packages and reported 237 audit findings (12 low, 123 moderate, 81 high, 21 critical). No dependency remediation was performed during discovery. |
| JavaScript and Vue lint | `npm run lint:js` passed. |
| Style lint | `npm run lint:style` passed. |
| Jest | `npm test -- --runInBand --coverage=false` passed all four existing duration-formatting tests. |
| Hook and CI-equivalent checks | Replayed the exact three check commands independently and applied the same aggregate exit status. All passed locally on Windows/Node 26. The actual GitHub runner uses Ubuntu/Node 22 and was outside this local check. |
| Standalone typecheck | Installed TypeScript 4.2.3, invoked with `tsc --noEmit`, exited 2 with TS2688. `tsconfig.json` lists `vue-toastification/nuxt` as an ambient type library, but the frozen install does not provide it. No other type failures can be ruled out until this is resolved and the compiler reruns. |
| Static build | `SHOWCASE_MODE=true NODE_OPTIONS=--openssl-legacy-provider ./node_modules/.bin/nuxt-ts generate` passed. Nuxt compiled the client, emitted the demo into `dist/`, and created the client fallback. Existing warnings covered Browserslist freshness, CSS alignment compatibility, and asset size. |

**Discovery blocker.** The initial documentation-only checkpoint recorded the stale type-library reference for a separately approved baseline repair. GitHub configuration and external API behavior were outside the local baseline.

### Generated showcase paths

57 concrete routes were emitted, with the 404 at `dist/404.html`. The generated `200.html` is a host fallback and is excluded from the route count.

- `/`
- `/404`
- `/all-locations`
- `/client-records`
- `/client-records/1`
- `/client-records/1/edit`
- `/client-records/1/locations/1`
- `/client-records/1/locations/1/edit`
- `/client-records/1/locations/4`
- `/client-records/1/locations/4/edit`
- `/client-records/1/locations/add`
- `/client-records/1/staff/1`
- `/client-records/1/staff/1/edit`
- `/client-records/1/staff/add`
- `/client-records/2`
- `/client-records/2/edit`
- `/client-records/2/locations/2`
- `/client-records/2/locations/2/edit`
- `/client-records/2/locations/add`
- `/client-records/2/staff/2`
- `/client-records/2/staff/2/edit`
- `/client-records/2/staff/add`
- `/client-records/3`
- `/client-records/3/edit`
- `/client-records/3/locations/3`
- `/client-records/3/locations/3/edit`
- `/client-records/3/locations/add`
- `/client-records/3/staff/3`
- `/client-records/3/staff/3/edit`
- `/client-records/3/staff/add`
- `/client-records/add`
- `/data-mining`
- `/location-settings`
- `/location-settings/add`
- `/login`
- `/profile`
- `/reports`
- `/reports/client-overview`
- `/reports/kpi`
- `/reports/lead-details-report`
- `/reports/payment-report`
- `/reports/statistics`
- `/reset-password`
- `/search`
- `/site-records`
- `/site-records/1`
- `/site-records/2`
- `/site-records/3`
- `/site-records/4`
- `/social-login`
- `/users`
- `/users/1/edit`
- `/users/2/edit`
- `/users/3/edit`
- `/users/4/edit`
- `/users/add`
- `/vpn-setup`

### Approved baseline repair

Removed the unused `vue-toastification/nuxt` ambient type entry from `tsconfig.json`. No dependency or source file imports that type library. The strictness settings are preserved.

| Gate | Result on Windows, Node 26.13.0 |
| --- | --- |
| `npm ci --legacy-peer-deps --ignore-scripts` | Passed. npm reported the same 237 dependency audit findings. |
| `tsc --noEmit` | Passed with locked TypeScript 4.2.3. |
| `npm run lint:js` and `npm run lint:style` | Both passed. |
| `npm test -- --runInBand --coverage=false` | All four Jest tests passed. |
| Hook and CI command replay | Passed. Replayed the exact lint and Jest commands with aggregate exit handling. The hosted workflow was not run. |
| Showcase static generation | Passed. All 57 paths match the discovery list. The `200.html` fallback is present. |

Phase 1 awaits approval. The next checkpoint will cover characterization tests and a route-by-route smoke checklist.
