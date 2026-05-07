import { createFileRoute } from '@tanstack/react-router'
import { DocumentPage } from '@/features/document/document-page'

export const Route = createFileRoute('/rules')({
  component: () => <DocumentPage name='rules' />,
})
