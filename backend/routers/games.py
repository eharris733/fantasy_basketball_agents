import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from database import get_supabase
from models import GameRequest, GameResponse, GamePlayerResult
from services.game_engine import run_game, run_game_stream

router = APIRouter(tags=["games"])


@router.post("/games", response_model=GameResponse)
async def create_game(body: GameRequest):
    db = get_supabase()

    # Load both bots
    bot1_res = db.table("bots").select("*").eq("id", body.bot1_id).execute()
    bot2_res = db.table("bots").select("*").eq("id", body.bot2_id).execute()

    if not bot1_res.data or not bot2_res.data:
        raise HTTPException(status_code=404, detail="One or both bots not found")

    bot1 = bot1_res.data[0]
    bot2 = bot2_res.data[0]

    # Run the game
    result = await run_game(bot1, bot2)

    # Determine winner
    winner_bot_id = None
    if result["bot1_score"] > result["bot2_score"]:
        winner_bot_id = body.bot1_id
    elif result["bot2_score"] > result["bot1_score"]:
        winner_bot_id = body.bot2_id

    # Save game record
    game_row = {
        "user_id": body.user_id,
        "bot1_id": body.bot1_id,
        "bot2_id": body.bot2_id,
        "bot1_score": result["bot1_score"],
        "bot2_score": result["bot2_score"],
        "winner_bot_id": winner_bot_id,
        "status": "complete",
        "game_log": result["game_log"],
    }
    game_res = db.table("games").insert(game_row).execute()
    if not game_res.data:
        raise HTTPException(status_code=500, detail="Failed to save game")
    game = game_res.data[0]

    # Save drafted players
    draft_rows = []
    for order, pick in enumerate(result["bot1_team"]):
        draft_rows.append(
            {
                "game_id": game["id"],
                "bot_id": body.bot1_id,
                "player_id": pick["player_id"],
                "bid_amount": pick["bid_amount"],
                "fantasy_points": pick["fantasy_points"],
                "draft_order": order + 1,
            }
        )
    for order, pick in enumerate(result["bot2_team"]):
        draft_rows.append(
            {
                "game_id": game["id"],
                "bot_id": body.bot2_id,
                "player_id": pick["player_id"],
                "bid_amount": pick["bid_amount"],
                "fantasy_points": pick["fantasy_points"],
                "draft_order": order + 1,
            }
        )
    if draft_rows:
        db.table("game_players").insert(draft_rows).execute()

    # Build response with player details
    def build_team_response(team_picks):
        items = []
        for pick in team_picks:
            items.append(
                GamePlayerResult(
                    player_id=pick["player_id"],
                    first_name=pick["first_name"],
                    last_name=pick["last_name"],
                    fantasy_points=pick["fantasy_points"],
                    bid_amount=pick["bid_amount"],
                    draft_order=pick.get("draft_order", 0),
                )
            )
        return items

    return GameResponse(
        id=game["id"],
        user_id=body.user_id,
        bot1_id=body.bot1_id,
        bot2_id=body.bot2_id,
        bot1_name=bot1["name"],
        bot2_name=bot2["name"],
        bot1_score=result["bot1_score"],
        bot2_score=result["bot2_score"],
        winner_bot_id=winner_bot_id,
        status="complete",
        game_log=result["game_log"],
        bot1_team=build_team_response(result["bot1_team"]),
        bot2_team=build_team_response(result["bot2_team"]),
        created_at=game["created_at"],
    )


@router.post("/games/stream")
async def stream_game(body: GameRequest):
    db = get_supabase()

    bot1_res = db.table("bots").select("*").eq("id", body.bot1_id).execute()
    bot2_res = db.table("bots").select("*").eq("id", body.bot2_id).execute()

    if not bot1_res.data or not bot2_res.data:
        raise HTTPException(status_code=404, detail="One or both bots not found")

    bot1 = bot1_res.data[0]
    bot2 = bot2_res.data[0]

    async def event_generator():
        game_result = None
        async for event in run_game_stream(bot1, bot2):
            event_type = event["type"]
            yield f"event: {event_type}\ndata: {json.dumps(event)}\n\n"

            if event_type == "game_complete":
                game_result = event

        # Save to DB after game completes
        if game_result:
            winner_bot_id = None
            if game_result["bot1_score"] > game_result["bot2_score"]:
                winner_bot_id = body.bot1_id
            elif game_result["bot2_score"] > game_result["bot1_score"]:
                winner_bot_id = body.bot2_id

            game_row = {
                "user_id": body.user_id,
                "bot1_id": body.bot1_id,
                "bot2_id": body.bot2_id,
                "bot1_score": game_result["bot1_score"],
                "bot2_score": game_result["bot2_score"],
                "winner_bot_id": winner_bot_id,
                "status": "complete",
                "game_log": game_result["game_log"],
            }
            game_res = db.table("games").insert(game_row).execute()

            if game_res.data:
                game = game_res.data[0]
                game_id = game["id"]

                draft_rows = []
                for order, pick in enumerate(game_result["bot1_team"]):
                    draft_rows.append({
                        "game_id": game_id,
                        "bot_id": body.bot1_id,
                        "player_id": pick["player_id"],
                        "bid_amount": pick["bid_amount"],
                        "fantasy_points": pick["fantasy_points"],
                        "draft_order": order + 1,
                    })
                for order, pick in enumerate(game_result["bot2_team"]):
                    draft_rows.append({
                        "game_id": game_id,
                        "bot_id": body.bot2_id,
                        "player_id": pick["player_id"],
                        "bid_amount": pick["bid_amount"],
                        "fantasy_points": pick["fantasy_points"],
                        "draft_order": order + 1,
                    })
                if draft_rows:
                    db.table("game_players").insert(draft_rows).execute()

                yield f"event: saved\ndata: {json.dumps({'game_id': game_id})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/games/user/{user_id}", response_model=list[GameResponse])
def get_user_games(user_id: str):
    db = get_supabase()

    games_res = (
        db.table("games")
        .select("*, bots!games_bot1_id_fkey(name), bot2:bots!games_bot2_id_fkey(name)")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )

    results = []
    for g in games_res.data:
        # Get game players
        gp_res = (
            db.table("game_players")
            .select("*, players(first_name, last_name)")
            .eq("game_id", g["id"])
            .order("draft_order")
            .execute()
        )

        bot1_team = []
        bot2_team = []
        for gp in gp_res.data:
            item = GamePlayerResult(
                player_id=gp["player_id"],
                first_name=gp["players"]["first_name"],
                last_name=gp["players"]["last_name"],
                fantasy_points=gp["fantasy_points"],
                bid_amount=gp["bid_amount"],
                draft_order=gp["draft_order"],
            )
            if gp["bot_id"] == g["bot1_id"]:
                bot1_team.append(item)
            else:
                bot2_team.append(item)

        bot1_name = g["bots"]["name"] if g.get("bots") else "Bot 1"
        bot2_name = g["bot2"]["name"] if g.get("bot2") else "Bot 2"

        results.append(
            GameResponse(
                id=g["id"],
                user_id=g["user_id"],
                bot1_id=g["bot1_id"],
                bot2_id=g["bot2_id"],
                bot1_name=bot1_name,
                bot2_name=bot2_name,
                bot1_score=g["bot1_score"],
                bot2_score=g["bot2_score"],
                winner_bot_id=g["winner_bot_id"],
                status=g["status"],
                game_log=g["game_log"] or [],
                bot1_team=bot1_team,
                bot2_team=bot2_team,
                created_at=g["created_at"],
            )
        )

    return results
