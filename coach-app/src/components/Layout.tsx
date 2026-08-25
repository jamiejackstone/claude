import React from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Dribbble, ClipboardList, Users, LogOut, Menu, X, ShieldCheck, MapPin, Medal, Settings, UserCheck, Database, Wrench } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useDrills } from "../context/DrillContext";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

export default function Layout() {
  const { user, logout, activeLocation } = useAuth();
  const { drills } = useDrills();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  
  // Calculate unread comments for Admin/Owner
  const unreadCommentsCount = (user?.role === "ADMINISTRATOR" || user?.role === "OWNER") 
    ? drills.reduce((count, drill) => {
        return count + (drill.comments?.filter(c => !c.isRead).length || 0);
      }, 0)
    : 0;

  let navItems = [];
  
  const allItems = [
    { name: "Session Plans", path: "/", icon: Dribbble },
    { name: "Drills Library", path: "/drills", icon: Database },
    { name: "Reports", path: "/reports", icon: ClipboardList },
    { name: "Settings", path: "/admin", icon: Settings },
  ];

  if (user?.role === "OWNER") {
    navItems = allItems;
  } else if (user?.role === "ADMINISTRATOR") {
    navItems = allItems.filter(item => ["Session Plans", "Reports", "Drills Library", "Settings"].includes(item.name));
  } else if (user?.role === "HEAD_COACH") {
    navItems = allItems.filter(item => ["Session Plans", "Reports", "Drills Library"].includes(item.name));
  } else if (user?.role === "ASSISTANT_COACH") {
    navItems = allItems.filter(item => ["Session Plans", "Reports"].includes(item.name));
  }

  const logoUrl = "https://assets.cdn.filesafe.space/9p0wEiLpTaIe1FDTFFQI/media/6929cd6d8f155a31026c4478.png";

  return (
    <div className="min-h-screen bg-brand-navy flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-72 flex-col border-r border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 h-screen">
        <div className="p-8">
          <div className="mb-10">
            <img src={logoUrl} alt="Hoop Heroes" className="h-12 w-auto" />
          </div>

          <nav className="space-y-3">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 relative",
                    isActive
                      ? "bg-brand-yellow text-brand-navy shadow-xl shadow-brand-yellow/20 font-bold"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )
                }
              >
                <item.icon size={22} />
                <span className="font-display text-lg tracking-wider uppercase">{item.name}</span>
                {item.name === "Drills Library" && unreadCommentsCount > 0 && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {unreadCommentsCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-white/10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-2xl yellow-gradient flex items-center justify-center text-brand-navy font-bold shadow-lg">
              {user?.name.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold uppercase tracking-tight">{user?.name}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-brand-yellow font-black uppercase tracking-[0.15em]">
                  {user?.role.replace("_", " ")}
                </span>
                {activeLocation && (
                  <>
                    <span className="text-white/20 text-[8px]">•</span>
                    <div className="flex items-center gap-1 text-white/40">
                      <MapPin size={8} />
                      <span className="text-[8px] font-bold uppercase tracking-widest">{activeLocation}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-5 py-3 w-full text-white/40 hover:text-brand-yellow transition-all text-sm font-bold uppercase tracking-widest bg-white/5 rounded-xl border border-white/5"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Nav */}
      <header className="md:hidden flex items-center justify-between p-5 border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <img src={logoUrl} alt="Hoop Heroes" className="h-8 w-auto" />
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-brand-yellow">
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            className="md:hidden fixed inset-0 z-40 bg-brand-navy pt-24 px-8"
          >
            <nav className="space-y-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-5 p-5 rounded-3xl transition-all relative",
                      isActive 
                        ? "bg-brand-yellow text-brand-navy shadow-2xl shadow-brand-yellow/20" 
                        : "bg-white/5 text-white/60"
                    )
                  }
                >
                  <item.icon size={26} />
                  <span className="text-xl font-display tracking-widest uppercase">{item.name}</span>
                  {item.name === "Drills Library" && unreadCommentsCount > 0 && (
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full">
                      {unreadCommentsCount}
                    </span>
                  )}
                </NavLink>
              ))}
              <div className="pt-8 mt-8 border-t border-white/10">
                <button
                  onClick={logout}
                  className="flex items-center gap-5 p-5 rounded-3xl bg-white/5 text-white/40 w-full font-bold uppercase tracking-widest"
                >
                  <LogOut size={26} />
                  <span>Sign Out</span>
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
