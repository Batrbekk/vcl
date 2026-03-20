import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organizationId = (session.user as any).organizationId;

    const { searchParams } = new URL(request.url);
    const stageId = searchParams.get('stageId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = { organizationId };

    if (stageId) {
      where.stageId = stageId;
    }
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error('GET /api/leads error:', error);
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
    const { name, phone, email, source, stageId, pipelineId, notes, tags, assignedToId, assignedBotId, channel } = body;

    if (!name || !phone || !stageId || !pipelineId) {
      return NextResponse.json(
        { error: 'name, phone, stageId, and pipelineId are required' },
        { status: 400 }
      );
    }

    // Verify pipeline belongs to this org
    const pipeline = await prisma.pipeline.findFirst({
      where: { id: pipelineId, organizationId },
    });
    if (!pipeline) {
      return NextResponse.json(
        { error: 'Pipeline not found' },
        { status: 404 }
      );
    }

    // Verify stage belongs to this pipeline
    const stage = await prisma.pipelineStage.findFirst({
      where: { id: stageId, pipelineId },
    });
    if (!stage) {
      return NextResponse.json(
        { error: 'Stage not found in this pipeline' },
        { status: 404 }
      );
    }

    // Validate assignedBotId if provided
    if (assignedBotId) {
      const bot = await prisma.botConfig.findFirst({
        where: { id: assignedBotId, organizationId },
      });
      if (!bot) {
        return NextResponse.json(
          { error: 'Bot not found in this organization' },
          { status: 400 }
        );
      }
    }

    // Validate assignedToId if provided
    if (assignedToId) {
      const user = await prisma.user.findFirst({
        where: { id: assignedToId, organizationId },
      });
      if (!user) {
        return NextResponse.json(
          { error: 'User not found in this organization' },
          { status: 400 }
        );
      }
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        phone,
        email: email || null,
        source: source || 'MANUAL',
        stageId,
        pipelineId,
        organizationId,
        notes: notes || null,
        tags: tags || [],
        assignedToId: assignedToId || null,
        assignedBotId: assignedBotId || null,
        channel: channel || 'PHONE',
      },
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

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error('POST /api/leads error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
