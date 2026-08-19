type TelegramResponse = { ok: boolean; description?: string };

async function telegramRequest(method: string, body: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram bot token is not configured");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as TelegramResponse | null;
  if (!response.ok || !data?.ok) throw new Error(data?.description || `Telegram returned ${response.status}`);
}

export async function sendTelegramMessage(chatId: string, text: string) {
  await telegramRequest("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true });
}

export function resolveTelegramWebhookOrigin(request: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configuredUrl?.startsWith("https://")) return configuredUrl;
  const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost && forwardedProto === "https") return `https://${forwardedHost}`;
  const requestOrigin = new URL(request.url).origin;
  if (requestOrigin.startsWith("https://")) return requestOrigin;
  throw new Error("Telegram webhook requires an HTTPS application URL. Set NEXT_PUBLIC_APP_URL to the production Vercel domain.");
}

export async function configureTelegramWebhook(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) throw new Error("Telegram webhook secret is not configured");
  const origin = resolveTelegramWebhookOrigin(request);
  await telegramRequest("setWebhook", {
    url: `${origin}/api/telegram/webhook`,
    secret_token: secret,
    allowed_updates: ["message"],
  });
}
