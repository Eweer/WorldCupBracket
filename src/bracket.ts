import {
	ALL_MATCHES,
	BracketSubmitPayload,
	COL_VPAD,
	MAPPED_MATCHES,
	MatchDef,
	teamData,
	TOTAL_PICKS,
	I18N,
	MatchesTimetable,
	MatchResults_t,
	NewMatchInfo,
} from "./data.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPlaceholder(name: string): boolean {
	return name.startsWith("#")
		|| name.startsWith("TBD")
		|| name.startsWith("Winner")
		|| name.startsWith("Loser")
		|| name.startsWith("Runner-up");
}

function get_team(str: string, matchId: number): string {
	const [team, id] = fmt_team_text(str, matchId);
	if (id === matchId) {
		return team;
	} else {
		if (team.startsWith("W")) {
			return predictions[id]?.winner.team ?? team;
		} else {
			return predictions[id]?.runnerup.team ?? team;
		}
	}

}

function fmt_team_text(str: string, id: number): [string, number] {
	const pattern = /(W|RU)(\d{2,3})/
	const m = str.match(pattern);
	let ret = "";
	if (m !== null && m.length >= 3) {
		return [`${m[1] == "W" ? "Winner" : "Runner-up"} M${m[2]}`, Number(m[2])];
	}
	return [str, id];
}

function getTeams(matchId: number): [string, string] {
	const matchInfo = MatchesTimetable[matchId]!;
	return [
		get_team(matchInfo.teamA, matchId),
		get_team(matchInfo.teamB, matchId),
	];
}

function isAnyTeamOf(team: string, matchId: number): boolean {
	const [tA, tB] = getTeams(matchId);
	return (tA === team || tB === team)
}

function getWinner(match: NewMatchInfo): string | undefined {
	if (match.scoreA === undefined || match.scoreB === undefined) {
		return undefined;
	}
	if (match.scoreA === match.scoreB) {
		if (match.penaltiesA === undefined || match.penaltiesB === undefined) {
			return undefined;
		}
		if (match.penaltiesA > match.penaltiesB) {
			return match.teamA;
		}
		return match.teamB;
	}
	if (match.scoreA > match.scoreB) {
		return match.teamA;
	}
	return match.teamB;
}

function buildPayload(predictions: MatchResults_t): BracketSubmitPayload {
	const urlKey = window.location.pathname.split("/").filter(Boolean).pop() ?? "";
	let winners: Record<number, string> = {};
	for (const [id, info] of Object.entries(predictions)) {
		winners[Number(id)] = info.winner.team;
	}
	return { urlKey, predictions: winners };
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let onSubmitCallback: ((payload: BracketSubmitPayload) => void) | null = null;
export let lang: "en_US" | "es_ES" = "en_US";
let mobileRoundIndex: number = 0;
let predictions: MatchResults_t = {};

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	styles?: Partial<CSSStyleDeclaration>,
	attrs?: Record<string, string>
): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	if (styles) Object.assign(node.style, styles);
	if (attrs) {
		for (const [k, v] of Object.entries(attrs)) {
			node.setAttribute(k, v);
		}
	}
	return node;
}

function text(content: string): Text {
	if (content in teamData) {
		const team = teamData[content]!;
		content = team[lang] || team["en_US"] || content;
	}
	return document.createTextNode(content);
}

function get_column_labels(): string[] {
	return [
		I18N[lang].r16,
		I18N[lang].r8,
		I18N[lang].r4,
		I18N[lang].semifinal,
		I18N[lang].final,
		I18N[lang].semifinal,
		I18N[lang].r4,
		I18N[lang].r8,
		I18N[lang].r16,
	];
}

function isMobile(): boolean {
	return window.innerWidth < 768;
}

// ---------------------------------------------------------------------------
// Match card (shared between desktop and mobile)
// ---------------------------------------------------------------------------

