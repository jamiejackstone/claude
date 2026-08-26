import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const TEAMUP_API_BASE = "https://goteamup.com/api/v2";

declare global {
	interface Env {
		TEAMUP_M2M_TOKEN: string;
	}
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function teamupRequest(
	token: string,
	method: string,
	path: string,
	body?: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: any }> {
	const response = await fetch(`${TEAMUP_API_BASE}${path}`, {
		method,
		headers: {
			Authorization: `Token ${token}`,
			Accept: "application/json",
			...(body ? { "Content-Type": "application/json" } : {}),
		},
		body: body ? JSON.stringify(body) : undefined,
	});
	const text = await response.text();
	let data: any;
	try {
		data = text ? JSON.parse(text) : {};
	} catch {
		data = text;
	}
	return { ok: response.ok, status: response.status, data };
}

function errorText(status: number, data: any): string {
	return `TeamUp API returned ${status}: ${typeof data === "string" ? data : JSON.stringify(data)}`;
}

// TeamUp report endpoints (/reports/<name>/data) return
// { total, column_headers, rows } with format=json.
interface ReportData {
	total: number;
	column_headers: string[];
	rows: any[];
}

async function reportRequest(
	token: string,
	report: string,
	params: URLSearchParams,
): Promise<{ ok: boolean; status: number; data: ReportData | any }> {
	params.set("format", "json");
	return teamupRequest(token, "GET", `/reports/${report}/data?${params}`);
}

// Rows may come back as arrays (aligned to column_headers) or objects, and
// object rows use NESTED objects rather than the flat request aliases:
// requesting column "customer_name" yields row.customer.name (confirmed live
// 26/08). resolvePath tries every split of the underscore-alias against the
// nested shape: customer_venue_name -> customer.venue.name etc.
function resolvePath(obj: any, parts: string[]): any {
	if (parts.length === 0) return obj;
	if (obj === null || obj === undefined || typeof obj !== "object") return undefined;
	for (let i = parts.length; i >= 1; i--) {
		const key = parts.slice(0, i).join("_");
		if (key in obj) {
			const v = resolvePath(obj[key], parts.slice(i));
			if (v !== undefined) return v;
		}
	}
	return undefined;
}

function rowValue(row: any, headers: string[], column: string): any {
	if (Array.isArray(row)) {
		let idx = headers.indexOf(column);
		if (idx === -1) idx = headers.indexOf(column.replace(/_/g, "."));
		return idx === -1 ? undefined : row[idx];
	}
	if (row === null || row === undefined) return undefined;
	if (column in row) return row[column];
	const dotted = column.replace(/_/g, ".");
	if (dotted in row) return row[dotted];
	return resolvePath(row, column.split("_"));
}

// Human label for a value that may be a nested object ({name}/{slug}/...).
function labelFor(v: any): string {
	if (v === null || v === undefined) return "?";
	if (typeof v === "object") {
		return String(v.name ?? v.slug ?? v.string ?? v.display_name ?? v.id ?? "?");
	}
	return String(v);
}

// Parse a money-ish value defensively: number, numeric string, "£1,234.56",
// or an object carrying amount/value.
function moneyNumber(v: any): number {
	if (v === null || v === undefined) return 0;
	if (typeof v === "number") return v;
	if (typeof v === "object") {
		return moneyNumber(v.amount ?? v.value ?? v.string);
	}
	const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""));
	return Number.isFinite(n) ? n : 0;
}

function gbp(n: number): string {
	return `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------------
// Formatting helpers (existing)
// ---------------------------------------------------------------------------

function formatEvent(event: any): string {
	const start = new Date(event.starts_at).toLocaleString("en-GB", {
		weekday: "short",
		day: "2-digit",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "Europe/London",
	});
	const end = new Date(event.ends_at).toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "Europe/London",
	});
	const category = event.category ? ` [${event.category.name}]` : "";
	const occupancy = `${event.attending_count}/${event.max_occupancy}${event.is_full ? " (FULL)" : ""}`;
	const venue = event.venue !== null ? `venue #${event.venue}` : "no venue set";
	return `#${event.id}  ${start}-${end}  ${event.name}${category}  --  ${occupancy}  (${event.status})  [${venue}]`;
}

function dayBoundsUTC(dateStr: string): { start: string; end: string } {
	const [y, m, d] = dateStr.split("-").map(Number);
	return {
		start: new Date(Date.UTC(y, m - 1, d)).toISOString(),
		end: new Date(Date.UTC(y, m - 1, d + 1)).toISOString(),
	};
}

function todayBoundsUTC(): { start: string; end: string } {
	const now = new Date();
	return {
		start: new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
		).toISOString(),
		end: new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
		).toISOString(),
	};
}

// ---------------------------------------------------------------------------
// Existing tool implementations (unchanged)
// ---------------------------------------------------------------------------

