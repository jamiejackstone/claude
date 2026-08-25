import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { api, seg } from "../api";

export interface Activity {
  id: string;
  segment: string;
  name: string;
  time: string;
  drill?: {
    summary: string;
    focus: string;
    video?: string;
    easy: string;
    expert: string;
    coachCues: string;
  };
  huddle?: {
    coreValue: string;
    quote: string;
  };
}

export interface SessionPlan {
  id: string;
  term: string;
  week: number;
  ageGroup: string;
  ageRange: string;
  length: string;
  activities: Activity[];
  locationId?: string;
}

interface SessionPlanContextType {
  sessionPlans: SessionPlan[];
  addSessionPlans: (plans: SessionPlan[]) => void;
  updateSessionPlan: (id: string, updatedPlan: SessionPlan, activeLocation?: string) => void;
  deleteSessionPlan: (id: string) => void;
  isLoading: boolean;
  ratings: Record<string, number>;
  setRatings: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  rateDrill: (drillName: string, locationId: string, rating: number) => Promise<void>;
}

const SessionPlanContext = createContext<SessionPlanContextType | undefined>(undefined);

export function SessionPlanProvider({ children }: { children: ReactNode }) {
  const [sessionPlans, setSessionPlans] = useState<SessionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const { user } = useAuth();

  const loadPlans = React.useCallback(async () => {
    try {
      const plans = await api.get<SessionPlan[]>("/api/session-plans");
      setSessionPlans(plans);
    } catch (error) {
      console.error("Session plan load failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadRatings = React.useCallback(async () => {
    try {
      const rows = await api.get<{ drillName: string; locationId: string; rating: number }[]>("/api/drill-ratings");
      const map: Record<string, number> = {};
      for (const r of rows) map[`${r.drillName}_${r.locationId}`] = r.rating;
      setRatings(map);
    } catch (error) {
      console.error("Ratings load failed:", error);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setSessionPlans([]);
      setRatings({});
      setIsLoading(false);
      return;
    }
    loadPlans();
    loadRatings();
  }, [user, loadPlans, loadRatings]);

  const addSessionPlans = async (plans: SessionPlan[]) => {
    setSessionPlans((prev) => {
      const byId = new Map(prev.map((p) => [p.id, p]));
      for (const p of plans) byId.set(p.id, p);
      return Array.from(byId.values());
    });
    try {
      await api.put("/api/session-plans", plans);
    } catch (error) {
      console.error("Add session plans failed:", error);
      loadPlans();
    }
  };

  const updateSessionPlan = async (id: string, updatedPlan: SessionPlan, activeLocation?: string) => {
    try {
      if (activeLocation && activeLocation !== "ALL LOCATIONS") {
        const docId =
          updatedPlan.locationId === activeLocation
            ? id
            : `${updatedPlan.term}-w${updatedPlan.week}-${updatedPlan.ageGroup.replace(/\s+/g, "")}-${activeLocation.replace(/\s+/g, "-")}`;

        const finalPlan: SessionPlan = { ...updatedPlan, id: docId, locationId: activeLocation };

        setSessionPlans((prev) => {
          const index = prev.findIndex(
            (p) =>
              p.id === docId ||
              (p.term === finalPlan.term && p.week === finalPlan.week && p.ageGroup === finalPlan.ageGroup && p.locationId === activeLocation),
          );
          if (index !== -1) {
            const next = [...prev];
            next[index] = finalPlan;
            return next;
          }
          return [...prev, finalPlan];
        });

        await api.put(`/api/session-plans/${seg(docId)}`, finalPlan);
      } else {
        const finalPlan: SessionPlan = { ...updatedPlan, id };

        setSessionPlans((prev) => {
          const index = prev.findIndex((p) => p.id === id);
          if (index !== -1) {
            const next = [...prev];
            next[index] = finalPlan;
            return next.map((p) => {
              if (p.term === finalPlan.term && p.week === finalPlan.week && p.ageGroup === finalPlan.ageGroup && p.id !== id) {
                return { ...p, activities: finalPlan.activities };
              }
              return p;
            });
          }
          return [...prev, finalPlan];
        });

        await api.put(`/api/session-plans/${seg(id)}`, finalPlan);
        // Propagate activities to every location-specific variant.
        await api.post("/api/session-plans/propagate", {
          term: updatedPlan.term,
          week: updatedPlan.week,
          ageGroup: updatedPlan.ageGroup,
          activities: updatedPlan.activities,
          excludeId: id,
        });
      }
    } catch (error) {
      console.error("Error updating session plan:", error);
      loadPlans();
    }
  };

  const deleteSessionPlan = async (id: string) => {
    setSessionPlans((prev) => prev.filter((p) => p.id !== id));
    try {
      await api.del(`/api/session-plans/${seg(id)}`);
    } catch (error) {
      console.error("Delete session plan failed:", error);
      loadPlans();
    }
  };

  const rateDrill = async (drillName: string, locationId: string, rating: number) => {
    const id = `${drillName.replace(/\s+/g, "_")}_${locationId.replace(/\s+/g, "_")}`;
    setRatings((prev) => ({ ...prev, [`${drillName}_${locationId}`]: rating }));
    try {
      await api.put(`/api/drill-ratings/${seg(id)}`, {
        drillName,
        locationId,
        rating,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Rate drill failed:", error);
      loadRatings();
    }
  };

  return (
    <SessionPlanContext.Provider value={{ sessionPlans, addSessionPlans, updateSessionPlan, deleteSessionPlan, isLoading, ratings, setRatings, rateDrill }}>
      {children}
    </SessionPlanContext.Provider>
  );
}

export function useSessionPlans() {
  const context = useContext(SessionPlanContext);
  if (context === undefined) {
    throw new Error("useSessionPlans must be used within a SessionPlanProvider");
  }
  return context;
}