function renderCard(match: MatchDef, compact: boolean = false): HTMLElement {
	const [teamA, teamB] = getTeams(match.id);
	const timeNow = new Date();
	const matchInfo = MatchesTimetable[match.id]!;

	const hasBeenPlayed = matchInfo.datetime < timeNow
	const canPickWinner = !(isPlaceholder(teamA) || isPlaceholder(teamB))
	const isHighlighted = !hasBeenPlayed && canPickWinner;
	const hasScore = (matchInfo.scoreA !== undefined && matchInfo.scoreB !== undefined);
	const winner = !hasScore ? predictions[match.id]?.winner.team : getWinner(matchInfo)!;
	const isFinal = match.label === "FINAL";
	const isThird = match.label === "3RD";

	const card = el("div", {
		background: isHighlighted ? "#1a2a1a" : "#0f1a0f",
		border: `1px solid ${isHighlighted ? "#4ade80" : "#1f3a1f"}`,
		borderRadius: "8px",
		padding: compact ? "8px 10px" : "6px 10px",
		...(compact ? { width: "100%" } : { minWidth: "180px", maxWidth: "180px" }),
		boxShadow: isHighlighted ? "0 0 12px #4ade8044" : "none",
		transition: "border-color 0.2s, box-shadow 0.2s",
		boxSizing: "border-box",
		opacity: hasBeenPlayed ? "0.4" : "1"
	});
	card.dataset["matchId"] = String(match.id);
	card.classList.add("match-card");

	// Label row
	const labelEl = el("div", {
		fontSize: "9px",
		color: isFinal ? "#f59e0b" : isThird ? "#94a3b8" : "#4ade80",
		fontWeight: "700",
		marginBottom: "4px",
		letterSpacing: "1.5px",
		textTransform: "uppercase",
	});
	let matchName = isFinal ? I18N[lang].final : isThird ? I18N[lang].third : I18N[lang].matchNumber(match.id)
	if (matchInfo !== undefined) {
		const timeInfo = Intl.DateTimeFormat(lang.replace('_', '-'), {
			weekday: "short",
			day: "numeric",
			month: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false
		}).format(matchInfo.datetime)
		labelEl.appendChild(
			text(`${matchName} ${timeInfo}`)
		);
	} else {
		labelEl.appendChild(
			text(`${matchName}`)
		);
	}

	card.appendChild(labelEl);

	// Team rows
	for (const team of [teamA, teamB]) {
		const isWinner = winner === team;
		const row = el("button", {
			background: isWinner ? "#14532d" : "transparent",
			border: "none",
			color: isPlaceholder(team) ? "#4b7a4b" : "#d1fae5",
			borderRadius: "4px",
			padding: "3px 6px",
			cursor: "pointer",
			fontSize: "12px",
			width: "100%",
			textAlign: "left",
			marginTop: "2px",
			display: "flex",
			boxSizing: "border-box",
			alignItems: "center",
			gap: "6px",
			lineHeight: "1",
			fontStyle: isPlaceholder(team) ? "italic" : "normal",
			fontWeight: isWinner ? "700" : "400",
		});
		if (!hasBeenPlayed && canPickWinner) {
			row.addEventListener("click", (e) => {
				const deleteWinners = (team: string, matchId: number): void => {
					let toDelete: number[] = [];
					for (const keyStr in predictions) {
						const key = Number(keyStr);
						if (key >= matchId && isAnyTeamOf(team, key))
							toDelete.push(key);
					};
					toDelete.forEach((k) => { delete predictions[k]; });
				}
				e.stopPropagation();
				if (match.id in predictions) {
					const oldWinner = predictions[match.id]!.winner.team;
					if (oldWinner === team) {
						deleteWinners(oldWinner, match.id);
					} else {
						predictions[match.id] = {
							winner: { team: teamA === team ? teamA : teamB, score: 1 },
							runnerup: { team: oldWinner, score: 0 }
						};
					}
				} else {
					predictions[match.id] = {
						winner: { team: team, score: 1 },
						runnerup: { team: teamA === team ? teamB : teamA, score: 0 }
					};
				}
				render();
			});
		}

		if (isWinner) {
			const arrow = el("span", { color: "#4ade80", fontSize: "10px" });
			arrow.appendChild(text("▶"));
			row.appendChild(arrow);
		}
		row.appendChild(text(team));
		if (!isPlaceholder(team)) {
			const scoreEl = el("span", {
				fontSize: "12px",
				alignItems: "center",
				marginLeft: "auto",
				textAlign: "left",
				display: "flex",
				gap: "6px",
			});
			if (hasBeenPlayed) {
				if (matchInfo.teamA == team && matchInfo.scoreA !== undefined)
					if (matchInfo.penaltiesA !== undefined)
						scoreEl.append(text(`${matchInfo.scoreA} (${matchInfo.penaltiesA})`))
					else
						scoreEl.append(text(`${matchInfo.scoreA}`))
				else if (matchInfo.teamB == team && matchInfo.scoreB !== undefined)
					if (matchInfo.penaltiesB !== undefined)
						scoreEl.append(text(`${matchInfo.scoreB} (${matchInfo.penaltiesB})`))
					else
						scoreEl.append(text(`${matchInfo.scoreB}`))
				else
					scoreEl.append(text("??"))
			}
			const flagImg = el(
				"img",
				{
					width: "24px",
					height: "auto",
					display: "block",
					marginLeft: "auto",
					border: "1px solid rgba(255,255,255,0.4)",
					borderRadius: "2px",
				},
				{ src: `flags/${team}.png`, alt: teamData[team]![lang] }
			);
			scoreEl.appendChild(flagImg);
			row.appendChild(scoreEl);
		}
		card.appendChild(row);
	}

	return card;
}

