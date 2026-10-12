"use client";

import { useState } from "react";
import { toast } from "sonner";
import { 
  Laptop, HeartPulse, Briefcase, GraduationCap, 
  Rocket, Palette, Landmark, Trophy, Globe,
  Save, User as UserIcon, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { WhatsAppSettingsCard } from "@/components/WhatsAppSettingsCard";

const INDUSTRIES = [
  { id: "TECH", name: "Technology", icon: Laptop, color: "text-blue-500" },
  { id: "HEALTH", name: "Healthcare", icon: HeartPulse, color: "text-emerald-500" },
  { id: "BUSINESS", name: "Business", icon: Briefcase, color: "text-amber-500" },
  { id: "SCHOOL", name: "School", icon: GraduationCap, color: "text-indigo-500" },
  { id: "COLLEGE", name: "College", icon: Rocket, color: "text-purple-500" },
  { id: "CREATIVE", name: "Creative", icon: Palette, color: "text-pink-500" },
  { id: "FINANCE", name: "Finance", icon: Landmark, color: "text-cyan-500" },
  { id: "SPORTS", name: "Sports", icon: Trophy, color: "text-orange-500" },
  { id: "GENERAL", name: "General", icon: Globe, color: "text-slate-500" },
];


export default function SettingsPage() {
  const { user, login } = useAuth();
  const [selectedIndustry, setSelectedIndustry] = useState(user?.industry || "GENERAL");
  const [loading, setLoading] = useState(false);

  const handleUpdateIndustry = async () => {
    setLoading(true);
    try {
      const response = await api.put("/user/industry", { industry: selectedIndustry });
      toast.success("Domain updated successfully!");
      
      const token = localStorage.getItem("timeflow_token");
      if (token) {
        login(token, response.data.user);
      }
    } catch (error: any) {
      toast.error("Failed to update domain");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-white mb-2">Settings</h1>
        <p className="text-slate-400">Manage your profile, domain preferences, and notification channels.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white">Profile Information</CardTitle>
              <CardDescription className="text-slate-400">Your basic account details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950/50 border border-slate-900">
                <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/20">
                  <UserIcon size={32} />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{user?.name}</p>
                  <p className="text-sm text-slate-400">{user?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp Connection Card */}
          <WhatsAppSettingsCard />

          {/* Industry Selection Card */}
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white">Active Domain</CardTitle>
              <CardDescription className="text-slate-400">
                Changing your domain will update the theme and intelligence scoring of your entire app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-3">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind.id}
                    onClick={() => setSelectedIndustry(ind.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-xl border transition-all gap-2",
                      selectedIndustry === ind.id 
                        ? "border-blue-500 bg-blue-500/10" 
                        : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                    )}
                  >
                    <ind.icon className={cn("size-6", selectedIndustry === ind.id ? ind.color : "text-slate-500")} />
                    <span className={cn("text-xs font-bold", selectedIndustry === ind.id ? "text-white" : "text-slate-500")}>
                      {ind.name}
                    </span>
                  </button>
                ))}
              </div>
              <Separator className="bg-slate-800" />
              <Button 
                onClick={handleUpdateIndustry} 
                disabled={loading || selectedIndustry === user?.industry}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11"
              >
                {loading ? "Updating..." : "Save Domain Changes"}
                {!loading && <Save className="ml-2 h-4 w-4" />}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Help Card */}
        <div className="space-y-6">
          <Card className="bg-emerald-600/10 border-emerald-500/20">
            <CardHeader>
              <CardTitle className="text-emerald-400 text-sm flex items-center gap-2">
                <MessageSquare size={16} /> WhatsApp Bot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect your WhatsApp account to unlock two-way chat actions:
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li><code className="text-emerald-400">tasks</code> — View urgent deadlines</li>
                <li><code className="text-emerald-400">alarms</code> — View active alarms</li>
                <li><code className="text-emerald-400">jobs</code> — Check application pipeline</li>
                <li><code className="text-emerald-400">add &lt;text&gt;</code> — Quick add tasks</li>
                <li>Instant alarm rings &amp; deadline reminders</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-blue-600/10 border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-blue-400 text-sm flex items-center gap-2">
                <Rocket size={16} /> Pro Tip
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your domain determines how "urgent" a task feels. For example, in **Healthcare**, deadlines are treated as critical life-events, while in **Creative**, the system allows more room for "Flow State."
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
