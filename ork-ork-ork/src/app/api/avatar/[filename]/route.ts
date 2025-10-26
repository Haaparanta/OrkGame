import { NextRequest, NextResponse } from 'next/server'

// Map of filename to base64 data would go here in production
// For now, we'll use direct public serving

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params
  
  // Whitelist allowed filenames to prevent directory traversal
  const allowedFiles: Record<string, string> = {
    'ork-avatar-warboss.png': 'warboss',
    'ork-avatar-rokkit-boy.png': 'rokkit-boy',
    'ork-avatar-burna-boy.png': 'burna-boy',
    'ork-avatar-enemy.png': 'enemy',
  }
  
  if (!allowedFiles[filename]) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
  
  try {
    // Use dynamic import to read the file at runtime
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    
    // Try to read from public folder - this works in both dev and standalone
    const filePath = join(process.cwd(), 'public', filename)
    console.log(`[avatar] Attempting to read: ${filePath}`)
    
    const data = readFileSync(filePath)
    
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': data.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error(`[avatar] Failed to load ${filename}:`, error)
    
    // Fallback: try alternative paths
    try {
      const { readFileSync } = await import('fs')
      const altPath = `/public/${filename}`
      const data = readFileSync(altPath)
      
      return new NextResponse(data, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Length': data.length.toString(),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    } catch {
      return NextResponse.json(
        { error: 'File not found', debug: `process.cwd: ${process.cwd()}` },
        { status: 404 }
      )
    }
  }
}
