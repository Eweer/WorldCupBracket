import {
  ALL_MATCHES,
  BracketSubmitPayload,
  COL_VPAD,
  COLUMNS,
  FINAL,
  MatchDef,
  R16_TEAMS,
  teamData,
  THIRD,
  TOTAL_PICKS,
  I18N,
} from "./data.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPlaceholder(name: string): boolean {
  return name.startsWith("#") || name.startsWith("TBD") || name.startsWith("Winner") || name.startsWith("Loser");
}

function getTeams(
  matchId: number,
  winners: Record<number, string>
): [string, string] {
  if (R16_TEAMS[matchId]) return R16_TEAMS[matchId];
  const match = ALL_MATCHES.find((m) => m.id === matchId);
  if (!match?.src) return ["TBD", "TBD"];

  if (matchId === THIRD.id) {
    return match.src.map((srcId) => {
      const [a, b] = getTeams(srcId, winners);
      const w = winners[srcId];
      if (!w) return `Loser M${srcId}`;
      return w === a ? b : a;
    }) as [string, string]
  }
  return match.src.map(
    (srcId) => winners[srcId] ?? `Winner M${srcId}`
  ) as [string, string];
}

function buildPayload(winners: Record<number, string>): BracketSubmitPayload {
  return {
    winners,
    finalists: null,
    champion: winners[FINAL.id] ?? null,
    thirdPlace: winners[THIRD.id] ?? null,
  };
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let winners: Record<number, string> = {};
let selected: number | null = null;
let onSubmitCallback: ((payload: BracketSubmitPayload) => void) | null = null;
let lang: "en_US" | "es_ES" = "en_US"

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
    content = team[lang] || team['en_US'] || content;
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
  ]
}

// ---------------------------------------------------------------------------
// Match card
// ---------------------------------------------------------------------------

