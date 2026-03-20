import { NextResponse } from 'next/server';

const FISH_API_KEY = process.env.FISH_AUDIO_API_KEY;

async function fetchTTS(text: string, referenceId?: string): Promise<Uint8Array | null> {
  const res = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FISH_API_KEY}`,
      'Content-Type': 'application/json',
      'model': 's2-pro',
    },
    body: JSON.stringify({
      text,
      reference_id: referenceId || undefined,
      format: 'opus',
      chunk_length: 300,
      latency: 'low',
      temperature: 0.7,
    }),
  });

  if (!res.ok) return null;

  // Collect streaming response
  const chunks: Uint8Array[] = [];
  const reader = res.body?.getReader();
  if (!reader) return null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  if (totalLength < 50) return null; // Too small = empty/error

  const audioData = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    audioData.set(chunk, offset);
    offset += chunk.length;
  }

  return audioData;
}

export async function POST(request: Request) {
  try {
    if (!FISH_API_KEY) {
      return NextResponse.json({ error: 'Fish Audio API key not configured' }, { status: 500 });
    }

    const { text, referenceId } = await request.json();
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Try with original text (may include emotion tags) — up to 2 attempts
    let audioData = await fetchTTS(text, referenceId);

    // Retry same text after short delay
    if (!audioData) {
      console.log('TTS: first attempt empty, retrying in 300ms...');
      await new Promise(r => setTimeout(r, 300));
      audioData = await fetchTTS(text, referenceId);
    }

    // Fallback: strip emotion tags and retry
    if (!audioData) {
      const cleanText = text.replace(/\[[^\]]+\]\s*/g, '').trim();
      if (cleanText && cleanText !== text) {
        console.log('TTS: retrying without emotion tags');
        audioData = await fetchTTS(cleanText, referenceId);
      }
    }

    // Final fallback: shorter text without reference
    if (!audioData) {
      const shortText = text.replace(/\[[^\]]+\]\s*/g, '').trim().slice(0, 200);
      if (shortText) {
        console.log('TTS: retrying with short text, no reference');
        audioData = await fetchTTS(shortText);
      }
    }

    if (!audioData) {
      return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 });
    }

    return new NextResponse(audioData as unknown as BodyInit, {
      headers: {
        'Content-Type': 'audio/ogg',
        'Content-Length': String(audioData.length),
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'TTS failed' },
      { status: 500 }
    );
  }
}
