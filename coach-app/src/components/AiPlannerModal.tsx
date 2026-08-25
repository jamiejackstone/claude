import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Wand2, Loader2, AlertTriangle } from "lucide-react";
import { useSessionPlans, SessionPlan } from "../context/SessionPlanContext";
import { useDrills } from "../context/DrillContext";
import { useSchedule } from "../context/ScheduleContext";
import { AgeGroup } from "../types";
import { CORE_VALUES } from "../data/coreValues";
import { CORE_VALUE_QUOTES } from "../constants/coreValues";
import { getSeasonWeekByTermAndWeek } from "../data/termDates";

interface AiPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTerm: string;
  currentWeek: number;
  currentAgeGroup: string;
  ageGroups: { name: string; range: string; length: string }[];
  allLocations: { id: string; name: string }[];
}

export function AiPlannerModal({ isOpen, onClose, currentTerm, currentWeek, currentAgeGroup, ageGroups, allLocations }: AiPlannerModalProps) {
  const { sessionPlans, updateSessionPlan } = useSessionPlans();
  const { drills } = useDrills();
  const { settings, getWeeksInTerm, getClassDate } = useSchedule();
  
  const [targetTerm, setTargetTerm] = useState(currentTerm);
  const [targetWeek, setTargetWeek] = useState<number | "ALL">("ALL");
  const [targetAgeGroup, setTargetAgeGroup] = useState<string | "ALL">("ALL");
  const [targetLocation, setTargetLocation] = useState<string>("ALL LOCATIONS");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableTerms = settings.terms.map(t => t.name);
  if (!availableTerms.includes(currentTerm)) availableTerms.push(currentTerm);

  const termWeeks = getWeeksInTerm(targetTerm);

  const handleGenerate = async () => {
    setError(null);
    const weeksToProcess = targetWeek === "ALL" ? Array.from({ length: termWeeks }, (_, i) => i + 1) : [targetWeek];
    const ageGroupsToProcess = targetAgeGroup === "ALL" ? ageGroups.map(ag => ag.name) : [targetAgeGroup];

    // Validation for Full Term Generation
    if (targetWeek === "ALL") {
      const missingRequirements: string[] = [];
      for (const ag of ageGroupsToProcess) {
        // REMOVED targetTerm filtering as requested
        const availableDrills = drills.filter(d => 
          d.ageGroups.includes(ag as AgeGroup)
        );
        
        const warmups = availableDrills.filter(d => d.types.includes("Warm-up")).length;
        const skills = availableDrills.filter(d => d.types.includes("Skill")).length;
        
        // Calculate minimums based on term length and max 4 repeats
        // Rookies have 3 skills, Rising Stars 2, Ballers 1
        const skillsPerWeek = ag === "Ballers" ? 1 : (ag.includes("Rising Stars") ? 2 : 3);
        
        // 1 warmup per week -> termWeeks warmups total -> termWeeks / 4 minimum unique
        const minWarmups = Math.ceil(termWeeks / 4);
        // termWeeks * skillsPerWeek skills total -> (termWeeks * skillsPerWeek) / 4 minimum unique
        const minSkills = Math.ceil((termWeeks * skillsPerWeek) / 4);
        
        if (warmups < minWarmups || skills < minSkills) {
          missingRequirements.push(`${ag}: Needs ${Math.max(0, minWarmups - warmups)} more warm-ups and ${Math.max(0, minSkills - skills)} more skill drills.`);
        }
      }
      
      if (missingRequirements.length > 0) {
        setError(`Not enough drills in the library for ${targetTerm} to generate a full term. Please add more to the Drills module:\n${missingRequirements.join('\n')}`);
        return;
      }
    }

    setIsGenerating(true);
    
    // Simulate AI thinking time
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Determine starting core value index for the sequence
    let coreValueIndex = 0;
    const termOrder = ["Spring", "Summer", "Autumn"];
    const currentTermIdx = termOrder.indexOf(targetTerm);
    
    if (currentTermIdx !== -1) {
      const prevTerm = termOrder[(currentTermIdx - 1 + termOrder.length) % termOrder.length];
      const prevTermWeeks = getWeeksInTerm(prevTerm);
      
      // Find the last available core value from the previous term
      // We look backwards from the last week of the term
      let lastValue: string | null = null;
      for (let w = prevTermWeeks; w >= 1; w--) {
        const lastWeekPlan = sessionPlans.find(p => p.term === prevTerm && p.week === w && !p.locationId);
        if (lastWeekPlan) {
          // Verify this wasn't a holiday week for everyone (a break)
          const { isHoliday } = getClassDate(prevTerm, w, allLocations[0].name);
          if (isHoliday) continue;

          const huddle = lastWeekPlan.activities.find(a => a.huddle)?.huddle;
          if (huddle) {
            lastValue = huddle.coreValue;
            break;
          }
        }
      }

      if (lastValue) {
        const lastIdx = CORE_VALUES.indexOf(lastValue as any);
        if (lastIdx !== -1) {
          coreValueIndex = (lastIdx + 1) % CORE_VALUES.length;
        }
      }
    }

    // If we are generating for a specific week, we need to find the core value of the previous week
    if (targetWeek !== "ALL" && targetWeek > 1) {
      // Look backwards for the most recent core value in the current term
      let lastValue: string | null = null;
      for (let w = targetWeek - 1; w >= 1; w--) {
        const prevWeekPlan = sessionPlans.find(p => p.term === targetTerm && p.week === w && !p.locationId);
        if (prevWeekPlan) {
          // Verify this wasn't a holiday week for everyone (a break)
          const { isHoliday } = getClassDate(targetTerm, w, allLocations[0].name);
          if (isHoliday) continue;

          const huddle = prevWeekPlan.activities.find(a => a.huddle)?.huddle;
          if (huddle) {
            lastValue = huddle.coreValue;
            break;
          }
        }
      }

      if (lastValue) {
        const lastIdx = CORE_VALUES.indexOf(lastValue as any);
        if (lastIdx !== -1) {
          coreValueIndex = (lastIdx + 1) % CORE_VALUES.length;
        }
      }
    }

    // Track drill usage per term and age group to enforce max 3 repeats
    const drillUsage: Record<string, Record<string, number>> = {}; // ageGroup -> drillId -> count

    for (const ag of ageGroupsToProcess) {
      drillUsage[ag] = {};
      
      // Pre-fill usage from existing plans for this term and age group
      const existingTermPlans = sessionPlans.filter(p => p.term === targetTerm && p.ageGroup === ag && !p.locationId);
      for (const plan of existingTermPlans) {
        // Only count usage for weeks we are NOT about to overwrite
        if (targetWeek === "ALL" || plan.week !== targetWeek) {
          for (const activity of plan.activities) {
            if (activity.drill && activity.name) {
              const drillId = drills.find(d => d.name === activity.name)?.id;
              if (drillId) {
                drillUsage[ag][drillId] = (drillUsage[ag][drillId] || 0) + 1;
              }
            }
          }
        }
      }

      const availableDrills = drills.filter(d => 
        d.ageGroups.includes(ag as AgeGroup)
      );

      for (const week of weeksToProcess) {
        const planId = `${targetTerm}-w${week}-${ag.replace(/\s+/g, '')}`;
        const existingPlan = sessionPlans.find(p => p.id === planId && !p.locationId);
        
        if (!existingPlan) continue;

        // Skip generation for this specific location if it's a holiday (break or bank holiday)
        if (targetLocation !== "ALL LOCATIONS") {
          const { isHoliday } = getClassDate(targetTerm, week, targetLocation);
          if (isHoliday) continue;
        }

        const updatedPlan = { ...existingPlan, activities: [...existingPlan.activities] };
        
        // Update Core Value for the week - continuous rolling cycle across the season
        const seasonWeekInfo = getSeasonWeekByTermAndWeek(targetTerm, week);
        const coreValueObj = seasonWeekInfo ? seasonWeekInfo.coreValue : CORE_VALUES[(week - 1) % CORE_VALUES.length];
        const currentWeekCoreValue = coreValueObj.name;
        const isYounger = ag.includes("Rookies") || (ag.includes("Combined") && updatedPlan.ageRange.includes("5-9"));
        const quoteType = isYounger ? "younger" : "older";
        const quote = (CORE_VALUE_QUOTES as any)[currentWeekCoreValue]?.[quoteType] || coreValueObj.coachNotes;

        const huddleIndex = updatedPlan.activities.findIndex(a => a.huddle);
        if (huddleIndex !== -1) {
          updatedPlan.activities[huddleIndex] = {
            ...updatedPlan.activities[huddleIndex],
            name: `CORE VALUE: ${currentWeekCoreValue}`,
            huddle: {
              ...updatedPlan.activities[huddleIndex].huddle!,
              coreValue: currentWeekCoreValue,
              quote: quote
            }
          };
        }

        let hasShooting = false;
        const usedThisWeek = new Set<string>();
        const focusesThisWeek = new Set<string>();

        const getDrillFocuses = (focus: string) => {
          if (!focus) return [];
          return focus.split(',').map(f => {
            const normalized = f.trim().toLowerCase();
            if (normalized.includes("shooting") || normalized.includes("finishing")) return "shooting";
            if (normalized.includes("passing")) return "passing";
            if (normalized.includes("dribbling") || normalized.includes("handling")) return "dribbling";
            if (normalized.includes("defence") || normalized.includes("defense")) return "defence";
            if (normalized.includes("rebounding")) return "rebounding";
            if (normalized.includes("footwork")) return "footwork";
            return normalized;
          });
        };

        const skillActivities = updatedPlan.activities.filter(a => a.segment.includes("Skills") || a.segment.includes("Warm Up"));
        
        for (let i = 0; i < skillActivities.length; i++) {
          const activity = skillActivities[i];
          
          let selectedDrill = null;

          // RULE: For Rookies, Skills 3 (index 3 in skillActivities list usually) is ALWAYS "The Numbers Game"
          // In SessionPlanContext, Rookies have: Warmup, Skills 1, Skills 2, Skills 3. 
          // So skillActivities[3] is Skills 3.
          if (ag === "Rookies" && activity.segment.includes("Skills 3")) {
            const numbersGame = availableDrills.find(d => d.name.toLowerCase().includes("numbers game"));
            if (numbersGame) {
              selectedDrill = numbersGame;
            }
          }
          
          if (!selectedDrill) {
            // Sort candidates:
            // 1. Correct type (Warm-up vs Skill)
            // 2. Prioritize Shooting if not yet present and we're at the last skill slots
            // 3. Unused focus this week
            // 4. Least used in term so far
            // 5. Random tie-breaker
            const isWarmupActivity = activity.segment.toLowerCase().includes("warm up");
            const candidates = [...availableDrills]
              .filter(d => isWarmupActivity ? d.types.includes("Warm-up") : d.types.includes("Skill"))
              .sort((a, b) => {
                const aFocuses = getDrillFocuses(a.focus);
                const bFocuses = getDrillFocuses(b.focus);
                
                // RULE: Prioritize Shooting if missing
                const needsShootingPriority = !hasShooting && (i >= skillActivities.length - 2); 
                if (needsShootingPriority) {
                  const aIsShooting = aFocuses.includes("shooting") ? 1 : 0;
                  const bIsShooting = bFocuses.includes("shooting") ? 1 : 0;
                  if (aIsShooting !== bIsShooting) return bIsShooting - aIsShooting;
                }

                // RULE: Balance skills (prefer unused focuses)
                const aFocusUsed = aFocuses.some(f => focusesThisWeek.has(f)) ? 1 : 0;
                const bFocusUsed = bFocuses.some(f => focusesThisWeek.has(f)) ? 1 : 0;
                if (aFocusUsed !== bFocusUsed) return aFocusUsed - bFocusUsed;

                // Usage tracking
                const usageA = drillUsage[ag][a.id] || 0;
                const usageB = drillUsage[ag][b.id] || 0;
                if (usageA !== usageB) return usageA - usageB;
                
                return Math.random() - 0.5;
              });

            for (const drill of candidates) {
              if (usedThisWeek.has(drill.id)) continue;
              
              const usage = drillUsage[ag][drill.id] || 0;
              if (usage >= 4) continue; // Max 4 times per term
              
              selectedDrill = drill;
              break;
            }
          }

          if (selectedDrill) {
            drillUsage[ag][selectedDrill.id] = (drillUsage[ag][selectedDrill.id] || 0) + 1;
            usedThisWeek.add(selectedDrill.id);
            const drillFocuses = getDrillFocuses(selectedDrill.focus);
            drillFocuses.forEach(f => focusesThisWeek.add(f));
            if (drillFocuses.includes("shooting")) hasShooting = true;
            
            const activityIndex = updatedPlan.activities.findIndex(a => a.id === activity.id);
            if (activityIndex !== -1) {
              updatedPlan.activities[activityIndex] = {
                ...activity,
                name: selectedDrill.name,
                drill: {
                  summary: selectedDrill.summary,
                  focus: selectedDrill.focus,
                  video: selectedDrill.video,
                  easy: selectedDrill.easy,
                  expert: selectedDrill.expert,
                  coachCues: selectedDrill.coachCues,
                }
              };
            }
          }
        }

        await updateSessionPlan(updatedPlan.id, updatedPlan, targetLocation);
      }
    }

    setIsGenerating(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-brand-navy/80 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-brand-navy border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Wand2 size={20} />
              </div>
              <div>
                <h2 className="font-display text-xl tracking-wide text-white">AI Session Planner</h2>
                <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Generate optimized plans</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 items-start">
                <AlertTriangle className="text-red-500 shrink-0" size={20} />
                <div className="text-sm text-red-200 whitespace-pre-line">
                  {error}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 block">Term</label>
                <select 
                  value={targetTerm}
                  onChange={(e) => { setTargetTerm(e.target.value); setError(null); }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-brand-yellow outline-none transition-all appearance-none"
                >
                  {availableTerms.map(t => (
                    <option key={t} value={t} className="bg-brand-navy">{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 block">Week</label>
                <select 
                  value={targetWeek}
                  onChange={(e) => { setTargetWeek(e.target.value === "ALL" ? "ALL" : Number(e.target.value)); setError(null); }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-brand-yellow outline-none transition-all appearance-none"
                >
                  <option value="ALL" className="bg-brand-navy">Full Term</option>
                  {Array.from({ length: termWeeks }, (_, i) => i + 1).map(w => (
                    <option key={w} value={w} className="bg-brand-navy">Week {w}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 block">Age Group</label>
                <select 
                  value={targetAgeGroup}
                  onChange={(e) => { setTargetAgeGroup(e.target.value); setError(null); }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-brand-yellow outline-none transition-all appearance-none"
                >
                  <option value="ALL" className="bg-brand-navy">All Age Groups</option>
                  {ageGroups.map(ag => (
                    <option key={ag.name} value={ag.name} className="bg-brand-navy">{ag.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 block">Location</label>
                <select 
                  value={targetLocation}
                  onChange={(e) => { setTargetLocation(e.target.value); setError(null); }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-brand-yellow outline-none transition-all appearance-none"
                >
                  <option value="ALL LOCATIONS" className="bg-brand-navy">All Locations</option>
                  {allLocations.map(loc => (
                    <option key={loc.id} value={loc.name} className="bg-brand-navy">{loc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">AI Rules Applied:</h4>
              <ul className="text-sm text-white/60 space-y-1 list-disc list-inside">
                <li>Selects from all drills in library (no seasonal limit)</li>
                <li>Strictly matches drills to correct age groups</li>
                <li>Ensures balanced mix of skill focuses (no focus clustering)</li>
                <li>Prioritizes at least one shooting drill per session</li>
                <li>Forces 'The Numbers Game' for Rookies Skills 3 slot</li>
                <li>Max 4 repetitions per drill per term</li>
                <li>Sequences Core Values from previous sessions</li>
              </ul>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 size={18} />
                  Generate Session Plans
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
