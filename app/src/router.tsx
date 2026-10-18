import { createHashRouter } from 'react-router'
import { Layout } from '@/components/Layout'
import Home from '@/pages/Home'
import Issue from '@/pages/Issue'
import Issues from '@/pages/Issues'
import Placeholder from '@/pages/Placeholder'
import RouteError from '@/pages/RouteError'
import Solutions from '@/pages/Solutions'
import Space from '@/pages/Space'
import Stakeholder from '@/pages/Stakeholder'
import Stakeholders from '@/pages/Stakeholders'
import Wants from '@/pages/Wants'

// Hash URLs (#/issues/2) work on GitHub Pages without server rewrites.
export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    // A page that breaks shows a short message inside the page frame, so the
    // header and the notice stay. No stack trace.
    errorElement: (
      <Layout>
        <RouteError />
      </Layout>
    ),
    children: [
      { index: true, element: <Home /> },
      { path: 'issues', element: <Issues /> },
      { path: 'issues/:number/:tab?', element: <Issue /> },
      { path: 'stakeholders', element: <Stakeholders /> },
      { path: 'stakeholders/:id', element: <Stakeholder /> },
      { path: 'solutions', element: <Solutions /> },
      { path: 'wants', element: <Wants /> },
      { path: 'spaces/:code', element: <Space /> },
      { path: '*', element: <Placeholder /> },
    ],
  },
])
