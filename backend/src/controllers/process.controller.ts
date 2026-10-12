import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getProcesses = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const processes = await prisma.process.findMany({
      where: { userId },
      include: {
        phases: {
          include: {
            tasks: {
              include: { microSteps: true }
            }
          },
          orderBy: { orderIndex: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(processes);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch processes' });
  }
};

export const createProcess = async (req: Request, res: Response) => {
  try {
    const { title, description, goalId, phases } = req.body;
    const userId = (req as any).userId;

    const newProcess = await prisma.process.create({
      data: {
        title,
        description,
        goalId: goalId || null,
        userId,
        phases: phases && phases.length > 0 ? {
          create: phases.map((p: any, index: number) => ({
            title: p.title,
            orderIndex: p.orderIndex ?? index
          }))
        } : undefined
      },
      include: {
        phases: true
      }
    });
    res.status(201).json(newProcess);
  } catch (error) {
    console.error('Create Process Error:', error);
    res.status(500).json({ message: 'Failed to create process' });
  }
};

export const createPhase = async (req: Request, res: Response) => {
  try {
    // Express 5 types params as string | string[]; this route only ever has one value.
    const processId = String(req.params.processId);
    const { title, orderIndex } = req.body;

    const phase = await prisma.phase.create({
      data: {
        title,
        orderIndex: orderIndex || 0,
        processId
      }
    });
    res.status(201).json(phase);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create phase' });
  }
};
