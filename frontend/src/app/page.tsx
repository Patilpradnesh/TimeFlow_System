import Link from "next/link";
import { Clock, ArrowRight, ShieldCheck, Zap, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-slate-950 text-white overflow-hidden">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-blue-600/20 to-transparent blur-3xl opacity-50"></div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Clock size={24} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">TimeFlow</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-900">
              Login
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center pt-24 px-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-8 uppercase tracking-widest">
          <Zap size={14} /> Phase 1 Foundation Live
        </div>
        
        <h1 className="text-7xl md:text-8xl font-extrabold tracking-tighter mb-6 bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">
          Time is not linear. <br />
          <span className="text-blue-500">Execution is.</span>
        </h1>
        
        <p className="text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
          The world's first behavior-aware task engine. Stop managing tasks. 
          Start executing them with intelligent, adaptive reminders tailored to your industry.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/signup">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 px-8 text-lg group">
              Build Your Flow 
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="border-slate-800 bg-slate-900/50 text-white h-14 px-8 text-lg backdrop-blur-sm">
            View Blueprint
          </Button>
        </div>

        {/* Feature Grid Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 max-w-6xl w-full">
          <div className="p-8 rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl text-left hover:border-blue-500/50 transition-colors group">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Brain className="text-blue-500" size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3">Intelligence Engine</h3>
            <p className="text-slate-500 leading-relaxed">Adapts to your procrastination habits and escalates reminders only when necessary.</p>
          </div>
          <div className="p-8 rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl text-left hover:border-green-500/50 transition-colors group">
            <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="text-green-500" size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3">Industry Theming</h3>
            <p className="text-slate-500 leading-relaxed">Dedicated interfaces for Tech, Health, Creative, and Finance professionals.</p>
          </div>
          <div className="p-8 rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl text-left hover:border-purple-500/50 transition-colors group">
            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Zap className="text-purple-500" size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3">FlowGrid Engine</h3>
            <p className="text-slate-500 leading-relaxed">The power of a spreadsheet with the simplicity of a task list. Built for speed.</p>
          </div>
        </div>
      </section>

      <footer className="mt-32 py-12 border-t border-slate-900 relative z-10">
        <div className="max-w-7xl mx-auto px-8 flex justify-between items-center text-slate-600 text-sm">
          <p>© 2026 TimeFlow Intelligence System. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="hover:text-white cursor-pointer transition-colors">Documentation</span>
            <span className="hover:text-white cursor-pointer transition-colors">Github</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
