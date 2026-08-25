export interface LocationConfig {
  id: string;
  code: string;
  name: string;
  location: string;
  venue: string;
  address: string;
  day: "Mon" | "Tue" | "Sat" | "Sun";
  dayFullName: "Monday" | "Tuesday" | "Saturday" | "Sunday";
  time: string;
  hasBallers: boolean;
  ageGroups: string[];
  sessionTimes: {
    "Rookies": string;
    "Rising Stars": string;
    "Ballers"?: string;
  };
  headCoachId?: string;
  headCoachName?: string;
}

export interface AgeGroupConfig {
  name: "Rookies" | "Rising Stars" | "Ballers";
  range: string;
  ageSpan: string;
  length: string;
  durationMinutes: number;
  order: number;
}

export const AGE_GROUPS_CONFIG: AgeGroupConfig[] = [
  { 
    name: "Rookies", 
    range: "5-7 Years", 
    ageSpan: "ages 5–7", 
    length: "30 Min", 
    durationMinutes: 30, 
    order: 1 
  },
  { 
    name: "Rising Stars", 
    range: "8-11 Years", 
    ageSpan: "ages 8–11", 
    length: "45 Min", 
    durationMinutes: 45, 
    order: 2 
  },
  { 
    name: "Ballers", 
    range: "12-15 Years", 
    ageSpan: "ages 12–15", 
    length: "45 Min", 
    durationMinutes: 45, 
    order: 3 
  }
];

export const LOCATIONS_CONFIG: LocationConfig[] = [
  {
    id: "AYL-MON",
    code: "AYL-MON",
    name: "AYL-MON",
    location: "Aylesbury",
    venue: "The Mandeville School, HP21 8ES",
    address: "The Mandeville School, HP21 8ES",
    day: "Mon",
    dayFullName: "Monday",
    time: "17:30–18:45",
    hasBallers: false,
    ageGroups: ["Rookies", "Rising Stars", "Ballers"],
    sessionTimes: {
      "Rookies": "17:30–18:00",
      "Rising Stars": "18:00–18:45"
    }
  },
  {
    id: "GM-MON",
    code: "GM-MON",
    name: "GM-MON",
    location: "Great Missenden",
    venue: "The Misbourne School, HP16 0BN",
    address: "The Misbourne School, HP16 0BN",
    day: "Mon",
    dayFullName: "Monday",
    time: "17:30–18:45",
    hasBallers: false,
    ageGroups: ["Rookies", "Rising Stars", "Ballers"],
    sessionTimes: {
      "Rookies": "17:30–18:00",
      "Rising Stars": "18:00–18:45"
    }
  },
  {
    id: "HG-TUE",
    code: "HG-TUE",
    name: "HG-TUE",
    location: "Holmer Green",
    venue: "Holmer Green Senior School, HP15 6SP",
    address: "Holmer Green Senior School, HP15 6SP",
    day: "Tue",
    dayFullName: "Tuesday",
    time: "17:00–19:00",
    hasBallers: true,
    ageGroups: ["Rookies", "Rising Stars", "Ballers"],
    sessionTimes: {
      "Rookies": "17:00–17:30",
      "Rising Stars": "17:30–18:15",
      "Ballers": "18:15–19:00"
    }
  },
  {
    id: "BIC-SAT",
    code: "BIC-SAT",
    name: "BIC-SAT",
    location: "Bicester",
    venue: "Whitelands Academy, OX26 1AY",
    address: "Whitelands Academy, OX26 1AY",
    day: "Sat",
    dayFullName: "Saturday",
    time: "11:30–13:30",
    hasBallers: true,
    ageGroups: ["Rookies", "Rising Stars", "Ballers"],
    sessionTimes: {
      "Rookies": "11:30–12:00",
      "Rising Stars": "12:00–12:45",
      "Ballers": "12:45–13:30"
    }
  },
  {
    id: "WEN-SUN",
    code: "WEN-SUN",
    name: "WEN-SUN",
    location: "Wendover",
    venue: "John Colet School, HP22 6HF",
    address: "John Colet School, HP22 6HF",
    day: "Sun",
    dayFullName: "Sunday",
    time: "09:00–11:00",
    hasBallers: true,
    ageGroups: ["Rookies", "Rising Stars", "Ballers"],
    sessionTimes: {
      "Rookies": "09:00–09:30",
      "Rising Stars": "09:30–10:15",
      "Ballers": "10:15–11:00"
    }
  },
  {
    id: "OXF-SUN",
    code: "OXF-SUN",
    name: "OXF-SUN",
    location: "Oxford",
    venue: "The Oxford Academy, OX4 6JZ",
    address: "The Oxford Academy, OX4 6JZ",
    day: "Sun",
    dayFullName: "Sunday",
    time: "09:30–11:30",
    hasBallers: true,
    ageGroups: ["Rookies", "Rising Stars", "Ballers"],
    sessionTimes: {
      "Rookies": "09:30–10:00",
      "Rising Stars": "10:00–10:45",
      "Ballers": "10:45–11:30"
    }
  },
  {
    id: "MAR-SUN",
    code: "MAR-SUN",
    name: "MAR-SUN",
    location: "Marlow",
    venue: "Redgrave Sports Centre, SL7 1JE",
    address: "Redgrave Sports Centre, SL7 1JE",
    day: "Sun",
    dayFullName: "Sunday",
    time: "10:00–12:00",
    hasBallers: true,
    ageGroups: ["Rookies", "Rising Stars", "Ballers"],
    sessionTimes: {
      "Rookies": "10:00–10:30",
      "Rising Stars": "10:30–11:15",
      "Ballers": "11:15–12:00"
    }
  },
  {
    id: "SAN-SUN",
    code: "SAN-SUN",
    name: "SAN-SUN",
    location: "Sandhurst",
    venue: "Sandhurst School, GU47 0SD",
    address: "Sandhurst School, GU47 0SD",
    day: "Sun",
    dayFullName: "Sunday",
    time: "15:00–17:00",
    hasBallers: true,
    ageGroups: ["Rookies", "Rising Stars", "Ballers"],
    sessionTimes: {
      "Rookies": "15:00–15:30",
      "Rising Stars": "15:30–16:15",
      "Ballers": "16:15–17:00"
    }
  },
  {
    id: "TRI-SUN",
    code: "TRI-SUN",
    name: "TRI-SUN",
    location: "Tring",
    venue: "Tring Sports Centre, HP23 5JU",
    address: "Tring Sports Centre, HP23 5JU",
    day: "Sun",
    dayFullName: "Sunday",
    time: "16:00–18:00",
    hasBallers: true,
    ageGroups: ["Rookies", "Rising Stars", "Ballers"],
    sessionTimes: {
      "Rookies": "16:00–16:30",
      "Rising Stars": "16:30–17:15",
      "Ballers": "17:15–18:00"
    }
  }
];

export function getLocationByCode(code: string): LocationConfig | undefined {
  if (!code) return undefined;
  const clean = code.trim().toUpperCase();
  return LOCATIONS_CONFIG.find(loc => 
    loc.code.toUpperCase() === clean || 
    loc.name.toUpperCase() === clean || 
    loc.id.toUpperCase() === clean ||
    loc.location.toUpperCase() === clean
  );
}

export function getLocationByName(name: string): LocationConfig | undefined {
  if (!name) return undefined;
  const clean = name.trim().toLowerCase();
  return LOCATIONS_CONFIG.find(loc => 
    loc.location.toLowerCase() === clean || 
    loc.name.toLowerCase() === clean ||
    loc.code.toLowerCase() === clean
  );
}
