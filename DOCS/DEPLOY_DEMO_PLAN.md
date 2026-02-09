# Step-by-Step: Deploy & Demo (Create, Link, Operate)

Get the full flow working: deploy a clawbot from the mini app, auto-claim it, and chat with it. Uses your Railway project **alienhack** (Project ID: `b8028af6-b9f9-4aa4-86d4-5db5fe23fc43`).

---

## Phase 0: Unblock Railway

1. **Resolve the overdue subscription**  
   In Railway, pay the outstanding balance so new deployments and API calls are not blocked. You cannot create services or trigger deploys until this is fixed.

---

## Phase 1: Railway API token

1. In Railway: **Project alienhack** → left sidebar → **Tokens** (or **Account** → API).
2. **Create a token** (e.g. name: `alienclaw-linker`). Copy the token and store it securely.
3. You will use this as `RAILWAY_API_TOKEN` in the linker app env (Phase 4).

---

## Phase 2: One clawbot service on Railway

You need **one Railway service** that runs the clawbot container (identity + OpenClaw gateway). The linker will trigger **redeploys** of this service with different env vars (e.g. `DEPLOY_JOB_ID`) so each deploy is a new “agent” for a user.

### Option A: Deploy from this repo (recommended for demo)

1. In Railway project **alienhack**, **Add Service** → **GitHub Repo** (or **Deploy from GitHub**).
2. Connect the repo that contains `alien_linker` (with `openclaw` submodule and `docker/Dockerfile.clawbot`).
3. Set **Root Directory** (if needed) so Railway sees the repo root.
4. Set **Dockerfile path**: `docker/Dockerfile.clawbot` (or build with a Dockerfile at repo root that matches).
5. Do **not** set a custom start command; the Dockerfile `CMD` runs the launcher.
6. After the first deploy, open the service → **Settings** → copy the **Service ID** (UUID). You will use it as `RAILWAY_SERVICE_ID` in the linker (Phase 4).
7. In the same service, go to **Variables** and add the variables from Phase 3 (so the container gets them on every deploy).

### Option B: Deploy a pre-built image

1. **Build the image locally** (from repo root):
   ```bash
   docker build -f docker/Dockerfile.clawbot -t alienclaw-clawbot .
   ```
2. **Push** to a registry Railway can use (Docker Hub, GHCR, etc.):
   ```bash
   docker tag alienclaw-clawbot YOUR_REGISTRY/alienclaw-clawbot:latest
   docker push YOUR_REGISTRY/alienclaw-clawbot:latest
   ```
3. In Railway: **Add Service** → **Docker Image** → image URL (e.g. `ghcr.io/your-org/alienclaw-clawbot:latest`). If the registry is private, add credentials in Railway.
4. Copy the **Service ID** for the linker env.

---

## Phase 3: Clawbot service variables (Railway)

On the **clawbot service** you created, set **Variables** so the launcher and OpenClaw can talk to the linker and report back. Railway will inject these into the container.

**Required (linker will override some per deploy if you use variable API):**

| Variable | Value | Notes |
|----------|--------|--------|
| `LINKER_URL` | Your linker app URL | e.g. `https://your-linker.vercel.app` or `http://localhost:3000` for dev |
| `DEPLOY_SECRET` | Same secret as linker | Must match `DEPLOY_SECRET` in linker app |
| `NEXT_PUBLIC_APP_URL` | Same as linker URL | e.g. `https://your-linker.vercel.app` |

**Per-deploy (set by linker when using variable API, or set once for a single-agent demo):**

| Variable | Value | Notes |
|----------|--------|--------|
| `DEPLOY_JOB_ID` | (set by linker per deploy) | Or leave empty and set manually for one-off deploy |
| `BOT_NAME` | e.g. `alienhack-agent` | Display name |
| `GATEWAY_TOKEN` | (set by linker per deploy) | Or generate one and reuse for single agent |
| `IDENTITY_PUBLIC_URL` | Public URL of this service | See below |
| `GATEWAY_PUBLIC_URL` | WebSocket URL for gateway | See below |

**Public URLs for this service**

- In the clawbot service, open **Settings** → **Networking** → **Generate Domain** (or use an existing one). You get a URL like `https://alienhack-production-xxxx.up.railway.app`.
- Railway exposes **one HTTP port per service**. The launcher runs:
  - Identity server on **3001**
  - OpenClaw gateway on **18789**

You have two options:

- **Single port (simplest):** Expose only one port (e.g. 3001) and put both identity and a WebSocket proxy on it later, **or** expose 18789 and use that as the main endpoint. For a quick demo, expose **3001** and set:
  - `IDENTITY_PUBLIC_URL` = `https://YOUR-RAILWAY-DOMAIN.up.railway.app` (Railway will route to port 3001 if you set it).
  - `GATEWAY_PUBLIC_URL` = `wss://YOUR-RAILWAY-DOMAIN.up.railway.app` only if you add a WebSocket proxy; otherwise you need a second port.
