import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const FROM = process.env.EMAIL_FROM || 'Voxi <info@voxi.kz>';

function resetPasswordTemplate(name: string, resetLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #09090b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color: #18181b; border-radius: 16px; border: 1px solid #27272a; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #27272a;">
              <img src="https://voxi.kz/logo-full.svg" alt="VOXI" width="160" height="48" style="display: block; margin: 0 auto 8px;" />
              <p style="margin: 4px 0 0; color: #71717a; font-size: 13px;">AI-платформа автоматизации продаж</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 8px; color: #fafafa; font-size: 18px; font-weight: 600;">Сброс пароля</h2>
              <p style="margin: 0 0 24px; color: #a1a1aa; font-size: 14px; line-height: 1.6;">
                Здравствуйте, ${name}! Мы получили запрос на сброс пароля для вашего аккаунта.
              </p>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${resetLink}"
                       style="display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">
                      Сбросить пароль
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px; color: #71717a; font-size: 13px; line-height: 1.5;">
                Ссылка действительна в течение <strong style="color: #a1a1aa;">1 часа</strong>. Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо.
              </p>

              <!-- Link fallback -->
              <div style="background-color: #0a0a0b; border: 1px solid #27272a; border-radius: 8px; padding: 12px 16px; margin-top: 16px;">
                <p style="margin: 0 0 4px; color: #71717a; font-size: 11px;">Если кнопка не работает, скопируйте ссылку:</p>
                <p style="margin: 0; color: #6366f1; font-size: 12px; word-break: break-all;">${resetLink}</p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #27272a; text-align: center;">
              <p style="margin: 0; color: #52525b; font-size: 12px;">
                &copy; ${new Date().getFullYear()} VOXI. Все права защищены.
              </p>
              <p style="margin: 4px 0 0; color: #3f3f46; font-size: 11px;">
                Это автоматическое сообщение, не отвечайте на него.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendResetPasswordEmail(email: string, name: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://voxi.kz';
  const resetLink = `${baseUrl}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Сброс пароля — VOXI',
    html: resetPasswordTemplate(name, resetLink),
  });
}

// --- Notification email templates ---

function emailWrapper(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #09090b; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color: #18181b; border-radius: 16px; border: 1px solid #27272a; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #27272a;">
              <img src="https://voxi.kz/logo-full.svg" alt="VOXI" width="160" height="48" style="display: block; margin: 0 auto 8px;" />
              <p style="margin: 4px 0 0; color: #71717a; font-size: 13px;">AI-платформа автоматизации продаж</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 20px; color: #fafafa; font-size: 18px; font-weight: 600;">${title}</h2>
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #27272a; text-align: center;">
              <p style="margin: 0; color: #52525b; font-size: 12px;">
                &copy; ${new Date().getFullYear()} VOXI. Все права защищены.
              </p>
              <p style="margin: 4px 0 0; color: #3f3f46; font-size: 11px;">
                Это автоматическое уведомление, не отвечайте на него.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function infoCard(label: string, value: string): string {
  return `
    <div style="background-color: #0a0a0b; border: 1px solid #27272a; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px;">
      <p style="margin: 0 0 2px; color: #71717a; font-size: 12px;">${label}</p>
      <p style="margin: 0; color: #fafafa; font-size: 15px; font-weight: 500;">${value}</p>
    </div>`;
}

function newLeadTemplate(leadName: string, source: string): string {
  const content = `
    <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 14px; line-height: 1.6;">
      В вашу воронку добавлен новый лид. Проверьте данные и свяжитесь при необходимости.
    </p>
    ${infoCard('Имя лида', leadName)}
    ${infoCard('Источник', source)}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
      <tr>
        <td align="center">
          <a href="${process.env.NEXTAUTH_URL || 'https://voxi.kz'}/leads"
             style="display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 600;">
            Открыть лиды
          </a>
        </td>
      </tr>
    </table>`;
  return emailWrapper('Новый лид', content);
}

function callCompletedTemplate(leadName: string, score: number, summary: string): string {
  const scoreColor = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444';
  const content = `
    <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 14px; line-height: 1.6;">
      AI-бот завершил звонок. Ознакомьтесь с результатами квалификации.
    </p>
    ${infoCard('Лид', leadName)}
    <div style="background-color: #0a0a0b; border: 1px solid #27272a; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px;">
      <p style="margin: 0 0 2px; color: #71717a; font-size: 12px;">Оценка квалификации</p>
      <p style="margin: 0; color: ${scoreColor}; font-size: 22px; font-weight: 700;">${score}<span style="color: #71717a; font-size: 14px; font-weight: 400;">/100</span></p>
    </div>
    ${infoCard('Краткое резюме', summary || 'Нет данных')}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
      <tr>
        <td align="center">
          <a href="${process.env.NEXTAUTH_URL || 'https://voxi.kz'}/calls"
             style="display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 600;">
            Открыть звонки
          </a>
        </td>
      </tr>
    </table>`;
  return emailWrapper('Звонок завершён', content);
}

function missedCallTemplate(leadName: string, phone: string): string {
  const content = `
    <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 14px; line-height: 1.6;">
      Зафиксирован пропущенный звонок. Рекомендуем перезвонить в ближайшее время.
    </p>
    ${infoCard('Лид', leadName)}
    ${infoCard('Телефон', phone)}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
      <tr>
        <td align="center">
          <a href="${process.env.NEXTAUTH_URL || 'https://voxi.kz'}/calls"
             style="display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 600;">
            Открыть звонки
          </a>
        </td>
      </tr>
    </table>`;
  return emailWrapper('Пропущенный звонок', content);
}

export async function sendNewLeadNotification(email: string, leadName: string, source: string) {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Новый лид: ${leadName} (${source}) — VOXI`,
    html: newLeadTemplate(leadName, source),
  });
}

export async function sendCallCompletedNotification(email: string, leadName: string, score: number, summary: string) {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Звонок завершён: ${leadName}, оценка: ${score}/100 — VOXI`,
    html: callCompletedTemplate(leadName, score, summary),
  });
}

export async function sendMissedCallNotification(email: string, leadName: string, phone: string) {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Пропущенный звонок: ${leadName} — VOXI`,
    html: missedCallTemplate(leadName, phone),
  });
}

export async function verifyEmailConnection() {
  try {
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
}
