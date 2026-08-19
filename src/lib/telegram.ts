type TelegramResponse = { ok: boolean; description?: string };

export async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram bot token is not configured");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  const data = (await response.json().catch(() => null)) as TelegramResponse | null;
  if (!response.ok || !data?.ok) throw new Error(data?.description || `Telegram returned ${response.status}`);
}