async function listClasses(
	token: string,
	args: { date?: string; start_date?: string; end_date?: string },
): Promise<string> {
	let starts_at_gte: string;
	let starts_at_lte: string;
	let label: string;
	if (args.start_date || args.end_date) {
		if (!args.start_date || !args.end_date) {
			return "Both start_date and end_date are needed for a range (or just pass date for a single day).";
		}
		starts_at_gte = dayBoundsUTC(args.start_date).start;
		starts_at_lte = dayBoundsUTC(args.end_date).end;
		label = `${args.start_date} to ${args.end_date}`;
	} else if (args.date) {
		const bounds = dayBoundsUTC(args.date);
		starts_at_gte = bounds.start;
		starts_at_lte = bounds.end;
		label = args.date;
	} else {
		const bounds = todayBoundsUTC();
		starts_at_gte = bounds.start;
		starts_at_lte = bounds.end;
		label = "today";
	}
	const params = new URLSearchParams({ starts_at_gte, starts_at_lte, page_size: "100" });
	const { ok, status, data } = await teamupRequest(token, "GET", `/events?${params}`);
	if (!ok) return errorText(status, data);
	if (data.results.length === 0) return `Nothing scheduled for ${label}.`;
	const sorted = [...data.results].sort((a: any, b: any) =>
		a.starts_at.localeCompare(b.starts_at),
	);
	return `${data.count} session(s) for ${label}:\n\n${sorted.map(formatEvent).join("\n")}`;
}

async function searchCustomers(token: string, query: string): Promise<string> {
	const params = new URLSearchParams({ query, page_size: "25" });
	const { ok, status, data } = await teamupRequest(token, "GET", `/customers?${params}`);
	if (!ok) return errorText(status, data);
	if (data.results.length === 0) return `No customers found matching "${query}".`;
	return data.results
		.map((c: any) => `#${c.id}  ${c.first_name} ${c.last_name}  <${c.email}>  (${c.status})`)
		.join("\n");
}

async function registerCustomer(
	token: string,
	eventId: number,
	customerId: number,
	customerMembershipId?: number,
): Promise<string> {
	const body: Record<string, unknown> = { customer: customerId };
	if (customerMembershipId !== undefined) body.customer_membership = customerMembershipId;
	const { ok, status, data } = await teamupRequest(
		token,
		"POST",
		`/events/${eventId}/register`,
		body,
	);
	if (!ok) return errorText(status, data);
	return `Registered customer #${customerId} for event #${eventId}.`;
}

async function unregisterCustomer(
	token: string,
	eventId: number,
	customerId: number,
	isLateCancel?: boolean,
): Promise<string> {
	const body: Record<string, unknown> = { customer: customerId };
	if (isLateCancel !== undefined) body.is_late_cancel = isLateCancel;
	const { ok, status, data } = await teamupRequest(
		token,
		"POST",
		`/events/${eventId}/unregister`,
		body,
	);
	if (!ok) return errorText(status, data);
	return `Unregistered customer #${customerId} from event #${eventId}.`;
}

async function confirmAttendance(
	token: string,
	eventId: number,
	customerId: number,
): Promise<string> {
	const { ok, status, data } = await teamupRequest(
		token,
		"POST",
		`/events/${eventId}/confirm_attendance`,
		{
			customer: customerId,
		},
	);
	if (!ok) return errorText(status, data);
	return `Marked customer #${customerId} attended for event #${eventId}.`;
}

async function markNoShow(token: string, eventId: number, customerId: number): Promise<string> {
	const { ok, status, data } = await teamupRequest(
		token,
		"POST",
		`/events/${eventId}/mark_no_show`,
		{
			customer: customerId,
		},
	);
	if (!ok) return errorText(status, data);
	return `Marked customer #${customerId} as no-show for event #${eventId}.`;
}

async function listMembershipPlans(token: string): Promise<string> {
	const { ok, status, data } = await teamupRequest(token, "GET", "/memberships?page_size=100");
	if (!ok) return errorText(status, data);
	if (data.results.length === 0) return "No membership plans found.";
	return data.results
		.map((m: any) => `#${m.id}  ${m.name}${m.category ? ` [${m.category}]` : ""}`)
		.join("\n");
}

function formatCustomerMembership(cm: any): string {
	const price = cm.billed_price ? `  ${cm.billed_price.string}` : "";
	return `#${cm.id}  customer #${cm.customer}  "${cm.name}"  (${cm.status})  since ${cm.start_date}${price}`;
}

