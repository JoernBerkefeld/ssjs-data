/**
 * generate-site-index.mjs
 *
 * Generates dist/site-index.json — a static search index and link catalog
 * for ssjs.guide, derived from the ssjs-data source arrays.
 *
 * Each entry carries: name, url, section, type, description, params
 * (and optionally: aliases, deprecated).
 *
 * The catalog traversal itself lives in scripts/lib/build-catalog.mjs and is
 * shared with generate-function-index.mjs; this script only projects those rich
 * records down to the published JSON shape and validates every URL/anchor.
 *
 * The JSON array is written to:
 *   - ssjs-data/dist/site-index.json  (npm package export at ./site-index.json)
 *   - ssjs.guide/site-index.json      (static website asset served at /site-index.json)
 *
 * Run: node scripts/generate-site-index.mjs
 */

import { writeFileSync, mkdirSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildCatalog } from './lib/build-catalog.mjs';
import { shortDescription } from '../src/short-description.js';

const { dirname, join } = path;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const GUIDE = join(__dirname, '../../ssjs.guide');

// ── Project the shared catalog down to the published index shape ───────────

const index = buildCatalog().map((entry) => {
    const record = {
        name: entry.name,
        url: entry.url,
        section: entry.section,
        type: entry.type,
    };
    if (!entry.entry) {
        return record;
    }

    record.description = shortDescription(entry.descriptionSource);
    const params = (entry.entry.params || []).map((p) => p.name);
    if (params.length > 0) {
        record.params = params;
    }
    if (entry.entry.deprecated) {
        record.deprecated = true;
    }
    return record;
});

// ── Validate URLs against ssjs.guide ──────────────────────────────────────

/**
 * Reproduce kramdown's automatic heading-ID algorithm: drop leading non-letters,
 * strip every character outside `[a-zA-Z0-9 -]`, turn spaces into hyphens and
 * lowercase the result.
 *
 * @param {string} headingText - Raw heading text (without the leading `#`s)
 * @returns {string} The auto-generated anchor slug (may be empty)
 */
function kramdownAutoId(headingText) {
    return headingText
        .replace(/^[^a-zA-Z]+/, '')
        .replaceAll(/[^a-zA-Z0-9 -]/g, '')
        .replaceAll(' ', '-')
        .toLowerCase();
}

/**
 * Collect every anchor a Markdown page renders: explicit `{#id}` heading
 * attributes, kramdown's automatic heading IDs, and raw HTML `id="…"` values.
 * Fenced code blocks are skipped so `# comment` lines inside samples are ignored.
 *
 * @param {string} content - Full Markdown file content (including frontmatter)
 * @returns {Set.<string>} Anchor slugs available on the rendered page
 */
