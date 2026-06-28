import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { EventType, ProcrastinationReason } from '@prisma/client';

export const logEvent = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { taskId, type, metadata } = req.body;

    const event = await prisma.behaviorEvent.create({
      data: {
        userId,
        taskId,
        type: type as EventType,
        metadata: metadata || {}
      }
    });

    res.status(201).json(event);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to log behavior event', error: error.message });
  }
};

export const startExecutionSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { taskId } = req.body;

    const session = await prisma.executionSession.create({
      data: {
        userId,
        taskId,
        startTime: new Date()
      }
    });

    // Automatically log the STARTED event
    await prisma.behaviorEvent.create({
      data: {
        userId,
        taskId,
        type: 'STARTED'
      }
    });

    // Update task status to IN_PROGRESS
    await prisma.task.update({
        where: { id: taskId },
        data: { status: 'IN_PROGRESS' }
    });

    res.status(201).json(session);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to start execution session', error: error.message });
  }
};

export const endExecutionSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { sessionId, notes, completed, procrastinationReason } = req.body;

    const sessionUpdate = await prisma.executionSession.updateMany({
      where: { id: sessionId, userId, endTime: null },
      data: {
        endTime: new Date(),
        notes
      }
    });

    if (sessionUpdate.count === 0) {
      return res.status(404).json({ message: 'Session not found or already ended' });
    }

    const updatedSession = await prisma.executionSession.findFirst({
       where: { id: sessionId }
    });

    if (updatedSession?.taskId) {
        if (completed) {
            await prisma.behaviorEvent.create({
              data: {
                userId,
                taskId: updatedSession.taskId,
                type: 'COMPLETED'
              }
            });
            await prisma.task.update({
               where: { id: updatedSession.taskId },
               data: { status: 'DONE', completedAt: new Date() }
            });
            // Dopamine Engine: Award focus credits
            await prisma.user.update({
               where: { id: userId },
               data: { focusCredits: { increment: 10 } }
            });
            await prisma.focusCredit.create({
               data: {
                   userId,
                   points: 10,
                   reason: 'Task Completion'
               }
            });
        } else {
            // Task Paused or Ignored
            await prisma.behaviorEvent.create({
              data: {
                userId,
                taskId: updatedSession.taskId,
                type: 'PAUSED',
                metadata: procrastinationReason ? { reason: procrastinationReason } : {}
              }
            });
            
            if (procrastinationReason) {
                await prisma.task.update({
                   where: { id: updatedSession.taskId },
                   data: { 
                       reasonForProcrastination: procrastinationReason as ProcrastinationReason,
                       status: 'TODO' 
                   }
                });
            } else {
                await prisma.task.update({
                    where: { id: updatedSession.taskId },
                    data: { status: 'TODO' }
                });
            }
        }
    }

    res.status(200).json({ message: 'Session ended successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to end execution session', error: error.message });
  }
};
