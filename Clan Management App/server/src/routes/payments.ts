import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { requireAdmin, AuthRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();
export const paymentsRouter = Router();

const paymentSchema = z.object({
  memberId: z.number().int().positive(),
  month: z.string().min(1),
  type: z.enum(['registration', 'monthly']),
  amount: z.number().int().positive(),
  paid: z.boolean(),
});

// All payment routes require admin
// paymentsRouter.use(requireAdmin); // Removed global requireAdmin

// Get all payments
paymentsRouter.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      include: { member: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Get unpaid members for a specific month
paymentsRouter.get('/unpaid/:month', async (req: AuthRequest, res: Response) => {
  try {
    const month = decodeURIComponent(req.params.month as string);
    const members = await prisma.member.findMany({
      include: {
        payments: {
          where: { month, type: 'monthly' },
        },
      },
    });

    const unpaid = members.filter(
      (m) => !m.payments.some((p) => p.paid)
    );

    res.json(unpaid);
  } catch (error) {
    console.error('Error fetching unpaid:', error);
    res.status(500).json({ error: 'Failed to fetch unpaid members' });
  }
});

// Mark payment
paymentsRouter.post('/mark', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = paymentSchema.parse(req.body);

    const payment = await prisma.payment.upsert({
      where: {
        memberId_month_type: {
          memberId: data.memberId,
          month: data.month,
          type: data.type,
        },
      },
      update: {
        paid: data.paid,
        amount: data.amount,
        paidAt: data.paid ? new Date() : null,
        markedBy: req.admin?.username || 'admin',
      },
      create: {
        memberId: data.memberId,
        month: data.month,
        type: data.type,
        amount: data.amount,
        paid: data.paid,
        paidAt: data.paid ? new Date() : null,
        markedBy: req.admin?.username || 'admin',
      },
    });

    await prisma.auditLog.create({
      data: {
        adminUser: req.admin?.username || 'unknown',
        action: 'MARK_PAYMENT',
        details: `Marked payment for member ${data.memberId} for ${data.month} (${data.type}) as ${data.paid ? 'paid' : 'unpaid'}`,
      }
    });

    res.json(payment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Error marking payment:', error);
    res.status(500).json({ error: 'Failed to mark payment' });
  }
});

// Toggle registration payment
paymentsRouter.post('/registration/:memberId', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const memberId = parseInt(req.params.memberId as string);
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    
    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    const updated = await prisma.member.update({
      where: { id: memberId },
      data: { registrationPaid: !member.registrationPaid },
    });
    
    await prisma.auditLog.create({
      data: {
        adminUser: req.admin?.username || 'unknown',
        action: 'TOGGLE_REGISTRATION',
        details: `Toggled registration payment for member ${member.name} to ${!member.registrationPaid}`,
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error toggling registration:', error);
    res.status(500).json({ error: 'Failed to toggle registration' });
  }
});
