import type { OwnershipAttestation } from "./types";

export interface Database {
  public: {
    Tables: {
      clawbots: {
        Row: {
          id: string;
          clawbot_id: string;
          name: string;
          description: string | null;
          endpoint: string | null;
          public_key: string;
          claim_code: string | null;
          claim_code_expires_at: string | null;
          alien_id: string | null;
          attestation: OwnershipAttestation | null;
          status: string;
          gateway_url: string | null;
          gateway_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clawbot_id: string;
          name: string;
          description?: string | null;
          endpoint?: string | null;
          public_key: string;
          claim_code?: string | null;
          claim_code_expires_at?: string | null;
          alien_id?: string | null;
          attestation?: OwnershipAttestation | null;
          status?: string;
          gateway_url?: string | null;
          gateway_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          clawbot_id?: string;
          name?: string;
          description?: string | null;
          endpoint?: string | null;
          public_key?: string;
          claim_code?: string | null;
          claim_code_expires_at?: string | null;
          alien_id?: string | null;
          attestation?: OwnershipAttestation | null;
          status?: string;
          gateway_url?: string | null;
          gateway_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      deploy_jobs: {
        Row: {
          id: string;
          alien_id: string;
          clawbot_id: string | null;
          config: Record<string, unknown>;
          provider: string;
          status: string;
          provider_metadata: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          alien_id: string;
          clawbot_id?: string | null;
          config?: Record<string, unknown>;
          provider?: string;
          status?: string;
          provider_metadata?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          alien_id?: string;
          clawbot_id?: string | null;
          config?: Record<string, unknown>;
          provider?: string;
          status?: string;
          provider_metadata?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      attestation_keys: {
        Row: {
          id: string;
          public_key: string;
          private_key_ref: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          public_key: string;
          private_key_ref: string;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          public_key?: string;
          private_key_ref?: string;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
