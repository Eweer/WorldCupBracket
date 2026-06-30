import teamDataRaw from './res/teamsInfo.json' with { type: 'json' };
import matchInfoRaw from './res/timetable.json' with { type: 'json' };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const WORKER_URL = "https://broad-surf-ce0e.eweer.workers.dev"

export interface TeamTranslations {
	en_US: string;
	es_ES: string;
	[locale: string]: string; // Fallback
};

export type TeamDictionary = Record<string, TeamTranslations>;

export const teamData = teamDataRaw as TeamDictionary

export type MatchLabel = "R16" | "R8" | "R4" | "SF" | "FINAL" | "3RD";

export interface MatchDef {
	id: number;
	/** IDs of the two source matches whose winners play here. Absent for R16. */
	src?: [number, number];
	label: MatchLabel;
}

export interface MatchInfo {
	id: number;
	dt: Date;
}
export interface NewMatchInfo {
	round: MatchLabel;
	datetime: Date;
	teamA: string;
	teamB: string;
	scoreA: number | undefined;
	scoreB: number | undefined;
	penaltiesA: number | undefined;
	penaltiesB: number | undefined;
	location: string;
	city: string;
}

type MatchTimetable = Record<number, NewMatchInfo>;

export const MatchesTimetable: MatchTimetable = Object.fromEntries(
	Object.entries(matchInfoRaw).map(([key, value]) => {
		const id = Number(key);
		const match: NewMatchInfo = {
			...value,
			round: value.round as MatchLabel,
			datetime: new Date(value.datetime),
			scoreA: value.scoreA !== "-1" ? Number(value.scoreA) : undefined,
			scoreB: value.scoreB !== "-1" ? Number(value.scoreB) : undefined,
			penaltiesA: value.penaltiesA !== "-1" ? Number(value.penaltiesA) : undefined,
			penaltiesB: value.penaltiesB !== "-1" ? Number(value.penaltiesB) : undefined,
		};

		return [id, match];
	})
);

export interface TeamResult_i {
	team: string;
	score: number;
}

export interface MatchResult_i {
	winner: TeamResult_i;
	runnerup: TeamResult_i;
}

export type MatchResults_t = Record<number, MatchResult_i>;

export interface BracketSubmitPayload {
	urlKey: string;
	predictions: Record<number, string>;
}

interface PredictionsResponse {
	urlKey: string;
	predictions: string;
}

interface ErrorResponse {
	error: string;
}

export async function fetchPredictions(uuid: string): Promise<Record<string, string>> {
	const response = await fetch(`${WORKER_URL}/?uuid=${encodeURIComponent(uuid)}`);
	if (!response.ok) {
		throw new Error(`Request failed with status ${response.status}`);
	}

	const data: PredictionsResponse | ErrorResponse = await response.json();

	if ("error" in data) {
		throw new Error(data.error);
	}
	if (data.urlKey !== uuid) {
		throw new Error("Sent/Received uuid missmatch.")
	}
	return JSON.parse(data.predictions);
}

// ---------------------------------------------------------------------------
// Bracket tree
// ---------------------------------------------------------------------------

// Round of 16 — the real first-round matches, teams are known
export const R16: MatchDef[] = [
	{ id: 73, label: "R16" },   // South Africa vs Canada
	{ id: 74, label: "R16" },   // Germany vs #3 Group A/B/C/D/F
	{ id: 75, label: "R16" },   // Netherlands vs Morocco
	{ id: 76, label: "R16" },   // Brazil vs Japan
	{ id: 77, label: "R16" },   // #1 Group I vs #3 Group C/D/F/G/H
	{ id: 78, label: "R16" },   // Ivory Coast vs #2 Group I
	{ id: 79, label: "R16" },   // Mexico vs #3 Group C/E/F/H/I
	{ id: 80, label: "R16" },   // #1 Group L vs #3 Group E/H/I/J/K
	{ id: 81, label: "R16" },   // United States vs Bosnia and Herzegovina
	{ id: 82, label: "R16" },   // #1 Group G vs #3 Group A/E/H/I/J
	{ id: 83, label: "R16" },   // #2 Group K vs #2 Group L
	{ id: 84, label: "R16" },   // #1 Group H vs #2 Group J
	{ id: 85, label: "R16" },   // Switzerland vs #3 Group E/F/G/I/J
	{ id: 86, label: "R16" },   // Argentina vs #2 Group H
	{ id: 87, label: "R16" },   // #1 Group K vs #3 Group D/E/I/J/L
	{ id: 88, label: "R16" },   // Australia vs #2 Group G
];

// Teams for each R16 match
export const R16_TEAMS: Record<number, [string, string]> = {
	73: ["RSA", "CAN"],
	74: ["GER", "PAR"],
	75: ["NED", "MAR"],
	76: ["BRA", "JPN"],
	77: ["FRA", "SWE"],
	78: ["CIV", "NOR"],
	79: ["MEX", "ECU"],
	80: ["ENG", "COD"],
	81: ["USA", "BIH"],
	82: ["BEL", "SEN"],
	83: ["POR", "CRO"],
	84: ["ESP", "AUT"],
	85: ["SUI", "ALG"],
	86: ["ARG", "CPV"],
	87: ["COL", "GHA"],
	88: ["AUS", "EGY"]
};

const R16_SORT_ORDER: number[] = [
	74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87
];

