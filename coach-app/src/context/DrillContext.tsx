import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Drill, DrillHistory, DrillComment } from "../types";
import { useAuth } from "./AuthContext";
import { api, seg } from "../api";

interface DrillContextType {
  drills: Drill[];
  addDrill: (drill: Drill) => void;
  updateDrill: (id: string, drill: Partial<Drill>) => void;
  deleteDrill: (id: string) => void;
  rateDrillByName: (name: string, rating: number, userId?: string) => void;
  logDrillHistory: (drillName: string, historyEntry: DrillHistory) => void;
  removeDrillHistory: (drillName: string, historyEntry: DrillHistory) => void;
  addComment: (drillId: string, comment: DrillComment) => void;
  markCommentsAsRead: (drillId: string) => void;
  isLoading: boolean;
}

const DrillContext = createContext<DrillContextType | undefined>(undefined);

export function DrillProvider({ children }: { children: ReactNode }) {
  const [drills, setDrills] = useState<Drill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const load = React.useCallback(async () => {
    try {
      const data = await api.get<Drill[]>("/api/drills");
      setDrills(data);
    } catch (error) {
      console.error("Drill load failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setDrills([]);
      setIsLoading(false);
      return;
    }
    load();
  }, [user, load]);

  // Apply a partial change to a drill: optimistic local update + persisted PATCH.
  const patchDrill = async (drillId: string, changes: Partial<Drill>) => {
    setDrills((prev) => prev.map((d) => (d.id === drillId ? { ...d, ...changes } : d)));
    try {
      await api.patch(`/api/drills/${seg(drillId)}`, changes);
    } catch (error) {
      console.error("Drill update failed:", error);
      load(); // re-sync on failure
    }
  };

  const addDrill = async (drill: Drill) => {
    setDrills((prev) => [...prev.filter((d) => d.id !== drill.id), drill]);
    try {
      await api.put(`/api/drills/${seg(drill.id)}`, drill);
    } catch (error) {
      console.error("Add drill failed:", error);
      load();
    }
  };

  const updateDrill = async (id: string, updatedFields: Partial<Drill>) => {
    await patchDrill(id, updatedFields);
  };

  const deleteDrill = async (id: string) => {
    setDrills((prev) => prev.filter((d) => d.id !== id));
    try {
      await api.del(`/api/drills/${seg(id)}`);
    } catch (error) {
      console.error("Delete drill failed:", error);
      load();
    }
  };

  const rateDrillByName = async (name: string, newRating: number, userId?: string) => {
    const drill = drills.find((d) => d.name === name);
    if (!drill) return;
    if (userId && drill.ratedBy?.includes(userId)) {
      console.log("User already rated this drill");
      return;
    }
    const totalVotes = drill.votes + 1;
    const currentTotalScore = drill.rating * drill.votes;
    const newAverage = (currentTotalScore + newRating) / totalVotes;
    const newRatedBy = [...(drill.ratedBy || []), ...(userId ? [userId] : [])];
    await patchDrill(drill.id, { rating: newAverage, votes: totalVotes, ratedBy: newRatedBy });
  };

  const logDrillHistory = async (drillName: string, historyEntry: DrillHistory) => {
    const drill = drills.find((d) => d.name === drillName);
    if (!drill) return;
    const history = drill.history || [];
    const exists = history.some(
      (h) => h.term === historyEntry.term && h.week === historyEntry.week && h.ageGroup === historyEntry.ageGroup,
    );
    if (!exists) await patchDrill(drill.id, { history: [...history, historyEntry] });
  };

  const removeDrillHistory = async (drillName: string, historyEntry: DrillHistory) => {
    const drill = drills.find((d) => d.name === drillName);
    if (!drill || !drill.history) return;
    const updatedHistory = drill.history.filter(
      (h) => !(h.term === historyEntry.term && h.week === historyEntry.week && h.ageGroup === historyEntry.ageGroup),
    );
    await patchDrill(drill.id, { history: updatedHistory });
  };

  const addComment = async (drillId: string, comment: DrillComment) => {
    const drill = drills.find((d) => d.id === drillId);
    if (!drill) return;
    const comments = drill.comments || [];
    let newAverage = drill.rating;
    let totalVotes = drill.votes;
    const newRatedBy = drill.ratedBy || [];
    if (!comment.userId || !newRatedBy.includes(comment.userId)) {
      totalVotes = drill.votes + 1;
      const currentTotalScore = drill.rating * drill.votes;
      newAverage = (currentTotalScore + comment.rating) / totalVotes;
      if (comment.userId) newRatedBy.push(comment.userId);
    }
    await patchDrill(drill.id, {
      comments: [...comments, comment],
      rating: newAverage,
      votes: totalVotes,
      ratedBy: newRatedBy,
    });
  };

  const markCommentsAsRead = async (drillId: string) => {
    const drill = drills.find((d) => d.id === drillId);
    if (!drill || !drill.comments) return;
    const updatedComments = drill.comments.map((c) => ({ ...c, isRead: true }));
    await patchDrill(drill.id, { comments: updatedComments });
  };

  return (
    <DrillContext.Provider
      value={{
        drills,
        addDrill,
        updateDrill,
        deleteDrill,
        rateDrillByName,
        logDrillHistory,
        removeDrillHistory,
        addComment,
        markCommentsAsRead,
        isLoading,
      }}
    >
      {children}
    </DrillContext.Provider>
  );
}

export function useDrills() {
  const context = useContext(DrillContext);
  if (context === undefined) {
    throw new Error("useDrills must be used within a DrillProvider");
  }
  return context;
}