// UPGRADED (A1): pagination + richer filters. Previously hard-coded page_size=50,
// no page param, so results beyond 50 were unreachable.
async function listCustomerMemberships(
	token: string,
	filters: {
		customer?: number;
		status?: string;
		membership_plan_id?: number;
		page?: number;
		page_size?: number;
	},
): Promise<string> {
	const pageSize = filters.page_size ?? 50;
	const page = filters.page ?? 1;
	const params = new URLSearchParams({ page_size: String(pageSize), page: String(page) });
	if (filters.customer !== undefined) params.set("customer", String(filters.customer));
	if (filters.status) params.set("status", filters.status);
	if (filters.membership_plan_id !== undefined)
		params.set("membership", String(filters.membership_plan_id));
	const { ok, status, data } = await teamupRequest(
		token,
		"GET",
		`/customer_memberships?${params}`,
	);
	if (!ok) return errorText(status, data);
	if (data.results.length === 0) return "No customer memberships found matching those filters.";
	const totalPages = Math.max(1, Math.ceil(data.count / pageSize));
	const paging =
		totalPages > 1
			? `\n\nPage ${page} of ${totalPages} (${data.count} total -- pass page to fetch the rest).`
			: "";
	return `${data.count} membership(s):\n\n${data.results.map(formatCustomerMembership).join("\n")}${paging}`;
}

async function createCustomerMembership(
	token: string,
	customerId: number,
	membershipPlanId: number,
	startDate?: string,
	paymentPlanId?: number,
): Promise<string> {
	const body: Record<string, unknown> = { customer: customerId, membership: membershipPlanId };
	if (startDate) body.start_date = startDate;
	if (paymentPlanId !== undefined) body.payment_plan = paymentPlanId;
	const { ok, status, data } = await teamupRequest(token, "POST", "/customer_memberships", body);
	if (!ok) {
		return `${errorText(status, data)}\n\nNote: this endpoint only works directly for memberships priced at zero. Paid memberships must go through TeamUp's checkout flow -- if that's what failed here, this needs doing in TeamUp directly rather than via this tool.`;
	}
	return `Created membership for customer #${customerId}: ${formatCustomerMembership(data)}`;
}

async function cancelCustomerMembership(
	token: string,
	customerMembershipId: number,
	forcedExpirationDate?: string,
): Promise<string> {
	const body: Record<string, unknown> = {};
	if (forcedExpirationDate) body.forced_expiration_date = forcedExpirationDate;
	const { ok, status, data } = await teamupRequest(
		token,
		"POST",
		`/customer_memberships/${customerMembershipId}/cancel`,
		body,
	);
	if (!ok) return errorText(status, data);
	return `Cancelled customer membership #${customerMembershipId}.`;
}

// ---------------------------------------------------------------------------
// NEW (A2): membership changes report -- date-windowed joins/cancellations
// ---------------------------------------------------------------------------

const MEMBERSHIP_REPORT_COLUMNS = [
	"id",
	"customer_id",
	"customer_name",
	"customer_email",
	"membership_name",
	"type",
	"status",
	"start_date",
	"cancelled_date",
	"cancellation_reason",
	"is_first_membership",
	"billed_price",
].join(",");

async function membershipChangesReport(
	token: string,
	args: {
		status?: string;
		started_from?: string;
		started_to?: string;
		cancelled_from?: string;
		cancelled_to?: string;
		purchased_from?: string;
		purchased_to?: string;
		page?: number;
		page_size?: number;
	},
): Promise<string> {
	const pageSize = args.page_size ?? 100;
	const page = args.page ?? 1;
	const params = new URLSearchParams({
		columns: MEMBERSHIP_REPORT_COLUMNS,
		page_size: String(pageSize),
		page: String(page),
	});
	if (args.status) params.set("status", args.status);
	if (args.started_from) params.set("start_date_gte", args.started_from);
	if (args.started_to) params.set("start_date_lte", args.started_to);
	if (args.cancelled_from) params.set("cancelled_at_gte", args.cancelled_from);
	if (args.cancelled_to) params.set("cancelled_at_lte", args.cancelled_to);
	if (args.purchased_from) params.set("purchased_at_gte", args.purchased_from);
	if (args.purchased_to) params.set("purchased_at_lte", args.purchased_to);

	const { ok, status, data } = await reportRequest(token, "customer_memberships", params);
	if (!ok) return errorText(status, data);
	const report = data as ReportData;
	if (!report.rows || report.rows.length === 0) {
		return "No customer memberships matched that window/filters.";
	}
	const h = report.column_headers;
	const lines = report.rows.map((r: any) => {
		const first = rowValue(r, h, "is_first_membership") ? "  [FIRST MEMBERSHIP]" : "";
		const cancelled = rowValue(r, h, "cancelled_date");
		const reason = rowValue(r, h, "cancellation_reason");
		const cancelledBit = cancelled
			? `  cancelled ${labelFor(cancelled)}${reason ? ` ("${labelFor(reason)}")` : ""}`
			: "";
		return `#${labelFor(rowValue(r, h, "id"))}  ${labelFor(rowValue(r, h, "customer_name"))} <${labelFor(rowValue(r, h, "customer_email"))}>  "${labelFor(rowValue(r, h, "membership_name"))}"  (${labelFor(rowValue(r, h, "status"))})  started ${labelFor(rowValue(r, h, "start_date"))}${cancelledBit}${first}`;
	});
	const totalPages = Math.max(1, Math.ceil(report.total / pageSize));
	const paging =
		totalPages > 1 ? `\n\nPage ${page} of ${totalPages} (${report.total} total).` : "";
	return `${report.total} membership record(s):\n\n${lines.join("\n")}${paging}`;
}

