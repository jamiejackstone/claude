import { startOfWeek, endOfWeek, parseISO, isSameDay, isBefore, isAfter, format } from "date-fns";
import { CORE_VALUES, CoreValue } from "./coreValues";

export interface TermDefinition {
  name: "Autumn" | "Spring" | "Summer";
  startDate: string;   // Sunday 'YYYY-MM-DD'
  endDate: string;     // Saturday 'YYYY-MM-DD'
  sessionWeeks: number;
  halfTerm: {
    name: string;
    startDate: string; // Sunday 'YYYY-MM-DD'
    endDate: string;   // Saturday 'YYYY-MM-DD'
    resumesDate: string; // Sunday 'YYYY-MM-DD'
  };
}

export interface BreakDefinition {
  name: string;
  startDate: string;   // Sunday 'YYYY-MM-DD'
  endDate: string;     // Saturday 'YYYY-MM-DD'
  resumesDate: string; // Sunday 'YYYY-MM-DD'
  resumeSeasonWeek?: number;
  resumeTerm?: "Autumn" | "Spring" | "Summer";
}

export interface BankHolidayException {
  date: string;
  name: string;
  affectedLocations: string[];
  note: string;
}

export interface SeasonWeekInfo {
  seasonWeek: number;       // 1–39 continuous
  term: "Autumn" | "Spring" | "Summer";
  weekInTerm: number;       // 1–14 (Autumn), 1–11 (Spring), 1–14 (Summer)
  totalWeeksInTerm: number; // 14, 11, or 14
  startDate: string;        // Sunday 'YYYY-MM-DD'
  endDate: string;          // Saturday 'YYYY-MM-DD'
  coreValuePosition: number;// 1–13 position in rolling cycle
  coreValue: CoreValue;     // Resolved Core Value
  bankHolidayException?: BankHolidayException;
}

export interface ActiveSeasonWeekResult {
  isHoliday: false;
  seasonWeek: number;       // 1–39
  term: "Autumn" | "Spring" | "Summer";
  weekInTerm: number;       // e.g. 1 of 14
  totalWeeksInTerm: number; // 14, 11, or 14
  weekStartDate: Date;      // Sunday
  weekEndDate: Date;        // Saturday
  coreValue: CoreValue;
  bankHolidayNotice?: BankHolidayException;
}

export interface HolidaySeasonWeekResult {
  isHoliday: true;
  holidayName: string;
  resumeDate: Date;
  resumeSeasonWeek: number;
  resumeTerm: "Autumn" | "Spring" | "Summer";
  weekStartDate: Date;
  weekEndDate: Date;
}

export type SeasonWeekResult = ActiveSeasonWeekResult | HolidaySeasonWeekResult;

export function isSeasonHoliday(result: SeasonWeekResult): result is HolidaySeasonWeekResult {
  return result.isHoliday === true;
}

// ==========================================
// 2026/27 SEASON CALENDAR - SINGLE SOURCE OF TRUTH
// ==========================================
export const SEASON_TERMS: TermDefinition[] = [
  {
    name: "Autumn",
    startDate: "2026-09-06",
    endDate: "2026-12-19",
    sessionWeeks: 14,
    halfTerm: {
      name: "Autumn Half Term",
      startDate: "2026-10-25",
      endDate: "2026-10-31",
      resumesDate: "2026-11-01"
    }
  },
  {
    name: "Spring",
    startDate: "2027-01-03",
    endDate: "2027-03-27",
    sessionWeeks: 11,
    halfTerm: {
      name: "Spring Half Term",
      startDate: "2027-02-14",
      endDate: "2027-02-20",
      resumesDate: "2027-02-21"
    }
  },
  {
    name: "Summer",
    startDate: "2027-04-11",
    endDate: "2027-07-24",
    sessionWeeks: 14,
    halfTerm: {
      name: "Summer Half Term",
      startDate: "2027-05-30",
      endDate: "2027-06-05",
      resumesDate: "2027-06-06"
    }
  }
];

