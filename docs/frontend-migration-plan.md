# Frontend Migration Plan

Separate workstream from [stripe-backend-plan.md](./stripe-backend-plan.md) — this covers frontend tooling/structure only.

## Decisions

- **TypeScript**: new `/api` backend functions only, for now (see stripe-backend-plan.md). The frontend (`src/GroupGrid.jsx`) stays JavaScript — converting it well requires modularizing first and typing the messy `xlsx`-parsing surface, which isn't worth the time under the current constraint. Revisit per-module once the split below is done, since a split file can be converted incrementally instead of all at once.
- **Order**: Vite migration first, then split the file into modules. See reasoning below.

## Step 1: Migrate build tooling, CRA → Vite (do first)

**Why first:** mechanical and low-risk — no custom webpack config to unwind (no `craco`, not ejected), and no env vars to remap (`REACT_APP_*` → `VITE_*`) since the app hardcodes its Supabase/HubSpot config rather than using `process.env`. Doing this first means Step 2's many incremental file moves each get near-instant HMR feedback in the browser, instead of CRA's slower rebuild cycle — that speed matters far more during the split than during the Vite move itself.

Rough scope:
- Add `vite` + `@vitejs/plugin-react`; remove `react-scripts`.
- Move `index.html` to repo root, pointing at `src/index.js` as a module entry (Vite convention, vs. CRA's `public/index.html` + injected bundle reference).
- Update `package.json` scripts (`vite`, `vite build`, `vite preview`).
- Check `public/index.html` for `%PUBLIC_URL%` tokens (CRA convention) — Vite serves `public/` at the root but doesn't do that substitution, so any occurrences need to become plain paths.
- While in this area: delete the stray duplicate root-level `GroupGrid.jsx` / `index.html` / `index.js`, and rename the misnamed `download` file to `.gitignore` (both flagged in the initial repo review) so they don't add confusion during Step 2.

## Step 2: Split `src/GroupGrid.jsx` into modules (do second)

**Why second:** riskier step — everything currently shares one file's module scope, so separating it means finding every cross-reference (a marketing page using a shared color token, the auth panel calling a shared date-parsing helper, etc.) and turning it into an explicit import/export. Doing this after Step 1 means every intermediate move gets verified with fast HMR feedback rather than CRA's slower rebuild.

Rough target module boundaries (based on sections already visible in the file):

- `theme.js` — design tokens (the `P` color object, spacing, etc.)
- `icons.jsx` — icon components
- `parsing/` — `parseSheet`, `parseFlightSheet`, `parseHotelSheet`, `parseCarSheet`, `parseRegistrationSheet`, `crossMatch`
- `auth/` — `LoginPanel`, Supabase client setup
- `pages/` — `LandingPage`, `PricingPage`, `FAQPage`, `AboutPage`, `ContactPage`, `PrivacyPage`, `TermsPage`
- `components/` — modals (Email, Contacts, Support, Share, New Template), Communications Hub, `SetupScreen`
- top-level `App.jsx` (or similar) — wires the above together

Note: the file's own stale comments (e.g. `// ===== inlined: design tokens (theme) =====`) already describe roughly this structure — this looks like a split that was planned before and reverted/abandoned, so it's closer to restoring an intended structure than inventing one from scratch.
