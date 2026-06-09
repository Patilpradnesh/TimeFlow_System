import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { Horizon } from '@prisma/client';

export const getGoals = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(goals);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch goals', error: error.message });
  }
};

export const createGoal = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { title, horizon, progress } = req.body;

    const goal = await prisma.goal.create({
      data: {
        title,
        horizon: horizon as Horizon || 'WEEKLY',
        progress: progress || 0,
        userId
      }
    });
    res.status(201).json(goal);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create goal', error: error.message });
  }
};

export const updateGoal = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { progress } = req.body;
    const userId = (req as any).userId;

    const goal = await prisma.goal.updateMany({
      where: { id, userId },
      data: { progress }
    });
    res.status(200).json(goal);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update goal', error: error.message });
  }
};

export const deleteGoal = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).userId;

    await prisma.goal.deleteMany({
      where: { id, userId }
    });
    res.status(200).json({ message: 'Goal deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete goal', error: error.message });
  }
};