export const SEASON_BREAKS: BreakDefinition[] = [
  {
    name: "Autumn Half Term",
    startDate: "2026-10-25",
    endDate: "2026-10-31",
    resumesDate: "2026-11-01",
    resumeSeasonWeek: 8,
    resumeTerm: "Autumn"
  },
  {
    name: "Christmas Holidays",
    startDate: "2026-12-20",
    endDate: "2027-01-02",
    resumesDate: "2027-01-03",
    resumeSeasonWeek: 15,
    resumeTerm: "Spring"
  },
  {
    name: "Spring Half Term",
    startDate: "2027-02-14",
    endDate: "2027-02-20",
    resumesDate: "2027-02-21",
    resumeSeasonWeek: 21,
    resumeTerm: "Spring"
  },
  {
    name: "Easter Holidays",
    startDate: "2027-03-28",
    endDate: "2027-04-10",
    resumesDate: "2027-04-11",
    resumeSeasonWeek: 26,
    resumeTerm: "Summer"
  },
  {
    name: "Summer Half Term",
    startDate: "2027-05-30",
    endDate: "2027-06-05",
    resumesDate: "2027-06-06",
    resumeSeasonWeek: 33,
    resumeTerm: "Summer"
  }
];

export const BANK_HOLIDAY_EXCEPTIONS: BankHolidayException[] = [
  {
    date: "2027-05-03",
    name: "Early May Bank Holiday",
    affectedLocations: ["Aylesbury", "Great Missenden"],
    note: "Aylesbury and Great Missenden only have no session this week; all other locations run, and the week still counts as a normal season week."
  }
];

/**
 * Formula: valueNumber = ((seasonWeekIndex - 1) % 13) + 1
 * Resolves the 1-based CoreValue from 1 to 13.
 */
export function getCoreValueForSeasonWeek(seasonWeek: number): CoreValue {
  const valueNumber = ((seasonWeek - 1) % 13) + 1;
  const found = CORE_VALUES.find(cv => cv.week === valueNumber);
  return found || CORE_VALUES[0];
}

