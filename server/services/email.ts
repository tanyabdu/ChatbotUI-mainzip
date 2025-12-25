import crypto from "crypto";

const RUSENDER_API_URL = "https://api.beta.rusender.ru/api/v1/external-mails/send";
const FROM_EMAIL = process.env.RUSENDER_FROM_EMAIL || "noreply@esoteric-planner.ru";
const FROM_NAME = "Эзотерический Планировщик";

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
