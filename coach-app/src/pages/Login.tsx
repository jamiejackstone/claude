import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { ChevronRight, ShieldCheck, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";

// Authentication is handled by Cloudflare Access in front of the Worker (email
// OTP or Google). By the time a real visitor loads the app they are already
// authenticated; this screen only covers the identity re-check, the loading
// moment, and the "your email isn't a registered coach" case.
export default function Login() {
  const { user, login, logout, authReady, authError } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (authReady && user) return <Navigate to="/" replace />;

  const handleContinue = async () => {
    setIsSubmitting(true);
    try {
      await login();
    } finally {
      setIsSubmitting(false);
    }
  };

  const logoUrl = "https://assets.cdn.filesafe.space/9p0wEiLpTaIe1FDTFFQI/media/6929cd6d8f155a31026c4478.png";

  return (
    <div className="min-h-screen bg-brand-navy flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-yellow/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-yellow/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <img src={logoUrl} alt="Hoop Heroes" className="h-16 w-auto mx-auto mb-6" />
          <h1 className="font-display text-3xl tracking-wider text-white">Coach Portal</h1>
          <p className="text-white/40 mt-2 font-semibold uppercase tracking-widest text-xs">Secure sign-in via Cloudflare Access.</p>
        </div>

        <div className="glass-card p-8 md:p-10 border-t-4 border-t-brand-yellow shadow-2xl relative overflow-hidden">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
            {!authReady ? (
              <div className="py-10 flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-brand-yellow/30 border-t-brand-yellow rounded-full animate-spin" />
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Verifying your login…</p>
              </div>
            ) : authError ? (
              <>
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold p-4 rounded-xl flex items-start gap-3">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
                <button
                  onClick={logout}
                  className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all"
                >
                  Sign in as a different user
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 text-white/60 text-xs font-medium bg-white/5 border border-white/10 p-4 rounded-xl">
                  <ShieldCheck size={18} className="text-brand-yellow shrink-0" />
                  <span>Your Hoop Heroes login is managed securely — no password to remember.</span>
                </div>
                <button
                  onClick={handleContinue}
                  disabled={isSubmitting}
                  className="w-full py-5 yellow-gradient text-brand-navy rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-brand-yellow/20 flex items-center justify-center gap-3 group disabled:opacity-50"
                >
                  <span>{isSubmitting ? "Entering…" : "Enter Coach Portal"}</span>
                  <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
