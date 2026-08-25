import React, { useState } from "react";
import { X, AlertTriangle, Plus, CheckCircle2, MapPin, Users, ChevronDown, Calendar, User, Mail, Phone, Clock } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { api, seg } from "../api";
import { useAuth } from "../context/AuthContext";
import { sendWelfareCheckWebhook, WelfareWebhookPayload } from "../services/welfareCheckService";

interface UnifiedReportFormProps {
  onClose: () => void;
  initialData?: {
    playerName?: string;
    injuredName?: string;
    childFirstName?: string;
    injuredAge?: string;
    parentFirstName?: string;
    parentName?: string;
    parentEmail?: string;
    parentPhone?: string;
    location?: string;
    ageGroup?: string;
  };
}

export default function UnifiedReportForm({ onClose, initialData }: UnifiedReportFormProps) {
  const { user, activeLocation, allLocations } = useAuth();
  const [reportType, setReportType] = useState<"accident" | "incident">("accident");
  const [severity, setSeverity] = useState<"routine" | "serious">("routine");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [webhookSuccess, setWebhookSuccess] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [reportLocation, setReportLocation] = useState(initialData?.location || activeLocation || "");
  const [reportAgeGroup, setReportAgeGroup] = useState(initialData?.ageGroup || "");

  const AGE_GROUPS = [
    { name: "Rookies", range: "5-7 Years" },
    { name: "Rising Stars", range: "8-11 Years" },
    { name: "Ballers", range: "12-15 Years" },
    { name: "Rookies & Rising Stars (Combined)", range: "5-9 Years" },
    { name: "Pros & All Stars (Combined)", range: "10-13 Years" }
  ];

  const handleReportSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    const formElement = e.currentTarget;
    const formData = new FormData(formElement);
    const data = Object.fromEntries(formData.entries());

    const childFullName = ((data.playerName as string) || (data.injuredName as string) || "").trim();
    const childFirstName = (initialData?.childFirstName || childFullName.split(/\s+/)[0] || "").trim();
    const parentFirstNameRaw = ((data.parentFirstName as string) || initialData?.parentFirstName || "").trim();
    const parentFirstName = parentFirstNameRaw ? parentFirstNameRaw.split(/\s+/)[0] : "";
    const parentEmail = ((data.parentEmail as string) || "").trim();
    const parentPhone = ((data.parentPhone as string) || "").trim();
    const locationName = ((data.location as string) || reportLocation || "N/A").trim();
    const formattedSessionDate = (data.sessionDate as string) || sessionDate || new Date().toISOString().split("T")[0];

    const reportId = Math.random().toString(36).substr(2, 9);
    const reportData = {
      id: reportId,
      type: reportType,
      coachName: user.name,
      coachEmail: user.email,
      location: locationName,
      ageGroup: (data.ageGroup as string) || reportAgeGroup || "N/A",
      date: new Date().toLocaleDateString(),
      sessionDate: formattedSessionDate,
      timestamp: Date.now(),
      severity,
      parentFirstName,
      parentEmail,
      parentPhone,
      witnesses: (data.witnesses as string) || "",
      // Incident specific
      playerName: (data.playerName as string) || (data.injuredName as string) || "",
      incidentType: (data.incidentType as string) || "",
      description: (data.description as string) || "",
      actionTaken: (data.actionTaken as string) || "",
      // Accident specific
      injuredName: (data.injuredName as string) || (data.playerName as string) || "",
      injuredAge: (data.injuredAge as string) || "",
      natureOfInjury: (data.natureOfInjury as string) || "",
      howItHappened: (data.howItHappened as string) || "",
      treatmentGiven: (data.treatmentGiven as string) || "",
      firstAiderName: (data.firstAiderName as string) || "",
      actionToPreventRecurrence: (data.actionToPreventRecurrence as string) || "",
      parentInformed: formData.get("parentInformed") === "on"
    };

    // 1. Save to D1 FIRST so report submission is never lost
    try {
      await api.put(`/api/reports/${seg(reportId)}`, reportData);
    } catch (error) {
      console.error("Error saving report:", error);
    }

    // 2. Background email notification
    fetch("/api/email/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reportData)
    }).catch(err => console.error("Error sending report email:", err));

    // 3. Post to LeadConnector webhook for parent welfare-check automation
    // Send ONLY the specified 8 fields — never incident description or medical details
    const webhookPayload: WelfareWebhookPayload = {
      parent_first_name: parentFirstName,
      parent_email: parentEmail,
      parent_phone: parentPhone,
      child_first_name: childFirstName,
      location_name: locationName,
      session_date: formattedSessionDate,
      severity: severity === "serious" ? "serious" : "routine",
      submitted_by_coach: user.name || "Coach"
    };

    const webhookRes = await sendWelfareCheckWebhook(webhookPayload);

    if (webhookRes.success) {
      setWebhookSuccess(true);
      setStatusMessage("Incident logged. Parent welfare check scheduled for tomorrow morning.");
    } else {
      setWebhookSuccess(false);
      setStatusMessage("Incident saved, but the parent follow-up did not trigger — please tell Jamie today.");
    }

    setSubmitted(true);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-brand-navy/90 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl glass-card p-8 border-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-white/20 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center mb-6",
              webhookSuccess ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
            )}>
              {webhookSuccess ? <CheckCircle2 size={40} /> : <AlertTriangle size={40} />}
            </div>
            <h3 className="text-2xl font-display tracking-wider uppercase mb-3 text-white">
              {webhookSuccess ? "Report Submitted" : "Notice"}
            </h3>
            <p className={cn(
              "text-sm font-medium leading-relaxed mb-8 px-4",
              webhookSuccess ? "text-white/80" : "text-amber-300 font-bold bg-amber-500/10 py-3 rounded-xl border border-amber-500/20"
            )}>
              {statusMessage}
            </p>
            <button 
              onClick={onClose}
              className="px-8 py-3 bg-brand-yellow hover:bg-brand-yellow/90 text-brand-navy rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-brand-yellow/20"
            >
              Done & Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-brand-yellow flex items-center justify-center text-brand-navy shadow-xl shadow-brand-yellow/20">
                <Plus size={24} />
              </div>
              <div>
                <h3 className="text-xl font-display tracking-wider uppercase">Submit Incident / Accident Report</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Location</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                  <select 
                    name="location"
                    value={reportLocation}
                    onChange={(e) => setReportLocation(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:border-brand-yellow outline-none transition-all font-medium appearance-none text-xs"
                  >
                    <option value="" disabled className="bg-brand-navy">Select Location</option>
                    {allLocations.map(loc => (
                      <option key={loc.id} value={loc.name} className="bg-brand-navy">{loc.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Session Date</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                  <input 
                    type="date"
                    name="sessionDate"
                    required
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:border-brand-yellow outline-none transition-all font-medium text-xs"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Age Group</label>
                <div className="relative">
                  <Users size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                  <select 
                    name="ageGroup"
                    value={reportAgeGroup}
                    onChange={(e) => setReportAgeGroup(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:border-brand-yellow outline-none transition-all font-medium appearance-none text-xs"
                  >
                    <option value="" disabled className="bg-brand-navy">Select Age Group</option>
                    {AGE_GROUPS.map(ag => (
                      <option key={ag.name} value={ag.name} className="bg-brand-navy">{ag.name}</option>
                    ))}
                    <option value="Other" className="bg-brand-navy">Other</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-1.5 bg-white/5 rounded-2xl w-fit border border-white/5 mb-6">
              {[
                { id: "accident", label: "Accident", icon: Plus },
                { id: "incident", label: "Incident", icon: AlertTriangle },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setReportType(tab.id as any)}
                  className={cn(
                    "flex items-center gap-3 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    reportType === tab.id 
                      ? "bg-brand-yellow text-brand-navy shadow-lg shadow-brand-yellow/20" 
                      : "text-white/40 hover:text-white/60"
                  )}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-6">
              {/* Severity Option (Required) */}
              <div className="space-y-2 p-4 bg-white/5 rounded-2xl border border-white/10">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-yellow flex items-center gap-2">
                  <AlertTriangle size={14} />
                  Severity Level <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label 
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all text-left",
                      severity === "routine" 
                        ? "bg-brand-yellow/10 border-brand-yellow text-white" 
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                    )}
                  >
                    <input 
                      type="radio" 
                      name="severityOption" 
                      value="routine" 
                      checked={severity === "routine"}
                      onChange={() => setSeverity("routine")}
                      className="mt-0.5 w-4 h-4 text-brand-yellow focus:ring-brand-yellow"
                    />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-brand-yellow">Routine</p>
                      <p className="text-[10px] text-white/60 mt-0.5 leading-tight">
                        Routine (minor knock, first aid, carried on / sat out)
                      </p>
                    </div>
                  </label>

                  <label 
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all text-left",
                      severity === "serious" 
                        ? "bg-red-500/10 border-red-500 text-white" 
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                    )}
                  >
                    <input 
                      type="radio" 
                      name="severityOption" 
                      value="serious" 
                      checked={severity === "serious"}
                      onChange={() => setSeverity("serious")}
                      className="mt-0.5 w-4 h-4 text-red-500 focus:ring-red-500"
                    />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-red-400">Serious</p>
                      <p className="text-[10px] text-white/60 mt-0.5 leading-tight">
                        Serious (head injury, parent contacted, emergency services, left session early)
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
                    {reportType === "accident" ? "Injured Person's Name" : "Player(s) Involved"}
                  </label>
                  <input 
                    name={reportType === "accident" ? "injuredName" : "playerName"} 
                    defaultValue={initialData?.playerName || initialData?.injuredName}
                    type="text" 
                    required 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:border-brand-yellow outline-none transition-all font-medium text-sm" 
                    placeholder="Full Name" 
                  />
                </div>
                {reportType === "accident" ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Age / Date of Birth</label>
                    <input 
                      name="injuredAge" 
                      defaultValue={initialData?.injuredAge}
                      type="text" 
                      required 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:border-brand-yellow outline-none transition-all font-medium text-sm" 
                      placeholder="e.g. 8 years old" 
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Incident Type</label>
                    <select name="incidentType" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:border-brand-yellow outline-none transition-all font-medium appearance-none text-sm">
                      <option className="bg-brand-navy text-white">Safeguarding</option>
                      <option className="bg-brand-navy text-white">Behavioral</option>
                      <option className="bg-brand-navy text-white">Facility Issue</option>
                      <option className="bg-brand-navy text-white">Other</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Parent Contact Details (Pre-filled if child record exists) */}
              <div className="space-y-3 pt-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-yellow flex items-center gap-1.5">
                  <User size={12} />
                  Parent Contact Information
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                      Parent First Name <span className="text-red-400">*</span>
                    </label>
                    <input 
                      name="parentFirstName" 
                      defaultValue={initialData?.parentFirstName || (initialData?.parentName ? initialData.parentName.split(/\s+/)[0] : "")}
                      type="text" 
                      required 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 focus:border-brand-yellow outline-none transition-all font-medium text-xs" 
                      placeholder="e.g. Sarah" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                      Parent's Email <span className="text-red-400">*</span>
                    </label>
                    <input 
                      name="parentEmail" 
                      defaultValue={initialData?.parentEmail}
                      type="email" 
                      required 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 focus:border-brand-yellow outline-none transition-all font-medium text-xs" 
                      placeholder="parent@example.com" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                      Parent's Mobile <span className="text-red-400">*</span>
                    </label>
                    <input 
                      name="parentPhone" 
                      defaultValue={initialData?.parentPhone}
                      type="tel" 
                      required 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 focus:border-brand-yellow outline-none transition-all font-medium text-xs" 
                      placeholder="e.g. 07123456789" 
                    />
                  </div>
                </div>
              </div>

              {reportType === "incident" ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Description of Incident</label>
                    <textarea name="description" rows={3} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:border-brand-yellow outline-none transition-all font-medium text-sm" placeholder="Provide a detailed account of what happened..."></textarea>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Action Taken</label>
                    <textarea name="actionTaken" rows={2} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:border-brand-yellow outline-none transition-all font-medium text-sm" placeholder="What steps were taken at the time?"></textarea>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Nature of Injury</label>
                      <input name="natureOfInjury" type="text" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:border-brand-yellow outline-none transition-all font-medium text-sm" placeholder="e.g. Sprained ankle" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">First Aider Name</label>
                      <input name="firstAiderName" type="text" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:border-brand-yellow outline-none transition-all font-medium text-sm" placeholder="Who provided treatment?" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">How it Happened</label>
                    <textarea name="howItHappened" rows={2} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:border-brand-yellow outline-none transition-all font-medium text-sm" placeholder="Describe the accident..."></textarea>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Treatment Given</label>
                    <textarea name="treatmentGiven" rows={2} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:border-brand-yellow outline-none transition-all font-medium text-sm" placeholder="What first aid was provided?"></textarea>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Action Taken to Prevent Recurrence</label>
                    <textarea name="actionToPreventRecurrence" rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:border-brand-yellow outline-none transition-all font-medium text-sm" placeholder="e.g. Area cleared..."></textarea>
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/5">
                    <input type="checkbox" name="parentInformed" id="parentInformed" className="w-4 h-4 rounded border-white/10 bg-white/5 text-brand-yellow focus:ring-brand-yellow" />
                    <label htmlFor="parentInformed" className="text-xs font-bold uppercase tracking-widest text-white/60 cursor-pointer">Parent / Guardian Informed?</label>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Witnesses</label>
                <input name="witnesses" type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:border-brand-yellow outline-none transition-all font-medium text-sm" placeholder="Names of any witnesses" />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting || submitted}
                className={cn(
                  "w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl",
                  "yellow-gradient text-brand-navy shadow-brand-yellow/20",
                  isSubmitting && "opacity-60 cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Clock className="animate-spin" size={18} />
                    Submitting & Scheduling Welfare Check...
                  </>
                ) : (
                  "Submit Report"
                )}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}

