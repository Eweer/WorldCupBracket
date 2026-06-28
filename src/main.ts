import { mountBracket, lang } from "./bracket.js";
import { I18N, type BracketSubmitPayload } from "./data.js";

const WORKER_URL = "https://broad-surf-ce0e.eweer.workers.dev"

const app = document.getElementById("app");
if (!app) {
  throw new Error("#app element not found");
}

mountBracket(app, async (payload: BracketSubmitPayload) => {
  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
      mode: "no-cors",
      redirect: "follow"
    });
    alert(I18N[lang].submitSuccess);
  } catch (err) {
    alert(I18N[lang].submitFailure)
    console.log(err)
  }
  console.log("Bracket submitted:", payload);
});
