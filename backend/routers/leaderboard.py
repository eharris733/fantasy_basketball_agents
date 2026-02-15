from fastapi import APIRouter, Query
from database import get_supabase
from models import LeaderboardEntry

router = APIRouter(tags=["leaderboard"])


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
def get_leaderboard(limit: int = Query(20, ge=1, le=100)):
    db = get_supabase()

    # Get top game scores with user and bot names
    result = (
        db.table("games")
        .select("id, bot1_score, bot2_score, winner_bot_id, created_at, user_id, users(username), bots!games_bot1_id_fkey(name), bot2:bots!games_bot2_id_fkey(name)")
        .eq("status", "complete")
        .order("bot1_score", desc=True)  # We'll sort in code since we need max of bot1/bot2
        .limit(limit * 2)  # Fetch extra since we re-sort
        .execute()
    )

    entries = []
    for g in result.data:
        # Determine winning score and which bot won
        if g["bot1_score"] >= g["bot2_score"]:
            score = g["bot1_score"]
            bot_name = g["bots"]["name"] if g.get("bots") else "Bot 1"
        else:
            score = g["bot2_score"]
            bot_name = g["bot2"]["name"] if g.get("bot2") else "Bot 2"

        username = g["users"]["username"] if g.get("users") else "Unknown"

        entries.append(
            LeaderboardEntry(
                game_id=g["id"],
                username=username,
                bot_name=bot_name,
                score=score,
                created_at=g["created_at"],
            )
        )

    # Sort by score descending and take top N
    entries.sort(key=lambda e: e.score, reverse=True)
    return entries[:limit]
