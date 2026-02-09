# Hackathon Submission — AlienClaw Linker

Get the project **functional**, **deployed**, and **demo-ready** for submission.

---

## Pre-submission checklist

- [ ] **Build passes** — `cd apps/mini-app && npx next build`
- [ ] **Linker deployed** — Vercel (or host) with env vars set (see [ENV.md](./ENV.md))
- [ ] **Supabase** — Migrations `001_initial.sql` and `002_clawbot_gateway.sql` applied
- [ ] **Railway** (optional) — One clawbot service + linker env (`RAILWAY_*`, `DEPLOY_SECRET`) for one-click deploy
- [ ] **Demo path** — Either: (A) full deploy → claim → chat via Railway, or (B) claim existing bot + chat if gateway is set

---

## What to submit

1. **Repo** — This repository (with `openclaw` submodule initialized).
2. **Live app URL** — Linker mini app (e.g. `https://alien-linker.vercel.app`).
3. **Short description** — e.g. “Alien mini app to claim, deploy, and chat with AlienClaw agents; cryptographic attestations and optional one-click Railway deploy.”
4. **Demo video or GIF** (if required) — Use the demo script below.

---

## Demo script (≈3–5 min)

### Option A: Full flow (Railway + deploy + chat)

1. **Open the linker** in Alien (or in browser if not yet in Alien shell).
2. **Log in** with Alien (or dev auth if local).
3. **Deploy**
   - Go to **Deploy New Agent**.
   - Enter a name (e.g. `demo-bot`), optional description.
   - Click **Deploy**. Progress page shows “Provisioning” → “Deploying…”.
   - When the Railway container starts and calls `/api/deploy/[id]/ready`, the job goes to “Running” and you’re redirected to the bot.
4. **Link** (automatic)
   - The clawbot is auto-claimed to your Alien identity when it calls `/ready` with the correct `DEPLOY_JOB_ID` and `DEPLOY_SECRET`. No manual claim code needed.
5. **Operate**
   - On the bot page, click **Chat with agent →**.
   - Send a message; the reply comes from the OpenClaw gateway. Show one exchange.

### Option B: Claim + chat (no Railway)

1. **Have a clawbot already running** (e.g. local or pre-deployed) that has registered with the linker and shows a 6-digit claim code.
2. **Open linker** → **Claim an agent** → enter the 6-digit code → submit.
3. **Success** → bot appears under “My Agents”.
4. If the clawbot has a gateway URL set, open the bot → **Chat with agent →** and send a message.

### Talking points

- **Claim** — Pair any AlienClaw agent to your Alien identity with a one-time code; backend signs an ownership attestation.
- **Deploy** — One-click deploy (when Railway is configured) creates a job, triggers a container, and auto-claims the agent when it’s ready.
- **Operate** — Chat with your deployed agent from the same mini app; messages go through the linker to the agent’s OpenClaw gateway.

---

## If something breaks during the demo

- **“Deploy not configured”** — Set `DEPLOY_SECRET` (and Railway vars if you want in-app deploy). See [ENV.md](./ENV.md).
- **Deploy stays on “Deploying…”** — Railway service may not be running or env vars (`DEPLOY_JOB_ID`, `LINKER_URL`, `DEPLOY_SECRET`) may be wrong in the container. Check [DEPLOY_DEMO_PLAN.md](./DEPLOY_DEMO_PLAN.md) Phase 3–4.
- **“Agent unreachable” in chat** — Clawbot’s gateway URL may be wrong or the gateway not exposed (e.g. WebSocket port). Set `GATEWAY_PUBLIC_URL` on the clawbot and ensure the linker can reach it.
- **Claim “Invalid or expired”** — Claim code is one-use and can expire; register a new clawbot or refresh the code from the bot’s page.

---

## Links

- **Deploy & env setup** — [DEPLOY_DEMO_PLAN.md](./DEPLOY_DEMO_PLAN.md)
- **Env reference** — [ENV.md](./ENV.md)
- **Architecture** — [arch.md](./arch.md)
- **PRD** — [PRD.md](./PRD.md)
