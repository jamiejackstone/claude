import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "../api";
import { startOfWeek, endOfWeek, isWithinInterval, parseISO, addWeeks, isSameDay, isBefore, isAfter, addDays } from "date-fns";
import { TermDate, Holiday, ScheduleSettings } from "../types";
import { useAuth } from "./AuthContext";
import { SEASON_TERMS, SEASON_BREAKS, BANK_HOLIDAY_EXCEPTIONS, getSeasonWeek, isSeasonHoliday } from "../data/termDates";

interface ScheduleContextType {
  settings: ScheduleSettings;
  loading: boolean;
  updateSettings: (settings: ScheduleSettings) => Promise<void>;
  getCurrentTermAndWeek: (date: Date) => { term: string; week: number; isHolidayWeek: boolean; holidayName: string | null; bankHolidays: Holiday[]; seasonWeek?: number };
  getClassDate: (termName: string, weekNumber: number, locationName: string) => { date: Date | null; isHoliday: boolean; holidayName: string | null; isBankHoliday: boolean; bankHolidayName: string | null };
  getWeeksInTerm: (termName: string) => number;
}

const defaultSettings: ScheduleSettings = {
  terms: SEASON_TERMS.map((t, idx) => ({
    id: String(idx + 1),
    name: t.name,
    startDate: t.startDate,
    endDate: t.endDate
  })),
  holidays: [
    ...SEASON_BREAKS.map((b, idx) => ({
      id: `break-${idx + 1}`,
      name: b.name,
      startDate: b.startDate,
      endDate: b.endDate,
      type: "break" as const
    })),
    ...BANK_HOLIDAY_EXCEPTIONS.map((bh, idx) => ({
      id: `bh-${idx + 1}`,
      name: bh.name,
      startDate: bh.date,
      endDate: bh.date,
      type: "bank_holiday" as const
    }))
  ]
};

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

const getDayOfWeek = (locationName: string): number | null => {
  const upper = locationName.toUpperCase();
  if (upper.includes("-SUN")) return 0;
  if (upper.includes("-MON")) return 1;
  if (upper.includes("-TUE")) return 2;
  if (upper.includes("-WED")) return 3;
  if (upper.includes("-THU")) return 4;
  if (upper.includes("-FRI")) return 5;
  if (upper.includes("-SAT")) return 6;
  return null;
};

