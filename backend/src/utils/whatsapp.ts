import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

// This client acts like a browser-based WhatsApp Web session
export const whatsappClient = new Client({
    authStrategy: new LocalAuth(), // This saves your login so you don't have to scan every time
    puppeteer: {
        handleSIGINT: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

whatsappClient.on('qr', (qr) => {
    console.log('----------------------------------------------------');
    console.log('📱 ACTION REQUIRED: SCAN THIS QR CODE WITH WHATSAPP');
    console.log('----------------------------------------------------');
    qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', () => {
    console.log('✅ WhatsApp Engine is READY and connected!');
});

whatsappClient.on('auth_failure', () => {
    console.error('❌ WhatsApp Auth failed. Please restart and scan again.');
});

export const initializeWhatsApp = () => {
    console.log('⏳ Starting WhatsApp Engine...');
    whatsappClient.initialize();
};

export const sendAutoWhatsApp = async (phone: string, message: string) => {
    try {
        // WhatsApp numbers need the country code and end with @c.us
        // Example: 919876543210@c.us
        const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
        await whatsappClient.sendMessage(chatId, message);
        console.log(`🚀 Automated Message Sent to ${phone}`);
    } catch (error) {
        console.error('❌ Failed to send automated WhatsApp:', error);
    }
};