// ---------------------------------------------------------------------------
// Shared header
// ---------------------------------------------------------------------------

function renderHeader(): HTMLElement {
	const header = el("div", { textAlign: "center", marginBottom: "20px", position: "relative" });

	const langBtn = el("button", {
		position: "absolute",
		top: "0",
		right: "0",
		background: "transparent",
		border: "1px solid #1f3a1f",
		color: "#4ade80",
		borderRadius: "6px",
		padding: "5px 10px",
		cursor: "pointer",
		fontSize: "11px",
		fontWeight: "600",
		display: "flex",
		alignItems: "center",
		gap: "5px",
	});

	const flagImg = el(
		"img",
		{ width: "20px", height: "auto", display: "block" },
		{ src: lang === "en_US" ? "flags/ESP.png" : "flags/USA.png", alt: I18N[lang].toggleLang }
	);

	langBtn.appendChild(text(`${I18N[lang].swapTo} `));
	langBtn.appendChild(flagImg);
	langBtn.addEventListener("click", () => {
		lang = lang === "en_US" ? "es_ES" : "en_US";
		render();
	});
	header.appendChild(langBtn);

	const eyebrow = el("div", {
		fontSize: "10px",
		letterSpacing: "4px",
		color: "#4ade80",
		marginBottom: "6px",
		paddingTop: "4px",
		textTransform: "uppercase",
	});
	eyebrow.appendChild(text(I18N[lang].eyebrow));
	header.appendChild(eyebrow);

	const h1 = el("h1", {
		fontSize: "24px",
		fontWeight: "800",
		color: "#f0fdf4",
		paddingTop: "8px",
		margin: "0",
		letterSpacing: "-1px",
	});
	h1.appendChild(text(I18N[lang].title));
	header.appendChild(h1);

	return header;
}

// ---------------------------------------------------------------------------
// Shared footer
// ---------------------------------------------------------------------------

function renderFooter(picksCount: number): HTMLElement {
	const footer = el("div", {
		textAlign: "center",
		marginTop: "16px",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "12px",
	});

	const picks = el("p", { fontSize: "12px", color: "#4b7a4b", marginTop: "6px" });
	const timeNow = new Date();
	const maxPicks = Object.values(MatchesTimetable).filter((v) => {
		return v.datetime >= timeNow && getWinner(v) !== undefined;
	}).length;
	picks.appendChild(text(I18N[lang].picksMade(picksCount, maxPicks)));
	footer.appendChild(picks);

	const submitBtn = el("button", {
		background: picksCount >= maxPicks ? "#166534" : "#1f3a1f",
		border: "none",
		color: picksCount >= maxPicks ? "#bbf7d0" : "#4b7a4b",
		borderRadius: "8px",
		padding: "10px 28px",
		cursor: "pointer",
		fontSize: "14px",
		fontWeight: "700",
		letterSpacing: "0.5px",
		transition: "background 0.2s",
	});
	submitBtn.appendChild(text(I18N[lang].submit));
	submitBtn.disabled = picksCount === 0;
	submitBtn.addEventListener("click", () => {
		if (onSubmitCallback) {
			onSubmitCallback(buildPayload(predictions));
		}
	});
	footer.appendChild(submitBtn);

	if (picksCount > 0) {
		const resetBtn = el("button", {
			background: "transparent",
			border: "1px solid #1f3a1f",
			color: "#4b7a4b",
			borderRadius: "6px",
			padding: "6px 16px",
			cursor: "pointer",
			fontSize: "12px",
		});
		resetBtn.appendChild(text(I18N[lang].reset));
		resetBtn.addEventListener("click", () => {
			predictions = {};
			render();
		});
		footer.appendChild(resetBtn);
	}

	const legend = el("p", { fontSize: "11px", color: "#4b7a4b", margin: "0" });
	legend.innerHTML = I18N[lang].legend;
	footer.appendChild(legend);

	return footer;
}

