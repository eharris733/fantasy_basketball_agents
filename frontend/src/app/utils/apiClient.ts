const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

// --- Users ---

export interface UserResponse {
  id: string;
  username: string;
  created_at: string;
}

export function createUser(username: string) {
  return request<UserResponse>("/users", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export function getUser(userId: string) {
  return request<UserResponse>(`/users/${userId}`);
}

// --- Bots ---

export interface BotResponse {
  id: string;
  user_id: string;
  name: string;
  strategy_prompt: string;
  created_at: string;
  updated_at: string;
}

export function getUserBots(userId: string) {
  return request<BotResponse[]>(`/bots/user/${userId}`);
}

export function createBot(userId: string, name: string, strategyPrompt: string) {
  return request<BotResponse>("/bots", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, name, strategy_prompt: strategyPrompt }),
  });
}

export function updateBot(botId: string, data: { name?: string; strategy_prompt?: string }) {
  return request<BotResponse>(`/bots/${botId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteBot(botId: string) {
  return request<{ ok: boolean }>(`/bots/${botId}`, { method: "DELETE" });
}

// --- Games ---

export interface GamePlayerResult {
  player_id: number;
  first_name: string;
  last_name: string;
  fantasy_points: number;
  bid_amount: number;
  draft_order: number;
}

export interface GameResponse {
  id: string;
  user_id: string;
  bot1_id: string;
  bot2_id: string;
  bot1_name: string;
  bot2_name: string;
  bot1_score: number;
  bot2_score: number;
  winner_bot_id: string | null;
  status: string;
  game_log: string[];
  bot1_team: GamePlayerResult[];
  bot2_team: GamePlayerResult[];
  created_at: string;
}

export function runGame(userId: string, bot1Id: string, bot2Id: string) {
  return request<GameResponse>("/games", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, bot1_id: bot1Id, bot2_id: bot2Id }),
  });
}

// --- SSE Streaming ---

export interface DraftPick {
  player_id: number;
  first_name: string;
  last_name: string;
  fantasy_points: number;
  bid_amount: number;
  draft_order: number;
}

export interface StreamDraftEvent {
  type: "draft";
  bot_key: "bot1" | "bot2";
  player: DraftPick;
  bot1_balance: number;
  bot2_balance: number;
}

export interface StreamGameCompleteEvent {
  type: "game_complete";
  bot1_score: number;
  bot2_score: number;
  bot1_team: DraftPick[];
  bot2_team: DraftPick[];
  game_log: string[];
}

export interface StreamCallbacks {
  onLog: (message: string) => void;
  onDraft: (event: StreamDraftEvent) => void;
  onGameComplete: (event: StreamGameCompleteEvent) => void;
  onSaved: (gameId: string) => void;
  onError: (error: string) => void;
}

export async function streamGame(
  userId: string,
  bot1Id: string,
  bot2Id: string,
  callbacks: StreamCallbacks,
): Promise<void> {
  const res = await fetch(`${BASE}/games/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, bot1_id: bot1Id, bot2_id: bot2Id }),
  });

  if (!res.ok) {
    const text = await res.text();
    callbacks.onError(`API error ${res.status}: ${text}`);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError("No response body");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE messages from buffer
    const parts = buffer.split("\n\n");
    // Last part may be incomplete, keep it in the buffer
    buffer = parts.pop() || "";

    for (const part of parts) {
      if (!part.trim()) continue;

      let eventType = "";
      let data = "";

      for (const line of part.split("\n")) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7);
        } else if (line.startsWith("data: ")) {
          data = line.slice(6);
        }
      }

      if (!data) continue;

      try {
        const parsed = JSON.parse(data);
        switch (eventType) {
          case "log":
            callbacks.onLog(parsed.message);
            break;
          case "draft":
            callbacks.onDraft(parsed as StreamDraftEvent);
            break;
          case "game_complete":
            callbacks.onGameComplete(parsed as StreamGameCompleteEvent);
            break;
          case "saved":
            callbacks.onSaved(parsed.game_id);
            break;
        }
      } catch {
        // Skip malformed JSON
      }
    }
  }
}

export function getUserGames(userId: string) {
  return request<GameResponse[]>(`/games/user/${userId}`);
}

// --- Players ---

export interface PlayerResponse {
  id: number;
  first_name: string;
  last_name: string;
  games_played: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  topg: number;
  fantasy_points: number;
}

export function getPlayers(search = "", limit = 50) {
  const params = new URLSearchParams({ search, limit: String(limit) });
  return request<PlayerResponse[]>(`/players?${params}`);
}

// --- Leaderboard ---

export interface LeaderboardEntry {
  game_id: string;
  username: string;
  bot_name: string;
  score: number;
  created_at: string;
}

export function getLeaderboard() {
  return request<LeaderboardEntry[]>("/leaderboard");
}
