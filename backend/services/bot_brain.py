from openai import AsyncOpenAI
from pydantic import BaseModel, Field
from config import settings


class InitialBidAction(BaseModel):
    """Bot's initial bid: pick a player and set opening bid."""
    player_id: int = Field(description="ID of the player to bid on")
    amount: int = Field(description="Opening bid amount in credits")
    reasoning: str = Field(description="Brief explanation of the decision")


class BidResponseAction(BaseModel):
    """Bot's response to an existing bid."""
    action: str = Field(description="One of: counter, pass")
    amount: int = Field(default=0, description="Counter bid amount (only if action is counter)")
    reasoning: str = Field(description="Brief explanation of the decision")


def _build_client():
    return AsyncOpenAI(api_key=settings.openai_api_key)


def _format_player(p: dict) -> str:
    return (
        f"  ID:{p['id']} {p['first_name']} {p['last_name']} - "
        f"PPG:{p['ppg']} RPG:{p['rpg']} APG:{p['apg']} SPG:{p['spg']} BPG:{p['bpg']} "
        f"Fantasy:{p['fantasy_points']}"
    )


def _format_team(team: list[dict]) -> str:
    if not team:
        return "  (empty)"
    lines = []
    for p in team:
        lines.append(f"  {p['first_name']} {p['last_name']} (Fantasy:{p['fantasy_points']}, Cost:{p['bid_amount']})")
    return "\n".join(lines)


async def get_initial_bid(
    strategy: str,
    available_players: list[dict],
    balance: int,
    opponent_balance: int,
    my_team: list[dict],
    opponent_team: list[dict],
) -> InitialBidAction:
    client = _build_client()

    players_str = "\n".join(_format_player(p) for p in available_players)
    my_team_str = _format_team(my_team)
    opp_team_str = _format_team(opponent_team)

    prompt = f"""You are a fantasy basketball bidding bot. Your strategy is: "{strategy}"

AVAILABLE PLAYERS:
{players_str}

YOUR TEAM:
{my_team_str}

OPPONENT TEAM:
{opp_team_str}

YOUR BALANCE: {balance} credits
OPPONENT BALANCE: {opponent_balance} credits

RULES:
- Pick one available player and set an opening bid (minimum 1 credit)
- Your bid CANNOT exceed your balance of {balance}
- Only your top 5 players by fantasy points count for scoring
- Consider which players would most improve your team
- Consider blocking opponent from getting key players
- If your opponent has 0 credits, they cannot counter — you will win at any bid, so bid the minimum (1 credit)

Pick a player and opening bid amount. Follow your strategy."""

    completion = await client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        temperature=0.7,
        messages=[{"role": "user", "content": prompt}],
        response_format=InitialBidAction,
    )
    result = completion.choices[0].message.parsed

    # Validate
    valid_ids = {p["id"] for p in available_players}
    if result.player_id not in valid_ids:
        best = max(available_players, key=lambda p: p["fantasy_points"])
        result.player_id = best["id"]
    result.amount = max(1, min(result.amount, balance))

    return result


async def get_bid_response(
    strategy: str,
    player: dict,
    current_bid: int,
    bidder_name: str,
    balance: int,
    opponent_balance: int,
    my_team: list[dict],
    opponent_team: list[dict],
    available_players: list[dict],
) -> BidResponseAction:
    client = _build_client()

    my_team_str = _format_team(my_team)
    opp_team_str = _format_team(opponent_team)

    prompt = f"""You are a fantasy basketball bidding bot. Your strategy is: "{strategy}"

CURRENT BID:
  Player: {player['first_name']} {player['last_name']} (Fantasy: {player['fantasy_points']})
  Current bid: {current_bid} credits (by {bidder_name})

YOUR TEAM:
{my_team_str}

OPPONENT TEAM:
{opp_team_str}

YOUR BALANCE: {balance} credits
OPPONENT BALANCE: {opponent_balance} credits
REMAINING PLAYERS IN POOL: {len(available_players)}

RULES:
- "pass" = let the bidder win this player at the current price
- "counter" = raise the bid (must be higher than {current_bid}, cannot exceed your balance of {balance})
- Only your top 5 players by fantasy points count for scoring
- You have a maximum of 12 slots, but can only score for the top 5.
- If your opponent has 0 credits, they cannot counter — you will win at any bid
- Each player starts with 100 credits, meaing the average active roster player is worth about 20 credits.
Decide: counter or pass. Follow your strategy."""

    completion = await client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        temperature=0.7,
        messages=[{"role": "user", "content": prompt}],
        response_format=BidResponseAction,
    )
    result = completion.choices[0].message.parsed

    # Normalize: anything that isn't "counter" is a pass
    if result.action != "counter":
        result.action = "pass"

    if result.action == "counter":
        if result.amount <= current_bid or result.amount > balance:
            if current_bid + 1 <= balance:
                result.amount = min(current_bid + 1, balance)
            else:
                result.action = "pass"
                result.amount = 0

    return result
