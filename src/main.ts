import { mountBracket } from "./bracket.js";
import type { BracketSubmitPayload } from "./data.js";

const app = document.getElementById("app");
if (!app) throw new Error("#app element not found");

mountBracket(app, (payload: BracketSubmitPayload) => {
  // ── Replace this with your own submission logic ──────────────────────────
  //
  // payload.winners     → Record<number, string>  (matchId → winner name)
  // payload.finalists   → [string, string] | null
  // payload.champion    → string | null
  // payload.thirdPlace  → string | null
  //
  // Examples:
  //   fetch("/api/predictions", { method: "POST", body: JSON.stringify(payload) })
  //   localStorage.setItem("picks", JSON.stringify(payload))
  //   googleSheetsSubmit(payload)
  //
  console.log("Bracket submitted:", payload);
  alert(`Champion pick: ${payload.champion ?? "none yet"}`);
});
