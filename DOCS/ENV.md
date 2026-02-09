# Environment Variables

Quick reference for running and deploying the **Alien Linker** mini app.

## Linker app (mini-app)

Set these where the app runs (e.g. `apps/mini-app/.env.local` for local, or Vercel **Project → Settings → Environment Variables** for production).

### Required

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `ATTESTATION_PRIVATE_KEY` | Base64 Ed25519 private key (generate with `bun run generate-keys`) |
| `ATTESTATION_PUBLIC_KEY` | Base64 Ed25519 public key |
| `NEXT_PUBLIC_APP_URL` | Public URL of this app (e.g. `https://your-app.vercel.app` or `http://localhost:3000`) |

### Deploy (auto-claim)

| Variable | Description |
|----------|-------------|
| `DEPLOY_SECRET` | Shared secret for `/api/deploy/[id]/ready`. Must match the value used by clawbot containers. |

### Railway (optional)

When set, "Deploy New Agent" in the app triggers a Railway deployment. If omitted, deploy jobs are created but you start the clawbot container manually.

| Variable | Description |
|----------|-------------|
| `RAILWAY_API_TOKEN` | Railway API token |
| `RAILWAY_SERVICE_ID` | Clawbot service UUID |
| `RAILWAY_PROJECT_ID` | Railway project UUID |
| `RAILWAY_ENVIRONMENT_ID` | Environment UUID (e.g. Production) |

See **DOCS/DEPLOY_DEMO_PLAN.md** for full setup (Railway service, clawbot variables, Supabase migration).

## Vercel deployment

1. Connect the repo to Vercel (root or `apps/mini-app`; if root, set **Root Directory** to `apps/mini-app`).
2. Add all required variables and `DEPLOY_SECRET` in **Settings → Environment Variables**.
3. Add Railway variables if you want in-app deploy trigger.
4. Deploy. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL (e.g. `https://alien-linker.vercel.app`).

No custom `vercel.json` is required for the mini app; Next.js defaults are sufficient.