// Generate the 39 continuous session weeks
function buildSeasonWeeks(): SeasonWeekInfo[] {
  const rawWeeks: Omit<SeasonWeekInfo, "coreValuePosition" | "coreValue">[] = [
    // --- AUTUMN TERM (14 session weeks) ---
    { seasonWeek: 1,  term: "Autumn", weekInTerm: 1,  totalWeeksInTerm: 14, startDate: "2026-09-06", endDate: "2026-09-12" },
    { seasonWeek: 2,  term: "Autumn", weekInTerm: 2,  totalWeeksInTerm: 14, startDate: "2026-09-13", endDate: "2026-09-19" },
    { seasonWeek: 3,  term: "Autumn", weekInTerm: 3,  totalWeeksInTerm: 14, startDate: "2026-09-20", endDate: "2026-09-26" },
    { seasonWeek: 4,  term: "Autumn", weekInTerm: 4,  totalWeeksInTerm: 14, startDate: "2026-09-27", endDate: "2026-10-03" },
    { seasonWeek: 5,  term: "Autumn", weekInTerm: 5,  totalWeeksInTerm: 14, startDate: "2026-10-04", endDate: "2026-10-10" },
    { seasonWeek: 6,  term: "Autumn", weekInTerm: 6,  totalWeeksInTerm: 14, startDate: "2026-10-11", endDate: "2026-10-17" },
    { seasonWeek: 7,  term: "Autumn", weekInTerm: 7,  totalWeeksInTerm: 14, startDate: "2026-10-18", endDate: "2026-10-24" },
    // (Autumn Half Term: 2026-10-25 to 2026-10-31)
    { seasonWeek: 8,  term: "Autumn", weekInTerm: 8,  totalWeeksInTerm: 14, startDate: "2026-11-01", endDate: "2026-11-07" },
    { seasonWeek: 9,  term: "Autumn", weekInTerm: 9,  totalWeeksInTerm: 14, startDate: "2026-11-08", endDate: "2026-11-14" },
    { seasonWeek: 10, term: "Autumn", weekInTerm: 10, totalWeeksInTerm: 14, startDate: "2026-11-15", endDate: "2026-11-21" },
    { seasonWeek: 11, term: "Autumn", weekInTerm: 11, totalWeeksInTerm: 14, startDate: "2026-11-22", endDate: "2026-11-28" },
    { seasonWeek: 12, term: "Autumn", weekInTerm: 12, totalWeeksInTerm: 14, startDate: "2026-11-29", endDate: "2026-12-05" },
    { seasonWeek: 13, term: "Autumn", weekInTerm: 13, totalWeeksInTerm: 14, startDate: "2026-12-06", endDate: "2026-12-12" },
    { seasonWeek: 14, term: "Autumn", weekInTerm: 14, totalWeeksInTerm: 14, startDate: "2026-12-13", endDate: "2026-12-19" },

    // --- SPRING TERM (11 session weeks) ---
    { seasonWeek: 15, term: "Spring", weekInTerm: 1,  totalWeeksInTerm: 11, startDate: "2027-01-03", endDate: "2027-01-09" },
    { seasonWeek: 16, term: "Spring", weekInTerm: 2,  totalWeeksInTerm: 11, startDate: "2027-01-10", endDate: "2027-01-16" },
    { seasonWeek: 17, term: "Spring", weekInTerm: 3,  totalWeeksInTerm: 11, startDate: "2027-01-17", endDate: "2027-01-23" },
    { seasonWeek: 18, term: "Spring", weekInTerm: 4,  totalWeeksInTerm: 11, startDate: "2027-01-24", endDate: "2027-01-30" },
    { seasonWeek: 19, term: "Spring", weekInTerm: 5,  totalWeeksInTerm: 11, startDate: "2027-01-31", endDate: "2027-02-06" },
    { seasonWeek: 20, term: "Spring", weekInTerm: 6,  totalWeeksInTerm: 11, startDate: "2027-02-07", endDate: "2027-02-13" },
    // (Spring Half Term: 2027-02-14 to 2027-02-20)
    { seasonWeek: 21, term: "Spring", weekInTerm: 7,  totalWeeksInTerm: 11, startDate: "2027-02-21", endDate: "2027-02-27" },
    { seasonWeek: 22, term: "Spring", weekInTerm: 8,  totalWeeksInTerm: 11, startDate: "2027-02-28", endDate: "2027-03-06" },
    { seasonWeek: 23, term: "Spring", weekInTerm: 9,  totalWeeksInTerm: 11, startDate: "2027-03-07", endDate: "2027-03-13" },
    { seasonWeek: 24, term: "Spring", weekInTerm: 10, totalWeeksInTerm: 11, startDate: "2027-03-14", endDate: "2027-03-20" },
    { seasonWeek: 25, term: "Spring", weekInTerm: 11, totalWeeksInTerm: 11, startDate: "2027-03-21", endDate: "2027-03-27" },

    // --- SUMMER TERM (14 session weeks) ---
    { seasonWeek: 26, term: "Summer", weekInTerm: 1,  totalWeeksInTerm: 14, startDate: "2027-04-11", endDate: "2027-04-17" },
    { seasonWeek: 27, term: "Summer", weekInTerm: 2,  totalWeeksInTerm: 14, startDate: "2027-04-18", endDate: "2027-04-24" },
    { seasonWeek: 28, term: "Summer", weekInTerm: 3,  totalWeeksInTerm: 14, startDate: "2027-04-25", endDate: "2027-05-01" },
    { 
      seasonWeek: 29, 
      term: "Summer", 
      weekInTerm: 4,  
      totalWeeksInTerm: 14, 
      startDate: "2027-05-02", 
      endDate: "2027-05-08",
      bankHolidayException: BANK_HOLIDAY_EXCEPTIONS[0]
    },
    { seasonWeek: 30, term: "Summer", weekInTerm: 5,  totalWeeksInTerm: 14, startDate: "2027-05-09", endDate: "2027-05-15" },
    { seasonWeek: 31, term: "Summer", weekInTerm: 6,  totalWeeksInTerm: 14, startDate: "2027-05-16", endDate: "2027-05-22" },
    { seasonWeek: 32, term: "Summer", weekInTerm: 7,  totalWeeksInTerm: 14, startDate: "2027-05-23", endDate: "2027-05-29" },
    // (Summer Half Term: 2027-05-30 to 2027-06-05)
    { seasonWeek: 33, term: "Summer", weekInTerm: 8,  totalWeeksInTerm: 14, startDate: "2027-06-06", endDate: "2027-06-12" },
    { seasonWeek: 34, term: "Summer", weekInTerm: 9,  totalWeeksInTerm: 14, startDate: "2027-06-13", endDate: "2027-06-19" },
    { seasonWeek: 35, term: "Summer", weekInTerm: 10, totalWeeksInTerm: 14, startDate: "2027-06-20", endDate: "2027-06-26" },
    { seasonWeek: 36, term: "Summer", weekInTerm: 11, totalWeeksInTerm: 14, startDate: "2027-06-27", endDate: "2027-07-03" },
    { seasonWeek: 37, term: "Summer", weekInTerm: 12, totalWeeksInTerm: 14, startDate: "2027-07-04", endDate: "2027-07-10" },
    { seasonWeek: 38, term: "Summer", weekInTerm: 13, totalWeeksInTerm: 14, startDate: "2027-07-11", endDate: "2027-07-17" },
    { seasonWeek: 39, term: "Summer", weekInTerm: 14, totalWeeksInTerm: 14, startDate: "2027-07-18", endDate: "2027-07-24" },
  ];

  return rawWeeks.map(w => {
    const coreValuePosition = ((w.seasonWeek - 1) % 13) + 1;
    const coreValue = getCoreValueForSeasonWeek(w.seasonWeek);
    return {
      ...w,
      coreValuePosition,
      coreValue
    };
  });
}

