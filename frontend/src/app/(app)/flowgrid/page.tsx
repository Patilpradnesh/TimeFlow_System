"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  Flame, BrainCircuit, Zap, Snowflake,
  Target, Clock, AlertTriangle, CheckCircle2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  reason: string | null;
  status: string;
  priority: string;
  importance: string;
  dueDate: string | null;
  createdAt: string;
}

export default function SmartMatrixPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const response = await api.get("/tasks");
      setTasks(response.data.filter((t: Task) => t.status !== 'DONE'));
    } catch (error) {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const categorizeTasks = () => {
    const doNow: Task[] = [];
    const deepWork: Task[] = [];
    const quickHits: Task[] = [];
    const coldStorage: Task[] = [];

    tasks.forEach(task => {
      const p = task.priority;
      const i = task.importance;

      if (p === 'URGENT' || (p === 'HIGH' && i === 'CRITICAL')) {
        doNow.push(task);
      } else if (i === 'CRITICAL' || i === 'HIGH') {
        deepWork.push(task);
      } else if (p === 'HIGH' || p === 'MEDIUM') {
        quickHits.push(task);
      } else {
        coldStorage.push(task);
      }
    });

    return { doNow, deepWork, quickHits, coldStorage };
  };

  const { doNow, deepWork, quickHits, coldStorage } = categorizeTasks();

  const markDone = async (id: string) => {
    try {
      await api.put(`/tasks/${id}`, { status: 'DONE' });
      setTasks(tasks.filter(t => t.id !== id));
      toast.success("Task completed. Momentum gained!");
    } catch (e) {
      toast.error("Failed to update task");
    }
  };

  const TaskCard = ({ task, type }: { task: Task, type: 'doNow' | 'deepWork' | 'quickHits' | 'cold' }) => {
    
    // Time degradation logic (if older than 24h)
    const ageInHours = (new Date().getTime() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60);
    const isStale = ageInHours > 24;

    return (
      <Card className={cn(
        "relative group transition-all duration-300 border overflow-hidden",
        type === 'doNow' ? "bg-red-950/20 border-red-900/50 hover:border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.05)]" :
        type === 'deepWork' ? "bg-blue-950/20 border-blue-900/50 hover:border-blue-500/50" :
        type === 'quickHits' ? "bg-yellow-950/20 border-yellow-900/50 hover:border-yellow-500/50" :
        "bg-slate-900/50 border-slate-800 hover:border-slate-700",
        type === 'doNow' && !isStale && "animate-[pulse_4s_ease-in-out_infinite]" // The Urgency Pulse
      )}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h4 className="text-sm font-bold text-white leading-tight pr-4">{task.title}</h4>
            <button onClick={() => markDone(task.id)} className="shrink-0 text-slate-500 hover:text-emerald-500 transition-colors">
              <CheckCircle2 size={16} />
            </button>
          </div>
          
          {task.reason && (
            <div className="mt-3 mb-3 p-2 rounded-lg bg-slate-950/50 border border-slate-800/50">
              <div className="flex items-start gap-2">
                <Target size={12} className={cn("mt-0.5 shrink-0", type === 'doNow' ? "text-red-400" : "text-blue-400")} />
                <p className="text-[11px] text-slate-300 italic font-medium leading-snug">"{task.reason}"</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] border-slate-800 text-slate-400 font-mono px-1.5 py-0">P: {task.priority}</Badge>
              <Badge variant="outline" className="text-[9px] border-slate-800 text-slate-400 font-mono px-1.5 py-0">I: {task.importance}</Badge>
            </div>
            
            {isStale && type === 'doNow' && (
              <div className="flex items-center gap-1 text-red-500" title="This task is aging!">
                <AlertTriangle size={12} />
                <span className="text-[10px] font-bold">STALE</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black tracking-tight text-white mb-2">The Execution Matrix</h1>
        <p className="text-slate-500">AI-sorted priority columns. Focus on the red zone.</p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse flex items-center gap-2 text-slate-500"><Clock className="animate-spin" /> Calibrating priorities...</div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-hidden pb-4">
          
          {/* Column 1: DO NOW */}
          <div className="flex flex-col bg-slate-950/50 rounded-2xl border border-slate-900 overflow-hidden">
            <div className="p-4 border-b border-red-900/30 bg-red-950/20 flex items-center gap-2">
              <Flame size={18} className="text-red-500" />
              <h3 className="font-bold text-red-100 text-sm tracking-wide">DO NOW</h3>
              <Badge className="ml-auto bg-red-500/20 text-red-400 hover:bg-red-500/20 border-0">{doNow.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {doNow.length === 0 ? <p className="text-xs text-slate-600 text-center mt-10">Clear zone.</p> : 
               doNow.map(t => <TaskCard key={t.id} task={t} type="doNow" />)}
            </div>
          </div>

          {/* Column 2: DEEP WORK */}
          <div className="flex flex-col bg-slate-950/50 rounded-2xl border border-slate-900 overflow-hidden">
            <div className="p-4 border-b border-blue-900/30 bg-blue-950/20 flex items-center gap-2">
              <BrainCircuit size={18} className="text-blue-500" />
              <h3 className="font-bold text-blue-100 text-sm tracking-wide">DEEP WORK</h3>
              <Badge className="ml-auto bg-blue-500/20 text-blue-400 hover:bg-blue-500/20 border-0">{deepWork.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {deepWork.length === 0 ? <p className="text-xs text-slate-600 text-center mt-10">Clear zone.</p> : 
               deepWork.map(t => <TaskCard key={t.id} task={t} type="deepWork" />)}
            </div>
          </div>

          {/* Column 3: QUICK HITS */}
          <div className="flex flex-col bg-slate-950/50 rounded-2xl border border-slate-900 overflow-hidden">
            <div className="p-4 border-b border-yellow-900/30 bg-yellow-950/20 flex items-center gap-2">
              <Zap size={18} className="text-yellow-500" />
              <h3 className="font-bold text-yellow-100 text-sm tracking-wide">QUICK HITS</h3>
              <Badge className="ml-auto bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 border-0">{quickHits.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {quickHits.length === 0 ? <p className="text-xs text-slate-600 text-center mt-10">Clear zone.</p> : 
               quickHits.map(t => <TaskCard key={t.id} task={t} type="quickHits" />)}
            </div>
          </div>

          {/* Column 4: COLD STORAGE */}
          <div className="flex flex-col bg-slate-950/50 rounded-2xl border border-slate-900 overflow-hidden opacity-75">
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2">
              <Snowflake size={18} className="text-slate-400" />
              <h3 className="font-bold text-slate-300 text-sm tracking-wide">COLD STORAGE</h3>
              <Badge className="ml-auto bg-slate-800 text-slate-400 hover:bg-slate-800 border-0">{coldStorage.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {coldStorage.length === 0 ? <p className="text-xs text-slate-600 text-center mt-10">Clear zone.</p> : 
               coldStorage.map(t => <TaskCard key={t.id} task={t} type="cold" />)}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