// ---------------------------------------------------------------------------
// NEW (A3): revenue report -- date-windowed paid invoices, TeamUp as source
// ---------------------------------------------------------------------------

async function revenueReport(
	token: string,
	args: { paid_from: string; paid_to: string; status?: string },
): Promise<string> {
	const pageSize = 100; // TeamUp caps report page_size at 100
	let page = 1;
	let total = Infinity;
	let gross = 0;
	let grossCount = 0;
	let creditNotes = 0;
	let creditNoteCount = 0;
	let refunds = 0;
	const byProcessor: Record<string, number> = {};
	const byPurchaseType: Record<string, number> = {};

	while ((page - 1) * pageSize < total && page <= 60) {
		const params = new URLSearchParams({
			columns:
				"id,paid_at,status,total_amount,is_credit_note,refund_amount,payment_processor,purchase_type",
			paid_at_gte: args.paid_from,
			paid_at_lte: args.paid_to,
			status: args.status ?? "paid",
			page_size: String(pageSize),
			page: String(page),
		});
		const { ok, status, data } = await reportRequest(token, "invoices", params);
		if (!ok) return errorText(status, data);
		const report = data as ReportData;
		total = report.total;
		const h = report.column_headers;
		for (const r of report.rows ?? []) {
			const amount = moneyNumber(rowValue(r, h, "total_amount"));
			const isCreditNote = rowValue(r, h, "is_credit_note") === true;
			if (isCreditNote) {
				// Credit notes are refunds/reversals -- counting them as positive
				// revenue was inflating the total (found live 26/08).
				creditNotes += Math.abs(amount);
				creditNoteCount += 1;
				continue;
			}
			// refund_amount comes back already-negative from the API -- normalise
			refunds += Math.abs(moneyNumber(rowValue(r, h, "refund_amount")));
			gross += amount;
			grossCount += 1;
			const proc = labelFor(rowValue(r, h, "payment_processor"));
			const ptype = labelFor(rowValue(r, h, "purchase_type"));
			byProcessor[proc] = (byProcessor[proc] ?? 0) + amount;
			byPurchaseType[ptype] = (byPurchaseType[ptype] ?? 0) + amount;
		}
		if (!report.rows || report.rows.length === 0) break;
		page += 1;
	}

	const net = gross - creditNotes - refunds;
	const breakdown = (obj: Record<string, number>) =>
		Object.entries(obj)
			.sort((a, b) => b[1] - a[1])
			.map(([k, v]) => `  ${k}: ${gbp(v)}`)
			.join("\n");

	return [
		`Revenue ${args.paid_from} to ${args.paid_to} (invoices with status=${args.status ?? "paid"}):`,
		``,
		`GROSS (paid invoices, excl. credit notes): ${gbp(gross)}  (${grossCount} invoice(s))`,
		`Credit notes in window: -${gbp(creditNotes)}  (${creditNoteCount})`,
		`Refunds recorded on paid invoices: -${gbp(refunds)}`,
		`NET: ${gbp(net)}`,
		``,
		`By payment processor (gross):`,
		breakdown(byProcessor) || "  (none)",
		``,
		`By purchase type (gross):`,
		breakdown(byPurchaseType) || "  (none)",
		``,
		`Source: TeamUp invoices report (source of truth for Revenue MTD -- includes non-Stripe payment methods). Compare NET against the TeamUp dashboard figure; if they diverge, check which basis the dashboard uses before trusting either.`,
	].join("\n");
}

// ---------------------------------------------------------------------------
// NEW (A4): register completeness -- past sessions still holding 'registered'
// ---------------------------------------------------------------------------

