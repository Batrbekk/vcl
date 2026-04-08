import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET — returns the active (default) bot config for the organization
// No auth required (called by pipeline on VPS)
// Query param: ?org=orgId (optional, if not provided returns first org's default bot)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('org');

    // Try to find default bot config
    const bot = await prisma.botConfig.findFirst({
      where: {
        isDefault: true,
        ...(orgId ? { organizationId: orgId } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });

    if (bot) {
      return NextResponse.json({
        id: bot.id,
        name: bot.name,
        prompt: bot.prompt,
        greeting: bot.greeting,
        voiceId: bot.voiceId,
        voiceSpeed: bot.voiceSpeed,
        voiceVolume: bot.voiceVolume,
        voiceTemperature: bot.voiceTemperature,
        voiceTopP: bot.voiceTopP,
        voiceModel: bot.voiceModel,
        voiceNormalize: bot.voiceNormalize,
        voiceLoudnessNorm: bot.voiceLoudnessNorm,
      });
    }

    // Fallback: find first active bot
    const activBot = await prisma.botConfig.findFirst({
      where: {
        isActive: true,
        ...(orgId ? { organizationId: orgId } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });

    if (activBot) {
      return NextResponse.json({
        id: activBot.id,
        name: activBot.name,
        prompt: activBot.prompt,
        greeting: activBot.greeting,
        voiceId: activBot.voiceId,
        voiceSpeed: activBot.voiceSpeed,
        voiceVolume: activBot.voiceVolume,
        voiceTemperature: activBot.voiceTemperature,
        voiceTopP: activBot.voiceTopP,
        voiceModel: activBot.voiceModel,
        voiceNormalize: activBot.voiceNormalize,
        voiceLoudnessNorm: activBot.voiceLoudnessNorm,
      });
    }

    // Final fallback: org-level bot config
    const org = await prisma.organization.findFirst({
      where: orgId ? { id: orgId } : undefined,
    });

    if (org) {
      return NextResponse.json({
        id: null,
        name: org.botName,
        prompt: org.botPrompt || '',
        greeting: org.botGreeting || 'Здравствуйте! Чем могу помочь?',
        voiceId: org.botVoice || null,
        voiceSpeed: 1.0,
        voiceVolume: 0,
        voiceTemperature: 0.7,
        voiceTopP: 0.7,
        voiceModel: 's2-pro',
        voiceNormalize: true,
        voiceLoudnessNorm: true,
      });
    }

    return NextResponse.json({ error: 'No bot config found' }, { status: 404 });
  } catch (error) {
    console.error('Active bot error:', error);
    return NextResponse.json({ error: 'Failed to fetch active bot' }, { status: 500 });
  }
}