export const ScheduleProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ScheduleSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;
    api
      .get<ScheduleSettings | null>("/api/settings/schedule")
      .then((data) => {
        if (cancelled) return;
        if (data && (data.terms || data.holidays)) {
          setSettings({
            terms: data.terms || defaultSettings.terms,
            holidays: data.holidays || defaultSettings.holidays,
          });
        } else {
          setSettings(defaultSettings);
        }
      })
      .catch((err) => console.error("Schedule load failed:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const updateSettings = async (newSettings: ScheduleSettings) => {
    setSettings(newSettings);
    await api.put("/api/settings/schedule", newSettings);
  };

  const getClassDate = React.useCallback((termName: string, weekNumber: number, locationName: string) => {
    const term = settings.terms.find(t => t.name === termName);
    if (!term) return { date: null, isHoliday: false, holidayName: null, isBankHoliday: false, bankHolidayName: null };

    const dayOfWeek = getDayOfWeek(locationName);
    if (dayOfWeek === null) return { date: null, isHoliday: false, holidayName: null, isBankHoliday: false, bankHolidayName: null };

    const termStart = parseISO(term.startDate);
    let currentWeekStart = startOfWeek(termStart, { weekStartsOn: 0 }); // Sunday start
    
    let currentWeekNum = 0;
    
    while (currentWeekNum < weekNumber) {
      const isBreak = settings.holidays.some(h => 
        h.type === "break" && 
        !isBefore(currentWeekStart, parseISO(h.startDate)) && 
        !isAfter(currentWeekStart, parseISO(h.endDate))
      );

      if (!isBreak) {
        currentWeekNum++;
      }
      
      if (currentWeekNum < weekNumber) {
        currentWeekStart = addWeeks(currentWeekStart, 1);
      }
      
      if (isAfter(currentWeekStart, addWeeks(termStart, 52))) {
        break;
      }
    }

    // Since Sunday is day 0 and week starts on Sunday (weekStartsOn: 0), daysToAdd = dayOfWeek
    const daysToAdd = dayOfWeek;
    const classDate = addDays(currentWeekStart, daysToAdd);

    let isHoliday = false;
    let holidayName = null;
    let isBankHoliday = false;
    let bankHolidayName = null;

    const termBreak = settings.holidays.find(h => {
      if (h.type !== "break") return false;
      const start = parseISO(h.startDate);
      const end = parseISO(h.endDate);
      return !isBefore(classDate, start) && !isAfter(classDate, end);
    });

    if (termBreak) {
      isHoliday = true;
      holidayName = termBreak.name;
    }

    // Special bank holiday exception handling (e.g. Mon 3 May 2027: Aylesbury and Great Missenden only)
    const bankHoliday = settings.holidays.find(h => {
      if (h.type !== "bank_holiday") return false;
      const start = parseISO(h.startDate);
      const end = parseISO(h.endDate);
      return !isBefore(classDate, start) && !isAfter(classDate, end);
    });

    if (bankHoliday) {
      // Check if location is affected by Early May bank holiday exception
      if (bankHoliday.name.includes("Early May") || bankHoliday.startDate === "2027-05-03") {
        const isAffected = locationName.toLowerCase().includes("aylesbury") || locationName.toLowerCase().includes("great missenden");
        if (isAffected) {
          isBankHoliday = true;
          bankHolidayName = `${bankHoliday.name} (No session for ${locationName})`;
          isHoliday = true;
          holidayName = bankHoliday.name;
        }
      } else {
        isBankHoliday = true;
        bankHolidayName = bankHoliday.name;
      }
    }

    return { date: classDate, isHoliday, holidayName, isBankHoliday, bankHolidayName };
  }, [settings]);

  const getCurrentTermAndWeek = React.useCallback((date: Date) => {
    // Check with the official 2026/27 season helper
    const seasonRes = getSeasonWeek(date);

    if (isSeasonHoliday(seasonRes)) {
      return {
        term: seasonRes.resumeTerm,
        week: 1,
        seasonWeek: seasonRes.resumeSeasonWeek,
        isHolidayWeek: true,
        holidayName: seasonRes.holidayName,
        bankHolidays: []
      };
    }

    return {
      term: seasonRes.term,
      week: seasonRes.weekInTerm,
      seasonWeek: seasonRes.seasonWeek,
      isHolidayWeek: false,
      holidayName: null,
      bankHolidays: seasonRes.bankHolidayNotice ? [{
        id: "bh-may",
        name: seasonRes.bankHolidayNotice.name,
        startDate: seasonRes.bankHolidayNotice.date,
        endDate: seasonRes.bankHolidayNotice.date,
        type: "bank_holiday" as const
      }] : []
    };
  }, []);

  const getWeeksInTerm = React.useCallback((termName: string) => {
    const term = settings.terms.find(t => t.name.toLowerCase() === termName.toLowerCase());
    if (!term) return 14;

    const matchedSeasonTerm = SEASON_TERMS.find(t => t.name.toLowerCase() === termName.toLowerCase());
    if (matchedSeasonTerm) {
      return matchedSeasonTerm.sessionWeeks;
    }

    const termStart = parseISO(term.startDate);
    const termEnd = parseISO(term.endDate);
    let currentWeekStart = startOfWeek(termStart, { weekStartsOn: 0 });
    const targetWeekStart = startOfWeek(termEnd, { weekStartsOn: 0 });
    
    let weekCount = 0;

    while (!isAfter(currentWeekStart, targetWeekStart)) {
      const isHoliday = settings.holidays.some(h => 
        h.type === "break" && 
        !isBefore(currentWeekStart, parseISO(h.startDate)) && 
        !isAfter(currentWeekStart, parseISO(h.endDate))
      );

      if (!isHoliday) {
        weekCount++;
      }
      currentWeekStart = addWeeks(currentWeekStart, 1);
    }

    return weekCount === 0 ? 1 : weekCount;
  }, [settings]);

  return (
    <ScheduleContext.Provider value={{ settings, loading, updateSettings, getCurrentTermAndWeek, getClassDate, getWeeksInTerm }}>
      {children}
    </ScheduleContext.Provider>
  );
};

export const useSchedule = () => {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error("useSchedule must be used within a ScheduleProvider");
  }
  return context;
};

