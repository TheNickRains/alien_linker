import type { Clawbot } from "./types";

const STORAGE_KEY = "alienclaw-fake-agents";

export function getFakeAgents(): Clawbot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addFakeAgent(agent: Clawbot): void {
  const existing = getFakeAgents();
  existing.push(agent);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function clearFakeAgents(): void {
  localStorage.removeItem(STORAGE_KEY);
}
