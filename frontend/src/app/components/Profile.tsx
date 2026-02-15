import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { User, History, TrendingUp, Cpu } from "lucide-react";
import * as api from "../utils/apiClient";

interface Bot {
  id: string;
  name: string;
  strategy: string;
  createdAt: string;
}

interface ProfileProps {
  userId: string;
  bots: Bot[];
}

export function Profile({ userId, bots }: ProfileProps) {
  const [games, setGames] = useState<api.GameResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      const data = await api.getUserGames(userId);
      setGames(data);
    } catch (error) {
      console.error("Error loading games:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = {
    totalGames: games.length,
    avgScore:
      games.length > 0
        ? games.reduce((sum, g) => sum + Math.max(g.bot1_score, g.bot2_score), 0) / games.length
        : 0,
    highScore:
      games.length > 0
        ? Math.max(...games.map((g) => Math.max(g.bot1_score, g.bot2_score)))
        : 0,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Stats Overview */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-5" />
            Your Profile
          </CardTitle>
          <CardDescription>Performance statistics and game history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <History className="size-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalGames}</p>
              <p className="text-sm text-muted-foreground">Games Played</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <TrendingUp className="size-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.avgScore.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Average Score</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <Badge className="mb-2 text-lg px-3 py-1">High Score</Badge>
              <p className="text-2xl font-bold">{stats.highScore.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Personal Best</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Your Bots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="size-5" />
            Your Bots ({bots.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {bots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No bots created yet
              </p>
            ) : (
              bots.map((bot) => (
                <div key={bot.id} className="p-3 border rounded-lg">
                  <h4 className="font-semibold">{bot.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{bot.strategy}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Game History */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-5" />
            Recent Games
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading games...</p>
          ) : games.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No games played yet. Create some bots and start battling!
            </p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {games.map((game) => (
                <Card key={game.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Cpu className="size-4" />
                        <span className="font-medium">{game.bot1_name}</span>
                        <span className="text-muted-foreground">vs</span>
                        <Cpu className="size-4" />
                        <span className="font-medium">{game.bot2_name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(game.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={game.bot1_score > game.bot2_score ? "default" : "outline"}>
                      {Math.max(game.bot1_score, game.bot2_score).toFixed(1)} pts
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <p className="text-muted-foreground">
                      {game.bot1_name} - {game.bot1_score.toFixed(1)} pts
                    </p>
                    <p className="text-muted-foreground">
                      {game.bot2_name} - {game.bot2_score.toFixed(1)} pts
                    </p>
                  </div>

                  {game.bot1_team.length > 0 && (
                    <>
                      <Separator className="my-3" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Winning Team
                        </p>
                        <div className="space-y-1">
                          {(game.bot1_score >= game.bot2_score
                            ? game.bot1_team
                            : game.bot2_team
                          )
                            .sort((a, b) => b.fantasy_points - a.fantasy_points)
                            .slice(0, 5)
                            .map((p) => (
                              <div
                                key={p.player_id}
                                className="flex items-center justify-between text-xs"
                              >
                                <span>
                                  {p.first_name} {p.last_name}
                                </span>
                                <span className="text-muted-foreground">
                                  {p.fantasy_points.toFixed(1)} pts
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
