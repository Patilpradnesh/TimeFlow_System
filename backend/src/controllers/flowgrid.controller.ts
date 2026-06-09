import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getFlowGrid = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    // Debug: Let's see what Prisma thinks it has
    console.log('--- PRISMA DEBUG ---');
    console.log('Available Models:', Object.keys(prisma).filter(k => !k.startsWith('_')));
    
    // Try to access it safely
    const flowGridModel = (prisma as any).flowGrid || (prisma as any).FlowGrid;
    
    if (!flowGridModel) {
      throw new Error("FlowGrid model is missing from Prisma client. Re-run prisma generate.");
    }

    let grid = await flowGridModel.findUnique({
      where: { userId }
    });

    // If no grid exists, create an empty one
    if (!grid) {
      grid = await flowGridModel.create({
        data: {
          userId,
          tasks: [] // Ensuring it's a valid JSON array
        }
      });
    }

    res.status(200).json(grid);
  } catch (error: any) {
    console.error('🔥 FLOWGRID GET ERROR:', error);
    res.status(500).json({ 
      message: 'Failed to fetch FlowGrid', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
};

export const updateFlowGrid = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { tasks } = req.body; 

    const flowGridModel = (prisma as any).flowGrid || (prisma as any).FlowGrid;
    if (!flowGridModel) {
      throw new Error("FlowGrid model missing from Prisma client.");
    }

    // Safety check: ensure tasks is always an array
    const gridTasks = Array.isArray(tasks) ? tasks : [];

    const grid = await flowGridModel.upsert({
      where: { userId },
      update: { tasks: gridTasks, updatedAt: new Date() },
      create: { userId, tasks: gridTasks }
    });

    res.status(200).json(grid);
  } catch (error: any) {
    console.error('🔥 FLOWGRID UPDATE ERROR:', error);
    res.status(500).json({ message: 'Failed to update FlowGrid', error: error.message });
  }
};
