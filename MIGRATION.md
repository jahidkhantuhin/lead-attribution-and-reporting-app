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

The green baseline was recorded before Phase 1 began.

## Phase 1 — Safety net

- `test/showcase-contract.spec.js` drives the real showcase adapter through Axios. It locks inclusive daily KPI dates and totals, monthly grouping and numeric values, lead location scoping, directory pagination and sorting, and the nested success and error response shapes.
- `test/auth-contract.spec.js` exercises the actual route guard and Axios response handler with a mocked Nuxt context. It locks authentication gating, preservation of the report return URL, and the current handling for existing redirect parameters and the login route.
- The four original payment duration tests remain. Auth tests isolate frontend behavior. Connected Sanctum cookies, token expiry, and Google code exchange require a compatible test backend and are still open for Phase 3.

### Manual smoke checklist

Use the local showcase setup in the README. After static generation, repeat direct navigation on a local static host that serves directory indexes and honors the client fallback. Run desktop and narrow viewport checks. On each route, verify the expected title, active navigation, loading and empty states where applicable, and absence of console errors. For form routes, check validation, cancel and a synthetic save before reloading to reset fixture edits.

Each route pattern below covers all concrete examples listed under **Generated showcase paths**. Complete the entire list when checking cutover parity.

| Route or pattern | Check |
| --- | --- |
| `/` | Verify dashboard dates, lead-source totals and chart, and report links. |
| `/reports` | Verify all five report links. |
| `/reports/client-overview` | Apply account-manager and date filters, compare periods, and open a location drill-down. |
| `/reports/kpi` | Apply client, location, and date filters. Check daily and monthly views and export. |
| `/reports/lead-details-report` | Check Leads, Lead Summary, and Summary by Source; switch source and try a direct filtered URL. |
| `/reports/statistics` | Change the date window and check the trend chart and table. |
| `/reports/payment-report` | Select a scorer and period. Compare call counts, duration, and payable values. |
| `/data-mining` | Check the redirect to Lead Trends. |
| `/client-records` | Test search, status filter, sorting, pagination, and first record link. |
| `/client-records/add` | Validate and save a synthetic client. |
| `/client-records/:client_id` | Confirm client name, locations, staff, and edit links. |
| `/client-records/:client_id/edit` | Confirm prefilled client fields and save a fixture change. |
| `/client-records/:client_id/locations/add` | Confirm the parent client and save a synthetic location. |
| `/client-records/:client_id/locations/:location_id` | Confirm location identity, linked site and parent client. |
| `/client-records/:client_id/locations/:location_id/edit` | Confirm prefilled location details and save a fixture change. |
| `/client-records/:client_id/staff/add` | Validate and save a synthetic staff member against the parent client. |
| `/client-records/:client_id/staff/:staff_id` | Confirm staff identity, parent links, and edit action. |
| `/client-records/:client_id/staff/:staff_id/edit` | Confirm prefilled staff details and save a fixture change. |
| `/all-locations` | Test filters and sorting and follow a location link. |
| `/location-settings` | Check the unassigned-location queue and assignment controls. |
| `/location-settings/add` | Assign a fixture location to a client and verify the result. |
| `/site-records` | Test search, filters, and website links. |
| `/site-records/:site_id` | Confirm site and hosting fields, linked client, and chart. |
| `/users` | Test role/status filters and row navigation. |
| `/users/add` | Check required fields, role selection and fixture account creation. |
| `/users/:id/edit` | Confirm existing user and role fields and save a fixture change. |
| `/profile` | Check demo user details and profile form. |
| `/vpn-setup` | Check site picker, synthetic access entry and expiry. |
| `/login` | Confirm sign-in, redirect handling and recovery affordance using demo credentials only. |
| `/reset-password` | Verify validation and demo reset feedback. |
| `/social-login` | Verify showcase callback behavior without contacting a real OAuth provider. |
| `/search` | Confirm the existing placeholder and dashboard link. |
| `/404` and an unknown path | Confirm the error view and return navigation. |

For connected mode, use a separately authorized test backend to check sign-in, CSRF, redirect back to the original report, expired-session handling, logout, and the OAuth callback. Record observed request and response shapes with synthetic data only.

