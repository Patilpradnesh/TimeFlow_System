"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import { NotificationCenter } from "@/components/NotificationCenter";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If not loading and no user exists, kick them back to login
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar - Persistent */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 ml-64 min-h-screen relative overflow-y-auto">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 w-full h-20 border-b border-slate-900/50 bg-slate-950/80 backdrop-blur-xl flex items-center justify-between px-8">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <span className="capitalize">{pathname.replace('/', '') || 'Dashboard'}</span>
          </div>
          <div className="flex items-center gap-4">
            <NotificationCenter />
            <div className="h-8 w-[1px] bg-slate-900"></div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-white">{user?.name}</span>
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                {user?.name?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
        
        <div className="relative z-10 p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
