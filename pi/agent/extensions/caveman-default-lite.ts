import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type CavemanLevel = "off" | "lite" | "full" | "ultra";

let currentLevel: CavemanLevel = "lite";

const INSTRUCTIONS: Record<Exclude<CavemanLevel, "off">, string> = {
	lite: `Caveman Lite Mode: Keep grammar. Drop filler words like "just", "really", "basically", "actually", "simply". Remove pleasantries like "sure", "certainly", "of course", "happy to". Professional but no fluff.`,
	full: `Caveman Mode: Drop articles (a, an, the). Drop filler. Drop pleasantries. Use short synonyms. No hedging. Fragments fine. Technical terms stay exact. Code blocks unchanged.`,
	ultra: `Caveman Ultra Mode: Maximum compression. Telegraphic. Drop almost everything. Technical terms exact.`,
};

function formatLevel(level: CavemanLevel): string {
	switch (level) {
		case "off": return "Caveman default off.";
		case "lite": return "Caveman Lite default active.";
		case "full": return "Caveman Full active.";
		case "ultra": return "Caveman Ultra active.";
	}
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		currentLevel = "lite";
		ctx.ui.setStatus("caveman", "lite");
	});

	pi.on("input", async (event, ctx) => {
		const text = event.text.toLowerCase();
		let nextLevel: CavemanLevel | undefined;

		if (text.includes("stop caveman") || text.includes("normal mode") || text.includes("/caveman off")) {
			nextLevel = "off";
		} else if (text.includes("/caveman ultra") || (text.includes("caveman") && text.includes("ultra"))) {
			nextLevel = "ultra";
		} else if (text.includes("/caveman full") || (text.includes("caveman") && text.includes("full"))) {
			nextLevel = "full";
		} else if (text.includes("/caveman lite") || text.includes("caveman mode") || text.includes("talk like caveman") || text.includes("use caveman") || text.includes("less tokens") || text.includes("be brief") || text.includes("fewer tokens")) {
			nextLevel = "lite";
		}

		if (!nextLevel) return;
		currentLevel = nextLevel;
		ctx.ui.setStatus("caveman", currentLevel === "off" ? undefined : currentLevel);
		ctx.ui.notify(formatLevel(currentLevel), "info");
	});

	pi.on("before_agent_start", async () => {
		if (currentLevel === "off") return;
		return {
			message: {
				role: "user" as const,
				content: [{ type: "text" as const, text: `[CAVEMAN DEFAULT ${currentLevel.toUpperCase()}: ${INSTRUCTIONS[currentLevel]}]` }],
				display: false,
			},
		};
	});
}
