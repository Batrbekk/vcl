import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST — add contacts manually
export async function POST(
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

    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Кампания не найдена' }, { status: 404 });
    }

    if (campaign.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Нельзя добавлять контакты в завершённую кампанию' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { contacts } = body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { error: 'Необходимо передать массив контактов' },
        { status: 400 }
      );
    }

    // Validate contacts
    const validContacts = contacts
      .filter((c: any) => c.phone && c.phone.trim())
      .map((c: any) => ({
        name: c.name?.trim() || null,
        phone: c.phone.trim(),
        campaignId: id,
      }));

    if (validContacts.length === 0) {
      return NextResponse.json(
        { error: 'Нет контактов с валидным номером телефона' },
        { status: 400 }
      );
    }

    await prisma.campaignContact.createMany({
      data: validContacts,
    });

    const totalContacts = await prisma.campaignContact.count({
      where: { campaignId: id },
    });

    await prisma.campaign.update({
      where: { id },
      data: { totalContacts },
    });

    return NextResponse.json({
      added: validContacts.length,
      totalContacts,
    });
  } catch (error) {
    console.error('Add contacts error:', error);
    return NextResponse.json({ error: 'Failed to add contacts' }, { status: 500 });
  }
}
