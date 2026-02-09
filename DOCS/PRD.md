# AlienClaw Linker — Product Requirements Document

**Version:** 1.1
**Date:** 2026-02-08
**Status:** Hackathon MVP — Layer 1 Implemented

---

## 1. Problem Statement

AlienClaw agents (clawbots) run on user infrastructure (VPS, Mac Mini, home servers) but have no portable identity. There is no way to say "this agent is mine" in a verifiable, interoperable way. Users in the Alien ecosystem have a strong identity (Alien ID) but no way to bind it to their agents.

**We solve this**: a mini app inside Alien that lets users claim, manage, and deploy their clawbots — with cryptographic proof of ownership.

---

## 2. Goals

### Hackathon — Layer 1 (Implemented)
- [x] Pair a running clawbot to an Alien identity using a claim code
- [x] Give the clawbot a cryptographic keypair and a signed ownership attestation
- [x] Let users deploy a new clawbot with one click from within the Alien app (stub)
- [x] Terminal-style mini app UI inside Alien

### Stretch — Layer 2
- [ ] Issue W3C Verifiable Credentials as the ownership proof format
- [ ] Clawbot identity as `did:key:...`

### Future — Layer 3
- [ ] Register clawbots on-chain via ERC-8004 Identity Registry
- [ ] On-chain attestation of Alien ID ownership via `setMetadata`
- [ ] Reputation signals via ERC-8004 Reputation Registry

---

## 3. Users

| User | Description |
|------|-------------|
| **Clawbot Owner** | Has an Alien account. Runs (or wants to run) an AlienClaw agent on their own infrastructure. Interacts via the Alien mini app. |
| **Third Party** | Any service or agent that wants to verify "does this clawbot belong to this Alien user?" Uses the attestation + challenge-response. |

---

## 4. Architecture Overview

```
┌──────────────────────┐
│     Alien App        │
│  ┌────────────────┐  │
│  │   Mini App     │  │    ┌─────────────────────┐
│  │  (Next.js 15)  │──────▶│   Backend API       │
│  │  - dashboard   │  │    │   (Next.js routes)  │
│  │  - claim flow  │  │    │                     │
│  │  - deploy flow │  │    │  - verify Alien JWT │
│  │  - bot detail  │  │    │  - match claim codes│
│  └────────────────┘  │    │  - sign attestation │
│                      │    │  - deploy jobs      │
│  Alien ID via JWT    │    └────────┬────────────┘
└──────────────────────┘             │
                            ┌────────▼────────────┐
                            │     Supabase        │
                            │  - clawbots         │
                            │  - deploy_jobs      │
                            │  - attestation_keys │
                            └─────────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
     ┌─────────────┐      ┌─────────────┐        ┌─────────────┐
     │  Clawbot A  │      │  Clawbot B  │        │  Clawbot C  │
     │  (VPS)      │      │  (Mac Mini) │        │  (new deploy│
     │  has keypair│      │  has keypair│        │   via app)  │
     │  has attest.│      │  has attest.│        │             │
     └─────────────┘      └─────────────┘        └─────────────┘
```

See [DOCS/arch.md](./arch.md) for the full technical architecture.

---

## 5. Core Flows

### 5.1 Clawbot Registration (clawbot -> backend)

**Trigger:** Clawbot starts on user's infrastructure.

1. On first boot, clawbot generates an **ed25519 keypair** via `@alienclaw/identity` (installed from GitHub)
2. Stores private key at `~/.alienclaw/identity.key` (mode 0600)
3. Stores public key at `~/.alienclaw/identity.pub`
4. Calls `POST /api/clawbots/register` with:
   ```json
   {
     "publicKey": "ed25519:base64...",
     "name": "my-clawbot",
     "endpoint": "https://my-vps:3001"
   }
   ```
5. Backend generates a `cbot_` + nanoid ID and a **6-digit claim code** (expires in 15 minutes)
6. Returns to clawbot:
   ```json
   {
     "clawbotId": "cbot_abc123def456",
     "claimCode": "847293",
     "expiresAt": "2026-02-08T12:15:00.000Z"
   }
   ```
7. Clawbot displays claim code in terminal with ASCII box
8. Clawbot starts Hono identity server (`GET /identity`, `POST /challenge`, `POST /attestation`)

### 5.2 Claim Flow (user -> mini app -> backend)

**Trigger:** User opens the mini app inside Alien.