function collectPageAnchors(content) {
    const anchors = new Set();
    let isInFence = false;
    for (const line of content.split(/\r?\n/)) {
        if (/^\s*(```|~~~)/.test(line)) {
            isInFence = !isInFence;
            continue;
        }

        if (isInFence) {
            continue;
        }

        const headingMatch = line.match(/^#{1,6}\s+(.*)$/);
        if (headingMatch) {
            const text = headingMatch[1].trim();
            const explicit = text.match(/\{#([^}]+)\}\s*$/);
            if (explicit) {
                anchors.add(explicit[1].trim());
            } else {
                const auto = kramdownAutoId(text);
                if (auto) {
                    anchors.add(auto);
                }
            }
        }

        for (const idMatch of line.matchAll(/\bid="([^"]+)"/g)) {
            anchors.add(idMatch[1]);
        }
    }

    return anchors;
}

/**
 * Walk the ssjs.guide folder and collect all known page URLs (canonical only)
 * together with the anchors each page renders.
 * Explicit `permalink:` frontmatter values take precedence; otherwise the URL
 * is derived from the file path using Jekyll's pretty-URL rule.
 * Skips Jekyll special directories (`_*`), `assets`, `node_modules`, and `.`-prefixed dirs.
 *
 * @param {string} guideRoot - Absolute path to the ssjs.guide directory
 * @returns {Map.<string, Set.<string>>} Site-relative guide page URL → anchors on that page
 */
function collectGuidePages(guideRoot) {
    /**
     * @type {Map<string, Set.<string>>}
     */
    const pages = new Map();

    /**
     * @param {string} dir - directory to walk
     */
    function walk(dir) {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                if (
                    !entry.name.startsWith('_') &&
                    !entry.name.startsWith('.') &&
                    entry.name !== 'assets' &&
                    entry.name !== 'node_modules'
                ) {
                    walk(fullPath);
                }
            } else if (entry.name.endsWith('.md')) {
                const content = readFileSync(fullPath, 'utf8');
                const permalinkMatch = content.match(/^permalink:\s*(\S+)\s*$/m);
                let urlPath;
                if (permalinkMatch) {
                    urlPath = permalinkMatch[1].trim();
                } else {
                    // Derive URL from file path — Jekyll's pretty-URLs rule
                    const relative = fullPath.slice(guideRoot.length).replaceAll('\\', '/');
                    urlPath = relative.replace(/\.md$/, '');
                    if (urlPath === '/index') {
                        urlPath = '/';
                    } else if (urlPath.endsWith('/index')) {
                        urlPath = urlPath.slice(0, -'index'.length);
                    } else {
                        urlPath += '/';
                    }
                }

                const anchors = pages.get(urlPath) ?? new Set();
                for (const anchor of collectPageAnchors(content)) {
                    anchors.add(anchor);
                }

                pages.set(urlPath, anchors);
            }
        }
    }

    walk(guideRoot);
    return pages;
}

if (existsSync(GUIDE)) {
    const guidePages = collectGuidePages(GUIDE);
    // Entries flagged `external` point at off-site docs (e.g. MDN) and have no
    // ssjs.guide page to validate.
    const localEntries = index.filter((entry) => !entry.external);

    const missingPages = localEntries.filter(
        (entry) => !guidePages.has(entry.url.split('#', 1)[0]),
    );
    const missingAnchors = localEntries.filter((entry) => {
        const [page, anchor] = entry.url.split('#', 2);
        const anchors = guidePages.get(page);
        return anchor && anchors && !anchors.has(anchor);
    });

    if (missingPages.length > 0 || missingAnchors.length > 0) {
        /**
         * @param {string} heading - error section heading
         * @param {{url: string, name: string}[]} entries - failing index entries
         */
        const report = (heading, entries) => {
            if (entries.length === 0) {
                return;
            }

            const byUrl = new Map();
            for (const entry of entries) {
                if (!byUrl.has(entry.url)) {
                    byUrl.set(entry.url, []);
                }

                byUrl.get(entry.url).push(entry.name);
            }

            // eslint-disable-next-line no-console
            console.error('');
            // eslint-disable-next-line no-console
            console.error(heading);
            for (const [url, names] of byUrl) {
                // eslint-disable-next-line no-console
                console.error(`  ${url}`);
                // eslint-disable-next-line no-console
                console.error(`    → referenced by: ${names.join(', ')}`);
            }
        };

        report('ERROR: Generated URLs not found in ssjs.guide:', missingPages);
        report('ERROR: Generated anchors not found on their ssjs.guide page:', missingAnchors);

        // eslint-disable-next-line no-console
        console.error('');
        // eslint-disable-next-line no-console
        console.error('Fix: update ssjs-data/src/urls.js to match ssjs.guide page structure');
        // eslint-disable-next-line no-console
        console.error('     (or add the missing heading anchor to the guide page),');
        // eslint-disable-next-line no-console
        console.error('     then run: npm run generate:all');
        // eslint-disable-next-line unicorn/no-process-exit
        process.exit(1);
    }

    // eslint-disable-next-line no-console
    console.log(`Validated ${index.length} URLs and anchors against ssjs.guide (all present).`);
}

// ── Write output ───────────────────────────────────────────────────────────
const distDir = join(ROOT, 'dist');
mkdirSync(distDir, { recursive: true });

const json = JSON.stringify(index, null, 2) + '\n';

const distPath = join(distDir, 'site-index.json');
writeFileSync(distPath, json, 'utf8');
// eslint-disable-next-line no-console
console.log(`Written ${index.length} entries to dist/site-index.json`);

const guidePath = join(GUIDE, 'site-index.json');
writeFileSync(guidePath, json, 'utf8');
// eslint-disable-next-line no-console
console.log(`Copied to ssjs.guide/site-index.json`);
