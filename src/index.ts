import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

declare global {
	interface Env {
		TEAMUP_M2M_TOKEN: string;
	}
}

// ---------------------------------------------------------------------------
// TeamUp (GoTeamUp) API client
//
// Auth: Authorization: Token <M2M_TOKEN>. M2M tokens run in Provider mode
// under admin permissions -- no Teamup-Provider-ID header needed here.
//
// All endpoint/schema details below confirmed 10 July 2026 via Jamie reading
// docs.goteamup.com/api-reference with Claude in Chrome (my own fetch tool
// can't render that JS-based reference).
//
// Known limitations carried over:
// 1. Date boundaries on list_classes are UTC, not Europe/London (BST is an
//    hour out). TeamUp's local_starts_at_gte/lte would fix this properly.
// 2. `venue` on events is a numeric ID, not a name -- no venues endpoint
//    confirmed yet. hh-teamup-calendar skill remains the source for venue
//    names until that's added.
// ---------------------------------------------------------------------------
const TEAMUP_API_BASE = "https://goteamup.com/api/v2";

async function teamupRequest(
	token: string,
	method: "GET" | "POST",
	path: string,
	body?: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: unknown }> {
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
	let data: unknown;
	try {
		data = text ? JSON.parse(text) : {};
	} catch {
		data = text;
	}

	return { ok: response.ok, status: response.status, data };
}

function errorText(status: number, data: unknown): string {
	return `TeamUp API returned ${status}: ${typeof data === "string" ? data : JSON.stringify(data)}`;
}

// ---------------------------------------------------------------------------
// Classes / Events
// ---------------------------------------------------------------------------
interface TeamUpEvent {
	id: number;
	name: string;
	starts_at: string;
	ends_at: string;
	status: string;
	venue: number | null;
	is_full: boolean;
	attending_count: number;
	max_occupancy: number;
	category: { id: number; name: string } | null;
}

interface TeamUpEventsResponse {
	count: number;
	results: TeamUpEvent[];
}

function formatEvent(event: TeamUpEvent): string {
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

interface ListClassesArgs {
	date?: string;
	start_date?: string;
	end_date?: string;
}

async function listClasses(token: string, args: ListClassesArgs): Promise<string> {
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

	const parsed = data as TeamUpEventsResponse;
	if (parsed.results.length === 0) return `Nothing scheduled for ${label}.`;

	const sorted = [...parsed.results].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
	return `${parsed.count} session(s) for ${label}:\n\n${sorted.map(formatEvent).join("\n")}`;
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------
interface TeamUpCustomer {
	id: number;
	email: string;
	first_name: string;
	last_name: string;
	status: string;
}

interface TeamUpCustomersResponse {
	count: number;
	results: TeamUpCustomer[];
}

async function searchCustomers(token: string, query: string): Promise<string> {
	const params = new URLSearchParams({ query, page_size: "25" });
	const { ok, status, data } = await teamupRequest(token, "GET", `/customers?${params}`);
	if (!ok) return errorText(status, data);

	const parsed = data as TeamUpCustomersResponse;
	if (parsed.results.length === 0) return `No customers found matching "${query}".`;

	return parsed.results
		.map((c) => `#${c.id}  ${c.first_name} ${c.last_name}  <${c.email}>  (${c.status})`)
		.join("\n");
}

// ---------------------------------------------------------------------------
// Registrations (booking customers onto classes)
// ---------------------------------------------------------------------------
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
		{ customer: customerId },
	);
	if (!ok) return errorText(status, data);
	return `Marked customer #${customerId} attended for event #${eventId}.`;
}

async function markNoShow(token: string, eventId: number, customerId: number): Promise<string> {
	const { ok, status, data } = await teamupRequest(
		token,
		"POST",
		`/events/${eventId}/mark_no_show`,
		{ customer: customerId },
	);
	if (!ok) return errorText(status, data);
	return `Marked customer #${customerId} as no-show for event #${eventId}.`;
}

// ---------------------------------------------------------------------------
// Membership plans (templates, e.g. "Unlimited Monthly") -- distinct from a
// specific customer's subscription (see Customer Memberships below).
// ---------------------------------------------------------------------------
interface TeamUpMembershipPlan {
	id: number;
	name: string;
	category?: string;
}

interface TeamUpMembershipPlansResponse {
	count: number;
	results: TeamUpMembershipPlan[];
}

async function listMembershipPlans(token: string): Promise<string> {
	const { ok, status, data } = await teamupRequest(token, "GET", "/memberships?page_size=100");
	if (!ok) return errorText(status, data);

	const parsed = data as TeamUpMembershipPlansResponse;
	if (parsed.results.length === 0) return "No membership plans found.";

	return parsed.results
		.map((m) => `#${m.id}  ${m.name}${m.category ? ` [${m.category}]` : ""}`)
		.join("\n");
}

// ---------------------------------------------------------------------------
// Customer Memberships (a specific customer's subscription instance)
// ---------------------------------------------------------------------------
interface TeamUpCustomerMembership {
	id: number;
	name: string;
	start_date: string;
	status: string;
	membership: number;
	customer: number;
	billed_price?: { string: string };
}

