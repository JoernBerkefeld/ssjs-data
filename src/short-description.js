/**
 * short-description.js
 *
 * Turns a catalog `description` / `caveat` / `suggestion` into a one-line teaser
 * that fits a table cell and a search-result snippet.
 *
 * The naive `/^[^.!?]+[.!?]/` sentence splitter this replaces cut at the first
 * dot of a dotted identifier, so `Array.prototype.filter is not available.`
 * became `Array.` — useless in a search index and in a table.
 */

/**
 * A `.`/`!`/`?` only ends a sentence when whitespace (or the end of the text)
 * follows it. Dots inside `Array.prototype.filter` are followed by a letter and
 * are therefore never candidates.
 */
const SENTENCE_TERMINATOR = /[.!?](?=\s|$)/g;

/**
 * Trailing token that makes a candidate terminator an abbreviation dot rather
 * than a sentence end (`e.g.`, `i.e.`, `vs.`, a single initial).
 */
const ABBREVIATION = /(?:^|[\s("'[])(?:[A-Za-z]|[A-Za-z]\.[A-Za-z]|vs|etc|approx)$/i;

/**
 * A leading `Owner.member is/are …` restatement. The Name column already shows
 * the qualified name, so repeating it in the teaser wastes the whole cell.
 */
const QUALIFIED_RESTATEMENT = /^[A-Za-z_$][\w$]*(?:\.[\w$]+)+(?:\(\))?\s+(?:is|are)\s+/;

/**
 * Index just past the first real sentence terminator.
 *
 * @param {string} text - Single-line text
 * @returns {number} Exclusive end index, or -1 when the text has no terminator
 */
function sentenceEnd(text) {
    SENTENCE_TERMINATOR.lastIndex = 0;
    for (const match of text.matchAll(SENTENCE_TERMINATOR)) {
        if (match[0] === '.' && ABBREVIATION.test(text.slice(0, match.index))) {
            continue;
        }
        return match.index + 1;
    }
    return -1;
}

/**
 * Drop a leading `Owner.member is/are` restatement and re-capitalise what is left.
 *
 * @param {string} text - First sentence
 * @returns {string} Sentence without the restatement
 */
function stripRestatement(text) {
    const stripped = text.replace(QUALIFIED_RESTATEMENT, '');
    if (stripped === text || stripped.length === 0) {
        return text;
    }
    return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

/**
 * Cut at the last word boundary that still fits and mark the cut with an ellipsis.
 *
 * @param {string} text - Text to shorten
 * @param {number} maxLength - Maximum length before the ellipsis is appended
 * @returns {string} Text of at most `maxLength + 1` characters
 */
function truncate(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }
    const window = text.slice(0, maxLength);
    const lastSpace = window.lastIndexOf(' ');
    const head = lastSpace > 0 ? window.slice(0, lastSpace) : window;
    return `${head.replace(/[\s,;:.!?—–-]+$/, '')}\u{2026}`;
}

/**
 * Build a one-line teaser from a catalog text.
 *
 * @param {string} [text] - Raw `description`, `caveat` or `suggestion` text
 * @param {number} [maxLength] - Maximum length before truncation (default 70)
 * @returns {string} Teaser, or an empty string when there is no text
 */
export function shortDescription(text, maxLength = 70) {
    if (!text) {
        return '';
    }
    const flat = String(text).replaceAll(/\s+/g, ' ').trim();
    if (flat.length === 0) {
        return '';
    }
    const end = sentenceEnd(flat);
    const sentence = end === -1 ? flat : flat.slice(0, end);
    return truncate(stripRestatement(sentence), maxLength);
}
