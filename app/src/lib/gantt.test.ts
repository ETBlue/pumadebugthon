// renderGantt with a fake mermaid package. The real package needs a browser
// DOM, and the tests run in Node.
import { describe, expect, it, vi } from 'vitest'
import type { Mermaid } from 'mermaid'
import { mermaidTheme, renderGantt, type MermaidLoader } from './gantt'

function fakeLoader(render: (id: string, text: string) => Promise<{ svg: string }>) {
  const initialize = vi.fn()
  const mermaid = { initialize, render } as unknown as Mermaid
  const load: MermaidLoader = () => Promise.resolve({ default: mermaid })
  return { load, initialize }
}

describe('renderGantt (decision 182)', () => {
  it('returns the SVG and sets up mermaid with strict security and no start on load', async () => {
    const render = vi.fn(async (id: string) => ({ svg: `<svg id="${id}"></svg>` }))
    const { load, initialize } = fakeLoader(render)
    expect(await renderGantt('gantt-r1', 'gantt\n  title x', 'light', load)).toBe('<svg id="gantt-r1"></svg>')
    expect(initialize).toHaveBeenCalledWith({ startOnLoad: false, securityLevel: 'strict', suppressErrorRendering: true, theme: 'neutral' })
    expect(render).toHaveBeenCalledWith('gantt-r1', 'gantt\n  title x')
  })

  it('uses the dark mermaid theme on the dark page', async () => {
    const { load, initialize } = fakeLoader(async () => ({ svg: '<svg></svg>' }))
    await renderGantt('g', 'gantt', 'dark', load)
    expect(initialize.mock.calls[0][0]).toMatchObject({ theme: 'dark', securityLevel: 'strict' })
    expect(mermaidTheme('light')).toBe('neutral')
  })

  it('returns null when the source does not render', async () => {
    const { load } = fakeLoader(async () => {
      throw new Error('Parse error on line 3')
    })
    expect(await renderGantt('g', 'gantt\n  bad', 'light', load)).toBeNull()
  })

  it('returns null when the package does not load', async () => {
    const load: MermaidLoader = () => Promise.reject(new Error('Failed to fetch dynamically imported module'))
    expect(await renderGantt('g', 'gantt', 'light', load)).toBeNull()
  })
})