async function registerCompleteness(
	token: string,
	args: { from?: string; to?: string; venue_id?: number },
): Promise<string> {
	const now = new Date();
	const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
	const from = args.from ? dayBoundsUTC(args.from).start : defaultFrom;
	// Only past sessions can have an incomplete register.
	const to = args.to ? dayBoundsUTC(args.to).end : now.toISOString();

	const pageSize = 100;
	let page = 1;
	let total = Infinity;
	const byVenue: Record<string, Record<string, number>> = {}; // venue -> eventLabel -> count

	while ((page - 1) * pageSize < total && page <= 40) {
		const params = new URLSearchParams({
			status: "registered",
			event_starts_at_gte: from,
			event_starts_at_lte: to,
			page_size: String(pageSize),
			page: String(page),
			expand: "event",
		});
		if (args.venue_id !== undefined) params.set("venue", String(args.venue_id));
		const { ok, status, data } = await teamupRequest(token, "GET", `/attendances?${params}`);
		if (!ok) return errorText(status, data);
		total = data.count;
		for (const a of data.results ?? []) {
			const ev = a.event;
			const venueKey =
				typeof ev === "object" && ev
					? ev.venue !== null && ev.venue !== undefined
						? `venue #${ev.venue}`
						: "no venue set"
					: "unknown venue";
			const evLabel =
				typeof ev === "object" && ev
					? `#${ev.id}  ${new Date(ev.starts_at).toLocaleString("en-GB", {
							weekday: "short",
							day: "2-digit",
							month: "short",
							hour: "2-digit",
							minute: "2-digit",
							timeZone: "Europe/London",
						})}  ${ev.name}`
					: `event #${ev}`;
			byVenue[venueKey] = byVenue[venueKey] ?? {};
			byVenue[venueKey][evLabel] = (byVenue[venueKey][evLabel] ?? 0) + 1;
		}
		if (!data.results || data.results.length === 0) break;
		page += 1;
	}

	const windowLabel = `${from.slice(0, 10)} to ${to.slice(0, 10)}`;
	const venues = Object.keys(byVenue);
	if (venues.length === 0) {
		return `All registers complete for ${windowLabel} -- no past-session attendances still sitting at 'registered'.`;
	}
	const totalOutstanding = Object.values(byVenue)
		.flatMap((events) => Object.values(events))
		.reduce((a, b) => a + b, 0);
	const lines = venues
		.sort()
		.map((v) => {
			const events = byVenue[v];
			const venueTotal = Object.values(events).reduce((a, b) => a + b, 0);
			const eventLines = Object.entries(events)
				.map(([label, n]) => `    ${label}  --  ${n} unmarked`)
				.join("\n");
			return `  ${v}: ${venueTotal} unmarked attendance(s)\n${eventLines}`;
		})
		.join("\n");
	return `INCOMPLETE REGISTERS ${windowLabel}: ${totalOutstanding} attendance(s) still 'registered' on past sessions (should be attended/no_show/late_cancelled).\n\n${lines}\n\nScoreboard 'Registers not completed' = ${totalOutstanding}. Use hh-teamup-calendar / TeamUp Venue ID Reference for venue names.`;
}

// ---------------------------------------------------------------------------
// NEW (B): failed invoices -- the Failed Invoices report without the UI
// ---------------------------------------------------------------------------

async function listFailedInvoices(
	token: string,
	args: { include_retrying?: boolean },
): Promise<string> {
	const statuses =
		args.include_retrying === false ? "failed,retry_failed" : "failed,retrying,retry_failed";
	const pageSize = 100;
	let page = 1;
	let total = Infinity;
	let lookups = 0;
	const lines: string[] = [];

	while ((page - 1) * pageSize < total && page <= 20) {
		const params = new URLSearchParams({
			status: statuses,
			page_size: String(pageSize),
			page: String(page),
			expand: "payer",
		});
		const { ok, status, data } = await teamupRequest(token, "GET", `/invoices?${params}`);
		if (!ok) return errorText(status, data);
		total = data.count;
		for (const inv of data.results ?? []) {
			const payer = inv.payer;
			let payerBit: string;
			const payerId = payer && typeof payer === "object" ? payer.id : payer;
			const hasIdentity =
				payer && typeof payer === "object" && (payer.email || payer.first_name);
			if (hasIdentity) {
				payerBit =
					`${payer.first_name ?? ""} ${payer.last_name ?? ""}`.trim() +
					(payer.email ? `  <${payer.email}>` : "") +
					(payer.id ? `  (customer #${payer.id})` : "");
			} else if (payerId !== undefined && payerId !== null && lookups < 25) {
				// expand=payer doesn't return name/email -- look the customer up directly
				lookups += 1;
				const cust = await teamupRequest(token, "GET", `/customers/${payerId}`);
				payerBit =
					cust.ok && cust.data
						? `${cust.data.first_name ?? ""} ${cust.data.last_name ?? ""}`.trim() +
							(cust.data.email ? `  <${cust.data.email}>` : "") +
							`  (customer #${payerId})`
						: `customer #${payerId}`;
			} else {
				payerBit = `customer #${payerId}`;
			}
			const amount = inv.total_amount_due;
			const amountBit =
				amount && typeof amount === "object"
					? (amount.string ?? gbp(moneyNumber(amount)))
					: String(amount ?? "?");
			lines.push(
				`#${inv.id}  ${payerBit}  --  ${amountBit}  due ${inv.due_date}  (${inv.status})`,
			);
		}
		if (!data.results || data.results.length === 0) break;
		page += 1;
	}

	if (lines.length === 0) {
		return `No failed invoices. (Checked statuses: ${statuses}.)`;
	}
	return `${lines.length} failed invoice(s) (statuses: ${statuses}):\n\n${lines.join(
		"\n",
	)}\n\nNext step for each: match the payer email to the GHL contact and apply the failed-payment workflow/tag.`;
}

// ---------------------------------------------------------------------------
// NEW (A2b / Scoreboard locations): active members by venue
// ---------------------------------------------------------------------------

