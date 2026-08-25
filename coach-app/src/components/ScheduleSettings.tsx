import React, { useState } from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { Calendar, Plus, Trash2, Save } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { ScheduleSettings as ScheduleSettingsType, TermDate, Holiday } from '../types';

export default function ScheduleSettings() {
  const { settings, loading, updateSettings } = useSchedule();
  const [localSettings, setLocalSettings] = useState<ScheduleSettingsType>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Sync local settings when context settings update (e.g. after Firestore data loads)
  React.useEffect(() => {
    if (!loading) {
      setLocalSettings(settings);
    }
  }, [settings, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow"></div>
      </div>
    );
  }

  const handleTermChange = (id: string, field: 'startDate' | 'endDate', value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      terms: prev.terms.map(t => t.id === id ? { ...t, [field]: value } : t)
    }));
  };

  const addHoliday = () => {
    setLocalSettings(prev => ({
      ...prev,
      holidays: [
        ...prev.holidays,
        { id: Math.random().toString(36).substr(2, 9), name: '', startDate: '', endDate: '', type: 'break' }
      ]
    }));
  };

  const updateHoliday = (id: string, field: 'name' | 'startDate' | 'endDate', value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      holidays: prev.holidays.map(h => h.id === id ? { ...h, [field]: value } : h)
    }));
  };

  const removeHoliday = (id: string) => {
    setLocalSettings(prev => ({
      ...prev,
      holidays: prev.holidays.filter(h => h.id !== id)
    }));
  };

  const addBankHoliday = () => {
    setLocalSettings(prev => ({
      ...prev,
      holidays: [
        ...prev.holidays,
        { id: Math.random().toString(36).substr(2, 9), name: '', startDate: '', endDate: '', type: 'bank_holiday' }
      ]
    }));
  };

  const updateBankHoliday = (id: string, field: 'name' | 'startDate', value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      holidays: prev.holidays.map(h => h.id === id ? { ...h, [field]: value, endDate: field === 'startDate' ? value : h.endDate } : h)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      await updateSettings(localSettings);
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save schedule settings:', error);
      setSaveMessage('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const breaks = localSettings.holidays.filter(h => h.type === 'break');
  const bankHolidays = localSettings.holidays.filter(h => h.type === 'bank_holiday');

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-display text-2xl tracking-wider text-brand-yellow">Term Dates</h2>
          <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Set the start and end dates for each term</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-brand-yellow text-brand-navy rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-yellow/20 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
        >
          <Save size={16} />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {saveMessage && (
        <div className={cn(
          "p-4 rounded-xl text-sm font-bold",
          saveMessage.includes('Failed') ? "bg-red-500/20 text-red-500" : "bg-green-500/20 text-green-500"
        )}>
          {saveMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {localSettings.terms.map(term => (
          <div key={term.id} className="glass-card p-6 space-y-4 border border-white/5">
            <h3 className="font-display text-xl tracking-wider text-white">{term.name} Term</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Start Date</label>
                <input
                  type="date"
                  value={term.startDate}
                  onChange={e => handleTermChange(term.id, 'startDate', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-yellow outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">End Date</label>
                <input
                  type="date"
                  value={term.endDate}
                  onChange={e => handleTermChange(term.id, 'endDate', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-yellow outline-none transition-all text-sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-8 border-t border-white/10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="font-display text-2xl tracking-wider text-brand-yellow">Holidays (Term Breaks)</h2>
            <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Weeks with no sessions. Week numbers pause during these breaks.</p>
          </div>
          <button
            onClick={addHoliday}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-white/20 transition-all"
          >
            <Plus size={14} />
            Add Holiday
          </button>
        </div>

        <div className="space-y-4">
          {breaks.length === 0 ? (
            <p className="text-sm text-white/40 italic">No holidays configured.</p>
          ) : (
            breaks.map(holiday => (
              <div key={holiday.id} className="flex flex-col md:flex-row gap-4 items-start md:items-end glass-card p-4 border border-white/5">
                <div className="flex-1 w-full">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Holiday Name</label>
                  <input
                    type="text"
                    value={holiday.name}
                    onChange={e => updateHoliday(holiday.id, 'name', e.target.value)}
                    placeholder="e.g., Half Term"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-yellow outline-none transition-all text-sm"
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={holiday.startDate}
                    onChange={e => updateHoliday(holiday.id, 'startDate', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-yellow outline-none transition-all text-sm"
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">End Date</label>
                  <input
                    type="date"
                    value={holiday.endDate}
                    onChange={e => updateHoliday(holiday.id, 'endDate', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-yellow outline-none transition-all text-sm"
                  />
                </div>
                <button
                  onClick={() => removeHoliday(holiday.id)}
                  className="p-2.5 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                  title="Remove Holiday"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="pt-8 border-t border-white/10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="font-display text-2xl tracking-wider text-brand-yellow">Bank Holidays</h2>
            <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Single days off. Week numbers continue normally.</p>
          </div>
          <button
            onClick={addBankHoliday}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-white/20 transition-all"
          >
            <Plus size={14} />
            Add Bank Holiday
          </button>
        </div>

        <div className="space-y-4">
          {bankHolidays.length === 0 ? (
            <p className="text-sm text-white/40 italic">No bank holidays configured.</p>
          ) : (
            bankHolidays.map(holiday => (
              <div key={holiday.id} className="flex flex-col md:flex-row gap-4 items-start md:items-end glass-card p-4 border border-white/5">
                <div className="flex-1 w-full">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Holiday Name</label>
                  <input
                    type="text"
                    value={holiday.name}
                    onChange={e => updateBankHoliday(holiday.id, 'name', e.target.value)}
                    placeholder="e.g., May Day"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-yellow outline-none transition-all text-sm"
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Date</label>
                  <input
                    type="date"
                    value={holiday.startDate}
                    onChange={e => updateBankHoliday(holiday.id, 'startDate', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-yellow outline-none transition-all text-sm"
                  />
                </div>
                <button
                  onClick={() => removeHoliday(holiday.id)}
                  className="p-2.5 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                  title="Remove Bank Holiday"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
