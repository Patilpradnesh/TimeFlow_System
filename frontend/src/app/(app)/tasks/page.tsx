"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  Plus, CheckCircle2, Circle, Clock, 
  Trash2, AlertCircle, Calendar, 
  Target, Info, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  importance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dueDate: string | null;
  microSteps?: MicroStep[];
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const addMicroStep = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!newStepTitle.trim()) return;
    setNewTask({
      ...newTask,
      microSteps: [...newTask.microSteps, { id: Date.now().toString(), title: newStepTitle, isDone: false }]
    });
    setNewStepTitle("");
  };

  const removeMicroStep = (id: string) => {
    setNewTask({
      ...newTask,
      microSteps: newTask.microSteps.filter(s => s.id !== id)
    });
  };

  const updateMicroStepTitle = (id: string, newTitle: string) => {
    setNewTask({
      ...newTask,
      microSteps: newTask.microSteps.map(s => s.id === id ? { ...s, title: newTitle } : s)
    });
  };

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

  const toggleStatus = async (task: Task) => {
    const nextStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    try {
      const response = await api.put(`/tasks/${task.id}`, { status: nextStatus });
      setTasks(tasks.map(t => t.id === task.id ? response.data : t));
      toast.success(nextStatus === 'DONE' ? "Task completed!" : "Task reopened");
    } catch (error) {
      toast.error("Update failed");
    }
  };

  const toggleMicroStep = async (task: Task, stepId: string) => {
    if (!task.microSteps) return;
    const updatedSteps = task.microSteps.map(step => 
      step.id === stepId ? { ...step, isDone: !step.isDone } : step
    );
    
    // Optimistic UI update
    setTasks(tasks.map(t => t.id === task.id ? { ...t, microSteps: updatedSteps } : t));
    
    try {
      const response = await api.put(`/tasks/${task.id}`, { microSteps: updatedSteps });
      setTasks(tasks.map(t => t.id === task.id ? response.data : t));
    } catch (error) {
      toast.error("Failed to update step");
      // Revert optimism if failed
      setTasks([...tasks]); 
    }
  };

  const updateExistingMicroStepTitle = async (task: Task, stepId: string, newTitle: string) => {
    if (!task.microSteps || !newTitle.trim() || newTitle === task.microSteps.find(s => s.id === stepId)?.title) return;
    const updatedSteps = task.microSteps.map(step => 
      step.id === stepId ? { ...step, title: newTitle } : step
    );
    
    setTasks(tasks.map(t => t.id === task.id ? { ...t, microSteps: updatedSteps } : t));
    
    try {
      const response = await api.put(`/tasks/${task.id}`, { microSteps: updatedSteps });
      setTasks(tasks.map(t => t.id === task.id ? response.data : t));
    } catch (error) {
      toast.error("Failed to rename step");
      fetchTasks();
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">Tasks</h1>
          <p className="text-slate-500">Manage your daily execution flow.</p>
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
                <DialogDescription className="text-slate-400">
                  Add details to help the system prioritize this task.
                </DialogDescription>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Priority</Label>
                    <Select onValueChange={(v) => setNewTask({ ...newTask, priority: v })} defaultValue="MEDIUM">
                      <SelectTrigger className="bg-slate-950 border-slate-800">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Importance</Label>
                    <Select onValueChange={(v) => setNewTask({ ...newTask, importance: v })} defaultValue="MEDIUM">
                      <SelectTrigger className="bg-slate-950 border-slate-800">
                        <SelectValue placeholder="Importance" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-3 pt-4 mt-2 border-t border-slate-800">
                  <Label className="text-slate-300">Micro-Steps (Break it down)</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="e.g., Open code editor" 
                      className="bg-slate-950 border-slate-800"
                      value={newStepTitle}
                      onChange={(e) => setNewStepTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addMicroStep(e)}
                    />
                    <Button type="button" onClick={addMicroStep} variant="secondary" className="bg-slate-800 hover:bg-slate-700 text-white">
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[150px] overflow-y-auto">
                    {newTask.microSteps.map((step) => (
                      <div key={step.id} className="flex items-center justify-between bg-slate-950 p-1 pl-3 rounded-md border border-slate-800 focus-within:border-slate-500 transition-colors">
                        <input 
                          type="text" 
                          value={step.title}
                          onChange={(e) => updateMicroStepTitle(step.id, e.target.value)}
                          className="bg-transparent border-none outline-none text-sm text-slate-300 w-full"
                        />
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeMicroStep(step.id)} className="h-8 w-8 shrink-0 text-slate-500 hover:text-red-400 hover:bg-transparent">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
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
            <p className="text-slate-500">Synchronizing tasks with the engine...</p>
          </div>
        ) : tasks.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-800 border-dashed py-20">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4">
                <CheckCircle2 className="text-slate-800" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-400">No tasks found</h3>
              <p className="text-slate-500 max-w-xs mt-2">Create your first task to start the intelligent execution cycle.</p>
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className={cn(
              "bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all group overflow-hidden",
              task.status === 'DONE' && "opacity-60"
            )}>
              <CardContent className="p-0 flex flex-col md:flex-row">
                {/* Status Toggle Area */}
                <button 
                  onClick={() => toggleStatus(task)}
                  className={cn(
                    "md:w-16 flex items-center justify-center p-4 md:p-0 transition-colors",
                    task.status === 'DONE' ? "bg-emerald-500/10 text-emerald-500" : "hover:bg-slate-900 text-slate-600 hover:text-white"
                  )}
                >
                  {task.status === 'DONE' ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </button>

                {/* Content Area */}
                <div className="flex-1 p-6 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className={cn(
                      "text-lg font-bold text-white",
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
                  </div>
                  
                  {task.reason && (
                    <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                      <Target size={14} className="text-blue-500" />
                      <span>{task.reason}</span>
                    </div>
                  )}

                  {task.description && (
                    <p className="text-sm text-slate-500 leading-relaxed">{task.description}</p>
                  )}

                  {task.microSteps && task.microSteps.length > 0 && (
                    <div className="mt-4 space-y-2 bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                      {task.microSteps.map((step) => (
                        <div key={step.id} className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleMicroStep(task, step.id); }}
                            className={cn(
                              "flex items-center justify-center w-5 h-5 rounded-full border transition-colors",
                              step.isDone ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-500" : "border-slate-700 hover:border-slate-500 bg-slate-900"
                            )}
                          >
                            {step.isDone && <CheckCircle2 size={12} />}
                          </button>
                          <input 
                            defaultValue={step.title}
                            onBlur={(e) => updateExistingMicroStepTitle(task, step.id, e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                            className={cn(
                              "bg-transparent border-b border-transparent focus:border-slate-500 outline-none w-full text-sm transition-colors", 
                              step.isDone ? "line-through text-slate-600" : "text-slate-300"
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                </div>

                {/* Actions Area */}
                <div className="flex md:flex-col items-center justify-center gap-2 p-4 md:p-6 border-t md:border-t-0 md:border-l border-slate-900 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="text-slate-500 hover:text-red-500 hover:bg-red-500/10" onClick={() => deleteTask(task.id)}>
                    <Trash2 size={18} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
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
