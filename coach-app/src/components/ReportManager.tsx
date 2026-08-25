import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  AlertTriangle, 
  Plus,
  Search,
  ChevronRight,
  FileText,
  Calendar,
  User,
  MapPin,
  Filter,
  X,
  Mail,
  Phone,
  Trash2,
  Download,
  Edit2,
  Save
} from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import { api, seg } from "../api";

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

export default function ReportManager() {
  const { user } = useAuth();
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [filterLocation, setFilterLocation] = useState("ALL");
  const [filterType, setFilterType] = useState<"ALL" | ReportType>("ALL");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Report | 'subject', direction: 'asc' | 'desc' }>({ key: 'timestamp', direction: 'desc' });

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Report | null>(null);

  const isOwner = user?.role === "OWNER";

  const loadReports = React.useCallback(async () => {
    try {
      const reports = await api.get<Report[]>("/api/reports");
      setAllReports(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleDeleteReport = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      await api.del(`/api/reports/${seg(id)}`);
      await loadReports();
    } catch (error) {
      console.error("Error deleting report:", error);
    }
  };

  const handleUpdateReport = async () => {
    if (!editData) return;
    try {
      await api.patch(`/api/reports/${seg(editData.id)}`, { ...editData });
      setIsEditing(false);
      setSelectedReport(editData);
      setEditData(null);
      await loadReports();
    } catch (error) {
      console.error("Error updating report:", error);
    }
  };

  const downloadCSV = () => {
    const headers = [
      "ID", "Type", "Date", "Location", "Coach", "Age Group", 
      "Parent Email", "Parent Phone", "Witnesses",
      "Subject Name", "Age/Incident Type", "Description/Nature", 
      "Action Taken/How it Happened", "Treatment/Action to Prevent", 
      "First Aider", "Parent Informed"
    ];

    const rows = filteredReports.map(r => {
      const isAccident = r.type === "accident";
      const acc = r as AccidentReport;
      const inc = r as IncidentReport;

      return [
        r.id,
        r.type,
        r.date,
        r.location,
        r.coachName,
        r.ageGroup,
        r.parentEmail,
        r.parentPhone,
        `"${r.witnesses.replace(/"/g, '""')}"`,
        isAccident ? acc.injuredName : inc.playerName,
        isAccident ? acc.injuredAge : inc.incidentType,
        isAccident ? `"${acc.natureOfInjury.replace(/"/g, '""')}"` : `"${inc.description.replace(/"/g, '""')}"`,
        isAccident ? `"${acc.howItHappened.replace(/"/g, '""')}"` : `"${inc.actionTaken.replace(/"/g, '""')}"`,
        isAccident ? `"${acc.treatmentGiven.replace(/"/g, '""')}"` : `"${acc.actionToPreventRecurrence?.replace(/"/g, '""') || ""}"`,
        isAccident ? acc.firstAiderName : "",
        isAccident ? (acc.parentInformed ? "Yes" : "No") : "N/A"
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `reports_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (key: keyof Report | 'subject') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredReports = allReports
    .filter(r => {
      const locMatch = filterLocation === "ALL" || r.location === filterLocation;
      const typeMatch = filterType === "ALL" || r.type === filterType;
      return locMatch && typeMatch;
    })
    .sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Report];
      let bValue: any = b[sortConfig.key as keyof Report];

      if (sortConfig.key === 'subject') {
        aValue = a.type === 'accident' ? (a as AccidentReport).injuredName : (a as IncidentReport).playerName;
        bValue = b.type === 'accident' ? (b as AccidentReport).injuredName : (b as IncidentReport).playerName;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/5 p-6 rounded-[2.5rem] border border-white/5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
            <Filter size={16} className="text-brand-yellow" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Filters</span>
          </div>
          
          <select 
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest outline-none focus:border-brand-yellow"
          >
            <option value="ALL" className="bg-brand-navy text-white">All Locations</option>
            {Array.from(new Set(allReports.map(r => r.location))).map(loc => (
              <option key={loc} value={loc} className="bg-brand-navy text-white">{loc}</option>
            ))}
          </select>

          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest outline-none focus:border-brand-yellow"
          >
            <option value="ALL" className="bg-brand-navy text-white">All Types</option>
            <option value="incident" className="bg-brand-navy text-white">Incidents</option>
            <option value="accident" className="bg-brand-navy text-white">Accidents</option>
          </select>
        </div>

        {isOwner && (
          <button 
            onClick={downloadCSV}
            className="flex items-center gap-2 px-6 py-2 bg-brand-yellow text-brand-navy rounded-xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-brand-yellow/20 transition-all"
          >
            <Download size={14} />
            Download CSV
          </button>
        )}
      </div>

      <div className="glass-card overflow-hidden border-white/5">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
              <th className="px-8 py-5 cursor-pointer hover:text-brand-yellow transition-colors" onClick={() => handleSort('timestamp')}>
                <div className="flex items-center gap-2">
                  Date {sortConfig.key === 'timestamp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th className="px-8 py-5 cursor-pointer hover:text-brand-yellow transition-colors" onClick={() => handleSort('type')}>
                <div className="flex items-center gap-2">
                  Type {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th className="px-8 py-5 cursor-pointer hover:text-brand-yellow transition-colors" onClick={() => handleSort('location')}>
                <div className="flex items-center gap-2">
                  Location {sortConfig.key === 'location' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th className="px-8 py-5 cursor-pointer hover:text-brand-yellow transition-colors" onClick={() => handleSort('coachName')}>
                <div className="flex items-center gap-2">
                  Coach {sortConfig.key === 'coachName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th className="px-8 py-5 cursor-pointer hover:text-brand-yellow transition-colors" onClick={() => handleSort('subject')}>
                <div className="flex items-center gap-2">
                  Subject {sortConfig.key === 'subject' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th className="px-8 py-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredReports.map((report) => (
              <tr 
                key={report.id} 
                className="hover:bg-white/5 transition-colors group cursor-pointer"
                onClick={() => setSelectedReport(report)}
              >
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <Calendar size={14} className="text-brand-yellow/40" />
                    <span className="text-xs font-bold">{report.date}</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                      "bg-brand-yellow/10 text-brand-yellow"
                    )}>
                      {report.type}
                    </span>
                    {report.severity && (
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider",
                        report.severity === "serious" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-white/10 text-white/60"
                      )}>
                        {report.severity}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2 text-xs font-medium text-white/60">
                    <MapPin size={12} />
                    {report.location}
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2 text-xs font-medium text-white/60">
                    <User size={12} />
                    {report.coachName}
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className="text-xs font-bold tracking-tight">
                    {report.type === "accident" ? (report as AccidentReport).injuredName : (report as IncidentReport).playerName}
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {isOwner && (
                      <>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditData(report);
                            setIsEditing(true);
                            setSelectedReport(report);
                          }}
                          className="p-2 text-white/20 hover:text-brand-yellow hover:bg-brand-yellow/10 rounded-lg transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteReport(report.id);
                          }}
                          className="p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                    <button className="p-2 text-white/20 hover:text-brand-yellow transition-colors">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredReports.length === 0 && (
              <tr>
                <td colSpan={6} className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center gap-4 opacity-20">
                    <FileText size={48} />
                    <p className="text-sm font-black uppercase tracking-widest">No records found</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReport(null)}
              className="absolute inset-0 bg-brand-navy/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl glass-card p-8 border-white/10 max-h-[90vh] overflow-y-auto"
            >
              <div className="absolute top-6 right-6 flex items-center gap-2">
                {isOwner && !isEditing && (
                  <button 
                    onClick={() => {
                      setEditData(selectedReport);
                      setIsEditing(true);
                    }}
                    className="p-2 text-white/20 hover:text-brand-yellow transition-colors"
                  >
                    <Edit2 size={20} />
                  </button>
                )}
                <button 
                  onClick={() => {
                    setSelectedReport(null);
                    setIsEditing(false);
                    setEditData(null);
                  }}
                  className="p-2 text-white/20 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-8">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  selectedReport.type === "accident" ? "bg-brand-yellow/10 text-brand-yellow" : "bg-red-500/10 text-red-500"
                )}>
                  {selectedReport.type === "accident" ? <Plus size={24} /> : <AlertTriangle size={24} />}
                </div>
                <div>
                  <h3 className="text-xl font-display tracking-wider uppercase">
                    {selectedReport.type === "accident" ? "Accident Details" : "Incident Details"}
                  </h3>
                  <p className="text-xs font-bold text-white/40 uppercase tracking-widest">
                    Report ID: {selectedReport.id}
                  </p>
                </div>
              </div>

              {isEditing && editData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Location</label>
                      <input 
                        value={editData.location}
                        onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-yellow"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Age Group</label>
                      <input 
                        value={editData.ageGroup}
                        onChange={(e) => setEditData({ ...editData, ageGroup: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-yellow"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Coach Name</label>
                      <input 
                        value={editData.coachName}
                        onChange={(e) => setEditData({ ...editData, coachName: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-yellow"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Date</label>
                      <input 
                        value={editData.date}
                        onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-yellow"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Parent Email</label>
                      <input 
                        value={editData.parentEmail}
                        onChange={(e) => setEditData({ ...editData, parentEmail: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-yellow"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Parent Phone</label>
                      <input 
                        value={editData.parentPhone}
                        onChange={(e) => setEditData({ ...editData, parentPhone: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-yellow"
                      />
                    </div>
                  </div>

                  {editData.type === 'accident' ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Injured Name</label>
                          <input 
                            value={(editData as AccidentReport).injuredName}
                            onChange={(e) => setEditData({ ...editData, injuredName: e.target.value } as AccidentReport)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-yellow"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Injured Age</label>
                          <input 
                            value={(editData as AccidentReport).injuredAge}
                            onChange={(e) => setEditData({ ...editData, injuredAge: e.target.value } as AccidentReport)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-yellow"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Nature of Injury</label>
                          <input 
                            value={(editData as AccidentReport).natureOfInjury}
                            onChange={(e) => setEditData({ ...editData, natureOfInjury: e.target.value } as AccidentReport)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-yellow"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/40">First Aider Name</label>
                          <input 
                            value={(editData as AccidentReport).firstAiderName}
                            onChange={(e) => setEditData({ ...editData, firstAiderName: e.target.value } as AccidentReport)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-yellow"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">How it Happened</label>
                        <textarea 
                          value={(editData as AccidentReport).howItHappened}
                          onChange={(e) => setEditData({ ...editData, howItHappened: e.target.value } as AccidentReport)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-yellow resize-none"
                          rows={3}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Treatment Given</label>
                        <textarea 
                          value={(editData as AccidentReport).treatmentGiven}
                          onChange={(e) => setEditData({ ...editData, treatmentGiven: e.target.value } as AccidentReport)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-yellow resize-none"
                          rows={2}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Action to Prevent Recurrence</label>
                        <textarea 
                          value={(editData as AccidentReport).actionToPreventRecurrence}
                          onChange={(e) => setEditData({ ...editData, actionToPreventRecurrence: e.target.value } as AccidentReport)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-yellow resize-none"
                          rows={2}
                        />
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                        <input 
                          type="checkbox" 
                          id="editParentInformed" 
                          checked={(editData as AccidentReport).parentInformed}
                          onChange={(e) => setEditData({ ...editData, parentInformed: e.target.checked } as AccidentReport)}
                          className="w-5 h-5 rounded-lg bg-white/5 border-white/10 text-brand-yellow focus:ring-brand-yellow"
                        />
                        <label htmlFor="editParentInformed" className="text-xs font-bold uppercase tracking-widest text-white/60 cursor-pointer">
                          Parent has been informed
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Player Name</label>
                          <input 
                            value={(editData as IncidentReport).playerName}
                            onChange={(e) => setEditData({ ...editData, playerName: e.target.value } as IncidentReport)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-yellow"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Incident Type</label>
                          <select 
                            value={(editData as IncidentReport).incidentType}
                            onChange={(e) => setEditData({ ...editData, incidentType: e.target.value } as IncidentReport)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-yellow appearance-none"
                          >
                            <option value="Safeguarding" className="bg-brand-navy text-white">Safeguarding</option>
                            <option value="Behavioral" className="bg-brand-navy text-white">Behavioral</option>
                            <option value="Facility Issue" className="bg-brand-navy text-white">Facility Issue</option>
                            <option value="Other" className="bg-brand-navy text-white">Other</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Description</label>
                        <textarea 
                          value={(editData as IncidentReport).description}
                          onChange={(e) => setEditData({ ...editData, description: e.target.value } as IncidentReport)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-yellow resize-none"
                          rows={4}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Action Taken</label>
                        <textarea 
                          value={(editData as IncidentReport).actionTaken}
                          onChange={(e) => setEditData({ ...editData, actionTaken: e.target.value } as IncidentReport)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-yellow resize-none"
                          rows={2}
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Witnesses</label>
                    <input 
                      value={editData.witnesses}
                      onChange={(e) => setEditData({ ...editData, witnesses: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-yellow"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => {
                        setIsEditing(false);
                        setEditData(null);
                      }}
                      className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleUpdateReport}
                      className="flex-1 py-3 bg-brand-yellow text-brand-navy rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-yellow/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Save size={16} />
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-8">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Date</p>
                      <p className="text-sm font-bold">{selectedReport.date}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Location</p>
                      <p className="text-sm font-bold">{selectedReport.location}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Age Group</p>
                      <p className="text-sm font-bold">{selectedReport.ageGroup}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Coach</p>
                      <p className="text-sm font-bold">{selectedReport.coachName}</p>
                    </div>
                    {selectedReport.severity && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Severity</p>
                        <p className={cn(
                          "text-sm font-bold capitalize",
                          selectedReport.severity === "serious" ? "text-red-400" : "text-brand-yellow"
                        )}>
                          {selectedReport.severity}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="bg-white/5 rounded-2xl p-6 border border-white/5 mb-8">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-yellow mb-4">Parent Contact Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedReport.parentFirstName && (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
                            <User size={14} />
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/20">Parent Name</p>
                            <p className="text-xs font-bold">{selectedReport.parentFirstName}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
                          <Mail size={14} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-white/20">Email</p>
                          <p className="text-xs font-bold">{selectedReport.parentEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
                          <Phone size={14} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-white/20">Phone</p>
                          <p className="text-xs font-bold">{selectedReport.parentPhone}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {selectedReport.type === "accident" ? (
                      <>
                        <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Injured Person</p>
                            <p className="text-sm font-bold">{(selectedReport as AccidentReport).injuredName}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Age / DOB</p>
                            <p className="text-sm font-bold">{(selectedReport as AccidentReport).injuredAge}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Nature of Injury</p>
                          <p className="text-sm font-medium">{(selectedReport as AccidentReport).natureOfInjury}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">How it Happened</p>
                          <p className="text-sm font-medium leading-relaxed">{(selectedReport as AccidentReport).howItHappened}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Treatment Given</p>
                          <p className="text-sm font-medium leading-relaxed">{(selectedReport as AccidentReport).treatmentGiven}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Action to Prevent Recurrence</p>
                          <p className="text-sm font-medium leading-relaxed">{(selectedReport as AccidentReport).actionToPreventRecurrence}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Player(s) Involved</p>
                            <p className="text-sm font-bold">{(selectedReport as IncidentReport).playerName}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Incident Type</p>
                            <p className="text-sm font-bold">{(selectedReport as IncidentReport).incidentType}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Description</p>
                          <p className="text-sm font-medium leading-relaxed">{(selectedReport as IncidentReport).description}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Action Taken</p>
                          <p className="text-sm font-medium leading-relaxed">{(selectedReport as IncidentReport).actionTaken}</p>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
