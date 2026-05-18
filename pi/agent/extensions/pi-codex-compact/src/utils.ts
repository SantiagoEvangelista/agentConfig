import type { ContextUsage } from "@earendil-works/pi-coding-agent";

export interface AutoCompactConfig {
	thresholdRatio: number;
}

export interface CodexPromptOptions {
	conversationText: string;
	previousSummary?: string;
	customInstructions?: string;
	readFiles?: string[];
	modifiedFiles?: string[];
}

export function shouldAutoCompact(usage: ContextUsage | undefined, config: AutoCompactConfig): boolean {
	if (!usage || typeof usage.tokens !== "number" || typeof usage.contextWindow !== "number") return false;
	if (usage.contextWindow <= 0) return false;
	return usage.tokens / usage.contextWindow >= config.thresholdRatio;
}

export function buildCodexCompactPrompt(options: CodexPromptOptions): string {
	const previous = options.previousSummary?.trim()
		? `\n\nPrevious compacted summary:\n${options.previousSummary.trim()}`
		: "";
	const custom = options.customInstructions?.trim()
		? `\n\nAdditional user instructions for this compaction:\n${options.customInstructions.trim()}`
		: "";
	const readFiles = formatFileBlock("read-files", options.readFiles);
	const modifiedFiles = formatFileBlock("modified-files", options.modifiedFiles);

	return `You are a Codex-style conversation compactor. Condense the conversation into a compact state handoff that lets the next assistant continue without needing old messages.${previous}${custom}

Write concise, information-dense Markdown with exactly these sections:

## Goal
Current user objective and desired outcome.

## Current State
What has already happened, including important commands, files, errors, and results.

## Decisions & Preferences
User preferences, constraints, repo conventions, and decisions that must be preserved.

## Outstanding Work
Concrete next steps, open questions, and blockers.

## Critical Details
Specific paths, symbols, commands, settings, IDs, and facts likely needed later.

Rules:
- Preserve instructions and behavioral directives from the user.
- Preserve exact file paths and commands when relevant.
- Prefer bullets over prose.
- Do not mention that information was omitted.
- Do not continue the task; only summarize state.

${readFiles}

${modifiedFiles}

<conversation>
${options.conversationText}
</conversation>`;
}

function formatFileBlock(tag: string, files: string[] | undefined): string {
	const unique = [...new Set(files ?? [])].filter(Boolean).sort();
	return `<${tag}>\n${unique.join("\n")}\n</${tag}>`;
}
