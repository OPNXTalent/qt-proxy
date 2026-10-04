# The Prism: pre-Luna rollback checkpoint

Recorded 2026-10-04. This checkpoint preserves the current application before any Luna migration. It does not deploy, change production configuration, restore a database, or certify model quality.

## Verified source and deployment

| Item | Value |
| --- | --- |
| Repository | OPNXTalent/qt-proxy |
| Recovery branch | rollback/prism-pre-luna-2026-10-04 |
| Exact source commit | 1d357ae304a037bbeb5608a72ade7e31c34f1174 |
| Commit subject | Include Shroud evidence whenever presenting the historical resurrection case |
| Vercel project | qt-proxy |
| Project ID | prj_rhV6qFZAwJUVxMW1qSW0mIxm15o0 |
| Team ID | team_D8Sr19J9WYyC73KB6pjlRomL |
| Recorded production deployment | dpl_DKR8bJQZ6EubkHgvS27uhaaWA7AC |
| Deployment state at capture | READY |
| Deployment URL | https://qt-proxy-bdii58ft1-kdalehogg-8893s-projects.vercel.app |
| Deployment inspector | https://vercel.com/kdalehogg-8893s-projects/qt-proxy/DKR8bJQZ6EubkHgvS27uhaaWA7AC |
| Verified production alias | theprism.io |
| Runtime setting reported by project | Node 24.x |
| Primary model in preserved source | claude-sonnet-4-6 |
| Supporting model in preserved source | claude-haiku-4-5-20251001 |

The deployment metadata matches the exact source commit. The alias API independently confirms that theprism.io currently points to that deployment. The deployment list reports it as a rollback candidate. This is a metadata verification, not a live end-to-end generation test.

Other aliases reported by the deployment: www.opnxllc.com, qt-proxy-theta.vercel.app, opnxllc.com, quantumtheology.app, qt-proxy-kdalehogg-8893s-projects.vercel.app, qt-proxy-git-main-kdalehogg-8893s-projects.vercel.app. Verify the complete affected alias list when executing a future rollback.

## Configuration and credentials

Project environment metadata was read with decryption disabled. The following production-targeted keys were present: ANTHROPIC_API_KEY, OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, CRON_SECRET, SITE_PASSWORD.

No credential values were exported or copied. Presence does not prove credential validity or the exact values embedded in the preserved deployment. Project settings are not an independent credential backup.

Keep the Anthropic credential/account available during the migration recovery window. Revoking that key or ending access can make the preserved deployment unable to generate answers. This temporary recovery dependency is not a requirement to run a permanent hybrid. Do not rotate shared database, Stripe, signing or other integration credentials as part of a model-only change.

Preserve the deployment and recovery branch. Do not delete them or move the recovery branch. Verify deployment retention and rollback eligibility immediately before cutover; Vercel plan limits can constrain which historical deployment is eligible.

## Application rollback procedure

Execute only when a future production change/rollback is authorized. No rollback was executed while creating this checkpoint.

1. Confirm the incident concerns the application/model migration. Identify the current deployment and suspend further releases while recovering.
2. Open Vercel project qt-proxy in the team kdalehogg-8893s-projects. Use Instant Rollback and select the exact preserved deployment dpl_DKR8bJQZ6EubkHgvS27uhaaWA7AC, with source commit 1d357ae304a037bbeb5608a72ade7e31c34f1174. Confirm availability and the affected production domains before proceeding.
3. Confirm the rollback. Verify theprism.io and other intended aliases now resolve to the preserved deployment. Do not restore Supabase merely to switch model providers.
4. Check page load, sign-in, a Scripture-first streamed answer, follow-up context, saved threads and sharing. Use an authorized test account and a separately bounded API budget. Verify logs and query-credit accounting, and avoid sending test emails or payment events to real users.
5. Check mobile/PWA behavior after reload; cached frontend/service-worker assets can outlast a deployment switch. Confirm the frontend and API operate together.
6. Record the incident and recovered deployment. Vercel disables automatic production-domain assignment after Instant Rollback. Resume releases only after reviewing and explicitly promoting the repaired deployment; a new main push alone may not restore normal promotion behavior.

Vercel Instant Rollback routes traffic to an existing build. It does not rebuild it with newly changed environment variables. External provider credentials, database compatibility, cron behavior and shared services still matter.

If the preserved deployment is unavailable, rebuild from the exact recovery commit in a separate checkout using reviewed compatible configuration. The source branch is a reconstruction path, not a guarantee of an identical build: dependencies, platform behavior, environment values and external services may have changed. The existing repository build checks must be assessed before relying on a fresh rebuild.

Do not force-reset main or merge the rollback branch as the first response to an incident.

## Database recovery boundary

No schema or data changes are part of this checkpoint. Supabase subscription, backup availability, latest successful backup and PITR status have not been verified for this project.

A future model-only migration should remain compatible with the current schema, saved threads and inquiry state so that application rollback preserves newer user data. Review any proposed schema/state changes separately before cutover.

If there is actual data corruption, inspect the project's Supabase backups and recovery options independently. Database restoration can discard writes after the selected recovery point and causes downtime. Supabase database backups do not restore Storage object contents. Do not claim this source/deployment checkpoint backs up the database.

## Limits and readiness

- Current production remains unchanged; PR #22 remains draft and unmerged.
- Source checkpoint and deployment/alias metadata are verified.
- No live rollback drill, provider call or database restore has been performed.
- Before Luna cutover: recheck production drift, retain valid recovery credentials and deployment, verify backward-compatible state, validate Luna end-to-end in an isolated preview, and obtain cutover authorization.
- This checkpoint does not approve the Luna migration or remove the earlier prohibition on production changes.

## Official recovery references

- https://vercel.com/docs/instant-rollback
- https://vercel.com/docs/cli/rollback
- https://vercel.com/docs/environment-variables/managing-environment-variables
- https://supabase.com/docs/guides/platform/backups
