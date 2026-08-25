import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  UserCheck, 
  Users,
  ChevronDown, 
  MapPin, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Cake,
  Star,
  Check,
  Plus,
  X,
  Phone,
  User,
  Stethoscope,
  CreditCard,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSchedule } from "../context/ScheduleContext";
import { useDrills } from "../context/DrillContext";
import { useSessionPlans } from "../context/SessionPlanContext";
import { api } from "../api";
import { cn } from "../lib/utils";
import { Kid } from "../types";
import { format, differenceInYears, parseISO, isSameWeek, isValid } from "date-fns";
import UnifiedReportForm from "../components/UnifiedReportForm";
import { AGE_GROUPS_CONFIG, getLocationByCode } from "../data/locations";

interface TeamUpSession {
  id: string;
  name: string;
  start_date: string;
  start_time: string;
  venue?: {
    name: string;
  };
}

interface TeamUpRegistration {
  id: string;
  customer: {
    id: string;
    name: string;
    date_of_birth?: string;
    emergency_contact_name?: string;
    emergency_contact_number?: string;
    medical_info?: string;
    photo_url?: string;
    join_date?: string;
  };
  attended: boolean | null;
  membership?: {
    name: string;
  };
  attendance_history?: boolean[];
}

const AGE_GROUPS = AGE_GROUPS_CONFIG.map(ag => ({
  name: ag.name,
  range: ag.range
}));

// Mock Data
const MOCK_KIDS: Kid[] = [
  {
    id: "1",
    name: "Leo Messi",
    dob: "2018-06-24",
    joinDate: "2023-09-01",
    parentName: "Jorge Messi",
    emergencyContact: "07712 345678",
    medicalNotes: "Asthma - inhaler in bag",
    membershipType: "Monthly",
    totalAttendances: 42,
    lastAttendances: [true, true, false, true, true],
    isFirstSession: false,
    ageGroup: "Rookies",
    location: "AYL-MON",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop"
  },
  {
    id: "2",
    name: "Cristiano Ronaldo",
    dob: "2017-02-05",
    joinDate: "2024-01-15",
    parentName: "Maria Dolores",
    emergencyContact: "07798 765432",
    medicalNotes: "None",
    membershipType: "Termly",
    totalAttendances: 12,
    lastAttendances: [true, true, true, true, true],
    isFirstSession: false,
    ageGroup: "Rookies",
    location: "AYL-MON",
    photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop"
  },
  {
    id: "3",
    name: "Kylian Mbappe",
    dob: "2016-12-20",
    joinDate: "2024-03-21",
    parentName: "Wilfried Mbappe",
    emergencyContact: "07700 112233",
    medicalNotes: "Peanut allergy",
    membershipType: "Taster",
    totalAttendances: 0,
    lastAttendances: [],
    isFirstSession: true,
    ageGroup: "Rising Stars",
    location: "AYL-MON"
  },
  {
    id: "4",
    name: "Marcus Rashford",
    dob: "2015-10-31",
    joinDate: "2023-11-10",
    parentName: "Melanie Rashford",
    emergencyContact: "07711 223344",
    medicalNotes: "None",
    membershipType: "Monthly",
    totalAttendances: 28,
    lastAttendances: [true, false, true, true, false],
    isFirstSession: false,
    ageGroup: "Rising Stars",
    location: "AYL-MON"
  },
  {
    id: "5",
    name: "Bukayo Saka",
    dob: "2014-09-05",
    joinDate: "2024-02-01",
    parentName: "Yomi Saka",
    emergencyContact: "07755 667788",
    medicalNotes: "None",
    membershipType: "Monthly",
    totalAttendances: 8,
    lastAttendances: [true, true, true, true, true],
    isFirstSession: false,
    ageGroup: "Ballers",
    location: "AYL-MON"
  },
  {
    id: "6",
    name: "Jude Bellingham",
    dob: "2013-06-29",
    joinDate: "2023-08-15",
    parentName: "Mark Bellingham",
    emergencyContact: "07799 887766",
    medicalNotes: "None",
    membershipType: "Termly",
    totalAttendances: 35,
    lastAttendances: [true, true, true, false, true],
    isFirstSession: false,
    ageGroup: "Ballers",
    location: "AYL-MON"
  },
  {
    id: "7",
    name: "Erling Haaland",
    dob: "2012-07-21",
    joinDate: "2024-03-01",
    parentName: "Alf-Inge Haaland",
    emergencyContact: "07722 334455",
    medicalNotes: "None",
    membershipType: "Monthly",
    totalAttendances: 4,
    lastAttendances: [true, true, true, true],
    isFirstSession: false,
    ageGroup: "Ballers",
    location: "AYL-MON"
  },
  {
    id: "8",
    name: "Zinedine Zidane",
    dob: "2017-06-23",
    joinDate: "2024-03-21",
    parentName: "Smail Zidane",
    emergencyContact: "07700 998877",
    medicalNotes: "None",
    membershipType: "Taster",
    totalAttendances: 0,
    lastAttendances: [],
    isFirstSession: true,
    ageGroup: "Rookies",
    location: "AYL-MON"
  },
  {
    id: "9",
    name: "Thierry Henry",
    dob: "2018-08-17",
    joinDate: "2023-10-01",
    parentName: "Antoine Henry",
    emergencyContact: "07711 223344",
    medicalNotes: "None",
    membershipType: "Monthly",
    totalAttendances: 30,
    lastAttendances: [true, true, true, true, true],
    isFirstSession: false,
    ageGroup: "Rookies",
    location: "GM-MON"
  },
  {
    id: "10",
    name: "Ronaldinho",
    dob: "2016-03-21",
    joinDate: "2024-02-15",
    parentName: "Joao de Assis",
    emergencyContact: "07755 443322",
    medicalNotes: "None",
    membershipType: "Monthly",
    totalAttendances: 15,
    lastAttendances: [true, true, false, true, true],
    isFirstSession: false,
    ageGroup: "Rising Stars",
    location: "HG-TUE"
  }
];

