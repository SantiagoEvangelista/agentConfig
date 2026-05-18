import { complete } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { convertToLlm, serializeConversation } from "@earendil-works/pi-coding-agent";
import { buildCodexCompactPrompt, shouldAutoCompact } from "./src/utils";

const THRESHOLD_RATIO = 0.7;
const STATUS_KEY = "codex-compact";

export default function (pi: ExtensionAPI) {
	let compactionQueued = false;

	pi.registerCommand("codex-compact", {
		description: "Run Codex-style compaction now",
		handler: async (args, ctx) => {
			ctx.compact({
				customInstructions: args || "Use Codex-style dense handoff format.",
				onComplete: () => ctx.ui.notify("Codex-style compaction completed", "info"),
				onError: (error) => ctx.ui.notify(`Codex-style compaction failed: ${error.message}`, "error"),
			});
		},
	});

	pi.on("before_agent_start", async (_event, ctx) => {
		if (compactionQueued) return;
		const usage = ctx.getContextUsage();
		if (!shouldAutoCompact(usage, { thresholdRatio: THRESHOLD_RATIO })) return;

		compactionQueued = true;
		const percent = usage?.percent == null ? "high" : `${usage.percent.toFixed(1)}%`;
		ctx.ui.setStatus(STATUS_KEY, "auto-compacting…");
		ctx.ui.notify(`Context is ${percent}; queuing Codex-style auto-compact`, "info");
		ctx.compact({
			customInstructions: "Automatic Codex-style handoff. Preserve current task state, user preferences, exact file paths, commands, and next steps.",
			onComplete: () => {
				compactionQueued = false;
				ctx.ui.setStatus(STATUS_KEY, undefined);
				ctx.ui.notify("Codex-style auto-compact completed", "info");
			},
			onError: (error) => {
				compactionQueued = false;
				ctx.ui.setStatus(STATUS_KEY, undefined);
				ctx.ui.notify(`Codex-style auto-compact failed: ${error.message}`, "error");
			},
		});
	});

	pi.on("session_before_compact", async (event, ctx) => {
		const { preparation, customInstructions, signal } = event;
		const { messagesToSummarize, turnPrefixMessages, tokensBefore, firstKeptEntryId, previousSummary, fileOps } = preparation;

		const model = ctx.modelRegistry.find("google", "gemini-2.5-flash") ?? ctx.model;
		if (!model) return;

		const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
		if (!auth.ok || !auth.apiKey) {
			ctx.ui.notify("Codex-style compaction has no model auth; using Pi default compaction", "warning");
			return;
		}

		const allMessages = [...messagesToSummarize, ...turnPrefixMessages];
		const conversationText = serializeConversation(convertToLlm(allMessages));
		const modifiedFiles = [...(fileOps?.written ?? []), ...(fileOps?.edited ?? [])].filter(Boolean).sort();
		const modifiedSet = new Set(modifiedFiles);
		const readFiles = [...(fileOps?.read ?? [])].filter((file) => file && !modifiedSet.has(file)).sort();
		const files = { readFiles, modifiedFiles };
		const prompt = buildCodexCompactPrompt({
			conversationText,
			previousSummary,
			customInstructions,
			readFiles: files.readFiles,
			modifiedFiles: files.modifiedFiles,
		});

		ctx.ui.setStatus(STATUS_KEY, "summarizing…");
		ctx.ui.notify(`Codex-style compaction: summarizing ${allMessages.length} messages`, "info");

		try {
			const response = await complete(
				model,
				{
					messages: [
						{
							role: "user" as const,
							content: [{ type: "text" as const, text: prompt }],
							timestamp: Date.now(),
						},
					],
				},
				{ apiKey: auth.apiKey, headers: auth.headers, maxTokens: 8192, signal },
			);

			const summary = response.content
				.filter((item): item is { type: "text"; text: string } => item.type === "text")
				.map((item) => item.text)
				.join("\n")
				.trim();

			if (!summary) return;

			return {
				compaction: {
					summary,
					firstKeptEntryId,
					tokensBefore,
					details: {
						style: "codex",
						thresholdRatio: THRESHOLD_RATIO,
						readFiles: files.readFiles,
						modifiedFiles: files.modifiedFiles,
					},
				},
			};
		} catch (error) {
			if (!signal?.aborted) {
				const message = error instanceof Error ? error.message : String(error);
				ctx.ui.notify(`Codex-style compaction failed, using Pi default: ${message}`, "warning");
			}
			return;
		} finally {
			ctx.ui.setStatus(STATUS_KEY, undefined);
		}
	});
}
