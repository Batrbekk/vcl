import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organizationId = (session.user as any).organizationId;
    const { id } = await params;

    const lead = await prisma.lead.findFirst({
      where: { id, organizationId },
      include: {
        stage: true,
        pipeline: {
          include: { stages: { orderBy: { order: 'asc' } } },
        },
        assignedTo: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        assignedBot: {
          select: { id: true, name: true, isActive: true },
        },
        calls: {
          orderBy: { createdAt: 'desc' },
          include: { transcripts: { orderBy: { timestamp: 'asc' } } },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error('GET /api/leads/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organizationId = (session.user as any).organizationId;
    const { id } = await params;

    // Verify lead belongs to this org
    const existing = await prisma.lead.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const body = await request.json();
    const allowedFields = [
      'name', 'phone', 'email', 'stageId', 'status',
      'notes', 'tags', 'assignedToId', 'assignedBotId', 'channel',
      'budget', 'need', 'timeline', 'qualityScore',
    ];

    const data: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    // If stageId is changing, verify it belongs to the lead's pipeline
    if (data.stageId) {
      const stage = await prisma.pipelineStage.findFirst({
        where: { id: data.stageId, pipelineId: existing.pipelineId },
      });
      if (!stage) {
        return NextResponse.json(
          { error: 'Stage not found in this pipeline' },
          { status: 400 }
        );
      }
    }

    // If assignedToId is changing, verify user belongs to the org
    if (data.assignedToId) {
      const user = await prisma.user.findFirst({
        where: { id: data.assignedToId, organizationId },
      });
      if (!user) {
        return NextResponse.json(
          { error: 'User not found in this organization' },
          { status: 400 }
        );
      }
    }

    // If assignedBotId is changing, verify bot belongs to the org
    if (data.assignedBotId) {
      const bot = await prisma.botConfig.findFirst({
        where: { id: data.assignedBotId, organizationId },
      });
      if (!bot) {
        return NextResponse.json(
          { error: 'Bot not found in this organization' },
          { status: 400 }
        );
      }
    }

    const lead = await prisma.lead.update({
      where: { id },
      data,
      include: {
        stage: true,
        assignedTo: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        assignedBot: {
          select: { id: true, name: true, isActive: true },
        },
        pipeline: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(lead);
  } catch (error) {
    console.error('PATCH /api/leads/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organizationId = (session.user as any).organizationId;
    const { id } = await params;

    // Verify lead belongs to this org
    const existing = await prisma.lead.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    await prisma.lead.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/leads/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
