'use server';

export async function sendTelegramMessage(chat_id: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN is not defined in .env.local");
    return { error: "Token do Telegram não configurado no servidor." };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id,
        text,
        parse_mode: "Markdown"
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Telegram API Error:", data);
      return { error: `Erro da API do Telegram: ${data.description}` };
    }
    
    return { success: true };
  } catch (err: any) {
    console.error("Failed to send telegram msg:", err);
    return { error: `Falha na requisição: ${err.message}` };
  }
}

export async function testTelegramIntegration(chat_id: string) {
  if (!chat_id || chat_id.trim() === '') {
    return { error: "Chat ID não fornecido." };
  }

  const msg = `🚀 *Teste de Integração - Plataforma SOC*\nSeu Chat ID \`${chat_id}\` foi configurado com sucesso! Você passará a receber os alertas críticos da rede por aqui.`;
  return await sendTelegramMessage(chat_id.trim(), msg);
}
