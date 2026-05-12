/**
 * Sanitize an arbitrary value for inclusion in a single-line log entry.
 * Strips CR/LF/TAB and truncates to `maxLen`. Returns "unknown" for null/undefined.
 * @param {unknown} value
 * @param {number} [maxLen=128]
 */
export function safeFragment(value, maxLen = 128) {
  if (value == null) return "unknown";
  return String(value).replace(/[\r\n\t]/g, " ").slice(0, maxLen);
}
