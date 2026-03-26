import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET — list campaigns for organization
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = (session.user as any).organizationId;
    if (!organizationId || organizationId.startsWith('demo_')) {
      return NextResponse.json({ campaigns: [] });
    }

    const campaigns = await prisma.campaign.findMany({
      where: { organizationId },
      include: {
        botConfig: { select: { id: true, name: true } },
        _count: { select: { contacts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Campaigns list error:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

// POST — create campaign with optional contacts
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
    const { name, description, botConfigId, contacts } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Название кампании обязательно' }, { status: 400 });
    }

    // Validate botConfigId belongs to org if provided
    if (botConfigId) {
      const bot = await prisma.botConfig.findFirst({
        where: { id: botConfigId, organizationId },
      });
      if (!bot) {
        return NextResponse.json({ error: 'Бот не найден' }, { status: 404 });
      }
    }

    const contactsData = Array.isArray(contacts) ? contacts : [];

    const campaign = await prisma.campaign.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        botConfigId: botConfigId || null,
        totalContacts: contactsData.length,
        organizationId,
        contacts: {
          create: contactsData.map((c: { name?: string; phone: string }) => ({
            name: c.name?.trim() || null,
            phone: c.phone.trim(),
          })),
        },
      },
      include: {
        botConfig: { select: { id: true, name: true } },
        _count: { select: { contacts: true } },
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error('Create campaign error:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
