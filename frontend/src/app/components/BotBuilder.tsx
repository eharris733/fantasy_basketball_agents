import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Cpu, Save, Trash2, Edit2 } from "lucide-react";
import * as api from "../utils/apiClient";

interface Bot {
  id: string;
  name: string;
  strategy: string;
  createdAt: string;
}

interface BotBuilderProps {
  userId: string;
  bots: Bot[];
  onBotsChange: () => void;
}

export function BotBuilder({ userId, bots, onBotsChange }: BotBuilderProps) {
  const [name, setName] = useState("");
  const [strategy, setStrategy] = useState("");
  const [editingBot, setEditingBot] = useState<Bot | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !strategy.trim()) {
      alert("Please provide both a name and strategy for your bot.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingBot) {
        await api.updateBot(editingBot.id, {
          name,
          strategy_prompt: strategy,
        });
      } else {
        await api.createBot(userId, name, strategy);
      }

      setName("");
      setStrategy("");
      setEditingBot(null);
      onBotsChange();
    } catch (error) {
      console.error("Error saving bot:", error);
      alert("Failed to save bot. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (bot: Bot) => {
    setEditingBot(bot);
    setName(bot.name);
    setStrategy(bot.strategy);
  };

  const handleDelete = async (botId: string) => {
    if (!confirm("Are you sure you want to delete this bot?")) return;

    try {
      await api.deleteBot(botId);
      onBotsChange();
    } catch (error) {
      console.error("Error deleting bot:", error);
      alert("Failed to delete bot. Please try again.");
    }
  };

  const handleCancel = () => {
    setEditingBot(null);
    setName("");
    setStrategy("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Create/Edit Bot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="size-5" />
            {editingBot ? "Edit Bot" : "Create New Bot"}
          </CardTitle>
          <CardDescription>
            Describe your bot's strategy in natural language. GPT-4o-mini will interpret your
            instructions to make bidding decisions during games.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bot-name">Bot Name</Label>
            <Input
              id="bot-name"
              placeholder="e.g., Aggressive Ace, Value Hunter, Balanced Builder"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bot-strategy">Strategy Prompt</Label>
            <Textarea
              id="bot-strategy"
              placeholder="e.g., Bid aggressively on elite players with fantasy points above 40. Save budget for at least 2 star players. Focus on getting high-value players early and blocking opponent from key pickups."
              rows={6}
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Strategy Tips</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">aggressive / conservative</Badge>
              <Badge variant="outline">star-focused / value-focused</Badge>
              <Badge variant="outline">blocking / balanced</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Write free-form instructions. The LLM reads your full prompt to decide bids, counters,
              and folds each turn.
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              <Save className="size-4 mr-2" />
              {isSaving ? "Saving..." : editingBot ? "Update Bot" : "Create Bot"}
            </Button>
            {editingBot && (
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Saved Bots */}
      <Card>
        <CardHeader>
          <CardTitle>Your Bots ({bots.length})</CardTitle>
          <CardDescription>
            Manage your saved bots. Click edit to modify or delete to remove.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {bots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No bots created yet. Create your first bot to get started!
              </p>
            ) : (
              bots.map((bot) => (
                <Card key={bot.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Cpu className="size-4" />
                        {bot.name}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {bot.strategy}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Created {new Date(bot.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(bot)}>
                        <Edit2 className="size-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(bot.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
