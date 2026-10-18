import { createHashRouter } from 'react-router'
import { Layout } from '@/components/Layout'
import Home from '@/pages/Home'
import Placeholder from '@/pages/Placeholder'

// Hash URLs (#/issues/2) work on GitHub Pages without server rewrites.
// The issue, stakeholder and space pages are placeholders until Tasks C9-C12.
export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'issues/:number/*', element: <Placeholder /> },
      { path: 'stakeholders/:id', element: <Placeholder /> },
      { path: 'spaces/:code', element: <Placeholder /> },
      { path: '*', element: <Placeholder notFound /> },
    ],
  },
])
