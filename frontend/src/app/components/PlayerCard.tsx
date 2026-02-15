import { Player } from "../data/players";
import { Card, CardContent } from "./ui/card";

interface PlayerCardProps {
  player: Player;
  showDetailed?: boolean;
  compact?: boolean;
}

export function PlayerCard({ player, showDetailed = false, compact = false }: PlayerCardProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 py-1">
        <span className="font-medium text-sm">
          {player.first_name} {player.last_name}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          {player.fantasy_points.toFixed(1)} pts
        </span>
      </div>
    );
  }

  return (
    <Card className="hover:border-primary transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold">
            {player.first_name} {player.last_name}
          </h3>
          <span className="text-sm font-semibold text-primary">
            {player.fantasy_points.toFixed(1)} FP
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">PPG</p>
            <p className="font-medium">{player.ppg.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">RPG</p>
            <p className="font-medium">{player.rpg.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">APG</p>
            <p className="font-medium">{player.apg.toFixed(1)}</p>
          </div>
        </div>

        {showDetailed && (
          <div className="mt-3 pt-3 border-t">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">SPG</p>
                <p className="font-medium">{player.spg.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">BPG</p>
                <p className="font-medium">{player.bpg.toFixed(1)}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