// Helper to calculate age
const calculateAge = (dob: string) => differenceInYears(new Date(), parseISO(dob));

// Helper to check if birthday is this week
const isBirthdayThisWeek = (dob: string) => {
  const birthDate = parseISO(dob);
  const today = new Date();
  const birthDateThisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  return isSameWeek(today, birthDateThisYear, { weekStartsOn: 0 });
};

export default function Registration() {
  const { activeLocation, setActiveLocation, allLocations, user } = useAuth();
  const { getCurrentTermAndWeek, getClassDate, settings, getWeeksInTerm } = useSchedule();
  const { ratings, setRatings, sessionPlans } = useSessionPlans();
  const { rateDrillByName } = useDrills();
  
  const availableTerms = settings.terms.map(t => t.name);
  
  const [currentWeek, setCurrentWeek] = useState(1);
  const [selectedTerm, setSelectedTerm] = useState(availableTerms[0] || "Spring");
  const [activeAgeGroup, setActiveAgeGroup] = useState(AGE_GROUPS[0].name);
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const [isTermMenuOpen, setIsTermMenuOpen] = useState(false);
  const [expandedKid, setExpandedKid] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Record<string, 'attended' | 'not_attended' | 'pending'>>({});
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [reportModal, setReportModal] = useState<{ isOpen: boolean; initialData?: any }>({ isOpen: false });

  // TeamUp Integration States
  const [teamupSessions, setTeamupSessions] = useState<TeamUpSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [teamupRegistrations, setTeamupRegistrations] = useState<TeamUpRegistration[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false);
  const [teamupError, setTeamupError] = useState<string | null>(null);

  const handleConnectTeamUp = async () => {
    try {
      const response = await fetch("/api/auth/teamup/url");
      if (!response.ok) throw new Error("Failed to get auth URL");
      const { url } = await response.json();
      
      console.log("Opening TeamUp OAuth URL:", url);
      
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const authWindow = window.open(
        url,
        "_blank",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!authWindow) {
        alert("The popup was blocked. Please allow popups for this site to connect to TeamUp.");
      }
    } catch (error) {
      console.error("OAuth Error:", error);
      alert("Failed to start TeamUp connection. Please check your settings.");
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TEAMUP_AUTH_SUCCESS') {
        setTeamupError(null);
        // Re-trigger data fetch by resetting selected session or just waiting for next effect
        setSelectedSessionId(null);
        // Force a refresh of sessions
        const today = new Date();
        const { term, week } = getCurrentTermAndWeek(today);
        setSelectedTerm(term);
        setCurrentWeek(week);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [getCurrentTermAndWeek]);

  const handleOpenReport = (kid?: any) => {
    if (kid) {
      const kidName = kid.customer?.name || kid.name || "";
      const kidDob = kid.customer?.date_of_birth || kid.dob;
      const kidEmergency = kid.customer?.emergency_contact_number || kid.customer?.phone || kid.emergencyContact || kid.parentPhone || "";
      const rawParentName = kid.parentName || kid.customer?.parent_name || kid.customer?.guardian_name || kid.customer?.emergency_contact_name || "";
      const parentFirstName = (kid.parentFirstName || (rawParentName ? rawParentName.trim().split(/\s+/)[0] : "")).trim();
      const parentEmail = (kid.parentEmail || kid.customer?.email || (kid.customer?.fields?.Email as string) || "").trim();

      setReportModal({
        isOpen: true,
        initialData: {
          playerName: kidName,
          injuredName: kidName,
          childFirstName: kidName ? kidName.trim().split(/\s+/)[0] : "",
          injuredAge: kidDob ? `${calculateAge(kidDob)} years old` : "Unknown age",
          parentFirstName: parentFirstName,
          parentName: rawParentName,
          parentEmail: parentEmail, 
          parentPhone: kidEmergency || "",
          location: activeLocation,
          ageGroup: activeAgeGroup
        }
      });
    } else {
      setReportModal({
        isOpen: true,
        initialData: {
          location: activeLocation,
          ageGroup: activeAgeGroup
        }
      });
    }
  };

  const handleSubmitFeedback = async () => {
    if (!user || !activeLocation) return;
    if (!notes.trim()) return;
    
    setIsSubmitting(true);
    try {
      // Save the feedback record via the Worker API (D1).
      await api.post("/api/reports", {
        coachName: user.name,
        coachEmail: user.email,
        location: activeLocation,
        ageGroup: activeAgeGroup,
        week: currentWeek,
        term: selectedTerm,
        ratings,
        notes,
        timestamp: Date.now(),
        type: 'session_feedback'
      });

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachName: user.name,
          coachEmail: user.email,
          location: activeLocation,
          ageGroup: activeAgeGroup,
          week: currentWeek,
          term: selectedTerm,
          ratings,
          notes
        })
      });

      if (response.ok) {
        // Update drill ratings locally
        const plan = sessionPlans.find(p => 
          p.term === selectedTerm && 
          p.week === currentWeek && 
          p.ageGroup === activeAgeGroup &&
          (p.locationId === activeLocation || (!p.locationId || p.locationId === 'ALL LOCATIONS'))
        );

        if (plan) {
          Object.entries(ratings).forEach(([activityId, rating]) => {
            const activity = plan.activities.find(a => a.id === activityId);
            if (activity && activity.drill) {
              rateDrillByName(activity.name, rating, user.id);
            }
          });
        }

        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 3000);
        setNotes("");
        setRatings({});
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const today = new Date();
    const { term, week } = getCurrentTermAndWeek(today);
    setSelectedTerm(term);
    setCurrentWeek(week);
  }, [getCurrentTermAndWeek]);

  const classDateInfo = getClassDate(selectedTerm, currentWeek, activeLocation);

  // Fetch TeamUp sessions for the selected date
  useEffect(() => {
    const fetchSessions = async () => {
      if (teamupError === "AUTH_REQUIRED") {
        console.log("TeamUp: Auth required, skipping fetch");
        return;
      }
      
      if (!classDateInfo.date || !isValid(classDateInfo.date)) {
        console.log("TeamUp: Invalid date, skipping fetch");
        return;
      }
      
      console.log("TeamUp: Fetching sessions for", format(classDateInfo.date, "yyyy-MM-dd"));
      setIsLoadingSessions(true);
      setTeamupError(null);
      try {
        const dateStr = format(classDateInfo.date, "yyyy-MM-dd");
        const response = await fetch(`/api/teamup/sessions?date=${dateStr}`);
        if (!response.ok) {
          const data = await response.json();
          console.log("TeamUp: Sessions fetch failed", data);
          if (data.error === "AUTH_REQUIRED") {
            setTeamupError("AUTH_REQUIRED");
            return;
          }
          throw new Error("Failed to fetch sessions from TeamUp");
        }
        
        const data = await response.json();
        console.log("TeamUp: Sessions fetched successfully", data);
        // TeamUp API v2 usually returns an object with a 'results' array
        const sessions = data.results || data;
        setTeamupSessions(sessions);
        
        // Try to find a matching session by name or location
        const matchingSession = sessions.find((s: any) => 
          s.name.toLowerCase().includes(activeAgeGroup.toLowerCase()) &&
          (activeLocation === "ALL LOCATIONS" || s.name.toLowerCase().includes(activeLocation.toLowerCase()))
        );
        
        if (matchingSession) {
          console.log("TeamUp: Auto-selected session", matchingSession.id);
          setSelectedSessionId(matchingSession.id);
        } else if (sessions.length > 0) {
          console.log("TeamUp: No matching session found, clearing selection");
          setSelectedSessionId(null); // Let user pick if no clear match
        } else {
          console.log("TeamUp: No sessions found for this date");
          setSelectedSessionId(null);
        }
      } catch (err: any) {
        console.error("Error fetching TeamUp sessions:", err);
        setTeamupError("Could not connect to TeamUp. Please check your API settings.");
      } finally {
        setIsLoadingSessions(false);
      }
    };

    fetchSessions();
  }, [classDateInfo.date ? format(classDateInfo.date, "yyyy-MM-dd") : null, activeAgeGroup, activeLocation, teamupError]);

  // Fetch registrations for the selected session
  useEffect(() => {
    const fetchRegistrations = async () => {
      if (teamupError === "AUTH_REQUIRED") {
        console.log("TeamUp: Auth required, skipping registrations fetch");
        return;
      }
      
      if (!selectedSessionId) {
        console.log("TeamUp: No session selected, clearing registrations");
        setTeamupRegistrations([]);
        return;
      }
      
      console.log("TeamUp: Fetching registrations for session", selectedSessionId);
      setIsLoadingRegistrations(true);
      try {
        const response = await fetch(`/api/teamup/registrations/${selectedSessionId}`);
        if (!response.ok) {
          const data = await response.json();
          console.log("TeamUp: Registrations fetch failed", data);
          if (data.error === "AUTH_REQUIRED") {
            setTeamupError("AUTH_REQUIRED");
            return;
          }
          throw new Error("Failed to fetch registrations");
        }
        
        const data = await response.json();
        console.log("TeamUp: Registrations fetched successfully", data);
        const registrations = data.results || data;
        setTeamupRegistrations(registrations);
        
        // Update local attendance state based on TeamUp data
        const newAttendance: Record<string, 'attended' | 'not_attended' | 'pending'> = {};
        registrations.forEach((reg: any) => {
          if (reg.attended === true) newAttendance[reg.id] = 'attended';
          else if (reg.attended === false) newAttendance[reg.id] = 'not_attended';
          else newAttendance[reg.id] = 'pending';
        });
        setAttendance(newAttendance);
      } catch (err) {
        console.error("Error fetching TeamUp registrations:", err);
      } finally {
        setIsLoadingRegistrations(false);
      }
    };

    fetchRegistrations();
  }, [selectedSessionId, teamupError]);

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

  const filteredKids = MOCK_KIDS
    .filter(k => 
      (!activeLocation || activeLocation === "ALL LOCATIONS" || k.location === activeLocation) && 
      k.ageGroup === activeAgeGroup
    )
    .sort((a, b) => {
      if (a.isFirstSession && !b.isFirstSession) return -1;
      if (!a.isFirstSession && b.isFirstSession) return 1;
      return a.name.localeCompare(b.name);
    });

  const toggleAttendance = async (registrationId: string, status: 'attended' | 'not_attended') => {
    const newStatus = attendance[registrationId] === status ? 'pending' : status;
    
    // Optimistic update
    setAttendance(prev => ({
      ...prev,
      [registrationId]: newStatus
    }));

    try {
      const attended = newStatus === 'attended' ? true : (newStatus === 'not_attended' ? false : null);
      const response = await fetch("/api/teamup/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId, attended })
      });

      if (!response.ok) {
        throw new Error("Failed to update attendance in TeamUp");
      }
    } catch (error) {
      console.error("Error updating TeamUp attendance:", error);
      // Revert on error
      setAttendance(prev => ({
        ...prev,
        [registrationId]: attendance[registrationId]
      }));
      alert("Failed to sync attendance with TeamUp. Please try again.");
    }
  };

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

  const canNavigateNext = currentWeek < getWeeksInTerm(selectedTerm) || availableTerms.indexOf(selectedTerm) < availableTerms.length - 1;
  const canNavigatePrev = currentWeek > 1 || availableTerms.indexOf(selectedTerm) > 0;

  const sessionTime = currentLocation?.sessionTimes?.[activeAgeGroup];

  const KidCard = ({ kid, isMock = false }: { kid: any, isMock?: boolean, key?: any }) => {
    const id = isMock ? kid.id : kid.id;
    const name = isMock ? kid.name : kid.customer.name;
    const dob = isMock ? kid.dob : kid.customer.date_of_birth;
    const photoUrl = isMock ? kid.photoUrl : kid.customer.photo_url;
    const isFirstSession = isMock ? kid.isFirstSession : (kid.attendance_history?.length === 0);
    const totalAttendances = isMock ? kid.totalAttendances : (kid.attendance_history?.filter((a: boolean) => a).length || 0);
    const lastAttendances = isMock ? kid.lastAttendances : (kid.attendance_history?.slice(-5) || []);
    const parentName = isMock ? kid.parentName : kid.customer.emergency_contact_name;
    const emergencyContact = isMock ? kid.emergencyContact : kid.customer.emergency_contact_number;
    const medicalNotes = isMock ? kid.medicalNotes : kid.customer.medical_info;
    const membershipType = isMock ? kid.membershipType : kid.membership?.name;
    const joinDate = isMock ? kid.joinDate : kid.customer.join_date;

    return (
      <div 
        className={cn(
          "glass-card border transition-all duration-300 overflow-hidden",
          expandedKid === id ? "border-brand-yellow/30 shadow-lg" : "border-white/5"
        )}
      >
        {/* Quick View */}
        <div 
          onClick={() => setExpandedKid(expandedKid === id ? null : id)}
          className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 font-black text-xl overflow-hidden border border-white/10">
                {photoUrl ? (
                  <img src={photoUrl} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  name?.charAt(0)
                )}
              </div>
              {isFirstSession && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-brand-yellow rounded-full flex items-center justify-center shadow-lg border-2 border-brand-navy">
                  <Star size={12} className="text-brand-navy fill-brand-navy" />
                </div>
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-display text-lg tracking-wider text-white uppercase leading-none">{name}</h3>
                {dob && isBirthdayThisWeek(dob) && (
                  <Cake size={16} className="text-brand-yellow animate-bounce" />
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{dob ? calculateAge(dob) : "?"} Years Old</span>
                <span className="text-white/10">•</span>
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{totalAttendances} Attendances</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-8">
            {/* Last 5 Attendances */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Last 5</span>
              <div className="flex items-center gap-1">
                {lastAttendances.map((attended: boolean, i: number) => (
                  <div 
                    key={i} 
                    className={cn(
                      "w-5 h-5 rounded-md flex items-center justify-center",
                      attended ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"
                    )}
                  >
                    {attended ? <Check size={12} /> : <X size={12} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance Toggle */}
                  <div className="flex items-center gap-3">
              {(user?.role === "HEAD_COACH" || user?.role === "OWNER" || user?.role === "ADMINISTRATOR") && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenReport(kid);
                  }}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border bg-white/5 border-white/10 text-white/20 hover:text-red-500 hover:border-red-500/30"
                  title="Submit Accident/Incident Report"
                >
                  <Plus size={24} />
                </button>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); toggleAttendance(id, 'attended'); }}
                title="Attended"
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border",
                  attendance[id] === 'attended' 
                    ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/40 scale-110" 
                    : "bg-white/5 border-white/10 text-white/20 hover:text-emerald-500/60 hover:border-emerald-500/30"
                )}
              >
                <Check size={24} strokeWidth={3} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); toggleAttendance(id, 'not_attended'); }}
                title="No Show"
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border",
                  attendance[id] === 'not_attended' 
                    ? "bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/40 scale-110" 
                    : "bg-white/5 border-white/10 text-white/20 hover:text-red-500/60 hover:border-red-500/30"
                )}
              >
                <X size={24} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded View */}
        <AnimatePresence>
          {expandedKid === id && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/5 bg-white/[0.02]"
            >
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Parent Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-yellow/10 flex items-center justify-center text-brand-yellow">
                      <User size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block">Parent Name</span>
                      <span className="text-sm font-bold text-white">{parentName || "N/A"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-yellow/10 flex items-center justify-center text-brand-yellow">
                      <Phone size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block">Emergency Contact</span>
                      <span className="text-sm font-bold text-white">{emergencyContact || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Medical & Membership */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-yellow/10 flex items-center justify-center text-brand-yellow">
                      <Stethoscope size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block">Medical Notes</span>
                      <span className="text-sm font-bold text-white">{medicalNotes || "None"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-yellow/10 flex items-center justify-center text-brand-yellow">
                      <CreditCard size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block">Membership Type</span>
                      <span className="text-sm font-bold text-white">{membershipType || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Join Date */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-yellow/10 flex items-center justify-center text-brand-yellow">
                      <Clock size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block">Join Date</span>
                      <span className="text-sm font-bold text-white">
                        {joinDate ? format(parseISO(joinDate), "MMMM yyyy") : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-yellow/10 flex items-center justify-center text-brand-yellow shadow-inner">
              <UserCheck size={28} />
            </div>
            <div>
              <h1 className="font-display text-4xl md:text-5xl tracking-wider text-brand-yellow uppercase leading-none mb-1">Registration</h1>
              <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em]">Class Attendance & Member Info</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Location Selector */}
            <div className="relative">
              <button 
                onClick={() => setIsLocationMenuOpen(!isLocationMenuOpen)}
                className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group"
              >
                <div className="px-4 text-center min-w-[100px]">
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40 leading-none mb-1.5">Location</p>
                  <div className="flex items-center justify-center gap-2">
                    <h2 className="font-display text-sm tracking-wider text-brand-yellow leading-none">
                      {activeLocation || "Select"}
                    </h2>
                    <ChevronDown size={12} className={cn("text-white/20 transition-transform", isLocationMenuOpen && "rotate-180")} />
                  </div>
                </div>
              </button>
              
              <AnimatePresence>
                {isLocationMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full right-0 mt-2 bg-brand-navy border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl min-w-[200px] p-2"
                  >
                    <button 
                      onClick={() => { setActiveLocation("ALL LOCATIONS"); setIsLocationMenuOpen(false); }}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        activeLocation === "ALL LOCATIONS" ? "text-brand-yellow bg-white/5" : "text-white/40 hover:text-white hover:bg-white/5"
                      )}
                    >
                      All Locations
                    </button>
                    {allLocations.map(loc => (
                      <button 
                        key={loc.id}
                        onClick={() => { setActiveLocation(loc.name); setIsLocationMenuOpen(false); }}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          activeLocation === loc.name ? "text-brand-yellow bg-white/5" : "text-white/40 hover:text-white hover:bg-white/5"
                        )}
                      >
                        {loc.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Term Selector */}
            <div className="relative">
              <button 
                onClick={() => setIsTermMenuOpen(!isTermMenuOpen)}
                className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group"
              >
                <div className="px-4 text-center min-w-[100px]">
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40 leading-none mb-1.5">Term</p>
                  <div className="flex items-center justify-center gap-2">
                    <h2 className="font-display text-sm tracking-wider text-brand-yellow leading-none uppercase">
                      {selectedTerm}
                    </h2>
                    <ChevronDown size={12} className={cn("text-white/20 transition-transform", isTermMenuOpen && "rotate-180")} />
                  </div>
                </div>
              </button>
              
              <AnimatePresence>
                {isTermMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full right-0 mt-2 bg-brand-navy border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl min-w-[200px] p-2"
                  >
                    {availableTerms.map(t => (
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
                          "w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          selectedTerm === t ? "text-brand-yellow bg-white/5" : "text-white/40 hover:text-white hover:bg-white/5"
                        )}
                      >
                        {t}
                      </button>
                    ))}
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
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40 leading-none mb-1.5">Week</p>
            <h2 className="font-display text-xl tracking-wider text-brand-yellow uppercase leading-none mb-1">Week {currentWeek}</h2>
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

        {/* Age Group Tabs & Session Time */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide flex-1">
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

          <div className="flex items-center gap-3">
            {/* Manual Report Button moved to bottom */}
          </div>
        </div>

          {sessionTime && (
            <div className="flex items-center gap-3 px-6 py-4 bg-brand-yellow/10 border border-brand-yellow/20 rounded-2xl">
              <Clock size={18} className="text-brand-yellow" />
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-brand-yellow/60 leading-none mb-1">Session Time</p>
                <p className="text-sm font-bold text-brand-yellow leading-none">{sessionTime}</p>
              </div>
            </div>
          )}

      {/* Register List */}
      <div className="space-y-4">
        {/* TeamUp Session Selection if multiple found */}
        {teamupSessions.length > 1 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Select TeamUp Session</p>
            <div className="flex flex-wrap gap-2">
              {teamupSessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                    selectedSessionId === session.id
                      ? "bg-brand-yellow text-brand-navy border-brand-yellow"
                      : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
                  )}
                >
                  {session.name} ({session.start_time})
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoadingSessions || isLoadingRegistrations ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-brand-yellow border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Syncing with TeamUp...</p>
          </div>
        ) : teamupError === "AUTH_REQUIRED" ? (
          <div className="text-center py-20 bg-brand-yellow/5 border border-dashed border-brand-yellow/20 rounded-3xl">
            <CreditCard size={48} className="text-brand-yellow/20 mx-auto mb-4" />
            <h3 className="text-lg font-display tracking-wider text-brand-yellow/60 uppercase">TeamUp Connection Required</h3>
            <p className="text-white/20 text-xs font-bold uppercase tracking-widest mt-2 mb-8">Connect your account to sync registrations and attendance</p>
            <button 
              onClick={handleConnectTeamUp}
              className="px-8 py-4 bg-brand-yellow text-brand-navy rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform shadow-lg shadow-brand-yellow/20"
            >
              Connect to TeamUp
            </button>
            <div className="mt-12 pt-8 border-t border-white/5">
              <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest mb-4">Or use mock data for now</p>
              <div className="space-y-4">
                {filteredKids.map((kid) => (
                  <KidCard key={kid.id} kid={kid} isMock={true} />
                ))}
              </div>
            </div>
          </div>
        ) : teamupError ? (
          <div className="text-center py-20 bg-red-500/5 border border-dashed border-red-500/20 rounded-3xl">
            <AlertTriangle size={48} className="text-red-500/20 mx-auto mb-4" />
            <h3 className="text-lg font-display tracking-wider text-red-500/60 uppercase">{teamupError}</h3>
            <p className="text-white/20 text-xs font-bold uppercase tracking-widest mt-2">Using mock data for demonstration</p>
            <div className="mt-8 space-y-4">
              {filteredKids.map((kid) => (
                <KidCard key={kid.id} kid={kid} isMock={true} />
              ))}
            </div>
          </div>
        ) : teamupRegistrations.length > 0 ? (
          teamupRegistrations.map((reg) => (
            <KidCard key={reg.id} kid={reg} />
          ))
        ) : (
          <div className="text-center py-20 bg-white/5 border border-dashed border-white/10 rounded-3xl">
            <Users size={48} className="text-white/10 mx-auto mb-4" />
            <h3 className="text-lg font-display tracking-wider text-white/40 uppercase">No kids found for this class</h3>
            <p className="text-white/20 text-xs font-bold uppercase tracking-widest mt-2">Try selecting a different location or age group</p>
          </div>
        )}
      </div>

      {/* Class Feedback */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 ml-1">
          <div className="flex items-center gap-3">
            <BookOpen size={18} className="text-brand-yellow" />
            <h3 className="font-display text-xl tracking-wider uppercase">Class Feedback <span className="text-red-500">*</span></h3>
          </div>
          {(user?.role === "HEAD_COACH" || user?.role === "OWNER" || user?.role === "ADMINISTRATOR") && (
            <button 
              onClick={() => handleOpenReport()}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500/20 transition-all group"
            >
              <Plus size={14} className="group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-widest">Submit Report</span>
            </button>
          )}
        </div>
        <div className="glass-card p-6 border-white/5">
          <textarea
            required
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any class feedback here (e.g. Trialists that didn't show up, players who attended but weren't on the register, issues with the venue, specific player feedback, or curriculum suggestions). If nothing to report, please write 'Nothing to report'. This will be sent to the membership team to action for you."
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 min-h-[150px] text-sm font-medium focus:border-brand-yellow outline-none transition-all resize-none"
          />
        </div>
      </section>

      {/* Completion Button */}
      <div className="space-y-4">
        <button 
          onClick={handleSubmitFeedback}
          disabled={isSubmitting || submitSuccess || !notes.trim()}
          className={cn(
            "w-full py-6 rounded-[2.5rem] font-black uppercase tracking-[0.3em] shadow-2xl transition-all text-sm flex items-center justify-center gap-3",
            submitSuccess 
              ? "bg-emerald-500 text-white shadow-emerald-500/20" 
              : "yellow-gradient text-brand-navy shadow-brand-yellow/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
          )}
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-brand-navy/30 border-t-brand-navy rounded-full animate-spin" />
          ) : submitSuccess ? (
            <>
              <CheckCircle2 size={20} />
              <span>Feedback Submitted</span>
            </>
          ) : (
            <span>Submit Class Feedback</span>
          )}
        </button>
        <div className="text-center space-y-1">
          {!notes.trim() && !submitSuccess && (
            <p className="text-[10px] font-black text-brand-yellow/60 uppercase tracking-widest animate-pulse">
              Please add class feedback to submit
            </p>
          )}
          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">
            Please submit before midnight on the day of the class
          </p>
        </div>
        {submitSuccess && (
          <p className="text-center text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">
            Email sent to basketball@hoopheroes.co.uk
          </p>
        )}
      </div>
      {/* Report Modal */}
      <AnimatePresence>
        {reportModal.isOpen && (
          <UnifiedReportForm 
            onClose={() => setReportModal({ isOpen: false })} 
            initialData={reportModal.initialData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
