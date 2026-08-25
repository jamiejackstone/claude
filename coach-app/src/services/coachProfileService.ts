import { CoachProfileResult } from "../types";
import { api } from "../api";

export async function saveCoachProfileResult(result: Omit<CoachProfileResult, "timestamp">) {
  const res = await api.post<{ id: string }>("/api/coach-profiles", {
    ...result,
    timestamp: new Date().toISOString(),
  });
  return res.id;
}

export async function getCoachProfileResults(userId?: string) {
  const path = userId ? `/api/coach-profiles?userId=${encodeURIComponent(userId)}` : "/api/coach-profiles";
  return api.get<(CoachProfileResult & { id: string })[]>(path);
}

export async function getLatestCoachProfileResult(userId: string) {
  const rows = await api.get<(CoachProfileResult & { id: string })[]>(
    `/api/coach-profiles?userId=${encodeURIComponent(userId)}&limit=1`,
  );
  return rows.length ? rows[0] : null;
}
