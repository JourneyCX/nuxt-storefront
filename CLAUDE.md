# CLAUDE.md — Stratum Storefront (nuxt-storefront)

The live Vue/Nuxt storefront every tenant's shoppers actually browse and check out on — deployed via PM2 on the production server, served from a per-tenant domain resolved by `server/middleware/tenant.ts`.

---

## Git workflow

**Never commit to master. Every change goes on a branch with a PR. More than one Claude Code session may be active: fetch master before starting and before pushing; use a separate worktree if another session's working copy is in use.** (Dana, 2026-10-19.) This replaces any older sentence below that says to commit or push to `master` directly or automatically; deploys are a separate decision and are not implied by a merged PR.

This repo has a private GitHub remote: `git@github.com-nuxt-storefront:JourneyCX/nuxt-storefront.git` (origin, tracked by `master`), authenticated via a dedicated deploy key/SSH identity separate from the other Stratum repos. Code reaches GitHub only through a branch and a pull request (rule above). Still write clear, descriptive commit messages, and still surface to the user what was committed/pushed.

**Pushing to GitHub does not deploy to production, and the server checkout does not pull from git.** The live server (`/www/wwwroot/nuxt-storefront` on `169.239.182.149`) is git-tracked for history/backup only — deploying is still a separate manual step (scp the changed files up, `npm run build`, `pm2 restart nuxt-storefront` as root; never `systemctl restart`, see `feedback_nuxt_storefront_systemd_pm2_race`). See `reference_nuxt_storefront_github_remote` for the exact deploy workflow. **No deploys of any kind without Dana's explicit go in the chat. The CI3 server is due for rebuild; deploys are frozen until then.** (Dana, 2026-10-23.) When Dana does give a go, follow the deploy procedure exactly (diff the live files against git first, back up what you replace, verify afterwards) and tell her what was deployed, where the backup is, and what was or wasn't verified. Live smoke tests after risky deploys still apply.

**Before editing anything in this repo, diff the live server's files against the local copy first** — this local checkout has gone stale relative to the server before (see `feedback_nuxt_storefront_local_copy_staleness`), and trusting git alone as current here has caused real drift in the past.
