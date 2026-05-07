import { createFileRoute } from '@tanstack/react-router'
import { DocumentPage } from '@/features/document/document-page'

export const Route = createFileRoute('/terms')({
  component: () => <DocumentPage name='terms' />,
})
