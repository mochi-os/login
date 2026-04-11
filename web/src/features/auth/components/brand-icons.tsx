// Brand icons for OAuth login buttons. lucide-react ships `Github` so that
// one is imported inline on the call site; the others are monochrome marks
// rendered from official glyph paths. They inherit currentColor so buttons can
// colour them through CSS.

import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

export function GoogleIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path d="M21.35 11.1h-9.17v2.96h5.27c-.23 1.4-1.67 4.1-5.27 4.1-3.17 0-5.76-2.63-5.76-5.86s2.59-5.86 5.76-5.86c1.8 0 3.01.77 3.7 1.44l2.53-2.44C16.83 3.95 14.77 3 12.18 3 6.98 3 2.8 7.18 2.8 12.3s4.18 9.3 9.38 9.3c5.42 0 9.01-3.8 9.01-9.16 0-.62-.07-1.09-.15-1.54z" />
    </svg>
  )
}

export function MicrosoftIcon(props: IconProps) {
  // Four-square tile — render all four quadrants in currentColor so it
  // adapts to light/dark themes. Purists will note Microsoft's real mark is
  // multicoloured, but a monochrome version keeps the icon row consistent.
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path d="M2 2h9.5v9.5H2V2zm10.5 0H22v9.5h-9.5V2zM2 12.5h9.5V22H2v-9.5zm10.5 0H22V22h-9.5v-9.5z" />
    </svg>
  )
}

export function FacebookIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.13 8.44 9.88V14.9H7.9V12h2.54V9.8c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.9h-2.33v6.98C18.34 21.13 22 16.99 22 12z" />
    </svg>
  )
}

export function XIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
