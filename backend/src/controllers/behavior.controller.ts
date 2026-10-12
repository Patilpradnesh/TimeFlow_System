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
    const userId = req.userId!;
    const { taskId, plannedDuration } = req.body;

    // SECURITY: Verify task belongs to this user before starting a session
    const task = await prisma.task.findFirst({ where: { id: taskId, userId } });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // STATE MACHINE: Prevent duplicate active sessions
    const activeSession = await prisma.executionSession.findFirst({
      where: { taskId, userId, endTime: null }
    });
    if (activeSession) {
      return res.status(409).json({ message: 'A session is already active for this task', sessionId: activeSession.id });
    }

    const session = await prisma.executionSession.create({
      data: {
        userId,
        taskId,
        startTime: new Date(),
        plannedDuration: plannedDuration ?? null,
      }
    });

    // Automatically log the STARTED event
    await prisma.behaviorEvent.create({
      data: { userId, taskId, type: 'STARTED' }
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
    const userId = req.userId!;
    const {
      sessionId,
      notes,
      completed,
      procrastinationReason,
      // --- PHASE 2 FIX: persist behavioral data that was previously dropped ---
      focusRating,
      energyLevel,
      difficulty,
      completionQuality,
      actualDuration,
    } = req.body;

    const sessionUpdate = await prisma.executionSession.updateMany({
      where: { id: sessionId, userId, endTime: null },
      data: {
        endTime: new Date(),
        notes: notes ?? null,
        // Persist all behavioral fields (Phase 2 data integrity fix)
        focusRating: focusRating ?? null,
        energyLevel: energyLevel ?? null,
        difficulty: difficulty ?? null,
        completionQuality: completionQuality ?? null,
        actualDuration: actualDuration ?? null,
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
          data: { userId, taskId: updatedSession.taskId, type: 'COMPLETED' }
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
          data: { userId, points: 10, reason: 'Task Completion' }
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

        const taskUpdateData: any = { status: 'TODO' };
        if (procrastinationReason) {
          taskUpdateData.reasonForProcrastination = procrastinationReason as ProcrastinationReason;
        }
        await prisma.task.update({
          where: { id: updatedSession.taskId },
          data: taskUpdateData
        });
      }
    }

    res.status(200).json({ message: 'Session ended successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to end execution session', error: error.message });
  }
};
