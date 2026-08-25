import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Role } from "../types";
import { 
  Users, 
  MapPin, 
  Plus, 
  Trash2, 
  UserPlus, 
  Shield, 
  CheckCircle2, 
  X,
  ChevronRight,
  Search,
  FileText,
  Settings
} from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import ReportManager from "../components/ReportManager";

export default function Admin() {
  const { 
    allUsers, 
    allLocations, 
    addUser, 
    removeUser, 
    addLocation, 
    updateLocation, 
    removeLocation, 
    updateUserLocations, 
    updateUserHourlyRate,
    resendInvite, 
    user 
  } = useAuth();
  const [activeTab, setActiveTab] = useState<"users" | "locations" | "reports">("users");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationSearchTerm, setLocationSearchTerm] = useState("");
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ userId: string | null, status: 'idle' | 'saving' | 'saved' | 'error' }>({ userId: null, status: 'idle' });

  // New User Form State
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<Role>("HEAD_COACH");
  const [newUserLocations, setNewUserLocations] = useState<string[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState("");
  const [addUserSuccess, setAddUserSuccess] = useState("");
  const isOwner = user?.role === "OWNER";

  // New Location Form State
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationAddress, setNewLocationAddress] = useState("");
  const [newLocationHeadCoachId, setNewLocationHeadCoachId] = useState("");
  const [newLocationAgeGroups, setNewLocationAgeGroups] = useState<string[]>([]);
  const [newLocationHasBallers, setNewLocationHasBallers] = useState(true);
  const [newLocationSessionTimes, setNewLocationSessionTimes] = useState<Record<string, string>>({
    "Rookies": "",
    "Rising Stars": "",
    "Ballers": ""
  });
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);

  const AVAILABLE_AGE_GROUPS = [
    "Rookies",
    "Rising Stars",
    "Ballers"
  ];

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingUser(true);
    setAddUserError("");
    setAddUserSuccess("");
    
    try {
      await addUser({
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        locations: newUserLocations
      });
      
      setAddUserSuccess(`Successfully added ${newUserName}. An email has been sent to them to set their password.`);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserRole("HEAD_COACH");
      setNewUserLocations([]);
      
      // Close modal after a short delay to show success message
      setTimeout(() => {
        setIsAddUserOpen(false);
        setAddUserSuccess("");
      }, 3000);
    } catch (error: any) {
      console.error("Failed to add user:", error);
      setAddUserError(error.message || "Failed to add user. Please try again.");
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const locationName = newLocationName.trim().toUpperCase();
    if (locationName) {
      const headCoach = allUsers.find(u => u.id === newLocationHeadCoachId);
      const locationData = {
        name: locationName,
        ageGroups: newLocationAgeGroups,
        hasBallers: newLocationHasBallers,
        address: newLocationAddress || null,
        headCoachId: newLocationHeadCoachId || null,
        headCoachName: headCoach?.name || null,
        sessionTimes: newLocationSessionTimes
      };

      if (editingLocationId) {
        updateLocation(editingLocationId, locationData);
      } else {
        addLocation({
          id: Math.random().toString(36).substr(2, 9),
          ...locationData
        });
      }

      // Automatically add this location to the head coach's profile if not already there
      if (headCoach && !headCoach.locations.includes(locationName)) {
        const updatedLocations = [...headCoach.locations, locationName];
        await updateUserLocations(headCoach.id, updatedLocations);
      }

      setNewLocationName("");
      setNewLocationAddress("");
      setNewLocationHeadCoachId("");
      setNewLocationAgeGroups([]);
      setNewLocationHasBallers(true);
      setNewLocationSessionTimes({
        "Rookies": "",
        "Rising Stars": "",
        "Ballers": ""
      });
      setEditingLocationId(null);
      setExpandedLocationId(null);
    }
  };

  const openEditLocation = (loc: any) => {
    if (expandedLocationId === loc.id) {
      setExpandedLocationId(null);
      setEditingLocationId(null);
      return;
    }
    setNewLocationName(loc.name);
    setNewLocationAddress(loc.address || "");
    setNewLocationHeadCoachId(loc.headCoachId || "");
    setNewLocationAgeGroups(loc.ageGroups || []);
    setNewLocationHasBallers(loc.hasBallers !== false);
    setNewLocationSessionTimes(loc.sessionTimes || {
      "Rookies": "",
      "Rising Stars": "",
      "Ballers": ""
    });
    setEditingLocationId(loc.id);
    setExpandedLocationId(loc.id);
  };

  const openAddLocation = () => {
    if (expandedLocationId === 'new') {
      setExpandedLocationId(null);
      return;
    }
    setNewLocationName("");
    setNewLocationAddress("");
    setNewLocationHeadCoachId("");
    setNewLocationAgeGroups(["Rookies", "Rising Stars", "Ballers"]);
    setNewLocationHasBallers(true);
    setNewLocationSessionTimes({
      "Rookies": "",
      "Rising Stars": "",
      "Ballers": ""
    });
    setEditingLocationId(null);
    setExpandedLocationId('new');
  };

  const toggleUserLocation = async (userId: string, currentLocations: string[], location: string) => {
    if (!isOwner) return;
    
    const newLocations = currentLocations.includes(location)
      ? currentLocations.filter(l => l !== location)
      : [...currentLocations, location];
    
    try {
      setSaveStatus({ userId, status: 'saving' });
      await updateUserLocations(userId, newLocations);
      setSaveStatus({ userId, status: 'saved' });
      setTimeout(() => setSaveStatus({ userId: null, status: 'idle' }), 2000);
    } catch (error) {
      console.error("Failed to update user locations:", error);
      setSaveStatus({ userId, status: 'error' });
      setTimeout(() => setSaveStatus({ userId: null, status: 'idle' }), 3000);
    }
  };

  const handleUpdateHourlyRate = async (userId: string, rate: number) => {
    if (!isOwner) return;
    try {
      setSaveStatus({ userId, status: 'saving' });
      await updateUserHourlyRate(userId, rate);
      setSaveStatus({ userId, status: 'saved' });
      setTimeout(() => setSaveStatus({ userId: null, status: 'idle' }), 2000);
    } catch (error) {
      console.error("Failed to update hourly rate:", error);
      setSaveStatus({ userId, status: 'error' });
      setTimeout(() => setSaveStatus({ userId: null, status: 'idle' }), 3000);
    }
  };

  const handleResendInvite = async (email: string, userId: string) => {
    setResendingInviteId(userId);
    try {
      await resendInvite(email);
      alert(`Invite resent to ${email}`);
    } catch (error) {
      console.error("Failed to resend invite:", error);
      alert("Failed to resend invite. Please try again.");
    } finally {
      setResendingInviteId(null);
    }
  };

  const filteredUsers = allUsers.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLocations = allLocations.filter(loc => 
    loc.name.toLowerCase().includes(locationSearchTerm.toLowerCase()) ||
    (loc.headCoachName && loc.headCoachName.toLowerCase().includes(locationSearchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 pb-20">
      {/* Top Header */}
      <div className="space-y-6 sticky top-0 md:top-0 z-30 bg-brand-navy/80 backdrop-blur-xl pb-6 -mx-4 px-4 md:mx-0 md:px-0 pt-2 sm:pt-0 border-b border-white/5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[2rem] bg-brand-yellow flex items-center justify-center text-brand-navy shadow-2xl shadow-brand-yellow/20 rotate-3">
            <Settings size={32} />
          </div>
          <div>
            <h1 className="font-display text-4xl md:text-5xl tracking-wider text-brand-yellow uppercase leading-none">Settings</h1>
            <p className="text-white/40 mt-2 font-semibold uppercase tracking-widest text-[10px]">Manage coaching staff and training locations.</p>
          </div>
        </div>
        
        <div className="flex gap-3 p-1.5 bg-white/5 rounded-[2rem] border border-white/5">
          <button
            onClick={() => setActiveTab("users")}
            className={cn(
              "flex items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === "users" ? "bg-brand-yellow text-brand-navy shadow-xl shadow-brand-yellow/20" : "text-white/40 hover:text-white/60"
            )}
          >
            <Users size={16} />
            Users
          </button>
          <button
            onClick={() => setActiveTab("locations")}
            className={cn(
              "flex items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === "locations" ? "bg-brand-yellow text-brand-navy shadow-xl shadow-brand-yellow/20" : "text-white/40 hover:text-white/60"
            )}
          >
            <MapPin size={16} />
            Locations
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={cn(
              "flex items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === "reports" ? "bg-brand-yellow text-brand-navy shadow-xl shadow-brand-yellow/20" : "text-white/40 hover:text-white/60"
            )}
          >
            <FileText size={16} />
            Reports
          </button>
        </div>
      </div>
    </div>

      <div className="grid grid-cols-1 gap-10">
        {activeTab === "users" ? (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input 
                  type="text" 
                  placeholder="Search coaches..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 py-3 focus:border-brand-yellow outline-none transition-all font-medium text-sm"
                />
              </div>
              <button 
                onClick={() => setIsAddUserOpen(true)}
                className="flex items-center gap-3 px-6 py-3 bg-brand-yellow text-brand-navy rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-yellow/20 hover:scale-105 transition-all"
              >
                <UserPlus size={18} />
                Add New Coach
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredUsers.map((u) => (
                <motion.div 
                  layout
                  key={u.id} 
                  className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-4 border-l-brand-yellow/30 hover:border-l-brand-yellow transition-all"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-brand-yellow/10 flex items-center justify-center text-brand-yellow font-display text-xl">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-display text-lg tracking-wide">{u.name}</h3>
                      <p className="text-xs text-white/40 font-medium">{u.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Shield size={10} className="text-brand-yellow" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-yellow/60">{u.role.replace("_", " ")}</span>
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <div className="text-[8px] font-black uppercase tracking-widest text-white/20">Hourly Rate</div>
                        <div className="relative group">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-yellow text-[10px] font-bold">£</span>
                          <input 
                            type="number"
                            defaultValue={u.hourlyRate || 0}
                            onBlur={(e) => handleUpdateHourlyRate(u.id, Number(e.target.value))}
                            className="bg-white/5 border border-white/10 rounded-xl pl-6 pr-3 py-2 text-[10px] font-bold text-white w-20 focus:border-brand-yellow outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col gap-2 md:items-center">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[8px] font-black uppercase tracking-widest text-white/20">Assigned Locations</h4>
                      {saveStatus.userId === u.id && (
                        <span className={cn(
                          "text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full",
                          saveStatus.status === 'saving' ? "bg-brand-yellow/10 text-brand-yellow animate-pulse" :
                          saveStatus.status === 'saved' ? "bg-emerald-500/10 text-emerald-400" :
                          "bg-red-500/10 text-red-400"
                        )}>
                          {saveStatus.status === 'saving' ? "Saving..." : 
                           saveStatus.status === 'saved' ? "Saved" : 
                           "Error"}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-center">
                      {allLocations.map(loc => (
                        <button
                          key={loc.id}
                          onClick={() => toggleUserLocation(u.id, u.locations, loc.name)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all",
                            u.locations.includes(loc.name)
                              ? "bg-brand-yellow/20 border-brand-yellow text-brand-yellow"
                              : "bg-white/5 border-white/5 text-white/20 hover:border-white/10"
                          )}
                        >
                          {loc.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleResendInvite(u.email, u.id)}
                      disabled={resendingInviteId === u.id}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all disabled:opacity-50"
                      title="Resend Invite"
                    >
                      {resendingInviteId === u.id ? "Sending..." : "Resend Invite"}
                    </button>
                    <button 
                      onClick={() => removeUser(u.id)}
                      className="p-3 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                      title="Remove User"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : activeTab === "locations" ? (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input 
                  type="text" 
                  placeholder="Search locations..."
                  value={locationSearchTerm}
                  onChange={(e) => setLocationSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 py-3 focus:border-brand-yellow outline-none transition-all font-medium text-sm"
                />
              </div>
              <button 
                onClick={openAddLocation}
                className="flex items-center gap-3 px-6 py-3 bg-brand-yellow text-brand-navy rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-yellow/20 hover:scale-105 transition-all"
              >
                {expandedLocationId === 'new' ? <X size={18} /> : <Plus size={18} />}
                {expandedLocationId === 'new' ? "Cancel" : "Add New Location"}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence mode="popLayout">
                {expandedLocationId === 'new' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="glass-card p-8 border-l-4 border-l-emerald-500 mb-4">
                      <h3 className="font-display text-xl mb-6">Register New Location</h3>
                      <LocationForm 
                        onSubmit={handleAddLocation}
                        onCancel={() => setExpandedLocationId(null)}
                        name={newLocationName}
                        setName={setNewLocationName}
                        address={newLocationAddress}
                        setAddress={setNewLocationAddress}
                        headCoachId={newLocationHeadCoachId}
                        setHeadCoachId={setNewLocationHeadCoachId}
                        selectedAgeGroups={newLocationAgeGroups}
                        setSelectedAgeGroups={setNewLocationAgeGroups}
                        hasBallers={newLocationHasBallers}
                        setHasBallers={setNewLocationHasBallers}
                        sessionTimes={newLocationSessionTimes}
                        setSessionTimes={setNewLocationSessionTimes}
                        allUsers={allUsers}
                        AVAILABLE_AGE_GROUPS={AVAILABLE_AGE_GROUPS}
                        isEditing={false}
                      />
                    </div>
                  </motion.div>
                )}

                {filteredLocations.map((loc) => (
                  <div key={loc.id} className="space-y-4">
                    <motion.div 
                      layout
                      className={cn(
                        "glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-4 transition-all",
                        expandedLocationId === loc.id ? "border-l-brand-yellow bg-white/10" : "border-l-brand-yellow/30 hover:border-l-brand-yellow"
                      )}
                    >
                      <div className="flex items-center gap-5 min-w-[220px]">
                        <div className="w-12 h-12 rounded-2xl bg-brand-yellow/10 flex items-center justify-center text-brand-yellow">
                          <MapPin size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display text-xl tracking-wider">{loc.name}</h3>
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                              loc.hasBallers === false 
                                ? "bg-white/5 text-white/40 border-white/10" 
                                : "bg-brand-yellow/10 text-brand-yellow border-brand-yellow/30"
                            )}>
                              Ballers: {loc.hasBallers === false ? "No" : "Yes"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-4 h-4 rounded-full bg-brand-yellow/10 flex items-center justify-center text-brand-yellow text-[8px] font-bold">
                              {loc.headCoachName ? loc.headCoachName.charAt(0) : "?"}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                              {loc.headCoachName || "No Head Coach"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 md:px-10">
                        {(loc.ageGroups || AVAILABLE_AGE_GROUPS).map(ag => {
                          const isBallersDisabled = ag === "Ballers" && loc.hasBallers === false;
                          return (
                            <div key={ag} className={cn(
                              "rounded-xl p-3 border",
                              isBallersDisabled ? "bg-white/[0.02] border-white/5 opacity-40" : "bg-white/5 border-white/5"
                            )}>
                              <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-1">{ag}</p>
                              <p className="text-xs font-bold text-brand-yellow">
                                {isBallersDisabled ? "Not running" : (loc.sessionTimes?.[ag] || "Not Set")}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => openEditLocation(loc)}
                          className={cn(
                            "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                            expandedLocationId === loc.id ? "bg-brand-yellow text-brand-navy" : "bg-white/5 hover:bg-white/10 text-white"
                          )}
                        >
                          {expandedLocationId === loc.id ? "Close" : "Edit Details"}
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete ${loc.name}?`)) {
                              removeLocation(loc.id);
                            }
                          }}
                          className="p-3 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </motion.div>

                    <AnimatePresence>
                      {expandedLocationId === loc.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="glass-card p-8 border-t border-white/5 bg-white/[0.02]">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                              <div className="space-y-8">
                                <h3 className="font-display text-xl">Edit {loc.name}</h3>
                                <LocationForm 
                                  onSubmit={handleAddLocation}
                                  onCancel={() => setExpandedLocationId(null)}
                                  name={newLocationName}
                                  setName={setNewLocationName}
                                  address={newLocationAddress}
                                  setAddress={setNewLocationAddress}
                                  headCoachId={newLocationHeadCoachId}
                                  setHeadCoachId={setNewLocationHeadCoachId}
                                  selectedAgeGroups={newLocationAgeGroups}
                                  setSelectedAgeGroups={setNewLocationAgeGroups}
                                  hasBallers={newLocationHasBallers}
                                  setHasBallers={setNewLocationHasBallers}
                                  sessionTimes={newLocationSessionTimes}
                                  setSessionTimes={setNewLocationSessionTimes}
                                  allUsers={allUsers}
                                  AVAILABLE_AGE_GROUPS={AVAILABLE_AGE_GROUPS}
                                  isEditing={true}
                                />
                              </div>
                              
                              <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 ml-1">Location Map</p>
                                {loc.address ? (
                                  <div className="w-full aspect-video rounded-3xl overflow-hidden border border-white/10 grayscale contrast-125 opacity-70">
                                    <iframe
                                      width="100%"
                                      height="100%"
                                      frameBorder="0"
                                      scrolling="no"
                                      marginHeight={0}
                                      marginWidth={0}
                                      src={`https://maps.google.com/maps?q=${encodeURIComponent(loc.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-full aspect-video rounded-3xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-white/20">
                                    <MapPin size={48} className="mb-4 opacity-20" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No address provided</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : activeTab === "reports" ? (
          <div className="space-y-6">
            <ReportManager />
          </div>
        ) : null}
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {isAddUserOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAddUserOpen(false);
                setAddUserError("");
                setAddUserSuccess("");
                setNewUserName("");
                setNewUserEmail("");
                setNewUserRole("HEAD_COACH");
                setNewUserLocations([]);
              }}
              className="absolute inset-0 bg-brand-navy/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-brand-navy border border-white/10 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-brand-yellow" />
              <button 
                onClick={() => {
                  setIsAddUserOpen(false);
                  setAddUserError("");
                  setAddUserSuccess("");
                  setNewUserName("");
                  setNewUserEmail("");
                  setNewUserRole("HEAD_COACH");
                  setNewUserLocations([]);
                }} 
                className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <h2 className="text-2xl font-display tracking-wider mb-8">Add New Coach</h2>
              
              <form onSubmit={handleAddUser} className="space-y-6">
                {addUserError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest p-4 rounded-xl text-center">
                    {addUserError}
                  </div>
                )}
                {addUserSuccess && (
                  <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-widest p-4 rounded-xl text-center">
                    {addUserSuccess}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 ml-1">Full Name</label>
                  <input 
                    required 
                    type="text" 
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-brand-yellow outline-none transition-all font-medium"
                    placeholder="e.g. Coach Carter"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 ml-1">Email Address</label>
                  <input 
                    required 
                    type="email" 
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-brand-yellow outline-none transition-all font-medium"
                    placeholder="coach@hoopheroes.co.uk"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 ml-1">Access Level</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["OWNER", "ADMINISTRATOR", "HEAD_COACH", "ASSISTANT_COACH"] as Role[]).map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setNewUserRole(r)}
                        className={cn(
                          "px-2 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all",
                          newUserRole === r ? "bg-brand-yellow text-brand-navy border-brand-yellow" : "bg-white/5 border-white/10 text-white/40"
                        )}
                      >
                        {r.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 ml-1">Assigned Locations</label>
                  <div className="flex flex-wrap gap-2">
                    {allLocations.map(loc => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => {
                          if (newUserLocations.includes(loc.name)) {
                            setNewUserLocations(newUserLocations.filter(l => l !== loc.name));
                          } else {
                            setNewUserLocations([...newUserLocations, loc.name]);
                          }
                        }}
                        className={cn(
                          "px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                          newUserLocations.includes(loc.name)
                            ? "bg-brand-yellow/20 border-brand-yellow text-brand-yellow"
                            : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white"
                        )}
                      >
                        {loc.name}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isAddingUser}
                  className="w-full py-5 yellow-gradient text-brand-navy rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-brand-yellow/20 mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAddingUser ? "Adding..." : "Create User Account"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface LocationFormProps {
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  name: string;
  setName: (val: string) => void;
  address: string;
  setAddress: (val: string) => void;
  headCoachId: string;
  setHeadCoachId: (val: string) => void;
  selectedAgeGroups: string[];
  setSelectedAgeGroups: (val: string[]) => void;
  hasBallers: boolean;
  setHasBallers: (val: boolean) => void;
  sessionTimes: Record<string, string>;
  setSessionTimes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  allUsers: any[];
  AVAILABLE_AGE_GROUPS: string[];
  isEditing: boolean;
}

function LocationForm({ 
  onSubmit, 
  onCancel, 
  name, 
  setName, 
  address, 
  setAddress, 
  headCoachId, 
  setHeadCoachId, 
  selectedAgeGroups,
  setSelectedAgeGroups,
  hasBallers,
  setHasBallers,
  sessionTimes, 
  setSessionTimes, 
  allUsers, 
  AVAILABLE_AGE_GROUPS,
  isEditing
}: LocationFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 ml-1">Location Code</label>
            <input 
              required 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-brand-yellow outline-none transition-all font-medium"
              placeholder="e.g. LON-CENTRAL"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 ml-1">Full Address</label>
            <textarea 
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-brand-yellow outline-none transition-all font-medium min-h-[100px] resize-none"
              placeholder="e.g. 123 Basketball Street, London, SW1 1AA"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 ml-1">Head Coach</label>
            <select 
              value={headCoachId}
              onChange={(e) => setHeadCoachId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-brand-yellow outline-none transition-all font-medium appearance-none"
            >
              <option value="" className="bg-brand-navy text-white">Select a Head Coach</option>
              {allUsers.filter(u => u.role === "HEAD_COACH" || u.role === "ADMINISTRATOR" || u.role === "OWNER").map(u => (
                <option key={u.id} value={u.id} className="bg-brand-navy text-white">{u.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Ballers Tier Running?</label>
                <p className="text-[9px] text-white/30 font-medium">Controls whether Ballers age group runs at this location</p>
              </div>
              <button
                type="button"
                onClick={() => setHasBallers(!hasBallers)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                  hasBallers 
                    ? "bg-brand-yellow text-brand-navy border-brand-yellow font-black shadow-md shadow-brand-yellow/20" 
                    : "bg-white/5 border-white/10 text-white/40"
                )}
              >
                {hasBallers ? "Yes (Active)" : "No (Disabled)"}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 ml-1">Available Age Groups</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_AGE_GROUPS.map(ag => (
                <button
                  key={ag}
                  type="button"
                  onClick={() => {
                    if (selectedAgeGroups.includes(ag)) {
                      setSelectedAgeGroups(selectedAgeGroups.filter(g => g !== ag));
                    } else {
                      setSelectedAgeGroups([...selectedAgeGroups, ag]);
                    }
                  }}
                  className={cn(
                    "px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                    selectedAgeGroups.includes(ag)
                      ? "bg-brand-yellow/20 border-brand-yellow text-brand-yellow"
                      : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white"
                  )}
                >
                  {ag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 ml-1">Session Times (Selected Groups Only)</label>
          {AVAILABLE_AGE_GROUPS.filter(ag => selectedAgeGroups.includes(ag)).map(ag => (
            <div key={ag} className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-widest text-white/20 ml-1">{ag}</label>
              <input 
                type="text" 
                value={sessionTimes[ag]}
                onChange={(e) => setSessionTimes(prev => ({ ...prev, [ag]: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-yellow outline-none transition-all font-medium text-sm"
                placeholder="e.g. 17:00 - 17:30"
              />
            </div>
          ))}
          {selectedAgeGroups.length === 0 && (
            <div className="h-40 flex items-center justify-center border-2 border-dashed border-white/5 rounded-3xl text-white/20 text-[10px] font-black uppercase tracking-widest">
              Select age groups to set times
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button type="submit" className="flex-1 py-5 yellow-gradient text-brand-navy rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-brand-yellow/20">
          {isEditing ? "Save Changes" : "Register Location"}
        </button>
        <button 
          type="button" 
          onClick={onCancel}
          className="px-10 py-5 bg-white/5 hover:bg-white/10 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] transition-all"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
