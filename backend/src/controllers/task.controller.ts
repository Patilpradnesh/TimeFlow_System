import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { trackTaskCompletion } from '../utils/behavior.js';

export const getTasks = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const tasks = await prisma.task.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const { title, description, reason, priority, importance, dueDate, microSteps } = req.body;
    const userId = (req as any).userId;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        reason,
        priority: priority || 'MEDIUM',
        importance: importance || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        microSteps: microSteps || [],
        userId
      }
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Create Task Error:', error);
    res.status(500).json({ message: 'Failed to create task' });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { title, description, status, priority, importance, dueDate, microSteps } = req.body;
    const userId = (req as any).userId;

    const task = await prisma.task.update({
      where: { id, userId },
      data: {
        title,
        description,
        status,
        priority,
        importance,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        microSteps: microSteps !== undefined ? microSteps : undefined,
        completedAt: status === 'DONE' ? new Date() : null
      }
    });

    // If task is completed, track it!
    if (status === 'DONE') {
      await trackTaskCompletion(userId, id);
    }

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update task' });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).userId;

    await prisma.task.delete({
      where: { id, userId }
    });

    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete task' });
  }
};