// ---------------------------------------------------------------------------
// Mobile render
// ---------------------------------------------------------------------------

interface MobileRound {
	label: string;
	matches: MatchDef[];
	allMatchIds: Set<number>;
}

function getMobileRounds(): MobileRound[] {
	// Import the sorted match arrays from MAPPED_MATCHES
	// col 0+8 = R16, col 1+7 = R8, col 2+6 = R4, col 3+5 = SF, col 4 = Final+3rd
	const r16 = [...(MAPPED_MATCHES[0] ?? []), ...(MAPPED_MATCHES[8] ?? [])];
	const r8 = [...(MAPPED_MATCHES[1] ?? []), ...(MAPPED_MATCHES[7] ?? [])];
	const r4 = [...(MAPPED_MATCHES[2] ?? []), ...(MAPPED_MATCHES[6] ?? [])];
	const sf = [...(MAPPED_MATCHES[3] ?? []), ...(MAPPED_MATCHES[5] ?? [])];
	const fin = MAPPED_MATCHES[4] ?? [];

	return [
		{ label: I18N[lang].r16, matches: r16, allMatchIds: new Set(r16.map(m => m.id)) },
		{ label: I18N[lang].r8, matches: r8, allMatchIds: new Set(r8.map(m => m.id)) },
		{ label: I18N[lang].r4, matches: r4, allMatchIds: new Set(r4.map(m => m.id)) },
		{ label: I18N[lang].semifinal, matches: sf, allMatchIds: new Set(sf.map(m => m.id)) },
		{ label: I18N[lang].final, matches: fin, allMatchIds: new Set(fin.map(m => m.id)) },
	];
}

function renderMobile(root: HTMLElement): void {
	const picksCount = Object.keys(predictions).length;

	// Header
	root.appendChild(renderHeader());

	// Build rounds
	const rounds = getMobileRounds();
	if (mobileRoundIndex >= rounds.length) mobileRoundIndex = 0;

	// Progress bar
	const progressWrap = el("div", {
		width: "100%",
		background: "#0a120a",
		borderRadius: "4px",
		height: "4px",
		marginBottom: "16px",
		overflow: "hidden",
	});
	const progressFill = el("div", {
		width: `${Math.round((picksCount / TOTAL_PICKS) * 100)}%`,
		height: "100%",
		background: "#4ade80",
		borderRadius: "4px",
		transition: "width 0.3s",
	});
	progressWrap.appendChild(progressFill);
	root.appendChild(progressWrap);

	// Round tabs
	const tabBar = el("div", {
		display: "flex",
		gap: "4px",
		marginBottom: "16px",
		overflowX: "auto",
		paddingBottom: "2px",
	});

	rounds.forEach((round, i) => {
		// Count picks in this round
		const roundPicks = [...round.allMatchIds].filter(id => id in predictions).length;
		const roundTotal = round.matches.length;
		const isActive = i === mobileRoundIndex;
		const isDone = roundPicks === roundTotal;

		const tab = el("button", {
			flex: "0 0 auto",
			background: isActive ? "#166534" : isDone ? "#0f2a0f" : "#0a150a",
			border: `1px solid ${isActive ? "#4ade80" : isDone ? "#1a4a1a" : "#1f3a1f"}`,
			color: isActive ? "#bbf7d0" : isDone ? "#4ade80" : "#4b7a4b",
			borderRadius: "6px",
			padding: "6px 10px",
			cursor: "pointer",
			fontSize: "10px",
			fontWeight: isActive ? "700" : "500",
			letterSpacing: "0.5px",
			whiteSpace: "nowrap",
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			gap: "2px",
		});

		const tabLabel = document.createTextNode(round.label);
		tab.appendChild(tabLabel);

		const tabCount = el("span", {
			fontSize: "9px",
			color: isActive ? "#86efac" : "#2a4a2a",
		});
		tabCount.appendChild(document.createTextNode(`${roundPicks}/${roundTotal}`));
		tab.appendChild(tabCount);

		tab.addEventListener("click", () => {
			mobileRoundIndex = i;
			render();
		});
		tabBar.appendChild(tab);
	});
	root.appendChild(tabBar);

	// Active round matches
	const currentRound = rounds[mobileRoundIndex]!;
	const matchList = el("div", {
		display: "flex",
		flexDirection: "column",
		gap: "8px",
		width: "100%",
	});

	for (const match of currentRound.matches) {
		matchList.appendChild(renderCard(match, true));
	}
	root.appendChild(matchList);

	// Next round button (if not on last tab and all picks done in this round)
	const roundPicks = [...currentRound.allMatchIds].filter(id => id in predictions).length;
	const roundDone = roundPicks === currentRound.matches.length;
	if (roundDone && mobileRoundIndex < rounds.length - 1) {
		const nextBtn = el("button", {
			background: "#166534",
			border: "none",
			color: "#bbf7d0",
			borderRadius: "8px",
			padding: "10px 24px",
			cursor: "pointer",
			fontSize: "13px",
			fontWeight: "700",
			marginTop: "8px",
			width: "100%",
		});
		nextBtn.appendChild(text(`${rounds[mobileRoundIndex + 1]!.label} →`));
		nextBtn.addEventListener("click", () => {
			mobileRoundIndex += 1;
			render();
		});
		root.appendChild(nextBtn);
	}

	// Footer
	root.appendChild(renderFooter(picksCount));
}

