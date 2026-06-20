import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdmin, AuthRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();
export const remindersRouter = Router();

// All reminder routes require admin
remindersRouter.use(requireAdmin);

// Get reminder logs
remindersRouter.get('/logs', async (_req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.reminderLog.findMany({
      include: { member: true },
      orderBy: { sentAt: 'desc' },
      take: 100,
    });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching reminder logs:', error);
    res.status(500).json({ error: 'Failed to fetch reminder logs' });
  }
});

// Generate WhatsApp reminder links for unpaid members
remindersRouter.post('/generate/:month', async (req: AuthRequest, res: Response) => {
  try {
    const month = decodeURIComponent(req.params.month as string);
    const treasurerName = process.env.TREASURER_NAME || 'Susan';
    const treasurerPhone = process.env.TREASURER_PHONE || '0729207208';
    const amount = process.env.MONTHLY_CONTRIBUTION || '100';

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

    const reminders = unpaid.map((member) => {
      const message = `Hi ${member.name}, your ${month} contribution of ${amount}/= is due. Please send to ${treasurerName} on ${treasurerPhone}. Reply PAID once done.`;
      const phone = member.phone.startsWith('0')
        ? `254${member.phone.slice(1)}`
        : member.phone;
      const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

      return {
        memberId: member.id,
        memberName: member.name,
        phone: member.phone,
        message,
        waLink,
      };
    });
    
    await prisma.auditLog.create({
      data: {
        adminUser: req.admin?.username || 'unknown',
        action: 'GENERATE_REMINDERS',
        details: `Generated reminders for ${unpaid.length} unpaid members for ${month}`,
      }
    });

    res.json(reminders);
  } catch (error) {
    console.error('Error generating reminders:', error);
    res.status(500).json({ error: 'Failed to generate reminders' });
  }
});

// Log a sent reminder
remindersRouter.post('/log', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { memberId, month, message, sentVia } = req.body;

    if (!memberId || !month || !message) {
      res.status(400).json({ error: 'memberId, month, and message are required' });
      return;
    }

    const log = await prisma.reminderLog.create({
      data: {
        memberId,
        month,
        message,
        sentVia: sentVia || 'wame',
        status: 'sent',
      },
    });

    res.status(201).json(log);
  } catch (error) {
    console.error('Error logging reminder:', error);
    res.status(500).json({ error: 'Failed to log reminder' });
  }
});
