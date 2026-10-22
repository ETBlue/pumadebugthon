import { createHashRouter } from 'react-router'
import { Layout } from '@/components/Layout'
import About from '@/pages/About'
import Home from '@/pages/Home'
import Issue from '@/pages/Issue'
import Issues from '@/pages/Issues'
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
      // The list pages are full width too: the search, sort and filter bar
      // is a full-width band right under the header. The page puts the rest
      // in the page column (decision 106).
      { path: 'issues', element: <Issues />, handle: { fullWidth: true } },
      // The detail pages are full width too: the band with the back button
      // and the h1 is full width, and the page puts the rest in the page
      // column (decision 111).
      { path: 'issues/:number/:tab?', element: <Issue />, handle: { fullWidth: true } },
      // A moved stakeholder ID shows the not-found page (decision 113).
      // There is no want or need page (decision 45). #/stakeholders and the
      // stakeholder page have no side bar, so they are plain routes
      // (decisions 87 and 94).
      { path: 'stakeholders', element: <Stakeholders />, handle: { fullWidth: true } },
      { path: 'stakeholders/:id/stories/:number/:storyId', element: <StakeholderStory />, handle: { fullWidth: true } },
      { path: 'stakeholders/:id/:tab?', element: <Stakeholder />, handle: { fullWidth: true } },
      { path: 'solutions', element: <Solutions />, handle: { fullWidth: true } },
      // 2-A: a solution of an issue. X-A: a cross-issue solution (Task N11).
      { path: 'solutions/:slug/:tab?', element: <Solution />, handle: { fullWidth: true } },
      { path: 'spaces/:code', element: <Space />, handle: { fullWidth: true } },
      { path: 'about', element: <About /> },
      // Unknown pages, also the removed #/wants and #/needs (design 3.7).
      { path: '*', element: <Placeholder /> },
    ],
  },
])
