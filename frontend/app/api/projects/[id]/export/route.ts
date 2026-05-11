import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

type ExportFormat = 'txt' | 'csv' | 'ps1'

type SelectedPhoto = {
  id: string
  filename: string
  comment?: string | null
  originalUrl?: string | null
}

function getExportFormat(req: NextRequest): ExportFormat {
  const format = req.nextUrl?.searchParams.get('format') ?? new URL(req.url).searchParams.get('format')
  return format === 'csv' || format === 'ps1' ? format : 'txt'
}

function safeDownloadName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    || 'project'
}

function csvCell(value: string | null | undefined) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function powershellString(value: string) {
  return `"${value.replace(/`/g, '``').replace(/"/g, '`"')}"`
}

function buildTxt(project: { eventName: string; clientName: string; photos: SelectedPhoto[] }) {
  const fileList = project.photos.map((photo) => photo.filename).join('\n')

  return [
    `SHOW CHUP: ${project.eventName}`,
    `KHACH HANG: ${project.clientName}`,
    `NGAY CHON: ${new Date().toLocaleDateString('vi-VN')}`,
    '',
    `DANH SACH FILE CHON (${project.photos.length} anh):`,
    fileList,
    '',
    'HUONG DAN:',
    'Moi dong la mot ten file. Co the dung file nay de tim nhanh trong folder anh goc.',
  ].join('\n')
}

function buildCsv(project: { photos: SelectedPhoto[] }) {
  const rows = project.photos.map((photo) => [
    csvCell(photo.filename),
    csvCell(photo.comment),
    csvCell(photo.originalUrl),
  ].join(','))

  return ['filename,comment,originalUrl', ...rows].join('\n')
}

function buildCopyScript(project: { eventName: string; clientName: string; photos: SelectedPhoto[] }) {
  const files = project.photos.map((photo) => `  ${powershellString(photo.filename)}`).join(',\n')

  return [
    '# Copy selected photos into SELECTED',
    `# Show chup: ${project.eventName}`,
    `# Khach hang: ${project.clientName}`,
    '#',
    '# Huong dan:',
    '# 1. Dat file copy-selected.ps1 nay vao folder chua anh goc.',
    '# 2. Right click file > Run with PowerShell, hoac chay lenh:',
    '#    powershell -ExecutionPolicy Bypass -File .\\copy-selected.ps1',
    '# 3. Anh duoc copy vao folder SELECTED. File khong tim thay se hien trong danh sach Missing.',
    '',
    "$ErrorActionPreference = 'Stop'",
    '$selectedFiles = @(',
    files,
    ')',
    '',
    '$source = Split-Path -Parent $MyInvocation.MyCommand.Path',
    'if (-not $source) { $source = (Get-Location).Path }',
    "$destination = Join-Path $source 'SELECTED'",
    'New-Item -ItemType Directory -Path $destination -Force | Out-Null',
    '',
    '$copied = 0',
    '$missing = @()',
    '',
    'foreach ($fileName in $selectedFiles) {',
    '  $sourcePath = Join-Path $source $fileName',
    '  if (-not (Test-Path -LiteralPath $sourcePath)) {',
    '    $destinationPattern = Join-Path $destination "*"',
    '    $match = Get-ChildItem -LiteralPath $source -File -Recurse -Filter $fileName -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notlike $destinationPattern } | Select-Object -First 1',
    '    if ($match) { $sourcePath = $match.FullName }',
    '  }',
    '',
    '  if (Test-Path -LiteralPath $sourcePath) {',
    '    Copy-Item -LiteralPath $sourcePath -Destination $destination -Force',
    '    $copied++',
    '  } else {',
    '    $missing += $fileName',
    '  }',
    '}',
    '',
    'Write-Host "Copied $copied/$($selectedFiles.Count) files to $destination"',
    'if ($missing.Count -gt 0) {',
    '  Write-Host "Missing files:"',
    '  $missing | ForEach-Object { Write-Host " - $_" }',
    '}',
    'Read-Host "Press Enter to close"',
    '',
  ].join('\n')
}

function buildExportResponse(
  format: ExportFormat,
  project: { accessToken: string; clientName: string; eventName: string; photos: SelectedPhoto[] }
) {
  const baseName = `Selected_Photos_${safeDownloadName(project.clientName || project.accessToken)}`
  const exportFile = {
    txt: {
      content: buildTxt(project),
      contentType: 'text/plain; charset=utf-8',
      filename: `${baseName}.txt`,
    },
    csv: {
      content: buildCsv(project),
      contentType: 'text/csv; charset=utf-8',
      filename: `${baseName}.csv`,
    },
    ps1: {
      content: buildCopyScript(project),
      contentType: 'text/plain; charset=utf-8',
      filename: `${baseName}_copy-selected.ps1`,
    },
  }[format]

  return new NextResponse(exportFile.content, {
    headers: {
      'Content-Type': exportFile.contentType,
      'Content-Disposition': `attachment; filename="${exportFile.filename}"`,
    },
  })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  const format = getExportFormat(req)

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      photos: {
        where: { selected: true },
        orderBy: { filename: 'asc' },
      },
    },
  })

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return buildExportResponse(format, project)
}
