import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getTrackers = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const trackersModel = (prisma as any).tracker || (prisma as any).Tracker;
    if (!trackersModel) throw new Error("Tracker model missing.");
    const trackers = await trackersModel.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    res.status(200).json(trackers);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch trackers', error: error.message });
  }
};

export const createTracker = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { name, columns, rows } = req.body;
    const trackersModel = (prisma as any).tracker || (prisma as any).Tracker;
    if (!trackersModel) throw new Error("Tracker model missing.");
    const tracker = await trackersModel.create({
      data: { userId, name, columns: columns || [], rows: rows || [] }
    });
    res.status(201).json(tracker);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create tracker', error: error.message });
  }
};

export const updateTracker = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { name, columns, rows } = req.body;
    const trackersModel = (prisma as any).tracker || (prisma as any).Tracker;
    if (!trackersModel) throw new Error("Tracker model missing.");
    const tracker = await trackersModel.update({
      where: { id, userId },
      data: { name, columns, rows }
    });
    res.status(200).json(tracker);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update tracker', error: error.message });
  }
};

export const deleteTracker = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const trackersModel = (prisma as any).tracker || (prisma as any).Tracker;
    if (!trackersModel) throw new Error("Tracker model missing.");
    await trackersModel.delete({ where: { id, userId } });
    res.status(200).json({ message: 'Tracker deleted' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete tracker', error: error.message });
  }
};
