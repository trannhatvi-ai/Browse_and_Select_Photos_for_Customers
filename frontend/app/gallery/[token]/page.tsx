import { ClientGallery } from '@/components/client-gallery'

export default async function GalleryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <ClientGallery token={token} />
}