// Location = membership plan name ("HH Oxford", "HH Aylesbury", ...). The
// customer-level venue field is unpopulated in HH's TeamUp setup (confirmed
// live 26/08 -- all 313 actives had no venue), so plan names are the working
// source of truth for members-per-location. Non-location plans (complimentary
// coach memberships, tasters) are listed but excluded from the 50+/<30 counts.
const NON_LOCATION_PLAN = /complimentary|taster|free|trial|staff|coach/i;

async function membersByVenue(token: string): Promise<string> {
	const pageSize = 100; // TeamUp caps report page_size at 100
	let page = 1;
	let total = Infinity;
	const byPlan: Record<string, Set<number>> = {};

	while ((page - 1) * pageSize < total && page <= 60) {
		const params = new URLSearchParams({
			columns: "id,customer_id,membership_name",
			status: "active",
			page_size: String(pageSize),
			page: String(page),
		});
		const { ok, status, data } = await reportRequest(token, "customer_memberships", params);
		if (!ok) return errorText(status, data);
		const report = data as ReportData;
		total = report.total;
		const h = report.column_headers;
		for (const r of report.rows ?? []) {
			const plan = labelFor(rowValue(r, h, "membership_name"));
			const customerId = Number(labelFor(rowValue(r, h, "customer_id")));
			byPlan[plan] = byPlan[plan] ?? new Set<number>();
			byPlan[plan].add(Number.isFinite(customerId) ? customerId : Math.random());
		}
		if (!report.rows || report.rows.length === 0) break;
		page += 1;
	}

	const entries = Object.entries(byPlan)
		.map(([plan, customers]) => [plan, customers.size] as [string, number])
		.sort((a, b) => b[1] - a[1]);
	if (entries.length === 0) return "No active memberships found.";

	const locations = entries.filter(([plan]) => !NON_LOCATION_PLAN.test(plan));
	const nonLocations = entries.filter(([plan]) => NON_LOCATION_PLAN.test(plan));
	const fiftyPlus = locations.filter(([, n]) => n >= 50).length;
	const underThirty = locations.filter(([, n]) => n < 30).length;
	const memberTotal = entries.reduce((a, [, n]) => a + n, 0);
	const locationTotal = locations.reduce((a, [, n]) => a + n, 0);

	const fmt = (rows: [string, number][], flag: boolean) =>
		rows
			.map(
				([v, n]) =>
					`  ${v}: ${n}${flag ? (n >= 50 ? "  [50+]" : n < 30 ? "  [<30]" : "") : ""}`,
			)
			.join("\n");

	return [
		`${memberTotal} active membership holder(s); ${locationTotal} across ${locations.length} location plan(s):`,
		``,
		fmt(locations, true) || "  (none)",
		``,
		`Non-location plans (excluded from location counts -- matched: complimentary/taster/free/trial/staff/coach):`,
		fmt(nonLocations, false) || "  (none)",
		``,
		`Scoreboard: Locations 50+ Members = ${fiftyPlus}  |  Locations <30 Members = ${underThirty}.`,
		`Method: active customer memberships grouped by plan name (distinct customers); the customer-level venue field is unpopulated in HH's TeamUp.`,
	].join("\n");
}

// ---------------------------------------------------------------------------
// MCP server
// ---------------------------------------------------------------------------

export class HoopHeroesTeamUpMCP extends McpAgent<Env> {
	server = new McpServer({
		name: "Hoop Heroes TeamUp",
		version: "0.4.3",
	});

