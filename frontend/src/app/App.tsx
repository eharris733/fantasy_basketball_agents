import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Input } from "./components/ui/input";
import { GameScreen } from "./components/GameScreen";
import { BotBuilder } from "./components/BotBuilder";
import { Leaderboard } from "./components/Leaderboard";
import { Profile } from "./components/Profile";
import { Trophy, Cpu, Settings, PlayCircle } from "lucide-react";
import * as api from "./utils/apiClient";

interface Bot {
  id: string;
  name: string;
  strategy: string;
  createdAt: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState("setup");
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBot1, setSelectedBot1] = useState<string>("");
  const [selectedBot2, setSelectedBot2] = useState<string>("");
  const [isLoadingBots, setIsLoadingBots] = useState(true);
  const [gameKey, setGameKey] = useState(0);

  // Anonymous auth via localStorage
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem("userId"));
  const [username, setUsername] = useState<string>("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  useEffect(() => {
    if (userId) loadBots();
  }, [userId]);

  const handleCreateUser = async () => {
    if (!username.trim()) return;
    setIsCreatingUser(true);
    try {
      const user = await api.createUser(username.trim());
      localStorage.setItem("userId", user.id);
      localStorage.setItem("username", user.username);
      setUserId(user.id);
    } catch (error) {
      console.error("Error creating user:", error);
      alert("Failed to create user. Is the backend running?");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const loadBots = async () => {
    if (!userId) return;
    setIsLoadingBots(true);
    try {
      const data = await api.getUserBots(userId);
      setBots(
        data.map((b) => ({
          id: b.id,
          name: b.name,
          strategy: b.strategy_prompt,
          createdAt: b.created_at,
        }))
      );
    } catch (error) {
      console.error("Error loading bots:", error);
    } finally {
      setIsLoadingBots(false);
    }
  };

  const handleStartGame = () => {
    if (!selectedBot1 || !selectedBot2) {
      alert("Please select two bots to battle!");
      return;
    }
    if (selectedBot1 === selectedBot2) {
      alert("Please select two different bots!");
      return;
    }
    setGameKey((prev) => prev + 1);
    setActiveTab("game");
  };

  const getBot = (botId: string) => bots.find((b) => b.id === botId);

  // Show username entry if no user yet
  if (!userId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Trophy className="size-12 mx-auto text-primary mb-2" />
            <CardTitle className="text-2xl">Fantasy Basketball Bidder</CardTitle>
            <CardDescription>Enter a username to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateUser()}
            />
            <Button
              onClick={handleCreateUser}
              disabled={!username.trim() || isCreatingUser}
              className="w-full"
            >
              {isCreatingUser ? "Creating..." : "Start Playing"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="size-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Fantasy Basketball Bidder</h1>
                <p className="text-sm text-muted-foreground">
                  Build bots, battle for players, dominate the leaderboard
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {localStorage.getItem("username")}
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="setup" className="gap-2">
              <PlayCircle className="size-4" />
              <span className="hidden sm:inline">Setup</span>
            </TabsTrigger>
            <TabsTrigger
              value="game"
              className="gap-2"
              disabled={!selectedBot1 || !selectedBot2}
            >
              <Cpu className="size-4" />
              <span className="hidden sm:inline">Game</span>
            </TabsTrigger>
            <TabsTrigger value="builder" className="gap-2">
              <Settings className="size-4" />
              <span className="hidden sm:inline">Bot Builder</span>
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-2">
              <Trophy className="size-4" />
              <span className="hidden sm:inline">Leaderboard</span>
            </TabsTrigger>
          </TabsList>

          {/* Setup Tab */}
          <TabsContent value="setup" className="space-y-6">
            {/* Game Info Banner */}
            <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <CardContent className="py-6">
                <div className="text-center space-y-2">
                  <p className="text-sm opacity-90">Bot vs Bot Battle</p>
                  <p className="text-3xl font-bold">Random Player Pool</p>
                  <p className="text-sm opacity-90">
                    12 NBA players selected from 698 real stat lines
                  </p>
                  <p className="text-xs opacity-75 mt-2">
                    Draft your fantasy team from a stratified mix of elite, good, mid, and role
                    players
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Game Setup</CardTitle>
                  <CardDescription>
                    Select two bots to battle. They'll bid against each other to build the best
                    5-player team using 100 credits each.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingBots ? (
                    <p className="text-sm text-muted-foreground">Loading bots...</p>
                  ) : bots.length < 2 ? (
                    <div className="text-center py-8 space-y-4">
                      <p className="text-sm text-muted-foreground">
                        You need at least 2 bots to start a game.
                      </p>
                      <Button onClick={() => setActiveTab("builder")}>
                        <Settings className="size-4 mr-2" />
                        Create Bots
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Bot 1</label>
                        <Select value={selectedBot1} onValueChange={setSelectedBot1}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select first bot" />
                          </SelectTrigger>
                          <SelectContent>
                            {bots.map((bot) => (
                              <SelectItem key={bot.id} value={bot.id}>
                                <div className="flex items-center gap-2">
                                  <Cpu className="size-4" />
                                  {bot.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedBot1 && getBot(selectedBot1) && (
                          <p className="text-xs text-muted-foreground">
                            Strategy: {getBot(selectedBot1)!.strategy}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Bot 2</label>
                        <Select value={selectedBot2} onValueChange={setSelectedBot2}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select second bot" />
                          </SelectTrigger>
                          <SelectContent>
                            {bots.map((bot) => (
                              <SelectItem
                                key={bot.id}
                                value={bot.id}
                                disabled={bot.id === selectedBot1}
                              >
                                <div className="flex items-center gap-2">
                                  <Cpu className="size-4" />
                                  {bot.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedBot2 && getBot(selectedBot2) && (
                          <p className="text-xs text-muted-foreground">
                            Strategy: {getBot(selectedBot2)!.strategy}
                          </p>
                        )}
                      </div>

                      <Button
                        onClick={handleStartGame}
                        disabled={!selectedBot1 || !selectedBot2}
                        className="w-full"
                        size="lg"
                      >
                        <PlayCircle className="size-5 mr-2" />
                        Start Battle
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>How to Play</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <h4 className="font-semibold mb-1">🎯 Objective</h4>
                    <p className="text-muted-foreground">
                      Draft players from a random pool of real NBA players. Only your top 5 players
                      (by fantasy points) count toward your final score.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">💰 Budget</h4>
                    <p className="text-muted-foreground">
                      Each bot starts with 100 credits. Bots can NEVER go negative - they must
                      always have at least 0 credits.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">🤝 Bidding</h4>
                    <p className="text-muted-foreground">
                      Bots take turns proposing players and bids. The opponent can accept,
                      counter-bid, or fold. GPT-4o-mini powers each bot's decisions based on your
                      strategy prompt.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">🛡️ Blocking</h4>
                    <p className="text-muted-foreground">
                      Bots can draft MORE than 5 players to block opponents from getting key
                      players, but only the top 5 count for scoring.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">🏆 Winning</h4>
                    <p className="text-muted-foreground">
                      The bot with the highest total fantasy points (top 5 players) wins. Top scores
                      make the global leaderboard!
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Profile userId={userId} bots={bots} />
          </TabsContent>

          {/* Game Tab */}
          <TabsContent value="game">
            {selectedBot1 &&
              selectedBot2 &&
              getBot(selectedBot1) &&
              getBot(selectedBot2) && (
                <GameScreen
                  key={gameKey}
                  userId={userId}
                  bot1={getBot(selectedBot1)!}
                  bot2={getBot(selectedBot2)!}
                  onBackToSetup={() => setActiveTab("setup")}
                />
              )}
          </TabsContent>

          {/* Bot Builder Tab */}
          <TabsContent value="builder">
            <BotBuilder userId={userId} bots={bots} onBotsChange={loadBots} />
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <Leaderboard />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
