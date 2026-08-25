import React, { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface NavigationBlockerProps {
  isBlocked: boolean;
  message?: string;
}

export function NavigationBlocker({ 
  isBlocked, 
  message = "You have unsaved changes. Are you sure you want to leave?" 
}: NavigationBlockerProps) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isBlocked && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (!isBlocked) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isBlocked]);

  return (
    <AnimatePresence>
      {blocker.state === "blocked" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-brand-navy border border-white/10 rounded-3xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="font-display text-xl tracking-wider text-white">Unsaved Changes</h3>
                </div>
              </div>
              <button
                onClick={() => blocker.reset()}
                className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-white/70">{message}</p>
            </div>
            
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => blocker.reset()}
                className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-colors"
              >
                Keep Editing
              </button>
              <button
                onClick={() => blocker.proceed()}
                className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-colors"
              >
                Leave
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