// ---------------------------------------------------------------------------
// Desktop render
// ---------------------------------------------------------------------------

function renderDesktop(root: HTMLElement): void {
	const picksCount = Object.keys(predictions).length;

	// ── Header ──────────────────────────────────────────────────────────────
	const header = el("div", { textAlign: "center", marginBottom: "28px", position: "relative" });

	const langBtn = el("button", {
		position: "absolute",
		top: "20px",
		right: "130px",
		background: "transparent",
		border: "1px solid #1f3a1f",
		color: "#4ade80",
		borderRadius: "6px",
		padding: "5px 12px",
		cursor: "pointer",
		fontSize: "12px",
		fontWeight: "600",
		display: "flex",
		alignItems: "center",
		gap: "6px",
	});

	const flagImg = el(
		"img",
		{ width: "24px", height: "auto", display: "block" },
		{ src: lang === "en_US" ? "flags/ESP.png" : "flags/USA.png", alt: I18N[lang].toggleLang }
	);

	langBtn.appendChild(text(`${I18N[lang].swapTo} `));
	langBtn.appendChild(flagImg);
	langBtn.addEventListener("click", () => {
		lang = lang === "en_US" ? "es_ES" : "en_US";
		render();
	});
	header.appendChild(langBtn);

	const eyebrow = el("div", {
		fontSize: "10px",
		letterSpacing: "4px",
		color: "#4ade80",
		marginBottom: "6px",
		textTransform: "uppercase",
	});
	eyebrow.appendChild(text(I18N[lang].eyebrow));
	header.appendChild(eyebrow);

	const h1 = el("h1", {
		fontSize: "28px",
		fontWeight: "800",
		color: "#f0fdf4",
		margin: "0",
		letterSpacing: "-1px",
	});
	h1.appendChild(text(I18N[lang].title));
	header.appendChild(h1);

	root.appendChild(header);

	// ── Main bracket ─────────────────────────────────────────────────────────
	const scrollWrap = el("div", { overflowX: "auto", paddingBottom: "8px" });
	const bracketRow = el("div", {
		display: "flex",
		alignItems: "stretch",
		minWidth: "800px",
		justifyContent: "center",
	});

	const COLUMN_LABELS = get_column_labels();
	MAPPED_MATCHES.forEach((matchColumn, index) => {
		const column = el("div", {
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			padding: "0 4px",
			justifyContent: "center",
		});

		const columnHeader = el("div", {
			fontSize: "12px",
			letterSpacing: "2px",
			color: "#0baf47",
			textTransform: "uppercase",
			marginBottom: "12px",
			fontWeight: "900",
		});

		if (index === 4) {
			column.style.position = "relative";
			columnHeader.style.position = "absolute";
			columnHeader.style.top = "0";
		}

		columnHeader.appendChild(text(COLUMN_LABELS[index]!));
		column.appendChild(columnHeader);

		const matchesInColumn = el("div", {
			display: "flex",
			alignItems: "center",
			flexDirection: "column",
			...(index !== 4 ? { flex: "1" } : { marginTop: "124px" }),
		});

		for (let i = 0; i < matchColumn.length; i++) {
			const match = matchColumn[i]!;
			const vpad = COL_VPAD[index] ?? 12;
			const wrap = el("div", {
				margin: "auto 0",
				padding: `${vpad}px 0`,
			});
			wrap.appendChild(renderCard(match));
			matchesInColumn.appendChild(wrap);

			if (i % 2 === 1 && i < matchColumn.length - 1) {
				matchesInColumn.appendChild(el("div", { height: "12px" }));
			}
		}

		column.appendChild(matchesInColumn);
		bracketRow.appendChild(column);
	});

	scrollWrap.appendChild(bracketRow);
	root.appendChild(scrollWrap);

	// ── Footer ───────────────────────────────────────────────────────────────
	const footer = el("div", {
		textAlign: "center",
		marginTop: "0px",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: "12px",
	});

	const picks = el("p", { fontSize: "12px", color: "#4b7a4b", marginTop: "6px" });
	const timeNow = new Date();
	const maxPicks = Object.values(MatchesTimetable).filter((v) => {
		return v.datetime > timeNow && getWinner(v) === undefined;
	}).length;
	picks.appendChild(text(I18N[lang].picksMade(picksCount, maxPicks)));
	footer.appendChild(picks);

	const submitBtn = el("button", {
		background: picksCount >= maxPicks ? "#166534" : "#1f3a1f",
		border: "none",
		color: picksCount >= maxPicks ? "#bbf7d0" : "#4b7a4b",
		borderRadius: "8px",
		padding: "10px 28px",
		cursor: "pointer",
		fontSize: "14px",
		fontWeight: "700",
		letterSpacing: "0.5px",
		transition: "background 0.2s",
	});
	submitBtn.appendChild(text(I18N[lang].submit));
	submitBtn.disabled = picksCount === 0;
	submitBtn.addEventListener("click", () => {
		if (onSubmitCallback) onSubmitCallback(buildPayload(predictions));
	});
	footer.appendChild(submitBtn);

	if (picksCount > 0) {
		const resetBtn = el("button", {
			background: "transparent",
			border: "1px solid #1f3a1f",
			color: "#4b7a4b",
			borderRadius: "6px",
			padding: "6px 16px",
			cursor: "pointer",
			fontSize: "12px",
		});
		resetBtn.appendChild(text(I18N[lang].reset));
		resetBtn.addEventListener("click", () => {
			predictions = {};
			render();
		});
		footer.appendChild(resetBtn);
	}

	const legend = el("p", { fontSize: "11px", color: "#4b7a4b", margin: "0" });
	legend.innerHTML = I18N[lang].legend;
	footer.appendChild(legend);

	root.appendChild(footer);
}

