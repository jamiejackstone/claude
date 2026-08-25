import { CORE_VALUES, CoreValue } from "./data/coreValues";
import { LOCATIONS_CONFIG, LocationConfig, AGE_GROUPS_CONFIG, AgeGroupConfig } from "./data/locations";

export { CORE_VALUES, LOCATIONS_CONFIG, AGE_GROUPS_CONFIG };
export type { CoreValue, LocationConfig, AgeGroupConfig };

export type AgeGroup = "Rookies" | "Rising Stars" | "Ballers" | "Rookies & Rising Stars (Combined)" | "Pros & All Stars (Combined)";
export type DrillType = "Warm-up" | "Skill" | "Game" | "Fun";

export interface Location {
  id: string;
  name: string;
  code?: string;
  location?: string;
  venue?: string;
  address?: string;
  day?: "Mon" | "Tue" | "Sat" | "Sun" | string;
  dayFullName?: string;
  time?: string;
  hasBallers?: boolean;
  ageGroups: string[];
  headCoachId?: string;
  headCoachName?: string;
  sessionTimes?: Record<string, string>;
}

export interface DrillHistory {
  term: string;
  week: number;
  ageGroup: string;
}

export interface DrillComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  rating: number;
  timestamp: string;
  isRead: boolean;
}

export interface TermDate {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface Holiday {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  type: "break" | "bank_holiday";
}

export interface ScheduleSettings {
  terms: TermDate[];
  holidays: Holiday[];
}

export interface Drill {
  id: string;
  name: string;
  types: DrillType[];
  ageGroups: AgeGroup[];
  summary: string;
  focus: string;
  video: string;
  easy: string;
  expert: string;
  coachCues: string;
  rating: number;
  votes: number;
  ratedBy?: string[];
  history?: DrillHistory[];
  comments?: DrillComment[];
  createdAt?: string;
}

export interface Kid {
  id: string;
  name: string;
  dob: string;
  joinDate: string;
  parentName: string;
  parentFirstName?: string;
  parentEmail?: string;
  emergencyContact: string;
  medicalNotes: string;
  membershipType: 'Monthly' | 'Termly' | 'Taster';
  totalAttendances: number;
  lastAttendances: boolean[];
  isFirstSession: boolean;
  ageGroup: AgeGroup;
  location: string;
  photoUrl?: string;
}

export type Role = "OWNER" | "ADMINISTRATOR" | "HEAD_COACH" | "ASSISTANT_COACH";

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role: Role;
  locations: string[];
  hourlyRate?: number;
}

export interface CoachProfileResult {
  userId: string;
  userName: string;
  timestamp: string;
  scores: {
    presence: number;
    growth: number;
    emotional: number;
    relationship: number;
    ubuntu: number;
    mission: number;
    situational: number;
  };
  responses: Record<string, number | string>;
}
