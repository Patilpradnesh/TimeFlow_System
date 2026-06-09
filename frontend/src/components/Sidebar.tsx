"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, CheckSquare, StickyNote, 
  AlarmClock, Target, Grid3X3, Settings, 
  LogOut, Clock, BookOpen, Database
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Notes", href: "/notes", icon: StickyNote },
  { name: "Alarms", href: "/alarms", icon: AlarmClock },
  { name: "Goals", href: "/goals", icon: Target },
  { name: "Trackers", href: "/trackers", icon: Database },
  { name: "FlowGrid", href: "/flowgrid", icon: Grid3X3 },
  { name: "Guide", href: "/guide", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Industry-based accent colors
  const getIndustryColor = () => {
    switch (user?.industry) {
      case 'TECH': return 'text-blue-500 bg-blue-500/10';
      case 'HEALTH': return 'text-emerald-500 bg-emerald-500/10';
      case 'BUSINESS': return 'text-amber-500 bg-amber-500/10';
      case 'SCHOOL': return 'text-indigo-500 bg-indigo-500/10';
      case 'COLLEGE': return 'text-purple-500 bg-purple-500/10';
      case 'CREATIVE': return 'text-pink-500 bg-pink-500/10';
      case 'FINANCE': return 'text-cyan-500 bg-cyan-500/10';
      case 'SPORTS': return 'text-orange-500 bg-orange-500/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  const activeColor = getIndustryColor();

  return (
    <div className="w-64 h-screen bg-slate-950 border-r border-slate-900 flex flex-col p-4 fixed left-0 top-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Clock size={20} className="text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-white">TimeFlow</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group",
                isActive 
                  ? activeColor 
                  : "text-slate-500 hover:text-slate-200 hover:bg-slate-900"
              )}
            >
              <item.icon size={20} className={cn(
                "transition-colors",
                isActive ? "" : "group-hover:text-slate-200"
              )} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="pt-4 mt-4 border-t border-slate-900 space-y-1">
        <Link 
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-200 hover:bg-slate-900 transition-all"
        >
          <Settings size={20} />
          Settings
        </Link>
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>

      {/* User Mini Profile */}
      <div className="mt-6 p-3 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-xs font-bold border border-slate-700">
          {user?.name?.charAt(0) || "U"}
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-sm font-bold text-white truncate">{user?.name}</p>
          <p className="text-[10px] text-slate-500 truncate uppercase tracking-widest">{user?.industry}</p>
        </div>
      </div>
    </div>
  );
}
