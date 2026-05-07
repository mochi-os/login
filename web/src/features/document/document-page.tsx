import { useEffect, useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { Loader2 } from 'lucide-react'
import { requestHelpers } from '@mochi/web'
import endpoints from '@/api/endpoints'

type DocumentName = 'rules' | 'terms' | 'privacy'

interface DocumentResponse {
  name: string
  body: string
  html: string
}

// Inline typography styles applied to the rendered HTML. Avoids a runtime
// dependency on @tailwindcss/typography. Selectors target descendant tags
// produced by the gomarkdown renderer; bluemonday strips anything else.
const typography = [
  '[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-2 [&_h1]:mb-6',
  '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3',
  '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2',
  '[&_p]:my-3 [&_p]:leading-relaxed',
  '[&_ul]:my-3 [&_ul]:ms-6 [&_ul]:list-disc [&_ul]:space-y-1',
  '[&_ol]:my-3 [&_ol]:ms-6 [&_ol]:list-decimal [&_ol]:space-y-1',
  '[&_li]:leading-relaxed',
  '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:no-underline',
  '[&_strong]:font-semibold',
  '[&_em]:italic',
  '[&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm',
  '[&_blockquote]:border-l-4 [&_blockquote]:border-muted [&_blockquote]:ps-4 [&_blockquote]:my-4 [&_blockquote]:text-muted-foreground',
  '[&_hr]:my-8 [&_hr]:border-muted',
].join(' ')

export function DocumentPage({ name }: { name: DocumentName }) {
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    requestHelpers
      .post<DocumentResponse>(endpoints.document.get, { name })
      .then((data) => {
        if (cancelled) return
        setHtml(data.html ?? '')
      })
      .catch(() => {
        if (cancelled) return
        setError('failed')
      })
    return () => {
      cancelled = true
    }
  }, [name])

  return (
    <div className='min-h-svh bg-[#FAF9F6] dark:bg-background text-[#2D2D3A] dark:text-foreground'>
      <main className='max-w-[760px] mx-auto px-6 py-12'>
        {error ? (
          <p className='text-destructive'>
            <Trans>Could not load this document. Please try again later.</Trans>
          </p>
        ) : html === null ? (
          <div className='flex items-center gap-2 text-muted-foreground'>
            <Loader2 className='size-4 animate-spin' />
            <span>
              <Trans>Loading…</Trans>
            </span>
          </div>
        ) : (
          <div
            className={typography}
            // Server-side rendered + sanitised by mochi.text.markdown (bluemonday).
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </main>
    </div>
  )
}
