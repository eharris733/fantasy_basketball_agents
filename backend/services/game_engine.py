"""
Server-side game loop that replaces client-side GameScreen logic.
"""

import asyncio
import random
from database import get_supabase
from services.bot_brain import get_initial_bid, get_bid_response


def _select_player_pool() -> list[dict]:
    """
    Stratified random pick of 24 players:
    5 elite (40+), 7 good (25-40), 7 mid (15-25), 5 role (8-15 fantasy pts)
    """
    db = get_supabase()
    result = (
        db.table("players")
        .select("id, first_name, last_name, ppg, rpg, apg, spg, bpg, topg, fantasy_points")
        .gte("fantasy_points", 8)
        .order("fantasy_points", desc=True)
        .execute()
    )
    all_players = result.data

    elite = [p for p in all_players if p["fantasy_points"] >= 40]
    good = [p for p in all_players if 25 <= p["fantasy_points"] < 40]
    mid = [p for p in all_players if 15 <= p["fantasy_points"] < 25]
    role = [p for p in all_players if 8 <= p["fantasy_points"] < 15]

    pool = []
    pool.extend(random.sample(elite, min(5, len(elite))))
    pool.extend(random.sample(good, min(7, len(good))))
    pool.extend(random.sample(mid, min(7, len(mid))))
    pool.extend(random.sample(role, min(5, len(role))))

    while len(pool) < 24 and len(all_players) > len(pool):
        remaining = [p for p in all_players if p not in pool]
        if not remaining:
            break
        pool.append(random.choice(remaining))

    random.shuffle(pool)
    return pool[:24]


