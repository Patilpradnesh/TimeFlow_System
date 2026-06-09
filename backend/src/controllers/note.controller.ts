import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getNotes = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const notes = await prisma.note.findMany({
      where: { userId },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' }
      ]
    });
    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notes' });
  }
};

export const createNote = async (req: Request, res: Response) => {
  try {
    const { title, content, tags, isPinned } = req.body;
    const userId = (req as any).userId;

    const note = await prisma.note.create({
      data: {
        title,
        content: content || {},
        tags: tags || [],
        isPinned: isPinned || false,
        userId
      }
    });

    res.status(201).json(note);
  } catch (error) {
    console.error('Create Note Error:', error);
    res.status(500).json({ message: 'Failed to create note' });
  }
};

export const updateNote = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { title, content, tags, isPinned } = req.body;
    const userId = (req as any).userId;

    const note = await prisma.note.update({
      where: { id, userId },
      data: {
        title,
        content,
        tags,
        isPinned,
        updatedAt: new Date()
      }
    });

    res.status(200).json(note);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update note' });
  }
};

export const deleteNote = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).userId;

    await prisma.note.delete({
      where: { id, userId }
    });

    res.status(200).json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete note' });
  }
};
