import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { analyzeEvidence } from '../services/ai.service.js';

export const submitEvidence = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { sessionId, taskId, type, content, attachments } = req.body;

    const evidence = await prisma.evidence.create({
      data: {
        userId,
        sessionId,
        taskId,
        type, // 'PROGRESS' | 'REFLECTION' | 'ATTACHMENT'
        content,
        attachments: attachments && attachments.length > 0 ? {
          create: attachments.map((att: any) => ({
            fileUrl: att.fileUrl,
            mimeType: att.mimeType,
            sizeBytes: att.sizeBytes || 0
          }))
        } : undefined
      },
      include: {
        attachments: true
      }
    });

    // Log the Evidence Event for timeline
    await prisma.evidenceEvent.create({
      data: {
        sessionId,
        eventType: 'EVIDENCE_SUBMITTED'
      }
    });

    // Trigger the AI to analyze the proof
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (task) {
      const aiResult = await analyzeEvidence(
        task.title, 
        content || "", 
        attachments && attachments.length > 0
      );

      // Save the AI's judgment to the database
      await prisma.evidenceScore.create({
        data: {
          sessionId,
          confidenceScore: aiResult.confidenceScore,
          aiAnalysis: aiResult.analysis
        }
      });
    }

    res.status(201).json(evidence);
  } catch (error: any) {
    console.error('Submit Evidence Error:', error);
    res.status(500).json({ message: 'Failed to submit evidence', error: error.message });
  }
};

export const getEvidenceForSession = async (req: Request, res: Response) => {
  try {
    // Express 5 types params as string | string[]; this route only ever has one value.
    const sessionId = String(req.params.sessionId);
    const userId = (req as any).userId;

    const evidence = await prisma.evidence.findMany({
      where: { sessionId, userId },
      include: { attachments: true },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(evidence);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch evidence' });
  }
};
