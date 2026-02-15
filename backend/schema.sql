-- Fantasy Basketball Bidding Platform - Supabase DDL
-- Run this in the Supabase SQL Editor

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Players table (seeded from CSV)
CREATE TABLE players (
    id INTEGER PRIMARY KEY,  -- personId from CSV
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    games_played INTEGER NOT NULL,
    minutes FLOAT NOT NULL,
    points FLOAT NOT NULL,
    assists FLOAT NOT NULL,
    blocks FLOAT NOT NULL,
    steals FLOAT NOT NULL,
    rebounds_total FLOAT NOT NULL,
    turnovers FLOAT NOT NULL,
    ppg FLOAT NOT NULL,
    rpg FLOAT NOT NULL,
    apg FLOAT NOT NULL,
    spg FLOAT NOT NULL,
    bpg FLOAT NOT NULL,
    topg FLOAT NOT NULL,
    fantasy_points FLOAT NOT NULL
);

-- Bots table
CREATE TABLE bots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    strategy_prompt TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Games table
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bot1_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    bot2_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    bot1_score FLOAT DEFAULT 0,
    bot2_score FLOAT DEFAULT 0,
    winner_bot_id UUID REFERENCES bots(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    game_log JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Game players (draft results)
CREATE TABLE game_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES players(id),
    bid_amount INTEGER NOT NULL,
    fantasy_points FLOAT NOT NULL,
    draft_order INTEGER NOT NULL
);

-- Indexes
CREATE INDEX idx_games_user_id ON games(user_id);
CREATE INDEX idx_bots_user_id ON bots(user_id);
CREATE INDEX idx_game_players_game_id ON game_players(game_id);

-- RLS: Enable with permissive policies (hackathon mode)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on players" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on bots" ON bots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on games" ON games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on game_players" ON game_players FOR ALL USING (true) WITH CHECK (true);
