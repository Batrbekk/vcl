import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: 'Номер телефона обязателен' }, { status: 400 });
    }

    // Clean phone number — keep only digits, ensure starts with 7
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('8') && cleanPhone.length === 11) {
      cleanPhone = '7' + cleanPhone.slice(1);
    }
    if (cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.slice(1);
    }
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith('7')) {
      return NextResponse.json({ error: 'Неверный формат номера. Пример: +77758221235' }, { status: 400 });
    }

    // Call Asterisk CLI on VPS via SSH or direct API
    // For now, use the Asterisk Manager Interface (AMI) via HTTP
    const VPS_HOST = process.env.VPS_HOST || '195.210.47.19';

    // Execute via fetch to a small helper on VPS, or use asterisk CLI
    // Simplest: call our pipeline's originate endpoint
    const res = await fetch(`http://${VPS_HOST}:9093/originate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleanPhone }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err || 'Не удалось инициировать звонок' }, { status: 500 });
    }

    return NextResponse.json({ success: true, phone: cleanPhone });
  } catch (error) {
    console.error('Originate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ошибка' },
      { status: 500 }
    );
  }
}
