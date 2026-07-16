# Checklist: before merging `development` into `main`

`main` auto-deploys to the client's production Vercel project via their existing Vercel↔GitHub integration — a different mechanism than our staging GitHub Action, and one we can't dry-run without access to their project. Treat this list as the gate before that merge.

## Blocking — needs client Vercel access

- [ ] **Set `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY` in the client's production Vercel project.** This is the big one: `src/auth/supabaseClient.js` no longer has a hardcoded fallback (see `docs/stripe-backend-plan.md`), so production auth breaks immediately on the next deploy if these aren't set first. Values are the original production project's: URL `https://ajabrqcbultkaszsycwh.supabase.co`, publishable key `sb_publishable_yn6mJb93k85y5nrJJReQSA_M6iliVoD`. **Publishable key only — never the secret key.**
- [ ] **Check the project's Framework Preset / Build & Development Settings.** The app was Create React App (output dir `build/`) and is now Vite (output dir `dist/`). If the client's Vercel project has these manually pinned rather than auto-detected, production will build the wrong thing (or fail) until this is corrected. Confirm framework preset reads "Vite" and output directory is `dist`.
- [ ] **Confirm the Node.js version** set on the client's project meets Vite 6's minimum (Node 18+). CRA was more lenient; an old pinned Node version could silently break the build.

## Code / build verification (can do now, no client access needed)

- [ ] `npm run build` succeeds cleanly from a fresh clone (not just this working copy) — catches anything accidentally left out of git.
- [ ] Confirm `.env`, `.env.local` are not committed (`git status` should show them untracked/ignored) — no secrets in the diff going to `main`.
- [ ] Re-run the manual test pass from earlier (Communications Hub, full upload → cross-check cycle, grid sort/filter/expand, reporting exports, session save/load, marketing nav) against a production build (`npm run build && npm run preview`), not just the dev server — dev and prod builds can behave differently (minification, `import.meta.env` substitution, etc.).
- [ ] Confirm the staging GitHub Action (`deploy-staging.yml`) has gone green at least once via manual `workflow_dispatch`, so the build/deploy mechanics are proven before trusting the same codebase against the client's pipeline.

## Lower priority — worth a decision, not necessarily a blocker

- [ ] `xlsx` package has a known high-severity advisory (pre-existing, unrelated to this migration) — decide whether to address before or after this merge.
- [ ] Decide whether `test-data/` and `file-templates/` should ship to `main` or stay dev-only (currently `file-templates/` is gitignored; `test-data/` is not).

## Rollback plan

If production breaks after merge: the client's Vercel dashboard keeps prior deployments — use "Promote to Production" on the last known-good deployment while a fix is worked out on `development`, rather than reverting the merge commit under pressure.
