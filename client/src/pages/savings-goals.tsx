import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Target, Plane, Home, GraduationCap, Trash2, PiggyBank } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SavingsGoal {
  id: number;
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string | null;
  icon: string | null;
  color: string | null;
  status: string;
}

const GOAL_ICONS: { [key: string]: any } = {
  target: Target,
  plane: Plane,
  home: Home,
  graduation: GraduationCap,
  piggy: PiggyBank,
};

const GOAL_COLORS = [
  "#4CAF50", "#2196F3", "#FF9800", "#E91E63", "#9C27B0", "#00BCD4"
];

export default function SavingsGoals() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [newGoal, setNewGoal] = useState({ name: "", targetAmount: "", icon: "target", color: "#4CAF50" });
  const [contributionAmount, setContributionAmount] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading } = useQuery<SavingsGoal[]>({
    queryKey: ["/api/savings-goals"],
    queryFn: async () => {
      const res = await fetch("/api/savings-goals");
      return res.json();
    },
  });

  const createGoalMutation = useMutation({
    mutationFn: async (data: { name: string; targetAmount: string; icon: string; color: string }) => {
      const res = await fetch("/api/savings-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/savings-goals"] });
      setIsAddOpen(false);
      setNewGoal({ name: "", targetAmount: "", icon: "target", color: "#4CAF50" });
      toast({ title: "Goal created!" });
    },
  });

  const addContributionMutation = useMutation({
    mutationFn: async ({ goalId, amount }: { goalId: number; amount: string }) => {
      const res = await fetch(`/api/savings-goals/${goalId}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/savings-goals"] });
      setIsContributeOpen(false);
      setContributionAmount("");
      setSelectedGoal(null);
      toast({ title: "Contribution added!" });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/savings-goals/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/savings-goals"] });
      toast({ title: "Goal deleted" });
    },
  });

  const totalSaved = goals.reduce((sum, g) => sum + parseFloat(g.currentAmount || "0"), 0);
  const totalTarget = goals.reduce((sum, g) => sum + parseFloat(g.targetAmount), 0);

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center gap-3">
        <Link href="/more">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold">Savings Goals</h1>
      </div>

      <Card className="bg-gradient-to-r from-green-500 to-teal-500 text-white">
        <CardContent className="pt-4">
          <p className="text-sm opacity-90">Total Saved</p>
          <p className="text-3xl font-bold">₹{totalSaved.toLocaleString()}</p>
          <p className="text-sm opacity-75 mt-1">of ₹{totalTarget.toLocaleString()} target</p>
          <Progress 
            value={totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0} 
            className="mt-3 bg-white/30 h-2"
          />
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <h2 className="font-semibold">Your Goals</h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Savings Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Goal Name</Label>
                <Input 
                  placeholder="e.g., Vacation Fund"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Target Amount (₹)</Label>
                <Input 
                  type="number"
                  placeholder="50000"
                  value={newGoal.targetAmount}
                  onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                />
              </div>
              <div>
                <Label>Icon</Label>
                <div className="flex gap-2 mt-2">
                  {Object.entries(GOAL_ICONS).map(([key, Icon]) => (
                    <Button
                      key={key}
                      variant={newGoal.icon === key ? "default" : "outline"}
                      size="icon"
                      onClick={() => setNewGoal({ ...newGoal, icon: key })}
                    >
                      <Icon className="w-4 h-4" />
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-2">
                  {GOAL_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 ${newGoal.color === color ? 'border-foreground' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewGoal({ ...newGoal, color })}
                    />
                  ))}
                </div>
              </div>
              <Button 
                className="w-full" 
                onClick={() => createGoalMutation.mutate(newGoal)}
                disabled={!newGoal.name || !newGoal.targetAmount}
              >
                Create Goal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No savings goals yet</p>
            <p className="text-sm">Create your first goal to start saving!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const Icon = GOAL_ICONS[goal.icon || "target"] || Target;
            const current = parseFloat(goal.currentAmount || "0");
            const target = parseFloat(goal.targetAmount);
            const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;

            return (
              <Card key={goal.id}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: goal.color || "#4CAF50" }}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{goal.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ₹{current.toLocaleString()} of ₹{target.toLocaleString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteGoalMutation.mutate(goal.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Progress value={percentage} className="mt-2 h-2" />
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-muted-foreground">{percentage.toFixed(0)}%</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedGoal(goal);
                            setIsContributeOpen(true);
                          }}
                        >
                          Add Money
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isContributeOpen} onOpenChange={setIsContributeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to {selectedGoal?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount (₹)</Label>
              <Input 
                type="number"
                placeholder="1000"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
              />
            </div>
            <Button 
              className="w-full"
              onClick={() => {
                if (selectedGoal && contributionAmount) {
                  addContributionMutation.mutate({ goalId: selectedGoal.id, amount: contributionAmount });
                }
              }}
              disabled={!contributionAmount}
            >
              Add Contribution
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
