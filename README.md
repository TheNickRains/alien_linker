# AlienClaw Linker

Pair your AlienClaw agents (clawbots) to your Alien identity with cryptographic proof of ownership.

An Alien mini app that lets users claim, manage, and deploy clawbots using ed25519 keypairs and signed attestations.

## Quick Start

```bash
# Install dependencies
bun install

# Generate attestation signing keys
bun run scripts/generate-keys.ts
# Copy the output into .env.local

# Create .env.local from the example
cp .env.example apps/mini-app/.env.local
# Fill in your Supabase credentials + generated keys

# Run the dev server
bun dev
# App runs at http://localhost:3000
```

## Testing Guide

### What Works Right Now

**UI (no Supabase needed):**
- `bun dev` starts the app at localhost:3000
- Dashboard page renders with terminal UI, ASCII header, empty state
- `/claim` page renders with the 6-digit code input (try typing, pasting, arrow keys)
- `/claim/success` page renders with animated checkmark
- `/deploy` page renders with the deploy form
- All pages have framer-motion transitions, glow effects, scanlines

**API routes (no Supabase needed):**
```bash
# Health check — always works
curl http://localhost:3000/api/health
# {"status":"ok","timestamp":"..."}

# Public signing key — works if ATTESTATION_PUBLIC_KEY is set in .env.local
curl http://localhost:3000/.well-known/alienclaw-keys.json
```

**API routes (requires Supabase):**
```bash
# Register a clawbot (no auth needed)
curl -X POST http://localhost:3000/api/clawbots/register \
  -H "Content-Type: application/json" \
  -d '{"publicKey":"ed25519:dGVzdA==","name":"test-bot"}'

# Claim with dev auth (auto-generates mock JWT in dev mode)
curl -X POST http://localhost:3000/api/clawbots/claim \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJpc3MiOiJkZXYtbW9kZSIsInN1YiI6ImRldi1hbGllbi11c2VyLTAwMDAwIiwiYXVkIjoib3BlbmNsYXctbGlua2VyIiwiaWF0IjoxNzM4OTcwMDAwLCJleHAiOjk5OTk5OTk5OTl9.dev" \
  -d '{"claimCode":"<code-from-register>"}'

# List bots (same dev JWT)
curl http://localhost:3000/api/clawbots \
  -H "Authorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJpc3MiOiJkZXYtbW9kZSIsInN1YiI6ImRldi1hbGllbi11c2VyLTAwMDAwIiwiYXVkIjoib3BlbmNsYXctbGlua2VyIiwiaWF0IjoxNzM4OTcwMDAwLCJleHAiOjk5OTk5OTk5OTl9.dev"
```

**Identity SDK:**
```bash
# Requires the dev server + Supabase running
BOT_NAME=test-bot LINKER_URL=http://localhost:3000 bun run packages/identity/src/index.ts
```

### What Requires Setup

| Feature | Requires |
|---------|----------|
| UI rendering, page navigation | Nothing (works out of the box) |
| Health check + public keys | `ATTESTATION_PUBLIC_KEY` in .env.local |
| Bot registration, claiming, listing | Supabase project + tables created |
| Attestation signing | `ATTESTATION_PRIVATE_KEY` + `ATTESTATION_PUBLIC_KEY` |
| Full claim flow (UI -> API -> attestation) | Supabase + attestation keys |
| Identity SDK demo | Supabase + dev server running |
| Deploy (actual provisioning) | Not implemented (stub only) |
| Alien app integration | Register in Alien Developer Portal + deploy to public URL |

### Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the migration SQL in the SQL editor: `supabase/migrations/001_initial.sql`
3. Copy the project URL and service role key into `.env.local`

### What's implemented (create / link / operate)

- **Deploy flow**: Creates a deploy job; when Railway is configured, triggers a deployment. Clawbot container calls `/api/deploy/[id]/ready` to auto-claim and mark the job running. Progress page shows steps and redirects to the bot when running.
- **Chat**: For claimed clawbots with a gateway URL, the app proxies messages to the OpenClaw gateway and displays agent replies.

### Not yet done

