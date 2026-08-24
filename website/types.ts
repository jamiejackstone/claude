
import React from 'react';

export enum DayOfWeek {
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WEDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday',
  SATURDAY = 'Saturday',
  SUNDAY = 'Sunday'
}

export interface Coach {
  name: string;
  role: string;
  bio: string;
  imageUrl: string;
  quote?: string; // New field for specific "Why I Coach" quotes
}

export interface ClassSession {
  id: string;
  day: DayOfWeek;
  time: string;
  ageGroup: string;
  venue: string;
  spotsAvailable: number;
}

export interface Review {
  author: string;
  rating: number; // 1-5
  text: string;
  relativeTime: string; // e.g., "2 weeks ago"
}

export interface LocationData {
  id: string;
  name: string; // e.g., "Bristol", "Manchester South"
  slug: string;
  address: string;
  coordinates: { lat: number; lng: number }; // Mock coordinates
  phone: string;
  email: string;
  headCoach: Coach;
  classes: ClassSession[];
  heroImage: string;
  gallery: string[];
  actionVideoUrl?: string; // New field for video embed
  bookingWidgetUrl?: string; // URL for the TeamUp widget iframe (filtered by venue)
  reviews?: Review[]; // Array of Google-style reviews
  locationNotes?: string; // Specific arrival instructions or location notes
  comingSoon?: boolean; // Flag for new locations opening in future
  comingSoonDate?: string; // Custom string for the "Coming" badge (e.g. "Coming May 2026")
  displayDays?: string; // Custom string for days classes are held
  newsTicker?: string; // Local class updates ticker text
  scheduleNotice?: string; // Custom notice for the Class Schedule section
  ghlTag?: string; // Specific tag for CRM integration (e.g. "Oxford Earlybird")
  startDate?: string; // Optional start date for the booking widget (YYYY-MM-DD)
  mapQueryOverride?: string; // Override query for map iframe
  googleMapsUrl?: string; // Custom Google Maps link for directions
  tempVenueNotice?: string; // Optional temporary venue change notice
}

export interface Feature {
  title: string;
  description: string;
  icon: React.FC<any>;
}
