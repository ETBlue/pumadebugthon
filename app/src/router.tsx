import { createHashRouter } from 'react-router'
import { Layout } from '@/components/Layout'
import Home from '@/pages/Home'
import Issue from '@/pages/Issue'
import Issues from '@/pages/Issues'
import Placeholder from '@/pages/Placeholder'
import RouteError from '@/pages/RouteError'
import Solution from '@/pages/Solution'
import Solutions from '@/pages/Solutions'
import Space from '@/pages/Space'
import Stakeholder from '@/pages/Stakeholder'
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
      // A solution page. More specific than the tab route, so it wins.
      { path: 'issues/:number/solutions/:code', element: <Solution /> },
      { path: 'issues/:number/:tab?', element: <Issue /> },
      { path: 'stakeholders', element: <Stakeholders /> },
      { path: 'stakeholders/:id', element: <Stakeholder /> },
      { path: 'solutions', element: <Solutions /> },
      { path: 'spaces/:code', element: <Space /> },
      // Unknown pages, also the removed #/wants and #/needs (design 3.7).
      { path: '*', element: <Placeholder /> },
    ],
  },
])
