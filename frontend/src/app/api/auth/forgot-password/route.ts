import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendResetPasswordEmail } from '@/lib/email';
import crypto from 'crypto';

// Simple in-memory token store (for production use Redis or DB table)
// Tokens expire after 1 hour
const resetTokens = new Map<string, { userId: string; email: string; expiresAt: number }>();

// Cleanup expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of resetTokens) {
    if (data.expiresAt < now) resetTokens.delete(token);
  }
}, 60000);

export { resetTokens };

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email обязателен' }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Always return success (don't reveal if email exists)
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    resetTokens.set(token, {
      userId: user.id,
      email: user.email,
      expiresAt: Date.now() + 3600000, // 1 hour
    });

    // Send email
    try {
      await sendResetPasswordEmail(user.email, user.name, token);
    } catch (emailErr) {
      console.error('Failed to send reset email:', emailErr);
      return NextResponse.json({ error: 'Не удалось отправить письмо' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