export const SEASON_WEEKS: SeasonWeekInfo[] = buildSeasonWeeks();

/**
 * Normalizes input date to local midday to avoid timezone / DST shifts.
 */
function normalizeDate(dateInput: Date | string): Date {
  if (typeof dateInput === "string") {
    // If format is YYYY-MM-DD
    const parts = dateInput.split("-").map(p => parseInt(p, 10));
    if (parts.length === 3) {
      return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    }
    const d = parseISO(dateInput);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
  }
  return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 12, 0, 0);
}

/**
 * Returns the season week number (1–39), term, week-within-term,
 * or a "holiday" state with break name and resume date.
 * Season weeks run Sunday to Saturday (weekStartsOn: 0).
 */
export function getSeasonWeek(dateInput: Date | string): SeasonWeekResult {
  const date = normalizeDate(dateInput);
  const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(date, { weekStartsOn: 0 });     // Saturday

  const dateStr = format(date, "yyyy-MM-dd");
  const weekStartStr = format(weekStart, "yyyy-MM-dd");

  // Pre-season check (before Sun 6 Sep 2026)
  if (isBefore(weekStart, parseISO("2026-09-06"))) {
    return {
      isHoliday: true,
      holidayName: "Summer Break (Pre-Season)",
      resumeDate: parseISO("2026-09-06"),
      resumeSeasonWeek: 1,
      resumeTerm: "Autumn",
      weekStartDate: weekStart,
      weekEndDate: weekEnd
    };
  }

  // Check scheduled breaks
  for (const b of SEASON_BREAKS) {
    const bStart = parseISO(b.startDate);
    const bEnd = parseISO(b.endDate);
    
    // Check if the current week's Sunday falls within the break
    if (!isBefore(weekStart, bStart) && !isAfter(weekStart, bEnd)) {
      return {
        isHoliday: true,
        holidayName: b.name,
        resumeDate: parseISO(b.resumesDate),
        resumeSeasonWeek: b.resumeSeasonWeek || 1,
        resumeTerm: b.resumeTerm || "Autumn",
        weekStartDate: weekStart,
        weekEndDate: weekEnd
      };
    }
  }

  // Post-season check (after Sat 24 Jul 2027)
  if (isAfter(weekStart, parseISO("2027-07-24"))) {
    return {
      isHoliday: true,
      holidayName: "Summer Holidays (Season Complete)",
      resumeDate: parseISO("2027-09-05"), // Next season
      resumeSeasonWeek: 1,
      resumeTerm: "Autumn",
      weekStartDate: weekStart,
      weekEndDate: weekEnd
    };
  }

  // Match against one of the 39 session weeks
  const matched = SEASON_WEEKS.find(w => {
    return w.startDate === weekStartStr;
  });

  if (matched) {
    return {
      isHoliday: false,
      seasonWeek: matched.seasonWeek,
      term: matched.term,
      weekInTerm: matched.weekInTerm,
      totalWeeksInTerm: matched.totalWeeksInTerm,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      coreValue: matched.coreValue,
      bankHolidayNotice: matched.bankHolidayException
    };
  }

  // Fallback if boundary edge
  const defaultWeek = SEASON_WEEKS[0];
  return {
    isHoliday: false,
    seasonWeek: defaultWeek.seasonWeek,
    term: defaultWeek.term,
    weekInTerm: defaultWeek.weekInTerm,
    totalWeeksInTerm: defaultWeek.totalWeeksInTerm,
    weekStartDate: weekStart,
    weekEndDate: weekEnd,
    coreValue: defaultWeek.coreValue
  };
}

/**
 * Resolves the Core Value for any given date.
 * Returns null if the date falls in a holiday or break.
 */
export function getCoreValueForDate(dateInput: Date | string): CoreValue | null {
  const result = getSeasonWeek(dateInput);
  if (isSeasonHoliday(result)) {
    return null;
  }
  return result.coreValue;
}

/**
 * Resolves a specific term and week-in-term to its season week info.
 */
export function getSeasonWeekByTermAndWeek(term: string, weekInTerm: number): SeasonWeekInfo | undefined {
  return SEASON_WEEKS.find(w => w.term.toLowerCase() === term.toLowerCase() && w.weekInTerm === weekInTerm);
}