- **Two ports (full chat):** In Railway, expose **two ports** (3001 and 18789) if supported, or use a **TCP proxy** for the second. Then:
  - `IDENTITY_PUBLIC_URL` = `https://YOUR-DOMAIN` (port 3001)
  - `GATEWAY_PUBLIC_URL` = `wss://YOUR-DOMAIN` with a path or second host that routes to 18789.

For a **minimal demo without chat**, you can set only `LINKER_URL`, `DEPLOY_SECRET`, `NEXT_PUBLIC_APP_URL`, `BOT_NAME`, and a fixed `DEPLOY_JOB_ID` (create one job in the DB and use its UUID) so the container registers and calls `/ready`; deploy and claim will work. Add gateway URL and chat once you have a reachable WebSocket for 18789.

---

## Phase 4: Linker app environment variables

Where the **linker** (mini app backend) runs (e.g. Vercel or local), set:

**Already required for linker:**

- Supabase URL and service role key  
- `ATTESTATION_PRIVATE_KEY` / `ATTESTATION_PUBLIC_KEY`  
- `NEXT_PUBLIC_APP_URL` (e.g. `https://your-linker.vercel.app`)

**For deploy + auto-claim:**

| Variable | Value |
|----------|--------|
| `DEPLOY_SECRET` | A long random string; **must match** the clawbot service’s `DEPLOY_SECRET` |

**For Railway trigger (so “Deploy” in the app starts a deploy):**

| Variable | Value |
|----------|--------|
| `RAILWAY_API_TOKEN` | Token from Phase 1 |
| `RAILWAY_SERVICE_ID` | Clawbot service UUID from Phase 2 |
| `RAILWAY_PROJECT_ID` | `b8028af6-b9f9-4aa4-86d4-5db5fe23fc43` |
| `RAILWAY_ENVIRONMENT_ID` | Environment UUID (e.g. **Production**); find it in Railway → project → **Environments** → copy ID |

If you omit the Railway vars, the app still creates a deploy job and shows “Deploying…”; you’d start the container manually and it would call `/ready` when up.

---

## Phase 5: Supabase migration

1. Open your Supabase project → **SQL Editor**.
2. Run the contents of **`supabase/migrations/002_clawbot_gateway.sql`** (adds `gateway_url` and `gateway_token` to `clawbots`).
3. Confirm the `clawbots` table has the new columns.

---

## Phase 6: Install and run linker

From the **alien_linker** repo root:

```bash
bun install
cp .env.example apps/mini-app/.env.local
# Edit apps/mini-app/.env.local with all variables above
bun dev
```

Or deploy the linker to Vercel and set the same env vars in the Vercel project.

---

## Phase 7: End-to-end test

1. **Fix Railway subscription** (Phase 0) and complete Phases 1–5.
2. Open the linker app (local or Vercel). Log in with Alien (or use dev auth if local).
3. **Deploy:** Click “Deploy New Agent”, enter a name, submit. The app should create a job and (if Railway is configured) trigger a deploy. The deploy progress page should move from “Provisioning” to “Deploying…” and then, when the container calls `/ready`, to “Running” and redirect to the bot.
4. **Link:** If the container registered and called `/ready` with the right `DEPLOY_JOB_ID` and secret, the clawbot is already claimed. You should see it under “My Agents”.
5. **Operate:** Open the bot → “Chat with agent →”. If `GATEWAY_PUBLIC_URL` is set and the gateway is reachable, send a message and confirm a reply.

---

## Phase 8: Demo polish (optional)

- **Template:** In Railway → **Project Settings** → **Generate Template from Project** → create a template so others can one-click deploy a similar clawbot stack.
- **Visibility:** For a public demo template, consider changing project visibility or publishing the template; for internal demo, private is fine.
- **Second agent:** Trigger another “Deploy New Agent” to confirm multiple jobs; each deploy reuses the same Railway service with new env (e.g. new `DEPLOY_JOB_ID` and `GATEWAY_TOKEN` if your backend sets variables before triggering).

---

## Checklist summary

- [ ] Phase 0: Resolve Railway overdue subscription  
- [ ] Phase 1: Create Railway API token  
- [ ] Phase 2: Create one clawbot service (GitHub + Dockerfile or Docker image)  
- [ ] Phase 3: Set clawbot service variables (LINKER_URL, DEPLOY_SECRET, BOT_NAME, public URLs)  
- [ ] Phase 4: Set linker env (DEPLOY_SECRET, RAILWAY_* if using trigger)  
- [ ] Phase 5: Run Supabase migration `002_clawbot_gateway.sql`  
- [ ] Phase 6: Install deps and run or deploy linker  
- [ ] Phase 7: Test deploy → link → chat  
- [ ] Phase 8 (optional): Create Railway template for demo  

If any step fails (e.g. “Deploy trigger failed” or container never calls `/ready`), check: DEPLOY_SECRET match, correct Service ID and Environment ID, and that the container can reach `LINKER_URL` and has `DEPLOY_JOB_ID` set for the job the app created.
