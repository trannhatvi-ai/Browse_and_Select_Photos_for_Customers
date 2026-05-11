import { NextRequest } from 'next/server'
import { Readable } from 'node:stream'
import { v2 as cloudinary } from 'cloudinary'
import { prisma } from '@/lib/db'
import { buildPreviewUrl } from '@/lib/storage'
import { validateExistingProjectCloudinarySettings } from '@/lib/cloudinary-settings'
import { getUploadCloudinaryAccountForProject } from '@/lib/cloudinary-accounts'

export const runtime = 'nodejs'

type DriveFileTarget = {
  id: string
  sourceUrl: string
  name?: string
}

type StreamEvent =
  | { type: 'queued'; items: Array<{ id: string; name: string; sourceUrl: string }> }
  | { type: 'item-start'; id: string; name: string; message: string }
  | { type: 'item-uploading'; id: string; message: string }
  | { type: 'item-complete'; id: string; name: string; photo: unknown }
  | { type: 'item-error'; id: string; name: string; message: string }
  | { type: 'done'; uploaded: number; failed: number }
  | { type: 'error'; message: string }

function sendEvent(controller: ReadableStreamDefaultController<Uint8Array>, event: StreamEvent) {
  controller.enqueue(new TextEncoder().encode(`${JSON.stringify(event)}\n`))
}

function uniqueTargets(targets: DriveFileTarget[]) {
  const seen = new Set<string>()
  return targets.filter((target) => {
    if (seen.has(target.id)) return false
    seen.add(target.id)
    return true
  })
}

function extractDriveFileId(rawUrl: string) {
  const trimmed = rawUrl.trim()
  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (fileMatch?.[1]) return fileMatch[1]

  try {
    const url = new URL(trimmed)
    const id = url.searchParams.get('id')
    if (id) return id
  } catch {}

  return null
}

function extractDriveFolderId(rawUrl: string) {
  const trimmed = rawUrl.trim()
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  if (folderMatch?.[1]) return folderMatch[1]

  try {
    const url = new URL(trimmed)
    if (url.pathname.includes('/folders')) return url.searchParams.get('id')
  } catch {}

  return null
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function looksLikePermissionPage(html: string) {
  const lower = html.toLowerCase()
  return (
    lower.includes('you need access') ||
    lower.includes('request access') ||
    lower.includes('access denied') ||
    lower.includes('sign in') ||
    lower.includes('permission')
  )
}

function filenameFromContentDisposition(header: string | null, fallback: string) {
  if (!header) return fallback

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].replace(/"/g, ''))
    } catch {
      return utf8Match[1].replace(/"/g, '')
    }
  }

  const filenameMatch = header.match(/filename="?([^";]+)"?/i)
  return filenameMatch?.[1] ? decodeURIComponent(filenameMatch[1]) : fallback
}

function getCookieHeader(response: Response) {
  const setCookie = response.headers.get('set-cookie')
  if (!setCookie) return undefined
  return setCookie
    .split(',')
    .map((cookie) => cookie.split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ')
}

function absoluteDriveUrl(value: string) {
  const decoded = decodeHtml(value)
  if (decoded.startsWith('http')) return decoded
  return `https://drive.google.com${decoded.startsWith('/') ? decoded : `/${decoded}`}`
}

function extractConfirmDownloadUrl(html: string) {
  const hrefMatches = Array.from(html.matchAll(/href="([^"]*confirm=[^"]*)"/g))
  const match = hrefMatches.find((candidate) => candidate[1].includes('export=download') || candidate[1].includes('/uc?'))
  if (match?.[1]) return absoluteDriveUrl(match[1])

  const formAction = html.match(/<form[^>]+action="([^"]+)"/i)?.[1]
  const confirm = html.match(/name="confirm"\s+value="([^"]+)"/i)?.[1]
  const id = html.match(/name="id"\s+value="([^"]+)"/i)?.[1]
  if (formAction && confirm && id) {
    const url = new URL(absoluteDriveUrl(formAction))
    url.searchParams.set('export', 'download')
    url.searchParams.set('confirm', decodeHtml(confirm))
    url.searchParams.set('id', decodeHtml(id))
    return url.toString()
  }

  return null
}

