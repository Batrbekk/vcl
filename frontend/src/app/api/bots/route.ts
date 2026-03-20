import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET — list all bots for organization
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = (session.user as any).organizationId;
    if (!organizationId || organizationId.startsWith('demo_')) {
      return NextResponse.json({ bots: [] });
    }

    const bots = await prisma.botConfig.findMany({
      where: { organizationId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({ bots });
  } catch (error) {
    console.error('Bots list error:', error);
    return NextResponse.json({ error: 'Failed to fetch bots' }, { status: 500 });
  }
}

// POST — create new bot
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = (session.user as any).organizationId;
    if (!organizationId || organizationId.startsWith('demo_')) {
      return NextResponse.json({ error: 'БД недоступна' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, prompt, greeting, voiceId, voiceName, maxRetries, retryInterval } = body;

    if (!name) {
      return NextResponse.json({ error: 'Имя бота обязательно' }, { status: 400 });
    }

    // Check bot limit (max 10)
    const count = await prisma.botConfig.count({ where: { organizationId } });
    if (count >= 10) {
      return NextResponse.json({ error: 'Максимум 10 ботов' }, { status: 400 });
    }

    // If this is the first bot, make it default
    const isDefault = count === 0;

    const bot = await prisma.botConfig.create({
      data: {
        name,
        description: description || null,
        prompt: prompt || '',
        greeting: greeting || 'Здравствуйте! Чем могу помочь?',
        voiceId: voiceId || null,
        voiceName: voiceName || null,
        maxRetries: maxRetries || 3,
        retryInterval: retryInterval || 30,
        isDefault,
        organizationId,
      },
    });

    return NextResponse.json({ bot }, { status: 201 });
  } catch (error) {
    console.error('Create bot error:', error);
    return NextResponse.json({ error: 'Failed to create bot' }, { status: 500 });
  }
}
