import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const VPS_HOST = process.env.VPS_HOST || '195.210.47.19';
const CALL_GAP_MS = 5000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanPhone(raw: string): string | null {
  let phone = raw.replace(/[^0-9]/g, '');
  if (phone.startsWith('8') && phone.length === 11) phone = '7' + phone.slice(1);
  if (phone.length !== 11 || !phone.startsWith('7')) return null;
  return phone;
}

async function originateCall(phone: string) {
  try {
    const res = await fetch(`http://${VPS_HOST}:9093/originate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    if (!res.ok) return { success: false, error: await res.text() };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

async function processCampaignContacts(campaignId: string, organizationId: string) {
  try {
    const contacts = await prisma.campaignContact.findMany({
      where: { campaignId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`[Campaign ${campaignId}] Starting ${contacts.length} calls`);

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];

      const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { status: true } });
      if (!campaign || campaign.status !== 'RUNNING') break;

      const phone = cleanPhone(contact.phone);
      if (!phone) {
        await prisma.campaignContact.update({
          where: { id: contact.id },
          data: { status: 'FAILED', notes: 'Неверный формат номера', calledAt: new Date() },
        });
        await prisma.campaign.update({ where: { id: campaignId }, data: { completedCalls: { increment: 1 } } });
        continue;
      }

      await prisma.campaignContact.update({ where: { id: contact.id }, data: { status: 'CALLING', calledAt: new Date() } });

      const result = await originateCall(phone);

      await prisma.campaignContact.update({
        where: { id: contact.id },
        data: {
          status: result.success ? 'COMPLETED' : 'FAILED',
          notes: result.success ? 'Звонок выполнен' : `Ошибка: ${(result.error || '').slice(0, 200)}`,
        },
      });

      await prisma.campaign.update({ where: { id: campaignId }, data: { completedCalls: { increment: 1 } } });
      console.log(`[Campaign ${campaignId}] ${phone}: ${result.success ? 'OK' : 'FAIL'} — ${i + 1}/${contacts.length}`);

      if (i < contacts.length - 1) await sleep(CALL_GAP_MS);
    }

    const remaining = await prisma.campaignContact.count({ where: { campaignId, status: 'PENDING' } });
    if (remaining === 0) {
      await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'COMPLETED' } });
      console.log(`[Campaign ${campaignId}] COMPLETED`);
    }
  } catch (error) {
    console.error(`[Campaign ${campaignId}] Error:`, error);
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'PAUSED' } }).catch(() => {});
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const organizationId = (session.user as any).organizationId;

    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { contacts: true } } },
    });

    if (!campaign) return NextResponse.json({ error: 'Кампания не найдена' }, { status: 404 });
    if (campaign.status !== 'DRAFT' && campaign.status !== 'PAUSED') {
      return NextResponse.json({ error: `Нельзя запустить кампанию со статусом ${campaign.status}` }, { status: 400 });
    }
    if (campaign._count.contacts === 0) return NextResponse.json({ error: 'Добавьте контакты' }, { status: 400 });

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: 'RUNNING', completedCalls: 0, totalContacts: campaign._count.contacts },
    });

    processCampaignContacts(id, organizationId).catch(console.error);

    return NextResponse.json({ campaign: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to start campaign' }, { status: 500 });
  }
}