1. Mini app loads inside Alien WebView
2. `AlienProvider` initializes, `useAlien()` provides `authToken`
3. User sees their dashboard (ASCII header, bot list, action buttons)
4. User taps "Claim a Clawbot"
5. User enters the 6-digit claim code (premium digit-box input with auto-advance and paste support)
6. Frontend calls `POST /api/clawbots/claim` with `{ "claimCode": "847293" }` + JWT
7. Backend:
   - Verifies JWT via `@alien_org/auth-client` -> extracts `alienId` (sub claim)
   - Looks up claim code -> finds matching unclaimed clawbot
   - Checks code not expired
   - Creates **signed ownership attestation** with backend ed25519 key:
     ```json
     {
       "type": "alienclaw-ownership-v1",
       "alienId": "alien-user-abc123",
       "clawbotId": "cbot_abc123def456",
       "publicKey": "ed25519:base64...",
       "issuedBy": "https://alienclaw-linker.vercel.app",
       "issuedAt": "2026-02-08T12:03:00.000Z",
       "expiresAt": "2027-02-08T12:03:00.000Z",
       "signature": "base64..."
     }
     ```
   - Links `alienId` to clawbot, stores attestation, nulls claim code
   - Delivers attestation to clawbot via `POST {endpoint}/attestation` (best-effort)
8. Clawbot receives and stores attestation at `~/.alienclaw/attestation.json`
9. Mini app redirects to success screen (animated checkmark)

### 5.3 One-Click Deploy (stub)

**Current status:** UI and API are implemented as stubs. The deploy form creates a `deploy_jobs` record with status `pending`, but no actual infrastructure provisioning occurs.

1. User fills in name + optional description on the deploy form
2. Frontend calls `POST /api/deploy` with config + JWT
3. Backend creates a `deploy_job` record (status: `pending`)
4. Mini app shows 4-step animated stepper (stays on step 1)

**Future:** Wire up Railway/Fly.io API to actually provision clawbot containers.

### 5.4 Ownership Verification (third party -> clawbot)

**Trigger:** Any external service wants to verify a clawbot's ownership.

1. Third party calls `GET {clawbot_endpoint}/identity`
2. Clawbot returns its attestation (public, non-secret)
3. Third party verifies `signature` against the backend's public key from `/.well-known/alienclaw-keys.json`
4. Third party sends a **challenge**: `POST {clawbot_endpoint}/challenge` with `{ "nonce": "random..." }`
5. Clawbot signs the nonce with its private key, returns `{ "nonce", "signature", "publicKey" }`
6. Third party verifies the signature against the `publicKey` in the attestation
7. **Verified**: this clawbot belongs to this Alien user

```
Third Party              Clawbot
---                      ---
GET /identity ---------->
<-- { attestation } -----
                         (verify attestation signature)
POST /challenge -------->
  { nonce: "abc123" }
<-- { signature } -------
                         (verify nonce signature against publicKey)
Verified.
```

---

## 6. Database Schema (Supabase)

Schema lives in `supabase/migrations/001_initial.sql`. All tables have RLS enabled. `updated_at` columns are auto-set via triggers.

### `clawbots`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid, PK | Internal ID |
| `clawbot_id` | text, unique | Public identifier (`cbot_` + nanoid) |
| `name` | text | Display name |
| `description` | text, nullable | Optional description |
| `endpoint` | text, nullable | Clawbot's API endpoint URL |
| `public_key` | text | ed25519 public key (`ed25519:base64...`) |
| `claim_code` | text, nullable | 6-digit code (nulled after claim) |
| `claim_code_expires_at` | timestamptz, nullable | Code expiration |
| `alien_id` | text, nullable | Linked Alien user ID (null = unclaimed) |
| `attestation` | jsonb, nullable | Signed ownership attestation |
| `status` | text | `registered`, `claimed`, `offline` |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last update (auto-trigger) |

### `deploy_jobs`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid, PK | Internal ID |
| `alien_id` | text | Requesting user's Alien ID |
| `clawbot_id` | text, nullable, FK | Linked clawbot (once deployed) |
| `config` | jsonb | Deployment configuration |
| `provider` | text | `railway`, `fly`, `manual` |
| `status` | text | `pending`, `deploying`, `running`, `failed` |
| `provider_metadata` | jsonb, nullable | Provider-specific data |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last update (auto-trigger) |

### `attestation_keys`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid, PK | Internal ID |
| `public_key` | text | Backend's signing public key |
| `private_key_ref` | text | Reference to secret (env var name) |
| `active` | boolean | Currently in use |
| `created_at` | timestamptz | Creation timestamp |

