# CLAUDE.md — Stratum Storefront (nuxt-storefront)

The live Vue/Nuxt storefront every tenant's shoppers actually browse and check out on — deployed via PM2 on the production server, served from a per-tenant domain resolved by `server/middleware/tenant.ts`.

---

## Git workflow

This repo has a private GitHub remote: `git@github.com-nuxt-storefront:JourneyCX/nuxt-storefront.git` (origin, tracked by `master`), authenticated via a dedicated deploy key/SSH identity separate from the other Stratum repos. **After making code changes in this repo, commit them and push to `origin/master` automatically — do not ask for confirmation before each push.** This standing instruction overrides the default "confirm before pushing" behavior specifically for this repository. Still write clear, descriptive commit messages, and still surface to the user what was committed/pushed.

**Pushing to GitHub does not deploy to production, and the server checkout does not pull from git.** The live server (`/www/wwwroot/nuxt-storefront` on `169.239.182.149`) is git-tracked for history/backup only — deploying is still a separate manual step (scp the changed files up, `npm run build`, `pm2 restart nuxt-storefront` as root; never `systemctl restart`, see `feedback_nuxt_storefront_systemd_pm2_race`). See `reference_nuxt_storefront_github_remote` for the exact deploy workflow. Deploying to that production server is a distinct, higher-stakes action from pushing to GitHub — confirm with the user before doing it unless they've already asked for the deploy explicitly.

**Before editing anything in this repo, diff the live server's files against the local copy first** — this local checkout has gone stale relative to the server before (see `feedback_nuxt_storefront_local_copy_staleness`), and trusting git alone as current here has caused real drift in the past.
