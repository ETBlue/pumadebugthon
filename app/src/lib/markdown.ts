// Cell text keeps the Markdown of the analysis files (see build_json.py).
// stripMarkdown gives the plain text, for search and other plain uses.

/** Remove **bold** markers and `code` backticks, turn [text](url) into
 * text, and unescape \|. Uses parseMarkdown, so both read the text the same way. */
export function stripMarkdown(text: string): string {
  return plainText(parseMarkdown(text))
}

function plainText(tokens: MdToken[]): string {
  return tokens.map((tk) => (tk.type === 'text' || tk.type === 'code' ? tk.text : plainText(tk.children))).join('')
}

/** A piece of cell text. The UI maps each token to an element, so no HTML
 * from the data is ever inserted into the page. */
export type MdToken =
  | { type: 'text'; text: string }
  | { type: 'strong'; children: MdToken[] }
  | { type: 'link'; href: string; children: MdToken[] }
  | { type: 'code'; text: string }

const BOLD = /\*\*(.+?)\*\*/
const LINK = /\[([^\]]*)\]\(([^)]*)\)/
const CODE = /`([^`]+)`/
const EXTERNAL = /^https?:\/\//

/** Split Markdown text into tokens: **bold**, [text](url), `code` and plain text.
 * Text inside `code` is kept as it is (no bold or links inside).
 * Only http and https links become link tokens. Other links (for example a
 * #anchor in the analysis file) keep only their text. \| becomes |. */
export function parseMarkdown(text: string): MdToken[] {
  const tokens: MdToken[] = []
  let rest = text
  while (rest) {
    const bold = BOLD.exec(rest)
    const link = LINK.exec(rest)
    const code = CODE.exec(rest)
    const first = [code, bold, link].reduce<RegExpExecArray | null>(
      (best, m) => (m && (!best || m.index < best.index) ? m : best),
      null,
    )
    if (!first) {
      tokens.push({ type: 'text', text: rest })
      break
    }
    if (first.index > 0) tokens.push({ type: 'text', text: rest.slice(0, first.index) })
    if (first === code) {
      tokens.push({ type: 'code', text: first[1].replace(/\\\|/g, '|') })
      rest = rest.slice(first.index + first[0].length)
      continue
    }
    const children = parseMarkdown(first[1])
    if (first === bold) tokens.push({ type: 'strong', children })
    else if (EXTERNAL.test(first[2])) tokens.push({ type: 'link', href: first[2], children })
    else tokens.push(...children)
    rest = rest.slice(first.index + first[0].length)
  }
  return merge(tokens.map((tk) => (tk.type === 'text' ? { ...tk, text: tk.text.replace(/\\\|/g, '|') } : tk)))
}

/** Join text tokens that are next to each other. */
function merge(tokens: MdToken[]): MdToken[] {
  const out: MdToken[] = []
  for (const tk of tokens) {
    const last = out[out.length - 1]
    if (tk.type === 'text' && last?.type === 'text') out[out.length - 1] = { type: 'text', text: last.text + tk.text }
    else out.push(tk)
  }
  return out
}
