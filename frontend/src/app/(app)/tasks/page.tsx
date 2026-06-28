"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  Plus, CheckCircle2, Circle, Clock, 
  Trash2, Target, Loader2, Play, Pause, FastForward
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface MicroStep {
  id: string;
  title: string;
  isDone: boolean;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  reason: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'ON_HOLD' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  importance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dueDate: string | null;
  microSteps?: MicroStep[];
  reasonForProcrastination?: string | null;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Execution Session State
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  
  // Resistance Flow State
  const [resistanceModalOpen, setResistanceModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState("OTHER");

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    reason: "",
    priority: "MEDIUM",
    importance: "MEDIUM",
    dueDate: "",
    microSteps: [] as MicroStep[],
  });
  const [newStepTitle, setNewStepTitle] = useState("");

  const fetchTasks = async () => {
    try {
      const response = await api.get("/tasks");
      setTasks(response.data);
    } catch (error) {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await api.post("/tasks", newTask);
      setTasks([response.data, ...tasks]);
      setOpen(false);
      setNewTask({ title: "", description: "", reason: "", priority: "MEDIUM", importance: "MEDIUM", dueDate: "", microSteps: [] });
      toast.success("Task created successfully");
    } catch (error) {
      toast.error("Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const startSession = async (task: Task) => {
    try {
      const response = await api.post("/behavior/session/start", { taskId: task.id });
      setActiveSessionId(response.data.id);
      setActiveTaskId(task.id);
      
      // Optimistic update
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: 'IN_PROGRESS' } : t));
      toast.success(`Started executing: ${task.title}`);
    } catch (error) {
      toast.error("Failed to start session");
    }
  };

  const completeSession = async () => {
    if (!activeSessionId) return;
    try {
      await api.post("/behavior/session/end", { 
        sessionId: activeSessionId, 
        completed: true 
      });
      
      setTasks(tasks.map(t => t.id === activeTaskId ? { ...t, status: 'DONE' } : t));
      setActiveSessionId(null);
      setActiveTaskId(null);
      toast.success("Session completed! +10 Focus Credits", {
        icon: '💎'
      });
    } catch (error) {
      toast.error("Failed to complete session");
    }
  };

  const pauseSession = () => {
    setResistanceModalOpen(true);
  };

  const submitResistance = async () => {
    if (!activeSessionId) return;
    try {
      await api.post("/behavior/session/end", { 
        sessionId: activeSessionId, 
        completed: false,
        procrastinationReason: selectedReason
      });
      
      setTasks(tasks.map(t => t.id === activeTaskId ? { ...t, status: 'TODO', reasonForProcrastination: selectedReason } : t));
      setActiveSessionId(null);
      setActiveTaskId(null);
      setResistanceModalOpen(false);
      toast.info("Session paused. Momentum recorded.");
    } catch (error) {
      toast.error("Failed to pause session");
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(tasks.filter(t => t.id !== id));
      toast.success("Task deleted");
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Resistance Flow Modal */}
      <Dialog open={resistanceModalOpen} onOpenChange={setResistanceModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pause className="text-amber-500" /> Session Paused
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Why are you delaying or pausing this task? This helps the AI adjust your workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select onValueChange={setSelectedReason} defaultValue={selectedReason}>
              <SelectTrigger className="bg-slate-950 border-slate-800">
                <SelectValue placeholder="Select Resistance Reason" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-white">
                <SelectItem value="OVERWHELMED">I feel Overwhelmed</SelectItem>
                <SelectItem value="FEAR_OF_FAILURE">Fear of Failure / Anxiety</SelectItem>
                <SelectItem value="UNCLEAR_START">Unclear where to start</SelectItem>
                <SelectItem value="LACK_OF_ENERGY">Lack of Energy / Burnout</SelectItem>
                <SelectItem value="PERFECTIONISM">Perfectionism</SelectItem>
                <SelectItem value="DISTRACTED">I got distracted</SelectItem>
                <SelectItem value="OTHER">Other / Normal Break</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResistanceModalOpen(false)}>Cancel</Button>
            <Button onClick={submitResistance} className="bg-amber-600 hover:bg-amber-700">Log & Pause</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">Execution Flow</h1>
          <p className="text-slate-500">Pick a task. Start a session. Build momentum.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 px-6">
              <Plus className="mr-2" size={20} /> New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-[500px]">
            <form onSubmit={handleCreateTask}>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Create Task Intelligence</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-slate-300">Task Title</Label>
                  <Input 
                    id="title" 
                    placeholder="e.g., Finalize architecture" 
                    required 
                    className="bg-slate-950 border-slate-800"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-slate-300">Why is this important? (The Reason)</Label>
                  <Input 
                    id="reason" 
                    placeholder="e.g., To unblock the design team" 
                    className="bg-slate-950 border-slate-800"
                    value={newTask.reason}
                    onChange={(e) => setNewTask({ ...newTask, reason: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700">
                  {submitting ? <Loader2 className="animate-spin" /> : "Save Task"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Task List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="animate-spin text-blue-500" size={40} />
            <p className="text-slate-500">Synchronizing behavioral data...</p>
          </div>
        ) : tasks.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-800 border-dashed py-20">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4">
                <CheckCircle2 className="text-slate-800" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-400">No tasks found</h3>
              <p className="text-slate-500 max-w-xs mt-2">Create your first task to start the execution cycle.</p>
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => {
            const isActive = activeTaskId === task.id;
            return (
              <Card key={task.id} className={cn(
                "bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all group overflow-hidden",
                task.status === 'DONE' && "opacity-50",
                isActive && "border-blue-500/50 bg-blue-900/10 shadow-[0_0_30px_rgba(59,130,246,0.15)] ring-1 ring-blue-500"
              )}>
                <CardContent className="p-0 flex flex-col md:flex-row">
                  
                  {/* Status / Play Button Area */}
                  <div className="md:w-20 flex items-center justify-center p-4 md:p-0 bg-slate-950/30">
                    {task.status === 'DONE' ? (
                      <CheckCircle2 size={28} className="text-emerald-500" />
                    ) : isActive ? (
                      <div className="relative flex items-center justify-center w-12 h-12">
                        <div className="absolute inset-0 border-2 border-blue-500 rounded-full animate-ping opacity-20"></div>
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white animate-pulse">
                          <Play size={18} className="ml-1" />
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => startSession(task)}
                        disabled={activeTaskId !== null}
                        className={cn(
                          "w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center transition-all",
                          activeTaskId !== null ? "opacity-30 cursor-not-allowed" : "hover:bg-blue-600 hover:border-blue-600 hover:text-white text-slate-500"
                        )}
                      >
                        <Play size={18} className="ml-1" />
                      </button>
                    )}
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className={cn(
                          "text-lg font-bold text-white transition-all",
                          isActive && "text-blue-400 text-xl",
                          task.status === 'DONE' && "line-through text-slate-500"
                        )}>
                          {task.title}
                        </h3>
                        <Badge variant="outline" className={cn(
                          "border-0 px-2 h-5 text-[10px] uppercase font-black tracking-widest",
                          getPriorityStyles(task.priority)
                        )}>
                          {task.priority}
                        </Badge>
                        {task.reasonForProcrastination && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-0 text-[10px] uppercase">
                            Stalled: {task.reasonForProcrastination.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {task.reason && (
                      <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                        <Target size={14} className={isActive ? "text-blue-400" : "text-slate-600"} />
                        <span>{task.reason}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Area */}
                  <div className="flex md:flex-col items-center justify-center gap-2 p-4 md:p-6 border-t md:border-t-0 md:border-l border-slate-900 bg-slate-950/20">
                    {isActive ? (
                      <>
                        <Button variant="default" size="sm" onClick={completeSession} className="w-full bg-emerald-600 hover:bg-emerald-700">
                          <CheckCircle2 size={16} className="mr-2" /> Complete
                        </Button>
                        <Button variant="outline" size="sm" onClick={pauseSession} className="w-full border-slate-700 hover:bg-slate-800 text-slate-300">
                          <Pause size={16} className="mr-2" /> Pause
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="icon" className="text-slate-600 hover:text-red-500 hover:bg-red-500/10" onClick={() => deleteTask(task.id)}>
                        <Trash2 size={18} />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  );
}

function getPriorityStyles(priority: string) {
  switch (priority) {
    case 'URGENT': return 'bg-red-500/10 text-red-500';
    case 'HIGH': return 'bg-orange-500/10 text-orange-500';
    case 'MEDIUM': return 'bg-blue-500/10 text-blue-500';
    default: return 'bg-slate-500/10 text-slate-500';
  }
}

function Label({ children, className, ...props }: any) {
  return (
    <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props}>
      {children}
    </label>
  );
}
