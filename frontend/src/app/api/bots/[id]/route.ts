import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET — get single bot
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const organizationId = (session.user as any).organizationId;

    const bot = await prisma.botConfig.findFirst({
      where: { id, organizationId },
    });

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    return NextResponse.json({ bot });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch bot' }, { status: 500 });
  }
}

// PATCH — update bot
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const organizationId = (session.user as any).organizationId;

    const existing = await prisma.botConfig.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    const body = await request.json();
    const allowed = ['name', 'description', 'prompt', 'greeting', 'voiceId', 'voiceName', 'maxRetries', 'retryInterval', 'isActive', 'voiceSpeed', 'voiceVolume', 'voiceTemperature', 'voiceTopP', 'voiceModel', 'voiceNormalize', 'voiceLoudnessNorm'];
    const data: any = {};

    for (const key of allowed) {
      if (body[key] !== undefined) {
        data[key] = body[key];
      }
    }

    // Handle setDefault
    if (body.isDefault === true) {
      // Unset all others
      await prisma.botConfig.updateMany({
        where: { organizationId },
        data: { isDefault: false },
      });
      data.isDefault = true;
    }

    const bot = await prisma.botConfig.update({
      where: { id },
      data,
    });

    return NextResponse.json({ bot });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update bot' }, { status: 500 });
  }
}

// DELETE — delete bot
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const organizationId = (session.user as any).organizationId;

    const existing = await prisma.botConfig.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    if (existing.isDefault) {
      return NextResponse.json({ error: 'Нельзя удалить бота по умолчанию' }, { status: 400 });
    }

    await prisma.botConfig.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete bot' }, { status: 500 });
  }
}
