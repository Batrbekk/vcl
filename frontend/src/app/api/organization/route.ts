import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { organizationData } from '@/data/seed';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const organizationId = (session.user as any).organizationId;

    // Demo user fallback
    if (organizationId === 'demo_org' || organizationId?.startsWith('demo_')) {
      return NextResponse.json({
        name: organizationData.name,
        slug: organizationData.slug,
        industry: organizationData.industry,
        phone: organizationData.phone,
      });
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        slug: true,
        industry: true,
        phone: true,
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
    console.error('GET /api/organization error:', error);
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

    // Demo users can't update
    if (organizationId === 'demo_org' || organizationId?.startsWith('demo_')) {
      return NextResponse.json(
        { error: 'Редактирование недоступно для демо-аккаунтов' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const allowedFields = ['name', 'industry', 'phone'];

    const data: Record<string, string> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = String(body[field]).trim();
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'Нет данных для обновления' },
        { status: 400 }
      );
    }

    // Validate name is not empty
    if (data.name !== undefined && data.name.length === 0) {
      return NextResponse.json(
        { error: 'Название компании не может быть пустым' },
        { status: 400 }
      );
    }

    const org = await prisma.organization.update({
      where: { id: organizationId },
      data,
      select: {
        name: true,
        slug: true,
        industry: true,
        phone: true,
      },
    });

    return NextResponse.json(org);
  } catch (error) {
    console.error('PATCH /api/organization error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