### Phase 1 verification

The Phase 0 frozen install was reused. The dependency manifests and lockfiles are unchanged. On Windows with Node 26.13.0, TypeScript, both linters, and all 14 Jest cases passed. The exact lint and test commands used by the hook and CI passed when replayed with the same aggregate exit handling. Static generation produced all 57 expected routes and the client fallback. The checklist is available for manual comparison during the port. Connected authentication and the hosted GitHub Actions run were outside this verification.

Phase 2 will scaffold the Nuxt 4 app in `app-next/`. The legacy app will remain runnable for comparison, and the checkpoint will identify what is needed for automation to check both roots.

## Phase 2 — Side-by-side scaffold

Added the Nuxt 4.7.0 and Vue 3.5.46 scaffold under `app-next/` with its own npm manifest and lockfile, strict TypeScript 6.0.3, Nuxt ESLint flat config, Prettier, and a single landing page. Static generation produces `app-next/.output/public/`. The scaffold README documents the commands and port for local comparison.

The scaffold maps the original `SHOWCASE_MODE` and three `BASE_URL_*` inputs to the public showcase flag and selected API URL. The config loader was checked with fixture URLs for development, staging, and production, plus the default showcase mode. These inputs are applied when building static output. There are no auth or API client calls in the scaffold.

The root `tsconfig.json` excludes `app-next/` so the legacy compiler owns only the legacy sources. The root ESLint config ignores the nested app because the Nuxt 2 rules were picking up the Vue 3 templates. The nested app has its own lint check. The root ignore file now covers Nitro and Nuxt output. No legacy routes or application code changed.

| Verification | Result on Windows, Node 26.13.0 |
| --- | --- |
| Legacy lint, typecheck, Jest | Passed both linters, TypeScript, and all 14 Jest cases. Replayed the current pre-push and CI lint/test commands with aggregate exit handling. Reused the unchanged legacy frozen install. |
| Legacy static generation | Passed. Output has 57 routes and the client fallback. The generated dashboard mounted in Chromium. |
| Scaffold install | `npm install` and then `npm ci --prefer-offline` passed. npm reported nine moderate findings and blocked the esbuild postinstall under npm 12 lifecycle policy. Nuxt prepare and the build succeeded with that policy. |
| Scaffold checks | ESLint, Prettier, and Nuxt typecheck passed. The scaffold has no business logic tests yet. |
| Scaffold static generation | Passed. The landing page rendered in Chromium from a loopback static host with no JavaScript page errors. The build emitted dependency warnings about Vite's CSS sourcemap option and a Nitro cache-driver import. |

### Automation follow-up

The tracked workflow and hook remain unchanged. Their current commands still pass for the legacy root, but they do not enforce the scaffold checks. Before either app starts absorbing ported routes, add a second install and nested lint, format, typecheck, and generate steps to the existing `quality` job. Retain the job name and existing legacy steps. Use a Node 22 patch at or above 22.22.3 for the scaffold and include the nested lockfile in npm caching. Extend the existing hook to run scaffold checks when the nested project is present and document its separate dependency install. Scope legacy Stylelint and Jest to their own app when nested styles and tests are introduced.

