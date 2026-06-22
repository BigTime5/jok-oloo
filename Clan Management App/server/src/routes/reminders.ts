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
      const messageEn = `Hi ${member.name},\n🔔 Jok Oloo Notice\n\nYour ${month} clan contribution of KSh ${amount} is now due. Kindly send to our treasurer ${treasurerName} – ${treasurerPhone}.\n\nReply PAID once complete to keep your records updated in Jok Oloo`;
      
      const messageLuo = `Amosi ${member.name},\n\n🔔 Lando mar Jok Oloo\n\nChiwo mari mar anyuola mar dwe mar ${month} mar KSh ${amount} koro osechopo kinde mar chulo. Yie ioor ne jakana pesawa ${treasurerName} – ${treasurerPhone}\n\nDuok ni 'PAID' ka isetieko mondo iket rekod mari obed manyien e Jok Oloo`;

      const phone = member.phone.startsWith('0')
        ? `254${member.phone.slice(1)}`
        : member.phone;
        
      const waLinkEn = `https://wa.me/${phone}?text=${encodeURIComponent(messageEn)}`;
      const waLinkLuo = `https://wa.me/${phone}?text=${encodeURIComponent(messageLuo)}`;

      return {
        memberId: member.id,
        memberName: member.name,
        phone: member.phone,
        messageEn,
        waLinkEn,
        messageLuo,
        waLinkLuo,
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
