"""
CSV -> Supabase player seeder.

Usage:
    cd backend
    python -m services.player_loader ../active_players_stats.csv
"""

import sys
import pandas as pd
from services.scoring import calculate_fantasy_points


def load_players(csv_path: str):
    df = pd.read_csv(csv_path)

    # Compute per-game averages
    df = df[df["gamesPlayed"] >= 10].copy()  # Filter viable players
    gp = df["gamesPlayed"]
    df["ppg"] = (df["points"] / gp).round(2)
    df["rpg"] = (df["reboundsTotal"] / gp).round(2)
    df["apg"] = (df["assists"] / gp).round(2)
    df["spg"] = (df["steals"] / gp).round(2)
    df["bpg"] = (df["blocks"] / gp).round(2)
    df["topg"] = (df["turnovers"] / gp).round(2)

    df["fantasy_points"] = df.apply(
        lambda r: round(
            calculate_fantasy_points(r["ppg"], r["rpg"], r["apg"], r["spg"], r["bpg"], r["topg"]),
            2,
        ),
        axis=1,
    )

    rows = []
    for _, r in df.iterrows():
        rows.append(
            {
                "id": int(r["personId"]),
                "first_name": r["firstName"],
                "last_name": r["lastName"],
                "games_played": int(r["gamesPlayed"]),
                "minutes": float(r["numMinutes"]),
                "points": float(r["points"]),
                "assists": float(r["assists"]),
                "blocks": float(r["blocks"]),
                "steals": float(r["steals"]),
                "rebounds_total": float(r["reboundsTotal"]),
                "turnovers": float(r["turnovers"]),
                "ppg": float(r["ppg"]),
                "rpg": float(r["rpg"]),
                "apg": float(r["apg"]),
                "spg": float(r["spg"]),
                "bpg": float(r["bpg"]),
                "topg": float(r["topg"]),
                "fantasy_points": float(r["fantasy_points"]),
            }
        )

    return rows


def seed_supabase(rows: list[dict]):
    from database import get_supabase

    db = get_supabase()
    # Upsert in batches of 100
    for i in range(0, len(rows), 100):
        batch = rows[i : i + 100]
        db.table("players").upsert(batch).execute()
    print(f"Seeded {len(rows)} players into Supabase")


if __name__ == "__main__":
    csv_path = sys.argv[1] if len(sys.argv) > 1 else "../active_players_stats.csv"
    rows = load_players(csv_path)
    print(f"Loaded {len(rows)} players from CSV (games_played >= 10)")
    seed_supabase(rows)
