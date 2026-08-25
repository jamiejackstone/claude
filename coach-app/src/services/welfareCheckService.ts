import { api } from "../api";

export interface WelfareWebhookPayload {
  parent_first_name: string;
  parent_email: string;
  parent_phone: string;
  child_first_name: string;
  location_name: string;
  session_date: string;
  severity: "routine" | "serious";
  submitted_by_coach: string;
}

/**
 * Triggers the parent welfare-check automation. The GHL/CRM webhook URL now
 * lives ONLY as a Worker secret; the browser posts the 8 permitted fields to
 * our own endpoint, which forwards them and retries once on failure.
 */
export async function sendWelfareCheckWebhook(payload: WelfareWebhookPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await api.post<{ success: boolean; error?: string }>("/api/welfare-check", payload);
    return res;
  } catch (err: any) {
    console.error("Welfare check webhook failed:", err);
    return { success: false, error: err?.message || "Webhook delivery failed" };
  }
}
