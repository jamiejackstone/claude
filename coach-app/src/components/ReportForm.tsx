import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  AlertTriangle, 
  CheckCircle2,
  Plus,
  Mail,
  Phone,
  User,
  Users,
  MapPin,
  Calendar,
  ClipboardList,
  Clock,
  ChevronDown
} from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import { api, seg } from "../api";
import { sendWelfareCheckWebhook, WelfareWebhookPayload } from "../services/welfareCheckService";

type ReportType = "incident" | "accident";

export default function ReportForm() {
  const { user, activeLocation, allLocations } = useAuth();
  const [reportLocation, setReportLocation] = useState(activeLocation || "");
  const [activeTab, setActiveTab] = useState<ReportType>("accident");
  const [severity, setSeverity] = useState<"routine" | "serious">("routine");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [webhookSuccess, setWebhookSuccess] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");

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
    const childFirstName = childFullName ? childFullName.split(/\s+/)[0] : "";
    const parentFirstNameRaw = ((data.parentFirstName as string) || "").trim();
    const parentFirstName = parentFirstNameRaw ? parentFirstNameRaw.split(/\s+/)[0] : "";
    const parentEmail = ((data.parentEmail as string) || "").trim();
    const parentPhone = ((data.parentPhone as string) || "").trim();
    const locationName = ((data.location as string) || reportLocation || "N/A").trim();
    const formattedSessionDate = (data.sessionDate as string) || sessionDate || new Date().toISOString().split("T")[0];

    const reportId = Math.random().toString(36).substr(2, 9);
    const reportData = {
      id: reportId,
      type: activeTab,
      coachName: user.name,
      coachEmail: user.email,
      location: locationName,
      ageGroup: (data.ageGroup as string) || "N/A",
      date: new Date().toLocaleDateString(),
      sessionDate: formattedSessionDate,
      timestamp: Date.now(),
      severity,
      parentFirstName,
      parentEmail,
      parentPhone,
      witnesses: (data.witnesses as string) || "",
      // Incident specific
      playerName: (data.playerName as string) || "",
      incidentType: (data.incidentType as string) || "",
      description: (data.description as string) || "",
      actionTaken: (data.actionTaken as string) || "",
      // Accident specific
      injuredName: (data.injuredName as string) || "",
      injuredAge: (data.injuredAge as string) || "",
      natureOfInjury: (data.natureOfInjury as string) || "",
      howItHappened: (data.howItHappened as string) || "",
      treatmentGiven: (data.treatmentGiven as string) || "",
      firstAiderName: (data.firstAiderName as string) || "",
      actionToPreventRecurrence: (data.actionToPreventRecurrence as string) || "",
      parentInformed: formData.get("parentInformed") === "on"
    };

    // 1. Save to D1 FIRST so report data is never lost
    try {
      await api.put(`/api/reports/${seg(reportId)}`, reportData);
    } catch (dbError) {
      console.error("Error saving report:", dbError);
    }

    // 2. Fire background email notification
    fetch("/api/email/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reportData)
    }).catch(err => console.error("Error sending report email:", err));

    // 3. Post to LeadConnector Webhook for parent welfare-check automation
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

  if (submitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16 text-center max-w-xl mx-auto glass-card p-8 border-white/10"
      >
        <div className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center mb-6",
          webhookSuccess ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
        )}>
          {webhookSuccess ? <CheckCircle2 size={40} /> : <AlertTriangle size={40} />}
        </div>
        <h2 className="text-2xl font-display tracking-wider uppercase mb-3 text-white">
          {webhookSuccess ? "Report Submitted" : "Notice"}
        </h2>
        <p className={cn(
          "text-sm font-medium leading-relaxed mb-8 px-4",
          webhookSuccess ? "text-white/80" : "text-amber-300 font-bold bg-amber-500/10 py-3 rounded-xl border border-amber-500/20"
        )}>
          {statusMessage}
        </p>
        <button 
          onClick={() => {
            setSubmitted(false);
            setStatusMessage("");
          }}
          className="px-8 py-3 bg-brand-yellow hover:bg-brand-yellow/90 text-brand-navy rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-brand-yellow/20"
        >
          Submit Another Report
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex p-1 bg-white/5 rounded-2xl mb-8">
        <button
          onClick={() => setActiveTab("accident")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === "accident" ? "bg-brand-yellow text-brand-navy shadow-lg" : "text-white/40 hover:text-white"
          )}
        >
          <Plus size={14} />
          Accident Report
        </button>
        <button
          onClick={() => setActiveTab("incident")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === "incident" ? "bg-red-500 text-white shadow-lg" : "text-white/40 hover:text-white"
          )}
        >
          <AlertTriangle size={14} />
          Incident Report
        </button>
      </div>

      <form onSubmit={handleReportSubmit} className="space-y-8">
        <div className="glass-card p-8 border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Location</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                <select 
                  name="location"
                  required
                  value={reportLocation}
                  onChange={(e) => setReportLocation(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm font-bold outline-none focus:border-brand-yellow transition-colors appearance-none"
                >
                  <option value="" disabled className="bg-brand-navy">Select Location</option>
                  {allLocations.map(loc => (
                    <option key={loc.id} value={loc.name} className="bg-brand-navy">{loc.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Session Date</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                <input 
                  type="date"
                  name="sessionDate"
                  required
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm font-medium outline-none focus:border-brand-yellow transition-colors"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Coach</label>
              <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-white/60">
                <User size={16} />
                <span className="text-sm font-bold truncate">{user?.name}</span>
              </div>
            </div>
          </div>

          {/* Severity Field (Required) */}
          <div className="space-y-3 mb-8 p-5 bg-white/5 rounded-2xl border border-white/10">
            <label className="text-[10px] font-black uppercase tracking-widest text-brand-yellow flex items-center gap-2">
              <AlertTriangle size={14} />
              Severity Level <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label 
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all",
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
                  className="mt-1 w-4 h-4 text-brand-yellow focus:ring-brand-yellow"
                />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-yellow">Routine</p>
                  <p className="text-[11px] text-white/60 mt-1 leading-snug">
                    Routine (minor knock, first aid, carried on / sat out)
                  </p>
                </div>
              </label>

              <label 
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all",
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
                  className="mt-1 w-4 h-4 text-red-500 focus:ring-red-500"
                />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-red-400">Serious</p>
                  <p className="text-[11px] text-white/60 mt-1 leading-snug">
                    Serious (head injury, parent contacted, emergency services, left session early)
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-yellow border-b border-white/5 pb-2">
              {activeTab === "accident" ? "Injured Person Details" : "Incident Details"}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">
                  {activeTab === "accident" ? "Injured Person Name" : "Player(s) Involved"}
                </label>
                <input 
                  required
                  name={activeTab === "accident" ? "injuredName" : "playerName"}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-brand-yellow transition-colors"
                  placeholder="Enter full name..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">
                  {activeTab === "accident" ? "Age / Date of Birth" : "Incident Type"}
                </label>
                {activeTab === "accident" ? (
                  <input 
                    required
                    name="injuredAge"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-brand-yellow transition-colors"
                    placeholder="e.g. 8 years old"
                  />
                ) : (
                  <select 
                    required
                    name="incidentType"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-brand-yellow transition-colors appearance-none"
                  >
                    <option value="Safeguarding" className="bg-brand-navy text-white">Safeguarding</option>
                    <option value="Behavioral" className="bg-brand-navy text-white">Behavioral</option>
                    <option value="Facility Issue" className="bg-brand-navy text-white">Facility Issue</option>
                    <option value="Other" className="bg-brand-navy text-white">Other</option>
                  </select>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Age Group / Class</label>
              <div className="relative">
                <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                <select 
                  name="ageGroup"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm font-bold outline-none focus:border-brand-yellow transition-colors appearance-none"
                >
                  <option value="" disabled className="bg-brand-navy">Select Age Group</option>
                  {AGE_GROUPS.map(ag => (
                    <option key={ag.name} value={ag.name} className="bg-brand-navy">{ag.name} ({ag.range})</option>
                  ))}
                  <option value="Other" className="bg-brand-navy">Other</option>
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
              </div>
            </div>

            {activeTab === "accident" ? (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Nature of Injury</label>
                  <input 
                    required
                    name="natureOfInjury"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-brand-yellow transition-colors"
                    placeholder="e.g. Sprained ankle, cut on knee"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">First Aider Name</label>
                  <input 
                    required
                    name="firstAiderName"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-brand-yellow transition-colors"
                    placeholder="Who provided first aid?"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">How it Happened</label>
                  <textarea 
                    required
                    name="howItHappened"
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-brand-yellow transition-colors resize-none"
                    placeholder="Describe the accident..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Treatment Given</label>
                  <textarea 
                    required
                    name="treatmentGiven"
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-brand-yellow transition-colors resize-none"
                    placeholder="Describe first aid provided..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Action to Prevent Recurrence</label>
                  <textarea 
                    name="actionToPreventRecurrence"
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-brand-yellow transition-colors resize-none"
                    placeholder="e.g. Court inspected, cones adjusted..."
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Description of Incident</label>
                  <textarea 
                    required
                    name="description"
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-brand-yellow transition-colors resize-none"
                    placeholder="Provide full details of what happened..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Action Taken</label>
                  <textarea 
                    required
                    name="actionTaken"
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-brand-yellow transition-colors resize-none"
                    placeholder="What steps were taken following the incident?"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Witnesses (if any)</label>
              <input 
                name="witnesses"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-brand-yellow transition-colors"
                placeholder="Names of anyone who saw what happened"
              />
            </div>
          </div>

          {/* Parent Contact Information */}
          <div className="space-y-6 mt-10">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-yellow border-b border-white/5 pb-2">
              Parent Contact & Welfare Check
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">
                  Parent First Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                  <input 
                    required
                    type="text"
                    name="parentFirstName"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm font-medium outline-none focus:border-brand-yellow transition-colors"
                    placeholder="e.g. Sarah"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">
                  Parent Email <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                  <input 
                    required
                    type="email"
                    name="parentEmail"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm font-medium outline-none focus:border-brand-yellow transition-colors"
                    placeholder="parent@example.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">
                  Parent Mobile <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                  <input 
                    required
                    type="tel"
                    name="parentPhone"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm font-medium outline-none focus:border-brand-yellow transition-colors"
                    placeholder="07xxx xxxxxx"
                  />
                </div>
              </div>
            </div>

            {activeTab === "accident" && (
              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                <input 
                  type="checkbox" 
                  id="parentInformed" 
                  name="parentInformed"
                  className="w-5 h-5 rounded-lg bg-white/5 border-white/10 text-brand-yellow focus:ring-brand-yellow"
                />
                <label htmlFor="parentInformed" className="text-xs font-bold uppercase tracking-widest text-white/60 cursor-pointer">
                  Parent has been informed of the accident
                </label>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "w-full mt-10 py-4 rounded-2xl font-display text-xl tracking-widest uppercase transition-all flex items-center justify-center gap-3",
              activeTab === "accident" ? "bg-brand-yellow text-brand-navy shadow-xl shadow-brand-yellow/20" : "bg-red-500 text-white shadow-xl shadow-red-500/20",
              isSubmitting && "opacity-50 cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <Clock className="animate-spin" size={20} />
                Submitting & Scheduling Welfare Check...
              </>
            ) : (
              <>
                <ClipboardList size={20} />
                Submit Report
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

