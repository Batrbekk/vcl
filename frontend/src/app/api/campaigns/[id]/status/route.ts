import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const organizationId = (session.user as any).organizationId;

    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId },
      select: { id: true, name: true, status: true, totalContacts: true, completedCalls: true },
    });

    if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const contacts = await prisma.campaignContact.findMany({
      where: { campaignId: id },
      select: { id: true, name: true, phone: true, status: true, notes: true, calledAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const stats = {
      pending: contacts.filter(c => c.status === 'PENDING').length,
      calling: contacts.filter(c => c.status === 'CALLING').length,
      completed: contacts.filter(c => c.status === 'COMPLETED').length,
      noAnswer: contacts.filter(c => c.status === 'NO_ANSWER').length,
      failed: contacts.filter(c => c.status === 'FAILED').length,
    };

    const progress = campaign.totalContacts > 0
      ? Math.round((campaign.completedCalls / campaign.totalContacts) * 100)
      : 0;

    return NextResponse.json({ campaign: { ...campaign, progress, stats }, contacts });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
