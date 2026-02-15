# Fantasy Basketball Bidding Platform

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind + shadcn/ui in `Fantasy Basketball Bidding Platform/`
- **Backend**: FastAPI + LangChain (GPT-4o-mini) + Supabase in `backend/`
- **Data**: `active_players_stats.csv` (698 players, 511 with >=10 games played)

## Backend (`backend/`)

### Running
```bash
source .venv/bin/activate
uvicorn main:app --reload         # API on :8000
python -m services.player_loader ../active_players_stats.csv  # Seed players
```

### Key Files
- `main.py` — FastAPI app, CORS (allow all), mounts routers at `/api`
- `config.py` — Pydantic Settings loads `.env` (SUPABASE_URL, SUPABASE_KEY, OPENAI_API_KEY)
- `database.py` — Supabase client factory
- `models.py` — All Pydantic request/response schemas
- `schema.sql` — Full Supabase DDL (copy-paste into SQL editor)

### Routers
- `routers/users.py` — POST /api/users, GET /api/users/{id}
- `routers/bots.py` — Full CRUD /api/bots
- `routers/games.py` — POST /api/games (runs full game), GET /api/games/user/{id}
- `routers/leaderboard.py` — GET /api/leaderboard (joined user/bot names)
- `routers/players.py` — GET /api/players?search=&limit=

### Services
- `services/scoring.py` — Fantasy formula: PTS×1 + REB×1.2 + AST×1.5 + STL×3 + BLK×3 + TO×(-1)
- `services/player_loader.py` — CSV→Supabase seeder (filters games_played >= 10)
- `services/bot_brain.py` — LangChain GPT-4o-mini with `.with_structured_output()` for bid decisions
- `services/game_engine.py` — Server-side game loop, stratified 12-player pool (3 elite/4 good/3 mid/2 role)

### Supabase Tables
- `users` (id UUID, username, created_at)
- `players` (id INTEGER from CSV personId, stats + computed fantasy_points)
- `bots` (id UUID, user_id FK, name, strategy_prompt)
- `games` (id UUID, user_id FK, bot1_id FK, bot2_id FK, scores, winner, game_log JSONB)
- `game_players` (game_id FK, bot_id FK, player_id FK, bid_amount, fantasy_points, draft_order)

## Frontend (`Fantasy Basketball Bidding Platform/`)

### Running
```bash
npm run dev   # Vite dev server on :5173, proxies /api → localhost:8000
```

### Key Files
- `src/app/utils/apiClient.ts` — Typed fetch wrapper for all API endpoints
- `src/app/data/players.ts` — Flat `Player` interface (first_name, last_name, ppg, rpg, apg, spg, bpg, fantasy_points)
- `src/app/App.tsx` — Main app, localStorage-based anonymous auth (username entry)
- `src/app/components/GameScreen.tsx` — Single POST to /api/games, shows loading spinner during ~15-30s game, animated log reveal
- `src/app/components/BotBuilder.tsx` — Bot CRUD, accepts userId prop
- `src/app/components/PlayerCard.tsx` — Flat player fields (no nested stats object)
- `src/app/components/Leaderboard.tsx` — Shows username + bot name + score
- `src/app/components/Profile.tsx` — User stats + game history, accepts userId prop
- `vite.config.ts` — `/api` proxy to `http://localhost:8000`

## Environment (`.env` in `backend/`)

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJ...  (anon public JWT, NOT the sb_secret_ service role key)
OPENAI_API_KEY=sk-proj-...
```

**Important**: The Supabase Python client requires the **anon public JWT key** (starts with `eyJ`), not the service role secret (starts with `sb_secret_`).

## Game Flow

1. User enters username → creates user in Supabase via POST /api/users
2. User creates 2+ bots with natural language strategy prompts
3. User selects 2 bots and clicks "Start Battle"
4. Frontend POSTs to /api/games → backend runs full game server-side:
   - Selects stratified 12-player pool from real NBA data
   - Bots alternate turns, GPT-4o-mini makes bid/counter/accept/fold decisions
   - Top 5 players per team by fantasy_points = final score
5. Frontend displays results with animated game log + team cards
