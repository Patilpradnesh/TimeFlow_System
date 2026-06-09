import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const updateIndustry = async (req: Request, res: Response) => {
  try {
    const { industry } = req.body;
    const userId = (req as any).userId;

    if (!industry) {
      return res.status(400).json({ message: 'Industry selection is required' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { industry },
      select: {
        id: true,
        name: true,
        email: true,
        industry: true
      }
    });

    res.status(200).json({
      message: 'Industry updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update Industry Error:', error);
    res.status(500).json({ message: 'Failed to update industry' });
  }
};
