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

    const call = await prisma.call.findFirst({
      where: { id, organizationId },
      include: {
        transcripts: {
          orderBy: { timestamp: 'asc' },
        },
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            status: true,
            stage: true,
          },
        },
      },
    });

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    return NextResponse.json(call);
  } catch (error) {
    console.error('GET /api/calls/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
