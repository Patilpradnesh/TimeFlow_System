"use client";

import { useState, useEffect } from "react";
import { Target, Plus, CheckCircle2, Circle, Trash2, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface Goal {
  id: string;
  title: string;
  progress: number;
  horizon: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  createdAt: string;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', horizon: 'WEEKLY' });

  const fetchGoals = async () => {
    try {
      const response = await api.get("/goals");
      setGoals(response.data);
    } catch (error) {
      console.error("Failed to fetch goals", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.title.trim()) return;
    
    try {
      const res = await api.post("/goals", newGoal);
      setGoals([res.data, ...goals]);
      setNewGoal({ title: '', horizon: 'WEEKLY' });
      setIsAdding(false);
    } catch (error) {
      console.error("Failed to add goal", error);
    }
  };

  const updateProgress = async (id: string, newProgress: number) => {
    try {
      await api.patch(`/goals/${id}`, { progress: newProgress });
      setGoals(goals.map(g => g.id === id ? { ...g, progress: newProgress } : g));
    } catch (error) {
      console.error("Failed to update goal progress", error);
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      await api.delete(`/goals/${id}`);
      setGoals(goals.filter(g => g.id !== id));
    } catch (error) {
      console.error("Failed to delete goal", error);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2 flex items-center gap-3">
            <Target className="text-blue-500" size={36} />
            Goal Management
          </h1>
          <p className="text-slate-500">
            Define high-level objectives and track progress manually.
          </p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus size={18} />
          New Goal
        </Button>
      </div>

      {isAdding && (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <form onSubmit={handleAddGoal} className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Goal Title</label>
                <input 
                  type="text" 
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  placeholder="e.g. Launch SaaS V1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Horizon</label>
                <select 
                  value={newGoal.horizon}
                  onChange={(e) => setNewGoal({ ...newGoal, horizon: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 appearance-none"
                >
                  <option value="DAILY">Daily Objective</option>
                  <option value="WEEKLY">Weekly Milestone</option>
                  <option value="MONTHLY">Monthly Goal</option>
                  <option value="YEARLY">Yearly Vision</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Save Goal</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {goals.map((goal) => (
          <Card key={goal.id} className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all">
            <CardContent className="p-6 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white text-lg">{goal.title}</h3>
                  <Badge className="mt-2 bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                    {goal.horizon}
                  </Badge>
                </div>
                <button onClick={() => deleteGoal(goal.id)} className="text-slate-600 hover:text-red-500 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
              
              <div className="space-y-2 mt-4">
                <div className="flex justify-between text-xs font-medium text-slate-400">
                  <span>Progress</span>
                  <span>{goal.progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${goal.progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between pt-2">
                  <Button variant="outline" size="sm" onClick={() => updateProgress(goal.id, Math.max(0, goal.progress - 10))} className="h-7 text-xs border-slate-800 bg-slate-950">-10%</Button>
                  <Button variant="outline" size="sm" onClick={() => updateProgress(goal.id, Math.min(100, goal.progress + 10))} className="h-7 text-xs border-slate-800 bg-slate-950">+10%</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {goals.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-950/50">
            <Target size={48} className="mx-auto text-slate-700 mb-4" />
            <p className="text-slate-400 font-medium">No active goals found.</p>
            <p className="text-slate-600 text-sm mt-1">Set a high-level objective to track your progress.</p>
          </div>
        )}
      </div>
    </div>
  );
}
