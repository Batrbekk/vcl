import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET — get campaign with contacts
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

    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId },
      include: {
        botConfig: { select: { id: true, name: true } },
        contacts: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Кампания не найдена' }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Get campaign error:', error);
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 });
  }
}

// PATCH — update campaign (name, description, status, botConfigId)
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

    const existing = await prisma.campaign.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Кампания не найдена' }, { status: 404 });
    }

    const body = await request.json();
    const allowed = ['name', 'description', 'status', 'botConfigId'];
    const data: Record<string, unknown> = {};

    for (const key of allowed) {
      if (body[key] !== undefined) {
        data[key] = body[key];
      }
    }

    // Validate status transition
    if (data.status) {
      const validTransitions: Record<string, string[]> = {
        DRAFT: ['RUNNING'],
        RUNNING: ['PAUSED', 'COMPLETED'],
        PAUSED: ['RUNNING', 'COMPLETED'],
        COMPLETED: [],
      };
      const allowed = validTransitions[existing.status] || [];
      if (!allowed.includes(data.status as string)) {
        return NextResponse.json(
          { error: `Невозможно изменить статус с ${existing.status} на ${data.status}` },
          { status: 400 }
        );
      }
    }

    // Validate botConfigId if provided
    if (data.botConfigId) {
      const bot = await prisma.botConfig.findFirst({
        where: { id: data.botConfigId as string, organizationId },
      });
      if (!bot) {
        return NextResponse.json({ error: 'Бот не найден' }, { status: 404 });
      }
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data,
      include: {
        botConfig: { select: { id: true, name: true } },
        contacts: { orderBy: { createdAt: 'asc' } },
      },
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Update campaign error:', error);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}

// DELETE — delete campaign
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

    const existing = await prisma.campaign.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Кампания не найдена' }, { status: 404 });
    }

    if (existing.status === 'RUNNING') {
      return NextResponse.json(
        { error: 'Нельзя удалить активную кампанию. Сначала поставьте на паузу.' },
        { status: 400 }
      );
    }

    await prisma.campaign.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete campaign error:', error);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}
