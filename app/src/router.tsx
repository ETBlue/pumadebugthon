import { createHashRouter } from 'react-router'
import { routes } from './routes'

// Hash URLs (#/issues/2) work on GitHub Pages without server rewrites.
export const router = createHashRouter(routes)
