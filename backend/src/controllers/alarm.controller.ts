import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getAlarms = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const alarms = await prisma.alarm.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(alarms);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch alarms', error: error.message });
  }
};

export const createAlarm = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { time, label, days } = req.body;

    const alarm = await prisma.alarm.create({
      data: {
        time,
        label,
        days: days || [],
        userId
      }
    });
    res.status(201).json(alarm);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create alarm', error: error.message });
  }
};

export const updateAlarm = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { isActive } = req.body;
    const userId = (req as any).userId;

    const alarm = await prisma.alarm.updateMany({
      where: { id, userId },
      data: { isActive }
    });
    res.status(200).json(alarm);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update alarm', error: error.message });
  }
};

export const deleteAlarm = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).userId;

    await prisma.alarm.deleteMany({
      where: { id, userId }
    });
    res.status(200).json({ message: 'Alarm deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete alarm', error: error.message });
  }
};
