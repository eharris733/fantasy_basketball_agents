import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-00ca1602/health", (c) => {
  return c.json({ status: "ok" });
});

// Get all bots for a user
app.get("/make-server-00ca1602/bots/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const botListKey = `bots:list:${userId}`;
    const botIds = await kv.get(botListKey) || [];
    
    if (botIds.length === 0) {
      return c.json([]);
    }
    
    const botKeys = botIds.map((id: string) => `bot:${id}`);
    const bots = await kv.mget(botKeys);
    
    return c.json(bots.filter(Boolean));
  } catch (error) {
    console.log(`Error fetching bots: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Create a new bot
app.post("/make-server-00ca1602/bots", async (c) => {
  try {
    const { userId, name, strategy } = await c.req.json();
    const botId = crypto.randomUUID();
    const bot = {
      id: botId,
      userId,
      name,
      strategy,
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(`bot:${botId}`, bot);
    
    const botListKey = `bots:list:${userId}`;
    const botIds = await kv.get(botListKey) || [];
    botIds.push(botId);
    await kv.set(botListKey, botIds);
    
    return c.json(bot);
  } catch (error) {
    console.log(`Error creating bot: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Update a bot
app.put("/make-server-00ca1602/bots/:botId", async (c) => {
  try {
    const botId = c.req.param("botId");
    const { name, strategy } = await c.req.json();
    
    const bot = await kv.get(`bot:${botId}`);
    if (!bot) {
      return c.json({ error: "Bot not found" }, 404);
    }
    
    const updatedBot = {
      ...bot,
      name,
      strategy,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`bot:${botId}`, updatedBot);
    
    return c.json(updatedBot);
  } catch (error) {
    console.log(`Error updating bot: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Delete a bot
app.delete("/make-server-00ca1602/bots/:botId", async (c) => {
  try {
    const botId = c.req.param("botId");
    
    const bot = await kv.get(`bot:${botId}`);
    if (!bot) {
      return c.json({ error: "Bot not found" }, 404);
    }
    
    await kv.del(`bot:${botId}`);
    
    const botListKey = `bots:list:${bot.userId}`;
    const botIds = await kv.get(botListKey) || [];
    const updatedBotIds = botIds.filter((id: string) => id !== botId);
    await kv.set(botListKey, updatedBotIds);
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting bot: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Save a game result
app.post("/make-server-00ca1602/games", async (c) => {
  try {
    const { userId, score, team, bot1Id, bot2Id, bot1Score, bot2Score } = await c.req.json();
    const gameId = crypto.randomUUID();
    const game = {
      id: gameId,
      userId,
      score,
      team,
      bot1Id,
      bot2Id,
      bot1Score,
      bot2Score,
      timestamp: new Date().toISOString(),
    };
    
    await kv.set(`game:${gameId}`, game);
    
    const gamesListKey = `games:list:${userId}`;
    const gameIds = await kv.get(gamesListKey) || [];
    gameIds.unshift(gameId); // Add to beginning
    await kv.set(gamesListKey, gameIds.slice(0, 50)); // Keep last 50 games
    
    // Update leaderboard
    const leaderboard = await kv.get("leaderboard:global") || [];
    leaderboard.push({ userId, gameId, score, timestamp: game.timestamp });
    leaderboard.sort((a: any, b: any) => b.score - a.score);
    await kv.set("leaderboard:global", leaderboard.slice(0, 100)); // Keep top 100
    
    return c.json(game);
  } catch (error) {
    console.log(`Error saving game: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Get game history for a user
app.get("/make-server-00ca1602/games/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const gamesListKey = `games:list:${userId}`;
    const gameIds = await kv.get(gamesListKey) || [];
    
    if (gameIds.length === 0) {
      return c.json([]);
    }
    
    const gameKeys = gameIds.map((id: string) => `game:${id}`);
    const games = await kv.mget(gameKeys);
    
    return c.json(games.filter(Boolean));
  } catch (error) {
    console.log(`Error fetching games: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Get leaderboard
app.get("/make-server-00ca1602/leaderboard", async (c) => {
  try {
    const leaderboard = await kv.get("leaderboard:global") || [];
    return c.json(leaderboard.slice(0, 50)); // Return top 50
  } catch (error) {
    console.log(`Error fetching leaderboard: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

Deno.serve(app.fetch);