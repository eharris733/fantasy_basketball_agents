import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import * as api from "../utils/apiClient";

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<api.LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await api.getLeaderboard();
      setLeaderboard(data);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="size-6 text-yellow-500" />;
      case 1:
        return <Medal className="size-6 text-gray-400" />;
      case 2:
        return <Award className="size-6 text-orange-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-5" />
          Global Leaderboard
        </CardTitle>
        <CardDescription>
          Top scores across all bot battles. The highest fantasy team score wins!
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">Loading leaderboard...</p>
        ) : leaderboard.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No games played yet. Be the first to compete!
          </p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.game_id}
                className={`flex items-center gap-4 p-3 rounded-lg ${
                  index < 3 ? "bg-muted" : "hover:bg-muted/50"
                } transition-colors`}
              >
                <div className="flex items-center justify-center w-12">
                  {getRankIcon(index)}
                </div>

                <div className="flex-1">
                  <p className="font-medium">{entry.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.bot_name} &middot;{" "}
                    {new Date(entry.created_at).toLocaleDateString()}
                  </p>
                </div>

                <Badge
                  variant={index < 3 ? "default" : "outline"}
                  className="text-lg px-3 py-1"
                >
                  {entry.score.toFixed(1)} pts
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
