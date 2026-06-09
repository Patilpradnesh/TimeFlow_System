"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  AlarmClock, Bell, Volume2, 
  Clock, Zap, Trash2, Plus, 
  AlertTriangle, ShieldCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface AlarmTask {
  id: string;
  title: string;
  dueDate: string;
  priority: string;
}

interface ManualAlarm {
  id: string;
  time: string;
  label: string;
  days: string[];
  isActive: boolean;
}

export default function AlarmsPage() {
  const [taskAlarms, setTaskAlarms] = useState<AlarmTask[]>([]);
  const [manualAlarms, setManualAlarms] = useState<ManualAlarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newAlarm, setNewAlarm] = useState({ time: "07:00", label: "" });

  const fetchData = async () => {
    try {
      const [tasksRes, alarmsRes] = await Promise.all([
        api.get("/tasks"),
        api.get("/alarms")
      ]);
      
      const activeTasks = tasksRes.data.filter((t: any) => 
        t.status !== 'DONE' && t.dueDate && new Date(t.dueDate).getTime() > new Date().getTime()
      );
      setTaskAlarms(activeTasks.sort((a: any, b: any) => 
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      ));

      setManualAlarms(alarmsRes.data);
    } catch (error) {
      console.error("Failed to fetch alarms data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Sync every 30s
    return () => clearInterval(interval);
  }, []);

  const handleAddManualAlarm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post("/alarms", {
        time: newAlarm.time,
        label: newAlarm.label || "Custom Alarm",
        days: ["MON", "TUE", "WED", "THU", "FRI"]
      });
      setManualAlarms([res.data, ...manualAlarms]);
      setIsAdding(false);
      setNewAlarm({ time: "07:00", label: "" });
    } catch (error) {
      console.error("Failed to add manual alarm");
    }
  };

  const toggleAlarm = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/alarms/${id}`, { isActive });
      setManualAlarms(manualAlarms.map(a => a.id === id ? { ...a, isActive } : a));
    } catch (error) {
      console.error("Failed to toggle alarm");
    }
  };

  const deleteAlarm = async (id: string) => {
    try {
      await api.delete(`/alarms/${id}`);
      setManualAlarms(manualAlarms.filter(a => a.id !== id));
    } catch (error) {
      console.error("Failed to delete alarm");
    }
  };

  const playTestSound = () => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 1);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2 flex items-center gap-3">
            <AlarmClock className="text-blue-500" size={36} />
            System Alarms
          </h1>
          <p className="text-slate-500">
            Current active triggers and manual schedules.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={playTestSound}
          className="border-slate-800 bg-slate-900/50 text-slate-300 hover:text-white hover:border-blue-500/50 transition-all gap-2"
        >
          <Volume2 size={18} />
          Test Alarm Sound
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Alarms List */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Manual Alarms Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="text-blue-500" size={20} />
                Manual Alarms
              </h2>
              <Button size="sm" onClick={() => setIsAdding(!isAdding)} className="bg-slate-800 hover:bg-slate-700 text-white border-0 h-8 text-xs">
                <Plus size={14} className="mr-1" /> Add Alarm
              </Button>
            </div>

            {isAdding && (
              <Card className="bg-slate-900 border-blue-500/30">
                <CardContent className="p-4">
                  <form onSubmit={handleAddManualAlarm} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="w-full md:w-auto flex-1">
                      <label className="text-xs text-slate-400 mb-1 block">Time</label>
                      <input 
                        type="time" 
                        required
                        value={newAlarm.time}
                        onChange={e => setNewAlarm({...newAlarm, time: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="w-full md:w-auto flex-[2]">
                      <label className="text-xs text-slate-400 mb-1 block">Label</label>
                      <input 
                        type="text" 
                        placeholder="Wake up, Gym, etc."
                        value={newAlarm.label}
                        onChange={e => setNewAlarm({...newAlarm, label: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
                      />
                    </div>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto">Save</Button>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {manualAlarms.length === 0 && !isAdding ? (
                <div className="col-span-full p-8 rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 text-center">
                  <p className="text-slate-500 text-sm">No manual alarms set.</p>
                </div>
              ) : (
                manualAlarms.map(alarm => (
                  <Card key={alarm.id} className={cn("bg-slate-900/50 border-slate-800 transition-colors", !alarm.isActive && "opacity-50")}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-black text-white">{alarm.time}</h3>
                        <p className="text-xs text-slate-400 font-medium">{alarm.label}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => toggleAlarm(alarm.id, !alarm.isActive)}
                          className={cn(
                            "w-10 h-5 rounded-full relative transition-colors",
                            alarm.isActive ? "bg-blue-600" : "bg-slate-700"
                          )}
                        >
                          <div className={cn(
                            "w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform",
                            alarm.isActive ? "left-5" : "left-0.5"
                          )}></div>
                        </button>
                        <button onClick={() => deleteAlarm(alarm.id)} className="text-slate-600 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          <div className="w-full h-[1px] bg-slate-900"></div>

          {/* Task-based Alarms */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="text-amber-500" size={20} />
              Task Execution Triggers
            </h2>
            {taskAlarms.length === 0 ? (
              <div className="p-12 rounded-3xl border border-dashed border-slate-800 bg-slate-950/50 flex flex-col items-center justify-center text-center">
                <ShieldCheck size={36} className="text-slate-800 mb-3" />
                <p className="text-slate-500 font-medium text-sm">No execution triggers active.</p>
              </div>
            ) : (
              taskAlarms.map((alarm) => (
                <AlarmCard key={alarm.id} alarm={alarm} />
              ))
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="bg-blue-600/5 border-blue-500/20 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-blue-400 flex items-center gap-2">
                <Zap size={16} />
                Alarm Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-400 leading-relaxed space-y-3">
              <p>Alarms are automatically generated based on the **Deadline Matrix**.</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span><strong className="text-slate-300">GENTLE:</strong> 10 min before due.</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <span><strong className="text-slate-300">ASSERTIVE:</strong> 5 min before due.</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span><strong className="text-slate-300">CRITICAL:</strong> At the second of deadline.</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AlarmCard({ alarm }: { alarm: AlarmTask }) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = new Date(alarm.dueDate).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft("TRIGGERED");
      } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${h > 0 ? h + 'h ' : ''}${m}m ${s}s`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [alarm.dueDate]);

  const isUrgent = timeLeft.includes('m') && parseInt(timeLeft) < 5 && !timeLeft.includes('h');

  return (
    <Card className={cn(
      "bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all group overflow-hidden",
      isUrgent && "border-blue-500/30 bg-blue-500/[0.02]"
    )}>
      <CardContent className="p-6 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-xl",
            isUrgent ? "bg-blue-600 text-white animate-pulse" : "bg-slate-950 border border-slate-800 text-slate-500"
          )}>
            <Bell size={24} />
          </div>
          <div>
            <h3 className="font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{alarm.title}</h3>
            <div className="flex items-center gap-3">
              <Badge className="bg-slate-950 text-slate-500 border-slate-800 text-[10px] font-mono">
                {new Date(alarm.dueDate).toLocaleTimeString()}
              </Badge>
              <Badge className={cn(
                "border-0 text-[10px] font-black uppercase tracking-tighter",
                alarm.priority === 'URGENT' ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
              )}>
                {alarm.priority}
              </Badge>
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-1">Trigger in</p>
          <p className={cn(
            "text-2xl font-black tracking-tighter tabular-nums",
            isUrgent ? "text-blue-500" : "text-slate-300"
          )}>
            {timeLeft}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
