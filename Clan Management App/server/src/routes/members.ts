import { Router, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { requireAdmin, AuthRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();
export const membersRouter = Router();

const memberSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().optional().default(''),
  branch: z.string().min(1).max(100),
});

type MemberInput = z.infer<typeof memberSchema>;

const syncMemberIdSequence = () => prisma.$executeRaw`
  SELECT setval(
    pg_get_serial_sequence('"Member"', 'id'),
    COALESCE((SELECT MAX("id") FROM "Member"), 1),
    true
  )
`;

const isMemberIdSequenceConflict = (error: unknown) => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }

  const target = error.meta?.target;
  return target === 'Member_id_key' || (Array.isArray(target) && target.includes('id'));
};

const createMember = async (data: MemberInput) => {
  const insertMember = () => prisma.member.create({
    data: {
      name: data.name,
      phone: data.phone || '',
      branch: data.branch,
    },
  });

  try {
    return await insertMember();
  } catch (error) {
    if (!isMemberIdSequenceConflict(error)) {
      throw error;
    }

    await syncMemberIdSequence();
    return insertMember();
  }
};

// All member routes require admin
// membersRouter.use(requireAdmin); // Removed global requireAdmin

// Get all members
membersRouter.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const members = await prisma.member.findMany({
      include: { payments: true },
      orderBy: { name: 'asc' },
    });
    res.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Get single member
membersRouter.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: parseInt(req.params.id as string) },
      include: { payments: true, reminders: true },
    });
    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }
    res.json(member);
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({ error: 'Failed to fetch member' });
  }
});

// Add new member
membersRouter.post('/', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = memberSchema.parse(req.body);
    const member = await createMember(data);
    
    await prisma.auditLog.create({
      data: {
        adminUser: req.admin?.username || 'unknown',
        action: 'CREATE_MEMBER',
        details: `Created member ${member.name} (ID: ${member.id})`,
      }
    });

    res.status(201).json(member);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Error creating member:', error);
    res.status(500).json({ error: 'Failed to create member' });
  }
});

// Update member
membersRouter.put('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = memberSchema.parse(req.body);
    const memberId = parseInt(req.params.id as string);
    const member = await prisma.member.update({
      where: { id: memberId },
      data: {
        name: data.name,
        phone: data.phone || '',
        branch: data.branch,
      },
    });
    
    await prisma.auditLog.create({
      data: {
        adminUser: req.admin?.username || 'unknown',
        action: 'UPDATE_MEMBER',
        details: `Updated member ${member.name} (ID: ${member.id})`,
      }
    });

    res.json(member);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Error updating member:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// Delete member
membersRouter.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const memberId = parseInt(req.params.id as string);
    await prisma.member.delete({
      where: { id: memberId },
    });
    
    await prisma.auditLog.create({
      data: {
        adminUser: req.admin?.username || 'unknown',
        action: 'DELETE_MEMBER',
        details: `Deleted member (ID: ${memberId})`,
      }
    });
    
    res.json({ message: 'Member deleted' });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({ error: 'Failed to delete member' });
  }
});
