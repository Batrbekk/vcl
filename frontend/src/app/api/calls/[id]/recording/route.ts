import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const RECORDINGS_DIR = path.join(process.cwd(), 'uploads', 'recordings');

// GET — return recording URL or stream the audio file
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const call = await prisma.call.findUnique({
      where: { id },
      select: { id: true, recordingUrl: true },
    });

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    if (!call.recordingUrl) {
      return NextResponse.json({ error: 'No recording available' }, { status: 404 });
    }

    // If the recording URL is an external URL, return it as JSON
    if (call.recordingUrl.startsWith('http://') || call.recordingUrl.startsWith('https://')) {
      return NextResponse.json({ recordingUrl: call.recordingUrl });
    }

    // If it's a local file path, stream the file
    const filePath = path.join(process.cwd(), call.recordingUrl);
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Recording file not found' }, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = ext === '.wav' ? 'audio/wav' :
                        ext === '.ogg' ? 'audio/ogg' :
                        ext === '.webm' ? 'audio/webm' :
                        'audio/mpeg'; // default to mp3

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileBuffer.length),
        'Content-Disposition': `inline; filename="${id}${ext}"`,
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    console.error('GET /api/calls/[id]/recording error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST — save recording URL to call record, or upload an audio file
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if call exists
    const call = await prisma.call.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    const contentType = request.headers.get('content-type') || '';

    let recordingUrl: string;

    if (contentType.includes('application/json')) {
      // JSON body with recordingUrl string
      const body = await request.json();

      if (!body.recordingUrl || typeof body.recordingUrl !== 'string') {
        return NextResponse.json(
          { error: 'recordingUrl is required' },
          { status: 400 }
        );
      }

      recordingUrl = body.recordingUrl;
    } else if (contentType.includes('multipart/form-data')) {
      // File upload via FormData
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided in form data' },
          { status: 400 }
        );
      }

      // Ensure recordings directory exists
      if (!existsSync(RECORDINGS_DIR)) {
        await mkdir(RECORDINGS_DIR, { recursive: true });
      }

      // Determine file extension from original name or default to .mp3
      const originalExt = path.extname(file.name).toLowerCase() || '.mp3';
      const allowedExts = ['.mp3', '.wav', '.ogg', '.webm', '.m4a'];
      const ext = allowedExts.includes(originalExt) ? originalExt : '.mp3';

      const fileName = `${id}${ext}`;
      const filePath = path.join(RECORDINGS_DIR, fileName);

      const arrayBuffer = await file.arrayBuffer();
      await writeFile(filePath, Buffer.from(arrayBuffer));

      // Store relative path so it can be served later
      recordingUrl = `uploads/recordings/${fileName}`;
    } else {
      return NextResponse.json(
        { error: 'Unsupported content type. Use application/json or multipart/form-data.' },
        { status: 400 }
      );
    }

    // Update call record with recording URL
    const updatedCall = await prisma.call.update({
      where: { id },
      data: { recordingUrl },
      select: { id: true, recordingUrl: true },
    });

    return NextResponse.json({
      success: true,
      callId: updatedCall.id,
      recordingUrl: updatedCall.recordingUrl,
    });
  } catch (error) {
    console.error('POST /api/calls/[id]/recording error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
