import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { resetTokens } from '../forgot-password/route';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Токен и пароль обязательны' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Пароль должен быть не менее 6 символов' }, { status: 400 });
    }

    // Verify token
    const tokenData = resetTokens.get(token);
    if (!tokenData) {
      return NextResponse.json({ error: 'Ссылка недействительна или истекла' }, { status: 400 });
    }

    if (tokenData.expiresAt < Date.now()) {
      resetTokens.delete(token);
      return NextResponse.json({ error: 'Ссылка истекла. Запросите новую.' }, { status: 400 });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: tokenData.userId },
      data: { password: hashedPassword },
    });

    // Delete used token
    resetTokens.delete(token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
