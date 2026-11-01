// The routes of the app (router.tsx). Task U3 adds #/domains and
// #/solution-types, built from the same page bodies as #/spaces.
import { isValidElement, type ReactElement } from 'react'
import type { RouteObject } from 'react-router'
import { describe, expect, it } from 'vitest'
import Space from '@/pages/Space'
import Spaces from '@/pages/Spaces'
import TypeList from '@/pages/TypeList'
import TypePage from '@/pages/TypePage'
import { routes } from './routes'

const children: RouteObject[] = routes[0].children ?? []

/** The element of the route with this path. */
function elementOf(path: string): ReactElement<{ kind?: string }> {
  const route = children.find((r) => r.path === path)
  expect(route, path).toBeDefined()
  expect(isValidElement(route!.element)).toBe(true)
  return route!.element as ReactElement<{ kind?: string }>
}

describe('the routes', () => {
  it('keep #/spaces and the space page', () => {
    expect(elementOf('spaces').type).toBe(Spaces)
    expect(elementOf('spaces/:code/:tab?').type).toBe(Space)
  })

  it('add #/domains and #/domains/<code>/<tab> with the kind domain', () => {
    expect(elementOf('domains').type).toBe(TypeList)
    expect(elementOf('domains').props.kind).toBe('domain')
    expect(elementOf('domains/:code/:tab?').type).toBe(TypePage)
    expect(elementOf('domains/:code/:tab?').props.kind).toBe('domain')
  })

  it('add #/solution-types and #/solution-types/<code>/<tab> with the kind solutionType', () => {
    expect(elementOf('solution-types').type).toBe(TypeList)
    expect(elementOf('solution-types').props.kind).toBe('solutionType')
    expect(elementOf('solution-types/:code/:tab?').type).toBe(TypePage)
    expect(elementOf('solution-types/:code/:tab?').props.kind).toBe('solutionType')
  })

  it('are full width, like the other list and detail pages', () => {
    for (const path of ['domains', 'domains/:code/:tab?', 'solution-types', 'solution-types/:code/:tab?']) {
      expect(children.find((r) => r.path === path)?.handle).toEqual({ fullWidth: true })
    }
  })

  it('keep the catch-all not-found route last, with no redirect', () => {
    expect(children[children.length - 1].path).toBe('*')
  })
})
