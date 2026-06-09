"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  Zap, Clock, CheckCircle2, AlertCircle,
  TrendingUp, Users, Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExecutionTimer } from "@/components/ExecutionTimer";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";

export default function DashboardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [alarms, setAlarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [tasksRes, alarmsRes] = await Promise.all([
          api.get('/tasks'),
          api.get('/alarms')
        ]);
        setTasks(tasksRes.data);
        setAlarms(alarmsRes.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const activeTasks = tasks.filter(t => t.status !== 'DONE');
  const completedTasks = tasks.filter(t => t.status === 'DONE');
  const activeAlarms = alarms.filter(a => a.isActive);
  
  const totalTasks = tasks.length;
  const executionScore = totalTasks === 0 ? 0 : Math.round((completedTasks.length / totalTasks) * 100);
  
  const recentTasks = [...tasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-pulse flex items-center gap-2 text-slate-500">
          <Clock className="animate-spin" /> Syncing dashboard data...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] font-black uppercase tracking-widest">System Active</Badge>
            <div className="flex gap-1">
              <div className="w-1 h-1 rounded-full bg-blue-500 animate-ping"></div>
              <div className="w-1 h-1 rounded-full bg-blue-500"></div>
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">
            Dashboard
          </h1>
          <p className="text-slate-500">
            Welcome back, {user?.name}. The engine is monitoring <span className="text-white font-bold">{activeTasks.length} active tasks</span>.
          </p>
        </div>
        
        <div className="flex items-center gap-3 p-1 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-xl">
          <div className="px-4 py-2 text-right">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Execution Score</p>
            <p className="text-xl font-black text-white">{executionScore}%</p>
          </div>
          <div className="h-8 w-[1px] bg-slate-800"></div>
          <div className="px-4 py-2">
            <TrendingUp className="text-emerald-500" size={24} />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Active Tasks" value={activeTasks.length} icon={Clock} color="text-blue-500" />
        <StatCard title="Completed" value={completedTasks.length} icon={CheckCircle2} color="text-emerald-500" />
        <StatCard title="Active Alarms" value={activeAlarms.length} icon={AlertCircle} color="text-amber-500" />
        <StatCard title="Flow Score" value={executionScore} icon={Zap} color="text-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Feed Area */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg text-white">Execution Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {recentTasks.length === 0 ? (
                  <p className="text-sm text-slate-500">No recent activity detected.</p>
                ) : (
                  recentTasks.map((task) => (
                    <div key={task.id} className="flex gap-4 items-start p-4 rounded-2xl bg-slate-950/50 border border-slate-900 hover:border-slate-800 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                        {task.status === 'DONE' ? <CheckCircle2 size={20} className="text-emerald-500"/> : <Clock size={20} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{task.title}</p>
                        <p className="text-xs text-slate-500 mt-1 truncate">
                          {task.status === 'DONE' ? 'Task Completed' : `Priority: ${task.priority} | Importance: ${task.importance}`}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          <ExecutionTimer />
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ActionButton label="Create New Task" icon={CheckCircle2} />
              <ActionButton label="Open FlowGrid" icon={TrendingUp} />
              <ActionButton label="Schedule Alarm" icon={Clock} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <Icon className={color} size={20} />
        </div>
        <p className="text-3xl font-black text-white">{value}</p>
      </CardContent>
    </Card>
  );
}

function ActionButton({ label, icon: Icon }: any) {
  return (
    <button className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-900 hover:bg-slate-900 hover:border-slate-800 text-slate-300 hover:text-white transition-all text-sm font-medium group">
      <span className="flex items-center gap-3">
        <Icon size={18} className="text-slate-500 group-hover:text-blue-500" />
        {label}
      </span>
      <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function ArrowRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
