import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Star, 
  Calendar, 
  BookOpen, 
  ExternalLink, 
  ChevronRight, 
  CheckCircle2, 
  Users, 
  ChevronLeft, 
  Play, 
  ChevronDown,
  Dribbble,
  Info,
  Clock,
  Quote,
  MapPin,
  Share2,
  Edit2,
  Gamepad2,
  Swords,
  Search,
  X,
  MessageSquare,
  Wand2
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSessionPlans, SessionPlan, Activity } from "../context/SessionPlanContext";
import { useDrills } from "../context/DrillContext";
import { useSchedule } from "../context/ScheduleContext";
import { AiPlannerModal } from "../components/AiPlannerModal";
import { NavigationBlocker } from "../components/NavigationBlocker";
import CoreValuesSection from "../components/CoreValuesSection";
import { cn, getEmbedUrl, deepCleanObject } from "../lib/utils";
import { CORE_VALUES } from "../data/coreValues";
import { CORE_VALUE_QUOTES } from "../constants/coreValues";
import { getSeasonWeekByTermAndWeek } from "../data/termDates";
import { AGE_GROUPS_CONFIG, getLocationByCode } from "../data/locations";
import { AgeGroup } from "../types";
import { format } from "date-fns";

const AGE_GROUPS = AGE_GROUPS_CONFIG.map(ag => ({
  name: ag.name,
  range: ag.range,
  length: ag.length
}));



interface StarRatingProps {
  rating: number;
  onRate: (rating: number) => void;
  onComment?: () => void;
  size?: number;
}

function StarRating({ rating, onRate, onComment, size = 18 }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-black text-brand-yellow uppercase tracking-[0.2em] whitespace-nowrap">Rate Drill</span>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => {
            const isFull = (hover !== null ? hover : rating) >= star;
            const isHalf = (hover !== null ? hover : rating) >= star - 0.5 && (hover !== null ? hover : rating) < star;

            return (
              <div key={star} className="relative flex items-center">
                {/* Left half for 0.5 increments */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1/2 z-10 cursor-pointer"
                  onMouseEnter={() => setHover(star - 0.5)}
                  onMouseLeave={() => setHover(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRate(star - 0.5);
                  }}
                />
                {/* Right half for full increments */}
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1/2 z-10 cursor-pointer"
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRate(star);
                  }}
                />
                
                <div className={cn(
                  "transition-all duration-200",
                  isFull || isHalf ? "text-brand-yellow" : "text-brand-yellow/30"
                )}>
                  {isHalf ? (
                    <div className="relative">
                      <Star size={size} className="text-brand-yellow/30" strokeWidth={2.5} />
                      <div className="absolute inset-0 overflow-hidden w-1/2">
                        <Star size={size} fill="currentColor" strokeWidth={2.5} />
                      </div>
                    </div>
                  ) : (
                    <Star 
                      size={size} 
                      fill={isFull ? "currentColor" : "none"} 
                      strokeWidth={2.5}
                      className={cn(!isFull && "text-brand-yellow/40")}
                    />
                  )}
                </div>
              </div>
            );
          })}
          <span className="ml-2 text-[10px] font-black text-white/20 w-6">{rating > 0 ? rating.toFixed(1) : "—"}</span>
        </div>
      </div>
      {onComment && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onComment();
          }} 
          className="text-[10px] font-black text-white/60 hover:text-white uppercase tracking-[0.2em] flex items-center gap-1 transition-colors"
        >
          Add Comment <MessageSquare size={12} />
        </button>
      )}
    </div>
  );
}

function ShareVideo({ url }: { url: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Hoop Heroes Drill Video',
          url: url
        });
        return;
      } catch (err: any) {
        // Only log if it's not a user cancellation
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        } else {
          // User cancelled, so just stop here and don't trigger fallback
          return;
        }
      }
    }
    
    // Fallback to copy if navigator.share fails or is unavailable
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (clipErr) {
      console.error('Could not copy text: ', clipErr);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all group"
    >
      {copied ? (
        <>
          <CheckCircle2 size={12} className="text-emerald-500" />
          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Copied!</span>
        </>
      ) : (
        <>
          <Share2 size={12} className="text-brand-yellow group-hover:scale-110 transition-transform" />
          <span className="text-[9px] font-black text-white/40 group-hover:text-white transition-colors uppercase tracking-widest">Share Video</span>
        </>
      )}
    </button>
  );
}

const normalizeFocus = (focus: string) => {
  if (!focus) return [];
  const focuses = focus.split(',').map(f => f.trim());
  const normalizedFocuses = focuses.map(f => {
    const normalized = f.toLowerCase();
    if (normalized.includes("shooting") || normalized.includes("finishing") || normalized.includes("layup") || normalized.includes("scoring")) return "Shooting";
    if (normalized.includes("passing") || normalized.includes("teamwork")) return "Passing";
    if (normalized.includes("dribbling") || normalized.includes("ball handling") || normalized.includes("agility") || normalized.includes("listening") || normalized.includes("reaction")) return "Dribbling";
    if (normalized.includes("defence") || normalized.includes("defense") || normalized.includes("shielding") || normalized.includes("deny")) return "Defence";
    if (normalized.includes("rebounding") || normalized.includes("positioning")) return "Rebounding";
    return f;
  });
  // Remove duplicates and return as array for easier rendering
  return Array.from(new Set(normalizedFocuses));
};