async def run_game_stream(bot1: dict, bot2: dict):
    """
    Async generator that yields event dicts as the game progresses.
    Event types: "log", "draft", "game_complete"
    """
    available = _select_player_pool()
    bot1_team: list[dict] = []
    bot2_team: list[dict] = []
    bot1_balance = 100
    bot2_balance = 100
    game_log: list[str] = []
    draft_order = 0

    current_turn = random.choice(["bot1", "bot2"])
    first_name = bot1["name"] if current_turn == "bot1" else bot2["name"]
    msg = f"Game started! {first_name} goes first."
    game_log.append(msg)
    yield {"type": "log", "message": msg}
    await asyncio.sleep(0)

    msg = "---"
    game_log.append(msg)
    yield {"type": "log", "message": msg}
    await asyncio.sleep(0)

    max_turns = 200
    turn_count = 0

    while available and turn_count < max_turns:
        turn_count += 1

        if bot1_balance == 0 and bot2_balance == 0:
            break

        active_bot = bot1 if current_turn == "bot1" else bot2
        active_balance = bot1_balance if current_turn == "bot1" else bot2_balance
        active_team = bot1_team if current_turn == "bot1" else bot2_team
        opponent_bot = bot2 if current_turn == "bot1" else bot1
        opponent_balance = bot2_balance if current_turn == "bot1" else bot1_balance
        opponent_team = bot2_team if current_turn == "bot1" else bot1_team

        if active_balance == 0:
            current_turn = "bot2" if current_turn == "bot1" else "bot1"
            continue

        try:
            initial = await get_initial_bid(
                strategy=active_bot["strategy_prompt"],
                available_players=available,
                balance=active_balance,
                opponent_balance=opponent_balance,
                my_team=active_team,
                opponent_team=opponent_team,
            )
        except Exception as e:
            msg = f"{active_bot['name']} had an error making a bid: {e}"
            game_log.append(msg)
            yield {"type": "log", "message": msg}
            await asyncio.sleep(0)
            current_turn = "bot2" if current_turn == "bot1" else "bot1"
            continue

        player = next((p for p in available if p["id"] == initial.player_id), None)
        if not player:
            current_turn = "bot2" if current_turn == "bot1" else "bot1"
            continue

        current_bid = initial.amount
        bidder = current_turn
        bidder_bot = active_bot

        msg = (
            f"{active_bot['name']} bids {current_bid} credits for "
            f"{player['first_name']} {player['last_name']} (Fantasy: {player['fantasy_points']})"
        )
        game_log.append(msg)
        yield {"type": "log", "message": msg}
        await asyncio.sleep(0)

        reasoning_msg = f"  💭 {active_bot['name']}: {initial.reasoning}"
        game_log.append(reasoning_msg)
        yield {"type": "log", "message": reasoning_msg}
        await asyncio.sleep(0)

        bid_rounds = 0
        max_bid_rounds = 20

        while bid_rounds < max_bid_rounds:
            bid_rounds += 1

            responding_turn = "bot2" if bidder == "bot1" else "bot1"
            responding_bot = bot2 if responding_turn == "bot2" else bot1
            responding_balance = bot2_balance if responding_turn == "bot2" else bot1_balance
            responding_team = bot2_team if responding_turn == "bot2" else bot1_team
            responding_opp_team = bot1_team if responding_turn == "bot2" else bot2_team

            if responding_balance == 0:
                msg = (
                    f"{responding_bot['name']} has no credits. "
                    f"{bidder_bot['name']} wins {player['first_name']} {player['last_name']} for {current_bid}!"
                )
                game_log.append(msg)
                yield {"type": "log", "message": msg}
                await asyncio.sleep(0)
                break

            try:
                response = await get_bid_response(
                    strategy=responding_bot["strategy_prompt"],
                    player=player,
                    current_bid=current_bid,
                    bidder_name=bidder_bot["name"],
                    balance=responding_balance,
                    opponent_balance=bot1_balance if responding_turn == "bot2" else bot2_balance,
                    my_team=responding_team,
                    opponent_team=responding_opp_team,
                    available_players=available,
                )
            except Exception as e:
                msg = f"{responding_bot['name']} had an error: {e}. Auto-folding."
                game_log.append(msg)
                yield {"type": "log", "message": msg}
                await asyncio.sleep(0)
                break

            reasoning_msg = f"  💭 {responding_bot['name']}: {response.reasoning}"
            game_log.append(reasoning_msg)
            yield {"type": "log", "message": reasoning_msg}
            await asyncio.sleep(0)

            if response.action == "counter":
                current_bid = response.amount
                bidder = responding_turn
                bidder_bot = responding_bot
                msg = f"{responding_bot['name']} counters with {current_bid} credits"
                game_log.append(msg)
                yield {"type": "log", "message": msg}
                await asyncio.sleep(0)
            elif response.action == "accept":
                msg = (
                    f"{responding_bot['name']} accepts. "
                    f"{bidder_bot['name']} wins {player['first_name']} {player['last_name']} for {current_bid}!"
                )
                game_log.append(msg)
                yield {"type": "log", "message": msg}
                await asyncio.sleep(0)
                break
            else:  # fold
                msg = (
                    f"{responding_bot['name']} folds. "
                    f"{bidder_bot['name']} wins {player['first_name']} {player['last_name']} for {current_bid}!"
                )
                game_log.append(msg)
                yield {"type": "log", "message": msg}
                await asyncio.sleep(0)
                break

        # Award player to bidder
        draft_order += 1
        pick = {
            "player_id": player["id"],
            "first_name": player["first_name"],
            "last_name": player["last_name"],
            "fantasy_points": player["fantasy_points"],
            "bid_amount": current_bid,
            "draft_order": draft_order,
        }

        if bidder == "bot1":
            bot1_team.append(pick)
            bot1_balance -= current_bid
        else:
            bot2_team.append(pick)
            bot2_balance -= current_bid

        available = [p for p in available if p["id"] != player["id"]]

        # Emit draft event with updated state
        yield {
            "type": "draft",
            "bot_key": bidder,
            "player": pick,
            "bot1_balance": bot1_balance,
            "bot2_balance": bot2_balance,
        }
        await asyncio.sleep(0)

        msg = f"  Balances: {bot1['name']}={bot1_balance}, {bot2['name']}={bot2_balance}"
        game_log.append(msg)
        yield {"type": "log", "message": msg}
        await asyncio.sleep(0)

        msg = "---"
        game_log.append(msg)
        yield {"type": "log", "message": msg}
        await asyncio.sleep(0)

        current_turn = "bot2" if bidder == "bot1" else "bot1"

    # Calculate scores (top 5 by fantasy points)
    bot1_sorted = sorted(bot1_team, key=lambda p: p["fantasy_points"], reverse=True)
    bot2_sorted = sorted(bot2_team, key=lambda p: p["fantasy_points"], reverse=True)
    bot1_top5 = bot1_sorted[:5]
    bot2_top5 = bot2_sorted[:5]
    bot1_score = round(sum(p["fantasy_points"] for p in bot1_top5), 1)
    bot2_score = round(sum(p["fantasy_points"] for p in bot2_top5), 1)

    msg = "=== GAME COMPLETE ==="
    game_log.append(msg)
    yield {"type": "log", "message": msg}
    await asyncio.sleep(0)

    msg = f"{bot1['name']}: {len(bot1_team)} players drafted, Top 5 score: {bot1_score}"
    game_log.append(msg)
    yield {"type": "log", "message": msg}
    await asyncio.sleep(0)

    msg = f"{bot2['name']}: {len(bot2_team)} players drafted, Top 5 score: {bot2_score}"
    game_log.append(msg)
    yield {"type": "log", "message": msg}
    await asyncio.sleep(0)

    winner = bot1["name"] if bot1_score > bot2_score else bot2["name"]
    if bot1_score == bot2_score:
        winner = "Tie!"
    msg = f"Winner: {winner}"
    game_log.append(msg)
    yield {"type": "log", "message": msg}
    await asyncio.sleep(0)

    yield {
        "type": "game_complete",
        "bot1_score": bot1_score,
        "bot2_score": bot2_score,
        "bot1_team": bot1_team,
        "bot2_team": bot2_team,
        "game_log": game_log,
    }
    await asyncio.sleep(0)


async def run_game(bot1: dict, bot2: dict) -> dict:
    """
    Run a full game between two bots. Returns scores, teams, and game log.
    Backward-compatible wrapper around run_game_stream.
    """
    result = None
    async for event in run_game_stream(bot1, bot2):
        if event["type"] == "game_complete":
            result = event
    return result
