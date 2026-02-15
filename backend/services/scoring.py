def calculate_fantasy_points(ppg: float, rpg: float, apg: float, spg: float, bpg: float, topg: float) -> float:
    """
    Fantasy point formula (per-game averages):
    Points: 1x | Rebounds: 1.2x | Assists: 1.5x | Steals: 3x | Blocks: 3x | Turnovers: -1x
    """
    return (ppg * 1.0) + (rpg * 1.2) + (apg * 1.5) + (spg * 3.0) + (bpg * 3.0) + (topg * -1.0)
