import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organizationId = (session.user as any).organizationId;

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        botName: true,
        botVoice: true,
        botPrompt: true,
        botGreeting: true,
        botMaxRetries: true,
        botRetryInterval: true,
        vapiAssistantId: true,
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(org);
  } catch (error) {
    console.error('GET /api/bot error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organizationId = (session.user as any).organizationId;

    const body = await request.json();
    const allowedFields = [
      'botName',
      'botVoice',
      'botPrompt',
      'botGreeting',
      'botMaxRetries',
      'botRetryInterval',
      'vapiAssistantId',
    ];

    const data: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Validate numeric fields
    if (data.botMaxRetries !== undefined && (typeof data.botMaxRetries !== 'number' || data.botMaxRetries < 0)) {
      return NextResponse.json(
        { error: 'botMaxRetries must be a non-negative number' },
        { status: 400 }
      );
    }
    if (data.botRetryInterval !== undefined && (typeof data.botRetryInterval !== 'number' || data.botRetryInterval < 1)) {
      return NextResponse.json(
        { error: 'botRetryInterval must be a positive number' },
        { status: 400 }
      );
    }

    const org = await prisma.organization.update({
      where: { id: organizationId },
      data,
      select: {
        botName: true,
        botVoice: true,
        botPrompt: true,
        botGreeting: true,
        botMaxRetries: true,
        botRetryInterval: true,
        vapiAssistantId: true,
      },
    });

    return NextResponse.json(org);
  } catch (error) {
    console.error('PATCH /api/bot error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