async function expandDriveFolder(folderId: string, sourceUrl: string): Promise<DriveFileTarget[]> {
  const response = await fetch(`https://drive.google.com/embeddedfolderview?id=${folderId}#grid`, {
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error('Không thể đọc thư mục Google Drive. Hãy bật quyền "Anyone with the link can view".')
  }

  const html = await response.text()
  if (looksLikePermissionPage(html)) {
    throw new Error('Thư mục Google Drive chưa được chia sẻ công khai. Hãy bật quyền "Anyone with the link can view".')
  }

  const ids = Array.from(html.matchAll(/\/file\/d\/([a-zA-Z0-9_-]+)/g)).map((match) => match[1])
  const uniqueIds = Array.from(new Set(ids))
  if (uniqueIds.length === 0) {
    throw new Error('Không tìm thấy ảnh trong thư mục Drive hoặc thư mục chưa cho phép truy cập.')
  }

  return uniqueIds.map((id, index) => ({
    id,
    sourceUrl,
    name: `drive-folder-${index + 1}.jpg`,
  }))
}

async function resolveDriveTargets(urls: string[]) {
  const expanded: DriveFileTarget[] = []

  for (const rawUrl of urls) {
    const folderId = extractDriveFolderId(rawUrl)
    if (folderId) {
      expanded.push(...await expandDriveFolder(folderId, rawUrl))
      continue
    }

    const fileId = extractDriveFileId(rawUrl)
    if (!fileId) {
      throw new Error(`Link Google Drive không hợp lệ: ${rawUrl}`)
    }

    expanded.push({ id: fileId, sourceUrl: rawUrl, name: 'google-drive-image.jpg' })
  }

  return uniqueTargets(expanded)
}

async function fetchDriveFile(target: DriveFileTarget) {
  let response = await fetch(`https://drive.google.com/uc?export=download&id=${target.id}`, {
    redirect: 'follow',
  })

  if (response.status === 401 || response.status === 403) {
    throw new Error('Không có quyền truy cập ảnh này. Hãy bật quyền "Anyone with the link can view".')
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('text/html')) {
    const html = await response.text()
    if (looksLikePermissionPage(html)) {
      throw new Error('Không có quyền truy cập ảnh này. Hãy bật quyền "Anyone with the link can view".')
    }

    const confirmUrl = extractConfirmDownloadUrl(html)
    if (!confirmUrl) {
      throw new Error('Google Drive chưa cho phép tải trực tiếp ảnh này. Hãy kiểm tra lại quyền chia sẻ của link.')
    }

    const cookie = getCookieHeader(response)
    response = await fetch(confirmUrl, {
      redirect: 'follow',
      headers: cookie ? { cookie } : undefined,
    })
  }

  if (!response.ok || !response.body) {
    throw new Error('Không thể tải ảnh từ Google Drive. Hãy kiểm tra quyền truy cập và thử lại.')
  }

  const finalType = response.headers.get('content-type') || ''
  if (finalType.includes('text/html')) {
    throw new Error('Google Drive trả về trang xác thực thay vì file ảnh. Link này có thể chưa được chia sẻ công khai.')
  }

  return response
}

async function uploadDriveFileToCloudinary(response: Response, projectId: string, filename: string) {
  return new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `proofing/${projectId}`,
        resource_type: 'image',
        use_filename: true,
        unique_filename: true,
        filename_override: filename,
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result)
      }
    )

    Readable.fromWeb(response.body as any)
      .on('error', reject)
      .pipe(uploadStream)
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  const body = await req.json().catch(() => ({}))
  const urls = Array.isArray(body.urls)
    ? body.urls.map((url: unknown) => String(url).trim()).filter(Boolean)
    : String(body.url || '').split(/\s+/).map((url) => url.trim()).filter(Boolean)

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let uploaded = 0
      let failed = 0

      try {
        if (urls.length === 0) {
          sendEvent(controller, { type: 'error', message: 'Vui lòng nhập ít nhất một link Google Drive.' })
          return
        }

        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { createdBy: true },
        })

        if (!project) {
          sendEvent(controller, { type: 'error', message: 'Không tìm thấy show chụp.' })
          return
        }

        const { isConfigured, missing } = await validateExistingProjectCloudinarySettings(project.createdBy)
        if (!isConfigured) {
          sendEvent(controller, {
            type: 'error',
            message: `Vui lòng cấu hình Cloudinary trước khi tải ảnh. Thiếu: ${missing?.join(', ') || 'Cloudinary credentials'}`,
          })
          return
        }

        const cloudinaryAccount = await getUploadCloudinaryAccountForProject(projectId)
        if (!cloudinaryAccount) {
          sendEvent(controller, {
            type: 'error',
            message: 'Vui lòng cấu hình ít nhất một Cloudinary trước khi tải ảnh.',
          })
          return
        }
        cloudinary.config(cloudinaryAccount)

        const targets = await resolveDriveTargets(urls)
        sendEvent(controller, {
          type: 'queued',
          items: targets.map((target, index) => ({
            id: target.id,
            name: target.name || `google-drive-${index + 1}.jpg`,
            sourceUrl: target.sourceUrl,
          })),
        })

        for (const target of targets) {
          const fallbackName = target.name || `${target.id}.jpg`
          try {
            sendEvent(controller, {
              type: 'item-start',
              id: target.id,
              name: fallbackName,
              message: 'Đang tải ảnh từ Google Drive...',
            })

            const driveResponse = await fetchDriveFile(target)
            const filename = filenameFromContentDisposition(
              driveResponse.headers.get('content-disposition'),
              fallbackName
            )

            sendEvent(controller, {
              type: 'item-uploading',
              id: target.id,
              message: 'Đang stream ảnh lên Cloudinary...',
            })

            const uploadResult = await uploadDriveFileToCloudinary(driveResponse, projectId, filename)

            const photo = await prisma.photo.create({
              data: {
                projectId,
                filename,
                originalUrl: uploadResult.public_id,
                previewUrl: buildPreviewUrl(uploadResult.public_id, cloudinaryAccount.cloud_name),
                width: uploadResult.width,
                height: uploadResult.height,
                size: uploadResult.bytes,
                cloudinaryAccountId: cloudinaryAccount.id,
                cloudinaryCloudName: cloudinaryAccount.cloudName,
              } as any,
            })

            uploaded += 1
            sendEvent(controller, { type: 'item-complete', id: target.id, name: filename, photo })
          } catch (error) {
            failed += 1
            sendEvent(controller, {
              type: 'item-error',
              id: target.id,
              name: fallbackName,
              message: (error as Error).message || 'Không thể tải ảnh từ Google Drive.',
            })
          }
        }

        sendEvent(controller, { type: 'done', uploaded, failed })
      } catch (error) {
        sendEvent(controller, {
          type: 'error',
          message: (error as Error).message || 'Không thể tải ảnh từ Google Drive.',
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
