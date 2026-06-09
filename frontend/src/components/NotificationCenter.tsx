"use client";

import { useState, useEffect } from "react";
import { 
  Bell, AlertTriangle, MessageSquare, 
  Clock, ArrowRight, Zap, Loader2, Phone
} from "lucide-react";
import { 
  Sheet, SheetContent, SheetDescription, 
  SheetHeader, SheetTitle, SheetTrigger 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface Escalation {
  taskId: string;
  title: string;
  level: number;
  tone: 'GENTLE' | 'ASSERTIVE' | 'URGENT' | 'CRITICAL';
  message: string;
}

export function NotificationCenter() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEscalations = async () => {
    try {
      const response = await api.get("/reminders/active");
      setEscalations(response.data);
    } catch (error) {
      console.error("Failed to fetch escalations");
    }
  };

  useEffect(() => {
    fetchEscalations();
    // Poll for new escalations every 30 seconds
    const interval = setInterval(fetchEscalations, 30000);
    return () => clearInterval(interval);
  }, []);

  const getWhatsAppLink = (message: string) => {
    const encodedMessage = encodeURIComponent(message);
    // You can replace '1234567890' with your actual number later
    return `https://wa.me/?text=${encodedMessage}`;
  };

  const criticalCount = escalations.filter(e => e.level >= 3).length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all group">
          <Bell size={20} className="text-slate-400 group-hover:text-white" />
          {escalations.length > 0 && (
            <span className={cn(
              "absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-950 flex items-center justify-center text-[10px] font-bold text-white",
              criticalCount > 0 ? "bg-red-500 animate-pulse" : "bg-blue-600"
            )}>
              {escalations.length}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="bg-slate-950 border-slate-900 text-white w-[400px] sm:w-[540px]">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl font-black flex items-center gap-3">
            <Zap className="text-blue-500" />
            Intelligence Feed
          </SheetTitle>
          <SheetDescription className="text-slate-500">
            Current system escalations and behavioral alerts.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-150px)] pr-2">
          {escalations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
              <Clock size={40} className="mb-4 text-slate-800" />
              <p className="text-slate-500 italic">No active escalations. Your execution flow is optimal.</p>
            </div>
          ) : (
            escalations.map((e) => (
              <div 
                key={e.taskId} 
                className={cn(
                  "p-4 rounded-2xl border bg-slate-900/50 backdrop-blur-xl space-y-3 transition-all",
                  e.level === 4 ? "border-red-500/50 bg-red-500/[0.02]" : "border-slate-800"
                )}
              >
                <div className="flex items-center justify-between">
                  <Badge className={cn(
                    "text-[10px] font-black uppercase tracking-tighter",
                    e.level === 1 && "bg-blue-500/10 text-blue-500",
                    e.level === 2 && "bg-amber-500/10 text-amber-500",
                    e.level === 3 && "bg-orange-500/10 text-orange-500",
                    e.level === 4 && "bg-red-500 text-white"
                  )}>
                    {e.tone}
                  </Badge>
                  <span className="text-[10px] text-slate-600 font-mono">LEVEL {e.level}</span>
                </div>
                
                <h4 className="font-bold text-white text-sm leading-tight">{e.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed italic">"{e.message}"</p>

                <div className="flex gap-2 pt-2">
                  <Button variant="ghost" size="icon" className="h-9 w-9 border border-slate-800 text-slate-500 hover:text-white">
                    <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
