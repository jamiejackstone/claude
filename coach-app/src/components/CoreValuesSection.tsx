import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Award, 
  ChevronDown, 
  Sparkles, 
  BookOpen, 
  HelpCircle, 
  Layers, 
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight
} from "lucide-react";
import { CORE_VALUES, CoreValue } from "../data/coreValues";
import { 
  getSeasonWeek, 
  getCoreValueForSeasonWeek, 
  getSeasonWeekByTermAndWeek,
  SeasonWeekResult 
} from "../data/termDates";
import { cn } from "../lib/utils";
import { format } from "date-fns";

interface CoreValuesSectionProps {
  currentWeek: number;             // Week in selected term (1-14)
  selectedTerm?: string;          // "Autumn" | "Spring" | "Summer"
  onSelectWeek?: (week: number) => void;
  // Optional current live date override
  currentDate?: Date;
}

export default function CoreValuesSection({ 
  currentWeek, 
  selectedTerm = "Autumn",
  onSelectWeek,
  currentDate = new Date()
}: CoreValuesSectionProps) {
  const [isFullListOpen, setIsFullListOpen] = useState(false);
  const [expandedValues, setExpandedValues] = useState<Record<number, boolean>>({});

  // Resolve current live schedule state
  const liveSeasonWeekResult: SeasonWeekResult = getSeasonWeek(currentDate);

  // Resolve what the coach is currently viewing in the UI (term + weekInTerm)
  const viewingSeasonWeekInfo = getSeasonWeekByTermAndWeek(selectedTerm, currentWeek);
  
  // The active Core Value for what's currently being viewed
  const activeCoreValue: CoreValue = viewingSeasonWeekInfo 
    ? viewingSeasonWeekInfo.coreValue 
    : getCoreValueForSeasonWeek(currentWeek);

  const activeSeasonWeekNumber = viewingSeasonWeekInfo 
    ? viewingSeasonWeekInfo.seasonWeek 
    : currentWeek;

  const activeValueCycleNumber = ((activeSeasonWeekNumber - 1) % 13) + 1;
  const cycleCount = Math.floor((activeSeasonWeekNumber - 1) / 13) + 1;

  const toggleValueExpand = (valNum: number) => {
    setExpandedValues(prev => ({
      ...prev,
      [valNum]: !prev[valNum]
    }));
  };

  const handleExpandAll = () => {
    const allExpanded: Record<number, boolean> = {};
    CORE_VALUES.forEach(cv => {
      allExpanded[cv.week] = true;
    });
    setExpandedValues(allExpanded);
  };

  const handleCollapseAll = () => {
    setExpandedValues({});
  };

  return (
    <div className="space-y-4">
      {/* Live Holiday Notice if currently in a break */}
      {liveSeasonWeekResult.isHoliday && (
        <div className="glass-card p-5 md:p-6 rounded-3xl border border-brand-yellow/30 bg-brand-yellow/10 shadow-lg relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-yellow/20 flex items-center justify-center text-brand-yellow border border-brand-yellow/40 shrink-0">
                <Calendar size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-brand-yellow uppercase tracking-[0.25em]">
                    Scheduled Break
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-yellow text-brand-navy">
                    No Classes
                  </span>
                </div>
                <h3 className="font-display text-xl sm:text-2xl tracking-wider text-white uppercase mt-0.5">
                  {liveSeasonWeekResult.holidayName}
                </h3>
                <p className="text-xs sm:text-sm text-white/80 mt-1 flex items-center gap-1.5 font-medium">
                  <Clock size={14} className="text-brand-yellow" />
                  <span>
                    Classes resume on{" "}
                    <strong className="text-brand-yellow font-bold">
                      {format(liveSeasonWeekResult.resumeDate, "EEEE do MMMM yyyy")}
                    </strong>{" "}
                    ({liveSeasonWeekResult.resumeTerm} Term • Season Week {liveSeasonWeekResult.resumeSeasonWeek} of 39)
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Featured "This Week's Core Value" Card */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-brand-yellow/20 bg-gradient-to-br from-brand-yellow/10 via-brand-navy/60 to-black/40 shadow-xl shadow-brand-yellow/5 relative overflow-hidden">
        {/* Background decorative watermark */}
        <div className="absolute -right-6 -bottom-6 opacity-5 pointer-events-none text-brand-yellow">
          <Award size={180} />
        </div>

        <div className="relative z-10 space-y-6">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-yellow/20 flex items-center justify-center text-brand-yellow border border-brand-yellow/30 shadow-inner">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black text-brand-yellow uppercase tracking-[0.25em]">
                    This Week's Core Value
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-white/10 text-white/90 border border-white/10">
                    Season Week {activeSeasonWeekNumber} of 39
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-brand-yellow text-brand-navy">
                    {selectedTerm} Week {currentWeek} of {viewingSeasonWeekInfo?.totalWeeksInTerm || 14}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-white/5 text-brand-yellow/90 border border-brand-yellow/20">
                    Value {activeValueCycleNumber} of 13 (Cycle {cycleCount})
                  </span>
                </div>
                <div className="flex items-baseline gap-3 mt-1 flex-wrap">
                  <h3 className="font-display text-2xl sm:text-3xl tracking-wider text-white uppercase">
                    {activeCoreValue.name}
                  </h3>
                  <span className="text-sm sm:text-base font-bold text-brand-yellow/80 italic">
                    — "{activeCoreValue.subtitle}"
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsFullListOpen(!isFullListOpen)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-all self-start sm:self-center"
            >
              <Layers size={14} className="text-brand-yellow" />
              <span>{isFullListOpen ? "Hide 13-Week Cycle" : "View 13-Week Cycle"}</span>
              <ChevronDown size={14} className={cn("transition-transform duration-200", isFullListOpen && "rotate-180")} />
            </button>
          </div>

          {/* Bank holiday note if applicable */}
          {viewingSeasonWeekInfo?.bankHolidayException && (
            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
              <strong className="font-bold text-blue-200">Bank Holiday Notice ({viewingSeasonWeekInfo.bankHolidayException.name}):</strong>{" "}
              {viewingSeasonWeekInfo.bankHolidayException.note}
            </div>
          )}

          {/* Core Value Content: Coach Notes + Reflection Question */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Coach Notes */}
            <div className="p-5 rounded-2xl bg-black/30 border border-white/10 space-y-2.5">
              <div className="flex items-center gap-2 text-brand-yellow">
                <BookOpen size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                  Head-Coach Guidance
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-medium">
                {activeCoreValue.coachNotes}
              </p>
            </div>

            {/* Reflection Question */}
            <div className="p-5 rounded-2xl bg-brand-yellow/5 border border-brand-yellow/20 space-y-2.5 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-brand-yellow">
                  <HelpCircle size={16} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                    Post-Session Reflection
                  </span>
                </div>
                <p className="text-xs sm:text-sm italic text-brand-yellow/90 leading-relaxed font-semibold">
                  "{activeCoreValue.reflectionQuestion}"
                </p>
              </div>
              <div className="pt-2 text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-brand-yellow/60" />
                <span>Reflect on this question at session close</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full 13-Week Rolling Curriculum List View (Collapsible) */}
      <AnimatePresence>
        {isFullListOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/10 bg-black/30 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-brand-yellow uppercase tracking-[0.2em]">
                      Season Curriculum
                    </span>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                      (Continuous 13-week rolling cycle across 39 season weeks)
                    </span>
                  </div>
                  <h4 className="font-display text-xl sm:text-2xl tracking-wider text-white uppercase mt-0.5">
                    The 13 Core Values Cycle
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExpandAll}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-colors"
                  >
                    Expand All
                  </button>
                  <button
                    onClick={handleCollapseAll}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-colors"
                  >
                    Collapse All
                  </button>
                </div>
              </div>

              {/* 13-Week Accordion List */}
              <div className="space-y-3">
                {CORE_VALUES.map((cv) => {
                  const isCurrent = cv.week === activeValueCycleNumber;
                  const isExpanded = !!expandedValues[cv.week] || isCurrent;

                  return (
                    <div
                      key={cv.week}
                      className={cn(
                        "rounded-2xl border transition-all duration-200 overflow-hidden",
                        isCurrent 
                          ? "bg-brand-yellow/10 border-brand-yellow/40 shadow-lg shadow-brand-yellow/5" 
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      )}
                    >
                      {/* Accordion Header */}
                      <button
                        onClick={() => toggleValueExpand(cv.week)}
                        className="w-full p-4 sm:p-5 flex items-center justify-between text-left transition-colors hover:bg-white/5 gap-4"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0",
                            isCurrent 
                              ? "bg-brand-yellow text-brand-navy shadow-md font-black" 
                              : "bg-white/10 text-white/80"
                          )}>
                            V{String(cv.week).padStart(2, "0")}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-display text-lg tracking-wide text-white leading-none">
                                {cv.name}
                              </h5>
                              <span className="text-xs font-semibold text-brand-yellow/70 italic">
                                — "{cv.subtitle}"
                              </span>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-brand-yellow text-brand-navy">
                                  Active Value (Season W{activeSeasonWeekNumber})
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-white/50 truncate mt-1">
                              {cv.coachNotes}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <ChevronDown
                            size={18}
                            className={cn(
                              "text-white/40 transition-transform duration-200",
                              isExpanded && "rotate-180 text-brand-yellow"
                            )}
                          />
                        </div>
                      </button>

                      {/* Accordion Body */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="px-5 pb-5 pt-2 border-t border-white/5 space-y-4 bg-black/20">
                              {/* Coach Notes */}
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5 text-brand-yellow">
                                  <BookOpen size={13} />
                                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                                    Head-Coach Guidance
                                  </span>
                                </div>
                                <p className="text-xs text-white/90 leading-relaxed font-medium">
                                  {cv.coachNotes}
                                </p>
                              </div>

                              {/* Reflection Question */}
                              <div className="p-3.5 rounded-xl bg-brand-yellow/5 border border-brand-yellow/15 space-y-1">
                                <div className="flex items-center gap-1.5 text-brand-yellow">
                                  <HelpCircle size={13} />
                                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                                    Reflection Question
                                  </span>
                                </div>
                                <p className="text-xs italic text-brand-yellow/90 leading-relaxed font-medium">
                                  "{cv.reflectionQuestion}"
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
