import crypto from "crypto";

const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET || "esoteric-unsubscribe-secret-key";

export function generateUnsubscribeToken(email: string): string {
  return crypto.createHmac("sha256", UNSUBSCRIBE_SECRET).update(email.toLowerCase()).digest("hex");
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = generateUnsubscribeToken(email);
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(token, "hex"));
}

export function appendUnsubscribeFooter(html: string, unsubscribeUrl: string): string {
  const footer = `
    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center;">
      <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
        Вы получили это письмо, так как подписались на рассылку.<br/>
        <a href="${unsubscribeUrl}" style="color: #9CA3AF; text-decoration: underline;">Отписаться от рассылки</a>
      </p>
    </div>
  `;
  const closingBody = html.lastIndexOf("</div>");
  if (closingBody !== -1) {
    return html.slice(0, closingBody + 6) + footer;
  }
  return html + footer;
}

const RUSENDER_API_URL = "https://api.beta.rusender.ru/api/v1/external-mails/send";
const FROM_EMAIL = process.env.RUSENDER_FROM_EMAIL || "noreply@esoteric-planner.ru";
const FROM_NAME = "Эзотерический Планировщик";
const ADMIN_EMAIL = "tanya.fskate@gmail.com";

const errorThrottle: Record<string, number> = {};
const THROTTLE_INTERVAL_MS = 10 * 60 * 1000;

interface EmailParams {
  to: string;
  toName?: string;
  subject: string;
  html: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  const apiKey = process.env.RUSENDER_API_KEY;
  
  console.log(`[Email] Attempting to send email to ${params.to}, subject: "${params.subject}"`);
  console.log(`[Email] FROM_EMAIL: ${FROM_EMAIL}, API Key exists: ${!!apiKey}`);
  
  if (!apiKey) {
    console.error("[Email] RUSENDER_API_KEY not configured");
    return false;
  }

  const idempotencyKey = crypto.randomUUID();

  const payload = {
    idempotencyKey,
    mail: {
      to: {
        email: params.to,
        name: params.toName || params.to,
      },
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject: params.subject,
      html: params.html,
    },
  };

