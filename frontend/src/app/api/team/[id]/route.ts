import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    // Verify user belongs to this org
    const existing = await prisma.user.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Сотрудник не найден' }, { status: 404 });
    }

    const body = await request.json();
    const allowedFields = ['name', 'email', 'role'];
    const data: Record<string, string> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    // Validate role if provided
    if (data.role) {
      const validRoles = ['OWNER', 'ADMIN', 'MANAGER'];
      const normalizedRole = data.role.toUpperCase();
      if (!validRoles.includes(normalizedRole)) {
        return NextResponse.json(
          { error: 'Роль должна быть OWNER, ADMIN или MANAGER' },
          { status: 400 }
        );
      }
      data.role = normalizedRole;
    }

    // If email is being changed, check uniqueness
    if (data.email && data.email !== existing.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (emailExists) {
        return NextResponse.json(
          { error: 'Пользователь с таким email уже существует' },
          { status: 409 }
        );
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: data as any,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('PATCH /api/team/[id] error:', error);
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
    const currentUserId = session.user.id;
    const { id } = await params;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    // Verify user belongs to this org
    const existing = await prisma.user.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Сотрудник не найден' }, { status: 404 });
    }

    // Can't delete yourself
    if (id === currentUserId) {
      return NextResponse.json(
        { error: 'Нельзя удалить свой аккаунт' },
        { status: 400 }
      );
    }

    // Can't delete the last OWNER
    if (existing.role === 'OWNER') {
      const ownerCount = await prisma.user.count({
        where: { organizationId, role: 'OWNER' },
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Нельзя удалить последнего владельца организации' },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/team/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
