import { pool } from '../db';
import { sendTelegramMessage } from '../actions/telegram';
import fs from 'fs';
import path from 'path';

// Cooldown to prevent spam: 6 hours
const COOLDOWN_MS = 6 * 60 * 60 * 1000;
const STATE_FILE = path.join(process.cwd(), '.telegram_state.json');

interface State {
  [ip: string]: number; // Maps IP to timestamp of last alert
}

function loadState(): State {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to load telegram state:", e);
  }
  return {};
}

function saveState(state: State) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.error("Failed to save telegram state:", e);
  }
}

export async function runTelegramNotifier() {
  console.log("[TelegramNotifier] Starting check for critical threats...");
  const client = await pool.connect();
  try {
    // Busca todos os hosts em estado CRITICO com seus respectivos clients e chat IDs
    const query = `
      SELECT h.ip, h.role, c.telegram_chat_id, c.name as client_name
      FROM host_profile h
      JOIN networks n ON h.ip << n.cidr
      JOIN clients c ON c.id = n.client_id
      WHERE h.nivel_alerta = 'critico' AND c.telegram_chat_id IS NOT NULL
    `;
    const res = await client.query(query);
    const threats = res.rows;

    if (threats.length === 0) {
      console.log("[TelegramNotifier] No critical threats found with configured chat IDs.");
      return;
    }

    const state = loadState();
    const now = Date.now();
    let updated = false;

    for (const threat of threats) {
      const { ip, role, telegram_chat_id, client_name } = threat;
      const lastAlert = state[ip];

      if (!lastAlert || (now - lastAlert) > COOLDOWN_MS) {
        // Enviar Alerta
        const msg = `🚨 *ALERTA CRÍTICO DE SEGURANÇA* 🚨\n\n` +
                    `🏢 *Organização:* ${client_name}\n` +
                    `💻 *Host Comprometido:* \`${ip}\`\n` +
                    `🔍 *Motivo:* ${role || 'Anomalia Crítica Detectada'}\n\n` +
                    `⚠️ *Ação Requerida:* Isole o host imediatamente e investigue o tráfego de rede pelo SOC.`;
        
        console.log(`[TelegramNotifier] Sending alert for IP ${ip} to chat ${telegram_chat_id}`);
        await sendTelegramMessage(telegram_chat_id, msg);
        
        state[ip] = now;
        updated = true;
      }
    }

    if (updated) {
      saveState(state);
    }

  } catch (error) {
    console.error("[TelegramNotifier] Error running notifier:", error);
  } finally {
    client.release();
  }
}

// If executed directly (e.g. via node cron), run it
if (require.main === module) {
  runTelegramNotifier().then(() => process.exit(0)).catch(() => process.exit(1));
}
