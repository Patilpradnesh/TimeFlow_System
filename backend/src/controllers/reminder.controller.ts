import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getActiveReminders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    // 1. Find tasks that are not DONE and are past their due date
    const overdueTasks = await prisma.task.findMany({
      where: { 
        userId, 
        status: { not: 'DONE' },
        dueDate: { lt: new Date() } 
      },
      include: { reminders: true }
    });

    const escalations = overdueTasks.map(task => {
      const currentLevel = task.reminders.length + 1;
      let tone = 'GENTLE';
      
      if (currentLevel === 2) tone = 'ASSERTIVE';
      if (currentLevel === 3) tone = 'URGENT';
      if (currentLevel >= 4) tone = 'CRITICAL';

      return {
        taskId: task.id,
        title: task.title,
        level: Math.min(currentLevel, 4),
        tone,
        message: getEscalationMessage(tone as any, task.title)
      };
    });

    res.status(200).json(escalations);
  } catch (error) {
    res.status(500).json({ message: 'Failed to process escalations' });
  }
};

function getEscalationMessage(tone: 'GENTLE' | 'ASSERTIVE' | 'URGENT' | 'CRITICAL', title: string) {
  switch (tone) {
    case 'GENTLE': return `Just a friendly nudge: "${title}" is waiting for you.`;
    case 'ASSERTIVE': return `Attention: "${title}" is now overdue. Please take action.`;
    case 'URGENT': return `WARNING: "${title}" is blocking your progress. Complete it now.`;
    case 'CRITICAL': return `SYSTEM INTERVENTION: "${title}" is critical. All other systems on standby.`;
    default: return `Reminder: ${title}`;
  }
}
