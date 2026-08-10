/**
 * generate-function-index.mjs
 *
 * Generates ssjs.guide/_data/ssjs_functions.yml — the row data behind the
 * searchable / filterable / sortable table on /function-index/.
 *
 * It replaces 496 hand-written Markdown rows that had to be edited by hand
 * whenever the catalog changed, so the page could (and did) claim things
 * ssjs-data no longer said.
 *
 * The traversal is shared with generate-site-index.mjs via lib/build-catalog.mjs,
 * so both artifacts always describe the same catalog.
 *
 * Run: node scripts/generate-function-index.mjs
 */

import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildCatalog, statusText } from './lib/build-catalog.mjs';

const { dirname, join } = path;
const __dirname = dirname(fileURLToPath(import.meta.url));
const GUIDE = join(__dirname, '../../ssjs.guide');

/**
 * Collect the explicit `{#anchor}` heading ids authored on a Markdown page.
 *
 * @param {string} mdPath - Absolute path to the Markdown file
 * @returns {Set.<string>} Set of anchor ids present on the page (no leading '#')
 */
function collectMarkdownAnchors(mdPath) {
    const anchors = new Set();
    if (!existsSync(mdPath)) {
        return anchors;
    }
    const md = readFileSync(mdPath, 'utf8');
    for (const match of md.matchAll(/\{#([a-z0-9-]+)\}/g)) {
        anchors.add(match[1]);
    }
    return anchors;
}

/**
 * Quote a value for safe single-line YAML output.
 *
 * @param {string|number} [value] - Value to quote
 * @returns {string} Double-quoted YAML scalar
 */
function q(value) {
    return `"${String(value ?? '')
        .replaceAll('\\', String.raw`\\`)
        .replaceAll('"', String.raw`\"`)
        .replaceAll(/\s*\n\s*/g, ' ')
        .trim()}"`;
}

const rows = buildCatalog()
    .map((record) => ({
        name: record.displayName,
        sortKey: record.sortKey,
        section: record.section,
        returnType: record.returnType,
        url: record.url,
        anchorId: record.anchorId,
        status: record.status,
        es: record.es,
        polyfill: record.polyfill,
        polyfillUrl: record.polyfillUrl,
        verified: record.verified,
        differsFromDocs: record.differsFromDocs,
        deprecated: record.deprecated,
        description: statusText(record),
    }))
    .toSorted((a, b) => a.sortKey.localeCompare(b.sortKey) || a.name.localeCompare(b.name));

// Anchor ids become DOM ids, so a duplicate would make in-page links ambiguous.
// Members that legitimately share a dotted name (a bare-name global and its
// Platform.Function twin) get a numeric suffix in emission order.
const seenAnchors = new Map();
for (const row of rows) {
    const count = seenAnchors.get(row.anchorId) ?? 0;
    seenAnchors.set(row.anchorId, count + 1);
    if (count > 0) {
        row.anchorId = `${row.anchorId}-${count + 1}`;
    }
}

let out = `# SSJS API catalog for /function-index/.
#
# AUTO-GENERATED — do not edit by hand.
# Regenerate with: node ssjs-data/scripts/generate-function-index.mjs
#
# Source of truth: ssjs-data/src/index.js (names, sections, return types,
# verification state) resolved through ssjs-data/scripts/lib/build-catalog.mjs,
# the same traversal that produces site-index.json.
#
# name is the call signature as documented: the catalog \`syntax\` for SFMC APIs,
# and MDN notation (Array.prototype.join(), Math.PI) for ECMAScript builtins.
# sortKey is that name lowercased without its parameter list, without a leading
# Platform(.Function). prefix and without < >, so instance members sort next to
# the statics of the same object.
#
# status is how the member behaves in the SFMC engine:
#   ok      — works as documented
#   partial — works with a caveat (description carries it)
#   missing — not available (description carries the workaround)
#   blocked — catalogued but has no working runtime invocation
# polyfill: true means a polyfill for it ships in the guide.
#
# verified: true means the entry completed a runtime verification sweep.

`;

for (const row of rows) {
    out += `- name: ${q(row.name)}\n`;
    out += `  sortKey: ${q(row.sortKey)}\n`;
    out += `  section: ${q(row.section)}\n`;
    out += `  returnType: ${q(row.returnType || '—')}\n`;
    out += `  url: ${q(row.url)}\n`;
    out += `  anchorId: ${q(row.anchorId)}\n`;
    out += `  status: ${q(row.status)}\n`;
    out += `  es: ${row.es === '' ? '""' : q(row.es)}\n`;
    out += `  polyfill: ${row.polyfill}\n`;
    out += `  polyfillUrl: ${q(row.polyfillUrl)}\n`;
    out += `  verified: ${row.verified}\n`;
    out += `  differsFromDocs: ${row.differsFromDocs}\n`;
    out += `  deprecated: ${row.deprecated}\n`;
    out += `  description: ${q(row.description)}\n`;
}

if (!existsSync(GUIDE)) {
    // eslint-disable-next-line no-console
    console.error(`ERROR: ssjs.guide not found at ${GUIDE} — nothing to write.`);
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1);
}

// Fail loudly if any polyfill deep-link points at an anchor that does not exist
// on the polyfills page, so a wrong slug never ships as a dead link.
const polyfillAnchors = collectMarkdownAnchors(join(GUIDE, 'engine-limitations/polyfills.md'));
const deadPolyfillLinks = rows
    .filter((row) => row.polyfill && row.polyfillUrl)
    .filter((row) => !polyfillAnchors.has(row.polyfillUrl.split('#', 2)[1] ?? ''))
    .map((row) => `${row.name} → ${row.polyfillUrl}`);
if (deadPolyfillLinks.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
        `ERROR: ${deadPolyfillLinks.length} polyfill link(s) point at a missing anchor on engine-limitations/polyfills.md:\n  ${deadPolyfillLinks.join('\n  ')}`,
    );
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1);
}

const target = join(GUIDE, '_data/ssjs_functions.yml');
writeFileSync(target, out.replaceAll('\r\n', '\n'), 'utf8');
// eslint-disable-next-line no-console
console.log(`Written ${rows.length} rows to ssjs.guide/_data/ssjs_functions.yml`);
