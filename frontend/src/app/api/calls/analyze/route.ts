import { NextResponse } from 'next/server';
import { analyzeCallTranscript } from '@/lib/gemini/analyze-call';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transcript } = body;

    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    const analysis = await analyzeCallTranscript(transcript);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Call analysis error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Analysis failed',
      },
      { status: 500 }
    );
  }
}
