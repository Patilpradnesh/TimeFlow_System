import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { senderStatus, sendText } from '../../whatsapp/lib/sender.js';


export const updateIndustry = async (req: Request, res: Response) => {
  try {
    const { industry } = req.body;
    const userId = (req as any).userId;

    if (!industry) {
      return res.status(400).json({ message: 'Industry selection is required' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { industry },
      select: {
        id: true,
        name: true,
        email: true,
        industry: true
      }
    });

    res.status(200).json({
      message: 'Industry updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update Industry Error:', error);
    res.status(500).json({ message: 'Failed to update industry' });
  }
};

export const getWhatsAppStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneNumber: true,
        email: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { ready, botPhone } = senderStatus();

    // Generate wa.me link with prefilled link command if botPhone is known
    const deepLink = botPhone
      ? `https://wa.me/${botPhone}?text=${encodeURIComponent(`link ${user.email} <YOUR_PASSWORD>`)}`
      : null;

    res.status(200).json({
      connected: Boolean(user.phoneNumber),
      phoneNumber: user.phoneNumber,
      botReady: ready,
      botPhone,
      deepLink,
    });
  } catch (error: any) {
    console.error('Get WhatsApp Status Error:', error);
    res.status(500).json({ message: 'Failed to retrieve WhatsApp status' });
  }
};

export const updateWhatsAppNumber = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { phoneNumber } = req.body;

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return res.status(400).json({ message: 'A valid phone number is required' });
    }

    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 8 || cleaned.length > 15) {
      return res.status(400).json({ message: 'Phone number must be between 8 and 15 digits including country code' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { phoneNumber: cleaned },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        industry: true,
      },
    });

    res.status(200).json({
      message: 'WhatsApp phone number updated successfully',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Update WhatsApp Number Error:', error);
    res.status(500).json({ message: 'Failed to update WhatsApp phone number' });
  }
};

export const disconnectWhatsApp = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { phoneNumber: null },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        industry: true,
      },
    });

    res.status(200).json({
      message: 'WhatsApp disconnected successfully',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Disconnect WhatsApp Error:', error);
    res.status(500).json({ message: 'Failed to disconnect WhatsApp' });
  }
};

export const sendTestWhatsApp = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phoneNumber: true, name: true },
    });

    if (!user || !user.phoneNumber) {
      return res.status(400).json({ message: 'No WhatsApp number connected to this account' });
    }

    const sent = await sendText(
      user.phoneNumber,
      `👋 Hi ${user.name}! This is a test notification from TimeFlow.\n\nYour WhatsApp connection is active and ready to deliver real-time alarms, task reminders, and job updates! 🚀`
    );

    if (!sent) {
      return res.status(503).json({
        message: 'WhatsApp service is not currently available to deliver the message. Please ensure the bot is online.',
      });
    }

    res.status(200).json({
      message: 'Test message sent successfully to your WhatsApp!',
    });
  } catch (error: any) {
    console.error('Send Test WhatsApp Error:', error);
    res.status(500).json({ message: 'Failed to send test message' });
  }
};

