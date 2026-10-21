import { createHashRouter } from 'react-router'
import { Layout } from '@/components/Layout'
import About from '@/pages/About'
import Home from '@/pages/Home'
import Issue from '@/pages/Issue'
import Issues from '@/pages/Issues'
import LegacySolution from '@/pages/LegacySolution'
import Placeholder from '@/pages/Placeholder'
import RouteError from '@/pages/RouteError'
import Solution from '@/pages/Solution'
import Solutions from '@/pages/Solutions'
import Space from '@/pages/Space'
import Stakeholder from '@/pages/Stakeholder'
import StakeholderStory from '@/pages/StakeholderStory'
import Stakeholders from '@/pages/Stakeholders'

// Hash URLs (#/issues/2) work on GitHub Pages without server rewrites.
export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    // A page that breaks shows a short message inside the page frame, so the
    // header and the footer stay. No stack trace.
    errorElement: (
      <Layout>
        <RouteError />
      </Layout>
    ),
    children: [
      // The home page has a full-width hero (design 3.1).
      { index: true, element: <Home />, handle: { fullWidth: true } },
      { path: 'issues', element: <Issues /> },
      // The old solution URL redirects to #/solutions/<n>-<code> (design
      // 3.12). More specific than the tab route, so it wins.
      { path: 'issues/:number/solutions/:code/:tab?', element: <LegacySolution /> },
      // The issue page also redirects the old tabs opinion, conflicts and
      // stakeholders (legacyIssueTab).
      { path: 'issues/:number/:tab?', element: <Issue /> },
      // A moved stakeholder ID redirects on every sub-route (design 3.3).
      // There is no want or need page (decision 45). #/stakeholders and the
      // stakeholder page have no side bar, so they are plain routes
      // (decisions 87 and 94).
      { path: 'stakeholders', element: <Stakeholders /> },
      { path: 'stakeholders/:id/stories/:number/:storyId', element: <StakeholderStory /> },
      { path: 'stakeholders/:id/:tab?', element: <Stakeholder /> },
      { path: 'solutions', element: <Solutions /> },
      // 2-A: a solution of an issue. X-A: a cross-issue solution (Task N11).
      { path: 'solutions/:slug/:tab?', element: <Solution /> },
      { path: 'spaces/:code', element: <Space /> },
      { path: 'about', element: <About /> },
      // Unknown pages, also the removed #/wants and #/needs (design 3.7).
      { path: '*', element: <Placeholder /> },
    ],
  },
])
