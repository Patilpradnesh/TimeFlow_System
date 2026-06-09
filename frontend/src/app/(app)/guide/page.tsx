"use client";

import { 
  BookOpen, Target, CheckCircle2, 
  Map, Lightbulb, Zap, ArrowRight 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GuidePage() {
  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black tracking-tight text-white mb-2 flex items-center gap-3">
          <BookOpen className="text-blue-500" size={32} />
          System Guide & Training
        </h1>
        <p className="text-slate-500">Master the TimeFlow methodology to achieve maximum execution continuity.</p>
      </div>

      {/* Intro */}
      <Card className="bg-blue-600/10 border-blue-500/20">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-2">Welcome to your Execution Engine</h3>
          <p className="text-slate-300 leading-relaxed text-sm">
            TimeFlow is not a to-do list. It is an intelligent behavioral system designed to help you start, 
            continue, and finish complex work by removing psychological friction. Read the guides below to 
            understand how to use each feature to your advantage.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {/* Module 1: Smart Tasks & Micro Steps */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-white">
              <CheckCircle2 className="text-emerald-500" />
              1. Smart Tasks & Micro-Steps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-400 text-sm leading-relaxed">
            <p>
              <strong className="text-white">The Problem:</strong> Large tasks (like "Build Website") cause anxiety and procrastination.
            </p>
            <p>
              <strong className="text-white">The Solution:</strong> When creating a new task, always use the <strong>"Micro-Steps"</strong> feature at the bottom of the modal. Break the scary task down into 3 or 4 tiny actions (e.g., "Open laptop", "Create folder").
            </p>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h4 className="text-slate-300 font-bold mb-2 flex items-center gap-2">
                <Lightbulb size={16} className="text-yellow-500" /> Pro Tip
              </h4>
              <p>You can edit any micro-step by clicking on its text. Strike them through as you complete them to build instant momentum!</p>
            </div>
          </CardContent>
        </Card>

        {/* Module 2: The FlowGrid */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-white">
              <Map className="text-purple-500" />
              2. The FlowGrid (Eisenhower Matrix)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-400 text-sm leading-relaxed">
            <p>
              <strong className="text-white">The Problem:</strong> When you have 20 tasks, everything feels urgent, causing decision paralysis.
            </p>
            <p>
              <strong className="text-white">The Solution:</strong> Open the <strong>FlowGrid</strong>. This is a visual map based on the Eisenhower Matrix. It forces you to categorize your tasks visually.
            </p>
            <ul className="space-y-3 list-none pl-0">
              <li className="flex items-start gap-2">
                <ArrowRight size={16} className="text-slate-600 shrink-0 mt-1" />
                <span><strong>Top Left (Urgent & Important):</strong> Do these immediately. Crises and tight deadlines.</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight size={16} className="text-slate-600 shrink-0 mt-1" />
                <span><strong>Bottom Left (Important, Not Urgent):</strong> Schedule these. Deep work and long-term goals.</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight size={16} className="text-slate-600 shrink-0 mt-1" />
                <span><strong>Top Right (Urgent, Not Important):</strong> Delegate or automate these. Interruptions and meetings.</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight size={16} className="text-slate-600 shrink-0 mt-1" />
                <span><strong>Bottom Right (Not Urgent, Not Important):</strong> Delete these. Distractions.</span>
              </li>
            </ul>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mt-4">
              <h4 className="text-slate-300 font-bold mb-2 flex items-center gap-2">
                <Zap size={16} className="text-blue-500" /> How to use it
              </h4>
              <p>Click on an "Unmapped Task" on the right panel to drop it onto the grid. Then, <strong>drag and drop</strong> the card to visually place it in the correct quadrant.</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
