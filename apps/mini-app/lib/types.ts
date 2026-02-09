// ── Domain Types ──

export interface Clawbot {
  id: string;
  clawbotId: string;
  name: string;
  description: string | null;
  endpoint: string | null;
  publicKey: string;
  alienId: string | null;
  status: "registered" | "claimed" | "offline";
  attestation: OwnershipAttestation | null;
  /** WebSocket URL for OpenClaw gateway (operate/chat). Omitted if not set; never expose gateway_token. */
  gatewayUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OwnershipAttestation {
  type: "alienclaw-ownership-v1";
  alienId: string;
  clawbotId: string;
  publicKey: string;
  issuedBy: string;
  issuedAt: string;
  expiresAt: string;
  signature: string;
}

export interface DeployJob {
  id: string;
  alienId: string;
  clawbotId: string | null;
  config: DeployConfig;
  provider: "railway" | "fly" | "manual";
  status: "pending" | "deploying" | "running" | "failed";
  providerMetadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeployConfig {
  name: string;
  description?: string;
  template?: string;
}

// ── API Request Types ──

export interface RegisterRequest {
  publicKey: string;
  name: string;
  endpoint?: string;
}

export interface RegisterResponse {
  clawbotId: string;
  claimCode: string;
  expiresAt: string;
}

export interface ClaimRequest {
  claimCode: string;
}

export interface ClaimResponse {
  clawbot: Clawbot;
  attestation: OwnershipAttestation;
}

export interface DeployRequest {
  name: string;
  description?: string;
  template?: string;
}

export interface DeployResponse {
  id: string;
  status: "pending" | "deploying";
  /** When Railway is not configured, deploy is manual (user starts container and uses claim code). */
  provider?: "railway" | "manual";
}

export interface HealthResponse {
  status: "ok";
  timestamp: string;
}

export interface PublicKeysResponse {
  keys: Array<{
    kty: "OKP";
    crv: "Ed25519";
    x: string;
    use: "sig";
  }>;
}

export interface ApiError {
  error: string;
}

// ── Chat (operate) types ──

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  reply: string;
}
