import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { makeOutboundCall } from '@/lib/vapi/client';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organizationId = (session.user as any).organizationId;

    const { searchParams } = new URL(request.url);
    const direction = searchParams.get('direction');
    const status = searchParams.get('status');
    const leadId = searchParams.get('leadId');

    const where: any = { organizationId };

    if (direction) {
      where.direction = direction;
    }
    if (status) {
      where.status = status;
    }
    if (leadId) {
      where.leadId = leadId;
    }

    const calls = await prisma.call.findMany({
      where,
      include: {
        lead: {
          select: { id: true, name: true, phone: true },
        },
        transcripts: {
          orderBy: { timestamp: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(calls);
  } catch (error) {
    console.error('GET /api/calls error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organizationId = (session.user as any).organizationId;

    const body = await request.json();
    const { leadId, assistantId } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId is required' },
        { status: 400 }
      );
    }

    // Verify lead belongs to this org
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
    });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Get org for assistant config
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const vapiAssistantId = assistantId || org.vapiAssistantId;
    if (!vapiAssistantId) {
      return NextResponse.json(
        { error: 'No assistant configured. Set up the bot first.' },
        { status: 400 }
      );
    }

    // Create call record with QUEUED status
    const call = await prisma.call.create({
      data: {
        direction: 'OUTBOUND',
        status: 'QUEUED',
        organizationId,
        leadId: lead.id,
      },
    });

    try {
      // Initiate outbound call via VAPI
      const vapiResponse = await makeOutboundCall({
        assistantId: vapiAssistantId,
        customer: {
          number: lead.phone,
          name: lead.name,
        },
        metadata: {
          callId: call.id,
          leadId: lead.id,
          organizationId,
        },
      });

      // Update call with VAPI call ID
      const updatedCall = await prisma.call.update({
        where: { id: call.id },
        data: {
          vapiCallId: vapiResponse.id,
          status: 'RINGING',
        },
        include: {
          lead: {
            select: { id: true, name: true, phone: true },
          },
        },
      });

      // Update lead's last contact time
      await prisma.lead.update({
        where: { id: lead.id },
        data: { lastContactAt: new Date() },
      });

      return NextResponse.json(updatedCall, { status: 201 });
    } catch (vapiError) {
      // If VAPI call fails, mark call as FAILED
      await prisma.call.update({
        where: { id: call.id },
        data: { status: 'FAILED' },
      });

      console.error('VAPI call error:', vapiError);
      return NextResponse.json(
        {
          error: 'Failed to initiate call',
          details: vapiError instanceof Error ? vapiError.message : 'Unknown VAPI error',
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('POST /api/calls error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