- **Rate limiting**: No rate limiting on the claim endpoint yet.
- **Alien app testing**: Requires registering the mini app in the [Alien Developer Portal](https://dev.alien.org/) and deploying to a public URL.
- **On-chain registration**: UI preview only ("Coming Soon" badge). ERC-8004 integration is Layer 3.

## Project Structure

```
alien_linker/
├── apps/mini-app/          # Next.js 15 (frontend + API routes)
│   ├── app/                # Pages + API route handlers
│   ├── components/         # Terminal-style UI components
│   ├── hooks/              # React hooks (auth, clawbots, claim, deploy)
│   └── lib/                # Server utils (auth, attestation, supabase)
├── packages/identity/      # @alienclaw/identity — clawbot SDK
│   └── src/                # Keypair, register, attestation, Hono server
├── supabase/migrations/    # Database schema SQL
├── scripts/                # Key generation
└── DOCS/                   # PRD, architecture docs
```

## Clawbot SDK

Install `@alienclaw/identity` on your agent to integrate with the linker:

```typescript
import { initIdentity } from "@alienclaw/identity";

const identity = await initIdentity({
  name: "my-research-bot",
  endpoint: "https://my-vps:3001",
  linkerUrl: "https://alienclaw-linker.vercel.app",
});

// Shows claim code in terminal
// Starts identity server on :3001 with:
//   GET  /identity    — returns attestation
//   POST /challenge   — signs nonce with private key
//   POST /attestation — receives attestation from backend
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/clawbots/register` | None | Clawbot self-registers, gets claim code |
| `POST` | `/api/clawbots/claim` | JWT | Claim a clawbot with 6-digit code |
| `GET` | `/api/clawbots` | JWT | List user's claimed clawbots |
| `GET` | `/api/clawbots/[id]` | JWT | Get clawbot details |
| `POST` | `/api/clawbots/[id]/refresh-code` | JWT | Generate new claim code |
| `POST` | `/api/deploy` | JWT | Create deploy job (optionally triggers Railway) |
| `GET` | `/api/deploy/[id]` | JWT | Poll deploy job status |
| `POST` | `/api/deploy/[id]/ready` | X-Deploy-Secret | Called by clawbot when ready; auto-claims and marks job running |
| `POST` | `/api/clawbots/[id]/chat` | JWT | Send message to clawbot gateway; returns agent reply |
| `GET` | `/api/health` | None | Health check |
| `GET` | `/.well-known/alienclaw-keys.json` | None | Backend's public signing key (JWK) |

## Environment Variables

See **DOCS/ENV.md** for full reference. Summary:

```bash
NEXT_PUBLIC_SUPABASE_URL=         # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=        # Supabase service role key
ATTESTATION_PRIVATE_KEY=          # ed25519 private key (base64)
ATTESTATION_PUBLIC_KEY=           # ed25519 public key (base64)
NEXT_PUBLIC_APP_URL=              # App URL (used in attestation issuedBy)
DEPLOY_SECRET=                    # Shared secret for deploy/ready callback
# Optional: RAILWAY_API_TOKEN, RAILWAY_SERVICE_ID, RAILWAY_PROJECT_ID, RAILWAY_ENVIRONMENT_ID
```

## Deploy & hack submission

- **Deploy and demo setup** — [DOCS/DEPLOY_DEMO_PLAN.md](DOCS/DEPLOY_DEMO_PLAN.md)
- **Submission checklist and demo script** — [DOCS/HACK_SUBMISSION.md](DOCS/HACK_SUBMISSION.md)

## Tech Stack

- **Runtime**: Bun
- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS v4, framer-motion
- **Alien SDK**: `@alien_org/react`, `@alien_org/auth-client`, `@alien_org/bridge`
- **Backend**: Next.js API routes, Supabase (Postgres)
- **Crypto**: `@noble/ed25519` for attestation signing
- **Clawbot SDK**: TypeScript, Hono, `@noble/ed25519`
- **Design**: Terminal-style UI (JetBrains Mono, CRT scanlines, green/cyan glow)

## Roadmap

- [x] **Layer 1** — Claim flow with ed25519 attestations
- [ ] **Layer 2** — W3C Verifiable Credentials, `did:key` identities
- [ ] **Layer 3** — ERC-8004 on-chain registration on Base