export default function Dashboard() {
  const { user, activeLocation, setActiveLocation, allLocations } = useAuth();
  const { sessionPlans, updateSessionPlan, ratings, rateDrill } = useSessionPlans();
  const { drills, rateDrillByName, addComment, markCommentsAsRead } = useDrills();
  
  // Comment Modal State
  const [activeCommentDrill, setActiveCommentDrill] = useState<any | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [newCommentRating, setNewCommentRating] = useState(0);

  const [showCopied, setShowCopied] = useState(false);

  const handleOpenComments = (activityName: string) => {
    let drill = drills.find(d => d.name === activityName);
    
    // Fallback: try to find by ignoring case and extra spaces
    if (!drill) {
      const normalizedActivityName = activityName.toLowerCase().trim();
      drill = drills.find(d => d.name.toLowerCase().trim() === normalizedActivityName);
    }
    
    // Another fallback: try to find if one contains the other
    if (!drill) {
      const normalizedActivityName = activityName.toLowerCase().trim();
      drill = drills.find(d => 
        d.name.toLowerCase().includes(normalizedActivityName) || 
        normalizedActivityName.includes(d.name.toLowerCase())
      );
    }

    if (drill) {
      setActiveCommentDrill(drill);
      if (user && (user.role === "ADMINISTRATOR" || user.role === "OWNER")) {
        markCommentsAsRead(drill.id);
      }
    } else {
      console.warn(`Could not find drill for activity: ${activityName}`);
      // As a last resort, create a temporary drill object just to show the modal
      // This won't save to the database properly without a real ID, but it prevents the button from doing nothing
      setActiveCommentDrill({
        id: `temp-${Date.now()}`,
        name: activityName,
        comments: []
      });
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCommentDrill || !user || !newCommentText.trim() || newCommentRating === 0) return;

    const comment = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      userName: user.name,
      text: newCommentText.trim(),
      rating: newCommentRating,
      timestamp: new Date().toISOString(),
      isRead: false
    };

    await addComment(activeCommentDrill.id, comment);
    setNewCommentText("");
    setNewCommentRating(0);
    
    // Update local state to show the new comment immediately
    setActiveCommentDrill((prev: any) => prev ? {
      ...prev,
      comments: [...(prev.comments || []), comment]
    } : null);
  };
  
  const { getCurrentTermAndWeek, getClassDate, settings, getWeeksInTerm, loading: scheduleLoading } = useSchedule();
  
  const availableTerms = settings.terms.map(t => t.name);
  
  const [currentWeek, setCurrentWeek] = useState(1);
  const [selectedTerm, setSelectedTerm] = useState(availableTerms[0] || "Spring");

  // Sync selectedTerm if availableTerms changes and current selectedTerm is no longer valid
  useEffect(() => {
    if (availableTerms.length > 0 && !availableTerms.includes(selectedTerm)) {
      setSelectedTerm(availableTerms[0]);
    }
  }, [availableTerms, selectedTerm]);

  const [activeAgeGroup, setActiveAgeGroup] = useState(AGE_GROUPS[0].name);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const [isTermMenuOpen, setIsTermMenuOpen] = useState(false);
  const [scheduleInfo, setScheduleInfo] = useState<{ isHolidayWeek: boolean; holidayName: string | null; bankHolidays: any[] }>({ isHolidayWeek: false, holidayName: null, bankHolidays: [] });
  const [classDateInfo, setClassDateInfo] = useState<{ date: Date | null; isHoliday: boolean; holidayName: string | null; isBankHoliday: boolean; bankHolidayName: string | null }>({ date: null, isHoliday: false, holidayName: null, isBankHoliday: false, bankHolidayName: null });
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [applyToRestOfTerm, setApplyToRestOfTerm] = useState(false);
  const [drillSelectionModal, setDrillSelectionModal] = useState<{ isOpen: boolean; activityId: string } | null>(null);
  const [drillSearchQuery, setDrillSearchQuery] = useState("");
  const [isAiPlannerOpen, setIsAiPlannerOpen] = useState(false);

  // Auto-select current term and week once schedule is loaded
  const hasAutoSelected = React.useRef(false);
  useEffect(() => {
    if (!scheduleLoading && !hasAutoSelected.current) {
      const today = new Date();
      const { term, week, isHolidayWeek, holidayName, bankHolidays } = getCurrentTermAndWeek(today);
      setSelectedTerm(term);
      setCurrentWeek(week);
      setScheduleInfo({ isHolidayWeek, holidayName, bankHolidays });
      hasAutoSelected.current = true;
    }
  }, [scheduleLoading, getCurrentTermAndWeek]);

  useEffect(() => {
    if (activeLocation && activeLocation !== "ALL LOCATIONS") {
      const info = getClassDate(selectedTerm, currentWeek, activeLocation);
      setClassDateInfo(info);
    } else {
      setClassDateInfo({ date: null, isHoliday: false, holidayName: null, isBankHoliday: false, bankHolidayName: null });
    }
  }, [selectedTerm, currentWeek, activeLocation, getClassDate]);

  const currentLocation = React.useMemo(() => {
    if (!activeLocation || activeLocation === "ALL LOCATIONS") return null;
    return allLocations.find(l => l.name === activeLocation) || getLocationByCode(activeLocation);
  }, [activeLocation, allLocations]);

  const visibleAgeGroups = AGE_GROUPS;

  useEffect(() => {
    if (currentLocation && currentLocation.hasBallers === false && activeAgeGroup === "Ballers") {
      setActiveAgeGroup("Rookies");
    } else if (!visibleAgeGroups.some(g => g.name === activeAgeGroup)) {
      setActiveAgeGroup(visibleAgeGroups[0]?.name || AGE_GROUPS[0].name);
    }
  }, [currentLocation, visibleAgeGroups, activeAgeGroup]);

  const plan = sessionPlans.find(p => 
    p.term === selectedTerm && 
    p.week === currentWeek && 
    p.ageGroup === activeAgeGroup &&
    p.locationId === activeLocation
  ) || sessionPlans.find(p => 
    p.term === selectedTerm && 
    p.week === currentWeek && 
    p.ageGroup === activeAgeGroup &&
    (!p.locationId || p.locationId === 'ALL LOCATIONS')
  );

  const isAdmin = user?.role === "ADMINISTRATOR" || user?.role === "OWNER";
  const isHeadCoach = user?.role === "HEAD_COACH";
  
  const isHoliday = activeLocation && activeLocation !== "ALL LOCATIONS" && (classDateInfo.isHoliday || classDateInfo.isBankHoliday);

  // Check release date (removed)
  const isReleased = true;

  const handleNextWeek = () => {
    const termWeeks = getWeeksInTerm(selectedTerm);
    if (currentWeek < termWeeks) {
      setCurrentWeek(prev => prev + 1);
    } else {
      const termIndex = availableTerms.indexOf(selectedTerm);
      if (termIndex < availableTerms.length - 1) {
        setSelectedTerm(availableTerms[termIndex + 1]);
        setCurrentWeek(1);
      }
    }
  };

  const handlePrevWeek = () => {
    if (currentWeek > 1) {
      setCurrentWeek(prev => prev - 1);
    } else {
      const termIndex = availableTerms.indexOf(selectedTerm);
      if (termIndex > 0) {
        const prevTerm = availableTerms[termIndex - 1];
        const prevTermWeeks = getWeeksInTerm(prevTerm);
        setSelectedTerm(prevTerm);
        setCurrentWeek(prevTermWeeks);
      }
    }
  };

  const canNavigateNext = (isAdmin || isHeadCoach) && (currentWeek < getWeeksInTerm(selectedTerm) || availableTerms.indexOf(selectedTerm) < availableTerms.length - 1);
  const canNavigatePrev = (isAdmin || isHeadCoach) && (currentWeek > 1 || availableTerms.indexOf(selectedTerm) > 0);
  const showNavigation = isAdmin || isHeadCoach;

  const handleRate = async (activityId: string, activityName: string, rating: number) => {
    if (!activeLocation || activeLocation === 'ALL LOCATIONS') {
      alert("Please select a specific location to rate this drill.");
      return;
    }
    
    // Save location-specific rating
    await rateDrill(activityName, activeLocation, rating);
    
    // Also contribute to the global drill rating (per user)
    rateDrillByName(activityName, rating, user?.id);
  };

  const toggleActivity = (id: string, expandable: boolean) => {
    if (!expandable) return;
    setExpandedActivity(expandedActivity === id ? null : id);
  };

  const handleChangeDrill = (e: React.MouseEvent, activityId: string) => {
    e.stopPropagation();
    if (!(isAdmin || isHeadCoach) || !isEditing) return;

    setDrillSelectionModal({ isOpen: true, activityId });
    setDrillSearchQuery("");
  };

  const handleSelectReplacementDrill = async (drillId: string) => {
    if (!drillSelectionModal || !plan) return;
    const { activityId } = drillSelectionModal;
    
    const replacementDrill = drills.find(d => d.id === drillId);
    if (!replacementDrill) return;

    const updatedPlan = {
      ...plan,
      activities: plan.activities.map(activity => {
        if (activity.id === activityId) {
          const drillData: any = {
            summary: replacementDrill.summary,
            focus: replacementDrill.focus,
            easy: replacementDrill.easy,
            expert: replacementDrill.expert,
            coachCues: replacementDrill.coachCues,
          };
          
          if (replacementDrill.video) {
            drillData.video = replacementDrill.video;
          }

          return {
            ...activity,
            name: replacementDrill.name,
            drill: drillData
          };
        }
        return activity;
      })
    };

    await updateSessionPlan(plan.id, updatedPlan, activeLocation || undefined);
    setDrillSelectionModal(null);
  };

  const handleChangeCoreValue = async (activityId: string, newCoreValue: string) => {
    if (!plan || !(isAdmin || isHeadCoach) || !isEditing) return;
    
    const isYounger = plan.ageGroup.includes("Rookies") || (plan.ageGroup.includes("Combined") && plan.ageRange.includes("5-9"));
    const quoteType = isYounger ? "younger" : "older";
    const quote = CORE_VALUE_QUOTES[newCoreValue as keyof typeof CORE_VALUE_QUOTES][quoteType];

    const updatedPlan = {
      ...plan,
      activities: plan.activities.map(activity => {
        if (activity.id === activityId && activity.huddle) {
          return {
            ...activity,
            name: `CORE VALUE: ${newCoreValue}`,
            huddle: {
              ...activity.huddle,
              coreValue: newCoreValue,
              quote: quote
            }
          };
        }
        return activity;
      })
    };

    await updateSessionPlan(plan.id, updatedPlan, activeLocation || undefined);

    if (applyToRestOfTerm) {
      const termWeeks = getWeeksInTerm(plan.term);
      const startIdx = CORE_VALUES.findIndex(cv => cv.name === newCoreValue);
      
      if (startIdx !== -1) {
        const ageGroups = AGE_GROUPS.map(ag => ag.name);
        
        for (let week = plan.week + 1; week <= termWeeks; week++) {
          const nextValue = CORE_VALUES[(startIdx + (week - plan.week)) % CORE_VALUES.length].name;
          
          for (const agName of ageGroups) {
            const targetPlanId = `${plan.term}-w${week}-${agName.replace(/\s+/g, '')}`;
            const targetPlan = sessionPlans.find(p => p.id === targetPlanId && !p.locationId);
            
            if (targetPlan) {
              const isTargetYounger = agName.includes("Rookies") || (agName.includes("Combined") && targetPlan.ageRange.includes("5-9"));
              const targetQuoteType = isTargetYounger ? "younger" : "older";
              const targetQuote = CORE_VALUE_QUOTES[nextValue as keyof typeof CORE_VALUE_QUOTES][targetQuoteType];

              const updatedTargetPlan = {
                ...targetPlan,
                activities: targetPlan.activities.map(activity => {
                  if (activity.huddle) {
                    return {
                      ...activity,
                      name: `CORE VALUE: ${nextValue}`,
                      huddle: {
                        ...activity.huddle,
                        coreValue: nextValue,
                        quote: targetQuote
                      }
                    };
                  }
                  return activity;
                })
              };
              await updateSessionPlan(targetPlan.id, updatedTargetPlan, "ALL LOCATIONS");
            }
          }
        }
      }
    } else {
      // If not applying to rest of term, still sync across age groups for THIS week
      const ageGroups = AGE_GROUPS.map(ag => ag.name);
      for (const agName of ageGroups) {
        if (agName === plan.ageGroup) continue;
        
        const targetPlanId = `${plan.term}-w${plan.week}-${agName.replace(/\s+/g, '')}`;
        const targetPlan = sessionPlans.find(p => p.id === targetPlanId && !p.locationId);
        
        if (targetPlan) {
          const isTargetYounger = agName.includes("Rookies") || (agName.includes("Combined") && targetPlan.ageRange.includes("5-9"));
          const targetQuoteType = isTargetYounger ? "younger" : "older";
          const targetQuote = CORE_VALUE_QUOTES[newCoreValue as keyof typeof CORE_VALUE_QUOTES][targetQuoteType];

          const updatedTargetPlan = {
            ...targetPlan,
            activities: targetPlan.activities.map(activity => {
              if (activity.huddle) {
                return {
                  ...activity,
                  name: `CORE VALUE: ${newCoreValue}`,
                  huddle: {
                    ...activity.huddle,
                    coreValue: newCoreValue,
                    quote: targetQuote
                  }
                };
              }
              return activity;
            })
          };
          await updateSessionPlan(targetPlan.id, updatedTargetPlan, "ALL LOCATIONS");
        }
      }
    }
  };

  const handleShareSessionPlan = async () => {
    // Determine active age groups for this location
    const activeAgeGroupsForLocation = visibleAgeGroups.filter(ag => {
      if (ag.name === "Ballers" && currentLocation && currentLocation.hasBallers === false) {
        return false;
      }
      return true;
    });

    // Generate text for active age groups
    let text = `🏀 Hoop Heroes Session Plan\n`;
    if (activeLocation && activeLocation !== 'ALL LOCATIONS') {
      text += `📍 Location: ${activeLocation}\n`;
    }
    text += `Term: ${selectedTerm} | Week: ${currentWeek}\n`;

    const plansForSharing = activeAgeGroupsForLocation.map(ag => {
      // 1. If the currently viewed plan in state matches this age group, use it directly (ensures instantaneous edit capture)
      if (plan && plan.ageGroup === ag.name && plan.term === selectedTerm && plan.week === currentWeek) {
        return plan;
      }

      // 2. Check for location-specific customized plan
      if (activeLocation && activeLocation !== 'ALL LOCATIONS') {
        const locPlan = sessionPlans.find(p => 
          p.term === selectedTerm && 
          p.week === currentWeek && 
          p.ageGroup === ag.name && 
          p.locationId?.trim().toLowerCase() === activeLocation.trim().toLowerCase()
        );
        if (locPlan) return locPlan;
      }

      // 3. Fallback to global plan
      return sessionPlans.find(p => 
        p.term === selectedTerm && 
        p.week === currentWeek && 
        p.ageGroup === ag.name && 
        (!p.locationId || p.locationId === 'ALL LOCATIONS')
      );
    }).filter((p): p is SessionPlan => !!p);

    // Try to find a core value from any of the plans to display at the top
    let globalCoreValue = "";
    if (plansForSharing.length > 0) {
      for (const p of plansForSharing) {
        const huddleActivity = p.activities.find(a => a.segment.toLowerCase().includes("huddle") || a.huddle);
        if (huddleActivity?.huddle?.coreValue) {
          globalCoreValue = huddleActivity.huddle.coreValue;
          break;
        }
      }
    }

    if (globalCoreValue) {
      text += `CORE VALUE: ${globalCoreValue}\n`;
    }
    text += `\n`;

    plansForSharing.forEach(p => {
      text += `🏀 Age Group: ${p.ageGroup} (${p.ageRange})\n\n`;

      p.activities.forEach(activity => {
        // Map segment names to clean labels
        let label = "";
        const segmentLower = activity.segment.toLowerCase();
        
        if (segmentLower.includes("warm up")) label = "Warm Up";
        else if (segmentLower.includes("skills 1")) label = "Skills 1";
        else if (segmentLower.includes("skills 2")) label = "Skills 2";
        else if (segmentLower.includes("skills 3")) label = "Skills 3";
        else if (segmentLower.includes("small sided games") || segmentLower.includes("game")) label = "Small Sided Games";
        else if (activity.drill) label = activity.segment;
        else return; // Skip non-drill segments (Huddle, Timeouts, Wrap up)

        text += `${label}: ${activity.name}`;
        if (activity.drill?.video) {
          text += `: ${activity.drill.video}`;
        }
        text += `\n\n`;
      });
    });

    const shareTitle = activeLocation && activeLocation !== 'ALL LOCATIONS'
      ? `Hoop Heroes Session Plan - ${activeLocation} - Week ${currentWeek}`
      : `Hoop Heroes Session Plan - Week ${currentWeek}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: text
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return; // User cancelled
        }
        console.error('Error sharing:', err);
      }
    }

    // Fallback to clipboard + WhatsApp notification
    try {
      await navigator.clipboard.writeText(text);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 3000);
      
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, '_blank');
    } catch (err) {
      console.error('Fallback sharing failed:', err);
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <NavigationBlocker 
        isBlocked={isEditing} 
        message="You are currently editing a session plan. Are you sure you want to leave? Any unsaved changes will be lost." 
      />
      {/* Top Header: Location, Term, Week Selector */}
      <div className="space-y-6 sticky top-0 md:top-0 z-30 bg-brand-navy/80 backdrop-blur-xl pb-6 -mx-4 px-4 md:mx-0 md:px-0 pt-2 sm:pt-0 border-b border-white/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-yellow/10 flex items-center justify-center text-brand-yellow shadow-inner">
              <Dribbble size={28} />
            </div>
            <div>
              <h1 className="font-display text-4xl md:text-5xl tracking-wider text-brand-yellow uppercase leading-none">Session Plans</h1>
              <p className="text-white/40 mt-1 font-semibold uppercase tracking-widest text-[10px]">Manage and view weekly training schedules.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Action Buttons */}
            <div className="flex gap-2">
              {(isAdmin || isHeadCoach) && (
                <div className="flex gap-2">
                  {isEditing && isAdmin && (
                    <button 
                      onClick={() => setIsAiPlannerOpen(true)}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border border-indigo-500/20 h-[46px]"
                    >
                      <Wand2 size={16} />
                      AI Planner
                    </button>
                  )}
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={cn(
                      "flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border h-[46px]",
                      isEditing 
                        ? "bg-brand-yellow text-brand-navy border-brand-yellow shadow-xl shadow-brand-yellow/20" 
                        : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Edit2 size={16} />
                    {isEditing ? "Done Editing" : "Edit Plan"}
                  </button>
                </div>
              )}
            </div>

            {/* Location Selector */}
            {allLocations.length > 0 && (
              <div className="relative">
                <div className="absolute -top-5 left-2">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40">Location</span>
                </div>
                <button 
                  onClick={() => setIsLocationMenuOpen(!isLocationMenuOpen)}
                  className="flex items-center gap-3 bg-white/5 px-4 py-3 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group min-w-[140px]"
                >
                  <div className="flex-1 text-left">
                    <h2 className="font-display text-sm tracking-wider text-brand-yellow leading-none">
                      {activeLocation}
                    </h2>
                  </div>
                  <ChevronDown size={14} className={cn("text-white/20 transition-transform", isLocationMenuOpen && "rotate-180")} />
                </button>

              <AnimatePresence>
                {isLocationMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 mt-2 bg-brand-navy border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl min-w-[200px]"
                  >
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setActiveLocation("ALL LOCATIONS");
                          setIsLocationMenuOpen(false);
                        }}
                        className={cn(
                          "w-full px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/5 border-b border-white/5",
                          activeLocation === "ALL LOCATIONS" ? "text-brand-yellow bg-white/5" : "text-white/40"
                        )}
                      >
                        ALL LOCATIONS
                      </button>
                    )}
                    {allLocations.map((loc) => (
                      <button
                        key={loc.id}
                        onClick={() => {
                          setActiveLocation(loc.name);
                          setIsLocationMenuOpen(false);
                        }}
                        className={cn(
                          "w-full px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/5",
                          activeLocation === loc.name ? "text-brand-yellow bg-white/5" : "text-white/40"
                        )}
                      >
                        {loc.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Term Selector */}
          <div className="relative">
            <div className="absolute -top-5 left-2">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40">Term</span>
            </div>
            <button 
              onClick={() => setIsTermMenuOpen(!isTermMenuOpen)}
              className="flex items-center gap-3 bg-white/5 px-4 py-3 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group min-w-[140px]"
            >
              <div className="flex-1 text-left">
                <h2 className="font-display text-sm tracking-wider text-brand-yellow leading-none uppercase">
                  {selectedTerm}
                </h2>
              </div>
              <ChevronDown size={14} className={cn("text-white/20 transition-transform", isTermMenuOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {isTermMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 mt-2 bg-brand-navy border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl min-w-[200px]"
                >
                  {availableTerms.length > 0 ? availableTerms.map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setSelectedTerm(t);
                        setIsTermMenuOpen(false);
                        
                        // Automatically skip to the correct week
                        const today = new Date();
                        const currentTermAndWeek = getCurrentTermAndWeek(today);
                        
                        if (t === currentTermAndWeek.term) {
                          setCurrentWeek(currentTermAndWeek.week);
                        } else {
                          setCurrentWeek(1);
                        }
                      }}
                      className={cn(
                        "w-full px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/5",
                        selectedTerm === t ? "text-brand-yellow bg-white/5" : "text-white/40"
                      )}
                    >
                      {t}
                    </button>
                  )) : (
                    <div className="w-full px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-white/40">
                      No terms available
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
      </div>
    </div>

        {/* Week & Date Navigation */}
        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4">
          <button 
            onClick={handlePrevWeek}
            disabled={!canNavigatePrev}
            className={cn(
              "p-2 rounded-xl transition-all",
              canNavigatePrev ? "text-brand-yellow hover:bg-white/5" : "text-white/10 cursor-not-allowed"
            )}
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="text-center">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40 leading-none mb-1.5">
              Season Week {getSeasonWeekByTermAndWeek(selectedTerm, currentWeek)?.seasonWeek || currentWeek} of 39
            </p>
            <h2 className="font-display text-xl tracking-wider text-brand-yellow uppercase leading-none mb-1">
              {selectedTerm} Week {currentWeek} of {getWeeksInTerm(selectedTerm)}
            </h2>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">
              {classDateInfo.date ? format(classDateInfo.date, "EEEE do MMMM yyyy") : "No class scheduled"}
            </p>
          </div>

          <button 
            onClick={handleNextWeek}
            disabled={!canNavigateNext}
            className={cn(
              "p-2 rounded-xl transition-all",
              canNavigateNext ? "text-brand-yellow hover:bg-white/5" : "text-white/10 cursor-not-allowed"
            )}
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {(!activeLocation || activeLocation === "ALL LOCATIONS") && scheduleInfo.isHolidayWeek && (
        <div className="mb-8 p-4 bg-brand-yellow/10 border border-brand-yellow/20 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-brand-yellow/20 flex items-center justify-center flex-shrink-0">
            <Calendar size={20} className="text-brand-yellow" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-brand-yellow uppercase tracking-wider">Holiday Week: {scheduleInfo.holidayName}</h3>
            <p className="text-xs text-white/60 mt-1">There are no sessions scheduled for this week. Enjoy the break!</p>
          </div>
        </div>
      )}
      
      {(!activeLocation || activeLocation === "ALL LOCATIONS") && scheduleInfo.bankHolidays.length > 0 && (
        <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Calendar size={20} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wider">Bank Holiday Notice</h3>
            <p className="text-xs text-white/60 mt-1">
              {scheduleInfo.bankHolidays.map(h => `${h.name} (${format(new Date(h.startDate), 'MMM do')})`).join(', ')}
            </p>
          </div>
        </div>
      )}

      {activeLocation && activeLocation !== "ALL LOCATIONS" && classDateInfo.isHoliday && (
        <div className="mb-8 p-4 bg-brand-yellow/10 border border-brand-yellow/20 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-brand-yellow/20 flex items-center justify-center flex-shrink-0">
            <Calendar size={20} className="text-brand-yellow" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-brand-yellow uppercase tracking-wider">Holiday: {classDateInfo.holidayName}</h3>
            <p className="text-xs text-white/60 mt-1">There are no sessions scheduled for this date. Enjoy the break!</p>
          </div>
        </div>
      )}
      
      {activeLocation && activeLocation !== "ALL LOCATIONS" && classDateInfo.isBankHoliday && (
        <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Calendar size={20} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wider">Bank Holiday Notice</h3>
            <p className="text-xs text-white/60 mt-1">
              {classDateInfo.bankHolidayName}
            </p>
          </div>
        </div>
      )}

      {!isHoliday && !((!activeLocation || activeLocation === "ALL LOCATIONS") && scheduleInfo.isHolidayWeek) && (
        <>
          {/* 13 Core Values Surface (This Week's Core Value + 13-Week Curriculum) */}
          <CoreValuesSection 
            currentWeek={currentWeek} 
            selectedTerm={selectedTerm}
            onSelectWeek={(week) => setCurrentWeek(week)} 
          />

          {/* Age Group Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {visibleAgeGroups.map((ag) => {
              const isBallersDisabled = ag.name === "Ballers" && currentLocation && currentLocation.hasBallers === false;
              const sessionTime = currentLocation?.sessionTimes?.[ag.name] || allLocations.find(l => l.name === activeLocation)?.sessionTimes?.[ag.name];

              if (isBallersDisabled) {
                return (
                  <div
                    key={ag.name}
                    aria-disabled="true"
                    title="Ballers is not running at this location"
                    className="flex-1 min-w-[140px] p-4 rounded-2xl border border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed text-left relative overflow-hidden select-none"
                  >
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest block text-white/30">
                          {ag.range}
                        </span>
                        <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5 text-white/40 whitespace-nowrap border border-white/5">
                          Not running at this location
                        </span>
                      </div>
                      <h3 className="font-display text-lg tracking-wider uppercase leading-none text-white/30">{ag.name}</h3>
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={ag.name}
                  onClick={() => setActiveAgeGroup(ag.name)}
                  className={cn(
                    "flex-1 min-w-[140px] p-4 rounded-2xl border transition-all duration-300 text-left relative overflow-hidden group",
                    activeAgeGroup === ag.name 
                      ? "bg-brand-yellow text-brand-navy border-brand-yellow shadow-lg shadow-brand-yellow/20" 
                      : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:border-white/20"
                  )}
                >
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-1">
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest block",
                        activeAgeGroup === ag.name ? "text-brand-navy/60" : "text-white/20"
                      )}>
                        {ag.range}
                      </span>
                      {sessionTime && (
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-wider",
                          activeAgeGroup === ag.name ? "text-brand-navy/80" : "text-brand-yellow/60"
                        )}>
                          {sessionTime}
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-lg tracking-wider uppercase leading-none">{ag.name}</h3>
                  </div>
                </button>
              );
            })}
          </div>

        {/* Session Header Info - More Succinct */}
        {!plan ? (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center border-white/5">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/20 mb-4">
            <Calendar size={32} />
          </div>
          <h3 className="font-display text-xl tracking-wide mb-2">
            No Session Plan Available
          </h3>
          <p className="text-sm text-white/60 max-w-md">
            There is no session plan generated for {activeAgeGroup} in Week {currentWeek} of {selectedTerm}.
            {isAdmin && " Use the Builder module to generate session plans."}
          </p>
        </div>
      ) : (
        <>

          <div className="glass-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-l-4 border-l-brand-yellow">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-yellow/10 flex items-center justify-center text-brand-yellow">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-display text-lg tracking-wide leading-none">{plan.ageGroup}</h3>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">{plan.ageRange}</p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                  <Clock size={14} className="text-brand-yellow" />
                  <span className="text-xs font-bold uppercase tracking-widest">{plan.length} Session</span>
                </div>
                
                {allLocations.find(l => l.name === activeLocation)?.sessionTimes?.[activeAgeGroup] && (
                  <div className="flex items-center gap-3 px-6 py-4 bg-brand-yellow/10 border border-brand-yellow/20 rounded-2xl">
                    <Clock size={18} className="text-brand-yellow" />
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-brand-yellow/60 leading-none mb-1">Session Time</p>
                      <p className="text-sm font-bold text-brand-yellow leading-none">
                        {allLocations.find(l => l.name === activeLocation)?.sessionTimes?.[activeAgeGroup]}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={handleShareSessionPlan}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-yellow/10 hover:bg-brand-yellow/20 text-brand-yellow rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-brand-yellow/20"
              >
                <Share2 size={16} />
                Share
              </button>
            </div>
          </div>

          {/* Unified Session Plan Accordion */}
          <section>
            <div className="space-y-4">
              {plan.activities.map((activity, i) => {
                const hasDrill = !!activity.drill;
                const hasHuddle = !!activity.huddle;
                const isExpandable = hasDrill || hasHuddle;
                const isExpanded = expandedActivity === activity.id;

                return (
                  <div key={activity.id} className={cn(
                    "glass-card overflow-hidden border transition-all duration-300",
                    isExpanded ? "border-brand-yellow/30 shadow-lg shadow-brand-yellow/5" : "border-white/5"
                  )}>
                    <div 
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleActivity(activity.id, isExpandable)}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleActivity(activity.id, isExpandable);
                        }
                      }}
                      className={cn(
                        "w-full p-5 flex items-center justify-between text-left transition-all",
                        isExpandable ? "hover:bg-white/5 cursor-pointer" : "cursor-default opacity-80"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-brand-yellow/10 flex items-center justify-center text-brand-yellow font-black text-xs">
                          {activity.time}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-brand-yellow uppercase tracking-widest">{activity.segment}</span>
                            {!isExpandable && <span className="text-[8px] font-black text-white/20 uppercase tracking-widest border border-white/10 px-1.5 rounded">Static</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            <h4 className="font-display text-lg tracking-wide">{activity.name}</h4>
                            {activity.drill?.video && (
                              <a 
                                href={activity.drill.video}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 bg-brand-yellow/10 hover:bg-brand-yellow text-brand-yellow hover:text-brand-navy rounded-lg transition-all"
                                title="Watch Video"
                              >
                                <Play size={12} fill="currentColor" />
                              </a>
                            )}
                            {activity.drill && (
                              <div className="hidden md:flex items-center gap-2">
                                {normalizeFocus(activity.drill.focus).map(f => (
                                  <div key={f} className="px-2 py-0.5 bg-brand-yellow/10 rounded border border-brand-yellow/20">
                                    <span className="text-[8px] font-black text-brand-yellow uppercase tracking-widest">{f}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {isEditing && activity.drill && (
                              <button
                                onClick={(e) => handleChangeDrill(e, activity.id)}
                                className="p-1.5 rounded-lg transition-colors bg-white/10 hover:bg-brand-yellow hover:text-brand-navy text-white/60"
                                title="Change Drill"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        {/* Inline Star Rating for Warm Up and Skills */}
                        {(activity.segment.toLowerCase().includes("warm up") || activity.segment.toLowerCase().includes("skills")) && (
                          <div className="hidden sm:block">
                            <StarRating 
                              rating={ratings[`${activity.name}_${activeLocation}`] || 0} 
                              onRate={(r) => handleRate(activity.id, activity.name, r)} 
                              onComment={() => handleOpenComments(activity.name)}
                            />
                          </div>
                        )}
                        
                <div className="flex items-center gap-3">
                  {isExpandable && (
                    <ChevronDown 
                      size={20} 
                      className={cn("text-white/20 transition-transform duration-300", isExpanded && "rotate-180 text-brand-yellow")} 
                    />
                  )}
                </div>
                      </div>
                    </div>

                    {/* Mobile Star Rating */}
                    {(activity.segment.toLowerCase().includes("warm up") || activity.segment.toLowerCase().includes("skills")) && (
                      <div className="sm:hidden px-5 pb-4 flex justify-end">
                        <StarRating 
                          rating={ratings[`${activity.name}_${activeLocation}`] || 0} 
                          onRate={(r) => handleRate(activity.id, activity.name, r)} 
                          onComment={() => handleOpenComments(activity.name)}
                        />
                      </div>
                    )}

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="px-5 pb-6 space-y-6 border-t border-white/5 pt-6">
                            {/* Huddle Content */}
                            {hasHuddle && activity.huddle && (
                              <div className="space-y-6">
                                <div className="p-6 bg-brand-yellow/5 rounded-2xl border border-brand-yellow/10 relative overflow-hidden">
                                  <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <Quote size={60} />
                                  </div>
                                  <div className="space-y-4 relative z-10">
                                    <div>
                                      <h5 className="text-[10px] font-black text-brand-yellow uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                        <Info size={14} /> Core Value
                                      </h5>
                                      {isEditing ? (
                                          <div className="space-y-3">
                                          <select
                                            value={activity.huddle.coreValue}
                                            onChange={(e) => handleChangeCoreValue(activity.id, e.target.value)}
                                            className="w-full bg-black/20 border border-brand-yellow/20 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-brand-yellow outline-none transition-all appearance-none"
                                          >
                                            {CORE_VALUES.map(cv => (
                                              <option key={cv.week} value={cv.name} className="bg-brand-navy text-white">
                                                Week {cv.week}: {cv.name} — "{cv.subtitle}"
                                              </option>
                                            ))}
                                          </select>
                                          
                                          <label className="flex items-center gap-2 cursor-pointer group">
                                            <div className="relative flex items-center">
                                              <input 
                                                type="checkbox"
                                                checked={applyToRestOfTerm}
                                                onChange={(e) => setApplyToRestOfTerm(e.target.checked)}
                                                className="sr-only"
                                              />
                                              <div className={cn(
                                                "w-4 h-4 rounded border transition-all flex items-center justify-center",
                                                applyToRestOfTerm ? "bg-brand-yellow border-brand-yellow" : "border-white/20 group-hover:border-brand-yellow/50"
                                              )}>
                                                {applyToRestOfTerm && <CheckCircle2 size={10} className="text-brand-navy" />}
                                              </div>
                                            </div>
                                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider group-hover:text-white/60 transition-colors">Apply sequence to rest of term</span>
                                          </label>
                                        </div>
                                      ) : (
                                        <p className="text-sm font-semibold leading-relaxed">{activity.huddle.coreValue}</p>
                                      )}
                                    </div>
                                    <div className="pt-4 border-t border-white/5">
                                      <h5 className="text-[10px] font-black text-brand-yellow uppercase tracking-[0.2em] mb-2">Huddle Quote</h5>
                                      <p className="text-sm italic text-white/60 leading-relaxed">"{activity.huddle.quote}"</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Drill Content */}
                            {hasDrill && activity.drill && (
                              <>
                                {/* Summary & Focus */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-yellow">Summary & Focus</h5>
                                    <p className="text-sm font-medium leading-relaxed text-white/80">{activity.drill.summary}</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {normalizeFocus(activity.drill.focus).map(f => (
                                        <div key={f} className="inline-flex items-center gap-2 px-3 py-1 bg-brand-yellow/5 rounded-full border border-brand-yellow/10">
                                          <Info size={12} className="text-brand-yellow" />
                                          <span className="text-[10px] font-bold text-brand-yellow uppercase tracking-wider">{f}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  {/* Video Guide */}
                                  {activity.drill.video && (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-yellow">Video Guide</h5>
                                        <ShareVideo url={activity.drill.video} />
                                      </div>
                                      <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-2xl">
                                        <iframe
                                          src={getEmbedUrl(activity.drill.video)}
                                          className="w-full h-full"
                                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                          allowFullScreen
                                          title="Drill Video"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Setup & Coach Cues */}
                                <div className="space-y-4">
                                  <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-yellow">Setup & Coach Cues</h5>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-4 bg-emerald-500/10 rounded-2xl border-2 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)] relative overflow-hidden group">
                                      <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Gamepad2 size={40} className="text-emerald-500" />
                                      </div>
                                      <div className="flex items-center gap-2 mb-3">
                                        <Gamepad2 size={16} className="text-emerald-500" />
                                        <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">Easy Mode</span>
                                      </div>
                                      <p className="text-xs font-medium text-emerald-100/80 leading-relaxed relative z-10">{activity.drill.easy}</p>
                                    </div>
                                    <div className="p-4 bg-red-500/10 rounded-2xl border-2 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)] relative overflow-hidden group">
                                      <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Swords size={40} className="text-red-500" />
                                      </div>
                                      <div className="flex items-center gap-2 mb-3">
                                        <Swords size={16} className="text-red-500" />
                                        <span className="text-[11px] font-black text-red-500 uppercase tracking-widest">Expert Mode</span>
                                      </div>
                                      <p className="text-xs font-medium text-red-100/80 leading-relaxed relative z-10">{activity.drill.expert}</p>
                                    </div>
                                    <div className="p-4 bg-brand-yellow/5 rounded-2xl border border-brand-yellow/10">
                                      <span className="text-[10px] font-black text-brand-yellow uppercase tracking-widest block mb-2">Coach Cues</span>
                                      <p className="text-xs font-bold text-white/80 leading-relaxed italic">"{activity.drill.coachCues}"</p>
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
      </>
      )}

      {/* Drill Selection Modal */}
      <AnimatePresence>
        {drillSelectionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-navy border border-white/10 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div>
                  <h3 className="font-display text-2xl tracking-wider text-white">Select Replacement Drill</h3>
                  <p className="text-sm text-white/60">Choose a drill to replace the current one.</p>
                </div>
                <button
                  onClick={() => setDrillSelectionModal(null)}
                  className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 border-b border-white/10 bg-black/20">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                  <input
                    type="text"
                    placeholder="Search drills by name or focus..."
                    value={drillSearchQuery}
                    onChange={(e) => setDrillSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm font-bold text-white focus:border-brand-yellow outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                {(() => {
                  const currentActivity = plan?.activities.find(a => a.id === drillSelectionModal.activityId);
                  const isWarmup = currentActivity?.segment.toLowerCase().includes("warm up");
                  const currentFocuses = normalizeFocus(currentActivity?.drill?.focus || "");
                  const otherDrillNames = new Set(
                    plan?.activities
                      .filter(a => a.id !== drillSelectionModal.activityId)
                      .map(a => a.name)
                  );

                  const filteredDrills = drills
                    .filter(d => d.ageGroups && d.ageGroups.includes(activeAgeGroup as AgeGroup))
                    .filter(d => !otherDrillNames.has(d.name))
                    .filter(d => {
                      if (isWarmup) {
                        return d.types.includes("Warm-up");
                      } else {
                        return d.types.includes("Skill");
                      }
                    })
                    .filter(d => 
                      d.name.toLowerCase().includes(drillSearchQuery.toLowerCase()) ||
                      d.focus.toLowerCase().includes(drillSearchQuery.toLowerCase())
                    )
                    .sort((a, b) => {
                      // Prioritize shared focus
                      const aFocuses = normalizeFocus(a.focus);
                      const bFocuses = normalizeFocus(b.focus);
                      const aShared = aFocuses.some(f => currentFocuses.includes(f)) ? 1 : 0;
                      const bShared = bFocuses.some(f => currentFocuses.includes(f)) ? 1 : 0;
                      if (aShared !== bShared) return bShared - aShared;
                      return b.rating - a.rating;
                    });

                  if (filteredDrills.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <p className="text-white/40 font-bold">No drills found matching your search.</p>
                      </div>
                    );
                  }

                  return filteredDrills.map(drill => (
                    <button
                      key={drill.id}
                      onClick={() => handleSelectReplacementDrill(drill.id)}
                      className="w-full text-left p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-brand-yellow/50 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-display text-lg tracking-wide text-white group-hover:text-brand-yellow transition-colors">{drill.name}</h4>
                        <div className="flex flex-wrap gap-1">
                          {drill.types.map(t => (
                            <span key={t} className="text-[8px] font-black uppercase tracking-widest text-brand-yellow bg-brand-yellow/10 px-2 py-0.5 rounded">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-white/60 line-clamp-2 mb-3">{drill.summary}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Focus:</span>
                        <div className="flex flex-wrap gap-1">
                          {normalizeFocus(drill.focus).map(f => (
                            <span key={f} className="text-[10px] font-bold text-white/80">{f}</span>
                          ))}
                        </div>
                      </div>
                    </button>
                  ));
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comment Modal */}
      <AnimatePresence>
        {activeCommentDrill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-navy border border-white/10 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div>
                  <h3 className="font-display text-2xl tracking-wider text-white">Comments</h3>
                  <p className="text-sm text-white/60">{activeCommentDrill.name}</p>
                </div>
                <button
                  onClick={() => setActiveCommentDrill(null)}
                  className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                {activeCommentDrill.comments && activeCommentDrill.comments.length > 0 ? (
                  activeCommentDrill.comments.map((comment: any) => (
                    <div key={comment.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{comment.userName}</span>
                          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                            {new Date(comment.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={12}
                              className={star <= comment.rating ? "text-brand-yellow fill-brand-yellow" : "text-white/20"}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-white/80">{comment.text}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare size={48} className="mx-auto text-white/10 mb-4" />
                    <p className="text-white/40 font-bold">No comments yet. Be the first to share your thoughts!</p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-white/10 bg-black/20">
                <form onSubmit={handleSubmitComment} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">
                      Your Rating
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewCommentRating(star)}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star
                            size={24}
                            className={star <= newCommentRating ? "text-brand-yellow fill-brand-yellow" : "text-white/20"}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">
                      Your Comment
                    </label>
                    <textarea
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Share your experience with this drill..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold text-white focus:border-brand-yellow outline-none transition-all resize-none h-24"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!newCommentText.trim() || newCommentRating === 0}
                    className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all bg-brand-yellow text-brand-navy hover:bg-brand-yellow/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Post Comment
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AiPlannerModal
        isOpen={isAiPlannerOpen}
        onClose={() => setIsAiPlannerOpen(false)}
        currentTerm={selectedTerm}
        currentWeek={currentWeek}
        currentAgeGroup={activeAgeGroup}
        ageGroups={AGE_GROUPS}
        allLocations={allLocations}
      />

      <AnimatePresence>
        {showCopied && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-brand-yellow text-brand-navy rounded-full font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-brand-yellow/20 flex items-center gap-2"
          >
            <CheckCircle2 size={14} />
            Copied to clipboard
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
