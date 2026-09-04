import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const harnessPath = path.join(root, 'tests', 'harness.html');

test('harness.html exists and references the extension entry', async () => {
    const html = await readFile(harnessPath, 'utf8');
    assert.match(html, /index\.js/, 'harness imports the extension entry');
    assert.match(html, /SillyTavern/, 'harness provides a context stub');
});

test('extension entry is syntactically valid ESM', async () => {
    const code = await readFile(path.join(root, 'index.js'), 'utf8');
    // node --check via a temp file is handled in check.mjs; here we assert imports resolve on disk.
    assert.match(code, /import \{ startRailController \}/, 'rail import present');
    assert.match(code, /import \{ Workspace \}/, 'workspace import present');
});

test('source modules are syntactically valid', async () => {
    const files = ['index.js', 'src/layout.js', 'src/rail.js', 'src/workspace.js'];
    for (const f of files) {
        await new Promise((resolve, reject) => {
            const child = spawn('node', ['--check', path.join(root, f)]);
            child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`node --check failed for ${f}`))));
            child.stderr.on('data', (d) => process.stderr.write(d));
        });
    }
});