References for the scaffold are [Nuxt runtime configuration](https://nuxt.com/docs/4.x/guide/going-further/runtime-config), [Nuxt static deployment](https://nuxt.com/docs/4.x/getting-started/deployment), and [Nuxt ESLint](https://eslint.nuxt.com/packages/module).

Phase 3 will port the Axios client and showcase adapter, authentication boundary, and Vuex state to Pinia. Connected session semantics still require contract confirmation.

## Phase 3 — Foundation port

- Installed Axios 1.21.1, Pinia 4.1.0, and `@pinia/nuxt` 1.0.3 in the nested app. The legacy dependencies and routes remain intact.
- Added the Nuxt client plugin, shared Axios transport, and typed service contracts for client, location, staff, site, user and KPI calls. Methods, paths, query keys, and request bodies match their legacy service equivalents. The real in-memory showcase routes, fixtures, mutations, and report payloads are ported to the Axios 1 adapter.
- Ported shell heading and breadcrumbs, user CRUD and loading state, and session/roles/permissions to Pinia. The UI will bind to those stores during Phase 4. The app initializes the synthetic session and keeps it available after showcase logout, matching the legacy demo.
- Added a client-side Sanctum boundary with the locally observed CSRF bootstrap, login, user lookup, logout and protected-route redirect behavior. Nuxt Auth's legacy cookie provider uses those endpoints. The Axios client scopes authentication material to the configured API origin. Expired requests redirect with the current path, while a quiet `/user?noswal` lookup leaves the redirect to the guard. This avoids duplicate redirects on startup. UI notifications and login/recovery views are part of the route port.

### Open questions

- The available checkout contains multiple Google integration paths, including Auth Next's configured `/social-login` exchange and the callback page's `/social-login-direct`. Confirm which exchange is authoritative and confirm provider state checking, credentials, and token lifecycle. The Google flow is deferred, and no refresh endpoint was assumed.
- Confirm connected Sanctum cookie domain, CORS, CSRF behavior and session expiry/renewal using an authorized test backend. Local checks use a mocked transport and cannot establish the server's behavior. The live backend remains the authority for authentication and authorization.
- Bind error presentation and user CRUD controls during the UI port. Phase 2's proposed CI and pre-push expansion still applies before integrating ported routes.

### Phase 3 verification

- Legacy ESLint, Stylelint, locked TypeScript and all 14 Jest cases passed. The exact pre-push and CI lint/test commands passed with their aggregate exit handling. Static generation completed all 57 showcase routes and the fallback.
- The updated scaffold lockfile passed `npm ci --prefer-offline`. npm reported nine moderate findings and the existing esbuild postinstall policy warning. Nuxt 4 ESLint, Prettier, strict typecheck and static generation passed. The generated homepage initialized the plugin and Pinia in Chromium without a page error.
- A local parity replay compared seven exact legacy/ported showcase responses, plus the unknown-record response and mutation isolation. A mocked connected replay checked the Sanctum sequence, request payload, cross-origin credential handling, `401` redirect signal, and Pinia state. The committed legacy suites remain the automated regression gate. The test runner switch remains in Phase 5.

References are [Axios adapters](https://axios.rest/pages/advanced/adapters), [Pinia for Nuxt](https://pinia.vuejs.org/ssr/nuxt.html), and [Laravel Sanctum](https://laravel.com/docs/12.x/sanctum).

Phase 4 will port the shell and route groups against the checked-in smoke checklist, starting with the dashboard and reports.

## Phase 4 — UI port in progress

### Shell and dashboard route group

- Added the Vuetify 4 plugin and theme, local MDI and favicon assets, Nuxt layout, navigation drawer, breadcrumbs, app bar, and reusable report cards and chart wrapper. The theme control uses the legacy `PUT /meta/dark_mode` request and boolean `meta_value` payload.
- Ported the dashboard lead totals, chart and four reporting periods. The Reporting Hub keeps the legacy report and directory cards. Search keeps its legacy placeholder. Added the direct `/404` page and Nuxt error view.
- The nested manifest and lockfile now include Vuetify 4.3.5, Vite plugin 2.1.3, ApexCharts 8.9.2 and Vue ApexCharts 1.11.3. Confirm the applicable ApexCharts commercial or redistribution terms before commercial deployment.
- Legacy lint, TypeScript, all 14 Jest tests, and static generation passed. The existing hook and CI lint/test commands were replayed locally. The Nuxt 4 lint, formatting, TypeScript and static generation passed. The new output includes `/`, `/reports`, `/search`, and `/404`, plus the static fallback files.
- Chromium comparison matched the legacy dashboard metrics for Last month and the Reporting Hub card titles. The check also covered chart rendering, the desktop drawer width, the mobile drawer and viewport width, and direct Search and 404 navigation. It does not establish visual parity for every layout or browser.
- Open gaps include report detail destinations, directory and administration routes, authentication pages, and shell behavior that needs those pages. Links to unported routes remain visible for navigation parity and currently lead to an error in the nested app. The legacy app continues to serve them. Hosted CI still runs only the legacy checks. The new build reports asset-size and dependency warnings.

Next route group covers the report details, starting with Scorer Payments and Location KPIs. Preserve exports, report permissions, direct filtered links and each report's legacy response contract before proceeding to the directory and authentication groups.

### Scorer Payments, Location KPIs, and Lead Trends

- Ported the three reports and the `/data-mining` redirect. Added a shared date range control, export dialog and export composable, typed report transformations, and the legacy synthetic export asset. The date control uses two native date fields and a presets menu in this iteration. The legacy calendar overlay still needs a visual parity pass.
- Scorer Payments preserves date and scorer URL inputs, per-client rounding and totals, and the `payment-report` export shape. Location KPIs preserves the client, location, date and grouping query keys, inclusive daily data and year-grouped monthly data, and the legacy spreadsheet payload. Lead Trends preserves all eight chart series, the date-range API inputs, and the statistics export columns.
- Existing legacy ESLint, Stylelint, strict TypeScript, all 14 Jest tests, and the 57-route static generation passed. The hook and CI command checks were replayed locally. Nuxt 4 static generation passed and emitted the report routes and redirect. Chromium matched all four Scorer Payments summary figures with legacy and verified direct KPI daily/monthly URLs, scroll containment at 390 px, all three synthetic export dialogs, and redirect to Lead Trends with two date query values. Connected Drive exports and hosted CI remain unverified.
- Phase 4 remains open for Client Performance, Lead Attribution, directory and administration pages, authentication UI, and remaining visual parity work. OAuth exchange and session renewal are still open backend contract questions.

### Client Performance and Lead Attribution

- Ported Client Performance with status and account-manager filters, single-period and month comparison modes, organic and paid views, search, drill-down links, and the four legacy workbook column schemas. Connected export and a column-by-column numeric comparison across all modes are still unverified.
- Ported Lead Attribution filters and direct URLs, Lead Overview, Channel Breakdown, Lead Activity, and record inspection. The Overview and Channel Breakdown reuse the legacy card presentation. Browser checks compared the seeded two-location headline metrics with the legacy app. Detailed per-source table parity and the multi-sheet Lead Attribution export remain open. The legacy app still provides those features.
- Nuxt 4 ESLint, formatting, typecheck and static generation passed. Chromium verified the seeded Client Performance row count, comparison table and showcase export, Lead Attribution metrics and tabs, its detail dialog, and width containment at 390 px. Legacy ESLint, Stylelint, strict typecheck, all 14 Jest tests, and static generation passed. The exact legacy hook and CI checks passed in the local replay. No dependency manifests changed.

Phase 4 stays open for attribution workbook and source-detail parity, the directory and administration route groups, auth UI, and a full smoke pass. The hosted workflow and connected API have not been exercised.

### Lead Attribution workbook and source table follow-through

- Added the workbook upload action to Lead Attribution. The typed builder carries forward the 12 legacy worksheets and their original headings, row layouts, and formats. The source activity selector now uses the matching call, chat, or form columns and retains record inspection. Added the same Moment version as the legacy lockfile for workbook date formatting.
- Captured the actual `POST /reports/upload` request body from each app in a loopback browser session with the same two seeded locations and date range. The complete payload matched structurally, including name, sheet order, headings, styles, row order, and cell values. Chromium also verified keyboard source selection, the Google Ads scorer column, and opening a record. The showcase adapter returned the expected export link. Connected Drive writes and playback remain unverified.
- Both apps passed lint, strict typecheck, and static generation. The legacy gate replay passed all 14 Jest tests. The Nuxt 4 Prettier check passed.

The directory and administration routes are the next Phase 4 group. Their filters, inspectors, nested forms, and spreadsheet exports still need to be ported and compared locally. Authentication UI and the connected OAuth/session checks also remain open.

### Website Directory and nested website records

- Ported the Website Directory filters, inspector, table, pagination, share URL, and spreadsheet export. The nested records include hosting details, themes, plugins, and historical speed scores. The date filter uses the shared compact date control. The list preserves the legacy request mapping, which omits the URL sort column from the API request.
- Chromium verified filtering, switching between inspector and table, navigation to the nested record, all four direct showcase URLs, graph rendering, and no horizontal page overflow on the details view at 390 px. The actual spreadsheet upload payload matched the legacy app for the same Harbor filter and date range.
- Both apps passed lint, strict type checking, and static generation. Nuxt 4 formatting and all 14 legacy Jest tests passed. Connected API behavior and full visual parity remain open.

Phase 4 remains open for client records and nested forms, location and user administration, VPN, profile, authentication UI, and the final parity pass.

### Client Directory and read-only records

- Ported the directory with filterable inspector and table views, URL-backed pagination, and shared record facts. Client details link to their staff and locations. The Nuxt 4 static build emits direct URLs for all seeded read-only client, location, and staff records.
- Chromium verified a filtered directory, the inspector and table switch, navigation to Cedar West at 390 px without horizontal overflow, and nine additional direct record URLs. Nuxt 4 lint, formatting, strict type checking, and static generation passed. Legacy ESLint, Stylelint, TypeScript, and all 14 Jest tests passed.
- Pending parity work includes client, staff, and location forms and mutations, location activity and tracking details, and directory sorting and account-manager controls. Connected mode remains unverified for these routes.

### Client, location, and staff forms

- Ported all six add and edit route types with a shared form, typed field definitions, validation, and the existing Axios services. The directory and detail pages link to these forms. The static showcase build includes the add routes and all seeded edit routes.
- Chromium verified direct access to all six route types, required-field feedback, keyboard selection of an account manager, client and staff creation, and saving a location edit with a change comment. Nuxt 4 lint, formatting, strict type checking, and static generation passed.
- The location edit form keeps the legacy required comment in the form itself. Client status changes, deletion, advanced location details, directory controls, and connected writes still need parity work.

### Client Directory filters and sorting

- Added account-manager filtering and explicit sort controls to the directory, available in both views. The URL keeps the legacy query keys, and the showcase adapter translates the directory account-manager filter to the seeded record field.
- Chromium verified manager filtering from a direct URL and the keyboard, descending name order, clearing back to ascending defaults, and width containment at 390 px. Nuxt 4 lint, formatting, strict type checking, and static generation passed. Connected filtering and sorting remain unverified.

### Client status and related record deletion

- Restored the client form's Active and Inactive options through the existing client save request. Existing status values outside those two options are preserved in the selector. The legacy standalone status toggle handler has no UI binding.
- Restored staff and location deletion on the client details page with a shared confirmation dialog, request feedback, and list refresh. Chromium verified an Inactive update, cancellation, both deletion endpoints using synthetic records, and page width at 390 px.
- Nuxt 4 lint, formatting, strict type checking, and static generation passed. Connected writes and advanced location activity and tracking details remain open.

### Location activity and tracking

- Added tracking numbers and their sources, activity comments, and a before-and-after comparison to nested location records. Location facts now include the Apex Chat, Facebook, and Google Ads IDs. Activity values come from the existing location response.
- Chromium verified the seeded tracking row, activity comment and changed values, empty history, staff navigation, and width containment at 390 px. Nuxt 4 lint, formatting, strict type checking, and static generation passed.
- Showcase verification used seeded history. Connected-mode history and the effect of saving an edit on that history remain unverified. Phase 4 still includes location administration, VPN, users, profile, and auth UI.

### Active Locations directory

- Ported the Active Locations route with the legacy name, limit, and page request parameters and create report scope. The directory has an inspector, table, URL-backed search, and links to assigned location records.
- Chromium verified direct name filtering, the table and inspector, a nested detail link, the unassigned state, clearing search, and width containment at 390 px. Nuxt 4 lint, formatting, strict type checking, and static generation passed.
- The assignment action remains pending with the Location Setup Queue. Legacy table sort UI and connected-mode verification also remain open.

### Location Setup Queue

- Ported the unassigned location queue, URL-backed sorting and pagination, client creation confirmation, and assignment to an existing client. Active Locations links to a preselected assignment form for unassigned records.
- Chromium verified the direct queue URL, the Active Locations handoff, assignment, client creation and cancellation, queue refresh, and width containment at 390 px. Nuxt 4 lint, formatting, strict type checking, and static generation passed.
- The assignment form loads up to 200 clients and 200 unassigned locations for local selection. Connected-mode writes and legacy search parity for larger directories remain open.

### VPN Access

- Ported the activity log, URL-backed pagination, website search, 72- and 96-hour access requests, IPv4 validation, and super-admin removal confirmation. The public-IP lookup uses the legacy provider with credentials disabled. Showcase requests use synthetic IP and site data through the adapter.
- Chromium verified the direct URL, public-IP fixture, invalid IPv4 feedback, website and duration selection, creation and removal, cancellation, and width containment at 390 px. Nuxt 4 lint, formatting, strict type checking, and static generation passed.
- Connected public-IP detection, VPN restrictions, and access changes remain unverified. Phase 4 still includes team members, profile, auth UI, and parity checks.

### Team Members directory

- Ported the team directory with URL-backed search, role and status filters, sorting, pagination, and a confirmation flow for removing members. The directory requires the view users scope. Removal follows the legacy admin-role restriction and explicitly excludes super-admin targets.
- Chromium verified the direct filtered URL, descending name order, role filtering, the protected super-admin row, removal and cancellation with synthetic data, and width containment at 390 px. Nuxt 4 lint, formatting, strict type checking, and static generation passed.
- Team member add and edit routes, profile, auth UI, and connected-mode permission and deletion checks remain open.

### Team member add and edit

- Ported both routes using one responsive form with scope checks, role selection, the legacy pay-rate condition, password validation, and password-change confirmation. Super-admin role assignment is excluded and super-admin editing is limited to self. The showcase adapter drops the old password from stored fixture data.
- Chromium verified all four seeded edit URLs, the self-edit current-password field, a mismatch error, synthetic creation and editing, confirmation and cancellation, and width containment at 390 px. Nuxt 4 lint, formatting, strict type checking, and static generation passed.
- Connected role assignment, pay-rate writes, and password changes remain unverified. Profile and auth UI remain open in Phase 4.

### Profile

- Ported account details, permissions, name editing with current-password validation, optional password changes, and profile photo uploads through the existing user and metadata endpoints. The photo editor previews an automatic square center crop, with adjustable cropping still pending.
- Chromium verified the seeded identity and permissions, saving a display-name edit, uploading a generated photo, and width containment at 390 px. Nuxt 4 lint, formatting, strict type checking, and static generation passed.
- Connected writes and real password enforcement remain unverified. Authentication screens and the broader parity pass are still open.

### Authentication screens

- Ported sign-in, password recovery, password reset, and the social callback screen. Recovery and reset reuse the legacy endpoints in connected mode. Showcase flows use the synthetic session and send no email. Sign-in accepts internal redirect targets and falls back to the appropriate home page for unsafe or auth-only targets.
- Chromium verified recovery, the missing-token state, reset, internal sign-in redirects, rejection of an external redirect, and width containment at 390 px. Nuxt 4 lint, formatting, strict type checking, and static generation passed.
- Connected Google OAuth stays unavailable pending backend contract verification. Connected login, recovery and reset requests remain unverified. The Phase 4 parity pass remains open.

### Static route parity

- Added a generation check that fails when a declared page is missing from Nitro's output. This caught a gap where local Windows write errors could leave pages missing despite a successful exit.
- Chromium opened all 57 generated page URLs at desktop and 390 px widths. All 56 legacy generated page URLs were present, alongside the explicit Nuxt 4 /404 route. The modern build and legacy lint, TypeScript, and 14 Jest tests passed after switching the auth layout to a viewport unit supported by the legacy Stylelint gate.
- This pass verified route availability and basic rendering. Connected backend and detailed interaction and visual parity remain open.

### Active Locations table sorting

- Added keyboard-accessible sort controls for Location, ID, Status, and Source. The sort column and direction stay in the URL and apply to the current page of results. The locations request retains the legacy name, limit, and page parameters.
- Chromium verified descending ID order from a direct URL, toggling direction by keyboard, retaining the search filter, the accessible sort state, and layout at 390 px. Nuxt 4 lint, formatting, strict type checking, and static generation passed.
