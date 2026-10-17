// Cell text keeps the Markdown of the analysis files (see build_json.py).
// stripMarkdown gives the plain text, for search and other plain uses.

/** Remove **bold** markers, turn [text](url) into text, and unescape \|. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\\\|/g, '|')
}
