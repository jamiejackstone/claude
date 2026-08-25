// Gemini calls are proxied through the Worker so the API key stays server-side.
import { api } from "../api";

const FALLBACK = "A hero is someone who has given his or her life to something bigger than oneself.";

export async function generateHuddleQuote(coreValue: string, ageGroup: string): Promise<string> {
  try {
    const res = await api.post<{ text: string }>("/api/ai/huddle-quote", { coreValue, ageGroup });
    return res.text?.trim() || FALLBACK;
  } catch (error) {
    console.error("Error generating huddle quote:", error);
    return FALLBACK;
  }
}

export async function generateTermHuddleQuotes(coreValues: string[], ageGroup: string): Promise<string[]> {
  try {
    const res = await api.post<{ quotes: string[] }>("/api/ai/term-quotes", { coreValues, ageGroup });
    return Array.isArray(res.quotes) ? res.quotes : coreValues.map(() => FALLBACK);
  } catch (error) {
    console.error("Error generating term huddle quotes:", error);
    return coreValues.map(() => FALLBACK);
  }
}
