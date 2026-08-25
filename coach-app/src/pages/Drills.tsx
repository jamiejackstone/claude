import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Database, 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  X,
  ChevronRight,
  Play,
  Info,
  Save,
  Copy,
  Users,
  Tag,
  Star,
  Sparkles,
  Loader2,
  AlertCircle,
  FileText,
  Upload,
  Download,
  Video,
  MessageSquare
} from "lucide-react";
import { cn } from "../lib/utils";
import { NavigationBlocker } from "../components/NavigationBlocker";
import Papa from "papaparse";
import { Drill, AgeGroup, DrillType } from "../types";
import { useDrills } from "../context/DrillContext";
import { useAuth } from "../context/AuthContext";
import { useSchedule } from "../context/ScheduleContext";
import { api } from "../api";
import { Wand2 } from "lucide-react";

const SKILL_FOCUS_OPTIONS = ["Shooting", "Passing", "Dribbling", "Defence", "Rebounding"];
const TYPES: DrillType[] = ["Warm-up", "Skill"];
const AGE_GROUPS: AgeGroup[] = [
  "Rookies",
  "Rising Stars",
  "Ballers",
  "Rookies & Rising Stars (Combined)",
  "Pros & All Stars (Combined)"
];

const StarRating = ({ rating }: { rating: number }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} size={12} className="text-brand-yellow fill-brand-yellow" />
      ))}
      {hasHalfStar && (
        <div className="relative">
          <Star size={12} className="text-brand-yellow/20" />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star size={12} className="text-brand-yellow fill-brand-yellow" />
          </div>
        </div>
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} size={12} className="text-brand-yellow/20" />
      ))}
    </div>
  );
};

