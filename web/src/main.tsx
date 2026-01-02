import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { ThemeProvider, createQueryClient } from '@mochi/common'
// Generated Routes
import { routeTree } from './routeTree.gen'
// Styles
import './styles/index.css'

const queryClient = createQueryClient()

// Extract basepath from URL: /login -> /login, /login/otp -> /login
const getBasepath = () => {
  const pathname = window.location.pathname
  // Match first path segment: /login or /login/...
  const match = pathname.match(/^(\/[^/]+)/)
  return match ? match[1] : '/'
}

// Create a new router instance
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  basepath: getBasepath(),
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Initialize auth state from cookie on app start
useAuthStore.getState().initialize()

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          {/* <FontProvider> */}
            {/* <DirectionProvider> */}
              <RouterProvider router={router} />
            {/* </DirectionProvider> */}
          {/* </FontProvider> */}
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}
