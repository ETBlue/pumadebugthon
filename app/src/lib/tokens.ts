// Reads the design tokens (CSS custom properties) from index.css, so tests
// can check their contrast (design 3.10). Pure function.

/** The custom properties set directly in the first block with this selector,
 * for example ':root' or '.dark'. Names are returned without the leading '--'. */
export function parseTokens(css: string, selector: string): Record<string, string> {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const block = new RegExp(`(^|[\\s}])${escaped}\\s*\\{([^}]*)\\}`).exec(clean)
  if (!block) throw new Error(`No block for ${selector}`)
  const tokens: Record<string, string> = {}
  for (const m of block[2].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) tokens[m[1]] = m[2].trim()
  return tokens
}
