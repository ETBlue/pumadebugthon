// The gantt chart of the 工作分解與時程 (new step 7 format; design decision 182).
// The mermaid package is large, so it is loaded with a dynamic import(). Vite
// puts it in its own chunks, and the browser loads them only when a chart is
// shown (the 執行計畫 tab of a solution in the new format).
import type { Mermaid } from 'mermaid'
import type { Theme } from '@/lib/theme'

/** Loads the mermaid package. A test can pass its own loader. */
export type MermaidLoader = () => Promise<{ default: Mermaid }>

const loadMermaid: MermaidLoader = () => import('mermaid')

/** The mermaid theme for the page theme. 'neutral' is gray on a light page;
 * 'dark' has light text for the dark page. */
export function mermaidTheme(theme: Theme): 'neutral' | 'dark' {
  return theme === 'dark' ? 'dark' : 'neutral'
}

/** Renders the gantt source to SVG text. Returns null when the package does
 * not load or the source does not render; the caller then shows a short
 * error text, and the work breakdown table stays.
 * - id: a unique id for the SVG element (letters, digits and 「-」 only).
 * - securityLevel 'strict': mermaid removes HTML and scripts from the labels
 *   and turns off click events. The source itself is never put into the page
 *   as HTML; only the SVG that mermaid makes from it is.
 * - suppressErrorRendering: on a syntax error, mermaid does not add its own
 *   error picture to the page. */
export async function renderGantt(id: string, source: string, theme: Theme, load: MermaidLoader = loadMermaid): Promise<string | null> {
  try {
    const { default: mermaid } = await load()
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', suppressErrorRendering: true, theme: mermaidTheme(theme) })
    const { svg } = await mermaid.render(id, source)
    return svg
  } catch {
    return null
  }
}
