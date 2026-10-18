import { describe, expect, it } from 'vitest'
import { parseTokens } from './tokens'

const css = `
:root {
    color-scheme: light;
    --background: #fdf6e3; /* base3 */
    /* a comment with --fake: #000000; inside */
    --watermark-opacity: 0.08;
}

.dark {
    --background: #002b36;
}
@media print { .x { --background: red; } }
`

describe('parseTokens', () => {
  it('reads the custom properties of one block, without comments', () => {
    expect(parseTokens(css, ':root')).toEqual({ background: '#fdf6e3', 'watermark-opacity': '0.08' })
  })

  it('reads the dark block on its own', () => {
    expect(parseTokens(css, '.dark')).toEqual({ background: '#002b36' })
  })

  it('throws when the block is missing', () => {
    expect(() => parseTokens(css, '.sepia')).toThrow()
  })
})
