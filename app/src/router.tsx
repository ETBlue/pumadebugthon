import { createHashRouter } from 'react-router'
import Home from '@/pages/Home'

// Hash URLs (#/issues/2) work on GitHub Pages without server rewrites.
export const router = createHashRouter([{ path: '/', element: <Home /> }])