function renderCard(match: MatchDef): HTMLElement {
  const [teamA, teamB] = getTeams(match.id, winners);
  const isHighlighted = selected === match.id;
  const winner = winners[match.id];
  const isFinal = match.label === "FINAL";
  const isThird = match.label === "3RD";

  const card = el("div", {
    background: isHighlighted ? "#1a2a1a" : "#0f1a0f",
    border: `1px solid ${isHighlighted ? "#4ade80" : "#1f3a1f"}`,
    borderRadius: "8px",
    padding: "6px 10px",
    cursor: "pointer",
    minWidth: "170px",
    maxWidth: "200px",
    boxShadow: isHighlighted ? "0 0 12px #4ade8044" : "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
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
  labelEl.appendChild(
    text(isFinal ? I18N[lang].final : isThird ? I18N[lang].third : I18N[lang].matchNumber(match.id))
  );
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
      fontSize: "11px",
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
    row.addEventListener("click", (e) => {
      if (isPlaceholder(teamA) || isPlaceholder(teamB))
        return;
      e.stopPropagation();
      winners[match.id] = team;
      selected = null;
      render();
    });

    if (isWinner) {
      const arrow = el("span", { color: "#4ade80", fontSize: "10px" });
      arrow.appendChild(text("▶"));
      row.appendChild(arrow);
    }
    row.appendChild(text(team));
    card.appendChild(row);
  }

  return card;
}

// ---------------------------------------------------------------------------
// Full render
// ---------------------------------------------------------------------------

function render(): void {
  const root = document.getElementById("bracket-root");
  if (!root) return;
  root.innerHTML = "";

  const picksCount = Object.keys(winners).length;

  // ── Header ──────────────────────────────────────────────────────────────
  const header = el("div", { textAlign: "center", marginBottom: "28px" });

  const langBtn = el("button", {
    position: "absolute",
    top: "60px",
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

  const flagImg = el("img",
    { width: "24px", height: "auto", display: "block" },
    { src: lang === "en_US" ? "flags/ESP.png" : "flags/USA.png", alt: I18N[lang].toggleLang }
  );

  langBtn.appendChild(text(`${I18N[lang].swapTo} `))
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

  const sub = el("p", { fontSize: "12px", color: "#4b7a4b", marginTop: "6px" });
  sub.appendChild(text(I18N[lang].subtitle(picksCount, TOTAL_PICKS)));
  header.appendChild(sub);

  root.appendChild(header);

  // ── 3rd Place ────────────────────────────────────────────────────────────
  const thirdSection = el("div", { textAlign: "center", marginBottom: "20px" });
  const thirdLabel = el("div", {
    fontSize: "10px",
    color: "#94a3b8",
    letterSpacing: "2px",
    marginBottom: "8px",
    textTransform: "uppercase",
  });
  thirdLabel.appendChild(text(I18N[lang].thirdPlace));
  thirdSection.appendChild(thirdLabel);

  const thirdWrap = el("div", { display: "inline-block" });
  thirdWrap.appendChild(renderCard(THIRD));
  thirdSection.appendChild(thirdWrap);
  root.appendChild(thirdSection);

  // ── Main bracket ─────────────────────────────────────────────────────────
  const scrollWrap = el("div", { overflowX: "auto", paddingBottom: "8px" });
  const bracketRow = el("div", {
    display: "flex",
    alignItems: "stretch",
    minWidth: "1280px",
    justifyContent: "center",
  });

  const COLUMN_LABELS = get_column_labels()
  COLUMNS.forEach((colMatches, ci) => {
    const col = el("div", {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "0 4px",
    });

    // Column label
    const colLabel = el("div", {
      fontSize: "9px",
      letterSpacing: "2px",
      color: "#4ade80",
      textTransform: "uppercase",
      marginBottom: "12px",
      fontWeight: "700",
      opacity: ci === 0 || ci === 6 ? "1" : ci === 3 ? "0.6" : "0.8",
    });

    colLabel.appendChild(text(COLUMN_LABELS[ci]!));
    col.appendChild(colLabel);

    // Matches
    const matchCol = el("div", {
      display: "flex",
      flexDirection: "column",
      flex: "1",
      justifyContent: "space-around",
      gap: ci === 3 ? "16px" : "0",
    });

    for (const m of colMatches) {
      const vpad = COL_VPAD[ci] ?? 12;
      const wrap = el("div", {
        margin: "auto 0",
        padding: `${vpad}px 0`,
      });
      wrap.appendChild(renderCard(m));
      matchCol.appendChild(wrap);
    }

    col.appendChild(matchCol);
    bracketRow.appendChild(col);
  });

  scrollWrap.appendChild(bracketRow);
  root.appendChild(scrollWrap);

  // ── Footer ───────────────────────────────────────────────────────────────
  const footer = el("div", {
    textAlign: "center",
    marginTop: "32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  });

  const submitBtn = el("button", {
    background: picksCount > 0 ? "#166534" : "#1f3a1f",
    border: "none",
    color: picksCount > 0 ? "#bbf7d0" : "#4b7a4b",
    borderRadius: "8px",
    padding: "10px 28px",
    cursor: picksCount > 0 ? "pointer" : "not-allowed",
    fontSize: "14px",
    fontWeight: "700",
    letterSpacing: "0.5px",
    transition: "background 0.2s",
  });
  submitBtn.appendChild(text(I18N[lang].submit));
  submitBtn.disabled = picksCount === 0;
  submitBtn.addEventListener("click", () => {
    if (onSubmitCallback) onSubmitCallback(buildPayload(winners));
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
      winners = {};
      selected = null;
      render();
    });
    footer.appendChild(resetBtn);
  }

  const legend = el("p", { fontSize: "11px", color: "#4b7a4b", margin: "0" });
  legend.innerHTML =
    I18N[lang].legend;
  footer.appendChild(legend);

  root.appendChild(footer);
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
  winners = {};
  selected = null;
  onSubmitCallback = onSubmit;

  // Create the root div inside the given container
  const root = document.createElement("div");
  root.id = "bracket-root";
  containerElement.appendChild(root);

  render();
}
