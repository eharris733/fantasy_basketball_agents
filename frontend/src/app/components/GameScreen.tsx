import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Trophy, Cpu } from "lucide-react";
import * as api from "../utils/apiClient";

interface Bot {
  id: string;
  name: string;
  strategy: string;
}

interface GameScreenProps {
  userId: string;
  bot1: Bot;
  bot2: Bot;
  onBackToSetup?: () => void;
}

type Phase = "streaming" | "complete" | "error";

export function GameScreen({ userId, bot1, bot2, onBackToSetup }: GameScreenProps) {
  const [phase, setPhase] = useState<Phase>("streaming");
  const [error, setError] = useState<string | null>(null);
  const [logEntries, setLogEntries] = useState<string[]>([]);
  const [bot1Team, setBot1Team] = useState<api.DraftPick[]>([]);
  const [bot2Team, setBot2Team] = useState<api.DraftPick[]>([]);
  const [bot1Balance, setBot1Balance] = useState(100);
  const [bot2Balance, setBot2Balance] = useState(100);
  const [bot1Score, setBot1Score] = useState(0);
  const [bot2Score, setBot2Score] = useState(0);
  const [winnerBotId, setWinnerBotId] = useState<string | null>(null);

  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logEntries]);

  const startGame = useCallback(() => {
    setPhase("streaming");
    setError(null);
    setLogEntries([]);
    setBot1Team([]);
    setBot2Team([]);
    setBot1Balance(100);
    setBot2Balance(100);
    setBot1Score(0);
    setBot2Score(0);
    setWinnerBotId(null);

    api.streamGame(userId, bot1.id, bot2.id, {
      onLog: (message) => {
        setLogEntries((prev) => [...prev, message]);
      },
      onDraft: (event) => {
        if (event.bot_key === "bot1") {
          setBot1Team((prev) => [...prev, event.player]);
        } else {
          setBot2Team((prev) => [...prev, event.player]);
        }
        setBot1Balance(event.bot1_balance);
        setBot2Balance(event.bot2_balance);
      },
      onGameComplete: (event) => {
        setBot1Score(event.bot1_score);
        setBot2Score(event.bot2_score);
        if (event.bot1_score > event.bot2_score) {
          setWinnerBotId(bot1.id);
        } else if (event.bot2_score > event.bot1_score) {
          setWinnerBotId(bot2.id);
        }
        setPhase("complete");
      },
      onSaved: () => {},
      onError: (err) => {
        setError(err);
        setPhase("error");
      },
    });
  }, [userId, bot1.id, bot2.id]);

  useEffect(() => {
    startGame();
  }, []);

  if (phase === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-lg font-medium text-destructive">Game Error</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <div className="flex gap-2">
          <Button onClick={startGame}>Retry</Button>
          {onBackToSetup && (
            <Button variant="outline" onClick={onBackToSetup}>
              Back to Setup
            </Button>
          )}
        </div>
      </div>
    );
  }

  const isStreaming = phase === "streaming";

  return (
    <div className="space-y-4">
      {/* Score Banner */}
      <Card className={isStreaming ? "bg-muted" : "bg-primary text-primary-foreground"}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <Cpu className="size-5" />
              <span className="font-bold text-lg">{bot1.name}</span>
              {isStreaming ? (
                <span className="text-sm text-muted-foreground">{bot1Balance} credits</span>
              ) : (
                <span className="text-2xl font-bold">{bot1Score.toFixed(1)}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-medium ${isStreaming ? "" : "opacity-75"}`}>vs</span>
              {isStreaming && (
                <Badge variant="destructive" className="animate-pulse">
                  LIVE
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isStreaming ? (
                <span className="text-sm text-muted-foreground">{bot2Balance} credits</span>
              ) : (
                <span className="text-2xl font-bold">{bot2Score.toFixed(1)}</span>
              )}
              <span className="font-bold text-lg">{bot2.name}</span>
              <Cpu className="size-5" />
            </div>
          </div>
          {!isStreaming && winnerBotId && (
            <p className="text-center text-sm mt-2 opacity-90">
              <Trophy className="size-4 inline mr-1" />
              Winner: {winnerBotId === bot1.id ? bot1.name : bot2.name}
            </p>
          )}
          {!isStreaming && !winnerBotId && (
            <p className="text-center text-sm mt-2 opacity-90">Tie!</p>
          )}
        </CardContent>
      </Card>

      {/* Game Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Bot 1 Team */}
        <TeamCard
          name={bot1.name}
          team={bot1Team}
          balance={bot1Balance}
          score={bot1Score}
          isStreaming={isStreaming}
        />

        {/* Center: Game Log */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Game Log</CardTitle>
              {isStreaming && (
                <Badge variant="outline" className="animate-pulse">
                  Streaming...
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {logEntries.map((log, i) => (
                <p
                  key={i}
                  className={`text-xs ${
                    log.startsWith("===") ? "font-bold text-primary mt-2" : ""
                  } ${log === "---" ? "border-b my-1" : ""} ${
                    log.trimStart().startsWith("💭") ? "italic text-muted-foreground pl-2" : ""
                  }`}
                >
                  {log !== "---" ? log : ""}
                </p>
              ))}
              <div ref={logEndRef} />
            </div>

            {!isStreaming && (
              <>
                <Separator className="my-4" />
                <div className="flex gap-2">
                  {onBackToSetup && (
                    <Button variant="outline" onClick={onBackToSetup} className="flex-1">
                      Back to Setup
                    </Button>
                  )}
                  <Button onClick={startGame} className="flex-1">
                    Play Again
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right: Bot 2 Team */}
        <TeamCard
          name={bot2.name}
          team={bot2Team}
          balance={bot2Balance}
          score={bot2Score}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
}

function TeamCard({
  name,
  team,
  balance,
  score,
  isStreaming,
}: {
  name: string;
  team: api.DraftPick[];
  balance: number;
  score: number;
  isStreaming: boolean;
}) {
  const sorted = [...team].sort((a, b) => b.fantasy_points - a.fantasy_points);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Cpu className="size-5" />
          {name}
        </CardTitle>
        <div className="flex gap-2">
          <Badge variant="outline">
            {team.length} Players ({Math.min(team.length, 5)} active)
          </Badge>
          {isStreaming && (
            <Badge variant="secondary">{balance} credits</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.map((p, index) => (
          <div
            key={p.player_id}
            className={`flex items-center justify-between py-1 ${
              index >= 5 ? "opacity-50" : ""
            }`}
          >
            <span className="font-medium text-sm">
              {p.first_name} {p.last_name}
            </span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{p.bid_amount}cr</span>
              <span className="font-semibold text-foreground">
                {p.fantasy_points.toFixed(1)} pts
              </span>
            </div>
          </div>
        ))}
        {team.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {isStreaming ? "Waiting for picks..." : "No players drafted"}
          </p>
        )}
        <Separator className="my-2" />
        <div className="text-sm">
          <p className="text-muted-foreground">Top 5 Score</p>
          <p className="text-2xl font-bold">
            {isStreaming
              ? sorted.slice(0, 5).reduce((s, p) => s + p.fantasy_points, 0).toFixed(1)
              : score.toFixed(1)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
