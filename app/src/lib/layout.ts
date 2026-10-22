// The page frame (design 3.1). Pure function.

/** True when a matched route asks for a full-width page (handle.fullWidth).
 * The home page uses it for its full-width hero, the three list pages for
 * the full-width ListBar band (decision 106), and the detail pages (issue,
 * stakeholder, story, solution, space) for the band with the back button
 * (decision 111). Other pages keep the centered column. */
export function isFullWidth(matches: { handle?: unknown }[]): boolean {
  return matches.some((m) => {
    const h = m.handle as { fullWidth?: unknown } | undefined
    return h?.fullWidth === true
  })
}
