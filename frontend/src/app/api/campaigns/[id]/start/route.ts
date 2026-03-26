import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST — start campaign (set status to RUNNING)
export async function POST(
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

    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { contacts: true } } },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Кампания не найдена' }, { status: 404 });
    }

    if (campaign.status !== 'DRAFT' && campaign.status !== 'PAUSED') {
      return NextResponse.json(
        { error: `Нельзя запустить кампанию со статусом ${campaign.status}` },
        { status: 400 }
      );
    }

    if (campaign._count.contacts === 0) {
      return NextResponse.json(
        { error: 'Добавьте контакты перед запуском' },
        { status: 400 }
      );
    }

    if (!campaign.botConfigId) {
      return NextResponse.json(
        { error: 'Выберите бота перед запуском' },
        { status: 400 }
      );
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: 'RUNNING' },
      include: {
        botConfig: { select: { id: true, name: true } },
        contacts: { orderBy: { createdAt: 'asc' } },
      },
    });

    return NextResponse.json({ campaign: updated });
  } catch (error) {
    console.error('Start campaign error:', error);
    return NextResponse.json({ error: 'Failed to start campaign' }, { status: 500 });
  }
}
