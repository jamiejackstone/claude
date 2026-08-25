import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  ChevronRight,
  Plus,
  Cross,
  Search,
  ChevronDown,
  FileText,
  Calendar,
  User,
  MapPin,
  Filter,
  X,
  Mail,
  Phone,
  Trash2,
  ClipboardCheck,
  ClipboardList
} from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import ReportManager from "../components/ReportManager";
import ReportForm from "../components/ReportForm";

type ReportType = "incident" | "accident";

interface BaseReport {
  id: string;
  type: ReportType;
  coachName: string;
  location: string;
  ageGroup: string;
  date: string;
  sessionDate?: string;
  timestamp: number;
  severity?: "routine" | "serious";
  parentFirstName?: string;
  parentEmail: string;
  parentPhone: string;
}

interface IncidentReport extends BaseReport {
  type: "incident";
  playerName: string;
  incidentType: string;
  description: string;
  actionTaken: string;
  witnesses: string;
}

interface AccidentReport extends BaseReport {
  type: "accident";
  injuredName: string;
  injuredAge: string;
  natureOfInjury: string;
  howItHappened: string;
  treatmentGiven: string;
  firstAiderName: string;
  witnesses: string;
  actionToPreventRecurrence: string;
  parentInformed: boolean;
}

type Report = IncidentReport | AccidentReport;

export default function Reports() {
  const { user } = useAuth();
  const [isAdminView, setIsAdminView] = useState(false);

  const isOwner = user?.role === "OWNER";

  return (
    <div className="space-y-8 pb-20">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[2rem] bg-brand-yellow flex items-center justify-center text-brand-navy shadow-2xl shadow-brand-yellow/20 rotate-3">
            <ClipboardList size={32} />
          </div>
          <div>
            <h1 className="font-display text-4xl md:text-5xl tracking-wider text-brand-yellow uppercase leading-none">Reports</h1>
            <p className="text-white/40 mt-2 font-semibold uppercase tracking-widest text-[10px]">
              {isAdminView ? "Digital record of all accidents and incidents." : "Submit an accident or incident report."}
            </p>
          </div>
        </div>

        {isOwner && (
          <div className="flex p-1 bg-white/5 rounded-2xl">
            <button
              onClick={() => setIsAdminView(false)}
              className={cn(
                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                !isAdminView ? "bg-brand-yellow text-brand-navy shadow-lg" : "text-white/40 hover:text-white"
              )}
            >
              Submit
            </button>
            <button
              onClick={() => setIsAdminView(true)}
              className={cn(
                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                isAdminView ? "bg-brand-yellow text-brand-navy shadow-lg" : "text-white/40 hover:text-white"
              )}
            >
              Manage
            </button>
          </div>
        )}
      </div>

      <motion.div 
        key={isAdminView ? "admin" : "submit"}
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="space-y-8"
      >
        {isAdminView && isOwner ? (
          <ReportManager />
        ) : (
          <ReportForm />
        )}
      </motion.div>
    </div>
  );
}
