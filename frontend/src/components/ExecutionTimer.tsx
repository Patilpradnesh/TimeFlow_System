"use client";

import { useState, useEffect, useCallback } from "react";
import { Timer, Zap, AlertCircle, Play, Square } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Task {
  id: string;
  title: string;
  dueDate: string;
}

export function ExecutionTimer() {
  const [nextTask, setNextTask] = useState<Task | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);

  // Sound Engine (Web Audio API)
  const playAlertSound = useCallback(() => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // High A note
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 1);
  }, []);

  const fetchNextTask = async () => {
    try {
      const response = await api.get("/tasks");
      const activeTasks = response.data.filter((t: any) => t.status !== 'DONE' && t.dueDate);
      
      if (activeTasks.length > 0) {
        // Sort by dueDate
        const sorted = activeTasks.sort((a: any, b: any) => 
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        );
        setNextTask(sorted[0]);
      } else {
        setNextTask(null);
      }
    } catch (error) {
      console.error("Failed to fetch next task");
    }
  };

  useEffect(() => {
    fetchNextTask();
    const interval = setInterval(fetchNextTask, 60000); // Check for new tasks every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!nextTask) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(nextTask.dueDate).getTime();
      const diff = Math.floor((target - now) / 1000);

      if (diff <= 0) {
        setTimeLeft(0);
        if (diff === 0) playAlertSound();
        clearInterval(timer);
      } else {
        setTimeLeft(diff);
        setIsUrgent(diff < 300); // Pulse if less than 5 minutes
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [nextTask, playAlertSound]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!nextTask) {
    return (
      <div className="p-6 rounded-3xl border border-slate-900 bg-slate-950 flex flex-col items-center justify-center text-center space-y-3">
        <Timer size={32} className="text-slate-800" />
        <p className="text-xs text-slate-500 italic">No upcoming tasks scheduled.</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative p-6 rounded-3xl border transition-all duration-700 overflow-hidden",
      isUrgent 
        ? "bg-blue-600/10 border-blue-500/30 shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)]" 
        : "bg-slate-900/50 border-slate-800"
    )}>
      {/* Background Pulse */}
      {isUrgent && (
        <div className="absolute inset-0 bg-blue-500/5 animate-pulse"></div>
      )}

      <div className="relative z-10 flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <Badge className="bg-blue-500/10 text-blue-500 border-0 text-[10px] uppercase font-black">Next Target</Badge>
          <Zap size={14} className={cn(isUrgent ? "text-blue-400" : "text-slate-600")} />
        </div>

        <div>
          <h4 className="text-sm font-bold text-slate-400 mb-1">EXECUTION COUNTDOWN</h4>
          <div className={cn(
            "text-6xl font-black tracking-tighter tabular-nums",
            isUrgent ? "text-white" : "text-slate-300"
          )}>
            {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{nextTask.title}</p>
            <p className="text-[10px] text-slate-500">Ready for engagement?</p>
          </div>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-8 rounded-lg px-4">
            START
          </Button>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", className)}>
      {children}
    </span>
  );
}