export default function Drills() {
  const { user } = useAuth();
  const { drills, addDrill, updateDrill, deleteDrill, addComment, markCommentsAsRead } = useDrills();
  const { settings, getWeeksInTerm } = useSchedule();
  
  const termNames = settings.terms.map(t => t.name);
  const isHeadCoach = user?.role === "HEAD_COACH";
  const tabs = isHeadCoach ? ["All Drills", "Top Ten"] : ["All Drills", "Top Ten"];
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDrillOpen, setIsAddDrillOpen] = useState(false);
  const [isSelectionOpen, setIsSelectionOpen] = useState(false);
  const [isAICuratorOpen, setIsAICuratorOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [aiVideoUrl, setAiVideoUrl] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [editingDrill, setEditingDrill] = useState<Drill | null>(null);
  const [activeCommentDrill, setActiveCommentDrill] = useState<Drill | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
  const [newCommentRating, setNewCommentRating] = useState(0);
  
  const isOwner = user?.role === "OWNER";
  const isAdmin = user?.role === "ADMINISTRATOR" || user?.role === "OWNER";

  // Filter state
  const [filterFocus, setFilterFocus] = useState<string[]>([]);
  const [filterTypes, setFilterTypes] = useState<DrillType[]>([]);
  const [filterAgeGroups, setFilterAgeGroups] = useState<AgeGroup[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Omit<Drill, "id" | "rating" | "votes">>({
    name: "",
    types: ["Skill"],
    ageGroups: [],
    summary: "",
    focus: "Shooting",
    video: "",
    easy: "",
    expert: "",
    coachCues: ""
  });

  const [activeTab, setActiveTab] = useState<string>("All Drills");
  const [selectedDrills, setSelectedDrills] = useState<string[]>([]);

  const toggleSelection = (id: string) => {
    setSelectedDrills(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const handleSaveDrill = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for duplicate name
    if (!editingDrill) {
      const isDuplicate = drills.some(d => d.name.toLowerCase() === formData.name.toLowerCase());
      if (isDuplicate) {
        alert("A drill with this name already exists.");
        return;
      }
    } else {
      const isDuplicate = drills.some(d => d.id !== editingDrill.id && d.name.toLowerCase() === formData.name.toLowerCase());
      if (isDuplicate) {
        alert("A drill with this name already exists.");
        return;
      }
    }

    if (editingDrill) {
      updateDrill(editingDrill.id, formData);
    } else {
      const newDrill: Drill = { 
        ...formData, 
        id: Math.random().toString(36).substr(2, 9),
        rating: 0,
        votes: 0,
        createdAt: new Date().toISOString()
      };
      addDrill(newDrill);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      types: ["Skill"],
      ageGroups: [],
      summary: "",
      focus: "Shooting",
      video: "",
      easy: "",
      expert: "",
      coachCues: ""
    });
    setEditingDrill(null);
    setActiveCommentDrill(null);
    setNewCommentText("");
    setNewCommentRating(0);
    setIsAddDrillOpen(false);
    setIsAICuratorOpen(false);
    setIsBulkUploadOpen(false);
    setIsSelectionOpen(false);
    setAiVideoUrl("");
    setAiError(null);
  };

  const handleEdit = (drill: Drill) => {
    setEditingDrill(drill);
    setFormData({
      name: drill.name,
      types: drill.types,
      ageGroups: drill.ageGroups,
      summary: drill.summary,
      focus: drill.focus,
      video: drill.video,
      easy: drill.easy,
      expert: drill.expert,
      coachCues: drill.coachCues
    });
    setIsAddDrillOpen(true);
  };

  const handleAICurator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiVideoUrl) return;

    setIsAiLoading(true);
    setAiError(null);

    try {
      // Gemini call is proxied through the Worker (API key stays server-side).
      const result = await api.post<any>("/api/ai/drill-curate", { videoUrl: aiVideoUrl });

      if (result.error || !result.name) {
        throw new Error("I'm sorry, I couldn't analyze that video. Please make sure it's a clear basketball drill video.");
      }

      setFormData({
        name: result.name || "",
        focus: SKILL_FOCUS_OPTIONS.includes(result.focus) ? result.focus : "Shooting",
        summary: result.summary || "",
        easy: result.easy || "",
        expert: result.expert || "",
        coachCues: result.coachCues || "",
        video: aiVideoUrl,
        types: result.types || ["Skill"],
        ageGroups: result.ageGroups || []
      });

      setIsAICuratorOpen(false);
      setIsAddDrillOpen(true);
    } catch (error: any) {
      console.error("AI Curator Error:", error);
      setAiError(error.message || "An unexpected error occurred. Please try again or use manual entry.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ["name", "focus", "summary", "easy", "expert", "coachCues", "video", "types", "ageGroups"];
    const example = ["Crossover King", "Ball Control", "A high-intensity drill...", "Stand still...", "Add retreat dribble...", "Eyes up!", "https://youtube.com/...", "Skill,Warm-up", "Rookies,Rising Stars"];
    
    const csv = Papa.unparse([headers, example]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "drills_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const newDrills: Drill[] = [];
        let skippedCount = 0;

        results.data.forEach((row: any) => {
          const drillName = row.name || row.Drill_Name || "Untitled Drill";
          
          // Check if drill already exists
          const exists = drills.some(d => d.name.toLowerCase() === drillName.toLowerCase()) || 
                         newDrills.some(d => d.name.toLowerCase() === drillName.toLowerCase());
          
          if (exists) {
            skippedCount++;
            return;
          }

          let ageGroups: AgeGroup[] = [];
          const rawAgeGroups = row.ageGroups || row.Age_Suitability || "";
          if (rawAgeGroups) {
            ageGroups = rawAgeGroups.replace(/\[|\]/g, " ").split(" ").map((ag: string) => {
              if (ag === "ROOK") return "Rookies";
              if (ag === "RISE") return "Rising Stars";
              if (ag === "BALL") return "Ballers";
              return ag.trim();
            }).filter(Boolean) as AgeGroup[];
          }

          let types: DrillType[] = ["Skill"];
          const rawTypes = row.types || row.Drill_Type || "Skill";
          if (rawTypes) {
            types = rawTypes.split(",").map((t: string) => {
              const trimmed = t.trim();
              if (trimmed.toLowerCase() === "warm up" || trimmed.toLowerCase() === "warm-up") return "Warm-up";
              return "Skill";
            }) as DrillType[];
          }

          let focus = "Shooting";
          const rawFocus = row.focus || row.Skill_Focus;
          if (rawFocus) {
            const focusMatch = SKILL_FOCUS_OPTIONS.find(f => rawFocus.toLowerCase().includes(f.toLowerCase()));
            if (focusMatch) focus = focusMatch;
          }

          let terms: string[] = [];
          const rawTerms = row.terms || row.Terms || "";
          if (rawTerms) {
            terms = rawTerms.split(",").map((t: string) => t.trim()).filter(Boolean);
          }

          newDrills.push({
            id: Math.random().toString(36).substr(2, 9),
            name: drillName,
            focus: focus,
            summary: row.summary || row.Summary || "",
            easy: row.easy || row.Easy_Mode || "",
            expert: row.expert || row.Expert_Mode || "",
            coachCues: row.coachCues || row.Coach_Cues || "",
            video: row.video || row.Video_URL || "",
            types: types,
            ageGroups: ageGroups,
            rating: 0,
            votes: 0,
            createdAt: new Date().toISOString()
          });
        });

        newDrills.forEach(addDrill);
        resetForm();
        alert(`Successfully uploaded ${newDrills.length} drills!${skippedCount > 0 ? ` Skipped ${skippedCount} duplicate drills.` : ""}`);
      },
      error: (error) => {
        console.error("CSV Parse Error:", error);
        alert("Error parsing CSV file. Please check the template format.");
      }
    });
  };

  const exportDrillsToCSV = () => {
    const dataToExport = drills.map(d => {
      // Safely parse Rating
      const safeRating = typeof d.rating === "number" 
        ? d.rating.toFixed(1) 
        : (d.rating && !isNaN(Number(d.rating)) ? Number(d.rating).toFixed(1) : "0.0");

      // Safely parse Created At (in case it is a Firestore Timestamp)
      let safeCreatedAt = "";
      if (d.createdAt) {
        if (typeof d.createdAt === "object" && d.createdAt !== null) {
          if (typeof (d.createdAt as any).toDate === "function") {
            safeCreatedAt = (d.createdAt as any).toDate().toISOString();
          } else if ((d.createdAt as any).seconds !== undefined) {
            safeCreatedAt = new Date((d.createdAt as any).seconds * 1000).toISOString();
          } else {
            try {
              safeCreatedAt = String(d.createdAt);
            } catch (e) {
              safeCreatedAt = "";
            }
          }
        } else {
          safeCreatedAt = String(d.createdAt);
        }
      }

      // Safely process Comments
      const safeComments = d.comments
        ? d.comments.map(c => {
            const userName = c.userName || "Anonymous";
            const text = c.text || "";
            const escapedText = text.replace(/"/g, '""');
            const rating = c.rating !== undefined ? c.rating : 0;
            return `${userName} (${rating}★): "${escapedText}"`;
          }).join("; ")
        : "";

      return {
        ID: d.id,
        Name: d.name,
        Types: (d.types || []).join(", "),
        "Age Groups": (d.ageGroups || []).join(", "),
        Focus: d.focus || "",
        Summary: d.summary || "",
        "Video URL": d.video || "",
        "Easy Version": d.easy || "",
        "Expert Version": d.expert || "",
        "Coach Cues": d.coachCues || "",
        Rating: safeRating,
        Votes: d.votes || 0,
        "Created At": safeCreatedAt,
        "Usage History": d.history 
          ? d.history.map(h => `${h.term} • Wk ${h.week} • ${h.ageGroup}`).join("; ")
          : "",
        Comments: safeComments
      };
    });

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `drills_library_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this drill?")) {
      deleteDrill(id);
    }
  };

  const handleBulkDelete = () => {
    if (selectedDrills.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedDrills.length} selected drill(s)? This action cannot be undone.`)) {
      selectedDrills.forEach(id => deleteDrill(id));
      setSelectedDrills([]);
    }
  };

  const handleOpenComments = (drill: Drill) => {
    setActiveCommentDrill(drill);
    if (user && (user.role === "ADMINISTRATOR" || user.role === "OWNER")) {
      markCommentsAsRead(drill.id);
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
    setActiveCommentDrill(prev => prev ? {
      ...prev,
      comments: [...(prev.comments || []), comment]
    } : null);
  };

  const toggleArrayItem = <T,>(arr: T[], item: T): T[] => {
    return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
  };

  let filteredDrills = drills.filter(d => {
    const matchesTab = true;
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         d.focus.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFocus = filterFocus.length === 0 || filterFocus.includes(d.focus);
    const matchesTypes = filterTypes.length === 0 || filterTypes.some(t => d.types.includes(t));
    const matchesAgeGroups = filterAgeGroups.length === 0 || filterAgeGroups.some(ag => d.ageGroups.includes(ag));
    
    return matchesTab && matchesSearch && matchesFocus && matchesTypes && matchesAgeGroups;
  });

  if (activeTab === "Top Ten") {
    filteredDrills = filteredDrills
      .sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.votes - a.votes;
      })
      .slice(0, 10);
  }

  const selectAll = () => {
    if (selectedDrills.length === filteredDrills.length && filteredDrills.length > 0) {
      setSelectedDrills([]);
    } else {
      setSelectedDrills(filteredDrills.map(d => d.id));
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <NavigationBlocker 
        isBlocked={isAddDrillOpen || !!editingDrill} 
        message="You are currently editing a drill. Are you sure you want to leave? Any unsaved changes will be lost." 
      />
      
      {/* Top Header */}
      <div className="space-y-6 sticky top-0 md:top-0 z-30 bg-brand-navy/80 backdrop-blur-xl pb-6 -mx-4 px-4 md:mx-0 md:px-0 pt-2 sm:pt-0 border-b border-white/5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[2rem] bg-brand-yellow flex items-center justify-center text-brand-navy shadow-2xl shadow-brand-yellow/20 -rotate-3">
            <Database size={32} />
          </div>
          <div>
            <h1 className="font-display text-4xl md:text-5xl tracking-wider text-brand-yellow uppercase leading-none">Drills Library</h1>
            <p className="text-white/40 mt-2 font-semibold uppercase tracking-widest text-[10px]">View and search pre-approved drills and coaching library.</p>
          </div>
        </div>
        
        {isAdmin && (
            <div className="flex items-center gap-3">
              <button 
                onClick={exportDrillsToCSV}
                className="flex items-center gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-[2rem] font-black uppercase tracking-widest text-[10px] transition-all h-[52px]"
                title="Export entire drills library as a CSV file"
              >
                <Download size={18} className="text-brand-yellow" />
                Export Library
              </button>
              <div className="relative">
                <button 
                  onClick={() => setIsSelectionOpen(!isSelectionOpen)}
                  className="flex items-center gap-3 px-6 py-4 bg-brand-yellow text-brand-navy rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-xl shadow-brand-yellow/20 hover:scale-105 transition-all h-[52px]"
                >
                  <Plus size={18} />
                  Add New Drill
                </button>

            <AnimatePresence>
              {isSelectionOpen && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setIsSelectionOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-64 bg-brand-navy border border-white/10 rounded-3xl shadow-2xl p-4 z-[70] space-y-2"
                  >
                    <button 
                      onClick={() => {
                        setIsSelectionOpen(false);
                        setIsAddDrillOpen(true);
                      }}
                      className="w-full flex items-center gap-3 p-4 hover:bg-white/5 rounded-2xl transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
                        <Edit2 size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white">Manual Entry</p>
                        <p className="text-[8px] text-white/40">Add details yourself</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => {
                        setIsSelectionOpen(false);
                        setIsAICuratorOpen(true);
                      }}
                      className="w-full flex items-center gap-3 p-4 hover:bg-brand-yellow/10 rounded-2xl transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-brand-yellow/10 flex items-center justify-center text-brand-yellow">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-yellow">AI Curator</p>
                        <p className="text-[8px] text-brand-yellow/40">Auto-fill from video</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => {
                        setIsSelectionOpen(false);
                        setIsBulkUploadOpen(true);
                      }}
                      className="w-full flex items-center gap-3 p-4 hover:bg-emerald-500/10 rounded-2xl transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Upload size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Bulk Upload</p>
                        <p className="text-[8px] text-emerald-500/40">Upload CSV file</p>
                      </div>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
      </div>
    </div>

    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] whitespace-nowrap transition-all border",
              activeTab === tab
                ? "bg-brand-yellow text-brand-navy border-brand-yellow shadow-lg shadow-brand-yellow/20"
                : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div />

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
            <input 
              type="text" 
              placeholder="Search drills by name or skill focus (e.g. Passing)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 py-4 focus:border-brand-yellow outline-none transition-all font-medium text-sm"
            />
          </div>
          
          <div className="relative flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={selectAll}
                className={cn(
                  "flex items-center gap-3 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border",
                  selectedDrills.length > 0
                    ? "bg-brand-yellow text-brand-navy border-brand-yellow shadow-lg shadow-brand-yellow/20"
                    : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
                )}
              >
                <CheckCircle2 size={18} />
                {selectedDrills.length === filteredDrills.length && filteredDrills.length > 0 ? "Deselect All" : "Select All"}
              </button>
            )}
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={cn(
                "flex items-center gap-3 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border",
                isFilterOpen || filterFocus.length > 0 || filterTypes.length > 0 || filterAgeGroups.length > 0
                  ? "bg-brand-yellow text-brand-navy border-brand-yellow shadow-lg shadow-brand-yellow/20"
                  : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
              )}
            >
              <Filter size={18} />
              Filters {(filterFocus.length + filterTypes.length + filterAgeGroups.length) > 0 && `(${(filterFocus.length + filterTypes.length + filterAgeGroups.length)})`}
            </button>

            <AnimatePresence>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setIsFilterOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-80 bg-brand-navy border border-white/10 rounded-3xl shadow-2xl p-6 z-[70] space-y-6"
                  >
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-white/20">Filter by Skill Focus</h4>
                      <div className="flex flex-wrap gap-2">
                        {SKILL_FOCUS_OPTIONS.map(f => (
                          <button
                            key={f}
                            onClick={() => setFilterFocus(toggleArrayItem(filterFocus, f))}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all",
                              filterFocus.includes(f) ? "bg-brand-yellow text-brand-navy border-brand-yellow" : "bg-white/5 border-white/10 text-white/40"
                            )}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-white/20">Filter by Type</h4>
                      <div className="flex flex-wrap gap-2">
                        {TYPES.map(t => (
                          <button
                            key={t}
                            onClick={() => setFilterTypes(toggleArrayItem(filterTypes, t))}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all",
                              filterTypes.includes(t) ? "bg-brand-yellow text-brand-navy border-brand-yellow" : "bg-white/5 border-white/10 text-white/40"
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-white/20">Filter by Age Group</h4>
                      <div className="flex flex-wrap gap-2">
                        {AGE_GROUPS.map(ag => (
                          <button
                            key={ag}
                            onClick={() => setFilterAgeGroups(toggleArrayItem(filterAgeGroups, ag))}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all",
                              filterAgeGroups.includes(ag) ? "bg-brand-yellow text-brand-navy border-brand-yellow" : "bg-white/5 border-white/10 text-white/40"
                            )}
                          >
                            {ag}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setFilterFocus([]);
                        setFilterTypes([]);
                        setFilterAgeGroups([]);
                      }}
                      className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      Clear All Filters
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredDrills.map((drill, index) => (
            <motion.div 
              layout
              key={drill.id} 
              className={cn(
                "glass-card p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-l-4 transition-all relative",
                selectedDrills.includes(drill.id) ? "border-l-brand-yellow bg-white/10" : "border-l-brand-yellow/30 hover:border-l-brand-yellow"
              )}
            >
              <div className="flex items-center gap-5 flex-1">
                {activeTab === "Top Ten" && (
                  <div className="w-8 h-8 rounded-full bg-brand-yellow/20 flex items-center justify-center text-brand-yellow font-black text-sm shrink-0">
                    #{index + 1}
                  </div>
                )}
                {isAdmin && (
                  <input
                    type="checkbox"
                    checked={selectedDrills.includes(drill.id)}
                    onChange={() => toggleSelection(drill.id)}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-yellow focus:ring-brand-yellow focus:ring-offset-brand-navy cursor-pointer shrink-0"
                  />
                )}
                <div className="w-12 h-12 rounded-2xl bg-brand-yellow/10 flex items-center justify-center text-brand-yellow shrink-0">
                  <Play size={24} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="font-display text-lg tracking-wide">{drill.name}</h3>
                    {drill.createdAt && (new Date().getTime() - new Date(drill.createdAt).getTime()) / (1000 * 60 * 60 * 24) <= 90 && (
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">
                        New
                      </span>
                    )}
                    <div className="bg-brand-yellow/5 px-2 py-1 rounded-lg border border-brand-yellow/10 flex items-center gap-2">
                      <StarRating rating={drill.rating} />
                      <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">({drill.votes} votes)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-yellow/60">Skill Focus:</span>
                    <p className="text-xs text-white font-bold tracking-tight">{drill.focus}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {/* Types */}
                    {drill.types.map(t => (
                      <span key={t} className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-brand-yellow/10 rounded text-brand-yellow border border-brand-yellow/20">
                        {t}
                      </span>
                    ))}
                    {/* Age Groups */}
                    {drill.ageGroups.map(ag => (
                      <span key={ag} className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-brand-yellow/10 rounded text-brand-yellow border border-brand-yellow/20">
                        {ag}
                      </span>
                    ))}
                  </div>

                  {drill.history && drill.history.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 flex items-center gap-1">
                        <Calendar size={12} /> Usage History
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {drill.history.map((h, i) => (
                          <span key={i} className="text-[9px] font-bold px-2 py-1 bg-white/5 rounded text-white/60 border border-white/10">
                            {h.term} • Wk {h.week} • {h.ageGroup}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleOpenComments(drill)}
                  className="p-3 text-white/20 hover:text-brand-yellow hover:bg-brand-yellow/10 rounded-xl transition-all relative"
                >
                  <MessageSquare size={18} />
                  {drill.comments && drill.comments.some(c => !c.isRead) && isAdmin && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </button>
                {isAdmin && (
                  <>
                    <button 
                      onClick={() => handleEdit(drill)}
                      title="Edit Drill"
                      className="p-3 text-white/20 hover:text-brand-yellow hover:bg-brand-yellow/10 rounded-xl transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(drill.id)}
                      title="Delete Drill"
                      className="p-3 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
          {filteredDrills.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2.5rem]">
              <Database size={48} className="mx-auto mb-4 text-white/10" />
              <p className="text-sm font-black uppercase tracking-widest text-white/20">No drills match your search or filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {isAdmin && selectedDrills.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-brand-navy border border-white/10 rounded-[2rem] shadow-2xl p-4 flex items-center gap-6"
          >
            <div className="flex items-center gap-3 pl-2">
              <div className="w-8 h-8 rounded-full bg-brand-yellow/20 flex items-center justify-center text-brand-yellow font-bold text-sm">
                {selectedDrills.length}
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-white hidden sm:inline">Selected</span>
            </div>
            
            <div className="h-8 w-px bg-white/10" />
            
            <div className="flex items-center gap-4">
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
              >
                <Trash2 size={14} />
                Delete Selected ({selectedDrills.length})
              </button>
            </div>
            
            <div className="h-8 w-px bg-white/10" />
            
            <button 
              onClick={() => setSelectedDrills([])}
              className="p-2 text-white/40 hover:text-white rounded-full hover:bg-white/5 transition-all"
              title="Deselect all"
            >
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Upload Modal */}
      <AnimatePresence>
        {isBulkUploadOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="absolute inset-0 bg-brand-navy/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-brand-navy border border-white/10 rounded-[2.5rem] p-10 shadow-2xl"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
              <button onClick={resetForm} className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors">
                <X size={24} />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Upload size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-display tracking-wider">Bulk Upload</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Upload multiple drills via CSV</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="text-brand-yellow" size={20} />
                      <p className="text-xs font-bold text-white">CSV Template</p>
                    </div>
                    <button 
                      onClick={downloadTemplate}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-yellow transition-all"
                    >
                      <Download size={14} />
                      Download
                    </button>
                  </div>
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    Download the template, fill in your drill details, and upload it back here. Ensure you follow the column headers exactly.
                  </p>
                </div>

                <div className="relative">
                  <input 
                    type="file" 
                    accept=".csv"
                    onChange={handleBulkUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full py-10 border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center gap-4 bg-white/5 hover:bg-white/10 transition-all">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <Upload size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black uppercase tracking-widest text-white">Click or Drag CSV to Upload</p>
                      <p className="text-[10px] text-white/20 mt-1">Maximum file size: 5MB</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Curator Modal */}
      <AnimatePresence>
        {isAICuratorOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="absolute inset-0 bg-brand-navy/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-brand-navy border border-white/10 rounded-[2.5rem] p-10 shadow-2xl"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-brand-yellow" />
              <button onClick={resetForm} className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors">
                <X size={24} />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-brand-yellow/10 flex items-center justify-center text-brand-yellow">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-display tracking-wider">AI Curator</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Auto-fill drill details from video</p>
                </div>
              </div>

              <form onSubmit={handleAICurator} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 ml-1">Video URL</label>
                  <input 
                    required
                    type="url" 
                    value={aiVideoUrl}
                    onChange={(e) => setAiVideoUrl(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-brand-yellow outline-none transition-all font-medium"
                    placeholder="Paste YouTube or Video Link..."
                  />
                </div>

                {aiError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3"
                  >
                    <AlertCircle className="text-red-500 shrink-0" size={18} />
                    <p className="text-xs text-red-500 font-medium leading-relaxed">{aiError}</p>
                  </motion.div>
                )}

                <button 
                  type="submit" 
                  disabled={isAiLoading || !aiVideoUrl}
                  className="w-full py-5 yellow-gradient text-brand-navy rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-brand-yellow/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                >
                  {isAiLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      AI is watching...
                    </>
                  ) : (
                    <>
                      <Play size={20} />
                      Curate Drill
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Comments Modal */}
      <AnimatePresence>
        {activeCommentDrill && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setActiveCommentDrill(null)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-brand-gray border border-white/10 rounded-3xl p-8 max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setActiveCommentDrill(null)} className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors">
                <X size={24} />
              </button>

              <h2 className="text-2xl font-display tracking-wider mb-2">
                Comments: {activeCommentDrill.name}
              </h2>
              <div className="flex items-center gap-2 mb-8">
                <StarRating rating={activeCommentDrill.rating} />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">({activeCommentDrill.votes} reviews)</span>
              </div>

              <div className="space-y-6 mb-8">
                {activeCommentDrill.comments && activeCommentDrill.comments.length > 0 ? (
                  activeCommentDrill.comments.map(comment => (
                    <div key={comment.id} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-white">{comment.userName}</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest">
                            {new Date(comment.timestamp).toLocaleDateString()} at {new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                        <div className="flex text-brand-yellow">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className={`w-3 h-3 ${i < comment.rating ? 'fill-current' : 'text-white/10 fill-current'}`} viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      <p className="text-white/80 text-sm">{comment.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-white/40 py-8">No comments yet. Be the first to review!</p>
                )}
              </div>

              {user && (
                <form onSubmit={handleSubmitComment} className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-brand-yellow mb-4">Add a Review</h3>
                  
                  <div className="mb-4">
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewCommentRating(star)}
                          className={`p-1 transition-colors ${newCommentRating >= star ? 'text-brand-yellow' : 'text-white/20 hover:text-white/40'}`}
                        >
                          <svg className="w-6 h-6 fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Comment</label>
                    <textarea
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder-white/20 focus:outline-none focus:border-brand-yellow min-h-[100px]"
                      placeholder="Share your thoughts on this drill..."
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!newCommentText.trim() || newCommentRating === 0}
                    className="w-full py-4 bg-brand-yellow text-black font-black uppercase tracking-widest rounded-xl hover:bg-brand-yellow/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Post Review
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div />

      {/* Add/Edit Drill Modal */}
      <AnimatePresence>
        {isAddDrillOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="absolute inset-0 bg-brand-navy/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-brand-navy border border-white/10 rounded-[2.5rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-brand-yellow" />
              <button onClick={resetForm} className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors">
                <X size={24} />
              </button>

              <h2 className="text-2xl font-display tracking-wider mb-8">
                {editingDrill ? "Edit Drill" : "Add New Drill"}
              </h2>
              
              <form onSubmit={handleSaveDrill} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Basic Info */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 ml-1">Drill Name</label>
                      <input 
                        required 
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-brand-yellow outline-none transition-all font-medium"
                        placeholder="e.g. Crossover King"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 ml-1">Type</label>
                      <div className="flex flex-wrap gap-2">
                        {TYPES.map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, types: toggleArrayItem(prev.types, t) }))}
                            className={cn(
                              "px-3 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                              formData.types.includes(t) ? "bg-brand-yellow text-brand-navy border-brand-yellow" : "bg-white/5 border-white/10 text-white/40"
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 ml-1">Age Groups</label>
                      <div className="flex flex-wrap gap-2">
                        {AGE_GROUPS.map(ag => (
                          <button
                            key={ag}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, ageGroups: toggleArrayItem(prev.ageGroups, ag) }))}
                            className={cn(
                              "px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                              formData.ageGroups.includes(ag) ? "bg-brand-yellow text-brand-navy border-brand-yellow" : "bg-white/5 border-white/10 text-white/40"
                            )}
                          >
                            {ag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 ml-1">Video URL</label>
                      <input 
                        type="url" 
                        value={formData.video}
                        onChange={(e) => setFormData(prev => ({ ...prev, video: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-brand-yellow outline-none transition-all font-medium"
                        placeholder="YouTube Link"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 ml-1">Skill Focus</label>
                      <div className="flex flex-wrap gap-2">
                        {SKILL_FOCUS_OPTIONS.map(f => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, focus: f }))}
                            className={cn(
                              "px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                              formData.focus === f ? "bg-brand-yellow text-brand-navy border-brand-yellow" : "bg-white/5 border-white/10 text-white/40"
                            )}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 ml-1">Summary</label>
                      <textarea 
                        required
                        value={formData.summary}
                        onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-brand-yellow outline-none transition-all font-medium min-h-[100px] resize-none"
                        placeholder="What is this drill about?"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 ml-1">Easy Version / Setup</label>
                    <textarea 
                      value={formData.easy}
                      onChange={(e) => setFormData(prev => ({ ...prev, easy: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-emerald-500 outline-none transition-all font-medium min-h-[80px] resize-none"
                      placeholder="Simpler version for beginners"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-yellow ml-1">Expert Version / Challenge</label>
                    <textarea 
                      value={formData.expert}
                      onChange={(e) => setFormData(prev => ({ ...prev, expert: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-brand-yellow outline-none transition-all font-medium min-h-[80px] resize-none"
                      placeholder="Challenge for advanced players"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 ml-1">Coach Cues</label>
                    <textarea 
                      value={formData.coachCues}
                      onChange={(e) => setFormData(prev => ({ ...prev, coachCues: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-brand-yellow outline-none transition-all font-medium min-h-[80px] resize-none"
                      placeholder="What should coaches say?"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-5 bg-white/5 text-white/40 rounded-[2rem] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-[2] py-5 yellow-gradient text-brand-navy rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-brand-yellow/20 flex items-center justify-center gap-3"
                  >
                    <Save size={20} />
                    {editingDrill ? "Update Drill" : "Save to Database"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
