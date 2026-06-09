import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { sendAutoWhatsApp } from './whatsapp.js';

export const startBackgroundWorker = () => {
  console.log('👷 Background Worker started: Monitoring tasks every minute...');

  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

      // 1. Find tasks that are:
      // - Not DONE
      // - Not already alerted
      // - Due within the next 10 minutes
      const upcomingTasks = await prisma.task.findMany({
        where: {
          status: { not: 'DONE' },
          isAlerted: false,
          dueDate: {
            gt: now,
            lt: tenMinutesFromNow
          }
        },
        include: {
          user: true
        }
      });

      if (upcomingTasks.length > 0) {
        console.log(`🎯 Found ${upcomingTasks.length} upcoming tasks. Sending alerts...`);
      }

      for (const task of upcomingTasks) {
        if (task.user.phoneNumber) {
          const message = `🔔 TIMEFLOW REMINDER: "${task.title}" is due in less than 10 minutes! Why: ${task.reason || 'Not specified'}. Let's get it done! 🚀`;
          
          await sendAutoWhatsApp(task.user.phoneNumber, message);

          // Mark as alerted so we don't send it again
          await prisma.task.update({
            where: { id: task.id },
            data: { isAlerted: true }
          });
        }
      }
    } catch (error) {
      console.error('❌ Background Worker Error:', error);
    }
  });
};
