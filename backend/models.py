from pydantic import BaseModel
from typing import Optional


# --- Users ---

class UserCreate(BaseModel):
    username: str


class UserResponse(BaseModel):
    id: str
    username: str
    created_at: str


# --- Bots ---

class BotCreate(BaseModel):
    user_id: str
    name: str
    strategy_prompt: str


class BotUpdate(BaseModel):
    name: Optional[str] = None
    strategy_prompt: Optional[str] = None


class BotResponse(BaseModel):
    id: str
    user_id: str
    name: str
    strategy_prompt: str
    created_at: str
    updated_at: str


# --- Games ---

class GameRequest(BaseModel):
    user_id: str
    bot1_id: str
    bot2_id: str


class GamePlayerResult(BaseModel):
    player_id: int
    first_name: str
    last_name: str
    fantasy_points: float
    bid_amount: int
    draft_order: int


class GameResponse(BaseModel):
    id: str
    user_id: str
    bot1_id: str
    bot2_id: str
    bot1_name: str
    bot2_name: str
    bot1_score: float
    bot2_score: float
    winner_bot_id: Optional[str]
    status: str
    game_log: list[str]
    bot1_team: list[GamePlayerResult]
    bot2_team: list[GamePlayerResult]
    created_at: str


# --- Players ---

class PlayerResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    games_played: int
    ppg: float
    rpg: float
    apg: float
    spg: float
    bpg: float
    topg: float
    fantasy_points: float


# --- Leaderboard ---

class LeaderboardEntry(BaseModel):
    game_id: str
    username: str
    bot_name: str
    score: float
    created_at: str


# --- Bot Brain ---

class BotBidAction(BaseModel):
    action: str  # "bid", "counter", "pass"
    player_id: Optional[int] = None
    amount: Optional[int] = None
    reasoning: str
