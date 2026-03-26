import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface ParsedContact {
  name: string | null;
  phone: string;
}

function cleanPhone(raw: string): string {
  // Remove everything except digits and leading +
  const cleaned = raw.replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  // Ensure starts with + or digit
  return cleaned;
}

function parseCSV(text: string): ParsedContact[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const contacts: ParsedContact[] = [];
  const firstLine = lines[0].toLowerCase();
  const hasHeader =
    firstLine.includes('name') ||
    firstLine.includes('phone') ||
    firstLine.includes('имя') ||
    firstLine.includes('телефон') ||
    firstLine.includes('номер');

  const startIdx = hasHeader ? 1 : 0;

  // Detect separator
  const separator = lines[startIdx]?.includes(';') ? ';' : ',';

  for (let i = startIdx; i < lines.length; i++) {
    const parts = lines[i].split(separator).map((p) => p.trim().replace(/^["']|["']$/g, ''));
    if (parts.length === 0) continue;

    if (parts.length === 1) {
      // Single column = phone only
      const phone = cleanPhone(parts[0]);
      if (phone.length >= 7) {
        contacts.push({ name: null, phone });
      }
    } else {
      // Two or more columns: try to detect which is phone
      const firstIsPhone = /^\+?\d[\d\s()-]*$/.test(parts[0].replace(/\s/g, ''));
      if (firstIsPhone) {
        const phone = cleanPhone(parts[0]);
        if (phone.length >= 7) {
          contacts.push({ name: parts[1] || null, phone });
        }
      } else {
        const phone = cleanPhone(parts[1]);
        if (phone.length >= 7) {
          contacts.push({ name: parts[0] || null, phone });
        }
      }
    }
  }

  return contacts;
}

function parseTXT(text: string): ParsedContact[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const contacts: ParsedContact[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Try "name,phone" or "name;phone" format
    if (trimmed.includes(',') || trimmed.includes(';')) {
      const sep = trimmed.includes(';') ? ';' : ',';
      const parts = trimmed.split(sep).map((p) => p.trim());
      if (parts.length >= 2) {
        const firstIsPhone = /^\+?\d[\d\s()-]*$/.test(parts[0].replace(/\s/g, ''));
        if (firstIsPhone) {
          const phone = cleanPhone(parts[0]);
          if (phone.length >= 7) {
            contacts.push({ name: parts[1] || null, phone });
          }
        } else {
          const phone = cleanPhone(parts[1]);
          if (phone.length >= 7) {
            contacts.push({ name: parts[0] || null, phone });
          }
        }
        continue;
      }
    }

    // Try "name phone" format (name = words, phone = last token with digits)
    const tokens = trimmed.split(/\s+/);
    if (tokens.length >= 2) {
      const lastToken = tokens[tokens.length - 1];
      if (/^\+?\d[\d()-]*$/.test(lastToken)) {
        const phone = cleanPhone(lastToken);
        const name = tokens.slice(0, -1).join(' ');
        if (phone.length >= 7) {
          contacts.push({ name: name || null, phone });
          continue;
        }
      }
    }

    // Just a phone number
    const phone = cleanPhone(trimmed);
    if (phone.length >= 7) {
      contacts.push({ name: null, phone });
    }
  }

  return contacts;
}

// POST — upload CSV/TXT file, parse contacts and add to campaign
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const organizationId = (session.user as any).organizationId;

    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Кампания не найдена' }, { status: 404 });
    }

    if (campaign.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Нельзя добавлять контакты в завершённую кампанию' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Файл не загружен' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const text = await file.text();

    let contacts: ParsedContact[];

    if (fileName.endsWith('.csv')) {
      contacts = parseCSV(text);
    } else if (fileName.endsWith('.txt')) {
      contacts = parseTXT(text);
    } else {
      return NextResponse.json(
        { error: 'Поддерживаются только .csv и .txt файлы' },
        { status: 400 }
      );
    }

    if (contacts.length === 0) {
      return NextResponse.json(
        { error: 'Не удалось найти контакты в файле. Проверьте формат.' },
        { status: 400 }
      );
    }

    // Limit max contacts per upload
    if (contacts.length > 5000) {
      return NextResponse.json(
        { error: 'Максимум 5000 контактов за раз' },
        { status: 400 }
      );
    }

    // Create contacts and update total
    await prisma.campaignContact.createMany({
      data: contacts.map((c) => ({
        name: c.name,
        phone: c.phone,
        campaignId: id,
      })),
    });

    const totalContacts = await prisma.campaignContact.count({
      where: { campaignId: id },
    });

    await prisma.campaign.update({
      where: { id },
      data: { totalContacts },
    });

    return NextResponse.json({
      added: contacts.length,
      totalContacts,
      contacts,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Ошибка обработки файла' }, { status: 500 });
  }
}
