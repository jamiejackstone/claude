import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";

declare global {
	interface Env {
		TEAMUP_M2M_TOKEN: string;
	}
}

// ---------------------------------------------------------------------------
// TeamUp (GoTeamUp) API client
//
// Fully confirmed 9 July via TeamUp's live API reference (Core > Events >
// List), read by Jamie using Claude in Chrome:
//
//   GET /events
//   Auth header: Authorization: Token <M2M_TOKEN>  (M2M tokens always run in
//     Provider mode under admin permissions -- no Teamup-Provider-ID header
//     needed for a single-provider account like ours)
//   Date filtering: starts_at_gte / starts_at_lte (ISO 8601), filters on the
//     event's start time -- the right pair for "what's on today"
//   Response: paginated ({ count, next, previous, results: [...] }), each
//     result has id, name, starts_at, ends_at, status, venue, is_full,
//     attending_count, max_occupancy, category, etc.
//
// This is TeamUp's native scheduled-events resource -- covers both regular
// classes and one-off sessions (e.g. summer camps).
//
// Known limitation for this first version: date boundaries below are UTC,
// not Europe/London -- during BST that's an hour off, so a class starting
// just after midnight UK time could fall into the wrong day. TeamUp also
// offers local_starts_at_gte/lte (filters in the venue's own timezone),
// which is almost certainly the better long-term fix -- worth switching to
// once this first version is proven working, rather than guessing the
// exact format it expects on this first pass.
// ---------------------------------------------------------------------------
const TEAMUP_API_BASE = "https://goteamup.com/api/v2";

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
	const start = new Date(event.starts_at).toLocaleTimeString("en-GB", {
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

	return `${start}-${end}  ${event.name}${category}  --  ${occupancy}  (${event.status})`;
}

async function listTodaysClasses(token: string): Promise<string> {
	const now = new Date();
	const startOfDay = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
	).toISOString();
	const endOfDay = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
	).toISOString();

	const params = new URLSearchParams({
		starts_at_gte: startOfDay,
		starts_at_lte: endOfDay,
		page_size: "100",
	});

	const response = await fetch(`${TEAMUP_API_BASE}/events?${params}`, {
		headers: {
			Authorization: `Token ${token}`,
			Accept: "application/json",
		},
	});

	if (!response.ok) {
		const body = await response.text();
		return `TeamUp API returned ${response.status}: ${body}`;
	}

	const data = (await response.json()) as TeamUpEventsResponse;

	if (data.results.length === 0) {
		return "Nothing scheduled today.";
	}

	const sorted = [...data.results].sort((a, b) =>
		a.starts_at.localeCompare(b.starts_at),
	);

	return `${data.count} session(s) today:\n\n${sorted.map(formatEvent).join("\n")}`;
}

// ---------------------------------------------------------------------------
// MCP server
// ---------------------------------------------------------------------------
export class HoopHeroesTeamUpMCP extends McpAgent<Env> {
	server = new McpServer({
		name: "Hoop Heroes TeamUp",
		version: "0.1.0",
	});

	async init() {
		this.server.registerTool(
			"list_todays_classes",
			{
				description:
					"List everything scheduled on TeamUp for today -- regular classes and any one-off sessions (e.g. camps) -- pulled live.",
				inputSchema: {},
			},
			async () => {
				const result = await listTodaysClasses(this.env.TEAMUP_M2M_TOKEN);
				return { content: [{ type: "text", text: result }] };
			},
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
