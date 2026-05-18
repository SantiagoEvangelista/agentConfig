import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

assert.equal(mod.shouldAutoCompact({ tokens: 70, contextWindow: 100 }, { thresholdRatio: 0.65 }), true);
assert.equal(mod.shouldAutoCompact({ tokens: 64, contextWindow: 100 }, { thresholdRatio: 0.65 }), false);
assert.equal(mod.shouldAutoCompact(undefined, { thresholdRatio: 0.65 }), false);
assert.equal(mod.shouldAutoCompact({ tokens: 70 }, { thresholdRatio: 0.65 }), false);

const prompt = mod.buildCodexCompactPrompt({
  conversationText: '[User]: fix bug',
  previousSummary: 'Old summary',
  customInstructions: 'Focus on tests',
  readFiles: ['src/a.ts'],
  modifiedFiles: ['src/b.ts'],
});

assert.match(prompt, /Codex-style conversation compactor/);
assert.match(prompt, /Previous compacted summary/);
assert.match(prompt, /Focus on tests/);
assert.match(prompt, /<read-files>\nsrc\/a\.ts\n<\/read-files>/);
assert.match(prompt, /<modified-files>\nsrc\/b\.ts\n<\/modified-files>/);
assert.match(prompt, /\[User\]: fix bug/);

console.log('utils tests passed');
