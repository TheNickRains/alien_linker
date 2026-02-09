---
name: alienclaw-setup
description: Set up AlienClaw identity linking on an agent. Installs the identity SDK from GitHub, wires up initIdentity(), and displays a 6-digit claim code for linking to an Alien account. Use when the user wants to link their agent to their Alien identity.
user-invocable: true
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
argument-hint: [linker-url]
---

# AlienClaw Identity Setup

You are setting up AlienClaw identity linking on this agent. This lets the agent be linked to the user's Alien account via a 6-digit claim code.

## What you will do

1. Install the `@alienclaw/identity` SDK from GitHub
2. Add `initIdentity()` to the agent's entry point
3. Run it to generate a keypair, register with the linker, and display the claim code

## Step 1: Install the SDK from GitHub

Clone the identity package from the AlienClaw Linker repo and install it as a local dependency:

```bash
git clone --depth 1 https://github.com/nembal/alien_linker.git /tmp/alienclaw-setup-tmp
cp -r /tmp/alienclaw-setup-tmp/packages/identity ./alienclaw-identity
rm -rf /tmp/alienclaw-setup-tmp
npm install ./alienclaw-identity
```

This installs `@alienclaw/identity` as a local dependency. Verify it appears in `package.json`.

## Step 2: Wire up identity linking

The user may pass a linker URL as an argument: `$ARGUMENTS`

If no argument was provided, use `http://localhost:3000` as default linker URL.

Find the agent's main entry point (e.g. `index.ts`, `main.ts`, `server.ts`, or `app.ts`). Add the following near the top-level startup:

```typescript
import { initIdentity } from "@alienclaw/identity"

const identity = await initIdentity({
  name: "<agent-name>",        // Use the project name or ask the user
  linkerUrl: "<linker-url>",   // From $ARGUMENTS or default
  port: 3001,                  // Identity verification server port
})

console.log(`Agent identity ready. Claim code: ${identity.claimCode}`)
```

If the agent doesn't have a clear entry point, create a file called `identity-setup.ts`:

```typescript
import { initIdentity } from "@alienclaw/identity"

const LINKER_URL = process.env.LINKER_URL || "<linker-url>"
const BOT_NAME = process.env.BOT_NAME || "<agent-name>"

const identity = await initIdentity({
  name: BOT_NAME,
  linkerUrl: LINKER_URL,
  port: 3001,
})
```

## Step 3: Run and show the claim code

Run the agent (or the identity-setup.ts file) and show the user the 6-digit claim code from the output:

```bash
npx tsx identity-setup.ts
```

Tell the user:
- **Open the AlienClaw Linker mini app** in the Alien app
- **Tap "Link an Agent"**
- **Enter the 6-digit code** shown in the terminal
- The code **expires in 15 minutes**

## What gets created

- `~/.alienclaw/identity.key` — ed25519 private key (mode 0600)
- `~/.alienclaw/identity.pub` — ed25519 public key
- `~/.alienclaw/attestation.json` — ownership attestation (after claiming)
- Identity server on port 3001:
  - `GET /identity` — returns attestation
  - `POST /challenge` — signs a nonce (proves key ownership)
  - `POST /attestation` — receives attestation from backend after claiming

## Important notes

- The keypair is generated once and reused across restarts
- If the agent already has `~/.alienclaw/identity.key`, it will reuse the existing keypair
- The claim code is single-use and expires in 15 minutes
- After claiming, the agent receives a signed attestation proving it belongs to the user