---

## 7. API Routes

### Authentication
All routes except `/api/clawbots/register` and `/api/health` require a valid Alien JWT in the `Authorization: Bearer <token>` header. JWT is verified via `@alien_org/auth-client`.

In development mode, mock JWT tokens ending in `.dev` are accepted for local testing.

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/clawbots/register` | None | Register a new clawbot, get claim code |
| `POST` | `/api/clawbots/claim` | Alien JWT | Claim a clawbot by 6-digit code |
| `GET` | `/api/clawbots` | Alien JWT | List user's claimed clawbots |
| `GET` | `/api/clawbots/[id]` | Alien JWT | Get clawbot details (owner verified) |
| `POST` | `/api/clawbots/[id]/refresh-code` | Alien JWT | Generate new claim code for owned bot |
| `POST` | `/api/deploy` | Alien JWT | Create deploy job (stub) |
| `GET` | `/api/deploy/[id]` | Alien JWT | Poll deploy job status (stub) |
| `GET` | `/api/health` | None | Health check |
| `GET` | `/.well-known/alienclaw-keys.json` | None | Backend's public signing key in JWK format |

---

## 8. Mini App Screens

7 screens, all using the terminal design system:

| # | Route | Description |
|---|-------|-------------|
| 1 | `/` | Dashboard — ASCII header, bot list, claim/deploy buttons, empty state with typing animation |
| 2 | `/claim` | Claim flow — 6-digit input with auto-advance, paste support, startParam pre-fill |
| 3 | `/claim/success` | Success — animated checkmark, attestation confirmation |
| 4 | `/deploy` | Deploy form — name/description inputs (stub) |
| 5 | `/deploy/[id]` | Deploy progress — 4-step animated stepper (stub, stays on step 1) |
| 6 | `/bot/[id]` | Bot detail — identity info, attestation JSON viewer, verification instructions |
| 7 | `/bot/[id]/register` | ERC-8004 preview — on-chain registration preview, "Coming Soon" |

---

## 9. Clawbot Identity SDK (`@alienclaw/identity`)

A minimal package for clawbot operators. Lives in `packages/identity/`. Installed from GitHub (not published to npm).

### Installation

**Claude Code plugin (recommended):**
```
/plugin marketplace add nembal/alien_linker
/plugin install alienclaw@nembal-alien-linker
```
Then on any agent project:
```
/alienclaw:setup https://your-linker.vercel.app
```

**Manual from GitHub:**
```bash
git clone --depth 1 https://github.com/nembal/alien_linker.git /tmp/alienclaw-tmp
cp -r /tmp/alienclaw-tmp/packages/identity ./alienclaw-identity
rm -rf /tmp/alienclaw-tmp
bun add ./alienclaw-identity
```

### Usage

```typescript
import { initIdentity } from "@alienclaw/identity";

const identity = await initIdentity({
  name: "my-research-bot",
  endpoint: "https://my-vps:3001",
  linkerUrl: "https://your-linker.vercel.app",
  port: 3001,
});

