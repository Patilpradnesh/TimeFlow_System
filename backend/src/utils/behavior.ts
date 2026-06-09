import { prisma } from '../lib/prisma.js';

/**
 * Updates the user's behavior profile based on a completed task.
 * This is the "brain" that learns how the user works.
 */
export const trackTaskCompletion = async (userId: string, taskId: string) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId, userId }
    });

    if (!task || !task.completedAt) return;

    // Calculate time taken from creation to completion (in hours)
    const timeTaken = (task.completedAt.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60);

    // Update the profile
    const profile = await prisma.behaviorProfile.upsert({
      where: { userId },
      update: {
        totalTasksDone: { increment: 1 },
        // Simple moving average for response time
        avgResponseTime: {
          set: timeTaken // Simplified for now, can be more complex later
        }
      },
      create: {
        userId,
        totalTasksDone: 1,
        avgResponseTime: timeTaken
      }
    });

    console.log(`🧠 Intelligence Updated for user ${userId}. Avg Speed: ${profile.avgResponseTime?.toFixed(2)} hours.`);
  } catch (error) {
    console.error('Failed to track behavior:', error);
  }
};