interface TeamUpCustomerMembershipsResponse {
	count: number;
	results: TeamUpCustomerMembership[];
}

function formatCustomerMembership(cm: TeamUpCustomerMembership): string {
	const price = cm.billed_price ? `  ${cm.billed_price.string}` : "";
	return `#${cm.id}  customer #${cm.customer}  "${cm.name}"  (${cm.status})  since ${cm.start_date}${price}`;
}

async function listCustomerMemberships(
	token: string,
	filters: { customer?: number; status?: string },
): Promise<string> {
	const params = new URLSearchParams({ page_size: "50" });
	if (filters.customer !== undefined) params.set("customer", String(filters.customer));
	if (filters.status) params.set("status", filters.status);

	const { ok, status, data } = await teamupRequest(
		token,
		"GET",
		`/customer_memberships?${params}`,
	);
	if (!ok) return errorText(status, data);

	const parsed = data as TeamUpCustomerMembershipsResponse;
	if (parsed.results.length === 0) return "No customer memberships found matching those filters.";
	return `${parsed.count} membership(s):\n\n${parsed.results.map(formatCustomerMembership).join("\n")}`;
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
	const cm = data as TeamUpCustomerMembership;
	return `Created membership for customer #${customerId}: ${formatCustomerMembership(cm)}`;
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
// MCP server
// ---------------------------------------------------------------------------
export class HoopHeroesTeamUpMCP extends McpAgent<Env> {
	server = new McpServer({
		name: "Hoop Heroes TeamUp",
		version: "0.3.0",
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
					date: z.string().optional().describe("YYYY-MM-DD, e.g. 2026-07-11 for Saturday"),
					start_date: z.string().optional().describe("Start of a date range, YYYY-MM-DD"),
					end_date: z.string().optional().describe("End of a date range, YYYY-MM-DD"),
				},
			},
			async (args: ListClassesArgs) => text(await listClasses(token(), args)),
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
			async ({ query }: { query: string }) => text(await searchCustomers(token(), query)),
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
			async ({
				event_id,
				customer_id,
				customer_membership_id,
			}: { event_id: number; customer_id: number; customer_membership_id?: number }) =>
				text(await registerCustomer(token(), event_id, customer_id, customer_membership_id)),
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
			async ({
				event_id,
				customer_id,
				is_late_cancel,
			}: { event_id: number; customer_id: number; is_late_cancel?: boolean }) =>
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
			async ({ event_id, customer_id }: { event_id: number; customer_id: number }) =>
				text(await confirmAttendance(token(), event_id, customer_id)),
		);

		this.server.registerTool(
			"mark_no_show",
			{
				description: "Mark a customer as a no-show for a class/event they were registered for.",
				inputSchema: {
					event_id: z.number().describe("Event ID from list_classes"),
					customer_id: z.number().describe("Customer ID from search_customers"),
				},
			},
			async ({ event_id, customer_id }: { event_id: number; customer_id: number }) =>
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
					"List actual customer memberships (a specific person's subscription), optionally filtered by customer ID or status (e.g. 'active', 'cancelled'). Use this to see what membership someone currently has, or to find at-risk/recently-cancelled members.",
				inputSchema: {
					customer_id: z.number().optional().describe("Filter to one customer's memberships"),
					status: z
						.string()
						.optional()
						.describe("Filter by status, e.g. active, cancelled"),
				},
			},
			async ({ customer_id, status }: { customer_id?: number; status?: string }) =>
				text(await listCustomerMemberships(token(), { customer: customer_id, status })),
		);

		this.server.registerTool(
			"create_customer_membership",
			{
				description:
					"Put a customer onto a membership plan. Needs the customer's #ID and the plan's #ID (from list_membership_plans). IMPORTANT: only works directly for plans priced at zero -- paid plans must be set up via TeamUp's checkout flow, this tool will return a clear error if that's the case. To MOVE a customer from one plan to another, there is no direct 'change plan' action in TeamUp -- cancel their current customer membership with cancel_customer_membership, then create the new one with this tool.",
				inputSchema: {
					customer_id: z.number().describe("Customer ID from search_customers"),
					membership_plan_id: z.number().describe("Plan ID from list_membership_plans"),
					start_date: z.string().optional().describe("YYYY-MM-DD, defaults to today if omitted"),
					payment_plan_id: z.number().optional().describe("Specific payment plan, if applicable"),
				},
			},
			async ({
				customer_id,
				membership_plan_id,
				start_date,
				payment_plan_id,
			}: {
				customer_id: number;
				membership_plan_id: number;
				start_date?: string;
				payment_plan_id?: number;
			}) =>
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
					customer_membership_id: z.number().describe("Customer membership ID, from list_customer_memberships"),
					forced_expiration_date: z
						.string()
						.optional()
						.describe("YYYY-MM-DD to override the automatic notice-period expiration"),
				},
			},
			async ({
				customer_membership_id,
				forced_expiration_date,
			}: { customer_membership_id: number; forced_expiration_date?: string }) =>
				text(
					await cancelCustomerMembership(
						token(),
						customer_membership_id,
						forced_expiration_date,
					),
				),
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
