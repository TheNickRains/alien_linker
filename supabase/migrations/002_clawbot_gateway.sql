-- AlienClaw Linker — Gateway URL and token for clawbots (operate from mini app)

alter table clawbots
  add column if not exists gateway_url text,
  add column if not exists gateway_token text;

comment on column clawbots.gateway_url is 'WebSocket URL of OpenClaw gateway for chat/operate';
comment on column clawbots.gateway_token is 'Optional auth token for gateway; server-side only, never exposed to client';