	async init() {
		const token = () => this.env.TEAMUP_M2M_TOKEN;
		const text = (s: string) => ({ content: [{ type: "text" as const, text: s }] });

		this.server.registerTool(
			"list_classes",
			{
				description:
					"List Hoop Heroes classes/sessions on TeamUp, including their #ID (needed for register/cancel/attendance tools below). No arguments = today. Pass `date` for a single other day, or `start_date`+`end_date` for a range. Venue is a numeric ID -- use hh-teamup-calendar for venue names.",
				inputSchema: {
					date: z
						.string()
						.optional()
						.describe("YYYY-MM-DD, e.g. 2026-07-11 for Saturday"),
					start_date: z.string().optional().describe("Start of a date range, YYYY-MM-DD"),
					end_date: z.string().optional().describe("End of a date range, YYYY-MM-DD"),
				},
			},
			async (args) => text(await listClasses(token(), args)),
		);

		this.server.registerTool(
			"search_customers",
			{
				description:
					"Search Hoop Heroes customers/parents by name or email, returning their #ID -- needed before booking, cancelling, or managing memberships for someone, since those all take a customer ID, not a name.",
				inputSchema: {
					query: z.string().describe("Name or email to search for"),
				},
			},
			async ({ query }) => text(await searchCustomers(token(), query)),
		);

		this.server.registerTool(
			"register_customer_for_class",
			{
				description:
					"Book a customer onto a class/event. Needs the event's #ID (from list_classes) and the customer's #ID (from search_customers). Optionally pass a customer_membership_id to book against a specific membership (from list_customer_memberships) rather than TeamUp's default choice.",
				inputSchema: {
					event_id: z.number().describe("Event ID from list_classes"),
					customer_id: z.number().describe("Customer ID from search_customers"),
					customer_membership_id: z
						.number()
						.optional()
						.describe("Specific membership to book against, if not the default"),
				},
			},
			async ({ event_id, customer_id, customer_membership_id }) =>
				text(
					await registerCustomer(token(), event_id, customer_id, customer_membership_id),
				),
		);

		this.server.registerTool(
			"cancel_registration",
			{
				description:
					"Cancel a customer's booking on a class/event (unregister). Needs the event's #ID and the customer's #ID.",
				inputSchema: {
					event_id: z.number().describe("Event ID from list_classes"),
					customer_id: z.number().describe("Customer ID from search_customers"),
					is_late_cancel: z
						.boolean()
						.optional()
						.describe("Whether this counts as a late cancellation"),
				},
			},
			async ({ event_id, customer_id, is_late_cancel }) =>
				text(await unregisterCustomer(token(), event_id, customer_id, is_late_cancel)),
		);

		this.server.registerTool(
			"confirm_attendance",
			{
				description: "Mark a customer as having attended a class/event.",
				inputSchema: {
					event_id: z.number().describe("Event ID from list_classes"),
					customer_id: z.number().describe("Customer ID from search_customers"),
				},
			},
			async ({ event_id, customer_id }) =>
				text(await confirmAttendance(token(), event_id, customer_id)),
		);

		this.server.registerTool(
			"mark_no_show",
			{
				description:
					"Mark a customer as a no-show for a class/event they were registered for.",
				inputSchema: {
					event_id: z.number().describe("Event ID from list_classes"),
					customer_id: z.number().describe("Customer ID from search_customers"),
				},
			},
			async ({ event_id, customer_id }) =>
				text(await markNoShow(token(), event_id, customer_id)),
		);

		this.server.registerTool(
			"list_membership_plans",
			{
				description:
					"List Hoop Heroes' membership plan templates (e.g. 'Unlimited Monthly'), with their #ID -- needed to create a customer membership, since that takes a plan ID not a name.",
				inputSchema: {},
			},
			async () => text(await listMembershipPlans(token())),
		);

		this.server.registerTool(
			"list_customer_memberships",
			{
				description:
					"List actual customer memberships (a specific person's subscription), optionally filtered by customer ID, status (active/hold/complete/cancelled), or membership plan. Paginated: pass page/page_size to walk the full list -- the response says how many pages there are. Use this to see what membership someone currently has, or to enumerate all members on a given plan.",
				inputSchema: {
					customer_id: z
						.number()
						.optional()
						.describe("Filter to one customer's memberships"),
					status: z
						.string()
						.optional()
						.describe(
							"Filter by status: active, hold, complete, cancelled (comma-separate for multiple)",
						),
					membership_plan_id: z
						.number()
						.optional()
						.describe(
							"Filter to one membership plan's members (ID from list_membership_plans)",
						),
					page: z.number().optional().describe("Page number, starting at 1 (default 1)"),
					page_size: z
						.number()
						.optional()
						.describe("Results per page (default 50, max 500)"),
				},
			},
			async ({ customer_id, status, membership_plan_id, page, page_size }) =>
				text(
					await listCustomerMemberships(token(), {
						customer: customer_id,
						status,
						membership_plan_id,
						page,
						page_size,
					}),
				),
		);

		this.server.registerTool(
			"create_customer_membership",
			{
				description:
					"Put a customer onto a membership plan. Needs the customer's #ID and the plan's #ID (from list_membership_plans). IMPORTANT: only works directly for plans priced at zero -- paid plans must be set up via TeamUp's checkout flow, this tool will return a clear error if that's the case. To MOVE a customer from one plan to another, there is no direct 'change plan' action in TeamUp -- cancel their current customer membership with cancel_customer_membership, then create the new one with this tool.",
				inputSchema: {
					customer_id: z.number().describe("Customer ID from search_customers"),
					membership_plan_id: z.number().describe("Plan ID from list_membership_plans"),
					start_date: z
						.string()
						.optional()
						.describe("YYYY-MM-DD, defaults to today if omitted"),
					payment_plan_id: z
						.number()
						.optional()
						.describe("Specific payment plan, if applicable"),
				},
			},
			async ({ customer_id, membership_plan_id, start_date, payment_plan_id }) =>
				text(
					await createCustomerMembership(
						token(),
						customer_id,
						membership_plan_id,
						start_date,
						payment_plan_id,
					),
				),
		);

		this.server.registerTool(
			"cancel_customer_membership",
			{
				description:
					"Cancel a specific customer membership (from list_customer_memberships, not a plan template). By default TeamUp applies the customer's minimum-notice period automatically -- only pass forced_expiration_date to override that.",
				inputSchema: {
					customer_membership_id: z
						.number()
						.describe("Customer membership ID, from list_customer_memberships"),
					forced_expiration_date: z
						.string()
						.optional()
						.describe("YYYY-MM-DD to override the automatic notice-period expiration"),
				},
			},
			async ({ customer_membership_id, forced_expiration_date }) =>
				text(
					await cancelCustomerMembership(
						token(),
						customer_membership_id,
						forced_expiration_date,
					),
				),
		);

		// ------------------------------------------------------------------
		// v0.4.0 additions -- Scoreboard + failed payments (all read-only)
		// ------------------------------------------------------------------

		this.server.registerTool(
			"membership_changes_report",
			{
				description:
					"Date-windowed membership report for the Scoreboard: joins and cancellations within a period (e.g. MTD). Pass started_from/started_to for New Members, cancelled_from/cancelled_to for Cancellations. Returns customer, plan, venue, dates, cancellation reason, and whether it's a first membership. Read-only. Dates are YYYY-MM-DD.",
				inputSchema: {
					status: z
						.string()
						.optional()
						.describe(
							"Filter by status: active, hold, cancelled, completed, upgraded, downgraded",
						),
					started_from: z
						.string()
						.optional()
						.describe("Memberships that started on/after this date"),
					started_to: z
						.string()
						.optional()
						.describe("Memberships that started on/before this date"),
					cancelled_from: z
						.string()
						.optional()
						.describe("Memberships cancelled on/after this date"),
					cancelled_to: z
						.string()
						.optional()
						.describe("Memberships cancelled on/before this date"),
					purchased_from: z
						.string()
						.optional()
						.describe("Memberships purchased on/after this date"),
					purchased_to: z
						.string()
						.optional()
						.describe("Memberships purchased on/before this date"),
					page: z.number().optional().describe("Page number, starting at 1"),
					page_size: z.number().optional().describe("Results per page (default 100)"),
				},
			},
			async (args) => text(await membershipChangesReport(token(), args)),
		);

		this.server.registerTool(
			"revenue_report",
			{
				description:
					"Revenue for a date window straight from TeamUp's invoices (the source of truth for Revenue MTD -- includes non-Stripe payment methods that Stripe queries miss). Sums paid invoices between paid_from and paid_to (YYYY-MM-DD), with breakdowns by payment processor and purchase type. Read-only.",
				inputSchema: {
					paid_from: z
						.string()
						.describe("Start of window (YYYY-MM-DD), e.g. first of the month for MTD"),
					paid_to: z.string().describe("End of window (YYYY-MM-DD), e.g. today for MTD"),
					status: z
						.string()
						.optional()
						.describe("Invoice status to sum (default 'paid'). Rarely needed."),
				},
			},
			async (args) => text(await revenueReport(token(), args)),
		);

		this.server.registerTool(
			"register_completeness",
			{
				description:
					"Check for unmarked registers: past sessions where attendances are still 'registered' instead of attended/no_show/late_cancelled. Defaults to the last 7 days; pass from/to (YYYY-MM-DD) for another window, or venue_id to check one venue. Grouped by venue with per-session counts -- feeds the Scoreboard 'Registers not completed' column. Read-only.",
				inputSchema: {
					from: z
						.string()
						.optional()
						.describe("Start date (YYYY-MM-DD), default 7 days ago"),
					to: z
						.string()
						.optional()
						.describe(
							"End date (YYYY-MM-DD), default now -- future sessions are never counted",
						),
					venue_id: z
						.number()
						.optional()
						.describe("Restrict to one venue (numeric TeamUp venue ID)"),
				},
			},
			async (args) => text(await registerCompleteness(token(), args)),
		);

		this.server.registerTool(
			"list_failed_invoices",
			{
				description:
					"List failed TeamUp invoices (the Failed Invoices report, without touching the TeamUp UI): payer name/email/customer #, amount due, due date, and status (failed / retrying / retry_failed). Feeds failed-payment detection and the GHL failed-payment workflow. Read-only.",
				inputSchema: {
					include_retrying: z
						.boolean()
						.optional()
						.describe(
							"Include invoices TeamUp is still auto-retrying (default true). Pass false for only terminal failures.",
						),
				},
			},
			async (args) => text(await listFailedInvoices(token(), args)),
		);

		this.server.registerTool(
			"members_by_venue",
			{
				description:
					"Count active members per venue/location -- feeds the Scoreboard 'Locations 50+ Members' and 'Locations <30 Members' columns and Total Active Members. No arguments. Read-only.",
				inputSchema: {},
			},
			async () => text(await membersByVenue(token())),
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);
		if (url.pathname === "/mcp") {
			return HoopHeroesTeamUpMCP.serve("/mcp").fetch(request, env, ctx);
		}
		return new Response("Not found", { status: 404 });
	},
};