// ---------------------------------------------------------------------------
// Full render (dispatches to mobile or desktop)
// ---------------------------------------------------------------------------

function render(): void {
	const root = document.getElementById("bracket-root");
	if (!root) return;

	const scrollY = window.scrollY;
	root.innerHTML = "";

	if (isMobile()) {
		renderMobile(root);
		window.scrollTo({ top: scrollY, behavior: "instant" });
	} else {
		renderDesktop(root);
	}
}

// ---------------------------------------------------------------------------
// Resize listener (debounced)
// ---------------------------------------------------------------------------

let resizeTimer: ReturnType<typeof setTimeout> | null = null;
function onResize(): void {
	if (resizeTimer !== null) clearTimeout(resizeTimer);
	resizeTimer = setTimeout(() => {
		render();
	}, 150);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Mount the bracket into `containerElement` and register a submit handler.
 *
 * @example
 * import { mountBracket } from "./bracket.js";
 * mountBracket(document.getElementById("app")!, (payload) => {
 *   console.log(payload);
 * });
 */
export function mountBracket(
	containerElement: HTMLElement,
	onSubmit: (payload: BracketSubmitPayload) => void
): void {
	// Reset state so multiple mounts on the same page are independent
	predictions = {};
	mobileRoundIndex = 0;
	onSubmitCallback = onSubmit;

	// Create the root div inside the given container
	const root = document.createElement("div");
	root.id = "bracket-root";
	containerElement.appendChild(root);

	// Listen for resize to swap between layouts
	window.addEventListener("resize", onResize);

	render();
}