// identity.clawbotId   — assigned ID (cbot_xxx)
// identity.claimCode   — 6-digit claim code
// identity.publicKey   — "ed25519:base64..."
// identity.keypair     — raw keypair
// identity.attestation — null until claimed
```

### Modules

| Module | Responsibility |
|--------|---------------|
| `keypair.ts` | Generate/load ed25519 keypair from `~/.alienclaw/` |
| `register.ts` | `POST /api/clawbots/register` to linker backend |
| `attestation.ts` | Save/load attestation at `~/.alienclaw/attestation.json` |
| `server.ts` | Hono routes: `GET /identity`, `POST /challenge`, `POST /attestation` |
| `index.ts` | `initIdentity()` orchestrator — keypair + register + server + ASCII display |

### CLI

```bash
# Run directly (after installing from GitHub)
BOT_NAME=my-bot LINKER_URL=http://localhost:3000 bun run alienclaw-identity/src/index.ts
```

---

## 10. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Claim code brute-force | 6 digits = 1M combinations. Codes expire in 15 minutes. Single-use. |
| Stolen claim code | Short expiry window. User must also have valid Alien JWT. |
| Attestation forgery | Signed with backend's ed25519 key. Public key published at `/.well-known/alienclaw-keys.json`. |
| Clawbot impersonation | Challenge-response with the private key. Only the real clawbot has it. |
| JWT replay | Alien JWTs have `exp` claim. Backend checks expiration via `@alien_org/auth-client`. |
| Dev mode tokens | Mock JWTs only accepted when `NODE_ENV=development`. Tokens marked with `.dev` suffix. |
| Backend compromise | Layer 2/3 mitigates: VC issuance distributes trust; on-chain registration removes backend as single point. |

---

## 11. Tech Stack

| Component | Technology |
|-----------|------------|
| Mini app frontend | Next.js 15 (App Router), React 19, Tailwind CSS v4, framer-motion |
| Alien integration | `@alien_org/react`, `@alien_org/auth-client`, `@alien_org/bridge` |
| Backend API | Next.js API routes (same app) |
| Database | Supabase (Postgres) |
| Crypto | `@noble/ed25519` (attestation signing + clawbot keypairs) |
| Clawbot SDK | TypeScript, `@noble/ed25519`, Hono, `@hono/node-server` |
| Design system | Custom terminal-style components (7 primitives) |
| Deployment (mini app) | Vercel |

---

## 12. Layer 2 — Verifiable Credentials (Stretch)

**Changes from Layer 1:**
- Clawbot keypair generates a `did:key:z6Mk...` (ed25519 -> multicodec -> multibase)
- Backend becomes a VC issuer with its own DID
- Attestation format changes from custom JSON to W3C VC:
  ```json
  {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    "type": ["VerifiableCredential", "AlienClawOwnership"],
    "issuer": "did:web:alienclaw-linker.vercel.app",
    "credentialSubject": {
      "id": "did:key:z6Mk...",
      "alienId": "alien-user-abc123",
      "clawbotId": "cbot_abc123"
    },
    "proof": { ... }
  }
  ```
- Interoperable with any VC verifier
- Clawbot identity becomes portable across ecosystems

---

## 13. Layer 3 — ERC-8004 On-Chain (Future)

**Changes from Layer 2:**
- "Register On-Chain" button in the mini app (UI preview already built at `/bot/[id]/register`)
- Calls ERC-8004 `IdentityRegistry.register()` on Base
- Agent registration file includes Alien ID in services:
  ```json
  {
    "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    "name": "my-research-bot",
    "services": [
      { "name": "alien", "endpoint": "alien-user-abc123" },
      { "name": "alienclaw", "endpoint": "https://my-vps:3000" }
    ]
  }
  ```
- `setMetadata(agentId, "alienIdentity", abi.encode(alienId))` links on-chain
- Reputation signals via `ReputationRegistry.giveFeedback()`
- Fully decentralized — no backend needed for verification

**Contract addresses (Base):**
- IdentityRegistry: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- ReputationRegistry: `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`

---

## 14. Implementation Status

### Layer 1 (Complete)
- [x] Monorepo scaffold (npm workspaces, Next.js 15, Tailwind v4)
- [x] Alien SDK integration (`AlienProvider`, `useAlien`, dev-mode auth)
- [x] Database schema (3 tables with indexes, RLS, triggers)
- [x] Attestation crypto (ed25519 signing/verification via `@noble/ed25519`)
- [x] Key generation script (`scripts/generate-keys.ts`)
- [x] All 9 API routes implemented
- [x] Terminal design system (7 UI primitives + 2 layout components)
- [x] 5 business logic hooks (auth, clawbots, claim, deploy)
- [x] 7 mini app pages with animations and transitions
- [x] Clawbot identity SDK (`packages/identity`)
- [x] Dev-mode auth (mock JWT for local testing)

### Not Yet Done
- [ ] Supabase project provisioning and table creation
- [ ] Register mini app in Alien Developer Portal
- [ ] Wire up real deploy provider (Railway/Fly.io)
- [ ] Rate limiting on claim endpoint
- [ ] Test inside actual Alien app via deeplink

### Stretch
- [ ] W3C Verifiable Credential attestation format
- [ ] ERC-8004 on-chain registration (UI preview exists)
- [ ] QR code alternative to 6-digit claim code
- [ ] Real-time bot status via Supabase Realtime

---

## 15. Resolved Questions

1. **Claim code UX** — 6-digit numeric. Premium digit-box input with auto-advance and paste support.
2. **Attestation renewal** — 1-year expiry on Layer 1 attestations.
3. **Deploy provider** — Stubbed for MVP. UI and API ready for Railway integration.
4. **Dev mode** — Alien SDK gracefully degrades in browser. Mock JWT with `.dev` suffix for local API testing.
5. **Alien wallet support** — Bridge supports `payment:request` but no raw wallet signing. Layer 3 on-chain registration may need to be handled differently.
