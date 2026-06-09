"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  Laptop, HeartPulse, Briefcase, GraduationCap, 
  Palette, Landmark, Trophy, Rocket, Globe,
  ArrowRight, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const INDUSTRIES = [
  { id: "TECH", name: "Technology", icon: Laptop, color: "text-blue-500", bg: "bg-blue-500/10", border: "hover:border-blue-500/50" },
  { id: "HEALTH", name: "Healthcare", icon: HeartPulse, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "hover:border-emerald-500/50" },
  { id: "BUSINESS", name: "Business", icon: Briefcase, color: "text-amber-500", bg: "bg-amber-500/10", border: "hover:border-amber-500/50" },
  { id: "SCHOOL", name: "School", icon: GraduationCap, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "hover:border-indigo-500/50" },
  { id: "COLLEGE", name: "College", icon: Rocket, color: "text-purple-500", bg: "bg-purple-500/10", border: "hover:border-purple-500/50" },
  { id: "CREATIVE", name: "Creative", icon: Palette, color: "text-pink-500", bg: "bg-pink-500/10", border: "hover:border-pink-500/50" },
  { id: "FINANCE", name: "Finance", icon: Landmark, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "hover:border-cyan-500/50" },
  { id: "SPORTS", name: "Sports", icon: Trophy, color: "text-orange-500", bg: "bg-orange-500/10", border: "hover:border-orange-500/50" },
  { id: "GENERAL", name: "General", icon: Globe, color: "text-slate-500", bg: "bg-slate-500/10", border: "hover:border-slate-500/50" },
];

export default function OnboardingPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, login, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user already has an industry, skip onboarding
    if (!authLoading && user && user.industry !== 'GENERAL') {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleComplete = async () => {
    if (!selected) return;
    setLoading(true);

    try {
      const response = await api.put("/user/industry", { industry: selected });
      toast.success(`Industry set to ${selected}!`);
      
      // Update the user in our global memory
      if (user) {
        const token = localStorage.getItem('timeflow_token');
        if (token) {
          login(token, response.data.user);
        }
      }
      
      router.push("/dashboard");
    } catch (error: any) {
      toast.error("Failed to save selection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      <div className="absolute top-0 w-full h-[500px] bg-blue-600/10 blur-[120px] rounded-full -translate-y-1/2"></div>

      <div className="relative z-10 max-w-4xl w-full flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold mb-6">
          Welcome, {user?.name}
        </div>
        
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-4">
          Identify your <span className="text-blue-500">Domain.</span>
        </h1>
        <p className="text-slate-400 text-lg mb-12 max-w-xl">
          TimeFlow adapts its behavior, urgency scoring, and visual language to your professional environment.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
          {INDUSTRIES.map((industry) => (
            <Card 
              key={industry.id}
              className={cn(
                "cursor-pointer transition-all duration-300 border-slate-800 bg-slate-900/50 backdrop-blur-xl group relative overflow-hidden",
                industry.border,
                selected === industry.id && "ring-2 ring-blue-500 border-blue-500"
              )}
              onClick={() => setSelected(industry.id)}
            >
              <CardContent className="p-6 flex flex-col items-center justify-center gap-3">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                  industry.bg
                )}>
                  <industry.icon className={cn("size-8", industry.color)} />
                </div>
                <span className="font-bold text-slate-200">{industry.name}</span>
                
                {selected === industry.id && (
                  <CheckCircle2 className="absolute top-3 right-3 text-blue-500" size={20} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Button 
          className={cn(
            "mt-12 h-14 px-12 text-lg font-bold transition-all",
            selected ? "bg-blue-600 hover:bg-blue-700 opacity-100" : "bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed"
          )}
          disabled={!selected || loading}
          onClick={handleComplete}
        >
          {loading ? "Optimizing Experience..." : "Confirm Selection"}
          {!loading && <ArrowRight className="ml-2" />}
        </Button>
      </div>
    </div>
  );
}