  try {
    console.log(`[Email] Sending request to Rusender API...`);
    const response = await fetch(RUSENDER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log(`[Email] Rusender response status: ${response.status}, body: ${responseText}`);

    if (!response.ok) {
      console.error(`[Email] Rusender API error (${response.status}): ${responseText}`);
      return false;
    }

    console.log(`[Email] Successfully sent email to ${params.to}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send email:", error);
    return false;
  }
}

export async function sendWelcomeEmail(email: string, password: string): Promise<boolean> {
  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #7C3AED; font-size: 24px;">Добро пожаловать в Эзотерический Планировщик!</h1>
      </div>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Ваш аккаунт успешно создан. Вот ваши данные для входа:
      </p>
      
      <div style="background: linear-gradient(135deg, #E9D5FF 0%, #FCE7F3 100%); padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 0; color: #374151;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 10px 0 0; color: #374151;"><strong>Пароль:</strong> ${password}</p>
      </div>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Рекомендуем сменить пароль после первого входа в настройках профиля.
      </p>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        У вас есть <strong>3 дня бесплатного пробного периода</strong> для изучения всех возможностей планировщика.
      </p>
      
      <div style="text-align: center; margin-top: 30px;">
        <p style="color: #9CA3AF; font-size: 14px;">
          С уважением,<br/>Команда Эзотерического Планировщика
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: "Добро пожаловать в Эзотерический Планировщик",
    html,
  });
}

export async function sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #7C3AED; font-size: 24px;">Сброс пароля</h1>
      </div>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Вы запросили сброс пароля для вашего аккаунта в Эзотерическом Планировщике.
      </p>
      
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Нажмите на кнопку ниже, чтобы создать новый пароль:
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Сбросить пароль
        </a>
      </div>
      
      <p style="color: #6B7280; font-size: 14px; line-height: 1.6;">
        Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:
        <br/><a href="${resetLink}" style="color: #7C3AED;">${resetLink}</a>
      </p>
      
      <p style="color: #6B7280; font-size: 14px; line-height: 1.6;">
        Ссылка действительна в течение 1 часа. Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
      </p>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
        <p style="color: #9CA3AF; font-size: 14px;">
          С уважением,<br/>Команда Эзотерического Планировщика
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: "Сброс пароля - Эзотерический Планировщик",
    html,
  });
}

export async function sendPaymentNotification(params: {
  userEmail: string;
  userName?: string;
  planType: string;
  amount: string;
  orderId: string;
  expiresAt: Date;
}): Promise<boolean> {
  const timestamp = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });
  const expiresStr = params.expiresAt.toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow", day: "2-digit", month: "2-digit", year: "numeric" });
  const planLabel = params.planType === "yearly" ? "Годовая подписка" : "Месячная подписка";
  const amountFormatted = parseFloat(params.amount).toLocaleString("ru-RU") + " ₽";

  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%); border-left: 4px solid #10B981; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #065F46; margin: 0 0 4px 0; font-size: 20px;">✅ Новая оплата!</h2>
        <p style="color: #047857; margin: 0; font-size: 14px;">${timestamp} (МСК)</p>
      </div>

      <div style="background: #F9FAFB; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #6B7280; font-size: 14px; width: 40%;">Пользователь:</td>
            <td style="padding: 6px 0; color: #111827; font-weight: 600; font-size: 14px;">${params.userEmail}${params.userName ? ` (${params.userName})` : ""}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">Тариф:</td>
            <td style="padding: 6px 0; color: #111827; font-weight: 600; font-size: 14px;">${planLabel}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">Сумма:</td>
            <td style="padding: 6px 0; color: #059669; font-weight: 700; font-size: 16px;">${amountFormatted}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">Доступ до:</td>
            <td style="padding: 6px 0; color: #111827; font-weight: 600; font-size: 14px;">${expiresStr}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6B7280; font-size: 14px;">Номер заказа:</td>
            <td style="padding: 6px 0; color: #6B7280; font-size: 12px; font-family: monospace;">${params.orderId}</td>
          </tr>
        </table>
      </div>
    </div>
  `;

  return sendEmail({
    to: ADMIN_EMAIL,
    toName: "Администратор",
    subject: `💰 Оплата: ${planLabel} — ${amountFormatted}`,
    html,
  });
}

export async function sendErrorNotification(
  serviceName: string,
  errorMessage: string,
  details?: string
): Promise<boolean> {
  const now = Date.now();
  const lastSent = errorThrottle[serviceName] || 0;
  if (now - lastSent < THROTTLE_INTERVAL_MS) {
    console.log(`[Email] Error notification for "${serviceName}" throttled (last sent ${Math.round((now - lastSent) / 1000)}s ago)`);
    return false;
  }

  const timestamp = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });

  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #FEE2E2; border-left: 4px solid #EF4444; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #DC2626; margin: 0 0 8px 0; font-size: 18px;">Ошибка сервиса: ${serviceName}</h2>
        <p style="color: #991B1B; margin: 0; font-size: 14px;">${timestamp} (МСК)</p>
      </div>

      <div style="background: #F9FAFB; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <p style="color: #374151; margin: 0 0 4px 0; font-weight: 600;">Ошибка:</p>
        <p style="color: #EF4444; margin: 0; font-family: monospace; font-size: 14px;">${errorMessage}</p>
      </div>

      ${details ? `
      <div style="background: #F9FAFB; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <p style="color: #374151; margin: 0 0 4px 0; font-weight: 600;">Детали:</p>
        <p style="color: #6B7280; margin: 0; font-size: 14px; white-space: pre-wrap;">${details}</p>
      </div>
      ` : ""}

      <p style="color: #9CA3AF; font-size: 12px; margin-top: 20px;">
        Уведомления отправляются не чаще 1 раза в 10 минут на каждый сервис.
      </p>
    </div>
  `;

  const sent = await sendEmail({
    to: ADMIN_EMAIL,
    toName: "Администратор",
    subject: `Ошибка: ${serviceName}`,
    html,
  });

  if (sent) {
    errorThrottle[serviceName] = now;
  }

  return sent;
}
