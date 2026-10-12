/**
 * ═══════════════════════════════════════════════════════════════════
 * WHATSAPP CLIENT INITIALIZER & LIFE-CYCLE CONTROLLER
 * ═══════════════════════════════════════════════════════════════════
 */

import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { whatsappConfig, log, logError } from './config.js';
import { registerSenderClient, setSenderReady } from './lib/sender.js';
import { handleIncomingMessage, type IncomingMessageLike } from './handler.js';
import { startNotificationScheduler } from './notifications.js';

let client: InstanceType<typeof Client> | null = null;
let isStarted = false;

export const startWhatsAppBot = async (): Promise<void> => {
  if (isStarted) return;
  if (!whatsappConfig.enabled) {
    log('WhatsApp bot is disabled (WHATSAPP_ENABLED=false). Skipping boot.');
    return;
  }

  isStarted = true;
  log(`Initializing WhatsApp Web client with auth session at "${whatsappConfig.sessionPath}"...`);

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: whatsappConfig.sessionPath,
      clientId: 'default',
    }),
    puppeteer: {
      headless: true,
      handleSIGINT: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    },
  });

  client.on('qr', (qr: string) => {
    log('Scan the QR code below to link your WhatsApp account:');
    qrcode.generate(qr, { small: true });
  });

  client.on('authenticated', () => {
    log('WhatsApp client authenticated successfully.');
  });

  client.on('auth_failure', (msg: string) => {
    logError('WhatsApp authentication failed:', msg);
    setSenderReady(false);
  });

  client.on('ready', () => {
    log('🚀 WhatsApp bot is ready and listening for incoming messages!');
    setSenderReady(true);
    startNotificationScheduler();
  });

  client.on('disconnected', (reason: string) => {
    log(`WhatsApp client disconnected: ${reason}`);
    setSenderReady(false);
  });

  client.on('message', async (message: unknown) => {
    try {
      await handleIncomingMessage(message as IncomingMessageLike);
    } catch (err) {
      logError('Unhandled message error:', err);
    }
  });

  registerSenderClient(client);

  client.initialize().catch((err: unknown) => {
    logError('Failed to initialize WhatsApp client:', err);
  });
};

export const stopWhatsAppBot = async (): Promise<void> => {
  if (!client) return;
  try {
    setSenderReady(false);
    await client.destroy();
    log('WhatsApp bot stopped cleanly.');
  } catch (err) {
    logError('Error stopping WhatsApp bot:', err);
  }
};
