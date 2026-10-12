"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, CheckCircle2, Circle, Clock, 
  Trash2, Target, Loader2, Play, Pause, 
  ChevronDown, ChevronUp, CheckSquare, Zap, Activity, Edit2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

// --- Live Timer Component ---
const LiveTimer = ({ startTime, previousSeconds = 0 }: { startTime: string | null, previousSeconds?: number }) => {
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      const start = new Date(startTime).getTime();
      const now = new Date().getTime();
      const diffSeconds = Math.floor((now - start) / 1000);
      
      const totalSeconds = diffSeconds + previousSeconds;

      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setElapsed(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  if (!startTime) return null;

  return (
    <div className="font-mono text-xl font-bold text-blue-400 tracking-wider">
      {elapsed}
    </div>
  );
};

interface ExecutionSession {
  id: string;
  startTime: string;
  endTime: string | null;
}

interface MicroStep {
  id: string;
  title: string;
  status: 'TODO' | 'DONE';
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  reason: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'ON_HOLD' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  microSteps?: MicroStep[];
  executionSessions?: ExecutionSession[];
  reasonForProcrastination?: string | null;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Execution Session State
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeSessionStartTime, setActiveSessionStartTime] = useState<string | null>(null);
  
  // Resistance Flow State (Pause)
  const [resistanceModalOpen, setResistanceModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState("OTHER");

  // Reflection Flow State (Complete)
  const [reflectionModalOpen, setReflectionModalOpen] = useState(false);
  const [reflectionData, setReflectionData] = useState({ focusRating: "7", energyLevel: "MEDIUM", notes: "" });
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const [newTask, setNewTask] = useState({
    title: "",
    reason: "",
    priority: "MEDIUM",
  });

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
      setNewTask({ title: "", reason: "", priority: "MEDIUM" });
      toast.success("Task created");
    } catch (error) {
      toast.error("Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    setSubmitting(true);
    try {
      const response = await api.put(`/tasks/${editingTask.id}`, {
        title: editingTask.title,
        reason: editingTask.reason,
        priority: editingTask.priority
      });
      setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, ...response.data } : t));
      setEditingTask(null);
      toast.success("Task updated");
    } catch (error) {
      toast.error("Failed to update task");
    } finally {
      setSubmitting(false);
    }
  };

  const startSession = async (task: Task) => {
    try {
      const response = await api.post("/behavior/session/start", { taskId: task.id });
      setActiveSessionId(response.data.id);
      setActiveTaskId(task.id);
      setActiveSessionStartTime(response.data.startTime);
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: 'IN_PROGRESS' } : t));
      toast.success(`Session started! Timer is ticking on: ${task.title}`);
    } catch (error) {
      toast.error("Failed to start session");
    }
  };

  const triggerCompletion = () => {
    setReflectionModalOpen(true);
  };

  const submitReflectionAndComplete = async () => {
    if (!activeSessionId) return;
    
    // Calculate total duration in minutes
    let actualDuration = 0;
    if (activeSessionStartTime) {
      const start = new Date(activeSessionStartTime).getTime();
      const now = new Date().getTime();
      actualDuration = Math.round((now - start) / (1000 * 60)); // minutes
    }

    try {
      await api.post("/behavior/session/end", { 
        sessionId: activeSessionId, 
        completed: true,
        actualDuration,
        ...reflectionData
      });

      // EIE: Submit Evidence
      if (evidenceUrl || reflectionData.notes) {
        await api.post("/eie", {
          sessionId: activeSessionId,
          taskId: activeTaskId,
          type: evidenceUrl ? "ATTACHMENT" : "REFLECTION",
          content: reflectionData.notes,
          attachments: evidenceUrl ? [{ fileUrl: evidenceUrl, mimeType: "url", sizeBytes: 0 }] : []
        });
      }
      
      setTasks(tasks.map(t => t.id === activeTaskId ? { ...t, status: 'DONE' } : t));
      setActiveSessionId(null);
      setActiveTaskId(null);
      setActiveSessionStartTime(null);
      setEvidenceUrl("");
      setReflectionModalOpen(false);
      
      toast.success(`Task Complete! Duration: ${actualDuration}m. Proof captured.`, { icon: '🔥' });
    } catch (error) {
      toast.error("Failed to submit reflection or evidence");
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
      
      setTasks(tasks.map(t => {
        if (t.id === activeTaskId) {
          return {
            ...t,
            status: 'TODO',
            reasonForProcrastination: selectedReason,
            executionSessions: [
              ...(t.executionSessions || []),
              { id: activeSessionId, startTime: activeSessionStartTime!, endTime: new Date().toISOString() }
            ]
          };
        }
        return t;
      }));
      setActiveSessionId(null);
      setActiveTaskId(null);
      setActiveSessionStartTime(null);
      setResistanceModalOpen(false);
      toast.info("Session paused. AI has noted the resistance.");
    } catch (error) {
      toast.error("Failed to log resistance");
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

  const toggleExpand = (id: string) => {
    setExpandedTaskId(expandedTaskId === id ? null : id);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-5xl mx-auto">
      
      {/* Resistance Flow Modal */}
      <Dialog open={resistanceModalOpen} onOpenChange={setResistanceModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pause className="text-amber-500" /> Interception: Why are you stopping?
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Be honest. This data helps the Recovery AI guide you next time.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select onValueChange={setSelectedReason} defaultValue={selectedReason}>
              <SelectTrigger className="bg-slate-950 border-slate-800">
                <SelectValue placeholder="Select Resistance Reason" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-white">
                <SelectItem value="LOW_ENERGY">🔋 Low Energy / Burnout</SelectItem>
                <SelectItem value="TOO_DIFFICULT">🏔️ Too Difficult / Stuck</SelectItem>
                <SelectItem value="UNCLEAR_START">❓ Unclear Next Step</SelectItem>
                <SelectItem value="WAITING_FOR_SOMEONE">⏳ Waiting for someone</SelectItem>
                <SelectItem value="OVERWHELMED">🌊 Overwhelmed</SelectItem>
                <SelectItem value="DISTRACTED">📱 Distracted</SelectItem>
                <SelectItem value="OTHER">☕ Normal Break</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResistanceModalOpen(false)}>Cancel</Button>
            <Button onClick={submitResistance} className="bg-amber-600 hover:bg-amber-700">Log Resistance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reflection Flow Modal */}
      <Dialog open={reflectionModalOpen} onOpenChange={setReflectionModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="text-emerald-500" /> Proof & Reflection
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Don't just click done. Document your state to build behavioral momentum.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Energy Level After Task</Label>
              <Select onValueChange={(val) => setReflectionData({...reflectionData, energyLevel: val})} defaultValue="MEDIUM">
                <SelectTrigger className="bg-slate-950 border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="HIGH">High (Energized)</SelectItem>
                  <SelectItem value="MEDIUM">Medium (Stable)</SelectItem>
                  <SelectItem value="LOW">Low (Drained)</SelectItem>
                  <SelectItem value="EXHAUSTED">Exhausted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Focus Rating (1-10)</Label>
              <Input 
                type="number" min="1" max="10" 
                value={reflectionData.focusRating}
                onChange={(e) => setReflectionData({...reflectionData, focusRating: e.target.value})}
                className="bg-slate-950 border-slate-800"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Quick Note / Insight (Optional)</Label>
              <Input 
                placeholder="What went well? What was hard?"
                value={reflectionData.notes}
                onChange={(e) => setReflectionData({...reflectionData, notes: e.target.value})}
                className="bg-slate-950 border-slate-800"
              />
            </div>
            <div className="space-y-2 border-t border-slate-800 pt-4 mt-2">
              <Label className="text-slate-300 font-bold flex items-center gap-2">
                <Target size={14} className="text-blue-500" /> Proof of Work (Evidence URL)
              </Label>
              <Input 
                placeholder="GitHub PR, Google Doc, Image Link..."
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                className="bg-slate-950 border-blue-900/30 focus:border-blue-500"
              />
              <p className="text-xs text-slate-500">The AI will analyze this link to calculate your Evidence Confidence Score.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReflectionModalOpen(false)}>Cancel</Button>
            <Button onClick={submitReflectionAndComplete} className="bg-emerald-600 hover:bg-emerald-700">Submit Evidence & Complete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header Area */}
      <div className="flex items-end justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2 flex items-center gap-3">
            <Activity className="text-blue-500" size={32} /> 
            Execution Engine
          </h1>
          <p className="text-slate-400">Transform intention into action. Guard your momentum.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-white text-black hover:bg-slate-200 font-bold h-12 px-6 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all hover:scale-105">
              <Plus className="mr-2" size={20} /> Deploy Task
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-[500px]">
            <form onSubmit={handleCreateTask}>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Deploy New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-slate-300">Task Objective</Label>
                  <Input 
                    id="title" 
                    placeholder="e.g., Finalize API Architecture" 
                    required 
                    className="bg-slate-950 border-slate-800 text-lg py-6"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-slate-300">The "Why" (Crucial for Motivation)</Label>
                  <Input 
                    id="reason" 
                    placeholder="e.g., Unblocks the frontend team from building UI" 
                    className="bg-slate-950 border-slate-800"
                    value={newTask.reason}
                    onChange={(e) => setNewTask({ ...newTask, reason: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg">
                  {submitting ? <Loader2 className="animate-spin" /> : "Inject into Engine"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Task Modal */}
        <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-[500px]">
            <form onSubmit={handleUpdateTask}>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Edit Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title" className="text-slate-300">Task Objective</Label>
                  <Input 
                    id="edit-title" 
                    required 
                    className="bg-slate-950 border-slate-800 text-lg py-6"
                    value={editingTask?.title || ""}
                    onChange={(e) => editingTask && setEditingTask({ ...editingTask, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-reason" className="text-slate-300">The "Why"</Label>
                  <Input 
                    id="edit-reason" 
                    className="bg-slate-950 border-slate-800"
                    value={editingTask?.reason || ""}
                    onChange={(e) => editingTask && setEditingTask({ ...editingTask, reason: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg">
                  {submitting ? <Loader2 className="animate-spin" /> : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Task List / Interactive Timeline */}
      <div className="grid gap-4 relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="animate-spin text-blue-500" size={40} />
            <p className="text-slate-500 font-medium">Hydrating Process State...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
            <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center mb-6 shadow-inner">
              <Zap className="text-slate-700" size={40} />
            </div>
            <h3 className="text-2xl font-bold text-slate-300">The engine is idle</h3>
            <p className="text-slate-500 mt-2">Deploy your first task to ignite momentum.</p>
          </div>
        ) : (
          tasks.map((task) => {
            const isActive = activeTaskId === task.id;
            const isExpanded = expandedTaskId === task.id;
            const hasMicroSteps = task.microSteps && task.microSteps.length > 0;

            return (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                key={task.id}
              >
                <Card className={cn(
                  "bg-slate-900/60 border-slate-800 transition-all duration-300 overflow-hidden",
                  task.status === 'DONE' && "opacity-50 grayscale-[50%]",
                  isActive && "border-blue-500 bg-blue-950/20 shadow-[0_0_40px_rgba(59,130,246,0.1)] ring-1 ring-blue-500/50"
                )}>
                  <CardContent className="p-0">
                    
                    {/* Main Row */}
                    <div className="flex flex-col md:flex-row items-stretch">
                      
                      {/* Play Area */}
                      <div className="md:w-32 flex flex-col items-center justify-center p-4 md:p-0 bg-slate-950/50 border-b md:border-b-0 md:border-r border-slate-800/50 relative gap-2">
                        {task.status === 'DONE' ? (
                          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle2 size={24} className="text-emerald-500" />
                          </div>
                        ) : isActive ? (
                          <div className="relative flex items-center justify-center w-14 h-14">
                            <motion.div 
                              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                              transition={{ repeat: Infinity, duration: 2 }}
                              className="absolute inset-0 border-2 border-blue-500 rounded-full"
                            />
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(59,130,246,0.8)]">
                              <Activity size={18} />
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => startSession(task)}
                            disabled={activeTaskId !== null}
                            className={cn(
                              "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all group relative",
                              activeTaskId !== null ? "opacity-30 cursor-not-allowed border-slate-700 text-slate-400" : 
                              (task.executionSessions?.length || 0) > 0 ? "border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]" : 
                              "border-slate-700 text-slate-400 hover:border-blue-500 hover:bg-blue-500/10 hover:text-blue-400"
                            )}
                            title={(task.executionSessions?.length || 0) > 0 ? "Resume Session" : "Start Session"}
                          >
                            <Play size={20} className="ml-1 group-hover:scale-110 transition-transform" />
                            {(task.executionSessions?.length || 0) > 0 && (
                              <span className="absolute -bottom-6 text-[10px] font-bold uppercase tracking-widest text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                Resume
                              </span>
                            )}
                          </button>
                        )}
                        
                        {/* Live Timer Display */}
                        {isActive && (
                          <LiveTimer 
                            startTime={activeSessionStartTime} 
                            previousSeconds={task.executionSessions?.reduce((total, session) => {
                              if (session.endTime) {
                                return total + Math.floor((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000);
                              }
                              return total;
                            }, 0) || 0}
                          />
                        )}
                      </div>

                      {/* Content Area */}
                      <div className="flex-1 p-6 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h3 className={cn(
                              "text-xl font-bold text-white transition-all",
                              isActive && "text-blue-400",
                              task.status === 'DONE' && "line-through text-slate-500"
                            )}>
                              {task.title}
                            </h3>
                            {task.reason && (
                              <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                                <Target size={14} className={isActive ? "text-blue-400" : "text-slate-600"} />
                                <span>{task.reason}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="outline" className={cn(
                              "border-0 px-3 py-1 text-[10px] uppercase font-black tracking-widest rounded-full",
                              getPriorityStyles(task.priority)
                            )}>
                              {task.priority}
                            </Badge>
                            {task.reasonForProcrastination && (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-0 text-[10px] uppercase rounded-full">
                                Stalled: {task.reasonForProcrastination.replace(/_/g, ' ')}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Interactive Controls below title */}
                        <div className="flex items-center gap-4 pt-2">
                          {hasMicroSteps && (
                            <button 
                              onClick={() => toggleExpand(task.id)}
                              className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 hover:text-white transition-colors"
                            >
                              {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                              {task.microSteps?.length} Micro-Steps
                            </button>
                          )}
                          {!hasMicroSteps && task.status !== 'DONE' && (
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                              No micro-steps generated
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions Area (Only visible when active or hovering) */}
                      <div className="flex md:flex-col items-center justify-center gap-3 p-4 md:p-6 bg-slate-950/30 border-l border-slate-800/50">
                        {isActive ? (
                          <>
                            <Button size="sm" onClick={triggerCompletion} className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all">
                              <CheckCircle2 size={16} className="mr-2" /> Complete
                            </Button>
                            <Button variant="outline" size="sm" onClick={pauseSession} className="w-full border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300">
                              <Pause size={16} className="mr-2 text-amber-500" /> Pause
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors" onClick={() => setEditingTask(task)}>
                              <Edit2 size={18} />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-slate-600 hover:text-red-500 hover:bg-red-500/10 transition-colors" onClick={() => deleteTask(task.id)}>
                              <Trash2 size={18} />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expandable Accordion for MicroSteps */}
                    <AnimatePresence>
                      {isExpanded && hasMicroSteps && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-slate-800/50 bg-slate-950/50"
                        >
                          <div className="p-6 pl-24 md:pl-[120px] space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Execution Path</h4>
                            {task.microSteps?.map((step, idx) => (
                              <div key={step.id || idx} className="flex items-start gap-3 group">
                                <div className="mt-0.5 w-5 h-5 rounded border border-slate-700 flex items-center justify-center bg-slate-900 group-hover:border-slate-500 transition-colors cursor-pointer">
                                  {step.status === 'DONE' && <CheckSquare size={14} className="text-blue-500" />}
                                </div>
                                <span className={cn(
                                  "text-sm font-medium",
                                  step.status === 'DONE' ? "text-slate-600 line-through" : "text-slate-300"
                                )}>
                                  {step.title}
                                </span>
                              </div>
                            ))}
                            {isActive && (
                              <div className="pt-4">
                                <Button variant="outline" size="sm" className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-400">
                                  + Add Ad-hoc Step
                                </Button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                  </CardContent>
                </Card>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  );
}

function getPriorityStyles(priority: string) {
  switch (priority) {
    case 'URGENT': return 'bg-red-500/20 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]';
    case 'HIGH': return 'bg-orange-500/20 text-orange-400';
    case 'MEDIUM': return 'bg-blue-500/20 text-blue-400';
    default: return 'bg-slate-500/20 text-slate-400';
  }
}

function Label({ children, className, ...props }: any) {
  return (
    <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props}>
      {children}
    </label>
  );
}
