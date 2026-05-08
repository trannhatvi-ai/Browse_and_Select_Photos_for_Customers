import { prisma } from '@/lib/db'
import { buildBackendUrl } from '@/lib/backend-api'

type RemoteAsset = {
  image_url: string
  metadata?: Record<string, unknown> | string | null
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function parseMetadata(metadata: RemoteAsset['metadata']): Record<string, unknown> {
  if (!metadata) {
    return {}
  }

  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata)
      return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
    } catch {
      return {}
    }
  }

  return metadata
}

function parseGeminiContext(metadata: RemoteAsset['metadata']): Record<string, unknown> | null {
  const parsed = parseMetadata(metadata)
  const context = parsed.gemini_context
  return context && typeof context === 'object' ? context as Record<string, unknown> : null
}

export async function syncProjectPhotoAiContexts(
  projectId: string,
  expectedUrls?: string[]
): Promise<{ updated: number; matched: number; pending: number }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      photos: {
        select: {
          id: true,
          previewUrl: true,
          aiContext: true,
        },
      },
    },
  })

  if (!project || project.photos.length === 0) {
    return { updated: 0, matched: 0, pending: 0 }
  }

  const targetPhotos = expectedUrls && expectedUrls.length > 0
    ? project.photos.filter(photo => expectedUrls.includes(photo.previewUrl))
    : project.photos

  if (targetPhotos.length === 0) {
    return { updated: 0, matched: 0, pending: 0 }
  }

  const assetUrl = buildBackendUrl(`/projects/${projectId}/assets`)
  const timeoutAt = Date.now() + 30000
  let remoteAssets: RemoteAsset[] = []

  while (Date.now() < timeoutAt) {
    try {
      const response = await fetch(assetUrl, { cache: 'no-store' })
      if (response.ok) {
        const payload = await response.json() as { assets?: RemoteAsset[] }
        remoteAssets = Array.isArray(payload.assets) ? payload.assets : []

        const assetMap = new Map(remoteAssets.map(asset => [asset.image_url, asset]))
        const readyCount = targetPhotos.filter(photo => parseGeminiContext(assetMap.get(photo.previewUrl)?.metadata)).length
        if (readyCount === targetPhotos.length) {
          break
        }
      } else if (response.status === 404) {
        break
      }
    } catch {
      // Keep polling until timeout.
    }

    await sleep(1000)
  }

  const assetMap = new Map(remoteAssets.map(asset => [asset.image_url, asset]))
  const updates = targetPhotos.flatMap(photo => {
    const geminiContext = parseGeminiContext(assetMap.get(photo.previewUrl)?.metadata)
    if (!geminiContext) {
      return []
    }

    const currentContext = photo.aiContext && typeof photo.aiContext === 'object'
      ? photo.aiContext as Record<string, unknown>
      : null

    if (JSON.stringify(currentContext) === JSON.stringify(geminiContext)) {
      return []
    }

    return prisma.photo.update({
      where: { id: photo.id },
      data: { aiContext: geminiContext },
    })
  })

  const results = await Promise.all(updates)

  return {
    updated: results.length,
    matched: targetPhotos.length,
    pending: Math.max(0, targetPhotos.length - results.length),
  }
}