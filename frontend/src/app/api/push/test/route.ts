import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sendPushNotification } from '@/lib/push';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await sendPushNotification(session.user.id, {
      title: 'VOXI — Тест',
      body: 'Push-уведомления работают!',
      url: '/',
      tag: 'test',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push test error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send test' },
      { status: 500 }
    );
  }
}