// Round of 8
const R8: MatchDef[] = [
	{ id: 89, src: [74, 77], label: "R8" },
	{ id: 90, src: [73, 75], label: "R8" },
	{ id: 91, src: [76, 78], label: "R8" },
	{ id: 92, src: [79, 80], label: "R8" },
	{ id: 93, src: [83, 84], label: "R8" },
	{ id: 94, src: [81, 82], label: "R8" },
	{ id: 95, src: [86, 88], label: "R8" },
	{ id: 96, src: [85, 87], label: "R8" },
];

const R8_SORT_ORDER: number[] = [
	89, 90, 93, 94, 91, 92, 95, 96
];

// Round of 4 (Quarter-finals)
const R4: MatchDef[] = [
	{ id: 97, src: [89, 90], label: "R4" },
	{ id: 98, src: [93, 94], label: "R4" },
	{ id: 99, src: [91, 92], label: "R4" },
	{ id: 100, src: [95, 96], label: "R4" },
];

const R4_SORT_ORDER: number[] = [
	97, 98, 99, 100
];

const SF: MatchDef[] = [
	{ id: 101, src: [97, 98], label: "SF" },
	{ id: 102, src: [99, 100], label: "SF" },
];

const SF_SORT_ORDER: number[] = [
	101, 102
];

export const THIRD: MatchDef = { id: 103, src: [101, 102], label: "3RD" };
const FINAL: MatchDef = { id: 104, src: [101, 102], label: "FINAL" };

export const ALL_MATCHES: MatchDef[] = [...R16, ...R8, ...R4, ...SF, FINAL, THIRD];

// ---------------------------------------------------------------------------
// Visual layout
// ---------------------------------------------------------------------------

function order_to_sorted(matches: MatchDef[], order: number[]): MatchDef[] {
	const orderMap = new Map<number, number>();
	order.forEach((id, index) => orderMap.set(id, index))
	return [...matches].sort((a, b) => {
		const indexA: number = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
		const indexB: number = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
		return indexA - indexB;
	})
};

const R16_SORTED: MatchDef[] = order_to_sorted(R16, R16_SORT_ORDER);
const R8_SORTED: MatchDef[] = order_to_sorted(R8, R8_SORT_ORDER);
const R4_SORTED: MatchDef[] = order_to_sorted(R4, R4_SORT_ORDER);
const SF_SORTED: MatchDef[] = order_to_sorted(SF, SF_SORT_ORDER);
export const MAPPED_MATCHES: MatchDef[][] = [
	R16_SORTED.slice(0, 8),   // col 0 – left  R16 top
	R8_SORTED.slice(0, 4),    // col 1 – left  R8
	R4_SORTED.slice(0, 2),    // col 2 – left  R4
	SF_SORTED.slice(0, 1),    // col 3 – left  SF
	[FINAL, THIRD],           // col 4 – Final
	SF_SORTED.slice(1, 2),    // col 5 – right SF
	R4_SORTED.slice(2, 4),    // col 6 – right R4
	R8_SORTED.slice(4, 8),    // col 7 – right R8
	R16_SORTED.slice(8, 16),  // col 8 – right R16 top
];
// Extra vertical padding per column index so matches fan out symmetrically
export const COL_VPAD: number[] = [
	6,    // col 0 – left  R16
	18,   // col 1 – left  R8
	52,   // col 2 – left  R4
	120,  // col 3 – left  SF
	16,    // col 4 – Final
	120,  // col 5 – right SF
	52,   // col 6 – right R4
	18,   // col 7 – right R8
	6     // col 8 – right R16
];

export const TOTAL_PICKS = ALL_MATCHES.length;

export const I18N = {
	en_US: {
		eyebrow: "FIFA",
		title: "World Cup Bracket",
		subtitle: `Click the winner team for each match`,
		matchNumber: (id: number) => `[${id}]`,
		thirdPlace: "3rd Place Match",
		final: "⚽ Final",
		semifinal: "Semi-finals",
		r4: "Quarterfinals",
		r8: "Round of 16",
		r16: "Round of 32",
		third: "3rd Place",
		submit: "Submit predictions",
		reset: "Reset all picks",
		legend: '<span style="color:#4ade80">▶</span> = predicted winner · green highlight = pick confirmed',
		toggleLang: "Español",
		swapTo: "Cambiar idioma a ",
		submitSuccess: "Winners sent successfully :) Good luck!",
		submitFailure: "ERROR: Could not send winners, try again in a few seconds. If the issue persists, please contact an admin.",
		picksMade: (picks: number, total: number) => `${picks}/${total} picks made`,
	},
	es_ES: {
		eyebrow: "FIFA",
		title: "Bracket del Mundial",
		subtitle: `Haz clic en el equipo ganador de cada partido`,
		matchNumber: (id: number) => `[${id}]`,
		thirdPlace: "Partido por el 3er puesto",
		final: "⚽ Final",
		semifinal: "Semifinales",
		r4: "Cuartos de final",
		r8: "Octavos de final",
		r16: "Dieciseisavos",
		third: "3er puesto",
		submit: "Enviar predicciones",
		reset: "Reiniciar selecciones",
		legend: '<span style="color:#4ade80">▶</span> = ganador predicho · verde = selección confirmada',
		toggleLang: "English",
		swapTo: "Swap language to ",
		submitSuccess: "Selecciones enviadas correctamente :) ¡Buena suerte!",
		submitFailure: "ERROR: No se pudo enviar las selecciones, inténtalo de nuevo en unos segundos. Si el problema persiste, contacta con un administrador.",
		picksMade: (picks: number, total: number) => `${picks}/${total} selecciones`,
	},
} as const;
